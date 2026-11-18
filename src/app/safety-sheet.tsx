import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { PrimaryButton, T } from '../components/ui';
import { useTheme } from '../theme/Theme';

export default function SafetySheet() {
  const colors = useTheme();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 20, gap: 12 }}>
      <T size={13} color={colors.danger} weight="bold">SAFETY</T>
      <T size={28} weight="bold">Stop and get safe</T>
      <T color={colors.muted}>The run is paused. Ordinary coaching is quiet. Do not try to push through dizziness, chest pain, or trouble breathing.</T>
      <T>Sit or lie down somewhere safe if you can. If this feels severe, call 999. PACE cannot call emergency services for you.</T>
      <PrimaryButton label="I am somewhere safe" onPress={() => router.back()} />
    </View>
  );
}
