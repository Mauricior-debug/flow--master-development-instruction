export type PaceAction =
  | 'pause_run'
  | 'resume_run'
  | 'finish_run'
  | 'mute_coach'
  | 'enable_coach'
  | 'get_live_metrics'
  | 'get_route_progress'
  | 'change_coaching_mode'
  | 'start_rest_interval'
  | 'skip_interval'
  | 'repeat_last_instruction'
  | 'trigger_safety_flow'
  | 'none';

export type SpeechIntent = {
  action: PaceAction;
  priority: 1 | 2 | 3 | 4;
  needsConfirmation: boolean;
  say: string;
  tone?: 'friendly' | 'energetic' | 'calm' | 'focused';
};

const SAFETY = /\b(dizzy|dizziness|chest|can'?t breathe|cannot breathe|faint|fainting|heart attack|severe pain|crushing pain|help me|call (an )?ambulance)\b/i;
const MUTE = /\b(stop talking|be quiet|mute|shut up|silence)\b/i;
const ENABLE = /\b(talk to me|start talking|unmute|you can talk)\b/i;
const FINISH = /\b(finish( my| the)? run|end (my|the) run|stop the workout|i'?m done running)\b/i;
const CONFIRM = /\b(yes|confirm|finish|end it|do it)\b/i;
const PAUSE = /\b(pause|hold on|take a break|i need a break|stop running|stop)\b/i;
const RESUME = /\b(resume|continue|keep going|start again|let'?s go)\b/i;
const DISTANCE = /\b(how far|distance|how much (have i|left))\b/i;
const PACE = /\b(pace|how fast)\b/i;
const TIRED = /\b(tired|exhausted|heavy legs)\b/i;
const REPEAT = /\b(repeat|say that again|what did you say)\b/i;
const REST = /\b(rest interval|recovery interval|let me recover)\b/i;
const SKIP = /\b(skip (the )?interval|next interval)\b/i;

export function interpretSpeech(text: string, pendingFinish = false): SpeechIntent {
  const said = text.trim();
  if (!said) return none();
  if (SAFETY.test(said) || /\bi need to stop\b/i.test(said) && SAFETY.test(said)) {
    return {
      action: 'trigger_safety_flow',
      priority: 1,
      needsConfirmation: false,
      say: 'Stop running now. Sit or lie down somewhere safe if you can. Do not push through this. If you have chest pain, trouble breathing, or you feel like you might faint, call 999.',
    };
  }
  if (/\bi need to stop\b/i.test(said) && /\b(dizzy|pain|chest|faint|breathe)\b/i.test(said)) {
    return {
      action: 'trigger_safety_flow',
      priority: 1,
      needsConfirmation: false,
      say: 'Stop running now. Sit or lie down somewhere safe if you can. Do not push through this. If it feels severe, call 999.',
    };
  }
  if (MUTE.test(said)) {
    return { action: 'mute_coach', priority: 2, needsConfirmation: false, say: 'I will stay quiet. Tracking continues. Say talk to me when you want me back.' };
  }
  if (ENABLE.test(said)) {
    return { action: 'enable_coach', priority: 2, needsConfirmation: false, say: 'I am here.' };
  }
  if (pendingFinish && CONFIRM.test(said)) {
    return { action: 'finish_run', priority: 2, needsConfirmation: false, say: 'Saving the run.' };
  }
  if (FINISH.test(said)) {
    return { action: 'finish_run', priority: 2, needsConfirmation: true, say: 'Finish the run and save it? Say yes, finish the run.' };
  }
  if (PAUSE.test(said)) {
    return { action: 'pause_run', priority: 2, needsConfirmation: false, say: 'Paused. Take the time you need.' };
  }
  if (RESUME.test(said)) {
    return { action: 'resume_run', priority: 2, needsConfirmation: false, say: 'Resuming. Ease back in.' };
  }
  if (REPEAT.test(said)) {
    return { action: 'repeat_last_instruction', priority: 2, needsConfirmation: false, say: '' };
  }
  if (REST.test(said)) {
    return { action: 'start_rest_interval', priority: 2, needsConfirmation: false, say: 'Recovery interval. Walk or stand easy for one minute.' };
  }
  if (SKIP.test(said)) {
    return { action: 'skip_interval', priority: 2, needsConfirmation: false, say: 'Skipping that interval.' };
  }
  if (DISTANCE.test(said)) {
    return { action: 'get_live_metrics', priority: 2, needsConfirmation: false, say: '' };
  }
  if (PACE.test(said)) {
    return { action: 'get_live_metrics', priority: 2, needsConfirmation: false, say: '' };
  }
  if (TIRED.test(said)) {
    return { action: 'change_coaching_mode', priority: 2, needsConfirmation: false, say: 'Ease off. Shorten your stride and let the effort come down. I will keep it calm.', tone: 'calm' };
  }
  return none();
}

function none(): SpeechIntent {
  return { action: 'none', priority: 4, needsConfirmation: false, say: '' };
}

export function safetyLineAllowsRunning(line: string): boolean {
  const stripped = line.replace(/do not push through|don't push through/gi, '');
  return /\b(keep going|push through|run it off|you can finish)\b/i.test(stripped);
}
