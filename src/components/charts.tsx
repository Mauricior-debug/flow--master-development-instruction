import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { routeBounds, type Point } from '../lib/engine';
import { font } from '../theme/tokens';
import { useTheme } from '../theme/Theme';
import { T } from './ui';

export function Ring({ progress, label }: { progress: number; label: string }) {
  const colors = useTheme();
  const size = 92;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.surface2} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.lime}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ position: 'absolute' }}>
        <T size={16} weight="bold" center>
          {label}
        </T>
      </View>
    </View>
  );
}

export function Bars({ data }: { data: { label: string; value: number }[] }) {
  const colors = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', height: 150 }}>
        <View style={{ justifyContent: 'space-between', marginRight: 8 }}>
          {['100%', '75%', '50%', '25%', '0%'].map((label) => (
            <T key={label} size={11} color={colors.faint}>
              {label}
            </T>
          ))}
        </View>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          {data.map((item) => (
            <View key={item.label} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <View
                style={{
                  width: '68%',
                  height: Math.max(4, Math.round((Math.max(0, Math.min(100, item.value)) / 100) * 120)),
                  backgroundColor: colors.lime,
                  borderRadius: 8,
                }}
              />
              <T size={11} color={colors.muted} style={{ marginTop: 6, fontFamily: font.medium }}>
                {item.label}
              </T>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function RouteLine({ points, height = 180 }: { points: Point[]; height?: number }) {
  const colors = useTheme();
  const bounds = routeBounds(points);
  if (!bounds || points.length < 2) {
    return (
      <View style={{ height, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <T color={colors.muted}>Your route will draw here as you move.</T>
      </View>
    );
  }
  const width = 320;
  const pad = 16;
  const latSpan = Math.max(0.0001, bounds.maxLat - bounds.minLat);
  const lonSpan = Math.max(0.0001, bounds.maxLon - bounds.minLon);
  const coords = points
    .map((point) => {
      const x = pad + ((point.lon - bounds.minLon) / lonSpan) * (width - pad * 2);
      const y = pad + (1 - (point.lat - bounds.minLat) / latSpan) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <View style={{ height, borderRadius: 18, overflow: 'hidden', backgroundColor: '#102018' }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polyline points={coords} fill="none" stroke={colors.lime} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}
