import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Image } from 'expo-image';

import { PaceMap } from '../../../components/PaceMap';
import { BrandHeader, Card, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { averagePace, formatDistance, formatDuration, formatPace } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useAuthGuard();
  const colors = useTheme();
  const run = store.db.runs.find((item) => item.id === id);
  if (!run) {
    return (
      <Screen tab>
        <BrandHeader back />
        <T size={28} weight="bold">Run not found</T>
      </Screen>
    );
  }
  const unit = store.settings.units;
  const splits = unit === 'mi' ? run.session.splitsMi : run.session.splitsKm;
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">{run.goalLabel}</T>
      <T color={colors.muted} style={{ marginTop: 4 }}>{run.session.source === 'practice' ? 'Practice route' : 'GPS route'}</T>
      <View style={{ marginTop: 16 }}>
        <View style={{ height: 240, borderRadius: 18, overflow: 'hidden' }}>
          <PaceMap
            prefs={{ style: 'dark', route: true, markers: true, elevation: false, poi: false }}
            tracks={[{ id: run.id, coordinates: run.session.points.map((point) => [point.lon, point.lat]), color: '#B6FF00', width: 5 }]}
            follow={false}
          />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Card style={{ flex: 1 }}><T size={12} color={colors.muted}>Distance</T><T weight="bold">{`${formatDistance(run.session.distanceM, unit)} ${unit}`}</T></Card>
        <Card style={{ flex: 1 }}><T size={12} color={colors.muted}>Avg pace</T><T weight="bold">{`${formatPace(averagePace(run.session, unit))} /${unit}`}</T></Card>
      </View>
      <T size={20} weight="bold" style={{ marginTop: 18, marginBottom: 8 }}>Splits</T>
      {splits.length === 0 ? (
        <T color={colors.muted}>No full split yet. Keep going past the first {unit === 'mi' ? 'mile' : 'kilometre'}.</T>
      ) : (
        splits.map((split) => (
          <Card key={`${split.unit}-${split.index}`} style={{ marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
            <T weight="bold">{`${split.unit === 'mi' ? 'Mile' : 'Km'} ${split.index}`}</T>
            <T>{formatDuration(split.seconds * 1000)}</T>
          </Card>
        ))
      )}
      {run.summary ? (
        <Card style={{ marginTop: 8 }}>
          <T weight="bold">Summary</T>
          <T color={colors.muted} style={{ marginTop: 6 }}>{run.summary}</T>
        </Card>
      ) : null}
      {run.noteUri ? (
        <View style={{ marginTop: 12 }}>
          <T weight="bold" style={{ marginBottom: 8 }}>Visual note</T>
          <Image source={{ uri: run.noteUri }} style={{ width: '100%', height: 220, borderRadius: 18 }} contentFit="cover" accessibilityLabel="Photo you saved with this run" />
          <T size={13} color={colors.muted} style={{ marginTop: 8 }}>A photo you chose to keep. It does not detect hazards or score your form.</T>
        </View>
      ) : null}
    </Screen>
  );
}
