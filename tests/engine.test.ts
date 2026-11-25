import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addPoint,
  answerQuestion,
  asText,
  awardXp,
  bestStreak,
  buildPlan,
  currentStreak,
  distanceMeters,
  earnedAchievementKeys,
  finishSession,
  formatPace,
  pauseSession,
  practicePoint,
  resumeSession,
  runTotals,
  startSession,
  weeklyRunKm,
  type StoredRun,
} from '../src/lib/engine.ts';

test('distance between nearby points is a few metres', () => {
  const meters = distanceMeters({ lat: 51.5, lon: -0.12 }, { lat: 51.50003, lon: -0.12 });
  assert.ok(meters > 2 && meters < 6);
});

test('pace formats minutes and seconds', () => {
  assert.equal(formatPace(305), '5:05');
  assert.equal(formatPace(null), '—');
});

test('asText never returns a raw object', () => {
  assert.equal(asText({ message: 'Nope' }), 'Nope');
  assert.equal(asText({ path: 'src/app/index.tsx', status: 'M' }), 'src/app/index.tsx');
  assert.equal(typeof asText({ id: 1, kind: 'step', label: 'Warm up', state: 'done', at: 'now' }), 'string');
  assert.equal(asText({ label: 'Warm up' }), 'Warm up');
});

test('practice points build distance, splits, and pause', () => {
  let session = startSession(1_000, 'practice');
  for (let index = 0; index < 400; index += 1) {
    session = addPoint(session, practicePoint(index, 1_000));
  }
  assert.ok(session.distanceM > 1000);
  assert.ok(session.splitsKm.length >= 1);
  const paused = pauseSession(session, 500_000);
  assert.equal(paused.status, 'paused');
  const resumed = resumeSession(paused, 520_000);
  assert.equal(resumed.status, 'running');
  assert.equal(resumed.pausedMs, 20_000);
  const finished = finishSession(resumed, 530_000);
  assert.equal(finished.status, 'finished');
  const rejected = addPoint(finished, practicePoint(401, 1_000));
  assert.equal(rejected.points.length, finished.points.length);
});

test('gps spikes are rejected', () => {
  let session = startSession(0, 'gps');
  session = addPoint(session, { lat: 51.5, lon: -0.12, t: 0, accuracy: 5 });
  const spiked = addPoint(session, { lat: 51.6, lon: -0.12, t: 1000, accuracy: 5 });
  assert.equal(spiked.distanceM, 0);
  const noisy = addPoint(session, { lat: 51.50002, lon: -0.12, t: 1000, accuracy: 80 });
  assert.equal(noisy.points.length, 1);
});

test('rewards refuse unknown reasons and short runs', () => {
  assert.deepEqual(awardXp('checkin.done', {}), { amount: 15 });
  assert.equal('error' in awardXp('run.finish', { km: 0.05 }), true);
  assert.equal('error' in awardXp('free-money', {}), true);
  const earned = awardXp('run.finish', { km: 5 });
  assert.equal('amount' in earned && earned.amount >= 50, true);
});

test('streaks count consecutive days only', () => {
  assert.equal(currentStreak(['2026-03-01', '2026-03-02', '2026-03-03'], '2026-03-03'), 3);
  assert.equal(currentStreak(['2026-03-01', '2026-03-03'], '2026-03-03'), 1);
  assert.equal(bestStreak(['2026-03-01', '2026-03-02', '2026-03-04', '2026-03-05', '2026-03-06']), 3);
});

test('plan includes rest and does not jump wildly', () => {
  const plan = buildPlan({
    userId: 'user',
    goal: '5k',
    experience: 'new',
    daysPerWeek: 3,
    longRunDay: 6,
    startDate: '2026-03-02',
  });
  assert.equal(plan.length, 28);
  assert.ok(plan.some((item) => item.kind === 'rest'));
  const weeks = weeklyRunKm(plan);
  for (let index = 1; index < weeks.length; index += 1) {
    if (weeks[index - 1] === 0) continue;
    assert.ok(weeks[index] <= weeks[index - 1] * 1.2 + 0.2);
  }
});

test('pain cues tell the runner to stop', () => {
  const reply = answerQuestion('my chest hurts', { distance: '2.00 km', pace: '6:00 /km', time: '12:00', goal: '5k', kmLeft: null }, 'calm');
  assert.match(reply, /Stop and walk/);
});

test('week totals count only finished runs', () => {
  const now = new Date(2026, 2, 4, 12);
  const finished: StoredRun = {
    id: 'run',
    userId: 'user',
    goalLabel: 'Easy',
    summary: '',
    session: {
      status: 'finished',
      source: 'gps',
      startedAt: now.getTime() - 1000,
      finishedAt: now.getTime(),
      points: [],
      movingMs: 1000,
      pausedMs: 0,
      pauseStartedAt: null,
      distanceM: 2500,
      splitsKm: [],
      splitsMi: [],
    },
  };
  const open = { ...finished, id: 'open', session: { ...finished.session, status: 'running' as const, finishedAt: undefined, distanceM: 9000 } };
  const totals = runTotals([finished, open], 'user', now);
  assert.equal(totals.finished, 1);
  assert.equal(totals.weekM, 2500);
});

test('achievements follow the rules', () => {
  assert.deepEqual(earnedAchievementKeys({ habits: 0, checkins: 0, bestStreak: 0, finishedRuns: 0, longestRunM: 0 }), []);
  assert.ok(earnedAchievementKeys({ habits: 1, checkins: 1, bestStreak: 7, finishedRuns: 1, longestRunM: 5200 }).includes('run-5k'));
});
