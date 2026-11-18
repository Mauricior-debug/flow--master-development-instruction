import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BrandHeader, Card, PrimaryButton, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { previewVoice } from '../../../lib/pace/session';
import { PREVIEW_LINE, REALTIME_VOICES, isRealtimeVoice, type RealtimeVoiceId } from '../../../lib/pace/voices';
import { safeVoiceError } from '../../../lib/pace/openai';
import { useTheme } from '../../../theme/Theme';

const TONES = [
  { id: 'friendly', title: 'Friendly and supportive' },
  { id: 'energetic', title: 'Energetic and motivating' },
  { id: 'calm', title: 'Calm and reassuring' },
  { id: 'focused', title: 'Focused and professional' },
] as const;

export default function VoiceStudioScreen() {
  const store = useAuthGuard();
  const colors = useTheme();
  const saved = isRealtimeVoice(store.coach.voiceId) ? store.coach.voiceId : 'marin';
  const [voice, setVoice] = useState<RealtimeVoiceId>(saved);
  const [tone, setTone] = useState<(typeof TONES)[number]['id']>(store.coach.coachingTone ?? 'friendly');
  const savedSpeed = store.coach.speechSpeed || 1;
  const [speed, setSpeed] = useState(savedSpeed < 1.15 ? 1.15 : savedSpeed);
  const previewRequest = useRef(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Meet your voice companion</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>Choose the voice that will accompany you on every run. Marin and Cedar are the recommended voices.</T>
      {REALTIME_VOICES.map((item) => {
        const on = voice === item.id;
        return (
          <Card key={item.id} style={{ borderColor: on ? colors.lime : colors.stroke, backgroundColor: on ? colors.limeDim : colors.surface, marginBottom: 8 }}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setVoice(item.id)} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <T weight="bold">{item.title}</T>
                {item.recommended ? <T size={12} color={colors.link} weight="bold">Recommended</T> : null}
              </View>
              <T color={colors.muted}>{item.detail}</T>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Preview ${item.title}`}
              disabled={busy}
              onPress={() => {
                setVoice(item.id);
                const request = previewRequest.current + 1;
                previewRequest.current = request;
                setBusy(true);
                setMessage(`Playing ${item.title}…`);
                void previewVoice(item.id, speed, tone)
                  .then(() => {
                    if (previewRequest.current === request) setMessage(`Playing ${item.title}. Turn your volume up if you cannot hear it.`);
                  })
                  .catch((error: unknown) => {
                    if (previewRequest.current !== request) return;
                    const message = safeVoiceError(error);
                    if (message !== 'cancelled') setMessage(message);
                  })
                  .finally(() => {
                    if (previewRequest.current === request) setBusy(false);
                  });
              }}
              style={({ pressed }) => [{ marginTop: 8, minHeight: 44, justifyContent: 'center' }, pressed && { opacity: 0.7 }]}
            >
              <T color={colors.link} weight="semibold">{busy && voice === item.id ? 'Playing…' : 'Preview'}</T>
            </Pressable>
          </Card>
        );
      })}
      <T weight="bold" style={{ marginTop: 8, marginBottom: 8 }}>How should your companion speak?</T>
      {TONES.map((item) => (
        <Pressable key={item.id} accessibilityRole="button" onPress={() => setTone(item.id)} style={({ pressed }) => [{ marginBottom: 8, opacity: pressed ? 0.8 : 1 }]}>
          <Card style={{ borderColor: tone === item.id ? colors.lime : colors.stroke }}>
            <T weight="semibold">{item.title}</T>
          </Card>
        </Pressable>
      ))}
      <T weight="bold" style={{ marginBottom: 8 }}>Speech speed</T>
      <T color={colors.muted} style={{ marginBottom: 8 }}>1.15x is a running pace. The voice starts as soon as the first words are ready.</T>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {[1.15, 1.3, 1.45].map((value) => (
          <Pressable key={value} accessibilityRole="button" onPress={() => setSpeed(value)} style={({ pressed }) => [{ flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: speed === value ? colors.lime : colors.surface, opacity: pressed ? 0.8 : 1 }]}>
            <T weight="bold" color={speed === value ? colors.onLime : colors.text}>{`${value}x`}</T>
          </Pressable>
        ))}
      </View>
      <Card style={{ marginBottom: 12 }}>
        <T size={13} color={colors.link} weight="semibold">VOICE PREVIEW</T>
        <T style={{ marginTop: 6 }}>{PREVIEW_LINE}</T>
        {message ? <T color={colors.muted} style={{ marginTop: 8 }}>{message}</T> : null}
      </Card>
      <PrimaryButton
        label="Use this voice"
        loading={busy}
        onPress={() => {
          store.saveCoach({
            voiceId: voice,
            coachingTone: tone,
            speechSpeed: speed,
            personality: tone === 'calm' ? 'calm' : tone === 'energetic' ? 'motivator' : store.coach.personality,
          });
          setMessage(`${voiceTitle(voice)} is saved on this phone. The next run, and a voice change during a run, uses it without stopping GPS.`);
        }}
      />
    </Screen>
  );
}

function voiceTitle(id: string): string {
  return REALTIME_VOICES.find((voice) => voice.id === id)?.title ?? 'Marin';
}
