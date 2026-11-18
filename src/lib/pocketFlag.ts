let recording = false;

export function setPocketRecording(value: boolean): void {
  recording = value;
}

export function pocketRecording(): boolean {
  return recording;
}
