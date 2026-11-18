const STYLE_URL: Record<string, string> = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  terrain: 'mapbox://styles/mapbox/outdoors-v12',
};

export function mapStyleUrl(name: string): string {
  return STYLE_URL[name] ?? STYLE_URL.dark;
}

export function buildMapHtml(token: string, initialStyle = 'dark', selfTest = false): string {
  const style = mapStyleUrl(initialStyle);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link href="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css" rel="stylesheet" />
<script src="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; background: #07110c; }
  .mapboxgl-canvas, .mapboxgl-canvas-container { background: #07110c !important; }
  .mapboxgl-ctrl-attrib { font-size: 10px; }
  .mapboxgl-ctrl-top-right { top: 8px; }
  .you { width: 22px; height: 22px; }
  .you-dot {
    width: 22px; height: 22px; border-radius: 50%;
    background: #B6FF00; border: 3px solid #ffffff;
    box-shadow: 0 0 0 3px rgba(7,17,12,0.85);
  }
  .you-label {
    position: absolute; left: 28px; top: 0;
    background: #10210A; color: #F4F7F2;
    font: 700 12px/16px sans-serif;
    padding: 2px 7px; border-radius: 8px; white-space: nowrap;
  }
  #pace-status { position: absolute; width: 1px; height: 1px; overflow: hidden; }
</style>
</head>
<body>
<div id="map"></div>
<pre id="pace-status"></pre>
<script>
  window.__errors = [];
  window.__styleSets = 0;
  window.onerror = function (message) { window.__errors.push(String(message)); };
  mapboxgl.accessToken = ${JSON.stringify(token)};
  const map = new mapboxgl.Map({
    container: 'map',
    style: ${JSON.stringify(style)},
    center: [-0.12, 51.5],
    zoom: 13,
    fadeDuration: 0,
    attributionControl: true
  });
  const realSetStyle = map.setStyle.bind(map);
  map.setStyle = function (nextStyle, options) {
    window.__styleSets += 1;
    return realSetStyle(nextStyle, options);
  };
  map.dragPan.enable();
  map.scrollZoom.enable();
  map.touchZoomRotate.enable();
  let ready = false;
  let pending = null;
  let activeStyle = ${JSON.stringify(style)};
  let styleBusy = false;
  let queued = null;
  let fittedKey = '';
  let lastPoi = null;
  let userMarker = null;
  let dragging = false;
  let markerSig = '';
  const kmMarkers = [];
  const knownLines = {};
  map.on('dragstart', function () { dragging = true; });
  function report(extra) {
    const node = document.getElementById('pace-status');
    if (!node) return;
    node.textContent = JSON.stringify(Object.assign({
      styleSets: window.__styleSets,
      hasYou: !!document.querySelector('.you-label'),
      errors: window.__errors.slice(0, 5),
      ready: ready
    }, extra || {}));
  }
  function clearUser() {
    if (userMarker) { userMarker.remove(); userMarker = null; }
  }
  function showUser(user) {
    if (!user || typeof user.lon !== 'number' || typeof user.lat !== 'number') { clearUser(); return; }
    if (!userMarker) {
      const el = document.createElement('div');
      el.className = 'you';
      el.innerHTML = '<div class="you-dot"></div><div class="you-label">You</div>';
      userMarker = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([user.lon, user.lat]).addTo(map);
    } else {
      userMarker.setLngLat([user.lon, user.lat]);
    }
  }
  function line(id, coords, color, width, opacity) {
    const data = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } };
    if (map.getSource(id)) {
      map.getSource(id).setData(data);
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible');
    } else {
      map.addSource(id, { type: 'geojson', data: data });
      map.addLayer({
        id: id, type: 'line', source: id,
        layout: { 'line-join': 'round', 'line-cap': 'round', visibility: 'visible' },
        paint: { 'line-color': color, 'line-width': width, 'line-opacity': opacity }
      });
    }
    if (map.getLayer(id)) {
      map.setPaintProperty(id, 'line-color', color);
      map.setPaintProperty(id, 'line-width', width);
      map.setPaintProperty(id, 'line-opacity', opacity);
    }
    knownLines[id] = true;
  }
  function showKm(list, enabled) {
    const sig = enabled ? (list || []).map(function (m) { return m.label + '@' + m.lon.toFixed(4) + ',' + m.lat.toFixed(4); }).join('|') : '';
    if (sig === markerSig) return;
    markerSig = sig;
    while (kmMarkers.length) kmMarkers.pop().remove();
    if (!enabled) return;
    (list || []).forEach(function (marker) {
      const el = document.createElement('div');
      el.textContent = marker.label;
      el.style.cssText = 'background:#B6FF00;color:#10210A;font:700 11px/14px sans-serif;padding:2px 6px;border-radius:99px;border:2px solid #fff;';
      kmMarkers.push(new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([marker.lon, marker.lat]).addTo(map));
    });
  }
  function dropUnused(keep) {
    Object.keys(knownLines).forEach(function (id) {
      if (keep[id]) return;
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
      delete knownLines[id];
    });
  }
  function setPoi(show) {
    const style = map.getStyle();
    if (!style || !style.layers) return;
    style.layers.forEach(function (layer) {
      if (String(layer.id).indexOf('poi') === -1 || !map.getLayer(layer.id)) return;
      map.setLayoutProperty(layer.id, 'visibility', show ? 'visible' : 'none');
    });
  }
  function fit(coords) {
    if (!coords.length) return;
    let minLon = coords[0][0], maxLon = coords[0][0], minLat = coords[0][1], maxLat = coords[0][1];
    coords.forEach(function (c) {
      minLon = Math.min(minLon, c[0]); maxLon = Math.max(maxLon, c[0]);
      minLat = Math.min(minLat, c[1]); maxLat = Math.max(maxLat, c[1]);
    });
    if (minLon === maxLon && minLat === maxLat) map.jumpTo({ center: [minLon, minLat], zoom: 14 });
    else map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 56, duration: 0 });
  }
  function draw(payload) {
    const keep = {};
    if (payload.showRoute) {
      (payload.tracks || []).forEach(function (track) {
        if (!track.coordinates || track.coordinates.length < 2) return;
        const id = 'pace-' + track.id;
        line(id, track.coordinates, track.color || '#B6FF00', track.width || 5, track.opacity == null ? 1 : track.opacity);
        keep[id] = true;
      });
    }
    dropUnused(keep);
    showKm(payload.markers, Boolean(payload.showMarkers));
    showUser(payload.user);
    if (payload.poi !== lastPoi) {
      lastPoi = payload.poi;
      setPoi(Boolean(payload.poi));
    }
    const fitKey = (payload.tracks || []).map(function (track) { return track.id; }).join('|');
    if (payload.fit && fitKey && fitKey !== fittedKey) {
      fittedKey = fitKey;
      const all = [];
      (payload.tracks || []).forEach(function (track) { (track.coordinates || []).forEach(function (c) { all.push(c); }); });
      if (payload.user) all.push([payload.user.lon, payload.user.lat]);
      fit(all);
    } else if (payload.follow && payload.user && !dragging) {
      map.easeTo({
        center: [payload.user.lon, payload.user.lat],
        duration: 450,
        padding: payload.padding || { top: 150, bottom: 180, left: 40, right: 40 }
      });
    }
    report();
  }
  function apply(payload) {
    try {
      if (!ready) { pending = payload; return; }
      if (payload.style && payload.style !== activeStyle) {
        queued = payload;
        if (styleBusy) return;
        styleBusy = true;
        activeStyle = payload.style;
        map.once('style.load', function () {
          styleBusy = false;
          fittedKey = '';
          markerSig = '';
          if (userMarker) { userMarker.remove(); userMarker = null; }
          while (kmMarkers.length) kmMarkers.pop().remove();
          Object.keys(knownLines).forEach(function (id) { delete knownLines[id]; });
          const job = queued;
          queued = null;
          if (job) apply(job);
        });
        map.setStyle(payload.style);
        return;
      }
      draw(payload);
    } catch (error) {
      window.__errors.push(String(error && error.message ? error.message : error));
      report();
    }
  }
  map.on('load', function () {
    ready = true;
    if (pending) { const job = pending; pending = null; apply(job); }
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('ready');
    report();
  });
  window.applyPace = apply;
  function onMessage(event) {
    try { apply(JSON.parse(event.data)); } catch (error) { window.__errors.push('bad-message'); }
  }
  document.addEventListener('message', onMessage);
  window.addEventListener('message', onMessage);
  ${selfTest ? selfTestScript() : ''}
</script>
</body>
</html>`;
}

function selfTestScript(): string {
  return `
  (async function () {
    function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
    const dark = 'mapbox://styles/mapbox/dark-v11';
    const light = 'mapbox://styles/mapbox/light-v11';
    const track = [[-0.13, 51.50], [-0.12, 51.505], [-0.11, 51.51]];
    const base = { tracks: [{ id: 't', coordinates: track, color: '#B6FF00', width: 5 }], showRoute: true, showMarkers: false, poi: false, fit: true, follow: false, user: { lon: -0.1278, lat: 51.5074 } };
    for (let i = 0; i < 40 && !ready; i += 1) await wait(250);
    apply(Object.assign({ style: dark }, base));
    await wait(600);
    const sameStyle = window.__styleSets;
    apply(Object.assign({ style: light }, base));
    await wait(1800);
    const afterSwitch = window.__styleSets;
    apply(Object.assign({ style: light }, base, { user: { lon: -0.126, lat: 51.508 } }));
    await wait(400);
    const node = document.getElementById('pace-status');
    const report = JSON.stringify({
      sameStyle: sameStyle,
      afterSwitch: afterSwitch,
      finalSets: window.__styleSets,
      hasYou: !!document.querySelector('.you-label'),
      youText: (document.querySelector('.you-label') || {}).textContent || '',
      errors: window.__errors.slice(0, 5),
      ready: ready
    });
    if (node) node.textContent = report;
    fetch('http://127.0.0.1:8765/done', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: report }).catch(function () {});
  })();
  `;
}
