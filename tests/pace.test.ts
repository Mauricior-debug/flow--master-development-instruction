import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resampleInt16 } from '../src/lib/pace/audio.ts';
import { interpretSpeech, safetyLineAllowsRunning } from '../src/lib/pace/commands.ts';
import { REALTIME_VOICES, isRealtimeVoice } from '../src/lib/pace/voices.ts';

test('official realtime voices include the recommended pair', () => {
  assert.equal(REALTIME_VOICES.length, 10);
  assert.equal(isRealtimeVoice('marin'), true);
  assert.equal(isRealtimeVoice('cedar'), true);
  assert.equal(isRealtimeVoice('custom-voice'), false);
  assert.equal(REALTIME_VOICES.filter((voice) => voice.recommended).map((voice) => voice.id).join(','), 'marin,cedar');
});

test('safety interrupts before a pause or a finish', () => {
  const safety = interpretSpeech("I'm feeling dizzy. I need to stop.");
  assert.equal(safety.action, 'trigger_safety_flow');
  assert.equal(safety.priority, 1);
  assert.equal(safetyLineAllowsRunning(safety.say), false);
  assert.match(safety.say, /999/);
});

test('pause is immediate and finish waits for confirmation', () => {
  assert.equal(interpretSpeech('Pause my run').action, 'pause_run');
  assert.equal(interpretSpeech('Pause my run').needsConfirmation, false);
  const finish = interpretSpeech('Finish my run');
  assert.equal(finish.action, 'finish_run');
  assert.equal(finish.needsConfirmation, true);
  const confirmed = interpretSpeech('yes, finish the run', true);
  assert.equal(confirmed.action, 'finish_run');
  assert.equal(confirmed.needsConfirmation, false);
});

test('mute and metrics are commands, not motivation', () => {
  assert.equal(interpretSpeech('Stop talking').action, 'mute_coach');
  assert.equal(interpretSpeech("What's my pace?").action, 'get_live_metrics');
  assert.equal(interpretSpeech('How far have I gone?').action, 'get_live_metrics');
  assert.equal(interpretSpeech("I'm feeling tired").tone, 'calm');
});

test('microphone audio can be resampled to 24 kHz', () => {
  const input = Int16Array.from([0, 1000, 0, -1000]);
  const output = resampleInt16(input, 48000, 24000);
  assert.equal(output.length, 2);
});
