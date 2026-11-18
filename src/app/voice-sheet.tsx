import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useStore } from '../data/store';
import { answerQuestion, todayKey } from '../lib/engine';
import { getRunControl } from '../lib/runControl';
import { font } from '../theme/tokens';
import { useTheme } from '../theme/Theme';
import { T } from '../components/ui';

const PROMPTS = ['How is my pace?', 'How far have I gone?', 'What is left?', 'I need water'];

export default function VoiceSheet() {
  const colors = useTheme();
  const router = useRouter();
  const store = useStore();
  const [text, setText] = useState('');
  const [reply, setReply] = useState('');
  const control = getRunControl();

  function ask(question: string) {
    const clean = question.trim();
    if (!clean) return;
    if (control) {
      setReply(control.ask(clean));
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
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
      <T size={28} weight="bold">Voice Coach</T>
      <T color={colors.muted} style={{ marginTop: 6 }}>
        {control
          ? 'The mic is already open on the run. Type here only if you would rather not say it out loud.'
          : 'No run is active. Ask about today’s plan. Answers use your saved plan, not a remote model.'}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        {PROMPTS.map((prompt) => (
          <Pressable key={prompt} accessibilityRole="button" onPress={() => ask(prompt)} style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 }]}>
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
      <Pressable accessibilityRole="button" onPress={() => ask(text)} style={({ pressed }) => [{ marginTop: 12, minHeight: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lime, opacity: pressed ? 0.8 : 1 }]}>
        <T weight="bold" color={colors.onLime}>Send</T>
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
