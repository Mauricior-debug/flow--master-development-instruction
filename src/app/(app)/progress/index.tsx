import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Bars } from '../../../components/charts';
import { BrandHeader, Card, EmptyState, LinkRow, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { addDays, formatDistance, todayKey, weekdayIndex, type StoredRun } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

const LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function weekBars(runs: StoredRun[], userId: string): { label: string; value: number }[] {
  const today = todayKey();
  const start = addDays(today, -weekdayIndex(today));
  const meters = LABELS.map(() => 0);
  for (const run of runs) {
    if (run.userId !== userId || run.session.status !== 'finished') continue;
    const when = todayKey(new Date(run.session.finishedAt ?? run.session.startedAt));
    if (when < start || when > today) continue;
    const index = weekdayIndex(when);
    meters[index] += run.session.distanceM;
  }
  const peak = Math.max(...meters, 1);
  return LABELS.map((label, index) => ({ label, value: Math.round((meters[index] / peak) * 100) }));
}

export default function ProgressScreen() {
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  const userId = store.user?.id ?? '';
  const unit = store.settings.units;
  const finished = store.db.runs.filter((item) => item.userId === userId && item.session.status === 'finished');
  const bars = weekBars(store.db.runs, userId);
  const weekM = finished.reduce((sum, run) => {
    const when = todayKey(new Date(run.session.finishedAt ?? run.session.startedAt));
    const start = addDays(todayKey(), -weekdayIndex(todayKey()));
    return when >= start ? sum + run.session.distanceM : sum;
  }, 0);
  return (
    <Screen tab>
      <BrandHeader />
      <T size={32} weight="bold">Your running</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>Distance from runs saved on this phone.</T>
      {finished.length === 0 ? (
        <EmptyState title="No runs yet" detail="Finish a GPS or practice run and this week will fill in with your own distance." action="Start a run" onAction={() => router.push('/run')} />
      ) : (
        <>
          <Card>
            <T weight="semibold">This week</T>
            <T size={36} weight="bold" style={{ marginTop: 4 }}>{`${formatDistance(weekM, unit)} ${unit}`}</T>
            <T color={colors.muted}>{`${finished.length} saved ${finished.length === 1 ? 'run' : 'runs'}`}</T>
          </Card>
          <Card style={{ marginTop: 12 }}>
            <T weight="bold" style={{ marginBottom: 10 }}>Week at a glance</T>
            <Bars data={bars} />
            <T size={12} color={colors.faint} style={{ marginTop: 8 }}>Bar height is relative to your longest day this week.</T>
          </Card>
        </>
      )}
      <View style={{ gap: 10, marginTop: 16 }}>
        <LinkRow icon="footsteps-outline" title="Running history" detail="Routes, splits, and summaries" onPress={() => router.push('/progress/runs')} />
        <LinkRow icon="calendar-outline" title="Training plan" detail="Four weeks from your goal" onPress={() => router.push('/progress/plan')} />
        <LinkRow icon="grid-outline" title="Training calendar" onPress={() => router.push('/progress/calendar')} />
        <LinkRow icon="trophy-outline" title="Achievements" onPress={() => router.push('/progress/achievements')} />
        <LinkRow icon="flag-outline" title="Challenges" detail="Coming soon for anything shared" onPress={() => router.push('/progress/challenges')} />
        <LinkRow icon="podium-outline" title="Leaderboard" detail="Coming soon" onPress={() => router.push('/progress/leaderboard')} />
        <LinkRow icon="people-outline" title="Friends" detail="Coming soon" onPress={() => router.push('/progress/friends')} />
      </View>
    </Screen>
  );
}
