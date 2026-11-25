import type { Session } from './engine';

export type RunControl = {
  getSession: () => Session;
  pause: () => void;
  resume: () => void;
  finish: () => void;
  ask: (question: string) => Promise<string>;
  askAudio: (uri: string) => Promise<string>;
  interrupt: () => void;
  voiceStatus: () => string;
};

let control: RunControl | null = null;

export function setRunControl(next: RunControl | null): void {
  control = next;
}

export function getRunControl(): RunControl | null {
  return control;
}
