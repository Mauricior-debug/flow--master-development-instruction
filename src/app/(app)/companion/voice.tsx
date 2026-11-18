import { Pressable, View } from 'react-native';

import { BrandHeader, Card, Screen, T, ToggleRow } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { PERSONALITIES, type Personality, type SpeakFrequency } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

const SPEAK: { id: SpeakFrequency; title: string; detail: string }[] = [
  { id: 'quiet', title: 'Quiet', detail: 'Kilometres and the finish summary.' },
  { id: 'balanced', title: 'Balanced', detail: 'Splits, pauses, and a check-in now and then.' },
  { id: 'chatty', title: 'Chatty', detail: 'Start, encouragement, and answers as you go.' },
];

export default function VoiceSettingsScreen() {
  const store = useAuthGuard();
  const colors = useTheme();
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Voice and Personality</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>The coach talks from your run data. A failed line never stops the GPS.</T>
      {PERSONALITIES.map((item) => {
        const on = store.coach.personality === item.id;
        return (
          <Pressable key={item.id} accessibilityRole="button" onPress={() => store.saveCoach({ personality: item.id as Personality })} style={({ pressed }) => [{ marginBottom: 10, opacity: pressed ? 0.8 : 1 }]}>
            <Card style={{ borderColor: on ? colors.lime : colors.stroke, backgroundColor: on ? colors.limeDim : colors.surface }}>
              <T weight="bold">{item.title}</T>
              <T color={colors.muted}>{item.detail}</T>
            </Card>
          </Pressable>
        );
      })}
      <T weight="semibold" style={{ marginTop: 8, marginBottom: 8 }}>Speaking frequency</T>
      <View style={{ gap: 8 }}>
        {SPEAK.map((item) => {
          const on = store.coach.speak === item.id;
          return (
            <Pressable key={item.id} accessibilityRole="button" onPress={() => store.saveCoach({ speak: item.id })} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
              <Card style={{ borderColor: on ? colors.lime : colors.stroke }}>
                <T weight="bold">{item.title}</T>
                <T color={colors.muted}>{item.detail}</T>
              </Card>
            </Pressable>
          );
        })}
      </View>
      <Card style={{ marginTop: 16 }}>
        <ToggleRow icon="volume-high-outline" title="Speaker" detail="Coach voice during a run" value={store.coach.voiceEnabled} onValueChange={(value) => store.saveCoach({ voiceEnabled: value })} />
      </Card>
      <T size={13} color={colors.faint} style={{ marginTop: 12 }}>
        Microphone transcription is not connected. Use Ask on a run to type, or tap a suggested question. The microphone permission is still available if you want the system prompt.
      </T>
    </Screen>
  );
}
