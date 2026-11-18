import { useRouter } from 'expo-router';
import { useState } from 'react';

import { emptyHabit, HabitForm } from '../../../components/habit-form';
import { BrandHeader, Screen, T } from '../../../components/ui';
import { useStore } from '../../../data/store';
import { useTheme } from '../../../theme/Theme';

export default function AddHabitScreen() {
  const colors = useTheme();
  const router = useRouter();
  const store = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Add a New Habit</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 18 }}>Every habit counts.</T>
      {error ? <T color={colors.danger} style={{ marginBottom: 8 }}>{error}</T> : null}
      <HabitForm
        initial={emptyHabit}
        placeholder="e.g. Meditate"
        submitLabel="Save Habit"
        showCancel
        loading={loading}
        onCancel={() => router.back()}
        onSubmit={(value) => {
          setLoading(true);
          void store.saveHabit(value).then((result) => {
            setLoading(false);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.replace('/home');
          });
        }}
      />
    </Screen>
  );
}
