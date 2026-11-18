import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FIRST_PCM_BYTES, pullPcm, speechBody, spokenSpeed } from '../src/lib/pace/speech.ts';

test('a saved 1x pace is lifted to a running cadence', () => {
  assert.equal(spokenSpeed(1, 'friendly'), 1.15);
  assert.equal(spokenSpeed(1, 'calm'), 1.08);
  assert.equal(spokenSpeed(1.45, 'energetic'), 1.45);
  assert.equal(spokenSpeed(2, 'focused'), 1.5);
});

test('speech is streamed pcm with the chosen voice and a short start', () => {
  const body = speechBody('One kilometre.', 'cedar', 1, 'focused');
  assert.equal(body.model, 'gpt-4o-mini-tts');
  assert.equal(body.voice, 'cedar');
  assert.equal(body.response_format, 'pcm');
  assert.equal(body.stream_format, 'audio');
  assert.equal(body.speed, 1.15);
  assert.match(body.instructions, /Begin speaking immediately/);
  assert.match(body.instructions, /Crisp/);
});

test('the first words can play before the rest of the line arrives', () => {
  const early = new Uint8Array(FIRST_PCM_BYTES - 2);
  assert.equal(pullPcm(early, FIRST_PCM_BYTES, false).chunk, null);
  const ready = new Uint8Array(FIRST_PCM_BYTES + 5);
  const first = pullPcm(ready, FIRST_PCM_BYTES, false);
  assert.equal(first.chunk?.length, FIRST_PCM_BYTES);
  assert.equal(first.rest.length, 5);
  const tail = pullPcm(first.rest, FIRST_PCM_BYTES, true);
  assert.equal(tail.chunk?.length, 4);
  assert.equal(tail.rest.length, 1);
});
