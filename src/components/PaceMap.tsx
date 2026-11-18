import { useEffect, useMemo, useRef, type ReactElement } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { readMapKey } from '../lib/map';
import { buildMapHtml, mapStyleUrl } from '../lib/mapPage';
import type { MapPrefs } from '../lib/mapPrefs';
import { useTheme } from '../theme/Theme';
import { T } from './ui';

const MapWeb = WebView as unknown as (props: {
  ref?: { current: { injectJavaScript: (code: string) => void } | null };
  originWhitelist?: string[];
  source?: { html: string; baseUrl?: string };
  style?: object;
  scrollEnabled?: boolean;
  onLoadEnd?: () => void;
}) => ReactElement;

export type MapMarker = { lon: number; lat: number; label: string };
export type MapTrack = { id: string; coordinates: [number, number][]; color?: string; width?: number; opacity?: number };
export type MapUser = { lon: number; lat: number; heading?: number };

type Props = {
  prefs: MapPrefs;
  tracks?: MapTrack[];
  markers?: MapMarker[];
  user?: MapUser | null;
  follow?: boolean;
  interactive?: boolean;
};

export function PaceMap({ prefs, tracks = [], markers = [], user, follow, interactive = true }: Props) {
  const colors = useTheme();
  const token = readMapKey();
  const web = useRef<{ injectJavaScript: (code: string) => void } | null>(null);
  const seen = useRef(false);
  const initialStyle = useRef(prefs.style);
  const html = useMemo(() => (token ? buildMapHtml(token, initialStyle.current) : ''), [token]);
  const payload = useMemo(
    () => ({
      style: mapStyleUrl(prefs.style),
      tracks,
      markers,
      user: user ?? null,
      follow: Boolean(follow),
      showRoute: prefs.route,
      showMarkers: prefs.markers,
      poi: prefs.poi,
      fit: !follow,
    }),
    [follow, markers, prefs.markers, prefs.poi, prefs.route, prefs.style, tracks, user],
  );

  useEffect(() => {
    if (!seen.current) return;
    web.current?.injectJavaScript(`window.applyPace(${JSON.stringify(payload)}); true;`);
  }, [payload]);

  if (!token) {
    return (
      <View style={{ flex: 1, minHeight: 180, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <T color={colors.muted} center>The live map needs a Mapbox key in API_KEY.</T>
      </View>
    );
  }

  return (
    <MapWeb
      ref={web}
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://api.mapbox.com' }}
      style={{ flex: 1, backgroundColor: '#07110C' }}
      scrollEnabled={false}
      onLoadEnd={() => {
        seen.current = true;
        web.current?.injectJavaScript(`window.applyPace && window.applyPace(${JSON.stringify(payload)}); true;`);
      }}
    />
  );
}
