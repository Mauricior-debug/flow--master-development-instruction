import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BrandHeader, PrimaryButton, Screen, T } from '../../components/ui';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/Theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PreferencesScreen() {
  const store = useStore();
  const router = useRouter();
  const colors = useTheme();
  const [days, setDays] = useState(store.coach.daysPerWeek || 3);
  const [longRun, setLongRun] = useState(store.coach.longRunDay ?? 6);
  return (
    <Screen>
      <BrandHeader back />
      <T size={32} weight="bold">Fitness Preferences</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 18 }}>How many days can you run, and which day should be the long one?</T>
      <T weight="semibold">Days each week</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fewer days" onPress={() => setDays((value) => Math.max(2, value - 1))} style={({ pressed }) => [{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}>
          <T size={22} weight="bold">−</T>
        </Pressable>
        <T size={28} weight="bold">{days}</T>
        <Pressable accessibilityRole="button" accessibilityLabel="More days" onPress={() => setDays((value) => Math.min(6, value + 1))} style={({ pressed }) => [{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}>
          <T size={22} weight="bold">+</T>
        </Pressable>
      </View>
      <T weight="semibold">Long run day</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 }}>
        {DAYS.map((label, index) => (
          <Pressable key={label} accessibilityRole="button" onPress={() => setLongRun(index)} style={({ pressed }) => [{ minWidth: 64, minHeight: 44, paddingHorizontal: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: longRun === index ? colors.lime : colors.stroke, backgroundColor: longRun === index ? colors.limeDim : colors.surface, opacity: pressed ? 0.75 : 1 }]}>
            <T weight="semibold">{label}</T>
          </Pressable>
        ))}
      </View>
      <PrimaryButton
        label="Save preferences"
        onPress={() => {
          store.saveCoach({ daysPerWeek: days, longRunDay: longRun }, Boolean(store.coach.goal && store.coach.experience));
          router.push('/setup/personality');
        }}
      />
    </Screen>
  );
}
