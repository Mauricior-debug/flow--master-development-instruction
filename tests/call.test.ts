import assert from 'node:assert/strict';
import { test } from 'node:test';

import { callInstructions, greetingText, rememberTurn, resumeText, truncateEvent, workoutNotice, CALL_VAD } from '../src/lib/pace/call.ts';

test('a kilometre is context, not a spoken announcement', () => {
  const km = workoutNotice('km', 'Distance is 2 km. Pace 5:40.');
  assert.equal(km.speak, false);
  assert.equal(km.interrupt, false);
  const off = workoutNotice('offroute', 'The runner is about 90 metres off the planned line.');
  assert.equal(off.speak, true);
  assert.equal(off.interrupt, true);
  assert.equal(workoutNotice('pause', 'The runner paused.').interrupt, true);
});

test('the call instructions keep the microphone open and skip split recitals', () => {
  const text = callInstructions({
    voiceName: 'Marin',
    tone: 'friendly',
    status: 'running',
    distance: '1.2 km',
    currentPace: '5:40',
    averagePace: '5:50',
    time: '06:12',
    goal: 'Park Loop',
    remaining: '3.8 km',
    frequency: 'normal',
    fact: 'Distance is 1.2 km.',
  });
  assert.match(text, /microphone is already open/i);
  assert.match(text, /Do not recite every kilometre/);
  assert.match(text, /Marin/);
  assert.match(text, /1\.2 km/);
  assert.equal(CALL_VAD.interrupt_response, true);
  assert.equal(CALL_VAD.create_response, true);
});

test('greeting, resume memory, and truncate stay short', () => {
  assert.match(greetingText('Cedar'), /Do not list their stats/);
  const turns = rememberTurn(rememberTurn([], 'you', 'Should we go longer next week?'), 'pace', 'Let us see how you recover first.');
  const resumed = resumeText(turns);
  assert.match(resumed, /Should we go longer next week/);
  assert.match(resumed, /Do not start over/);
  assert.deepEqual(truncateEvent('item_1', 840.6), {
    type: 'conversation.item.truncate',
    item_id: 'item_1',
    content_index: 0,
    audio_end_ms: 840,
  });
  assert.equal(rememberTurn(turns, 'pace', 'Let us see how you recover first.').length, 2);
});
