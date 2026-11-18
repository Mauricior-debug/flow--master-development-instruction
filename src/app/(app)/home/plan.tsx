import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { BrandHeader, Card, EmptyState, PrimaryButton, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { dueToday, todayKey } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

export default function DailyPlanScreen() {
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  const userId = store.user?.id;
  const today = todayKey();
  const habits = store.db.habits.filter((item) => item.userId === userId && dueToday(item, store.db.checkins, today));
  const workout = store.db.workouts.find((item) => item.userId === userId && item.date === today);
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Daily Plan</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>What today is asking for. Nothing extra.</T>
      {workout ? (
        <Card style={{ marginBottom: 12 }}>
          <T size={13} color={colors.link} weight="semibold">TRAINING</T>
          <T size={20} weight="bold" style={{ marginTop: 4 }}>{workout.title}</T>
          <T color={colors.muted} style={{ marginTop: 6 }}>{workout.detail}</T>
          <Pressable accessibilityRole="button" onPress={() => router.push(`/progress/workout/${workout.id}`)} style={({ pressed }) => [{ marginTop: 12, minHeight: 44, justifyContent: 'center' }, pressed && { opacity: 0.7 }]}>
            <T color={colors.link} weight="semibold">Open workout</T>
          </Pressable>
        </Card>
      ) : (
        <EmptyState title="No run planned" detail="Set a goal and your experience to build a four-week plan." action="Set a goal" onAction={() => router.push('/setup/goals')} />
      )}
      <T size={20} weight="bold" style={{ marginTop: 18, marginBottom: 10 }}>Habits due</T>
      {habits.length === 0 ? <T color={colors.muted}>No habits are due today.</T> : habits.map((habit) => (
        <Card key={habit.id} style={{ marginBottom: 10 }}>
          <T weight="bold">{habit.name}</T>
          <T color={colors.muted}>{habit.goalType === 'build' ? 'Build this habit' : 'Break this habit'}</T>
        </Card>
      ))}
      {workout && workout.kind !== 'rest' ? (
        <PrimaryButton label="Start this run" onPress={() => router.push('/run')} />
      ) : null}
    </Screen>
  );
}
