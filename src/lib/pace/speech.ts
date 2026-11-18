export type SpeechTone = 'friendly' | 'energetic' | 'calm' | 'focused';

export const PCM_RATE = 24000;
const BYTES_PER_SECOND = PCM_RATE * 2;

/** Enough spoken audio to cover the rest of a short line while it is still generating. */
export const FIRST_PCM_BYTES = Math.floor(BYTES_PER_SECOND * 0.65);
/** Later pieces stay long enough that a file handoff is not a click every few words. */
export const NEXT_PCM_BYTES = BYTES_PER_SECOND;

export function spokenSpeed(speed: number, tone: SpeechTone = 'friendly'): number {
  const chosen = Number.isFinite(speed) && speed > 0 ? speed : 1;
  const floor = tone === 'calm' ? 1.08 : 1.15;
  return Math.round(Math.min(1.5, Math.max(floor, chosen)) * 100) / 100;
}

export function speechInstructions(tone: SpeechTone): string {
  const manner: Record<SpeechTone, string> = {
    friendly: 'Warm and close, like a friend running beside them.',
    energetic: 'Bright and quick, like a coach calling a split.',
    calm: 'Steady and reassuring, without dragging the words.',
    focused: 'Crisp and brief, like a race split.',
  };
  return `${manner[tone]} Begin speaking immediately. Keep pauses between sentences very short. Do not add words.`;
}

export function speechBody(text: string, voice: string, speed: number, tone: SpeechTone = 'friendly') {
  return {
    model: 'gpt-4o-mini-tts',
    voice,
    input: text,
    response_format: 'pcm' as const,
    stream_format: 'audio' as const,
    speed: spokenSpeed(speed, tone),
    instructions: speechInstructions(tone),
  };
}

export function pullPcm(buffer: Uint8Array, minBytes: number, flush: boolean): { chunk: Uint8Array | null; rest: Uint8Array } {
  const evenMin = minBytes - (minBytes % 2);
  const even = buffer.length - (buffer.length % 2);
  if (even < 2) return { chunk: null, rest: buffer };
  if (!flush && even < evenMin) return { chunk: null, rest: buffer };
  const size = flush ? even : evenMin;
  return { chunk: buffer.slice(0, size), rest: buffer.slice(size) };
}

export function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  if (left.length === 0) return right;
  if (right.length === 0) return left;
  const merged = new Uint8Array(left.length + right.length);
  merged.set(left, 0);
  merged.set(right, left.length);
  return merged;
}
