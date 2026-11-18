import { addDays, currentStreak, scheduledOn, todayKey, weekdayIndex, type Checkin, type Habit } from './engine';

export function weekScore(habits: Habit[], checkins: Checkin[], today = todayKey()): { done: number; scheduled: number } {
  const monday = addDays(today, -weekdayIndex(today));
  let done = 0;
  let scheduled = 0;
  for (const habit of habits) {
    if (habit.frequency === 'weekly') {
      scheduled += 1;
      const hit = checkins.some(
        (item) => item.habitId === habit.id && item.status === 'done' && item.date >= monday && item.date <= today,
      );
      if (hit) done += 1;
      continue;
    }
    for (let offset = 0; offset <= weekdayIndex(today); offset += 1) {
      const date = addDays(monday, offset);
      if (!scheduledOn(habit, date)) continue;
      scheduled += 1;
      if (checkins.some((item) => item.habitId === habit.id && item.date === date && item.status === 'done')) done += 1;
    }
  }
  return { done, scheduled };
}

export function completionBars(
  habits: Habit[],
  checkins: Checkin[],
  mode: 'week' | 'month' | 'year',
  today = todayKey(),
): { label: string; value: number }[] {
  if (mode === 'week') {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const monday = addDays(today, -weekdayIndex(today));
    return labels.map((label, index) => ({ label, value: dayRate(habits, checkins, addDays(monday, index)) }));
  }
  if (mode === 'month') {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const count = new Date(year, month + 1, 0).getDate();
    const buckets = [0, 0, 0, 0];
    const totals = [0, 0, 0, 0];
    for (let day = 1; day <= count; day += 1) {
      const key = todayKey(new Date(year, month, day));
      const bucket = Math.min(3, Math.floor((day - 1) / 7));
      buckets[bucket] += dayRate(habits, checkins, key);
      totals[bucket] += 1;
    }
    return buckets.map((sum, index) => ({ label: `W${index + 1}`, value: totals[index] ? Math.round(sum / totals[index]) : 0 }));
  }
  const year = new Date().getFullYear();
  return ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((label, month) => {
    const count = new Date(year, month + 1, 0).getDate();
    let sum = 0;
    for (let day = 1; day <= count; day += 1) sum += dayRate(habits, checkins, todayKey(new Date(year, month, day)));
    return { label, value: count ? Math.round(sum / count) : 0 };
  });
}

function dayRate(habits: Habit[], checkins: Checkin[], date: string): number {
  const due = habits.filter((habit) => (habit.frequency === 'weekly' ? weekdayIndex(date) === 0 : scheduledOn(habit, date)));
  if (!due.length) return 0;
  const done = due.filter((habit) => checkins.some((item) => item.habitId === habit.id && item.date === date && item.status === 'done')).length;
  return Math.round((done / due.length) * 100);
}

export function bestCurrentStreak(habits: Habit[], checkins: Checkin[]): number {
  return habits.reduce((best, habit) => {
    const dates = checkins.filter((item) => item.habitId === habit.id && item.status === 'done').map((item) => item.date);
    return Math.max(best, currentStreak(dates));
  }, 0);
}
