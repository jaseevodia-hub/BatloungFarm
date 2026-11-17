const LEAFLET_VERSION = '1.9.4';
const LEAFLET_CSS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const LEAFLET_JS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
const DEFAULT_CENTER = [-29.3151, 27.4869];
const DEFAULT_ZOOM = 9;

let leafletPromise = null;

export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = LEAFLET_CSS;
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error('Map library failed to start.')));
    script.onerror = () => reject(new Error('Could not load the map library.'));
    document.head.appendChild(script);
  }).catch((error) => {
    leafletPromise = null;
    throw error;
  });

  return leafletPromise;
}

function addTiles(L, map) {
  L.tileLayer(TILE_URL, {
    maxZoom: 19,
    attribution: TILE_ATTRIBUTION
  }).addTo(map);
}

async function reverseGeocode(L, latitude, longitude) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', latitude.toFixed(6));
  url.searchParams.set('lon', longitude.toFixed(6));
  url.searchParams.set('zoom', '16');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Reverse geocoding failed.');

  const data = await response.json();
  const address = data.address || {};
  const place =
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.suburb ||
    address.county ||
    address.state_district;
  const region = address.state || address.country;
  const label = [place, region].filter(Boolean).join(', ') || data.display_name || '';
  return label.slice(0, 150) || null;
}

function validPoint(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

export async function mountMapPicker({ container, latitude, longitude, onPoint, onAddress }) {
  const L = await loadLeaflet();
  const hasPoint = validPoint(latitude, longitude);
  const center = hasPoint ? [latitude, longitude] : DEFAULT_CENTER;

  container.innerHTML = '';
  container.classList.add('map-active');

  const map = L.map(container, {
    center,
    zoom: hasPoint ? 14 : DEFAULT_ZOOM,
    scrollWheelZoom: true
  });
  addTiles(L, map);

  let marker = hasPoint ? L.marker(center, { draggable: true }).addTo(map) : null;
  let geocodeToken = 0;
  let destroyed = false;

  const resize = () => {
    if (!destroyed) map.invalidateSize();
  };
  window.setTimeout(resize, 50);
  window.setTimeout(resize, 250);

  function placeMarker(lat, lng) {
    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      bindDrag();
    }
  }

  function bindDrag() {
    if (!marker) return;
    marker.off('dragend');
    marker.on('dragend', () => {
      const point = marker.getLatLng();
      selectPoint(point.lat, point.lng);
    });
  }

  async function selectPoint(lat, lng) {
    const rounded = {
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6))
    };
    placeMarker(rounded.latitude, rounded.longitude);
    bindDrag();
    if (onPoint) onPoint(rounded);

    const token = ++geocodeToken;
    let address = null;
    try {
      address = await reverseGeocode(L, rounded.latitude, rounded.longitude);
    } catch (error) {
      address = null;
    }
    if (token !== geocodeToken || destroyed) return;
    if (onAddress) onAddress(address, rounded);
  }

  map.on('click', (event) => selectPoint(event.latlng.lat, event.latlng.lng));
  if (marker) bindDrag();

  return {
    async setPoint(lat, lng) {
      map.setView([lat, lng], Math.max(map.getZoom(), 14));
      await selectPoint(lat, lng);
    },
    clear() {
      geocodeToken += 1;
      if (marker) {
        marker.remove();
        marker = null;
      }
    },
    destroy() {
      destroyed = true;
      geocodeToken += 1;
      map.remove();
    }
  };
}

export async function mountMapView(container, latitude, longitude) {
  const L = await loadLeaflet();
  container.innerHTML = '';

  const map = L.map(container, {
    center: [latitude, longitude],
    zoom: 14,
    scrollWheelZoom: false
  });
  addTiles(L, map);
  L.marker([latitude, longitude]).addTo(map);

  const resize = () => map.invalidateSize();
  window.setTimeout(resize, 50);
  window.setTimeout(resize, 250);

  return {
    destroy() {
      map.remove();
    }
  };
}
