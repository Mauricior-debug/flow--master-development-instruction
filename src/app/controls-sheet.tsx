import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { PrimaryButton, SecondaryButton, T } from '../components/ui';
import { getRunControl } from '../lib/runControl';
import { useTheme } from '../theme/Theme';

export default function ControlsSheet() {
  const router = useRouter();
  const colors = useTheme();
  const control = getRunControl();
  const paused = control?.getSession().status === 'paused';
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 20, gap: 12 }}>
      <View style={{ alignSelf: 'center', width: 48, height: 5, borderRadius: 99, backgroundColor: colors.stroke, marginBottom: 8 }} />
      <T size={28} weight="bold">{paused ? 'Run paused' : 'Pause or finish'}</T>
      <T color={colors.muted}>The timer follows this choice. Tracking does not depend on the coach.</T>
      {control ? (
        <>
          <PrimaryButton
            label={paused ? 'Resume' : 'Pause'}
            onPress={() => {
              if (paused) control.resume();
              else control.pause();
              router.back();
            }}
          />
          <SecondaryButton
            label="Finish and save"
            onPress={() => {
              router.back();
              setTimeout(() => control.finish(), 280);
            }}
          />
        </>
      ) : (
        <T>There is no run to control.</T>
      )}
      <SecondaryButton label="Close" onPress={() => router.back()} />
    </View>
  );
}
