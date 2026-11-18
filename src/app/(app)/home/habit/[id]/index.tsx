import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { BrandHeader, Card, Screen, SecondaryButton, T } from '../../../../../components/ui';
import { useAuthGuard } from '../../../../../components/ui';
import { askConfirm } from '../../../../../lib/confirm';
import { addDays, currentStreak, habitIconName, habitQuote, monthLabel, monthMatrix, scheduledOn, todayKey } from '../../../../../lib/engine';
import { useTheme } from '../../../../../theme/Theme';
import { useState } from 'react';

export default function HabitDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  const habit = store.db.habits.find((item) => item.id === id);
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  if (!habit) {
    return (
      <Screen tab>
        <BrandHeader back />
        <T size={28} weight="bold">Habit not found</T>
        <T color={colors.muted} style={{ marginTop: 8 }}>It may have been deleted.</T>
      </Screen>
    );
  }
  const checkins = store.db.checkins.filter(
    (item) => item.habitId === habit.id && item.status === (habit.goalType === 'break' ? 'skipped' : 'done'),
  );
  const dates = checkins.map((item) => item.date);
  const streak = currentStreak(dates);
  const total = checkins.length;
  let scheduled = 0;
  let cursorDay = habit.createdAt.slice(0, 10);
  const today = todayKey();
  let guard = 0;
  while (cursorDay <= today && guard < 800) {
    if (scheduledOn(habit, cursorDay)) scheduled += 1;
    cursorDay = addDays(cursorDay, 1);
    guard += 1;
  }
  const shownRate = scheduled === 0 ? 0 : Math.min(100, Math.round((total / scheduled) * 100));
  const matrix = monthMatrix(cursor.year, cursor.month);
  const doneDays = new Set(
    checkins
      .filter((item) => {
        const date = new Date(item.date);
        return date.getFullYear() === cursor.year && date.getMonth() === cursor.month;
      })
      .map((item) => Number(item.date.slice(8))),
  );

  return (
    <Screen tab>
      <BrandHeader back />
      <Card>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colors.limeDim, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={habitIconName(habit.name)} size={24} color={colors.lime} />
          </View>
          <View style={{ flex: 1 }}>
            <T size={22} weight="bold">{habit.name}</T>
            <T color={colors.muted}>{habit.goalType === 'build' ? 'Build habit' : 'Break habit'}</T>
          </View>
        </View>
        <T center color={colors.muted} style={{ marginTop: 14 }}>{`“${habitQuote(habit.goalType)}”`}</T>
      </Card>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {[
          ['flame-outline', `${streak}`, 'Day streak'],
          ['checkmark-circle-outline', `${shownRate}%`, 'Completion'],
          ['stats-chart-outline', `${total}`, 'Check-ins'],
        ].map(([icon, value, label]) => (
          <Card key={label} style={{ flex: 1, alignItems: 'center' }}>
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.lime} />
            <T size={20} weight="bold" style={{ marginTop: 6 }}>{value}</T>
            <T size={12} color={colors.muted} center>{label}</T>
          </Card>
        ))}
      </View>
      <Card style={{ marginTop: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setCursor((item) => item.month === 0 ? { year: item.year - 1, month: 11 } : { ...item, month: item.month - 1 })} style={hit}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <T weight="bold">{monthLabel(cursor.year, cursor.month)}</T>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setCursor((item) => item.month === 11 ? { year: item.year + 1, month: 0 } : { ...item, month: item.month + 1 })} style={hit}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
            <T key={label} size={12} color={colors.faint} center style={{ flex: 1 }}>{label}</T>
          ))}
        </View>
        {matrix.map((week, index) => (
          <View key={`${cursor.year}-${cursor.month}-${index}`} style={{ flexDirection: 'row', marginTop: 8 }}>
            {week.map((day, dayIndex) => {
              const key = day ? `${cursor.year}-${`${cursor.month + 1}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}` : '';
              const on = day ? doneDays.has(day) : false;
              const isToday = key === todayKey();
              return (
                <View key={`${index}-${dayIndex}`} style={{ flex: 1, alignItems: 'center' }}>
                  {day ? (
                    <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.lime : colors.surface2, borderWidth: isToday ? 2 : 0, borderColor: colors.text }}>
                      <T size={12} weight="semibold" color={on ? colors.onLime : colors.text}>{day}</T>
                    </View>
                  ) : (
                    <View style={{ width: 32, height: 32 }} />
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </Card>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <SecondaryButton label="Edit Habit" onPress={() => router.push(`/home/habit/${habit.id}/edit`)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete Habit"
          onPress={() => {
            askConfirm({
              title: 'Delete this habit?',
              message: `${habit.name} and its check-ins will be removed from this device.`,
              confirmLabel: 'Delete Habit',
              destructive: true,
              run: async () => {
                await store.deleteHabit(habit.id);
                router.replace('/home');
              },
            });
            router.push('/confirm-sheet');
          }}
          style={({ pressed }) => [{ flex: 1, minHeight: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.danger, opacity: pressed ? 0.8 : 1 }]}
        >
          <T weight="bold" color={colors.danger}>Delete Habit</T>
        </Pressable>
      </View>
    </Screen>
  );
}

const hit = { width: 44, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const };
