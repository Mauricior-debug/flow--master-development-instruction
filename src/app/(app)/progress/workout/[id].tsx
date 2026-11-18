import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BrandHeader, Card, PrimaryButton, Screen, T } from '../../../../components/ui';
import { useAuthGuard } from '../../../../components/ui';
import { addDays, todayKey } from '../../../../lib/engine';
import { useTheme } from '../../../../theme/Theme';

export default function WorkoutDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useAuthGuard();
  const colors = useTheme();
  const workout = store.db.workouts.find((item) => item.id === id);
  const [picked, setPicked] = useState(workout?.date ?? todayKey());
  if (!workout) {
    return <Screen tab><BrandHeader back /><T>That workout is gone.</T></Screen>;
  }
  const days = Array.from({ length: 14 }, (_, index) => addDays(todayKey(), index));
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={12} color={colors.link} weight="semibold">{workout.kind.toUpperCase()}</T>
      <T size={32} weight="bold" style={{ marginTop: 4 }}>{workout.title}</T>
      <T color={colors.muted} style={{ marginTop: 8 }}>{workout.detail}</T>
      <Card style={{ marginTop: 16 }}>
        <T weight="semibold">Scheduled</T>
        <T style={{ marginTop: 4 }}>{workout.date}</T>
        <T color={colors.muted}>{workout.km ? `${workout.km} km` : 'Rest day'}</T>
      </Card>
      <T weight="semibold" style={{ marginTop: 18, marginBottom: 8 }}>Move it</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {days.map((day) => (
          <Pressable key={day} accessibilityRole="button" onPress={() => setPicked(day)} style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 10, borderRadius: 12, justifyContent: 'center', borderWidth: 1, borderColor: picked === day ? colors.lime : colors.stroke, backgroundColor: picked === day ? colors.limeDim : colors.surface, opacity: pressed ? 0.75 : 1 }]}>
            <T size={13} weight="semibold">{day.slice(5)}</T>
          </Pressable>
        ))}
      </View>
      <View style={{ gap: 10, marginTop: 16 }}>
        <PrimaryButton label="Reschedule" onPress={() => store.reschedule(workout.id, picked)} />
        <PrimaryButton label={workout.completed ? 'Mark not done' : 'Mark complete'} onPress={() => store.completeWorkout(workout.id)} />
      </View>
    </Screen>
  );
}
