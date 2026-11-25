import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BrandHeader, Card, PrimaryButton, Screen, T, ToggleRow } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { loadElevenVoices, previewCoachLine } from '../../../lib/coachSession';
import { PERSONALITIES, type Personality, type SpeakFrequency, type VoiceProvider } from '../../../lib/engine';
import { ELEVEN_VOICES, OPENAI_VOICES, readVoiceKeys, resolveVoice, voiceLabel } from '../../../lib/voice';
import { useTheme } from '../../../theme/Theme';

const SPEAK: { id: SpeakFrequency; title: string; detail: string }[] = [
  { id: 'quiet', title: 'Quiet', detail: 'Kilometres, questions, and the finish.' },
  { id: 'balanced', title: 'Balanced', detail: 'Splits, pauses, and a check-in now and then.' },
  { id: 'chatty', title: 'Chatty', detail: 'Start, encouragement, and answers as you go.' },
];

const PROVIDERS: { id: VoiceProvider; title: string; detail: string }[] = [
  { id: 'auto', title: 'Automatic', detail: 'Live coach when a voice key is on this build, otherwise this phone speaks.' },
  { id: 'openai', title: 'OpenAI voice', detail: 'Realtime coach, with speech on this phone if the connection fails.' },
  { id: 'elevenlabs', title: 'ElevenLabs voice', detail: 'Realtime coach on the ElevenLabs path, same conversation style.' },
  { id: 'device', title: 'This phone', detail: 'Spoken cues from your run, with no network voice.' },
];

export default function VoiceSettingsScreen() {
  const store = useAuthGuard();
  const colors = useTheme();
  const [previewing, setPreviewing] = useState(false);
  const [note, setNote] = useState('');
  const [eleven, setEleven] = useState(ELEVEN_VOICES.map((voice) => ({ id: voice.id, name: voice.name })));
  const resolved = resolveVoice(store.coach.voiceProvider, readVoiceKeys());
  const voices = resolved === 'elevenlabs' ? eleven : OPENAI_VOICES.map((voice) => ({ id: voice, name: voice[0].toUpperCase() + voice.slice(1) }));

  useEffect(() => {
    void loadElevenVoices().then((list) => {
      if (list.length) setEleven(list);
    });
  }, []);

  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Voice and Personality</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 8 }}>Choose who you hear. A failed line never stops the GPS.</T>
      <T color={colors.link} weight="semibold" style={{ marginBottom: 16 }}>{voiceLabel(resolved)}</T>
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
      <T weight="semibold" style={{ marginTop: 8, marginBottom: 8 }}>Coach path</T>
      {PROVIDERS.map((item) => {
        const on = store.coach.voiceProvider === item.id;
        return (
          <Pressable key={item.id} accessibilityRole="button" onPress={() => store.saveCoach({ voiceProvider: item.id, voiceId: '' })} style={({ pressed }) => [{ marginBottom: 8, opacity: pressed ? 0.8 : 1 }]}>
            <Card style={{ borderColor: on ? colors.lime : colors.stroke, backgroundColor: on ? colors.limeDim : colors.surface }}>
              <T weight="bold">{item.title}</T>
              <T color={colors.muted}>{item.detail}</T>
            </Card>
          </Pressable>
        );
      })}
      {resolved !== 'device' ? (
        <>
          <T weight="semibold" style={{ marginTop: 8, marginBottom: 8 }}>Voice</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {voices.map((voice) => {
              const on = store.coach.voiceId === voice.id || (!store.coach.voiceId && voice.id === voices[0]?.id);
              return (
                <Pressable key={voice.id} accessibilityRole="button" onPress={() => store.saveCoach({ voiceId: voice.id })} style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? colors.lime : colors.surface, opacity: pressed ? 0.8 : 1 }]}>
                  <T weight="semibold" color={on ? colors.onLime : colors.text}>{voice.name}</T>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
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
            void previewCoachLine(store.coach, 'I am here. Soft shoulders, and we will take the first minutes easy.')
              .then(() => setNote(resolved === 'device' ? 'That was this phone. A live coach speaks when a voice key is on the build.' : 'That used the voice you picked.'))
              .catch(() => setNote('The preview could not play. Your runs still record.'))
              .finally(() => setPreviewing(false));
          }}
        />
      </View>
      {note ? <T color={colors.muted} style={{ marginTop: 10 }}>{note}</T> : null}
    </Screen>
  );
}
