import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export type UserFix = { lon: number; lat: number; heading?: number };

export function useUserLocation(enabled = true): UserFix | null {
  const [fix, setFix] = useState<UserFix | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let watch: Location.LocationSubscription | null = null;
    let alive = true;
    async function start() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted || !alive) return;
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (alive) setFix(toFix(current));
        watch = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 4 },
          (next) => {
            if (alive) setFix(toFix(next));
          },
        );
      } catch {
        // The map still draws the route when the phone cannot provide a fix.
      }
    }
    void start();
    return () => {
      alive = false;
      watch?.remove();
    };
  }, [enabled]);

  return fix;
}

function toFix(position: Location.LocationObject): UserFix {
  const heading = position.coords.heading;
  return {
    lon: position.coords.longitude,
    lat: position.coords.latitude,
    heading: typeof heading === 'number' && heading >= 0 ? heading : undefined,
  };
}
