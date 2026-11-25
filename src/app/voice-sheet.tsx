import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, RecordingPresets } from 'expo-audio';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useStore } from '../data/store';
import { answerQuestion, todayKey } from '../lib/engine';
import { getRunControl } from '../lib/runControl';
import { font } from '../theme/tokens';
import { useTheme } from '../theme/Theme';
import { T } from '../components/ui';

const PROMPTS = ['How is my pace?', 'How far have I gone?', 'What is left?', 'I need water', 'My knee hurts'];

export default function VoiceSheet() {
  const colors = useTheme();
  const router = useRouter();
  const store = useStore();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [text, setText] = useState('');
  const [reply, setReply] = useState('');
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const control = getRunControl();

  async function ask(question: string) {
    const clean = question.trim();
    if (!clean) return;
    setBusy(true);
    control?.interrupt();
    try {
      if (control) {
        setReply(await control.ask(clean));
        setText('');
        return;
      }
      const workout = store.db.workouts.find((item) => item.userId === store.user?.id && item.date === todayKey());
      const answer = answerQuestion(
        clean,
        {
          distance: '0.00 km',
          pace: '—',
          time: '00:00',
          goal: workout ? `${workout.title}. ${workout.detail}` : store.coach.goal ?? 'No running goal yet',
          kmLeft: workout ? `${workout.km} km planned` : null,
        },
        store.coach.personality,
      );
      store.addMessage('you', clean);
      store.addMessage('coach', answer);
      setReply(answer);
      setText('');
    } finally {
      setBusy(false);
    }
  }

  async function toggleTalk() {
    if (busy) return;
    control?.interrupt();
    if (!recording) {
      try {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) {
          setReply('Microphone is off. Type your question. The run keeps going.');
          return;
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setRecording(true);
        setReply('Listening. Tap again when you have asked.');
      } catch {
        setReply('The microphone did not start. Type your question. Your run is unaffected.');
      }
      return;
    }
    setRecording(false);
    setBusy(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri || !control) {
        setReply(control ? 'No recording was saved. Type it instead.' : 'Start a run to talk about live pace. You can still type a question about today’s plan.');
        return;
      }
      setReply('One moment.');
      setReply(await control.askAudio(uri));
    } catch {
      setReply('That recording could not be used. Type the question. The run is still recording.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
      <T size={28} weight="bold">Voice Coach</T>
      <T color={colors.muted} style={{ marginTop: 6 }}>
        {control
          ? `${control.voiceStatus()}. Interrupt the coach any time. GPS does not wait on the reply.`
          : 'No run is active. Ask about today’s plan, or start a run to talk about live pace.'}
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={recording ? 'Stop and send' : 'Talk to coach'}
        onPress={() => void toggleTalk()}
        style={({ pressed }) => [{ marginTop: 16, minHeight: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: recording ? colors.danger : colors.lime, opacity: pressed ? 0.8 : 1 }]}
      >
        <T weight="bold" color={recording ? colors.white : colors.onLime}>{recording ? 'Send what I said' : 'Talk'}</T>
      </Pressable>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        {PROMPTS.map((prompt) => (
          <Pressable key={prompt} accessibilityRole="button" onPress={() => void ask(prompt)} style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 }]}>
            <T size={14} weight="semibold">{prompt}</T>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Ask a question"
        placeholderTextColor={colors.faint}
        style={{ marginTop: 16, minHeight: 56, borderRadius: 16, borderWidth: 1, borderColor: colors.stroke, paddingHorizontal: 14, color: colors.text, fontFamily: font.regular, backgroundColor: colors.surface }}
      />
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void ask(text)} style={({ pressed }) => [{ marginTop: 12, minHeight: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, opacity: pressed || busy ? 0.7 : 1 }]}>
        <T weight="bold">{busy ? 'Coach is answering' : 'Send'}</T>
      </Pressable>
      {reply ? (
        <View style={{ marginTop: 16, padding: 14, borderRadius: 18, backgroundColor: colors.surface }}>
          <T weight="bold">Coach</T>
          <T color={colors.muted} style={{ marginTop: 6 }}>{reply}</T>
        </View>
      ) : null}
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [{ marginTop: 16, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.6 }]}>
        <T color={colors.muted}>Close</T>
      </Pressable>
    </View>
  );
}
