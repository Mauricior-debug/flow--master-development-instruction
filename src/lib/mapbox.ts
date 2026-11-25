import { readMapKey } from './map';

export type RouteCategory = 'nearby' | 'popular' | 'scenic' | 'trail';
export type RouteDifficulty = 'Easy' | 'Moderate' | 'Hard';

export type MapRoute = {
  id: string;
  name: string;
  category: RouteCategory;
  distanceM: number;
  durationS: number;
  elevationM: number;
  difficulty: RouteDifficulty;
  blurb: string;
  highlights: string[];
  coordinates: [number, number][];
};

export type MapCenter = { lat: number; lon: number; label: string };

const memory = new Map<string, MapRoute>();

export function rememberRoute(route: MapRoute): void {
  memory.set(route.id, route);
}

export function rememberRoutes(routes: MapRoute[]): void {
  routes.forEach(rememberRoute);
}

export function recallRoute(id: string): MapRoute | undefined {
  return memory.get(id);
}

export function offsetPoint(lat: number, lon: number, bearingDeg: number, meters: number): { lat: number; lon: number } {
  const bearing = (bearingDeg * Math.PI) / 180;
  const angular = meters / 6371000;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing));
  const lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1), Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: (lat2 * 180) / Math.PI, lon: (lon2 * 180) / Math.PI };
}

export function difficultyFor(distanceM: number, elevationM: number): RouteDifficulty {
  if (distanceM < 6000 && elevationM < 45) return 'Easy';
  if (distanceM < 12000 && elevationM < 140) return 'Moderate';
  return 'Hard';
}

async function readJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Map request failed (${response.status})`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function tokenOrThrow(): string {
  const token = readMapKey();
  if (!token) throw new Error('Mapbox is not configured on this build.');
  return token;
}

type GeoFeature = { text?: string; place_name?: string; center?: [number, number] };

export async function searchPlaces(query: string, near?: MapCenter): Promise<MapCenter[]> {
  const token = tokenOrThrow();
  const proximity = near ? `&proximity=${near.lon},${near.lat}` : '';
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=5${proximity}&access_token=${encodeURIComponent(token)}`;
  const body = (await readJson(url)) as { features?: GeoFeature[] };
  return (body.features ?? [])
    .filter((feature) => Array.isArray(feature.center))
    .map((feature) => ({
      lon: feature.center?.[0] ?? 0,
      lat: feature.center?.[1] ?? 0,
      label: feature.text || feature.place_name || query,
    }));
}

async function placeLabel(lat: number, lon: number, token: string): Promise<string> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=poi,neighborhood,locality&limit=1&access_token=${encodeURIComponent(token)}`;
    const body = (await readJson(url)) as { features?: GeoFeature[] };
    return body.features?.[0]?.text || 'Nearby';
  } catch {
    return 'Nearby';
  }
}

async function elevationGain(coordinates: [number, number][], token: string): Promise<number> {
  const step = Math.max(1, Math.floor(coordinates.length / 8));
  const samples: number[] = [];
  for (let index = 0; index < coordinates.length; index += step) {
    const [lon, lat] = coordinates[index];
    try {
      const url = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${lon},${lat}.json?layers=contour&limit=1&access_token=${encodeURIComponent(token)}`;
      const body = (await readJson(url)) as { features?: { properties?: { ele?: number } }[] };
      const ele = body.features?.[0]?.properties?.ele;
      if (typeof ele === 'number') samples.push(ele);
    } catch {
      return 0;
    }
  }
  let gain = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const rise = samples[index] - samples[index - 1];
    if (rise > 0) gain += rise;
  }
  return Math.round(gain);
}

async function walkingLoop(center: MapCenter, distanceM: number, bearing: number, token: string): Promise<[number, number][] | null> {
  const radius = Math.max(180, (distanceM / (2 * Math.PI)) * 0.72);
  const stops = [0, 120, 240].map((turn) => offsetPoint(center.lat, center.lon, bearing + turn, radius));
  const path = [
    `${center.lon},${center.lat}`,
    ...stops.map((stop) => `${stop.lon},${stop.lat}`),
    `${center.lon},${center.lat}`,
  ].join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${path}?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`;
  const body = (await readJson(url)) as { routes?: { geometry?: { coordinates?: [number, number][] }; distance?: number; duration?: number }[] };
  const route = body.routes?.[0];
  if (!route?.geometry?.coordinates || route.geometry.coordinates.length < 2) return null;
  return route.geometry.coordinates;
}

async function routeBetween(from: MapCenter, to: MapCenter, token: string): Promise<{ coordinates: [number, number][]; distance: number; duration: number } | null> {
  const path = `${from.lon},${from.lat};${to.lon},${to.lat};${from.lon},${from.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${path}?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`;
  const body = (await readJson(url)) as { routes?: { geometry?: { coordinates?: [number, number][] }; distance?: number; duration?: number }[] };
  const route = body.routes?.[0];
  if (!route?.geometry?.coordinates) return null;
  return { coordinates: route.geometry.coordinates, distance: route.distance ?? 0, duration: route.duration ?? 0 };
}

function describe(distanceM: number, elevationM: number, place: string): { blurb: string; highlights: string[] } {
  const flat = elevationM < 30 ? 'Mostly flat' : elevationM < 90 ? 'Gently rolling' : 'Hilly in places';
  const friendly = distanceM < 7000 ? 'A manageable distance' : 'Give yourself time for this one';
  return {
    blurb: `${flat.toLowerCase()} loop near ${place}.`,
    highlights: [`${flat} path`, friendly, `Starts and ends at ${place}`],
  };
}

async function buildLoop(center: MapCenter, distanceM: number, bearing: number, category: RouteCategory, suffix: string, token: string): Promise<MapRoute | null> {
  const coordinates = await walkingLoop(center, distanceM, bearing, token);
  if (!coordinates) return null;
  const place = await placeLabel(coordinates[Math.floor(coordinates.length / 2)][1], coordinates[Math.floor(coordinates.length / 2)][0], token);
  const elevationM = await elevationGain(coordinates, token);
  let meters = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const a = coordinates[index - 1];
    const b = coordinates[index];
    const lat = (b[1] - a[1]) * 111320;
    const lon = (b[0] - a[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180);
    meters += Math.hypot(lat, lon);
  }
  const copy = describe(meters, elevationM, place);
  const route: MapRoute = {
    id: `${category}-${bearing}-${Math.round(distanceM)}-${place.replace(/\s+/g, '-').toLowerCase()}`,
    name: `${place} ${suffix}`,
    category,
    distanceM: meters,
    durationS: Math.round(meters / 2.6),
    elevationM,
    difficulty: difficultyFor(meters, elevationM),
    blurb: copy.blurb,
    highlights: copy.highlights,
    coordinates,
  };
  rememberRoute(route);
  return route;
}

export async function discoverRoutes(center: MapCenter, category: RouteCategory): Promise<MapRoute[]> {
  const token = tokenOrThrow();
  if (category === 'nearby') {
    const made = await Promise.all([
      buildLoop(center, 3200, 15, category, 'Loop', token),
      buildLoop(center, 5200, 160, category, 'Circuit', token),
    ]);
    return made.filter((item): item is MapRoute => Boolean(item));
  }
  const query = category === 'trail' ? 'trail' : category === 'scenic' ? 'park' : 'park';
  const places = await searchPlaces(query, center);
  const routes: MapRoute[] = [];
  for (const place of places.slice(0, 2)) {
    const walked = await routeBetween(center, place, token);
    if (!walked) continue;
    const elevationM = await elevationGain(walked.coordinates, token);
    const copy = describe(walked.distance, elevationM, place.label);
    const route: MapRoute = {
      id: `${category}-${place.lon.toFixed(3)}-${place.lat.toFixed(3)}`,
      name: category === 'trail' ? `${place.label} Trail` : `${place.label} Loop`,
      category,
      distanceM: walked.distance,
      durationS: walked.duration,
      elevationM,
      difficulty: difficultyFor(walked.distance, elevationM),
      blurb: copy.blurb,
      highlights: copy.highlights,
      coordinates: walked.coordinates,
    };
    rememberRoute(route);
    routes.push(route);
  }
  if (routes.length) return routes;
  const fallback = await buildLoop(center, category === 'trail' ? 8000 : 6000, 70, category, category === 'trail' ? 'Trail' : 'Loop', token);
  return fallback ? [fallback] : [];
}

export function staticRouteImage(coordinates: [number, number][], style: 'dark' | 'light' | 'terrain' = 'dark'): string | null {
  const token = readMapKey();
  if (!token || coordinates.length < 2) return null;
  const step = Math.max(1, Math.ceil(coordinates.length / 40));
  const simplified = coordinates.filter((_, index) => index % step === 0 || index === coordinates.length - 1);
  const path = simplified.map((point) => `${point[0].toFixed(5)},${point[1].toFixed(5)}`).join(',');
  const styleId = style === 'light' ? 'light-v11' : style === 'terrain' ? 'outdoors-v12' : 'dark-v11';
  return `https://api.mapbox.com/styles/v1/mapbox/${styleId}/static/path-5+b6ff00-1(${encodeURIComponent(path)})/auto/640x360@2x?padding=32&access_token=${encodeURIComponent(token)}`;
}
