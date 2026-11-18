import { useEffect, useMemo, useRef, type ReactElement } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

const MapWeb = WebView as unknown as (props: {
  ref?: { current: { injectJavaScript: (code: string) => void } | null };
  originWhitelist?: string[];
  source?: { html: string };
  style?: object;
  scrollEnabled?: boolean;
  onLoadEnd?: () => void;
}) => ReactElement;

import { readMapKey } from '../lib/map';
import type { MapPrefs } from '../lib/mapPrefs';
import { T } from './ui';
import { useTheme } from '../theme/Theme';

export type MapMarker = { lon: number; lat: number; label: string };
export type MapTrack = { id: string; coordinates: [number, number][]; color?: string; width?: number; opacity?: number };

type Props = {
  prefs: MapPrefs;
  tracks?: MapTrack[];
  markers?: MapMarker[];
  user?: { lon: number; lat: number } | null;
  follow?: boolean;
  interactive?: boolean;
};

const STYLES: Record<MapPrefs['style'], string> = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  terrain: 'mapbox://styles/mapbox/outdoors-v12',
};

function mapHtml(token: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link href="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css" rel="stylesheet" />
<script src="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; background: #07110c; }
  .mapboxgl-ctrl-attrib { font-size: 10px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  mapboxgl.accessToken = ${JSON.stringify(token)};
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-0.12, 51.5],
    zoom: 12
  });
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }), 'bottom-right');
  map.dragPan.enable();
  map.scrollZoom.enable();
  map.touchZoomRotate.enable();
  let ready = false;
  let pending = null;
  const markers = [];
  function clearMarkers() { while (markers.length) markers.pop().remove(); }
  function line(id, coords, color, width, opacity) {
    const data = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } };
    if (map.getSource(id)) map.getSource(id).setData(data);
    else {
      map.addSource(id, { type: 'geojson', data });
      map.addLayer({ id, type: 'line', source: id, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': color, 'line-width': width, 'line-opacity': opacity } });
    }
    if (map.getLayer(id)) {
      map.setPaintProperty(id, 'line-color', color);
      map.setPaintProperty(id, 'line-width', width);
      map.setPaintProperty(id, 'line-opacity', opacity);
    }
  }
  function hideLines() {
    const style = map.getStyle();
    (style.layers || []).forEach((layer) => {
      if (String(layer.id).indexOf('pace-') === 0 && map.getLayer(layer.id)) map.setLayoutProperty(layer.id, 'visibility', 'none');
    });
  }
  function setPoi(show) {
    const style = map.getStyle();
    (style.layers || []).forEach((layer) => {
      if (String(layer.id).indexOf('poi') !== -1 && map.getLayer(layer.id)) {
        map.setLayoutProperty(layer.id, 'visibility', show ? 'visible' : 'none');
      }
    });
  }
  function fit(coords) {
    if (!coords.length) return;
    let minLon = coords[0][0], maxLon = coords[0][0], minLat = coords[0][1], maxLat = coords[0][1];
    coords.forEach((c) => { minLon = Math.min(minLon, c[0]); maxLon = Math.max(maxLon, c[0]); minLat = Math.min(minLat, c[1]); maxLat = Math.max(maxLat, c[1]); });
    if (minLon === maxLon && minLat === maxLat) map.easeTo({ center: [minLon, minLat], zoom: 14 });
    else map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 48, duration: 400 });
  }
  function apply(payload) {
    if (!ready) { pending = payload; return; }
    if (payload.style && map.getStyle().sprite && payload.style !== map.__paceStyle) {
      map.__paceStyle = payload.style;
      map.setStyle(payload.style);
      map.once('style.load', () => { pending = null; apply(payload); });
      return;
    }
    map.__paceStyle = payload.style;
    hideLines();
    if (payload.showRoute) {
      (payload.tracks || []).forEach((track) => {
        if (track.coordinates && track.coordinates.length > 1) {
          line('pace-' + track.id, track.coordinates, track.color || '#B6FF00', track.width || 5, track.opacity == null ? 1 : track.opacity);
          const layerId = 'pace-' + track.id;
          if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'visible');
        }
      });
    }
    clearMarkers();
    if (payload.showMarkers) {
      (payload.markers || []).forEach((marker) => {
        const el = document.createElement('div');
        el.textContent = marker.label;
        el.style.cssText = 'background:#B6FF00;color:#10210A;font:700 11px sans-serif;padding:4px 7px;border-radius:99px;';
        markers.push(new mapboxgl.Marker({ element: el }).setLngLat([marker.lon, marker.lat]).addTo(map));
      });
    }
    if (payload.user) {
      if (!map.getSource('pace-user')) {
        map.addSource('pace-user', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Point', coordinates: [payload.user.lon, payload.user.lat] } } });
        map.addLayer({ id: 'pace-user', type: 'circle', source: 'pace-user', paint: { 'circle-radius': 7, 'circle-color': '#B6FF00', 'circle-stroke-width': 2, 'circle-stroke-color': '#07110C' } });
      } else {
        map.getSource('pace-user').setData({ type: 'Feature', geometry: { type: 'Point', coordinates: [payload.user.lon, payload.user.lat] } });
      }
      if (payload.follow) map.easeTo({ center: [payload.user.lon, payload.user.lat], zoom: Math.max(map.getZoom(), 15), duration: 400 });
    }
    setPoi(Boolean(payload.poi));
    if (payload.fit && !payload.follow) {
      const all = [];
      (payload.tracks || []).forEach((track) => (track.coordinates || []).forEach((c) => all.push(c)));
      fit(all);
    }
  }
  map.on('load', () => {
    ready = true;
    if (pending) apply(pending);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('ready');
  });
  window.applyPace = apply;
  function onMessage(event) {
    try { apply(JSON.parse(event.data)); } catch (error) {}
  }
  document.addEventListener('message', onMessage);
  window.addEventListener('message', onMessage);
</script>
</body>
</html>`;
}

export function PaceMap({ prefs, tracks = [], markers = [], user, follow, interactive = true }: Props) {
  const colors = useTheme();
  const token = readMapKey();
  const web = useRef<{ injectJavaScript: (code: string) => void } | null>(null);
  const seen = useRef(false);
  const html = useMemo(() => (token ? mapHtml(token) : ''), [token]);
  const payload = useMemo(
    () => ({
      style: STYLES[prefs.style],
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
      <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <T color={colors.muted} center>The live map needs a Mapbox key in API_KEY.</T>
      </View>
    );
  }

  return (
    <MapWeb
      ref={web}
      originWhitelist={['*']}
      source={{ html }}
      style={{ flex: 1, backgroundColor: '#07110C' }}
      scrollEnabled={interactive}
      onLoadEnd={() => {
        seen.current = true;
        web.current?.injectJavaScript(`window.applyPace && window.applyPace(${JSON.stringify(payload)}); true;`);
      }}
    />
  );
}
