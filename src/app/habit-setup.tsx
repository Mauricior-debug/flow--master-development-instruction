import { useRouter } from 'expo-router';
import { useState } from 'react';

import { emptyHabit, HabitForm } from '../components/habit-form';
import { BrandHeader, Screen, T } from '../components/ui';
import { useStore } from '../data/store';
import { useTheme } from '../theme/Theme';

export default function HabitSetupScreen() {
  const colors = useTheme();
  const router = useRouter();
  const store = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <Screen>
      <BrandHeader back />
      <T size={32} weight="bold">
        Set Up Your First Habit
      </T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 18 }}>
        Start with one habit and make it count.
      </T>
      {error ? (
        <T color={colors.danger} style={{ marginBottom: 8 }}>
          {error}
        </T>
      ) : null}
      <HabitForm
        initial={{ ...emptyHabit, name: '' }}
        submitLabel="Save Habit"
        loading={loading}
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
