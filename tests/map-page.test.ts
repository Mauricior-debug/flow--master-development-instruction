import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildMapHtml, mapStyleUrl } from '../src/lib/mapPage.ts';

test('map page keeps a visible You marker and swaps style only when it changes', () => {
  const html = buildMapHtml('test-token', 'dark');
  assert.match(html, /you-label/);
  assert.match(html, />You</);
  assert.match(html, /styleBusy/);
  assert.equal(html.includes('hideLines'), false);
  assert.equal(html.includes('mapbox://styles/mapbox/dark-v11'), true);
  assert.equal(mapStyleUrl('light'), 'mapbox://styles/mapbox/light-v11');
  assert.equal(mapStyleUrl('terrain'), 'mapbox://styles/mapbox/outdoors-v12');
});
