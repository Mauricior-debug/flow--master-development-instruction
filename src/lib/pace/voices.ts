export const REALTIME_VOICES = [
  { id: 'alloy', title: 'Alloy', detail: 'Balanced and versatile', recommended: false },
  { id: 'ash', title: 'Ash', detail: 'Expressive and confident', recommended: false },
  { id: 'ballad', title: 'Ballad', detail: 'Warm and gentle', recommended: false },
  { id: 'coral', title: 'Coral', detail: 'Friendly and conversational', recommended: false },
  { id: 'echo', title: 'Echo', detail: 'Clear and composed', recommended: false },
  { id: 'sage', title: 'Sage', detail: 'Calm and thoughtful', recommended: false },
  { id: 'shimmer', title: 'Shimmer', detail: 'Bright and upbeat', recommended: false },
  { id: 'verse', title: 'Verse', detail: 'Expressive and energetic', recommended: false },
  { id: 'marin', title: 'Marin', detail: 'Natural and engaging', recommended: true },
  { id: 'cedar', title: 'Cedar', detail: 'Warm and grounded', recommended: true },
] as const;

export type RealtimeVoiceId = (typeof REALTIME_VOICES)[number]['id'];

export const PREVIEW_LINE = "Hey! I'm right here with you. Let's find our rhythm and make this run count.";

export function isRealtimeVoice(value: string | undefined): value is RealtimeVoiceId {
  return REALTIME_VOICES.some((voice) => voice.id === value);
}

export function voiceTitle(id: string | undefined): string {
  return REALTIME_VOICES.find((voice) => voice.id === id)?.title ?? 'Marin';
}
