import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { cacheDirectory, EncodingType, writeAsStringAsync } from 'expo-file-system/legacy';

import type { CoachProfile } from './engine';
import {
  base64ToBytes,
  bytesToBase64,
  clientSecretRequest,
  coachInstructions,
  concatBytes,
  defaultVoiceId,
  pcm16ToWav,
  readCoachEvent,
  readEphemeralToken,
  readVoiceKeys,
  realtimeSocketUrl,
  resolveVoice,
  responseCancelEvent,
  responseCreateEvent,
  sessionUpdateEvent,
  userTextEvent,
  type ResolvedVoice,
} from './voice';

type RemoteResult = { text: string; played: boolean };

type Pending = {
  resolve: (value: RemoteResult) => void;
  chunks: Uint8Array[];
  transcript: string;
  timer: ReturnType<typeof setTimeout>;
};

export type CoachHandle = {
  say: (fallback: string, prompt?: string) => Promise<string>;
  interrupt: () => void;
  transcribe: (uri: string) => Promise<string>;
  status: () => string;
  close: () => void;
};

type SocketLike = WebSocket & { onopen: (() => void) | null; onerror: (() => void) | null; onclose: (() => void) | null; onmessage: ((event: { data: unknown }) => void) | null };

export function openCoach(options: { getProfile: () => CoachProfile; onStatus: (status: string) => void }): CoachHandle {
  let socket: SocketLike | null = null;
  let open = false;
  let closed = false;
  let generation = 0;
  let player: AudioPlayer | null = null;
  let pending: Pending | null = null;
  let currentStatus = 'On-device voice';

  function setStatus(value: string) {
    currentStatus = value;
    try {
      options.onStatus(value);
    } catch {
      // Status is decorative. Tracking must not care if the screen is gone.
    }
  }

  function stopPlayer() {
    try {
      player?.pause();
      player?.remove();
    } catch {
      // A missing player is already quiet.
    }
    player = null;
  }

  function interrupt() {
    generation += 1;
    try {
      Speech.stop();
    } catch {
      // Speech may already be idle.
    }
    stopPlayer();
    if (pending) {
      if (open) {
        try {
          socket?.send(JSON.stringify(responseCancelEvent()));
        } catch {
          // Cancelling a dead socket still leaves the run intact.
        }
      }
      clearTimeout(pending.timer);
      const current = pending;
      pending = null;
      current.resolve({ text: '', played: false });
    }
  }

  async function playBytes(bytes: Uint8Array, ext: 'wav' | 'mp3'): Promise<boolean> {
    if (!cacheDirectory || bytes.length < 80) return false;
    const uri = `${cacheDirectory}pace-coach-${Date.now()}-${generation}.${ext}`;
    await writeAsStringAsync(uri, bytesToBase64(bytes), { encoding: EncodingType.Base64 });
    if (closed) return false;
    stopPlayer();
    const next = createAudioPlayer({ uri });
    player = next;
    next.play();
    return true;
  }

  async function speakClip(text: string): Promise<void> {
    const profile = options.getProfile();
    if (!profile.voiceEnabled) return;
    const spoken = text.trim().slice(0, 420);
    if (!spoken) return;
    const keys = readVoiceKeys();
    const provider = resolveVoice(profile.voiceProvider, keys);
    const mine = generation;
    try {
      if (provider === 'elevenlabs') {
        const voice = defaultVoiceId('elevenlabs', profile.voiceId);
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`, {
          method: 'POST',
          headers: { 'xi-api-key': keys.eleven, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({ text: spoken, model_id: 'eleven_flash_v2_5' }),
        });
        if (response.ok && mine === generation) {
          const played = await playBytes(new Uint8Array(await response.arrayBuffer()), 'mp3');
          if (played) return;
        }
      } else if (provider === 'openai') {
        const voice = defaultVoiceId('openai', profile.voiceId);
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: { Authorization: `Bearer ${keys.openai}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input: spoken, response_format: 'mp3' }),
        });
        if (response.ok && mine === generation) {
          const played = await playBytes(new Uint8Array(await response.arrayBuffer()), 'mp3');
          if (played) return;
        }
      }
    } catch {
      // The phone speaker is the fallback.
    }
    if (mine !== generation || closed) return;
    await new Promise<void>((resolve) => {
      try {
        Speech.speak(spoken, { rate: 0.96, onDone: () => resolve(), onStopped: () => resolve(), onError: () => resolve() });
      } catch {
        resolve();
      }
    });
  }

  function requestRemote(prompt: string): Promise<RemoteResult> {
    return new Promise((resolve) => {
      if (!socket || !open) {
        resolve({ text: '', played: false });
        return;
      }
      const timer = setTimeout(() => {
        if (!pending) return;
        const current = pending;
        pending = null;
        current.resolve({ text: '', played: false });
      }, 7000);
      pending = { resolve, chunks: [], transcript: '', timer };
      try {
        socket.send(JSON.stringify(userTextEvent(prompt)));
        socket.send(JSON.stringify(responseCreateEvent()));
      } catch {
        clearTimeout(timer);
        pending = null;
        resolve({ text: '', played: false });
      }
    });
  }

  function handleMessage(raw: unknown) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(raw));
    } catch {
      return;
    }
    const event = readCoachEvent(parsed);
    if (!pending) {
      if (event.kind === 'error') setStatus(event.message);
      return;
    }
    if (event.kind === 'audio') {
      try {
        pending.chunks.push(base64ToBytes(event.delta));
      } catch {
        // A bad audio chunk is skipped. The transcript can still be spoken.
      }
    } else if (event.kind === 'transcript') {
      pending.transcript = event.partial ? pending.transcript + event.text : event.text;
    } else if (event.kind === 'error') {
      setStatus(event.message);
      clearTimeout(pending.timer);
      const current = pending;
      pending = null;
      current.resolve({ text: '', played: false });
    } else if (event.kind === 'done') {
      clearTimeout(pending.timer);
      const current = pending;
      const text = current.transcript.trim();
      const chunks = current.chunks;
      const mine = generation;
      pending = null;
      void (async () => {
        let played = false;
        try {
          if (chunks.length && mine === generation) {
            played = await playBytes(pcm16ToWav(concatBytes(chunks)), 'wav');
          }
        } catch {
          played = false;
        }
        current.resolve({ text, played: played && mine === generation });
      })();
    }
  }

  async function connect() {
    const profile = options.getProfile();
    const keys = readVoiceKeys();
    const provider = resolveVoice(profile.voiceProvider, keys);
    if (provider === 'device') {
      setStatus('On-device voice');
      return;
    }
    setStatus('Connecting coach');
    const key = provider === 'openai' ? keys.openai : keys.eleven;
    const voice = defaultVoiceId(provider, profile.voiceId);
    const instructions = coachInstructions(profile.personality, profile.speak);
    let token = '';
    try {
      const request = clientSecretRequest(provider, key, instructions, voice);
      const response = await fetch(request.url, { method: 'POST', headers: request.headers, body: request.body });
      if (response.ok) token = readEphemeralToken(await response.json());
    } catch {
      token = '';
    }
    if (closed) return;
    const headers: Record<string, string> = provider === 'elevenlabs' && !token
      ? { 'xi-api-key': key }
      : { Authorization: `Bearer ${token || key}` };
    try {
      const ws = new (WebSocket as unknown as new (url: string, protocols: null, options: { headers: Record<string, string> }) => SocketLike)(
        realtimeSocketUrl(provider),
        null,
        { headers },
      );
      socket = ws;
      ws.onopen = () => {
        open = true;
        setStatus('Live coach');
        try {
          const latest = options.getProfile();
          ws.send(JSON.stringify(sessionUpdateEvent(provider, coachInstructions(latest.personality, latest.speak), defaultVoiceId(provider, latest.voiceId))));
        } catch {
          // The session can still answer with its default voice.
        }
      };
      ws.onerror = () => {
        open = false;
        if (!closed) setStatus('On-device voice. Your run is still recording.');
      };
      ws.onclose = () => {
        open = false;
        if (!closed) setStatus('On-device voice. Your run is still recording.');
      };
      ws.onmessage = (event) => handleMessage(event.data);
    } catch {
      setStatus('On-device voice. Your run is still recording.');
    }
  }

  void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers', allowsRecording: true }).catch(() => undefined);
  void connect();

  return {
    status: () => currentStatus,
    interrupt,
    transcribe: (uri) => transcribeClip(uri, options.getProfile()),
    say: async (fallback, prompt) => {
      if (closed) return fallback;
      interrupt();
      const mine = generation;
      const profile = options.getProfile();
      if (!profile.voiceEnabled) return fallback;
      if (open && socket) {
        try {
          const remote = await requestRemote(prompt || fallback);
          if (mine !== generation || closed) return remote.text || fallback;
          const text = remote.text || fallback;
          if (!remote.played) await speakClip(text);
          return text;
        } catch {
          if (mine === generation) setStatus('Coach quiet. Your run is still recording.');
        }
      }
      if (mine !== generation || closed) return fallback;
      await speakClip(fallback);
      return fallback;
    },
    close: () => {
      closed = true;
      generation += 1;
      if (pending) {
        clearTimeout(pending.timer);
        const current = pending;
        pending = null;
        current.resolve({ text: '', played: false });
      }
      try {
        socket?.close();
      } catch {
        // Closing twice is fine.
      }
      socket = null;
      open = false;
    },
  };
}

export async function previewCoachLine(profile: CoachProfile, line: string): Promise<void> {
  const handle = openCoach({
    getProfile: () => ({ ...profile, voiceProvider: profile.voiceProvider === 'auto' ? previewProvider(profile) : profile.voiceProvider }),
    onStatus: () => undefined,
  });
  try {
    await handle.say(line);
    await new Promise((resolve) => setTimeout(resolve, 4500));
  } finally {
    handle.close();
  }
}

function previewProvider(profile: CoachProfile): CoachProfile['voiceProvider'] {
  const resolved = resolveVoice(profile.voiceProvider, readVoiceKeys());
  if (resolved === 'device') return 'device';
  return resolved;
}

async function transcribeClip(uri: string, profile: CoachProfile): Promise<string> {
  const keys = readVoiceKeys();
  const provider: ResolvedVoice = resolveVoice(profile.voiceProvider, keys);
  try {
    if (provider === 'openai') return await transcribeOpenAi(uri, keys.openai);
    if (provider === 'elevenlabs') return await transcribeEleven(uri, keys.eleven);
  } catch {
    return '';
  }
  return '';
}

async function transcribeOpenAi(uri: string, key: string): Promise<string> {
  const body = new FormData();
  body.append('file', { uri, name: 'question.m4a', type: 'audio/mp4' } as unknown as Blob);
  body.append('model', 'whisper-1');
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body,
  });
  if (!response.ok) return '';
  const payload = (await response.json()) as { text?: unknown };
  return typeof payload.text === 'string' ? payload.text.trim() : '';
}

async function transcribeEleven(uri: string, key: string): Promise<string> {
  const body = new FormData();
  body.append('file', { uri, name: 'question.m4a', type: 'audio/mp4' } as unknown as Blob);
  body.append('model_id', 'scribe_v1');
  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': key },
    body,
  });
  if (!response.ok) return '';
  const payload = (await response.json()) as { text?: unknown };
  return typeof payload.text === 'string' ? payload.text.trim() : '';
}

export async function loadElevenVoices(): Promise<{ id: string; name: string }[]> {
  const keys = readVoiceKeys();
  if (!keys.eleven) return [];
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': keys.eleven } });
    if (!response.ok) return [];
    const payload = (await response.json()) as { voices?: { voice_id?: unknown; name?: unknown }[] };
    return (payload.voices ?? [])
      .map((voice) => ({
        id: typeof voice.voice_id === 'string' ? voice.voice_id : '',
        name: typeof voice.name === 'string' ? voice.name : '',
      }))
      .filter((voice) => voice.id && voice.name)
      .slice(0, 12);
  } catch {
    return [];
  }
}
