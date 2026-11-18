import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { BrandHeader, Card, EmptyState, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { formatDistance, formatPace, averagePace } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

export default function RunningHistoryScreen() {
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  const runs = store.user ? store.db.runs.filter((item) => item.userId === store.user?.id && item.session.status === 'finished') : [];
  const unit = store.settings.units;
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold" style={{ marginBottom: 12 }}>Running History</T>
      {runs.length === 0 ? (
        <EmptyState title="No saved runs" detail="Finish a GPS or practice run and it will be listed here with its route." action="Go to Run" onAction={() => router.push('/run')} />
      ) : (
        runs.map((run) => (
          <Pressable key={run.id} accessibilityRole="button" onPress={() => router.push(`/run/${run.id}`)} style={({ pressed }) => [{ marginBottom: 10, opacity: pressed ? 0.8 : 1 }]}>
            <Card>
              <T weight="bold">{run.goalLabel}</T>
              <T color={colors.muted} style={{ marginTop: 4 }}>{`${formatDistance(run.session.distanceM, unit)} ${unit} · ${formatPace(averagePace(run.session, unit))} /${unit} · ${run.session.source === 'practice' ? 'Practice' : 'GPS'}`}</T>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
