import Constants from 'expo-constants';

import { staticMapPath, type Point } from './engine';

export function readMapKey(): string {
  const fromProcess = process.env.API_KEY;
  if (typeof fromProcess === 'string' && fromProcess.trim()) return fromProcess.trim();
  const extra = Constants.expoConfig?.extra as { API_KEY?: unknown } | undefined;
  if (typeof extra?.API_KEY === 'string' && extra.API_KEY.trim()) return extra.API_KEY.trim();
  return '';
}

export function mapPreviewUrl(points: Point[]): string | null {
  return staticMapPath(points, readMapKey());
}
