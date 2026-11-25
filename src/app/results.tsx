import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { RouteMap } from '../components/RouteMap';
import { BrandHeader, Card, PrimaryButton, Screen, SecondaryButton, T } from '../components/ui';
import { xpTotal, useStore } from '../data/store';
import { activeMs, averagePace, formatDistance, formatDuration, formatPace, levelFor } from '../lib/engine';
import { useTheme } from '../theme/Theme';

export default function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();
  const router = useRouter();
  const colors = useTheme();
  const run = store.db.runs.find((item) => item.id === id);
  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);
  if (!run || !store.user) {
    return (
      <Screen>
        <BrandHeader back />
        <T size={28} weight="bold">Run unavailable</T>
      </Screen>
    );
  }
  const unit = store.settings.units;
  const xp = store.db.xp.find((item) => item.ref === run.id);
  const level = levelFor(xpTotal(store.db, store.user.id));
  const splits = (unit === 'mi' ? run.session.splitsMi : run.session.splitsKm).slice(0, 6);
  return (
    <Screen>
      <BrandHeader back={false} />
      <T size={34} weight="bold">Run Complete</T>
      <T color={colors.muted} style={{ marginTop: 6 }}>{run.session.source === 'practice' ? 'Practice route saved on this device.' : 'GPS run saved on this device.'}</T>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
        <Card style={{ flex: 1 }}>
          <T size={12} color={colors.muted}>Distance</T>
          <T size={18} weight="bold">{`${formatDistance(run.session.distanceM, unit)} ${unit}`}</T>
        </Card>
        <Card style={{ flex: 1 }}>
          <T size={12} color={colors.muted}>Time</T>
          <T size={18} weight="bold">{formatDuration(activeMs(run.session, run.session.finishedAt ?? Date.now()))}</T>
        </Card>
        <Card style={{ flex: 1 }}>
          <T size={12} color={colors.muted}>Pace</T>
          <T size={18} weight="bold">{formatPace(averagePace(run.session, unit))}</T>
        </Card>
      </View>
      <View style={{ marginTop: 14 }}>
        <RouteMap points={run.session.points} height={200} />
      </View>
      <T size={20} weight="bold" style={{ marginTop: 16, marginBottom: 8 }}>Splits</T>
      {splits.length === 0 ? (
        <T color={colors.muted}>No full split yet. The route and time are still saved.</T>
      ) : (
        splits.map((split) => (
          <Card key={`${split.unit}-${split.index}`} style={{ marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
            <T weight="bold">{`${split.unit === 'mi' ? 'Mile' : 'Km'} ${split.index}`}</T>
            <T>{formatDuration(split.seconds * 1000)}</T>
          </Card>
        ))
      )}
      <Card style={{ marginTop: 14 }}>
        <T weight="bold">Summary</T>
        <T color={colors.muted} style={{ marginTop: 6 }}>{run.summary || 'Run saved.'}</T>
        <T color={colors.link} weight="semibold" style={{ marginTop: 10 }}>{xp ? `+${xp.amount} XP · Level ${level.level}` : `Level ${level.level}`}</T>
      </Card>
      <View style={{ gap: 10, marginTop: 16 }}>
        <PrimaryButton label="View route and splits" onPress={() => router.replace(`/run/${run.id}`)} />
        <SecondaryButton label="Back home" onPress={() => router.replace('/home')} />
      </View>
    </Screen>
  );
}
