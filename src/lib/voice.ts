import type { Personality, SpeakFrequency, VoiceProvider } from './engine';

export const OPENAI_REALTIME_MODEL = 'gpt-realtime';
export const ELEVEN_REALTIME_MODEL = 'eleven_realtime_v1_mini';

export const OPENAI_VOICES = ['marin', 'cedar', 'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'] as const;

export type ElevenVoice = { id: string; name: string; realtime: string };

export const ELEVEN_VOICES: ElevenVoice[] = [
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', realtime: 'brian' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', realtime: 'rachel' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', realtime: 'adam' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', realtime: 'alice' },
];

export type ResolvedVoice = 'openai' | 'elevenlabs' | 'device';

export type VoiceKeys = { openai: string; eleven: string };

export type LiveStats = {
  distance: string;
  pace: string;
  time: string;
  goal: string;
  status: string;
};

export function readSecret(name: string, env: Record<string, string | undefined> = process.env, extra?: Record<string, unknown>): string {
  const fromEnv = env[name];
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim();
  const fromExtra = extra?.[name];
  if (typeof fromExtra === 'string' && fromExtra.trim()) return fromExtra.trim();
  return '';
}

export function readVoiceKeys(env: Record<string, string | undefined> = process.env, extra?: Record<string, unknown>): VoiceKeys {
  let resolved = extra;
  if (!resolved) {
    try {
      const constants = require('expo-constants').default as { expoConfig?: { extra?: Record<string, unknown> } };
      resolved = constants?.expoConfig?.extra;
    } catch {
      resolved = undefined;
    }
  }
  return {
    openai: readSecret('OPENAI_API_KEY', env, resolved),
    eleven: readSecret('ELEVENLABS_API_KEY', env, resolved),
  };
}

export function resolveVoice(pref: VoiceProvider, keys: VoiceKeys): ResolvedVoice {
  if (pref === 'device') return 'device';
  if (pref === 'openai') return keys.openai ? 'openai' : 'device';
  if (pref === 'elevenlabs') return keys.eleven ? 'elevenlabs' : 'device';
  if (keys.openai) return 'openai';
  if (keys.eleven) return 'elevenlabs';
  return 'device';
}

export function voiceLabel(resolved: ResolvedVoice): string {
  if (resolved === 'openai') return 'Live coach';
  if (resolved === 'elevenlabs') return 'Live coach';
  return 'On-device voice';
}

export function realtimeSocketUrl(provider: Exclude<ResolvedVoice, 'device'>): string {
  if (provider === 'elevenlabs') return 'wss://api.elevenlabs.io/v1/convai/realtime';
  return `wss://api.openai.com/v1/realtime?model=${OPENAI_REALTIME_MODEL}`;
}

export function defaultVoiceId(provider: ResolvedVoice, voiceId: string): string {
  if (voiceId.trim()) return voiceId.trim();
  if (provider === 'elevenlabs') return ELEVEN_VOICES[0].id;
  if (provider === 'openai') return 'marin';
  return '';
}

export function elevenRealtimeName(voiceId: string): string {
  const match = ELEVEN_VOICES.find((voice) => voice.id === voiceId || voice.realtime === voiceId || voice.name.toLowerCase() === voiceId.toLowerCase());
  return match?.realtime ?? 'brian';
}

export function coachInstructions(personality: Personality, speak: SpeakFrequency): string {
  const tone =
    personality === 'strategist'
      ? 'You are a precise running coach. Talk about effort, pace, and the next sensible step.'
      : personality === 'calm'
        ? 'You are a calm running companion. Short sentences, relaxed form, no hype.'
        : 'You are an encouraging running companion. Warm, brief, and specific.';
  const frequency =
    speak === 'quiet'
      ? 'Speak only when asked, at each kilometre, or at the finish.'
      : speak === 'chatty'
        ? 'You may add a short check-in, but never a monologue.'
        : 'Speak at splits, pauses, and when the runner asks.';
  return [
    tone,
    frequency,
    'You are beside the runner. They can interrupt you.',
    'Use only the distances, paces, and times you are given. Never invent a split or a heart rate.',
    'If they mention chest pain, dizziness, fainting, or a sharp pain, tell them to stop and get help.',
    'You cannot see traffic, the road, or their form. Do not claim that you can.',
    'One or two short sentences. They are running.',
  ].join(' ');
}

export function statsLine(stats: LiveStats): string {
  return `Distance ${stats.distance}. Pace ${stats.pace}. Active time ${stats.time}. Status ${stats.status}. Goal ${stats.goal}.`;
}

export function cuePrompt(line: string, stats: LiveStats): string {
  return `Say one short coaching line for this moment. Keep every number exactly as given. Cue: ${line}. ${statsLine(stats)}`;
}

export function questionPrompt(question: string, stats: LiveStats): string {
  return `The runner interrupted to ask: "${question}". Answer in one or two sentences. ${statsLine(stats)} If they mention pain, chest pain, or dizziness, tell them to stop.`;
}

export type SecretRequest = {
  url: string;
  headers: Record<string, string>;
  body: string;
};

export function clientSecretRequest(provider: Exclude<ResolvedVoice, 'device'>, key: string, instructions: string, voice: string): SecretRequest {
  if (provider === 'elevenlabs') {
    return {
      url: 'https://api.elevenlabs.io/v1/convai/realtime/client_secrets',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expires_after: { seconds: 600 },
        session: {
          type: 'realtime',
          model: ELEVEN_REALTIME_MODEL,
          instructions,
          output_modalities: ['audio'],
          audio: { output: { voice: elevenRealtimeName(voice) } },
        },
      }),
    };
  }
  return {
    url: 'https://api.openai.com/v1/realtime/client_secrets',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model: OPENAI_REALTIME_MODEL,
        instructions,
        output_modalities: ['audio'],
        audio: { output: { voice: voice || 'marin' } },
      },
    }),
  };
}

export function readEphemeralToken(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as Record<string, unknown>;
  if (typeof record.value === 'string') return record.value;
  const nested = record.client_secret;
  if (nested && typeof nested === 'object') {
    const value = (nested as Record<string, unknown>).value;
    if (typeof value === 'string') return value;
  }
  return '';
}

export function sessionUpdateEvent(provider: Exclude<ResolvedVoice, 'device'>, instructions: string, voice: string): Record<string, unknown> {
  const model = provider === 'elevenlabs' ? ELEVEN_REALTIME_MODEL : OPENAI_REALTIME_MODEL;
  const spoken = provider === 'elevenlabs' ? elevenRealtimeName(voice) : voice || 'marin';
  return {
    type: 'session.update',
    session: {
      type: 'realtime',
      model,
      instructions,
      output_modalities: ['audio'],
      audio: { output: { voice: spoken } },
    },
  };
}

export function userTextEvent(text: string): Record<string, unknown> {
  return {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text }],
    },
  };
}

export function responseCreateEvent(): Record<string, unknown> {
  return { type: 'response.create' };
}

export function responseCancelEvent(): Record<string, unknown> {
  return { type: 'response.cancel' };
}

export type CoachSocketEvent =
  | { kind: 'ignore' }
  | { kind: 'audio'; delta: string }
  | { kind: 'transcript'; text: string; partial: boolean }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

export function readCoachEvent(payload: unknown): CoachSocketEvent {
  if (!payload || typeof payload !== 'object') return { kind: 'ignore' };
  const record = payload as Record<string, unknown>;
  const type = typeof record.type === 'string' ? record.type : '';
  if (type === 'response.output_audio.delta' || type === 'response.audio.delta') {
    return typeof record.delta === 'string' ? { kind: 'audio', delta: record.delta } : { kind: 'ignore' };
  }
  if (type === 'response.output_audio_transcript.delta' || type === 'response.audio_transcript.delta' || type === 'response.output_text.delta' || type === 'response.text.delta') {
    return typeof record.delta === 'string' ? { kind: 'transcript', text: record.delta, partial: true } : { kind: 'ignore' };
  }
  if (type === 'response.output_audio_transcript.done' || type === 'response.audio_transcript.done') {
    return typeof record.transcript === 'string' ? { kind: 'transcript', text: record.transcript, partial: false } : { kind: 'ignore' };
  }
  if (type === 'response.output_text.done' || type === 'response.text.done') {
    return typeof record.text === 'string' ? { kind: 'transcript', text: record.text, partial: false } : { kind: 'ignore' };
  }
  if (type === 'response.output_audio.done' || type === 'response.done') return { kind: 'done' };
  if (type === 'error') {
    const error = record.error;
    const message = error && typeof error === 'object' && typeof (error as Record<string, unknown>).message === 'string'
      ? String((error as Record<string, unknown>).message)
      : 'The live coach could not answer.';
    return { kind: 'error', message: safeCoachError(message) };
  }
  return { kind: 'ignore' };
}

export function safeCoachError(message: string): string {
  if (/sk-|bearer|api[_-]?key|xi-api|token/i.test(message)) {
    return 'The live coach could not connect. Your run is still recording.';
  }
  const clean = message.replace(/\s+/g, ' ').trim();
  if (!clean) return 'The live coach could not answer. Your run is still recording.';
  return clean.slice(0, 160);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    const slice = bytes.subarray(index, index + size);
    binary += String.fromCharCode(...slice);
  }
  return globalThis.btoa(binary);
}

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
}

export function pcm16ToWav(pcm: Uint8Array, sampleRate = 24000): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, pcm.length, true);
  const wav = new Uint8Array(44 + pcm.length);
  wav.set(new Uint8Array(header), 0);
  wav.set(pcm, 44);
  return wav;
}
