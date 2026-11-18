import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

import { getRunControl } from '../runControl';
import { base64ToBytes, bytesToBase64, pcm16ToWav, resampleInt16 } from './audio';
import { interpretSpeech, type PaceAction } from './commands';
import { mintRealtimeSecret, readOpenAIKey, REALTIME_MODEL, safeVoiceError } from './openai';
import { PREVIEW_LINE, type RealtimeVoiceId } from './voices';

export type PaceStatus = 'listening' | 'thinking' | 'speaking' | 'disconnected';

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
  private playing = false;
  private closed = false;
  private lastHeard = '';

  constructor(
    private voice: RealtimeVoiceId,
    private speed: number,
    private handler: Handler,
  ) {}

  async connect(): Promise<void> {
    this.closed = false;
    this.setStatus('disconnected');
    try {
      await setIsAudioActiveAsync(true);
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        allowsRecording: true,
        shouldPlayInBackground: true,
        allowsBackgroundRecording: true,
        shouldRouteThroughEarpiece: false,
      });
      const secret = await mintRealtimeSecret(REALTIME_MODEL);
      const socket = openRealtimeSocket(secret);
      this.socket = socket;
      socket.onopen = () => {
        this.send({
          type: 'session.update',
          session: {
            type: 'realtime',
            instructions: this.instructions(),
            output_modalities: ['audio'],
            audio: {
              input: {
                format: { type: 'audio/pcm', rate: 24000 },
                turn_detection: { type: 'server_vad', interrupt_response: true, create_response: true },
                transcription: { model: 'gpt-4o-mini-transcribe' },
              },
              output: {
                format: { type: 'audio/pcm', rate: 24000 },
                voice: this.voice,
              },
            },
            tools: TOOLS,
            tool_choice: 'auto',
          },
        });
        this.setStatus('listening');
      };
      socket.onmessage = (event) => this.onMessage(String(event.data));
      socket.onerror = () => this.setStatus('disconnected');
      socket.onclose = () => {
        if (!this.closed) this.setStatus('disconnected');
      };
    } catch (error) {
      this.setStatus('disconnected');
      throw new Error(safeVoiceError(error));
    }
  }

  close(): void {
    this.closed = true;
    this.stopSpeaking();
    this.socket?.close();
    this.socket = null;
    this.setStatus('disconnected');
  }

  pushMic(buffer: ArrayBuffer, sampleRate: number): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || safetyOn) return;
    const samples = resampleInt16(new Int16Array(buffer), sampleRate, 24000);
    const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
    this.send({ type: 'input_audio_buffer.append', audio: bytesToBase64(bytes) });
  }

  announce(text: string, important: boolean): void {
    if (outputMuted || safetyOn || !important) return;
    lastInstruction = text;
    this.send({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: `[workout event] ${text}` }] },
    });
    this.send({ type: 'response.create' });
  }

  updateInstructions(): void {
    this.send({ type: 'session.update', session: { instructions: this.instructions() } });
  }

  private instructions(): string {
    const context = this.handler.getContext();
    return [
      'You are PACE, a running companion. Be brief. The runner may interrupt you.',
      'Never tell someone to keep running through pain, dizziness, chest discomfort, or trouble breathing.',
      'Use tools for pause, resume, finish, mute, metrics, rest, and safety. Do not claim an action until the tool result confirms it.',
      'Finish the run only when confirmed is true.',
      'Do not ask for raw GPS coordinates.',
      `Status ${context.status}. Distance ${context.distance}. Pace ${context.currentPace}. Average ${context.averagePace}. Time ${context.time}.`,
      `Goal ${context.goal}. Remaining ${context.remaining}. Tone ${context.tone}. Frequency ${context.frequency}.`,
      context.safety ? 'Safety mode is on. Only help them stop and get safe.' : 'Ordinary encouragement stays short.',
    ].join(' ');
  }

  private onMessage(raw: string): void {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    const type = String(event.type ?? '');
    if (type === 'input_audio_buffer.speech_started') {
      this.stopSpeaking();
      this.send({ type: 'response.cancel' });
      this.setStatus('listening');
      return;
    }
    if (type === 'conversation.item.input_audio_transcription.completed' || type.endsWith('input_audio_transcription.completed')) {
      const transcript = String(event.transcript ?? '');
      if (transcript && transcript !== this.lastHeard) {
        this.lastHeard = transcript;
        this.handler.onHeard(transcript);
        this.applyLocal(transcript);
      }
      this.setStatus('thinking');
      return;
    }
    if (type === 'response.output_audio.delta' || type === 'response.audio.delta') {
      if (!outputMuted && typeof event.delta === 'string') this.enqueue(base64ToBytes(event.delta));
      this.setStatus('speaking');
      return;
    }
    if (type === 'response.output_audio_transcript.done' || type === 'response.audio_transcript.done') {
      const text = String(event.transcript ?? '');
      if (text) {
        lastInstruction = text;
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
      if (!this.playing && this.queue.length === 0) this.setStatus('listening');
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
    if (outputMuted || safetyOn) return;
    this.queue.push(pcm);
    void this.pump();
  }

  private async pump(): Promise<void> {
    if (this.playing || outputMuted || safetyOn) return;
    const next = this.queue.shift();
    if (!next || next.length < 2) {
      this.setStatus('listening');
      return;
    }
    this.playing = true;
    this.setStatus('speaking');
    try {
      const wav = pcm16ToWav(next, 24000);
      const file = new File(Paths.cache, `pace-${Date.now()}.wav`);
      file.create({ overwrite: true });
      await file.write(bytesToBase64(wav), { encoding: 'base64' });
      const player = await playSavedFile(file.uri, this.speed);
      this.players.push(player);
      await new Promise((resolve) => setTimeout(resolve, Math.max(200, (next.length / 2 / 24000) * 1000)));
    } catch {
      this.setStatus('listening');
    } finally {
      this.playing = false;
      if (!this.closed) void this.pump();
    }
  }

  private stopSpeaking(): void {
    this.queue = [];
    this.playing = false;
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

export function stopVoicePreview(): void {
  try {
    previewPlayer?.pause();
    previewPlayer?.remove();
  } catch {
    // The clip may already have ended.
  }
  previewPlayer = null;
}

export async function previewVoice(voice: RealtimeVoiceId, speed: number): Promise<void> {
  const key = readOpenAIKey();
  if (!key) throw new Error('Voice is not configured on this build.');
  stopVoicePreview();
  await prepareSpeaker();
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice,
      input: PREVIEW_LINE,
      response_format: 'mp3',
    }),
  });
  if (!response.ok) throw new Error(`Voice preview was refused (${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength < 100) throw new Error('Voice preview came back empty.');
  const file = new File(Paths.cache, `pace-preview-${voice}.mp3`);
  file.create({ overwrite: true });
  await file.write(bytesToBase64(bytes), { encoding: 'base64' });
  previewPlayer = await playSavedFile(file.uri, speed);
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

async function playSavedFile(uri: string, speed: number): Promise<AudioPlayer> {
  const player = createAudioPlayer({ uri });
  player.volume = 1;
  player.loop = false;
  player.muted = false;
  player.setPlaybackRate(speed, 'medium');
  player.play();
  await new Promise((resolve) => setTimeout(resolve, 400));
  if (!player.playing && !player.isLoaded) {
    throw new Error('The speaker did not start. Turn off silent mode, raise the volume, and try Preview again.');
  }
  return player;
}
