import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BrandHeader, Card, PrimaryButton, Screen, T, ToggleRow } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { safeVoiceError } from '../../../lib/pace/openai';
import { previewVoice } from '../../../lib/pace/session';
import { isRealtimeVoice, REALTIME_VOICES, type RealtimeVoiceId } from '../../../lib/pace/voices';
import { PERSONALITIES, type Personality, type SpeakFrequency } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

const SPEAK: { id: SpeakFrequency; title: string; detail: string }[] = [
  { id: 'quiet', title: 'Quiet', detail: 'Kilometres, questions, and the finish.' },
  { id: 'balanced', title: 'Balanced', detail: 'Splits, pauses, and a check-in now and then.' },
  { id: 'chatty', title: 'Chatty', detail: 'Start, encouragement, and answers as you go.' },
];

export default function VoiceSettingsScreen() {
  const store = useAuthGuard();
  const colors = useTheme();
  const [previewing, setPreviewing] = useState(false);
  const [note, setNote] = useState('');
  const selected = isRealtimeVoice(store.coach.voiceId) ? store.coach.voiceId : 'marin';

  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Voice and Personality</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 8 }}>Choose who you hear. A failed line never stops the GPS.</T>
      <T color={colors.link} weight="semibold" style={{ marginBottom: 16 }}>OpenAI Realtime · {selected}</T>
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
      <T weight="semibold" style={{ marginTop: 8, marginBottom: 8 }}>Realtime voice</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {REALTIME_VOICES.map((voice) => {
          const on = selected === voice.id;
          return (
            <Pressable key={voice.id} accessibilityRole="button" onPress={() => store.saveCoach({ voiceProvider: 'openai', voiceId: voice.id })} style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? colors.lime : colors.surface, opacity: pressed ? 0.8 : 1 }]}>
              <T weight="semibold" color={on ? colors.onLime : colors.text}>{voice.recommended ? `${voice.title} · recommended` : voice.title}</T>
            </Pressable>
          );
        })}
      </View>
      <T weight="semibold" style={{ marginTop: 16, marginBottom: 8 }}>Speaking frequency</T>
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
      <View style={{ marginTop: 16 }}>
        <PrimaryButton
          label={previewing ? 'Playing…' : 'Hear a line'}
          onPress={() => {
            setPreviewing(true);
            setNote('');
            void previewVoice(selected as RealtimeVoiceId, 1)
              .then(() => setNote(`That was ${selected}. The same voice joins you on a run.`))
              .catch((error: unknown) => setNote(safeVoiceError(error) || 'The preview could not play. Your run still records.'))
              .finally(() => setPreviewing(false));
          }}
        />
      </View>
      {note ? <T color={colors.muted} style={{ marginTop: 10 }}>{note}</T> : null}
    </Screen>
  );
}
