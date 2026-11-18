import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer } from 'expo-audio';
import { fetch as streamFetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';

import { getRunControl } from '../runControl';
import { base64ToBytes, bytesToBase64, pcm16ToWav, resampleInt16 } from './audio';
import { interpretSpeech, type PaceAction } from './commands';
import { mintRealtimeSecret, readOpenAIKey, REALTIME_MODEL } from './openai';
import { CALL_VAD, callInstructions, greetingText, rememberTurn, resumeText, textItem, truncateEvent, type CallTurn, type WorkoutNotice } from './call';
import { concatBytes, FIRST_PCM_BYTES, NEXT_PCM_BYTES, pullPcm, speechBody, spokenSpeed, type SpeechTone } from './speech';
import { PREVIEW_LINE, voiceTitle, type RealtimeVoiceId } from './voices';

export type PaceStatus = 'listening' | 'thinking' | 'speaking' | 'reconnecting' | 'disconnected';

export type PaceContext = {
  status: string;
  distance: string;
  currentPace: string;
  averagePace: string;
  time: string;
  goal: string;
  remaining: string;
  tone: string;
  frequency: string;
  milestones: boolean;
  recovery: boolean;
  safety: boolean;
};

type Handler = {
  getContext: () => PaceContext;
  onStatus: (status: PaceStatus) => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onMute: (muted: boolean) => void;
  onTone: (tone: 'calm' | 'friendly' | 'energetic' | 'focused') => void;
  onSafety: (line: string) => void;
  onHeard: (text: string) => void;
  onSaid: (text: string) => void;
  onHearing: (hearing: boolean) => void;
};

const TOOLS = [
  'pause_run',
  'resume_run',
  'finish_run',
  'mute_coach',
  'enable_coach',
  'get_live_metrics',
  'get_route_progress',
  'change_coaching_mode',
  'start_rest_interval',
  'skip_interval',
  'repeat_last_instruction',
  'trigger_safety_flow',
].map((name) => ({
  type: 'function',
  name,
  description: `Run the PACE application action ${name}. The app executes it. Do not claim it happened unless the tool result says it did.`,
  parameters: {
    type: 'object',
    properties: {
      confirmed: { type: 'boolean', description: 'True only after the runner clearly confirms finishing the run.' },
      tone: { type: 'string', description: 'friendly, energetic, calm, or focused' },
    },
    additionalProperties: false,
  },
}));

let restUntil = 0;
let lastInstruction = '';
let pendingFinish = false;
let outputMuted = false;
let safetyOn = false;

export function paceRestActive(): boolean {
  return Date.now() < restUntil;
}

export function paceSkipRest(): void {
  restUntil = 0;
}

export class PaceVoice {
  status: PaceStatus = 'disconnected';
  private socket: WebSocket | null = null;
  private players: AudioPlayer[] = [];
  private queue: Uint8Array[] = [];
  private pendingPcm = new Uint8Array(0);
  private playing = false;
  private closed = false;
  private generation = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private greeted = false;
  private callStarted = false;
  private opening = false;
  private wantMute = false;
  private history: CallTurn[] = [];
  private latestFact = '';
  private spokenQueue: string[] = [];
  private awaitingEvent = false;
  private itemId = '';
  private responseId = '';
  private ignored = new Set<string>();
  private heardBytes = 0;
  private currentBytes = 0;
  private currentStarted = 0;
  private holdMic = false;
  private lastHeard = '';

  constructor(
    private voice: RealtimeVoiceId,
    private speed: number,
    private handler: Handler,
  ) {}

  restore(turns: CallTurn[]): void {
    this.history = turns.slice(-16);
    this.greeted = this.history.length > 0;
  }

  historySnapshot(): CallTurn[] {
    return this.history.slice();
  }

  setMuted(muted: boolean): void {
    const wasMuted = this.wantMute;
    this.wantMute = muted;
    outputMuted = muted;
    if (muted) {
      this.stopSpeaking();
      return;
    }
    if (wasMuted && !this.greeted && this.socket?.readyState === WebSocket.OPEN) this.beginCall();
  }

  say(text: string): boolean {
    const clean = text.trim();
    if (!clean || !this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    this.history = rememberTurn(this.history, 'you', clean);
    this.send(textItem(clean));
    this.send({ type: 'response.create' });
    this.setStatus('thinking');
    return true;
  }

  note(notice: WorkoutNotice): void {
    this.latestFact = notice.text;
    if (!notice.speak) {
      this.pushInstructions();
      return;
    }
    this.spokenQueue.push(notice.text);
    if (notice.interrupt) this.barge(true);
    this.pumpEvents();
  }

  async connect(): Promise<void> {
    if (this.closed || this.opening) return;
    this.opening = true;
    this.callStarted = false;
    const generation = this.generation + 1;
    this.generation = generation;
    this.socket?.close();
    this.socket = null;
    outputMuted = this.wantMute;
    if (this.reconnectAttempt === 0) this.setStatus('disconnected');
    try {
      await setIsAudioActiveAsync(true);
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        allowsRecording: true,
        shouldPlayInBackground: true,
        allowsBackgroundRecording: true,
        shouldRouteThroughEarpiece: false,
      });
      if (generation !== this.generation || this.closed) return;
      const secret = await mintRealtimeSecret(REALTIME_MODEL);
      if (generation !== this.generation || this.closed) return;
      const socket = openRealtimeSocket(secret);
      this.socket = socket;
      socket.onopen = () => {
        if (generation !== this.generation) return;
        this.reconnectAttempt = 0;
        this.send({
          type: 'session.update',
          session: {
            type: 'realtime',
            instructions: this.instructions(),
            output_modalities: ['audio'],
            audio: {
              input: {
                format: { type: 'audio/pcm', rate: 24000 },
                turn_detection: CALL_VAD,
                transcription: { model: 'gpt-4o-mini-transcribe' },
              },
              output: {
                format: { type: 'audio/pcm', rate: 24000 },
                voice: this.voice,
              },
            },
            tools: TOOLS,
            tool_choice: 'auto',
            speed: spokenSpeed(this.speed, speechTone(this.handler.getContext().tone)),
          },
        });
        this.setStatus('listening');
        setTimeout(() => {
          if (generation !== this.generation || this.callStarted || this.closed) return;
          this.callStarted = true;
          this.beginCall();
        }, 700);
      };
      socket.onmessage = (event) => {
        if (generation === this.generation) this.onMessage(String(event.data));
      };
      socket.onerror = () => {
        if (generation === this.generation) this.setStatus(this.closed ? 'disconnected' : 'reconnecting');
      };
      socket.onclose = () => {
        if (generation !== this.generation || this.closed) return;
        this.scheduleReconnect();
      };
    } catch {
      if (generation !== this.generation || this.closed) return;
      this.scheduleReconnect();
    } finally {
      this.opening = false;
    }
  }

  ensure(): void {
    if (this.closed || this.opening || this.reconnectTimer) return;
    const state = this.socket?.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;
    this.scheduleReconnect();
  }

  close(): void {
    this.closed = true;
    this.generation += 1;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.stopSpeaking();
    this.socket?.close();
    this.socket = null;
    this.setStatus('disconnected');
  }

  pushMic(buffer: ArrayBuffer, sampleRate: number): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || safetyOn || this.holdMic || this.playing) return;
    const samples = resampleInt16(new Int16Array(buffer), sampleRate, 24000);
    const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
    this.send({ type: 'input_audio_buffer.append', audio: bytesToBase64(bytes) });
  }

  private pushInstructions(): void {
    this.send({ type: 'session.update', session: { instructions: this.instructions() } });
  }

  private instructions(): string {
    const context = this.handler.getContext();
    return callInstructions({
      voiceName: voiceTitle(this.voice),
      tone: context.tone,
      status: context.status,
      distance: context.distance,
      currentPace: context.currentPace,
      averagePace: context.averagePace,
      time: context.time,
      goal: context.goal,
      remaining: context.remaining,
      frequency: context.frequency,
      fact: this.latestFact,
    });
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer) return;
    this.setStatus('reconnecting');
    const wait = Math.min(8000, 1000 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closed) void this.connect().catch(() => undefined);
    }, wait);
  }

  private beginCall(): void {
    if (this.wantMute || safetyOn) return;
    if (!this.greeted) {
      this.greeted = true;
      this.send(textItem(greetingText(voiceTitle(this.voice))));
    } else {
      this.send(textItem(resumeText(this.history)));
    }
    this.send({ type: 'response.create' });
    this.awaitingEvent = false;
    this.pumpEvents();
  }

  private pumpEvents(): void {
    if (this.awaitingEvent || this.wantMute || safetyOn || this.socket?.readyState !== WebSocket.OPEN) return;
    const text = this.spokenQueue.shift();
    if (!text) return;
    this.awaitingEvent = true;
    this.send(textItem(`Workout event. React in one short sentence, in your own words, then let the runner talk. ${text}`));
    this.send({ type: 'response.create' });
  }

  private barge(cancel: boolean): void {
    const heard = this.heardMs();
    const itemId = this.itemId;
    if (this.responseId) {
      this.ignored.add(this.responseId);
      if (this.ignored.size > 20) this.ignored.clear();
    }
    this.stopSpeaking();
    this.pendingPcm = new Uint8Array(0);
    if (cancel) this.send({ type: 'response.cancel' });
    if (itemId && heard > 0) this.send(truncateEvent(itemId, heard));
    this.itemId = '';
    this.heardBytes = 0;
    this.currentBytes = 0;
  }

  private heardMs(): number {
    const partial = this.currentBytes > 0 && this.currentStarted > 0
      ? Math.min(this.currentBytes, ((Date.now() - this.currentStarted) / 1000) * 48000)
      : 0;
    return ((this.heardBytes + partial) / 2 / 24000) * 1000;
  }

  private onMessage(raw: string): void {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    const type = String(event.type ?? '');
    if (type === 'session.updated') {
      if (this.callStarted) return;
      this.callStarted = true;
      this.beginCall();
      return;
    }
    if (type === 'input_audio_buffer.speech_started') {
      if (this.holdMic || this.playing) return;
      this.barge(false);
      this.handler.onHearing(true);
      this.setStatus('listening');
      return;
    }
    if (type === 'input_audio_buffer.speech_stopped') {
      this.handler.onHearing(false);
      this.setStatus('thinking');
      return;
    }
    if (type === 'conversation.item.input_audio_transcription.completed' || type.endsWith('input_audio_transcription.completed')) {
      const transcript = String(event.transcript ?? '');
      if (transcript && transcript !== this.lastHeard) {
        this.lastHeard = transcript;
        this.history = rememberTurn(this.history, 'you', transcript);
        this.handler.onHeard(transcript);
        this.applyLocal(transcript);
      }
      this.setStatus('thinking');
      return;
    }
    if (type === 'response.output_audio.delta' || type === 'response.audio.delta') {
      const responseId = String(event.response_id ?? '');
      if (responseId && this.ignored.has(responseId)) return;
      if (responseId && responseId !== this.responseId) {
        this.responseId = responseId;
        this.heardBytes = 0;
        this.currentBytes = 0;
      }
      const itemId = String(event.item_id ?? '');
      if (itemId) this.itemId = itemId;
      if (!outputMuted && typeof event.delta === 'string') this.enqueue(base64ToBytes(event.delta));
      this.handler.onHearing(false);
      this.setStatus('speaking');
      return;
    }
    if (type === 'response.output_audio_transcript.done' || type === 'response.audio_transcript.done') {
      const text = String(event.transcript ?? '');
      if (text) {
        lastInstruction = text;
        this.history = rememberTurn(this.history, 'pace', text);
        this.handler.onSaid(text);
      }
      return;
    }
    if (type === 'response.function_call_arguments.done') {
      const name = String(event.name ?? '') as PaceAction;
      const callId = String(event.call_id ?? '');
      let args: { confirmed?: boolean; tone?: string } = {};
      try {
        args = JSON.parse(String(event.arguments ?? '{}')) as { confirmed?: boolean; tone?: string };
      } catch {
        args = {};
      }
      const result = this.execute(name, args);
      this.send({
        type: 'conversation.item.create',
        item: { type: 'function_call_output', call_id: callId, output: JSON.stringify(result) },
      });
      this.send({ type: 'response.create' });
      return;
    }
    if (type === 'response.done' || type === 'response.output_audio.done') {
      this.flushPending();
      this.awaitingEvent = false;
      this.pumpEvents();
      if (!this.playing && this.queue.length === 0 && this.pendingPcm.length < 2) {
        this.holdMic = false;
        this.setStatus('listening');
      }
      return;
    }
    if (type === 'error') {
      this.setStatus(this.socket?.readyState === WebSocket.OPEN ? 'listening' : 'disconnected');
    }
  }

  private applyLocal(transcript: string): void {
    const intent = interpretSpeech(transcript, pendingFinish);
    if (intent.action === 'none') return;
    if (intent.action === 'finish_run' && intent.needsConfirmation) {
      pendingFinish = true;
      return;
    }
    this.execute(intent.action, { confirmed: intent.action === 'finish_run', tone: intent.tone });
    if (intent.priority === 1) this.stopSpeaking();
  }

  private execute(action: PaceAction, args: { confirmed?: boolean; tone?: string }): { ok: boolean; detail: string } {
    const control = getRunControl();
    if (action === 'pause_run') {
      control?.pause();
      return { ok: true, detail: 'paused' };
    }
    if (action === 'resume_run') {
      control?.resume();
      safetyOn = false;
      return { ok: true, detail: 'resumed' };
    }
    if (action === 'finish_run') {
      if (!args.confirmed) {
        pendingFinish = true;
        return { ok: false, detail: 'Ask the runner to confirm before finishing.' };
      }
      pendingFinish = false;
      this.handler.onFinish();
      return { ok: true, detail: 'finish requested' };
    }
    if (action === 'mute_coach') {
      outputMuted = true;
      this.stopSpeaking();
      this.handler.onMute(true);
      return { ok: true, detail: 'muted' };
    }
    if (action === 'enable_coach') {
      outputMuted = false;
      safetyOn = false;
      this.handler.onMute(false);
      return { ok: true, detail: 'voice on' };
    }
    if (action === 'change_coaching_mode') {
      const tone = args.tone === 'energetic' || args.tone === 'focused' || args.tone === 'friendly' || args.tone === 'calm' ? args.tone : 'calm';
      this.handler.onTone(tone);
      return { ok: true, detail: tone };
    }
    if (action === 'start_rest_interval') {
      restUntil = Date.now() + 60_000;
      return { ok: true, detail: '60 second recovery' };
    }
    if (action === 'skip_interval') {
      restUntil = 0;
      return { ok: true, detail: 'interval skipped' };
    }
    if (action === 'repeat_last_instruction') {
      return { ok: true, detail: lastInstruction || 'No instruction yet.' };
    }
    if (action === 'trigger_safety_flow') {
      safetyOn = true;
      outputMuted = true;
      this.stopSpeaking();
      control?.pause();
      const line = interpretSpeech('I feel dizzy and I need to stop').say;
      this.handler.onSafety(line);
      return { ok: true, detail: 'safety flow on, workout paused' };
    }
    if (action === 'get_live_metrics' || action === 'get_route_progress') {
      const context = this.handler.getContext();
      return { ok: true, detail: `${context.distance}, pace ${context.currentPace}, average ${context.averagePace}, time ${context.time}, remaining ${context.remaining}` };
    }
    return { ok: false, detail: 'No action.' };
  }

  private enqueue(pcm: Uint8Array): void {
    if (outputMuted || safetyOn || pcm.length === 0) return;
    this.holdMic = true;
    this.pendingPcm = new Uint8Array(concatBytes(this.pendingPcm, pcm));
    const min = 24000 * 2 * 0.12;
    if (this.pendingPcm.length < min) return;
    this.flushPending();
  }

  private flushPending(): void {
    if (this.pendingPcm.length < 2) return;
    const even = this.pendingPcm.length - (this.pendingPcm.length % 2);
    this.queue.push(new Uint8Array(this.pendingPcm.slice(0, even)));
    this.pendingPcm = new Uint8Array(0);
    void this.pump();
  }

  private async pump(): Promise<void> {
    if (this.playing || outputMuted || safetyOn) return;
    const next = this.queue.shift();
    if (!next || next.length < 2) {
      if (this.queue.length === 0 && this.pendingPcm.length < 2) this.setStatus('listening');
      return;
    }
    this.playing = true;
    this.currentBytes = next.length;
    this.currentStarted = Date.now();
    this.setStatus('speaking');
    try {
      const wav = pcm16ToWav(next, 24000);
      const file = new File(Paths.cache, `pace-${Date.now()}.wav`);
      file.create({ overwrite: true });
      await file.write(bytesToBase64(wav), { encoding: 'base64' });
      const player = await playSavedFile(file.uri, 1, false);
      this.players.push(player);
      await new Promise((resolve) => setTimeout(resolve, Math.max(120, (next.length / 2 / 24000) * 1000 - 30)));
      this.heardBytes += next.length;
    } catch {
      this.setStatus('listening');
    } finally {
      this.currentBytes = 0;
      this.playing = false;
      if (this.queue.length === 0 && this.pendingPcm.length < 2) this.holdMic = false;
      if (!this.closed) void this.pump();
    }
  }

  private stopSpeaking(): void {
    this.queue = [];
    this.pendingPcm = new Uint8Array(0);
    this.playing = false;
    this.holdMic = false;
    this.players.forEach((player) => {
      try {
        player.pause();
        player.remove();
      } catch {
        // The clip may already have finished.
      }
    });
    this.players = [];
  }

  private send(payload: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(payload));
  }

  private setStatus(status: PaceStatus): void {
    this.status = status;
    this.handler.onStatus(status);
  }
}

function openRealtimeSocket(secret: string): WebSocket {
  const Socket = WebSocket as unknown as new (
    url: string,
    protocols: string[] | undefined,
    options: { headers: Record<string, string> },
  ) => WebSocket;
  return new Socket(`wss://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`, undefined, {
    headers: { Authorization: `Bearer ${secret}` },
  });
}

let previewPlayer: AudioPlayer | null = null;
let speechToken = 0;
let speechAbort: AbortController | null = null;
const speechPlayers: AudioPlayer[] = [];

export function stopVoicePreview(): void {
  speechToken += 1;
  speechAbort?.abort();
  speechAbort = null;
  const players = [previewPlayer, ...speechPlayers];
  previewPlayer = null;
  speechPlayers.length = 0;
  players.forEach((player) => {
    try {
      player?.pause();
      player?.remove();
    } catch {
      // The clip may already have ended.
    }
  });
}

export function previewVoice(voice: RealtimeVoiceId, speed: number, tone: SpeechTone = 'friendly'): Promise<void> {
  return speakLine(PREVIEW_LINE, voice, speed, tone);
}

export async function speakLine(text: string, voice: RealtimeVoiceId, speed: number, tone: SpeechTone = 'friendly'): Promise<void> {
  const key = readOpenAIKey();
  if (!key) throw new Error('Voice is not configured on this build.');
  stopVoicePreview();
  const token = speechToken;
  const abort = new AbortController();
  speechAbort = abort;
  await prepareSpeaker();
  if (token !== speechToken) throw new Error('cancelled');
  const response = await streamFetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(speechBody(text, voice, speed, tone)),
    signal: abort.signal,
  });
  if (token !== speechToken) throw new Error('cancelled');
  if (!response.ok) throw new Error(`Voice preview was refused (${response.status}).`);

  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength < 2) throw new Error('Voice preview came back empty.');
    await playPcmClip(bytes, token, true);
    return;
  }

  let pending = new Uint8Array(0);
  let first = true;
  let chain = Promise.resolve();
  let resolveStarted: () => void = () => undefined;
  let rejectStarted: (error: Error) => void = () => undefined;
  const started = new Promise<void>((resolve, reject) => {
    resolveStarted = resolve;
    rejectStarted = reject;
  });

  let clipIndex = 0;
  const enqueue = (chunk: Uint8Array, verify: boolean) => {
    const index = clipIndex;
    clipIndex += 1;
    const written = writePcmClip(chunk, token, index);
    chain = chain.then(async () => {
      const uri = await written;
      if (!uri || token !== speechToken) {
        if (verify) rejectStarted(new Error('cancelled'));
        return;
      }
      const player = await playSavedFile(uri, 1, verify);
      if (token !== speechToken) return;
      speechPlayers.push(player);
      previewPlayer = player;
      if (verify) resolveStarted();
      const duration = (chunk.length / 2 / 24000) * 1000;
      await new Promise((resolve) => setTimeout(resolve, Math.max(80, duration - 40)));
    }).catch((error: unknown) => {
      if (verify) rejectStarted(error instanceof Error ? error : new Error('Voice preview was refused.'));
    });
  };

  try {
    while (token === speechToken) {
      const { done, value } = await reader.read();
      if (value?.byteLength) pending = new Uint8Array(concatBytes(pending, value));
      while (true) {
        const pulled = pullPcm(pending, first ? FIRST_PCM_BYTES : NEXT_PCM_BYTES, Boolean(done));
        if (!pulled.chunk) break;
        pending = new Uint8Array(pulled.rest);
        const verify = first;
        first = false;
        enqueue(pulled.chunk, verify);
      }
      if (done) break;
    }
  } catch (error) {
    if (token !== speechToken || abort.signal.aborted) throw new Error('cancelled');
    if (first) throw error;
    return;
  }

  if (first) throw new Error('Voice preview came back empty.');
  await started;
}

function speechTone(value: string): SpeechTone {
  if (value === 'energetic' || value === 'calm' || value === 'focused' || value === 'friendly') return value;
  return 'friendly';
}

async function writePcmClip(pcm: Uint8Array, token: number, index: number): Promise<string | null> {
  if (token !== speechToken || pcm.length < 2) return null;
  const wav = pcm16ToWav(pcm, 24000);
  const file = new File(Paths.cache, `pace-say-${token}-${index}.wav`);
  file.create({ overwrite: true });
  await file.write(bytesToBase64(wav), { encoding: 'base64' });
  if (token !== speechToken) return null;
  return file.uri;
}

async function playPcmClip(pcm: Uint8Array, token: number, verify: boolean): Promise<number> {
  const uri = await writePcmClip(pcm, token, 0);
  if (!uri) return 0;
  const player = await playSavedFile(uri, 1, verify);
  speechPlayers.push(player);
  previewPlayer = player;
  return (pcm.length / 2 / 24000) * 1000;
}

async function prepareSpeaker(): Promise<void> {
  await setIsAudioActiveAsync(true);
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'doNotMix',
    allowsRecording: false,
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
  });
}

async function playSavedFile(uri: string, speed: number, verify: boolean): Promise<AudioPlayer> {
  const player = createAudioPlayer({ uri });
  player.volume = 1;
  player.loop = false;
  player.muted = false;
  player.setPlaybackRate(speed, 'medium');
  player.play();
  if (verify) {
    await new Promise((resolve) => setTimeout(resolve, 180));
    if (!player.playing && !player.isLoaded) {
      throw new Error('The speaker did not start. Turn off silent mode, raise the volume, and try Preview again.');
    }
  }
  return player;
}
