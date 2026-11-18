export type Frequency = 'daily' | 'weekly' | 'custom';
export type GoalType = 'build' | 'break';
export type ThemeName = 'dark' | 'light';
export type Units = 'km' | 'mi';
export type RunSource = 'gps' | 'practice';
export type RunStatus = 'running' | 'paused' | 'finished';
export type Personality = 'motivator' | 'strategist' | 'calm';
export type SpeakFrequency = 'quiet' | 'balanced' | 'chatty';
export type Experience = 'new' | 'some' | 'steady';
export type RunGoal = 'active' | '5k' | '10k' | 'half' | 'pace';
export type CheckStatus = 'done' | 'skipped';

export type Point = { lat: number; lon: number; t: number; accuracy?: number };

export type Split = {
  unit: Units;
  index: number;
  meters: number;
  seconds: number;
};

export type Session = {
  status: RunStatus;
  source: RunSource;
  startedAt: number;
  finishedAt?: number;
  points: Point[];
  movingMs: number;
  pausedMs: number;
  pauseStartedAt: number | null;
  distanceM: number;
  splitsKm: Split[];
  splitsMi: Split[];
};

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  avatarUri: string | null;
  createdAt: string;
};

export type Habit = {
  id: string;
  userId: string;
  name: string;
  frequency: Frequency;
  customDays: number[];
  goalType: GoalType;
  reminder: boolean;
  reminderTime: string;
  reminderId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Checkin = {
  id: string;
  habitId: string;
  userId: string;
  date: string;
  status: CheckStatus;
};

export type Notice = {
  id: string;
  userId: string;
  type: 'reminder' | 'streak' | 'progress' | 'challenge' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type Settings = {
  userId: string;
  notificationsEnabled: boolean;
  theme: ThemeName;
  privacyConsent: boolean;
  units: Units;
};

export type CoachProfile = {
  userId: string;
  goal: RunGoal | null;
  experience: Experience | null;
  daysPerWeek: number;
  longRunDay: number;
  personality: Personality;
  speak: SpeakFrequency;
  voiceEnabled: boolean;
  voiceId?: string;
  speechSpeed?: number;
  coachingTone?: 'friendly' | 'energetic' | 'calm' | 'focused';
  language?: string;
  milestoneAnnouncements?: boolean;
  recoveryAnnouncements?: boolean;
};

export type PlannedRoute = {
  name: string;
  coordinates: [number, number][];
  distanceM: number;
  elevationM: number;
};

export type StoredRun = {
  id: string;
  userId: string;
  goalLabel: string;
  session: Session;
  summary: string;
  noteUri?: string;
  planned?: PlannedRoute;
};

export type Workout = {
  id: string;
  userId: string;
  date: string;
  title: string;
  detail: string;
  kind: 'easy' | 'quality' | 'long' | 'rest';
  km: number;
  completed: boolean;
};

export type Achievement = {
  id: string;
  userId: string;
  key: string;
  title: string;
  detail: string;
  unlockedAt: string;
};

export type XpTxn = {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  ref: string;
  at: string;
};

export type ChallengeJoin = {
  userId: string;
  challengeId: string;
  joinedAt: string;
  rewarded: boolean;
};

export type Friend = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
};

export type Message = {
  id: string;
  userId: string;
  role: 'coach' | 'you';
  text: string;
  at: string;
  runId?: string;
};

export type Entitlement = {
  userId: string;
  plan: 'free' | 'plus';
  source: 'included' | 'preview';
};

export type DB = {
  users: User[];
  sessionUserId: string | null;
  onboardingSeen: boolean;
  consentGiven: boolean;
  habits: Habit[];
  checkins: Checkin[];
  notices: Notice[];
  settings: Settings[];
  coaches: CoachProfile[];
  runs: StoredRun[];
  workouts: Workout[];
  achievements: Achievement[];
  xp: XpTxn[];
  challenges: ChallengeJoin[];
  friends: Friend[];
  messages: Message[];
  entitlements: Entitlement[];
};

export function emptyDb(): DB {
  return {
    users: [],
    sessionUserId: null,
    onboardingSeen: false,
    consentGiven: false,
    habits: [],
    checkins: [],
    notices: [],
    settings: [],
    coaches: [],
    runs: [],
    workouts: [],
    achievements: [],
    xp: [],
    challenges: [],
    friends: [],
    messages: [],
    entitlements: [],
  };
}

export function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => asText(item)).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.message === 'string') return record.message;
    if (typeof record.label === 'string') return record.label;
    if (typeof record.path === 'string') return record.path;
    if (typeof record.title === 'string') return record.title;
    if (typeof record.name === 'string') return record.name;
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return '';
}

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map((part) => Number(part));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(key: string, days: number): string {
  const date = parseDay(key);
  date.setDate(date.getDate() + days);
  return todayKey(date);
}

export function weekdayIndex(key: string): number {
  return (parseDay(key).getDay() + 6) % 7;
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning!';
  if (hour < 17) return 'Good afternoon!';
  return 'Good evening!';
}

export function nameFromEmail(email: string): string {
  const local = email.split('@')[0] || 'Runner';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (!parts.length) return 'Runner';
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function ago(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  return days === 1 ? '1d ago' : `${days}d ago`;
}

export function monthMatrix(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1);
  const pad = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: pad }, () => null);
  for (let day = 1; day <= count; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const KM = 1000;
const MI = 1609.344;

export function distanceMeters(a: Pick<Point, 'lat' | 'lon'>, b: Pick<Point, 'lat' | 'lon'>): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function acceptPoint(prev: Point | undefined, next: Point): boolean {
  if (next.accuracy != null && next.accuracy > 40) return false;
  if (!prev) return true;
  const dt = (next.t - prev.t) / 1000;
  if (dt <= 0) return false;
  const meters = distanceMeters(prev, next);
  if (meters < 2) return false;
  if (meters / dt > 9) return false;
  return true;
}

export function formatPace(secondsPerUnit: number | null): string {
  if (secondsPerUnit == null || !Number.isFinite(secondsPerUnit) || secondsPerUnit <= 0 || secondsPerUnit > 60 * 30) {
    return '—';
  }
  const total = Math.round(secondsPerUnit);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${`${seconds}`.padStart(2, '0')}`;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${`${minutes}`.padStart(2, '0')}:${`${seconds}`.padStart(2, '0')}`;
  }
  return `${`${minutes}`.padStart(2, '0')}:${`${seconds}`.padStart(2, '0')}`;
}

export function formatDistance(meters: number, unit: Units): string {
  const value = unit === 'mi' ? meters / MI : meters / KM;
  if (!Number.isFinite(value) || value <= 0) return '0.00';
  return value < 10 ? value.toFixed(2) : value.toFixed(1);
}

export function startSession(at: number, source: RunSource): Session {
  return {
    status: 'running',
    source,
    startedAt: at,
    points: [],
    movingMs: 0,
    pausedMs: 0,
    pauseStartedAt: null,
    distanceM: 0,
    splitsKm: [],
    splitsMi: [],
  };
}

function fillSplits(distanceM: number, movingMs: number, unitM: number, unit: Units): Split[] {
  const splits: Split[] = [];
  if (distanceM <= 0 || movingMs <= 0) return splits;
  const count = Math.floor(distanceM / unitM);
  for (let index = 1; index <= count; index += 1) {
    const cumulative = (movingMs / 1000) * ((index * unitM) / distanceM);
    const previous = index === 1 ? 0 : (movingMs / 1000) * (((index - 1) * unitM) / distanceM);
    splits.push({
      unit,
      index,
      meters: unitM,
      seconds: Math.max(1, Math.round(cumulative - previous)),
    });
  }
  return splits;
}

export function addPoint(session: Session, point: Point): Session {
  if (session.status !== 'running') return session;
  const prev = session.points[session.points.length - 1];
  if (!acceptPoint(prev, point)) return session;
  let movingMs = session.movingMs;
  let distanceM = session.distanceM;
  if (prev) {
    const dt = point.t - prev.t;
    const meters = distanceMeters(prev, point);
    const speed = dt > 0 ? meters / (dt / 1000) : 0;
    if (speed >= 0.5 && speed <= 9) {
      movingMs += dt;
      distanceM += meters;
    }
  }
  return {
    ...session,
    points: [...session.points, point],
    movingMs,
    distanceM,
    splitsKm: fillSplits(distanceM, movingMs, KM, 'km'),
    splitsMi: fillSplits(distanceM, movingMs, MI, 'mi'),
  };
}

export function pauseSession(session: Session, at: number): Session {
  if (session.status !== 'running') return session;
  return { ...session, status: 'paused', pauseStartedAt: at };
}

export function resumeSession(session: Session, at: number): Session {
  if (session.status !== 'paused') return session;
  const extra = session.pauseStartedAt ? Math.max(0, at - session.pauseStartedAt) : 0;
  return { ...session, status: 'running', pausedMs: session.pausedMs + extra, pauseStartedAt: null };
}

export function finishSession(session: Session, at: number): Session {
  let pausedMs = session.pausedMs;
  if (session.status === 'paused' && session.pauseStartedAt) {
    pausedMs += Math.max(0, at - session.pauseStartedAt);
  }
  return { ...session, status: 'finished', finishedAt: at, pauseStartedAt: null, pausedMs };
}

export function dueToday(habit: Pick<Habit, 'id' | 'frequency' | 'customDays'>, checkins: Pick<Checkin, 'habitId' | 'date' | 'status'>[], today = todayKey()): boolean {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'custom') return habit.customDays.includes(weekdayIndex(today));
  const start = addDays(today, -weekdayIndex(today));
  const doneThisWeek = checkins.some(
    (item) => item.habitId === habit.id && item.status === 'done' && item.date >= start && item.date <= today,
  );
  return !doneThisWeek;
}

export function activeMs(session: Session, now: number): number {
  const end = session.status === 'finished' && session.finishedAt ? session.finishedAt : now;
  let paused = session.pausedMs;
  if (session.status === 'paused' && session.pauseStartedAt) paused += Math.max(0, end - session.pauseStartedAt);
  return Math.max(0, end - session.startedAt - paused);
}

export function elapsedMs(session: Session, now: number): number {
  const end = session.status === 'finished' && session.finishedAt ? session.finishedAt : now;
  return Math.max(0, end - session.startedAt);
}

export function averagePace(session: Session, unit: Units): number | null {
  if (session.distanceM < 20 || session.movingMs <= 0) return null;
  const unitMeters = unit === 'mi' ? MI : KM;
  return (session.movingMs / 1000) / (session.distanceM / unitMeters);
}

export function currentPace(session: Session, unit: Units): number | null {
  const points = session.points;
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const windowStart = last.t - 30000;
  let meters = 0;
  let ms = 0;
  for (let i = points.length - 1; i > 0; i -= 1) {
    if (points[i].t < windowStart) break;
    meters += distanceMeters(points[i - 1], points[i]);
    ms += points[i].t - points[i - 1].t;
  }
  if (meters < 8 || ms <= 0) return null;
  const unitMeters = unit === 'mi' ? MI : KM;
  return (ms / 1000) / (meters / unitMeters);
}

export function pointAlongRoute(coordinates: [number, number][], meters: number, t: number): Point | null {
  if (coordinates.length < 2) return null;
  let remaining = Math.max(0, meters);
  for (let index = 1; index < coordinates.length; index += 1) {
    const start = { lon: coordinates[index - 1][0], lat: coordinates[index - 1][1] };
    const end = { lon: coordinates[index][0], lat: coordinates[index][1] };
    const segment = distanceMeters(start, end);
    if (remaining <= segment || index === coordinates.length - 1) {
      const fraction = segment === 0 ? 0 : Math.min(1, remaining / segment);
      return {
        lat: start.lat + (end.lat - start.lat) * fraction,
        lon: start.lon + (end.lon - start.lon) * fraction,
        t,
        accuracy: 5,
      };
    }
    remaining -= segment;
  }
  const last = coordinates[coordinates.length - 1];
  return { lat: last[1], lon: last[0], t, accuracy: 5 };
}

export function practicePoint(index: number, startedAt: number, origin = { lat: 51.5074, lon: -0.1278 }): Point {
  const meters = index * 3.4;
  return {
    lat: origin.lat + meters / 111320,
    lon: origin.lon + Math.sin(index / 7) * 0.00035,
    t: startedAt + index * 1000,
    accuracy: 6,
  };
}

export function routeBounds(points: Point[]): { minLat: number; maxLat: number; minLon: number; maxLon: number } | null {
  if (!points.length) return null;
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLon = points[0].lon;
  let maxLon = points[0].lon;
  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLon = Math.min(minLon, point.lon);
    maxLon = Math.max(maxLon, point.lon);
  }
  return { minLat, maxLat, minLon, maxLon };
}

export function staticMapPath(points: Point[], token: string): string | null {
  if (!token || points.length < 2) return null;
  const step = Math.max(1, Math.ceil(points.length / 40));
  const simplified = points.filter((_, index) => index % step === 0 || index === points.length - 1);
  const path = simplified.map((point) => `${point.lon.toFixed(5)},${point.lat.toFixed(5)}`).join(',');
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/path-5+b6ff00-1(${encodeURIComponent(path)})/auto/640x360@2x?padding=36&access_token=${encodeURIComponent(token)}`;
}

export const PERSONALITIES: { id: Personality; title: string; detail: string }[] = [
  { id: 'motivator', title: 'The Motivator', detail: 'Energetic, positive, and quick to celebrate the work you put in.' },
  { id: 'strategist', title: 'The Strategist', detail: 'Precise about pace, splits, and the next sensible step.' },
  { id: 'calm', title: 'The Calm Coach', detail: 'Quiet, steady, and focused on relaxed form.' },
];

export const GOALS: { id: RunGoal; title: string; detail: string }[] = [
  { id: 'active', title: 'Run regularly and stay active', detail: 'Short, repeatable runs you can keep.' },
  { id: '5k', title: 'Train for a 5K', detail: 'Build toward 5 kilometres with room to recover.' },
  { id: '10k', title: 'Train for a 10K', detail: 'A longer easy run and one focused session each week.' },
  { id: 'half', title: 'Train for a half marathon', detail: 'Gradual long runs. No sudden jumps.' },
  { id: 'pace', title: 'Improve my pace', detail: 'Easy volume plus short, relaxed pickups.' },
];

export const EXPERIENCES: { id: Experience; title: string; detail: string }[] = [
  { id: 'new', title: 'New to running', detail: 'Mostly easy running and walking breaks are welcome.' },
  { id: 'some', title: 'I run sometimes', detail: 'You can handle a few runs a week already.' },
  { id: 'steady', title: 'I run steadily', detail: 'You already have a base and want structure.' },
];

type CoachEvent =
  | { kind: 'start' }
  | { kind: 'km'; km: number; pace: string }
  | { kind: 'pause' }
  | { kind: 'resume' }
  | { kind: 'finish'; distance: string; pace: string; time: string }
  | { kind: 'encourage'; distance: string; pace: string };

export function shouldSpeak(kind: CoachEvent['kind'], speak: SpeakFrequency): boolean {
  if (kind === 'finish' || kind === 'km') return true;
  if (speak === 'quiet') return false;
  if (speak === 'balanced') return kind === 'pause' || kind === 'encourage';
  return true;
}

export function coachLine(event: CoachEvent, personality: Personality): string {
  if (event.kind === 'start') {
    if (personality === 'strategist') return 'Run started. Settle for the first minutes, then find an even effort.';
    if (personality === 'calm') return 'We are underway. Soft shoulders, quiet feet.';
    return 'Let us go. I am right here with you.';
  }
  if (event.kind === 'km') {
    if (personality === 'strategist') return `${event.km} kilometres. Average pace ${event.pace}. Keep the next split even.`;
    if (personality === 'calm') return `${event.km} kilometres down. Pace ${event.pace}. Stay relaxed.`;
    return `${event.km} kilometres. Pace ${event.pace}. That is real work.`;
  }
  if (event.kind === 'pause') {
    if (personality === 'strategist') return 'Paused. Time stops with you. Resume when you are ready.';
    if (personality === 'calm') return 'Paused. Take the breath you need.';
    return 'Paused. I will be here when you start again.';
  }
  if (event.kind === 'resume') {
    if (personality === 'strategist') return 'Resumed. Ease back in for thirty seconds, then match your earlier effort.';
    if (personality === 'calm') return 'Back on. No rush in the first steps.';
    return 'Welcome back. Pick up where you left off.';
  }
  if (event.kind === 'encourage') {
    if (personality === 'strategist') return `You are at ${event.distance}. Current pace ${event.pace}. Smooth is fast enough.`;
    if (personality === 'calm') return `${event.distance} so far. Pace ${event.pace}. Unclench your hands.`;
    return `${event.distance} and still moving. Pace ${event.pace}. Stay with it.`;
  }
  if (personality === 'strategist') return `Run saved. ${event.distance} in ${event.time}, average pace ${event.pace}.`;
  if (personality === 'calm') return `That is the run. ${event.distance} in ${event.time}. Be proud of the consistency.`;
  return `You finished. ${event.distance} in ${event.time}, pace ${event.pace}. I am glad I was out there with you.`;
}

export type CoachContext = {
  distance: string;
  pace: string;
  time: string;
  goal: string;
  kmLeft: string | null;
};

export function answerQuestion(question: string, ctx: CoachContext, personality: Personality): string {
  const q = question.toLowerCase();
  const tone = personality === 'strategist' ? 'Here is the read.' : personality === 'calm' ? 'Here is where you are.' : 'I have you.';
  if (q.includes('pace') || q.includes('fast') || q.includes('slow')) {
    return `${tone} Your current pace is ${ctx.pace}. Average is the better guide if the GPS jumps.`;
  }
  if (q.includes('far') || q.includes('distance') || q.includes('left') || q.includes('goal')) {
    const left = ctx.kmLeft ? ` About ${ctx.kmLeft} left on today's aim.` : '';
    return `${tone} You have covered ${ctx.distance}.${left} Goal: ${ctx.goal}.`;
  }
  if (q.includes('time') || q.includes('long')) {
    return `${tone} Active time is ${ctx.time}. Distance ${ctx.distance}, pace ${ctx.pace}.`;
  }
  if (q.includes('water') || q.includes('drink') || q.includes('tired') || q.includes('hurt')) {
    return personality === 'calm'
      ? 'If you need water or a walk break, take it. The run still counts.'
      : 'Take water if you need it. A short walk break is smarter than forcing a bad patch.';
  }
  if (q.includes('form') || q.includes('cadence')) {
    return 'Tall posture, relaxed shoulders, quick light steps. This is a reminder, not a camera judgement.';
  }
  return `${tone} You are at ${ctx.distance}, pace ${ctx.pace}, time ${ctx.time}. Ask me about pace, distance, or what is left.`;
}

export function finishSummary(session: Session, unit: Units, personality: Personality): string {
  const distance = `${formatDistance(session.distanceM, unit)} ${unit}`;
  const pace = `${formatPace(averagePace(session, unit))} /${unit}`;
  const time = formatDuration(activeMs(session, session.finishedAt ?? session.startedAt));
  return coachLine({ kind: 'finish', distance, pace, time }, personality);
}

const BASE_KM: Record<RunGoal, number> = { active: 3, '5k': 4, '10k': 5, half: 6, pace: 5 };

export function buildPlan(input: {
  userId: string;
  goal: RunGoal;
  experience: Experience;
  daysPerWeek: number;
  longRunDay: number;
  startDate: string;
}): Workout[] {
  const days = Math.max(2, Math.min(6, Math.round(input.daysPerWeek)));
  const multipliers = input.experience === 'new' ? [1, 1.08, 1.12, 1.02] : [1, 1.08, 1.14, 1.08];
  const workouts: Workout[] = [];
  const runDays = pickRunDays(days, input.longRunDay);
  for (let week = 0; week < 4; week += 1) {
    const scale = multipliers[week];
    const easy = Math.round(BASE_KM[input.goal] * scale * 10) / 10;
    const longKm = Math.round(easy * (input.experience === 'new' ? 1.45 : 1.6) * 10) / 10;
    for (let day = 0; day < 7; day += 1) {
      const date = addDays(input.startDate, week * 7 + day);
      const slot = runDays.indexOf(day);
      if (slot === -1) {
        workouts.push({
          id: makeId('wo'),
          userId: input.userId,
          date,
          title: 'Rest',
          detail: 'Walk, stretch, or leave the day alone. Recovery is part of the plan.',
          kind: 'rest',
          km: 0,
          completed: false,
        });
        continue;
      }
      const isLong = day === input.longRunDay || (slot === runDays.length - 1 && !runDays.includes(input.longRunDay));
      const isQuality = !isLong && input.experience !== 'new' && days >= 3 && slot === 0;
      if (isLong) {
        workouts.push({
          id: makeId('wo'),
          userId: input.userId,
          date,
          title: 'Long easy run',
          detail: `${longKm} km easy. Keep it conversational. Walk if you need to.`,
          kind: 'long',
          km: longKm,
          completed: false,
        });
      } else if (isQuality) {
        workouts.push({
          id: makeId('wo'),
          userId: input.userId,
          date,
          title: 'Easy run with pickups',
          detail: `${easy} km easy, with 4 relaxed 20-second pickups. Stop if the effort stops feeling smooth.`,
          kind: 'quality',
          km: easy,
          completed: false,
        });
      } else {
        workouts.push({
          id: makeId('wo'),
          userId: input.userId,
          date,
          title: 'Easy run',
          detail: `${easy} km at an easy effort. The point is to finish feeling like you could continue.`,
          kind: 'easy',
          km: easy,
          completed: false,
        });
      }
    }
  }
  return workouts;
}

function pickRunDays(days: number, longRunDay: number): number[] {
  const preferred = [0, 2, 4, 5, 1, 3];
  const chosen = new Set<number>([Math.max(0, Math.min(6, longRunDay))]);
  for (const day of preferred) {
    if (chosen.size >= days) break;
    chosen.add(day);
  }
  return [...chosen].sort((a, b) => a - b);
}

export function rescheduleWorkout(workouts: Workout[], id: string, nextDate: string): Workout[] {
  const current = workouts.find((item) => item.id === id);
  if (!current || current.completed) return workouts;
  const occupant = workouts.find((item) => item.userId === current.userId && item.date === nextDate && item.id !== id);
  return workouts.map((item) => {
    if (item.id === id) return { ...item, date: nextDate };
    if (occupant && item.id === occupant.id) return { ...item, date: current.date };
    return item;
  });
}

export function weeklyRunKm(workouts: Workout[]): number[] {
  const weeks = [0, 0, 0, 0];
  const dates = [...workouts].map((item) => item.date).sort();
  const start = dates[0];
  if (!start) return weeks;
  for (const workout of workouts) {
    if (workout.kind === 'rest') continue;
    const day = Math.round((parseDay(workout.date).getTime() - parseDay(start).getTime()) / 86400000);
    const week = Math.max(0, Math.min(3, Math.floor(day / 7)));
    weeks[week] += workout.km;
  }
  return weeks.map((km) => Math.round(km * 10) / 10);
}

export type RewardResult = { amount: number } | { error: string };

export function awardXp(reason: string, ctx: { km?: number; streak?: number }): RewardResult {
  if (reason === 'checkin.done') return { amount: 15 };
  if (reason === 'run.finish') {
    const km = ctx.km ?? 0;
    if (km < 0.2) return { error: 'A run needs at least 200 metres before it earns XP.' };
    return { amount: Math.max(20, Math.round(km * 10)) };
  }
  if (reason === 'streak.3' && ctx.streak === 3) return { amount: 30 };
  if (reason === 'streak.7' && ctx.streak === 7) return { amount: 80 };
  if (reason === 'streak.14' && ctx.streak === 14) return { amount: 140 };
  if (reason === 'streak.30' && ctx.streak === 30) return { amount: 300 };
  if (reason === 'challenge.30k') return { amount: 1500 };
  if (reason === 'challenge.streak7') return { amount: 400 };
  return { error: 'That reward is not in the rules.' };
}

export function levelFor(totalXp: number): { level: number; into: number; span: number } {
  const span = 200;
  const level = Math.floor(Math.max(0, totalXp) / span) + 1;
  const into = Math.max(0, totalXp) % span;
  return { level, into, span };
}

export type AchievementRule = { key: string; title: string; detail: string };

export const ACHIEVEMENTS: AchievementRule[] = [
  { key: 'first-habit', title: 'First habit', detail: 'You saved a habit to come back to.' },
  { key: 'first-checkin', title: 'Showed up', detail: 'You completed a habit check-in.' },
  { key: 'streak-3', title: 'Three-day streak', detail: 'Three days in a row on one habit.' },
  { key: 'streak-7', title: 'Week of work', detail: 'Seven days in a row on one habit.' },
  { key: 'first-run', title: 'First run saved', detail: 'You finished and saved a run.' },
  { key: 'run-5k', title: 'Five kilometres', detail: 'You covered 5 km in a single run.' },
];

export function earnedAchievementKeys(input: {
  habits: number;
  checkins: number;
  bestStreak: number;
  finishedRuns: number;
  longestRunM: number;
}): string[] {
  const keys: string[] = [];
  if (input.habits > 0) keys.push('first-habit');
  if (input.checkins > 0) keys.push('first-checkin');
  if (input.bestStreak >= 3) keys.push('streak-3');
  if (input.bestStreak >= 7) keys.push('streak-7');
  if (input.finishedRuns > 0) keys.push('first-run');
  if (input.longestRunM >= 5000) keys.push('run-5k');
  return keys;
}

export function scheduledOn(habit: Pick<Habit, 'frequency' | 'customDays'>, date: string): boolean {
  if (habit.frequency === 'daily') return true;
  const weekday = weekdayIndex(date);
  if (habit.frequency === 'weekly') return weekday === 0;
  return habit.customDays.includes(weekday);
}

export function currentStreak(dates: string[], today = todayKey()): number {
  const done = new Set(dates);
  let cursor = done.has(today) ? today : addDays(today, -1);
  if (!done.has(cursor)) return 0;
  let streak = 0;
  while (done.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestStreak(dates: string[]): number {
  const unique = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const date of unique) {
    if (prev && addDays(prev, 1) === date) run += 1;
    else run = 1;
    best = Math.max(best, run);
    prev = date;
  }
  return best;
}

export function habitQuote(goalType: GoalType): string {
  return goalType === 'build' ? 'A stronger you, one day at a time.' : 'One less time. One better day.';
}

export function habitIconName(name: string): 'barbell' | 'water' | 'book' | 'leaf' | 'moon' | 'star' {
  const value = name.toLowerCase();
  if (value.includes('water') || value.includes('drink') || value.includes('hydrat')) return 'water';
  if (value.includes('read') || value.includes('book')) return 'book';
  if (value.includes('sleep') || value.includes('night')) return 'moon';
  if (value.includes('meditat') || value.includes('breath') || value.includes('calm')) return 'leaf';
  if (value.includes('run') || value.includes('workout') || value.includes('gym') || value.includes('strength')) return 'barbell';
  return 'star';
}

export const CHALLENGES = [
  {
    id: '30k-month',
    title: '30K Monthly Challenge',
    detail: 'Cover 30 kilometres this calendar month. Your own runs count. Nothing is posted publicly.',
    reward: '1,500 XP',
  },
  {
    id: '7-day',
    title: '7-Day Streak',
    detail: 'Complete a habit or a run on seven days in a row.',
    reward: '400 XP',
  },
] as const;

export function monthKm(runs: StoredRun[], userId: string, now = new Date()): number {
  const month = now.getMonth();
  const year = now.getFullYear();
  return runs
    .filter((run) => {
      if (run.userId !== userId || run.session.status !== 'finished') return false;
      const date = new Date(run.session.finishedAt ?? run.session.startedAt);
      return date.getMonth() === month && date.getFullYear() === year;
    })
    .reduce((sum, run) => sum + run.session.distanceM / KM, 0);
}

export function showUpDates(checkins: Checkin[], runs: StoredRun[], userId: string): string[] {
  const dates = checkins.filter((item) => item.userId === userId && item.status === 'done').map((item) => item.date);
  for (const run of runs) {
    if (run.userId === userId && run.session.status === 'finished') {
      dates.push(todayKey(new Date(run.session.finishedAt ?? run.session.startedAt)));
    }
  }
  return dates;
}

export function mapboxToken(): string {
  const fromProcess = process.env.API_KEY;
  if (typeof fromProcess === 'string' && fromProcess.trim()) return fromProcess.trim();
  return '';
}
