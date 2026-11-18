import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOCK_CONTROLS, nowPlayingCopy, remotePauseIntent } from '../src/lib/pocketPolicy.ts';

test('lock screen controls do not pretend the call can be seeked', () => {
  assert.equal(LOCK_CONTROLS.isLiveStream, true);
  assert.equal(LOCK_CONTROLS.showSeekForward, false);
  assert.equal(LOCK_CONTROLS.showSeekBackward, false);
});

test('now playing names the run without a finish action', () => {
  const copy = nowPlayingCopy({ time: '24:36', distance: '3.42 km', pace: '6:12 /km', companion: 'Marin · Live', paused: false });
  assert.match(copy.title, /PACE AI/);
  assert.match(copy.artist, /3\.42 km/);
  assert.match(copy.albumTitle, /24:36/);
  assert.equal(nowPlayingCopy({ time: '1:00', distance: '0.2 km', pace: '—', companion: 'Coach', paused: true }).title, 'PACE AI · Paused');
});

test('a phone-call interruption does not pause the run', () => {
  assert.equal(remotePauseIntent('waiting', false, 'running'), 'ignore');
  assert.equal(remotePauseIntent('paused', false, 'running'), 'pause');
  assert.equal(remotePauseIntent('playing', true, 'paused'), 'resume');
  assert.equal(remotePauseIntent('playing', true, 'running'), 'ignore');
});
