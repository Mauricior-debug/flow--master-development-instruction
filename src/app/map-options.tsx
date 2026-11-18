import { Pressable, Switch, View } from 'react-native';

import { T } from '../components/ui';
import { setMapPrefs, useMapPrefs, type MapStyleName } from '../lib/mapPrefs';
import { useTheme } from '../theme/Theme';

const STYLES: { id: MapStyleName; title: string }[] = [
  { id: 'dark', title: 'Dark' },
  { id: 'light', title: 'Light' },
  { id: 'terrain', title: 'Terrain' },
];

export default function MapOptionsSheet() {
  const colors = useTheme();
  const prefs = useMapPrefs();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
      <T size={28} weight="bold">Map Style</T>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        {STYLES.map((item) => {
          const on = prefs.style === item.id;
          return (
            <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setMapPrefs({ style: item.id })} style={({ pressed }) => [{ flex: 1, minHeight: 84, borderRadius: 18, borderWidth: 1.5, borderColor: on ? colors.lime : colors.stroke, backgroundColor: item.id === 'light' ? '#E7EEE6' : item.id === 'terrain' ? '#1E3A2A' : '#121A16', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 }]}>
              <T weight="bold" color={item.id === 'light' ? '#122018' : '#F4F7F2'}>{item.title}</T>
              {on ? <T size={12} color={colors.lime}>Selected</T> : null}
            </Pressable>
          );
        })}
      </View>
      <T size={20} weight="bold" style={{ marginTop: 22, marginBottom: 8 }}>Map Layers</T>
      <Layer title="Route & Direction" value={prefs.route} onChange={(route) => setMapPrefs({ route })} />
      <Layer title="Kilometre Markers" value={prefs.markers} onChange={(markers) => setMapPrefs({ markers })} />
      <Layer title="Elevation" value={prefs.elevation} onChange={(elevation) => setMapPrefs({ elevation })} />
      <Layer title="Points of interest" value={prefs.poi} onChange={(poi) => setMapPrefs({ poi })} />
    </View>
  );
}

function Layer({ title, value, onChange }: { title: string; value: boolean; onChange: (value: boolean) => void }) {
  const colors = useTheme();
  return (
    <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.stroke }}>
      <T weight="semibold">{title}</T>
      <Switch accessibilityLabel={title} value={value} onValueChange={onChange} trackColor={{ false: colors.stroke, true: colors.lime }} thumbColor={colors.white} />
    </View>
  );
}
