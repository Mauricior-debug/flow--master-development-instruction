import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type MapStyleName = 'dark' | 'light' | 'terrain';

export type MapPrefs = {
  style: MapStyleName;
  route: boolean;
  markers: boolean;
  elevation: boolean;
  poi: boolean;
};

const KEY = 'pace-ai-map-prefs';

const fallback: MapPrefs = {
  style: 'dark',
  route: true,
  markers: true,
  elevation: true,
  poi: false,
};

let current = fallback;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getMapPrefs(): MapPrefs {
  return current;
}

export function setMapPrefs(patch: Partial<MapPrefs>): void {
  current = { ...current, ...patch };
  emit();
  void AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => undefined);
}

export async function loadMapPrefs(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return;
    current = { ...fallback, ...(JSON.parse(raw) as Partial<MapPrefs>) };
    emit();
  } catch {
    current = fallback;
  }
}

export function useMapPrefs(): MapPrefs {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getMapPrefs,
    getMapPrefs,
  );
}
