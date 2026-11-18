import { useRouter } from 'expo-router';

import { PrimaryButton, Screen, T } from '../components/ui';
import { useTheme } from '../theme/Theme';

export default function NotFound() {
  const router = useRouter();
  const colors = useTheme();
  return (
    <Screen>
      <T size={32} weight="bold">That screen is not here</T>
      <T color={colors.muted} style={{ marginTop: 8, marginBottom: 16 }}>Head back to PACE AI.</T>
      <PrimaryButton label="Go home" onPress={() => router.replace('/')} />
    </Screen>
  );
}
