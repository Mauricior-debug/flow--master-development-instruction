import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BrandHeader, Card, ErrorText, PrimaryButton, Screen, SecondaryButton, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { todayKey } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

const PRESETS = [3, 5, 10];

export default function RunSetupScreen() {
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  const [km, setKm] = useState(5);
  const [error, setError] = useState('');
  const userId = store.user?.id;
  const today = todayKey();
  const workout = store.db.workouts.find((item) => item.userId === userId && item.date === today && item.kind !== 'rest');
  const active = store.db.runs.find((item) => item.userId === userId && item.session.status !== 'finished');
  const unit = store.settings.units;

  async function begin(source: 'gps' | 'practice') {
    setError('');
    if (source === 'gps') {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          setError('Location is off. You can still use a practice route, which is labelled as practice and is not a real GPS run.');
          return;
        }
      } catch {
        setError('Location is unavailable on this device. A practice route still runs the timer, pace, and splits.');
        return;
      }
    }
    const label = workout?.title ?? `${km} ${unit} run`;
    const id = store.startRun(label, source);
    if (!id) {
      setError('Sign in again to start a run.');
      return;
    }
    router.push({ pathname: '/live', params: { id } });
  }

  return (
    <Screen tab>
      <BrandHeader />
      <T size={32} weight="bold">Run</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>Find a route on the map, or start from here.</T>
      <PrimaryButton label="Explore Routes" onPress={() => router.push('/run/explore')} />
      <View style={{ height: 16 }} />
      {active ? (
        <Card style={{ marginBottom: 12, borderColor: colors.lime }}>
          <T weight="bold">A run is already open</T>
          <T color={colors.muted} style={{ marginTop: 4 }}>{active.goalLabel}</T>
          <View style={{ marginTop: 12 }}>
            <PrimaryButton label="Return to run" onPress={() => router.push({ pathname: '/live', params: { id: active.id } })} />
          </View>
        </Card>
      ) : null}
      {workout ? (
        <Card style={{ marginBottom: 12 }}>
          <T size={13} color={colors.link} weight="semibold">TODAY’S PLAN</T>
          <T size={20} weight="bold" style={{ marginTop: 4 }}>{workout.title}</T>
          <T color={colors.muted} style={{ marginTop: 6 }}>{workout.detail}</T>
        </Card>
      ) : (
        <Card style={{ marginBottom: 12 }}>
          <T weight="bold">No workout on the plan today</T>
          <T color={colors.muted} style={{ marginTop: 4 }}>Pick a distance anyway, or set a goal to generate a plan.</T>
        </Card>
      )}
      <T weight="semibold">Target distance</T>
      <View style={{ flexDirection: 'row', gap: 10, marginVertical: 12 }}>
        {PRESETS.map((value) => (
          <Pressable key={value} accessibilityRole="button" onPress={() => setKm(value)} style={({ pressed }) => [{ flex: 1, minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: km === value ? colors.lime : colors.stroke, backgroundColor: km === value ? colors.limeDim : colors.surface, opacity: pressed ? 0.8 : 1 }]}>
            <T weight="bold">{`${value} ${unit}`}</T>
          </Pressable>
        ))}
      </View>
      <ErrorText>{error}</ErrorText>
      <View style={{ gap: 10, marginTop: 8 }}>
        <PrimaryButton label="Start Run" icon="play" onPress={() => void begin('gps')} />
        <SecondaryButton label="Practice route" onPress={() => void begin('practice')} />
      </View>
      <T size={13} color={colors.faint} style={{ marginTop: 12 }}>
        Practice route is sample motion for when GPS is denied or you are indoors. It is marked on the results.
      </T>
    </Screen>
  );
}
