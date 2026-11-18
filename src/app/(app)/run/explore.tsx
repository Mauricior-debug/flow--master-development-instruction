import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, TextInput, View } from 'react-native';

import { PaceMap } from '../../../components/PaceMap';
import { BrandHeader, EmptyState, LoadingBlock, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { formatDistance } from '../../../lib/engine';
import { discoverRoutes, recallRoute, rememberRoute, searchPlaces, staticRouteImage, type MapCenter, type MapRoute, type RouteCategory } from '../../../lib/mapbox';
import { useMapPrefs } from '../../../lib/mapPrefs';
import { useUserLocation } from '../../../lib/useUserLocation';
import { font } from '../../../theme/tokens';
import { useTheme } from '../../../theme/Theme';

const SAVED_KEY = 'pace-ai-saved-routes';
const CHIPS: { id: RouteCategory; label: string }[] = [
  { id: 'nearby', label: 'Nearby' },
  { id: 'popular', label: 'Popular' },
  { id: 'scenic', label: 'Scenic' },
  { id: 'trail', label: 'Trail' },
];

export default function ExploreRoutesScreen() {
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  const prefs = useMapPrefs();
  const device = useUserLocation();
  const [query, setQuery] = useState('');
  const [center, setCenter] = useState<MapCenter | null>(null);
  const [chip, setChip] = useState<RouteCategory>('nearby');
  const [routes, setRoutes] = useState<MapRoute[]>([]);
  const [saved, setSaved] = useState<Record<string, MapRoute>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const unit = store.settings.units;

  useEffect(() => {
    void AsyncStorage.getItem(SAVED_KEY).then((raw) => {
      if (!raw) return;
      const parsed = JSON.parse(raw) as MapRoute[];
      const next: Record<string, MapRoute> = {};
      parsed.forEach((route) => {
        next[route.id] = route;
        rememberRoute(route);
      });
      setSaved(next);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let alive = true;
    async function locate() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.granted) {
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (alive) setCenter({ lat: position.coords.latitude, lon: position.coords.longitude, label: 'Your location' });
          return;
        }
      } catch {
        // Fall through to a labelled default so search still works.
      }
      if (alive) {
        setCenter({ lat: 51.5074, lon: -0.1278, label: 'London' });
        setError('Location is off, so these loops start in London. Search for a place to move the map.');
      }
    }
    void locate();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!center) return;
    let alive = true;
    setLoading(true);
    void discoverRoutes(center, chip)
      .then((found) => {
        if (!alive) return;
        setRoutes(found);
        setError(found.length ? '' : 'No walking route came back for that search.');
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setRoutes([]);
        setError(reason instanceof Error ? reason.message : 'The map service did not respond.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [center, chip]);

  async function onSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const places = await searchPlaces(query.trim(), center ?? undefined);
      if (!places[0]) {
        setError('No place matched that search.');
        return;
      }
      setCenter(places[0]);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  }

  function toggleSave(route: MapRoute) {
    setSaved((current) => {
      const next = { ...current };
      if (next[route.id]) delete next[route.id];
      else next[route.id] = route;
      void AsyncStorage.setItem(SAVED_KEY, JSON.stringify(Object.values(next))).catch(() => undefined);
      return next;
    });
  }

  return (
    <Screen tab>
      <BrandHeader back right={
        <Pressable accessibilityRole="button" accessibilityLabel="Map style" onPress={() => router.push('/map-options')} style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center' }, pressed && { opacity: 0.6 }]}>
          <Ionicons name="layers-outline" size={22} color={colors.text} />
        </Pressable>
      } />
      <T size={32} weight="bold">Explore Routes</T>
      <T color={colors.muted} style={{ marginTop: 4, marginBottom: 14 }}>{center ? `Find a route near ${center.label}.` : 'Find a route near you.'}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.stroke, paddingHorizontal: 12, minHeight: 52 }}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void onSearch()}
          placeholder="Search location or route"
          placeholderTextColor={colors.faint}
          style={{ flex: 1, color: colors.text, fontFamily: font.regular, fontSize: 16, minHeight: 48 }}
          returnKeyType="search"
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        {CHIPS.map((item) => {
          const on = chip === item.id;
          return (
            <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setChip(item.id)} style={({ pressed }) => [{ flex: 1, minHeight: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.lime : colors.surface, opacity: pressed ? 0.75 : 1 }]}>
              <T size={13} weight="bold" color={on ? colors.onLime : colors.text}>{item.label}</T>
            </Pressable>
          );
        })}
      </View>
      <View style={{ height: 240, borderRadius: 22, overflow: 'hidden', marginTop: 14 }}>
        <PaceMap
          prefs={prefs}
          user={device ?? (center?.label === 'Your location' ? { lon: center.lon, lat: center.lat } : null)}
          tracks={routes.map((route) => ({ id: route.id, coordinates: route.coordinates, color: '#B6FF00', width: 4 }))}
        />
      </View>
      {error ? <T color={colors.muted} style={{ marginTop: 12 }}>{error}</T> : null}
      {loading ? <LoadingBlock label="Drawing routes from the map" /> : null}
      {!loading && routes.length === 0 ? (
        <View style={{ marginTop: 16 }}>
          <EmptyState title="No routes yet" detail="Search for a park, neighbourhood, or trail and PACE AI will ask Mapbox for a walking loop." />
        </View>
      ) : null}
      <View style={{ gap: 14, marginTop: 16 }}>
        {routes.map((route) => {
          const image = staticRouteImage(route.coordinates, prefs.style);
          return (
            <Pressable key={route.id} accessibilityRole="button" accessibilityLabel={route.name} onPress={() => { rememberRoute(route); router.push(`/run/route/${route.id}`); }} style={({ pressed }) => [{ opacity: pressed ? 0.86 : 1 }]}>
              <View style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.stroke }}>
                {image ? (
                  <Image source={{ uri: image }} style={{ height: 150, width: '100%' }} contentFit="cover" accessibilityLabel={`Map preview of ${route.name}`} />
                ) : (
                  <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}><T color={colors.muted}>Map preview unavailable</T></View>
                )}
                <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <T size={18} weight="bold">{route.name}</T>
                    <T color={colors.muted}>{`${formatDistance(route.distanceM, unit)} ${unit} · ${route.difficulty}`}</T>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={saved[route.id] ? 'Remove saved route' : 'Save route'} onPress={() => toggleSave(route)} style={({ pressed }) => [{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.6 }]}>
                    <Ionicons name={saved[route.id] ? 'heart' : 'heart-outline'} size={22} color={saved[route.id] ? colors.lime : colors.text} />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

export function savedRoute(id: string): MapRoute | undefined {
  return recallRoute(id);
}
