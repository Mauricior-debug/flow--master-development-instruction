import Constants from 'expo-constants';

export function readOpenAIKey(): string {
  const fromProcess = process.env.OPENAI_API_KEY;
  if (typeof fromProcess === 'string' && fromProcess.trim()) return fromProcess.trim();
  const extra = Constants.expoConfig?.extra as { OPENAI_API_KEY?: unknown } | undefined;
  if (typeof extra?.OPENAI_API_KEY === 'string' && extra.OPENAI_API_KEY.trim()) return extra.OPENAI_API_KEY.trim();
  return '';
}

export function safeVoiceError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  return raw.replace(/sk-[A-Za-z0-9_\-]+/g, 'key').replace(/ek_[A-Za-z0-9_\-]+/g, 'session').slice(0, 160);
}

export async function mintRealtimeSecret(model: string): Promise<string> {
  const key = readOpenAIKey();
  if (!key) throw new Error('Voice is not configured on this build.');
  const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model,
      },
    }),
  });
  if (!response.ok) throw new Error(`Voice session was refused (${response.status}).`);
  const body = (await response.json()) as { value?: string; client_secret?: { value?: string } };
  const secret = body.value || body.client_secret?.value;
  if (!secret) throw new Error('Voice session did not return a short-lived credential.');
  return secret;
}

export const REALTIME_MODEL = 'gpt-realtime';
