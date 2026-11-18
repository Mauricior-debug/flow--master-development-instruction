import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PaceMap } from '../../../components/PaceMap';
import { BrandHeader, Card, EmptyState, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { formatDistance } from '../../../lib/engine';
import { useMapPrefs } from '../../../lib/mapPrefs';
import { useUserLocation } from '../../../lib/useUserLocation';
import { useTheme } from '../../../theme/Theme';
import { useRouter } from 'expo-router';

export default function RunningMapScreen() {
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  const prefs = useMapPrefs();
  const you = useUserLocation();
  const [tab, setTab] = useState<'routes' | 'heatmap' | 'history'>('routes');
  const unit = store.settings.units;
  const runs = store.user ? store.db.runs.filter((item) => item.userId === store.user?.id && item.session.status === 'finished' && item.session.points.length > 1) : [];
  const tracks = runs.map((run) => ({
    id: run.id,
    coordinates: run.session.points.map((point) => [point.lon, point.lat] as [number, number]),
    width: tab === 'heatmap' ? 14 : 4,
    opacity: tab === 'heatmap' ? 0.35 : 1,
    color: '#B6FF00',
  }));
  const distance = runs.reduce((sum, run) => sum + run.session.distanceM, 0);
  const elevation = runs.reduce((sum, run) => sum + (run.planned?.elevationM ?? 0), 0);
  const moving = runs.reduce((sum, run) => sum + run.session.movingMs, 0);

  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">My Running Map</T>
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, padding: 4, marginVertical: 14 }}>
        {(['routes', 'heatmap', 'history'] as const).map((item) => (
          <Pressable key={item} accessibilityRole="button" onPress={() => setTab(item)} style={({ pressed }) => [{ flex: 1, minHeight: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === item ? colors.lime : 'transparent', opacity: pressed ? 0.8 : 1 }]}>
            <T weight="bold" color={tab === item ? colors.onLime : colors.text}>{item[0].toUpperCase() + item.slice(1)}</T>
          </Pressable>
        ))}
      </View>
      {runs.length === 0 ? (
        <EmptyState title="No routes saved yet" detail="Finish a run and it will draw here. Nothing is published." action="Find a route" onAction={() => router.push('/run/explore')} />
      ) : tab === 'history' ? (
        runs.map((run) => (
          <Pressable key={run.id} accessibilityRole="button" onPress={() => router.push(`/run/${run.id}`)} style={({ pressed }) => [{ marginBottom: 10, opacity: pressed ? 0.8 : 1 }]}>
            <Card>
              <T weight="bold">{run.goalLabel}</T>
              <T color={colors.muted}>{`${formatDistance(run.session.distanceM, unit)} ${unit} · ${run.session.source === 'practice' ? 'Practice' : 'GPS'}`}</T>
            </Card>
          </Pressable>
        ))
      ) : (
        <View style={{ height: 420, borderRadius: 22, overflow: 'hidden' }}>
          <PaceMap prefs={{ ...prefs, route: true }} tracks={tracks} user={you} />
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        <Card style={{ flex: 1, alignItems: 'center' }}><T size={20} weight="bold">{runs.length}</T><T size={12} color={colors.muted}>Runs</T></Card>
        <Card style={{ flex: 1, alignItems: 'center' }}><T size={20} weight="bold">{formatDistance(distance, unit)}</T><T size={12} color={colors.muted}>{unit === 'mi' ? 'Miles' : 'Kilometres'}</T></Card>
        <Card style={{ flex: 1, alignItems: 'center' }}><T size={20} weight="bold">{elevation ? `${elevation}` : `${Math.round(moving / 60000)}`}</T><T size={12} color={colors.muted}>{elevation ? 'Elevation m' : 'Moving min'}</T></Card>
      </View>
    </Screen>
  );
}
