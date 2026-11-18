import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { BrandHeader, Card, EmptyState, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { todayKey } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

export default function AllHabitsScreen() {
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  const habits = store.user ? store.db.habits.filter((item) => item.userId === store.user?.id) : [];
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">All Habits</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>{`${habits.length} saved`}</T>
      {habits.length === 0 ? (
        <EmptyState title="No habits yet" detail="The first one is the hardest to name and the easiest to start." action="Add Habit" onAction={() => router.push('/home/add')} />
      ) : (
        habits.map((habit) => {
          const today = store.db.checkins.find((item) => item.habitId === habit.id && item.date === todayKey());
          return (
            <Pressable key={habit.id} accessibilityRole="button" onPress={() => router.push(`/home/habit/${habit.id}`)} style={({ pressed }) => [{ marginBottom: 10, opacity: pressed ? 0.8 : 1 }]}>
              <Card>
                <T weight="bold">{habit.name}</T>
                <T color={colors.muted} style={{ marginTop: 4 }}>{`${habit.goalType === 'build' ? 'Build' : 'Break'} · ${habit.frequency}${today ? ` · ${today.status} today` : ''}`}</T>
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
