import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { PrimaryButton, SecondaryButton, T, ToggleRow } from '../components/ui';
import { useStore } from '../data/store';
import { getRunControl } from '../lib/runControl';
import { useTheme } from '../theme/Theme';

export default function ControlsSheet() {
  const router = useRouter();
  const colors = useTheme();
  const store = useStore();
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
              control.finish();
              router.back();
            }}
          />
          <ToggleRow
            icon="lock-closed-outline"
            title="Lock screen for run"
            detail="Blocks accidental taps. It does not stop the phone’s own lock button."
            value={store.settings.lockRun === true}
            onValueChange={(value) => store.updateSettings({ lockRun: value })}
          />
          <ToggleRow
            icon="headset-outline"
            title="Live conversation"
            detail="Coach updates stay on until this is on."
            value={store.coach.liveTalk === true}
            onValueChange={(value) => store.saveCoach({ liveTalk: value, voiceEnabled: value ? true : store.coach.voiceEnabled })}
          />
          <ToggleRow
            icon="musical-notes-outline"
            title="Background audio"
            detail="Keep the voice going with the screen locked."
            value={store.settings.backgroundAudio !== false}
            onValueChange={(value) => store.updateSettings({ backgroundAudio: value })}
          />
          <ToggleRow
            icon="play-outline"
            title="Headphone controls"
            detail="Pause and resume from the lock screen. Skip is hidden."
            value={store.settings.headphoneControls !== false}
            onValueChange={(value) => store.updateSettings({ headphoneControls: value })}
          />
        </>
      ) : (
        <T>There is no run to control.</T>
      )}
      <SecondaryButton label="Close" onPress={() => router.back()} />
    </View>
  );
}
