import assert from 'node:assert/strict';
import { test } from 'node:test';

import { distanceToPathMeters, nextMapCue, type MapCueInput } from '../src/lib/pace/mapCues.ts';

function input(patch: Partial<MapCueInput> = {}): MapCueInput {
  return {
    distanceM: 10,
    status: 'running',
    plannedM: 5000,
    routeName: 'Park Loop',
    offRouteM: 5,
    unit: 'km',
    paceLabel: '5:40',
    voiceName: 'Marin',
    tone: 'friendly',
    spoken: new Set(),
    now: 1_000_000,
    lastOffRouteAt: 0,
    ...patch,
  };
}

test('the selected voice opens the run on the map', () => {
  const cue = nextMapCue(input());
  assert.equal(cue?.id, 'start');
  assert.match(cue?.line ?? '', /Marin/);
  assert.match(cue?.line ?? '', /Park Loop/);
});

test('each kilometre is spoken once, in the chosen tone', () => {
  const first = nextMapCue(input({ distanceM: 1000, spoken: new Set(['start']) }));
  assert.equal(first?.id, 'km-1');
  const again = nextMapCue(input({ distanceM: 1400, spoken: new Set(['start', 'km-1']) }));
  assert.equal(again, null);
  const calm = nextMapCue(input({ distanceM: 1000, tone: 'calm', voiceName: 'Cedar', spoken: new Set(['start']) }));
  assert.match(calm?.line ?? '', /Cedar/);
  assert.match(calm?.line ?? '', /Easy/);
});

test('leaving the line is called out, then left alone for two minutes', () => {
  const cue = nextMapCue(input({ distanceM: 800, offRouteM: 90, spoken: new Set(['start']) }));
  assert.equal(cue?.kind, 'offroute');
  const soon = nextMapCue(input({ distanceM: 800, offRouteM: 90, spoken: new Set(['start', cue?.id ?? '']), lastOffRouteAt: 1_000_000, now: 1_010_000 }));
  assert.notEqual(soon?.kind, 'offroute');
});

test('distance to the planned line is small when the runner is on it', () => {
  const near = distanceToPathMeters({ lat: 51.5, lon: -0.12 }, [[-0.12, 51.5], [-0.119, 51.501]]);
  const far = distanceToPathMeters({ lat: 51.52, lon: -0.1 }, [[-0.12, 51.5], [-0.119, 51.501]]);
  assert.ok(near < 30);
  assert.ok(far > 70);
});
