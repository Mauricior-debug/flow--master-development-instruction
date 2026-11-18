export type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<void> | void;
};

let current: ConfirmRequest | null = null;

export function askConfirm(request: ConfirmRequest): void {
  current = request;
}

export function readConfirm(): ConfirmRequest | null {
  return current;
}

export function clearConfirm(): void {
  current = null;
}
