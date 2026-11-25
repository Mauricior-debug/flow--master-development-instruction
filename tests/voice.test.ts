import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  base64ToBytes,
  bytesToBase64,
  clientSecretRequest,
  cuePrompt,
  pcm16ToWav,
  readCoachEvent,
  readEphemeralToken,
  realtimeSocketUrl,
  resolveVoice,
  safeCoachError,
  sessionUpdateEvent,
} from '../src/lib/voice.ts';

const empty = { openai: '', eleven: '' };

test('voice provider prefers a live coach and falls back to the phone', () => {
  assert.equal(resolveVoice('auto', empty), 'device');
  assert.equal(resolveVoice('auto', { openai: 'present', eleven: 'present' }), 'openai');
  assert.equal(resolveVoice('auto', { openai: '', eleven: 'present' }), 'elevenlabs');
  assert.equal(resolveVoice('elevenlabs', empty), 'device');
  assert.equal(resolveVoice('device', { openai: 'present', eleven: 'present' }), 'device');
});

test('realtime urls do not carry a credential', () => {
  assert.equal(realtimeSocketUrl('openai').includes('api.openai.com'), true);
  assert.equal(realtimeSocketUrl('elevenlabs'), 'wss://api.elevenlabs.io/v1/convai/realtime');
  const request = clientSecretRequest('openai', 'not-a-real-key', 'Be brief.', 'marin');
  assert.equal(request.url.includes('not-a-real-key'), false);
  assert.equal(request.headers.Authorization?.startsWith('Bearer '), true);
});

test('ephemeral token is read without keeping the rest of the payload', () => {
  assert.equal(readEphemeralToken({ value: 'short-lived' }), 'short-lived');
  assert.equal(readEphemeralToken({ client_secret: { value: 'nested' } }), 'nested');
  assert.equal(readEphemeralToken({}), '');
});

test('socket events become text, audio, or a safe error', () => {
  assert.deepEqual(readCoachEvent({ type: 'response.output_audio_transcript.done', transcript: 'Ease off.' }), {
    kind: 'transcript',
    text: 'Ease off.',
    partial: false,
  });
  assert.equal(readCoachEvent({ type: 'response.output_audio.delta', delta: 'AAA' }).kind, 'audio');
  const error = readCoachEvent({ type: 'error', error: { message: 'Bearer secret refused' } });
  assert.equal(error.kind, 'error');
  if (error.kind === 'error') assert.equal(error.message.includes('Bearer'), false);
  assert.match(safeCoachError('network down'), /network down/);
});

test('pcm becomes a wav and round-trips through base64', () => {
  const pcm = new Uint8Array([0, 1, 2, 3]);
  const wav = pcm16ToWav(pcm, 24000);
  assert.equal(wav.length, 48);
  assert.equal(String.fromCharCode(wav[0], wav[1], wav[2], wav[3]), 'RIFF');
  assert.deepEqual(base64ToBytes(bytesToBase64(pcm)), pcm);
});

test('a coaching prompt carries the live stats', () => {
  const prompt = cuePrompt('1 kilometre.', { distance: '1.00 km', pace: '5:40 /km', time: '05:40', goal: '5k', status: 'running' });
  assert.match(prompt, /1.00 km/);
  assert.match(prompt, /5:40/);
  const update = sessionUpdateEvent('elevenlabs', 'Be brief.', 'rachel');
  assert.equal((update.session as { model: string }).model, 'eleven_realtime_v1_mini');
});
