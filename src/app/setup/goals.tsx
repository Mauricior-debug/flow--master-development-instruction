import { useRouter } from 'expo-router';
import { useState } from 'react';

import { BrandHeader, Card, PrimaryButton, Screen, T } from '../../components/ui';
import { useStore } from '../../data/store';
import { GOALS, type RunGoal } from '../../lib/engine';
import { useTheme } from '../../theme/Theme';
import { Pressable } from 'react-native';

export default function GoalsScreen() {
  const store = useStore();
  const router = useRouter();
  const colors = useTheme();
  const [selected, setSelected] = useState<RunGoal>(store.coach.goal ?? '5k');
  return (
    <Screen>
      <BrandHeader back />
      <T size={32} weight="bold">Running Goals</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>What’s your main goal? This shapes the next four weeks of training.</T>
      {GOALS.map((goal) => {
        const on = selected === goal.id;
        return (
          <Pressable key={goal.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setSelected(goal.id)} style={({ pressed }) => [{ marginBottom: 10, opacity: pressed ? 0.8 : 1 }]}>
            <Card style={{ borderColor: on ? colors.lime : colors.stroke, backgroundColor: on ? colors.limeDim : colors.surface }}>
              <T weight="bold">{goal.title}</T>
              <T color={colors.muted} style={{ marginTop: 4 }}>{goal.detail}</T>
            </Card>
          </Pressable>
        );
      })}
      <PrimaryButton label="Continue" onPress={() => { store.saveCoach({ goal: selected }, Boolean(store.coach.experience)); router.push('/setup/experience'); }} />
    </Screen>
  );
}
