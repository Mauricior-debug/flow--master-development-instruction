import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { type Point } from '../lib/engine';
import { mapPreviewUrl, readMapKey } from '../lib/map';
import { useTheme } from '../theme/Theme';
import { RouteLine } from './charts';
import { T } from './ui';

export function RouteMap({ points, height = 200 }: { points: Point[]; height?: number }) {
  const colors = useTheme();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const key = readMapKey();
  const pointsRef = useRef(points);
  pointsRef.current = points;

  useEffect(() => {
    if (!key) return;
    const refresh = () => {
      const current = pointsRef.current;
      if (current.length < 2) return;
      setUrl(mapPreviewUrl(current));
    };
    refresh();
    const timer = setInterval(refresh, 8000);
    return () => clearInterval(timer);
  }, [key, points.length > 1]);

  return (
    <View>
      {url && !failed ? (
        <Image
          source={{ uri: url }}
          style={{ height, borderRadius: 18, backgroundColor: colors.surface }}
          contentFit="cover"
          accessibilityLabel="Map of this run"
          onError={() => setFailed(true)}
        />
      ) : (
        <RouteLine points={points} height={height} />
      )}
      {!key ? (
        <T size={13} color={colors.muted} style={{ marginTop: 8 }}>
          The map needs a Mapbox key on this build. Your route is still recording.
        </T>
      ) : failed ? (
        <T size={13} color={colors.muted} style={{ marginTop: 8 }}>
          Mapbox did not accept the key on this build. The line is the route saved on this phone.
        </T>
      ) : null}
    </View>
  );
}
