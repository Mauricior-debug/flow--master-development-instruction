import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  ACHIEVEMENTS,
  awardXp,
  bestStreak,
  buildPlan,
  currentStreak,
  earnedAchievementKeys,
  emptyDb,
  makeId,
  monthKm,
  nameFromEmail,
  rescheduleWorkout,
  showUpDates,
  todayKey,
  type CheckStatus,
  type CoachProfile,
  type DB,
  type Experience,
  type Frequency,
  type GoalType,
  type Personality,
  type RunGoal,
  type PlannedRoute,
  type Session,
  type Settings,
  type SpeakFrequency,
  type StoredRun,
  type ThemeName,
  type Units,
  type User,
} from '../lib/engine';
import { DB_KEY } from '../lib/locationTask';
import { cancelReminder, scheduleDailyReminder } from '../lib/reminders';

const SESSION_KEY = 'pace-ai-session';

type Result = { ok: true } | { ok: false; error: string };

type StoreValue = {
  ready: boolean;
  error: string | null;
  db: DB;
  user: User | null;
  settings: Settings;
  coach: CoachProfile;
  hydrate: () => Promise<void>;
  markOnboardingSeen: (consent: boolean) => void;
  signUp: (email: string, password: string, confirm: string) => Promise<Result>;
  signIn: (email: string, password: string) => Promise<Result>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, next: string, confirm: string, current?: string) => Promise<Result>;
  updateProfile: (email: string, avatarUri: string | null) => Promise<Result>;
  deleteAccount: () => Promise<void>;
  updateSettings: (patch: Partial<Omit<Settings, 'userId'>>) => void;
  saveHabit: (input: HabitInput, id?: string) => Promise<Result>;
  deleteHabit: (id: string) => Promise<void>;
  setCheckin: (habitId: string, status: CheckStatus) => void;
  markNotice: (id: string) => void;
  clearNotices: () => void;
  saveCoach: (patch: Partial<Omit<CoachProfile, 'userId'>>, rebuild?: boolean) => void;
  startRun: (goalLabel: string, source: Session['source'], planned?: PlannedRoute) => string | null;
  updateRun: (id: string, session: Session) => void;
  finishRun: (id: string, session: Session, summary: string) => void;
  attachRunNote: (id: string, uri: string) => void;
  reschedule: (workoutId: string, date: string) => void;
  completeWorkout: (workoutId: string) => void;
  joinChallenge: (challengeId: string) => void;
  addFriend: (name: string) => Result;
  removeFriend: (id: string) => void;
  addMessage: (role: 'coach' | 'you', text: string, runId?: string) => void;
  setPreviewPlan: (plan: 'free' | 'plus') => void;
  exportData: () => string;
};

export type HabitInput = {
  name: string;
  frequency: Frequency;
  customDays: number[];
  goalType: GoalType;
  reminder: boolean;
  reminderTime: string;
};

const StoreContext = createContext<StoreValue | null>(null);

function defaultSettings(userId: string): Settings {
  return {
    userId,
    notificationsEnabled: true,
    theme: 'dark',
    privacyConsent: false,
    units: 'km',
    locationAllowed: false,
    cameraAllowed: false,
    microphoneAllowed: false,
    photosAllowed: false,
  };
}

function defaultCoach(userId: string): CoachProfile {
  return {
    userId,
    goal: null,
    experience: null,
    daysPerWeek: 3,
    longRunDay: 6,
    personality: 'motivator',
    speak: 'balanced',
    voiceEnabled: true,
    voiceId: 'marin',
    speechSpeed: 1,
    coachingTone: 'friendly',
    language: 'en',
    milestoneAnnouncements: true,
    recoveryAnnouncements: true,
  };
}

async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

async function rememberSession(id: string | null): Promise<void> {
  try {
    if (id) await SecureStore.setItemAsync(SESSION_KEY, id);
    else await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // The database copy of the session still signs the user in on this device.
  }
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function syncProgress(db: DB, userId: string): void {
  const habits = db.habits.filter((item) => item.userId === userId);
  const done = db.checkins.filter((item) => item.userId === userId && item.status === 'done');
  const finished = db.runs.filter((item) => item.userId === userId && item.session.status === 'finished');
  const streaks = habits.map((habit) => bestStreak(done.filter((item) => item.habitId === habit.id).map((item) => item.date)));
  const keys = earnedAchievementKeys({
    habits: habits.length,
    checkins: done.length,
    bestStreak: Math.max(0, ...streaks, 0),
    finishedRuns: finished.length,
    longestRunM: Math.max(0, ...finished.map((item) => item.session.distanceM), 0),
  });
  for (const key of keys) {
    if (db.achievements.some((item) => item.userId === userId && item.key === key)) continue;
    const rule = ACHIEVEMENTS.find((item) => item.key === key);
    if (!rule) continue;
    db.achievements.push({
      id: makeId('ach'),
      userId,
      key,
      title: rule.title,
      detail: rule.detail,
      unlockedAt: new Date().toISOString(),
    });
    db.notices.unshift({
      id: makeId('nt'),
      userId,
      type: 'progress',
      title: rule.title,
      message: rule.detail,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
  const showUps = showUpDates(db.checkins, db.runs, userId);
  const streak = currentStreak(showUps);
  for (const mark of [3, 7, 14, 30] as const) {
    if (streak < mark) continue;
    const reason = mark === 3 ? 'streak.3' : mark === 7 ? 'streak.7' : mark === 14 ? 'streak.14' : 'streak.30';
    grant(db, userId, reason, `streak-${mark}-${todayKey()}`, { streak: mark });
  }
  const month = monthKm(db.runs, userId);
  const joined30 = db.challenges.find((item) => item.userId === userId && item.challengeId === '30k-month');
  if (joined30 && !joined30.rewarded && month >= 30) {
    const result = grant(db, userId, 'challenge.30k', `30k-${todayKey().slice(0, 7)}`, {});
    if (result) joined30.rewarded = true;
  }
  const joined7 = db.challenges.find((item) => item.userId === userId && item.challengeId === '7-day');
  if (joined7 && !joined7.rewarded && streak >= 7) {
    const result = grant(db, userId, 'challenge.streak7', `streak7-${userId}`, {});
    if (result) joined7.rewarded = true;
  }
}

function grant(db: DB, userId: string, reason: string, ref: string, ctx: { km?: number; streak?: number }): boolean {
  if (db.xp.some((item) => item.userId === userId && item.reason === reason && item.ref === ref)) return false;
  const awarded = awardXp(reason, ctx);
  if ('error' in awarded) return false;
  db.xp.push({ id: makeId('xp'), userId, amount: awarded.amount, reason, ref, at: new Date().toISOString() });
  return true;
}

function wipeUser(db: DB, userId: string): void {
  db.users = db.users.filter((item) => item.id !== userId);
  db.habits = db.habits.filter((item) => item.userId !== userId);
  db.checkins = db.checkins.filter((item) => item.userId !== userId);
  db.notices = db.notices.filter((item) => item.userId !== userId);
  db.settings = db.settings.filter((item) => item.userId !== userId);
  db.coaches = db.coaches.filter((item) => item.userId !== userId);
  db.runs = db.runs.filter((item) => item.userId !== userId);
  db.workouts = db.workouts.filter((item) => item.userId !== userId);
  db.achievements = db.achievements.filter((item) => item.userId !== userId);
  db.xp = db.xp.filter((item) => item.userId !== userId);
  db.challenges = db.challenges.filter((item) => item.userId !== userId);
  db.friends = db.friends.filter((item) => item.userId !== userId);
  db.messages = db.messages.filter((item) => item.userId !== userId);
  db.entitlements = db.entitlements.filter((item) => item.userId !== userId);
  if (db.sessionUserId === userId) db.sessionUserId = null;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const dbRef = useRef<DB>(emptyDb());
  const [db, setDb] = useState<DB>(emptyDb());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = useCallback((next: DB) => {
    dbRef.current = next;
    setDb(next);
    void AsyncStorage.setItem(DB_KEY, JSON.stringify(next)).catch(() => {
      setError('PACE AI could not save on this device. Try that again.');
    });
  }, []);

  const edit = useCallback((recipe: (draft: DB) => void) => {
    const next = JSON.parse(JSON.stringify(dbRef.current)) as DB;
    recipe(next);
    publish(next);
  }, [publish]);

  const hydrate = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(DB_KEY);
      const parsed = raw ? ({ ...emptyDb(), ...JSON.parse(raw) } as DB) : emptyDb();
      try {
        const session = await SecureStore.getItemAsync(SESSION_KEY);
        if (session) parsed.sessionUserId = session;
      } catch {
        // Keep the session stored beside the rest of the data.
      }
      dbRef.current = parsed;
      setDb(parsed);
      setError(null);
      setReady(true);
    } catch {
      setError('PACE AI could not open your saved data.');
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const user = db.users.find((item) => item.id === db.sessionUserId) ?? null;
  const settings = db.settings.find((item) => item.userId === user?.id) ?? defaultSettings(user?.id ?? '');
  const coach = db.coaches.find((item) => item.userId === user?.id) ?? defaultCoach(user?.id ?? '');

  const value = useMemo<StoreValue>(() => {
    const requireUser = (): User | null => dbRef.current.users.find((item) => item.id === dbRef.current.sessionUserId) ?? null;

    return {
      ready,
      error,
      db,
      user,
      settings,
      coach,
      hydrate,
      markOnboardingSeen: (consent) => {
        edit((draft) => {
          draft.onboardingSeen = true;
          draft.consentGiven = consent || draft.consentGiven;
        });
      },
      signUp: async (email, password, confirm) => {
        const clean = email.trim().toLowerCase();
        if (!validEmail(clean)) return { ok: false, error: 'Enter a valid email address.' };
        if (password.length < 8) return { ok: false, error: 'Use at least 8 characters for your password.' };
        if (password !== confirm) return { ok: false, error: 'Those passwords do not match.' };
        if (dbRef.current.users.some((item) => item.email === clean)) {
          return { ok: false, error: 'An account with that email is already on this device.' };
        }
        const salt = makeId('salt');
        const passwordHash = await hashPassword(password, salt);
        const id = makeId('user');
        const nextUser: User = { id, email: clean, passwordHash, salt, avatarUri: null, createdAt: new Date().toISOString() };
        edit((draft) => {
          draft.users.push(nextUser);
          draft.settings.push({ ...defaultSettings(id), privacyConsent: draft.consentGiven });
          draft.coaches.push(defaultCoach(id));
          draft.entitlements.push({ userId: id, plan: 'free', source: 'included' });
          draft.notices.unshift({
            id: makeId('nt'),
            userId: id,
            type: 'system',
            title: 'Welcome to PACE AI',
            message: 'Your habits and runs stay on this device until you export or delete them.',
            read: false,
            createdAt: new Date().toISOString(),
          });
          draft.sessionUserId = id;
        });
        await rememberSession(id);
        return { ok: true };
      },
      signIn: async (email, password) => {
        const clean = email.trim().toLowerCase();
        const found = dbRef.current.users.find((item) => item.email === clean);
        if (!found) return { ok: false, error: 'That email and password do not match.' };
        const passwordHash = await hashPassword(password, found.salt);
        if (passwordHash !== found.passwordHash) return { ok: false, error: 'That email and password do not match.' };
        edit((draft) => {
          draft.sessionUserId = found.id;
        });
        await rememberSession(found.id);
        return { ok: true };
      },
      signOut: async () => {
        edit((draft) => {
          draft.sessionUserId = null;
        });
        await rememberSession(null);
      },
      resetPassword: async (email, next, confirm, current) => {
        const clean = email.trim().toLowerCase();
        const found = dbRef.current.users.find((item) => item.email === clean);
        if (!found) return { ok: false, error: 'No account uses that email on this device.' };
        if (current) {
          const currentHash = await hashPassword(current, found.salt);
          if (currentHash !== found.passwordHash) return { ok: false, error: 'The current password is not right.' };
        }
        if (next.length < 8) return { ok: false, error: 'Use at least 8 characters for your password.' };
        if (next !== confirm) return { ok: false, error: 'Those passwords do not match.' };
        const salt = makeId('salt');
        const passwordHash = await hashPassword(next, salt);
        edit((draft) => {
          const row = draft.users.find((item) => item.id === found.id);
          if (row) {
            row.salt = salt;
            row.passwordHash = passwordHash;
          }
        });
        return { ok: true };
      },
      updateProfile: async (email, avatarUri) => {
        const currentUser = requireUser();
        if (!currentUser) return { ok: false, error: 'Sign in again to update your profile.' };
        const clean = email.trim().toLowerCase();
        if (!validEmail(clean)) return { ok: false, error: 'Enter a valid email address.' };
        if (dbRef.current.users.some((item) => item.email === clean && item.id !== currentUser.id)) {
          return { ok: false, error: 'Another account on this device already uses that email.' };
        }
        edit((draft) => {
          const row = draft.users.find((item) => item.id === currentUser.id);
          if (row) {
            row.email = clean;
            row.avatarUri = avatarUri;
          }
        });
        return { ok: true };
      },
      deleteAccount: async () => {
        const currentUser = requireUser();
        if (!currentUser) return;
        for (const habit of dbRef.current.habits.filter((item) => item.userId === currentUser.id)) {
          await cancelReminder(habit.reminderId);
        }
        edit((draft) => wipeUser(draft, currentUser.id));
        await rememberSession(null);
      },
      updateSettings: (patch) => {
        const currentUser = requireUser();
        if (!currentUser) return;
        edit((draft) => {
          const row = draft.settings.find((item) => item.userId === currentUser.id);
          if (row) Object.assign(row, patch);
          else draft.settings.push({ ...defaultSettings(currentUser.id), ...patch });
        });
      },
      saveHabit: async (input, id) => {
        const currentUser = requireUser();
        if (!currentUser) return { ok: false, error: 'Sign in again to save a habit.' };
        const name = input.name.trim();
        if (!name) return { ok: false, error: 'Name the habit you want to track.' };
        if (input.frequency === 'custom' && input.customDays.length === 0) {
          return { ok: false, error: 'Choose at least one day for a custom habit.' };
        }
        let reminderId: string | null = null;
        const existing = id ? dbRef.current.habits.find((item) => item.id === id) : undefined;
        if (existing?.reminderId) await cancelReminder(existing.reminderId);
        if (input.reminder && settings.notificationsEnabled) {
          reminderId = await scheduleDailyReminder(name, 'Your PACE AI reminder is here.', input.reminderTime);
        }
        edit((draft) => {
          const now = new Date().toISOString();
          if (id) {
            const row = draft.habits.find((item) => item.id === id && item.userId === currentUser.id);
            if (!row) return;
            Object.assign(row, { ...input, name, reminderId, updatedAt: now });
          } else {
            draft.habits.unshift({
              id: makeId('habit'),
              userId: currentUser.id,
              ...input,
              name,
              reminderId,
              createdAt: now,
              updatedAt: now,
            });
            draft.notices.unshift({
              id: makeId('nt'),
              userId: currentUser.id,
              type: 'system',
              title: 'Habit saved',
              message: `${name} is ready to track.`,
              read: false,
              createdAt: now,
            });
          }
          syncProgress(draft, currentUser.id);
        });
        return { ok: true };
      },
      deleteHabit: async (id) => {
        const currentUser = requireUser();
        if (!currentUser) return;
        const habit = dbRef.current.habits.find((item) => item.id === id);
        await cancelReminder(habit?.reminderId);
        edit((draft) => {
          draft.habits = draft.habits.filter((item) => item.id !== id);
          draft.checkins = draft.checkins.filter((item) => item.habitId !== id);
        });
      },
      setCheckin: (habitId, status) => {
        const currentUser = requireUser();
        if (!currentUser) return;
        const date = todayKey();
        edit((draft) => {
          const existing = draft.checkins.find((item) => item.habitId === habitId && item.date === date);
          const habit = draft.habits.find((item) => item.id === habitId);
          if (existing && existing.status === status) {
            draft.checkins = draft.checkins.filter((item) => item.id !== existing.id);
            return;
          }
          if (existing) existing.status = status;
          else {
            draft.checkins.push({ id: makeId('ck'), habitId, userId: currentUser.id, date, status });
          }
          const succeeded = status === 'done' || (status === 'skipped' && habit?.goalType === 'break');
          if (succeeded) {
            grant(draft, currentUser.id, 'checkin.done', `${habitId}:${date}`, {});
            const dates = draft.checkins
              .filter((item) => item.habitId === habitId && item.status === (habit?.goalType === 'break' ? 'skipped' : 'done'))
              .map((item) => item.date);
            const streak = currentStreak(dates, date);
            if (streak > 0 && (streak === 3 || streak === 7 || streak % 7 === 0)) {
              draft.notices.unshift({
                id: makeId('nt'),
                userId: currentUser.id,
                type: 'streak',
                title: `${streak} day streak`,
                message: habit ? `${habit.name} is still going.` : 'You kept the streak.',
                read: false,
                createdAt: new Date().toISOString(),
              });
            }
          }
          syncProgress(draft, currentUser.id);
        });
      },
      markNotice: (id) => {
        edit((draft) => {
          const row = draft.notices.find((item) => item.id === id);
          if (row) row.read = true;
        });
      },
      clearNotices: () => {
        const currentUser = requireUser();
        if (!currentUser) return;
        edit((draft) => {
          draft.notices = draft.notices.filter((item) => item.userId !== currentUser.id);
        });
      },
      saveCoach: (patch, rebuild) => {
        const currentUser = requireUser();
        if (!currentUser) return;
        edit((draft) => {
          let row = draft.coaches.find((item) => item.userId === currentUser.id);
          if (!row) {
            row = defaultCoach(currentUser.id);
            draft.coaches.push(row);
          }
          Object.assign(row, patch);
          if (rebuild && row.goal && row.experience) {
            draft.workouts = draft.workouts.filter((item) => item.userId !== currentUser.id || item.completed);
            const plan = buildPlan({
              userId: currentUser.id,
              goal: row.goal,
              experience: row.experience,
              daysPerWeek: row.daysPerWeek,
              longRunDay: row.longRunDay,
              startDate: todayKey(),
            });
            draft.workouts.push(...plan);
          }
        });
      },
      startRun: (goalLabel, source, planned) => {
        const currentUser = requireUser();
        if (!currentUser) return null;
        const active = dbRef.current.runs.find(
          (item) => item.userId === currentUser.id && item.session.status !== 'finished',
        );
        if (active) return active.id;
        const id = makeId('run');
        const run: StoredRun = {
          id,
          userId: currentUser.id,
          goalLabel,
          summary: '',
          planned,
          session: {
            status: 'running',
            source,
            startedAt: Date.now(),
            points: [],
            movingMs: 0,
            pausedMs: 0,
            pauseStartedAt: null,
            distanceM: 0,
            splitsKm: [],
            splitsMi: [],
          },
        };
        edit((draft) => {
          draft.runs.unshift(run);
        });
        return id;
      },
      updateRun: (id, session) => {
        edit((draft) => {
          const row = draft.runs.find((item) => item.id === id);
          if (row && row.session.status !== 'finished') row.session = session;
        });
      },
      finishRun: (id, session, summary) => {
        const currentUser = requireUser();
        if (!currentUser) return;
        edit((draft) => {
          const row = draft.runs.find((item) => item.id === id);
          if (!row) return;
          row.session = session;
          row.summary = summary;
          grant(draft, currentUser.id, 'run.finish', id, { km: session.distanceM / 1000 });
          draft.notices.unshift({
            id: makeId('nt'),
            userId: currentUser.id,
            type: 'progress',
            title: 'Run saved',
            message: summary,
            read: false,
            createdAt: new Date().toISOString(),
          });
          const today = todayKey();
          const workout = draft.workouts.find((item) => item.userId === currentUser.id && item.date === today && !item.completed && item.kind !== 'rest');
          if (workout) workout.completed = true;
          syncProgress(draft, currentUser.id);
        });
      },
      attachRunNote: (id, uri) => {
        edit((draft) => {
          const row = draft.runs.find((item) => item.id === id);
          if (row) row.noteUri = uri;
        });
      },
      reschedule: (workoutId, date) => {
        edit((draft) => {
          draft.workouts = rescheduleWorkout(draft.workouts, workoutId, date);
        });
      },
      completeWorkout: (workoutId) => {
        edit((draft) => {
          const row = draft.workouts.find((item) => item.id === workoutId);
          if (row) row.completed = !row.completed;
        });
      },
      joinChallenge: (challengeId) => {
        const currentUser = requireUser();
        if (!currentUser) return;
        edit((draft) => {
          if (draft.challenges.some((item) => item.userId === currentUser.id && item.challengeId === challengeId)) return;
          draft.challenges.push({ userId: currentUser.id, challengeId, joinedAt: new Date().toISOString(), rewarded: false });
          syncProgress(draft, currentUser.id);
        });
      },
      addFriend: (name) => {
        const currentUser = requireUser();
        if (!currentUser) return { ok: false, error: 'Sign in again to add a friend.' };
        const clean = name.trim();
        if (!clean) return { ok: false, error: 'Enter a name.' };
        edit((draft) => {
          draft.friends.unshift({ id: makeId('fr'), userId: currentUser.id, name: clean, createdAt: new Date().toISOString() });
        });
        return { ok: true };
      },
      removeFriend: (id) => {
        edit((draft) => {
          draft.friends = draft.friends.filter((item) => item.id !== id);
        });
      },
      addMessage: (role, text, runId) => {
        const currentUser = requireUser();
        if (!currentUser || !text.trim()) return;
        edit((draft) => {
          draft.messages.push({
            id: makeId('msg'),
            userId: currentUser.id,
            role,
            text: text.trim(),
            at: new Date().toISOString(),
            runId,
          });
        });
      },
      setPreviewPlan: (plan) => {
        const currentUser = requireUser();
        if (!currentUser) return;
        edit((draft) => {
          const row = draft.entitlements.find((item) => item.userId === currentUser.id);
          if (row) {
            row.plan = plan;
            row.source = plan === 'plus' ? 'preview' : 'included';
          } else {
            draft.entitlements.push({ userId: currentUser.id, plan, source: plan === 'plus' ? 'preview' : 'included' });
          }
        });
      },
      exportData: () => {
        const currentUser = requireUser();
        if (!currentUser) return '{}';
        const snapshot = dbRef.current;
        const payload = {
          exportedAt: new Date().toISOString(),
          user: { id: currentUser.id, email: currentUser.email, name: nameFromEmail(currentUser.email), createdAt: currentUser.createdAt },
          habits: snapshot.habits.filter((item) => item.userId === currentUser.id),
          checkins: snapshot.checkins.filter((item) => item.userId === currentUser.id),
          runs: snapshot.runs.filter((item) => item.userId === currentUser.id),
          workouts: snapshot.workouts.filter((item) => item.userId === currentUser.id),
          achievements: snapshot.achievements.filter((item) => item.userId === currentUser.id),
          messages: snapshot.messages.filter((item) => item.userId === currentUser.id),
          friends: snapshot.friends.filter((item) => item.userId === currentUser.id),
          settings: snapshot.settings.find((item) => item.userId === currentUser.id) ?? null,
        };
        return JSON.stringify(payload, null, 2);
      },
    };
  }, [coach, db, edit, error, hydrate, ready, settings, user]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}

export function xpTotal(db: DB, userId: string): number {
  return db.xp.filter((item) => item.userId === userId).reduce((sum, item) => sum + item.amount, 0);
}

export type { Experience, Personality, RunGoal, SpeakFrequency, ThemeName, Units };
