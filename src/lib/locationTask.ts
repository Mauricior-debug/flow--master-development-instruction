import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { addPoint, type DB, type Point, type StoredRun } from './engine';

export const LOCATION_TASK = 'pace-ai-background-location';
export const DB_KEY = 'pace-ai-db-v1';

type LocationData = { locations?: Location.LocationObject[] };

async function readDb(): Promise<DB | null> {
  const raw = await AsyncStorage.getItem(DB_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as DB;
}

async function writeRun(run: StoredRun): Promise<void> {
  const db = await readDb();
  if (!db) return;
  db.runs = db.runs.map((item) => (item.id === run.id ? run : item));
  await AsyncStorage.setItem(DB_KEY, JSON.stringify(db));
}

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const locations = (data as LocationData).locations ?? [];
  const db = await readDb();
  if (!db) return;
  const run = db.runs.find((item) => item.session.status === 'running' || item.session.status === 'paused');
  if (!run || run.session.status !== 'running') return;
  let session = run.session;
  for (const location of locations) {
    const point: Point = {
      lat: location.coords.latitude,
      lon: location.coords.longitude,
      t: location.timestamp,
      accuracy: location.coords.accuracy ?? undefined,
    };
    session = addPoint(session, point);
  }
  await writeRun({ ...run, session });
});

export async function startBackgroundUpdates(): Promise<boolean> {
  try {
    const permission = await Location.requestBackgroundPermissionsAsync();
    if (permission.status !== 'granted') return false;
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (!started) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 5,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'PACE AI is recording your run',
          notificationBody: 'Distance and pace keep updating while you run.',
        },
      });
    }
    return true;
  } catch {
    return false;
  }
}

export async function stopBackgroundUpdates(): Promise<void> {
  try {
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  } catch {
    // Foreground tracking still owns the session.
  }
}
