import assert from 'node:assert/strict';
import { test } from 'node:test';

const key = process.env.OPENAI_API_KEY?.trim() ?? '';

test('openai realtime mints a short-lived secret and opens a session', { skip: key.length === 0 }, async () => {
  const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session: { type: 'realtime', model: 'gpt-realtime' } }),
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { value?: string };
  const secret = body.value ?? '';
  assert.equal(secret.length > 8, true);
  assert.equal(secret.startsWith('sk-'), false);
  await new Promise<void>((resolve, reject) => {
    const socket = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-realtime', [
      'realtime',
      `openai-insecure-api-key.${secret}`,
    ]);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('realtime session did not open'));
    }, 15000);
    socket.onmessage = (event) => {
      const payload = JSON.parse(String(event.data)) as { type?: string };
      if (payload.type === 'session.created' || payload.type === 'session.updated') {
        clearTimeout(timer);
        socket.close();
        resolve();
      }
    };
    socket.onerror = () => {
      clearTimeout(timer);
      reject(new Error('realtime socket failed'));
    };
  });
});
