import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { BrandHeader, Card, EmptyState, PrimaryButton, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { useTheme } from '../../../theme/Theme';

export default function TrainingPlanScreen() {
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  const workouts = store.user ? store.db.workouts.filter((item) => item.userId === store.user?.id).slice().sort((a, b) => a.date.localeCompare(b.date)) : [];
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Training Plan</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>Four weeks, with easier days and a cutback so the long run does not jump.</T>
      {workouts.length === 0 ? (
        <EmptyState title="No plan yet" detail="Choose a goal and your experience. The plan is built from those, not from a generic calendar." action="Set a goal" onAction={() => router.push('/setup/goals')} />
      ) : (
        workouts.map((workout) => (
          <Pressable key={workout.id} accessibilityRole="button" onPress={() => router.push(`/progress/workout/${workout.id}`)} style={({ pressed }) => [{ marginBottom: 8, opacity: pressed ? 0.8 : 1 }]}>
            <Card>
              <T size={12} color={colors.faint}>{workout.date}</T>
              <T weight="bold">{workout.title}</T>
              <T color={colors.muted}>{workout.completed ? 'Completed' : workout.detail}</T>
            </Card>
          </Pressable>
        ))
      )}
      {store.coach.goal && store.coach.experience ? (
        <PrimaryButton label="Rebuild future workouts" onPress={() => store.saveCoach({}, true)} />
      ) : null}
    </Screen>
  );
}
