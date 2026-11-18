import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { Image } from 'expo-image';

import { BrandHeader, Card, PrimaryButton, Screen, T } from '../../components/ui';
import { useStore } from '../../data/store';
import { PERSONALITIES, type Personality } from '../../lib/engine';
import { useTheme } from '../../theme/Theme';

const hero = require('../../../assets/images/onboarding-hero.jpg');

export default function PersonalityScreen() {
  const store = useStore();
  const router = useRouter();
  const colors = useTheme();
  const [selected, setSelected] = useState<Personality>(store.coach.personality);
  return (
    <Screen>
      <BrandHeader back />
      <T size={32} weight="bold">Coach Personality</T>
      <T color={colors.muted} style={{ marginTop: 6 }}>Your AI running partner will coach, motivate and run with you. Pick a personality that fits you.</T>
      <Image source={hero} style={{ width: '100%', height: 200 }} contentFit="contain" accessibilityLabel="PACE AI companion" />
      {PERSONALITIES.map((item) => {
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
      <PrimaryButton label="Select Companion" onPress={() => { store.saveCoach({ personality: selected }); router.push('/setup/permissions'); }} />
    </Screen>
  );
}
