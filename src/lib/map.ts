import Constants from 'expo-constants';

import { staticMapPath, type Point } from './engine';

const MAP_NAMES = ['API_KEY', 'MAPBOX_ACCESS_TOKEN', 'EXPO_PUBLIC_MAPBOX_TOKEN'] as const;

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function readMapKey(): string {
  for (const name of MAP_NAMES) {
    const fromProcess = clean(process.env[name]);
    if (fromProcess) return fromProcess;
  }
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  for (const name of MAP_NAMES) {
    const fromExtra = clean(extra?.[name]);
    if (fromExtra) return fromExtra;
  }
  return '';
}

export function mapPreviewUrl(points: Point[]): string | null {
  return staticMapPath(points, readMapKey());
}
