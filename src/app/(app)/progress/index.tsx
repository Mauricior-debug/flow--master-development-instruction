import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Bars, Ring } from '../../../components/charts';
import { BrandHeader, Card, EmptyState, LinkRow, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { monthKm } from '../../../lib/engine';
import { bestCurrentStreak, completionBars, weekScore } from '../../../lib/stats';
import { useTheme } from '../../../theme/Theme';

export default function ProgressScreen() {
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  const [mode, setMode] = useState<'week' | 'month' | 'year'>('week');
  const userId = store.user?.id ?? '';
  const habits = store.db.habits.filter((item) => item.userId === userId);
  const checkins = store.db.checkins.filter((item) => item.userId === userId);
  const bars = completionBars(habits, checkins, mode);
  const score = weekScore(habits, checkins);
  const ratio = score.scheduled ? score.done / score.scheduled : 0;
  const streak = bestCurrentStreak(habits, checkins);
  const average = bars.length ? Math.round(bars.reduce((sum, item) => sum + item.value, 0) / bars.length) : 0;
  const km = monthKm(store.db.runs, userId);
  return (
    <Screen tab>
      <BrandHeader />
      <T size={32} weight="bold">Your Progress</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>See how you’re doing over time.</T>
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, padding: 4, marginBottom: 14 }}>
        {(['week', 'month', 'year'] as const).map((item) => (
          <Pressable key={item} accessibilityRole="button" onPress={() => setMode(item)} style={({ pressed }) => [{ flex: 1, minHeight: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === item ? colors.lime : 'transparent', opacity: pressed ? 0.8 : 1 }]}>
            <T weight="bold" color={mode === item ? colors.onLime : colors.text}>{item[0].toUpperCase() + item.slice(1)}</T>
          </Pressable>
        ))}
      </View>
      {habits.length === 0 && store.db.runs.filter((item) => item.userId === userId).length === 0 ? (
        <EmptyState title="No progress yet" detail="Complete a habit or save a run and this chart will fill with your own numbers." />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Card style={{ flex: 1, alignItems: 'center' }}><T size={22} weight="bold">{habits.length}</T><T size={12} color={colors.muted} center>Active habits</T></Card>
            <Card style={{ flex: 1, alignItems: 'center' }}><T size={22} weight="bold">{`${average}%`}</T><T size={12} color={colors.muted} center>Avg. completion</T></Card>
            <Card style={{ flex: 1, alignItems: 'center' }}><T size={22} weight="bold">{streak}</T><T size={12} color={colors.muted} center>Day streak</T></Card>
          </View>
          <Card style={{ marginTop: 12 }}>
            <T weight="bold" style={{ marginBottom: 10 }}>Completion Rate</T>
            <Bars data={bars} />
          </Card>
          <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <T weight="semibold">This Week</T>
              <T size={28} weight="bold">{`${score.done}/${Math.max(score.scheduled, score.done)}`}</T>
              <T color={colors.muted}>Check-ins completed</T>
              <T color={colors.muted} style={{ marginTop: 6 }}>{`${km.toFixed(1)} km run this month`}</T>
            </View>
            <Ring progress={ratio} label={`${Math.round(ratio * 100)}%`} />
          </Card>
        </>
      )}
      <View style={{ gap: 10, marginTop: 16 }}>
        <LinkRow icon="map-outline" title="Running map" detail="Routes, heatmap, and history" onPress={() => router.push('/progress/map')} />
        <LinkRow icon="footsteps-outline" title="Running history" onPress={() => router.push('/progress/runs')} />
        <LinkRow icon="trophy-outline" title="Achievements" onPress={() => router.push('/progress/achievements')} />
        <LinkRow icon="calendar-outline" title="Training plan" onPress={() => router.push('/progress/plan')} />
        <LinkRow icon="grid-outline" title="Training calendar" onPress={() => router.push('/progress/calendar')} />
        <LinkRow icon="flag-outline" title="Challenges" onPress={() => router.push('/progress/challenges')} />
        <LinkRow icon="podium-outline" title="Leaderboard" onPress={() => router.push('/progress/leaderboard')} />
        <LinkRow icon="people-outline" title="Friends" onPress={() => router.push('/progress/friends')} />
      </View>
    </Screen>
  );
}
