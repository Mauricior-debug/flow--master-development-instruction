import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { BrandHeader, Card, EmptyState, PrimaryButton, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { todayKey } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

export default function DailyPlanScreen() {
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  const userId = store.user?.id;
  const today = todayKey();
  const workout = store.db.workouts.find((item) => item.userId === userId && item.date === today);
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Daily Plan</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>What today is asking for. Rest days count.</T>
      {workout ? (
        <Card style={{ marginBottom: 16 }}>
          <T size={13} color={colors.link} weight="semibold">TRAINING</T>
          <T size={24} weight="bold" style={{ marginTop: 6 }}>{workout.title}</T>
          <T color={colors.muted} style={{ marginTop: 8 }}>{workout.detail}</T>
          <Pressable accessibilityRole="button" onPress={() => router.push(`/progress/workout/${workout.id}`)} style={({ pressed }) => [{ marginTop: 12, minHeight: 44, justifyContent: 'center' }, pressed && { opacity: 0.7 }]}>
            <T color={colors.link} weight="semibold">Open workout</T>
          </Pressable>
        </Card>
      ) : (
        <EmptyState title="No run planned" detail="Set a goal and your experience to build a four-week plan." action="Set a goal" onAction={() => router.push('/setup/goals')} />
      )}
      {workout && workout.kind !== 'rest' ? <PrimaryButton label="Start this run" onPress={() => router.push('/run')} /> : null}
      {workout?.kind === 'rest' ? <PrimaryButton label="Run anyway" onPress={() => router.push('/run')} /> : null}
    </Screen>
  );
}
