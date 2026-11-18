import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { PaceMap } from '../../../../components/PaceMap';
import { BrandHeader, Card, PrimaryButton, Screen, T } from '../../../../components/ui';
import { useAuthGuard } from '../../../../components/ui';
import { useStore } from '../../../../data/store';
import { formatDistance, formatDuration } from '../../../../lib/engine';
import { recallRoute } from '../../../../lib/mapbox';
import { useMapPrefs } from '../../../../lib/mapPrefs';
import { useTheme } from '../../../../theme/Theme';

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  const prefs = useMapPrefs();
  const route = id ? recallRoute(id) : undefined;
  const unit = store.settings.units;

  if (!route) {
    return (
      <Screen tab>
        <BrandHeader back />
        <T size={28} weight="bold">Route unavailable</T>
        <T color={colors.muted} style={{ marginTop: 8 }}>Open it again from Explore. Saved geometry stays only for this session unless you heart it.</T>
      </Screen>
    );
  }

  const selected = route;
  async function useRoute() {
    let source: 'gps' | 'practice' = 'practice';
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.granted) source = 'gps';
    } catch {
      source = 'practice';
    }
    const runId = store.startRun(selected.name, source, {
      name: selected.name,
      coordinates: selected.coordinates,
      distanceM: selected.distanceM,
      elevationM: selected.elevationM,
    });
    if (runId) router.push({ pathname: '/live', params: { id: runId } });
  }

  return (
    <Screen tab>
      <BrandHeader back />
      <View style={{ height: 280, borderRadius: 22, overflow: 'hidden', marginBottom: 16 }}>
        <PaceMap
          prefs={prefs}
          tracks={[{ id: 'planned', coordinates: route.coordinates, color: '#B6FF00', width: 6 }]}
        />
      </View>
      <T size={30} weight="bold">{route.name}</T>
      <T color={colors.muted} style={{ marginTop: 4 }}>{route.blurb}</T>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <T size={18} weight="bold">{`${formatDistance(route.distanceM, unit)}`}</T>
          <T size={12} color={colors.muted}>{unit === 'mi' ? 'Miles' : 'Kilometres'}</T>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <T size={18} weight="bold">{route.elevationM ? `${route.elevationM} m` : '—'}</T>
          <T size={12} color={colors.muted}>Elevation</T>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <T size={18} weight="bold">{formatDuration(route.durationS * 1000)}</T>
          <T size={12} color={colors.muted}>Estimate</T>
        </Card>
      </View>
      <Card style={{ marginTop: 14 }}>
        <T weight="bold">Route highlights</T>
        {route.highlights.map((line) => (
          <T key={line} color={colors.muted} style={{ marginTop: 8 }}>{`• ${line}`}</T>
        ))}
      </Card>
      <View style={{ marginTop: 16 }}>
        <PrimaryButton label="Use This Route" onPress={() => void useRoute()} />
      </View>
    </Screen>
  );
}
