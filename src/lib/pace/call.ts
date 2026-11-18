export type CallTurn = { role: 'you' | 'pace'; text: string };

export type WorkoutKind = 'km' | 'halfway' | 'almost' | 'offroute' | 'pause' | 'resume' | 'context';

export type WorkoutNotice = {
  kind: WorkoutKind;
  text: string;
  interrupt: boolean;
  speak: boolean;
};

export const CALL_VAD = {
  type: 'server_vad' as const,
  threshold: 0.55,
  prefix_padding_ms: 300,
  silence_duration_ms: 650,
  interrupt_response: true,
  create_response: true,
};

const SPOKEN = new Set<WorkoutKind>(['almost', 'offroute', 'pause', 'resume']);

export function workoutNotice(kind: WorkoutKind, detail: string): WorkoutNotice {
  const text = detail.trim();
  const speak = SPOKEN.has(kind);
  return { kind, text, speak, interrupt: speak };
}

export function callInstructions(input: {
  voiceName: string;
  tone: string;
  status: string;
  distance: string;
  currentPace: string;
  averagePace: string;
  time: string;
  goal: string;
  remaining: string;
  frequency: string;
  fact: string;
}): string {
  return [
    `You are ${input.voiceName}, on a live in-app call with a runner for this whole workout. Speak like a person running beside them.`,
    'The microphone is already open. Never ask them to tap a button before they talk. They may interrupt you, and you stop when they do.',
    'Keep a turn to one or two sentences. You may ask a question, react to how they sound, or bring up the run.',
    'Do not recite every kilometre or read workout facts like a GPS prompt. Mention a fact only when it matters, in your own words.',
    'Never tell them to keep running through dizziness, chest pain, fainting, or trouble breathing. Use the safety tool and tell them to stop.',
    'Use tools for pause, resume, finish, mute, and metrics. Do not claim an action until the tool result confirms it. Finish only when confirmed is true.',
    `Tone ${input.tone}. Company ${input.frequency}. Status ${input.status}. Distance ${input.distance}. Pace ${input.currentPace}. Average ${input.averagePace}. Time ${input.time}.`,
    `Goal ${input.goal}. Remaining ${input.remaining}.`,
    input.fact ? `Latest workout fact, for you, not for reading aloud unless it matters: ${input.fact}` : 'No new workout fact.',
  ].join(' ');
}

export function textItem(text: string): { type: 'conversation.item.create'; item: { type: 'message'; role: 'user'; content: { type: 'input_text'; text: string }[] } } {
  return {
    type: 'conversation.item.create',
    item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
  };
}

export function greetingText(voiceName: string): string {
  return `${voiceName} just picked up. Greet the runner in one or two short sentences and start the call. Do not list their stats.`;
}

export function resumeText(turns: CallTurn[]): string {
  const recent = turns.slice(-8);
  const lines = recent.map((turn) => `${turn.role === 'you' ? 'Runner' : 'PACE'}: ${turn.text}`);
  const memory = lines.length ? `Recent conversation:\n${lines.join('\n')}` : 'There is no earlier transcript.';
  return `The call dropped for a moment and is back. ${memory} Continue naturally. Do not start over with a long greeting.`;
}

export function truncateEvent(itemId: string, audioEndMs: number): { type: 'conversation.item.truncate'; item_id: string; content_index: number; audio_end_ms: number } {
  return {
    type: 'conversation.item.truncate',
    item_id: itemId,
    content_index: 0,
    audio_end_ms: Math.max(0, Math.floor(audioEndMs)),
  };
}

export function rememberTurn(turns: CallTurn[], role: CallTurn['role'], text: string): CallTurn[] {
  const clean = text.trim();
  if (!clean) return turns;
  const last = turns[turns.length - 1];
  if (last && last.role === role && last.text === clean) return turns;
  return [...turns, { role, text: clean }].slice(-16);
}
