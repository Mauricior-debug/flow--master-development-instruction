import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { BrandHeader, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { monthLabel, monthMatrix } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

export default function CalendarScreen() {
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const userId = store.user?.id;
  const matrix = monthMatrix(cursor.year, cursor.month);
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Training Calendar</T>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setCursor((item) => (item.month === 0 ? { year: item.year - 1, month: 11 } : { ...item, month: item.month - 1 }))} style={hit}><Ionicons name="chevron-back" color={colors.text} size={22} /></Pressable>
        <T weight="bold">{monthLabel(cursor.year, cursor.month)}</T>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setCursor((item) => (item.month === 11 ? { year: item.year + 1, month: 0 } : { ...item, month: item.month + 1 }))} style={hit}><Ionicons name="chevron-forward" color={colors.text} size={22} /></Pressable>
      </View>
      {matrix.map((week, index) => (
        <View key={index} style={{ flexDirection: 'row', marginBottom: 8 }}>
          {week.map((day, dayIndex) => {
            const key = day ? `${cursor.year}-${`${cursor.month + 1}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}` : '';
            const workout = store.db.workouts.find((item) => item.userId === userId && item.date === key);
            return (
              <Pressable key={`${index}-${dayIndex}`} style={{ flex: 1, minHeight: 64, alignItems: 'center' }} disabled={!workout} onPress={() => workout && router.push(`/progress/workout/${workout.id}`)}>
                {day ? (
                  <View style={{ width: 40, minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: workout ? colors.limeDim : colors.surface }}>
                    <T weight="semibold">{day}</T>
                    {workout ? <T size={10} color={colors.link}>{workout.kind === 'rest' ? 'Rest' : 'Run'}</T> : null}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const hit = { width: 44, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const };
