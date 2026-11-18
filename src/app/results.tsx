import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { PaceMap } from '../components/PaceMap';
import { BrandHeader, Card, PrimaryButton, Screen, SecondaryButton, T } from '../components/ui';
import { xpTotal, useStore } from '../data/store';
import { activeMs, averagePace, formatDistance, formatDuration, formatPace, levelFor } from '../lib/engine';
import { useMapPrefs } from '../lib/mapPrefs';
import { useTheme } from '../theme/Theme';

export default function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();
  const router = useRouter();
  const colors = useTheme();
  const prefs = useMapPrefs();
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
  const track = run.session.points.map((point) => [point.lon, point.lat] as [number, number]);
  return (
    <Screen>
      <BrandHeader back={false} />
      <T size={34} weight="bold">Run Complete</T>
      <T color={colors.muted} style={{ marginTop: 6 }}>{run.summary || 'The route is saved on this phone.'}</T>
      <View style={{ height: 240, borderRadius: 22, overflow: 'hidden', marginTop: 16 }}>
        <PaceMap prefs={prefs} tracks={track.length > 1 ? [{ id: 'replay', coordinates: track, color: '#B6FF00', width: 5 }] : run.planned ? [{ id: 'planned', coordinates: run.planned.coordinates }] : []} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
        <Card style={{ flex: 1 }}>
          <T size={12} color={colors.muted}>Distance</T>
          <T size={20} weight="bold">{`${formatDistance(run.session.distanceM, unit)} ${unit}`}</T>
        </Card>
        <Card style={{ flex: 1 }}>
          <T size={12} color={colors.muted}>Time</T>
          <T size={20} weight="bold">{formatDuration(activeMs(run.session, run.session.finishedAt ?? Date.now()))}</T>
        </Card>
        <Card style={{ flex: 1 }}>
          <T size={12} color={colors.muted}>Pace</T>
          <T size={20} weight="bold">{formatPace(averagePace(run.session, unit))}</T>
        </Card>
      </View>
      <T color={colors.link} weight="semibold" style={{ marginTop: 12 }}>{xp ? `+${xp.amount} XP · Level ${level.level}` : `Level ${level.level}`}</T>
      <View style={{ gap: 10, marginTop: 16 }}>
        <PrimaryButton label="View Full Analysis" onPress={() => router.replace(`/run/${run.id}`)} />
        <SecondaryButton label="Back home" onPress={() => router.replace('/home')} />
      </View>
    </Screen>
  );
}
