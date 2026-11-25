import assert from 'node:assert/strict';
import { test } from 'node:test';

const token = process.env.API_KEY?.trim() ?? '';

async function mapGet(path: string): Promise<{ status: number; body: unknown; type: string }> {
  const response = await fetch(`https://api.mapbox.com${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`);
  const type = response.headers.get('content-type') ?? '';
  if (type.includes('json')) {
    const body = await response.json();
    return { status: response.status, body, type };
  }
  await response.arrayBuffer();
  return { status: response.status, body: null, type };
}

test('mapbox key can search, route, and load the dark style', { skip: token.length === 0 }, async () => {
  const geocode = await mapGet('/geocoding/v5/mapbox.places/park.json?proximity=-0.1278,51.5074&limit=1');
  assert.equal(geocode.status, 200);
  const features = (geocode.body as { features?: { center?: number[] }[] }).features ?? [];
  assert.ok(features.length > 0);
  assert.equal(features[0].center?.length, 2);

  const directions = await mapGet(
    '/directions/v5/mapbox/walking/-0.1278,51.5074;-0.12,51.51;-0.1278,51.5074?geometries=geojson&overview=full',
  );
  assert.equal(directions.status, 200);
  const coordinates = (directions.body as { routes?: { geometry?: { coordinates?: number[][] }; distance?: number }[] }).routes?.[0]?.geometry?.coordinates ?? [];
  assert.ok(coordinates.length > 2);
  const distance = (directions.body as { routes?: { distance?: number }[] }).routes?.[0]?.distance ?? 0;
  assert.ok(distance > 100);

  const style = await mapGet('/styles/v1/mapbox/dark-v11');
  assert.equal(style.status, 200);

  const image = await mapGet(
    '/styles/v1/mapbox/dark-v11/static/path-5+b6ff00-1(-0.1278,51.5074;-0.12,51.51)/auto/300x200?padding=16',
  );
  assert.equal(image.status, 200);
  assert.match(image.type, /image/);
});
