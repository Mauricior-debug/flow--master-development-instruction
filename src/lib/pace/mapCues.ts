export type CueTone = 'friendly' | 'energetic' | 'calm' | 'focused';

export type MapCue = {
  id: string;
  kind: 'start' | 'km' | 'halfway' | 'almost' | 'offroute';
  line: string;
};

export type MapCueInput = {
  distanceM: number;
  status: 'running' | 'paused' | 'finished';
  plannedM: number;
  routeName: string;
  offRouteM: number | null;
  unit: 'km' | 'mi';
  paceLabel: string;
  voiceName: string;
  tone: CueTone;
  spoken: ReadonlySet<string>;
  now: number;
  lastOffRouteAt: number;
};

function distanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function distanceToPathMeters(point: { lat: number; lon: number }, coordinates: [number, number][]): number {
  if (coordinates.length === 0) return Infinity;
  let best = Infinity;
  for (let index = 1; index < coordinates.length; index += 1) {
    const start = { lat: coordinates[index - 1][1], lon: coordinates[index - 1][0] };
    const end = { lat: coordinates[index][1], lon: coordinates[index][0] };
    for (let step = 0; step <= 4; step += 1) {
      const mix = step / 4;
      const mid = { lat: start.lat + (end.lat - start.lat) * mix, lon: start.lon + (end.lon - start.lon) * mix };
      best = Math.min(best, distanceMeters(point, mid));
    }
  }
  return best;
}

export function nextMapCue(input: MapCueInput): MapCue | null {
  if (input.status !== 'running') return null;
  const unitM = input.unit === 'mi' ? 1609.344 : 1000;
  const unitName = input.unit === 'mi' ? 'mile' : 'kilometre';
  const done = Math.floor(input.distanceM / unitM);
  const left = input.plannedM > 0 ? Math.max(0, input.plannedM - input.distanceM) : 0;
  const leftLabel = input.plannedM > 0 ? `${(left / unitM).toFixed(1)} ${input.unit}` : '';
  const route = input.routeName || 'this route';

  if (input.distanceM < 40 && !input.spoken.has('start')) {
    return { id: 'start', kind: 'start', line: line(input.tone, input.voiceName, 'start', { route, pace: input.paceLabel, left: leftLabel }) };
  }
  if (done >= 1 && !input.spoken.has(`km-${done}`)) {
    return { id: `km-${done}`, kind: 'km', line: line(input.tone, input.voiceName, 'km', { n: String(done), unitName, left: leftLabel, pace: input.paceLabel, route }) };
  }
  if (input.plannedM > 500 && input.distanceM / input.plannedM >= 0.5 && input.distanceM / input.plannedM < 0.85 && !input.spoken.has('halfway')) {
    return { id: 'halfway', kind: 'halfway', line: line(input.tone, input.voiceName, 'halfway', { route, left: leftLabel, pace: input.paceLabel }) };
  }
  if (input.plannedM > 500 && input.distanceM / input.plannedM >= 0.9 && !input.spoken.has('almost')) {
    return { id: 'almost', kind: 'almost', line: line(input.tone, input.voiceName, 'almost', { route, left: leftLabel, pace: input.paceLabel }) };
  }
  if (
    input.offRouteM != null &&
    input.offRouteM > 70 &&
    input.now - input.lastOffRouteAt > 120000 &&
    !input.spoken.has(`off-${Math.floor(input.now / 120000)}`)
  ) {
    return { id: `off-${Math.floor(input.now / 120000)}`, kind: 'offroute', line: line(input.tone, input.voiceName, 'offroute', { route }) };
  }
  return null;
}

function line(tone: CueTone, voice: string, kind: MapCue['kind'], bits: Record<string, string>): string {
  const left = bits.left ? ` ${bits.left} still on ${bits.route}.` : '';
  if (tone === 'energetic') {
    if (kind === 'start') return `${voice} here. We are on the map. ${bits.route} is under your feet. Let's go.`;
    if (kind === 'km') return `Yes. ${bits.n} ${bits.unitName}${Number(bits.n) === 1 ? '' : 's'}. Pace ${bits.pace}.${left}`;
    if (kind === 'halfway') return `Halfway. You are doing it.${left}`;
    if (kind === 'almost') return `The end of ${bits.route} is close. Stay tall.${left}`;
    return `You have drifted off ${bits.route}. The map still has you. Angle back when it feels easy.`;
  }
  if (tone === 'calm') {
    if (kind === 'start') return `${voice} with you. Nothing to chase. ${bits.route} is on the map.`;
    if (kind === 'km') return `${voice}. ${bits.n} ${bits.unitName}${Number(bits.n) === 1 ? '' : 's'}. Easy pace ${bits.pace}.${left}`;
    if (kind === 'halfway') return `Halfway, still easy.${left}`;
    if (kind === 'almost') return `Almost through ${bits.route}. Keep it soft.`;
    return `You are a little off ${bits.route}. No rush. The line is still there when you want it.`;
  }
  if (tone === 'focused') {
    if (kind === 'start') return `${voice}. Route loaded. ${bits.route}. I will call the splits.`;
    if (kind === 'km') return `${voice}. Split ${bits.n}. Pace ${bits.pace}.${left}`;
    if (kind === 'halfway') return `Halfway complete.${left}`;
    if (kind === 'almost') return `Final tenth of ${bits.route}.${left}`;
    return `Off the planned line by more than 70 metres. Rejoin ${bits.route} when you can.`;
  }
  if (kind === 'start') return `${voice} here, on the map with you. ${bits.route} is ready. Find an easy rhythm.`;
  if (kind === 'km') return `${bits.n} ${bits.unitName}${Number(bits.n) === 1 ? '' : 's'} with you. Pace ${bits.pace}.${left}`;
  if (kind === 'halfway') return `Halfway along ${bits.route}. I am still right here.${left}`;
  if (kind === 'almost') return `You are nearly done with ${bits.route}.`;
  return `You have stepped off ${bits.route}. I can still see you. Come back to the line when you like.`;
}
