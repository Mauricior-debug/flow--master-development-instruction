import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { BrandHeader, Card, PrimaryButton, Screen, T } from '../../components/ui';
import { useStore } from '../../data/store';
import { EXPERIENCES, type Experience } from '../../lib/engine';
import { useTheme } from '../../theme/Theme';

export default function ExperienceScreen() {
  const store = useStore();
  const router = useRouter();
  const colors = useTheme();
  const [selected, setSelected] = useState<Experience>(store.coach.experience ?? 'new');
  return (
    <Screen>
      <BrandHeader back />
      <T size={32} weight="bold">Experience Level</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>So the plan does not ask for more than you have.</T>
      {EXPERIENCES.map((item) => {
        const on = selected === item.id;
        return (
          <Pressable key={item.id} accessibilityRole="button" onPress={() => setSelected(item.id)} style={({ pressed }) => [{ marginBottom: 10, opacity: pressed ? 0.8 : 1 }]}>
            <Card style={{ borderColor: on ? colors.lime : colors.stroke, backgroundColor: on ? colors.limeDim : colors.surface }}>
              <T weight="bold">{item.title}</T>
              <T color={colors.muted} style={{ marginTop: 4 }}>{item.detail}</T>
            </Card>
          </Pressable>
        );
      })}
      <PrimaryButton
        label="Continue"
        onPress={() => {
          store.saveCoach({ experience: selected }, Boolean(store.coach.goal));
          router.push('/setup/preferences');
        }}
      />
    </Screen>
  );
}
