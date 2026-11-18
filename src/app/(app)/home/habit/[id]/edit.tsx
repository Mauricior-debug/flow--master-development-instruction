import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { HabitForm } from '../../../../../components/habit-form';
import { BrandHeader, Screen, T } from '../../../../../components/ui';
import { useAuthGuard } from '../../../../../components/ui';
import { useTheme } from '../../../../../theme/Theme';

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  const habit = store.db.habits.find((item) => item.id === id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  if (!habit) {
    return (
      <Screen tab>
        <BrandHeader back />
        <T>That habit is no longer here.</T>
      </Screen>
    );
  }
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Edit Habit</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 18 }}>Update your habit details below.</T>
      {error ? <T color={colors.danger} style={{ marginBottom: 8 }}>{error}</T> : null}
      <HabitForm
        initial={{
          name: habit.name,
          frequency: habit.frequency,
          customDays: habit.customDays,
          goalType: habit.goalType,
          reminder: habit.reminder,
          reminderTime: habit.reminderTime,
        }}
        placeholder="Habit name"
        submitLabel="Save Changes"
        showCancel
        loading={loading}
        onCancel={() => router.back()}
        onSubmit={(value) => {
          setLoading(true);
          void store.saveHabit(value, habit.id).then((result) => {
            setLoading(false);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.back();
          });
        }}
      />
    </Screen>
  );
}
