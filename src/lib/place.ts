// Konumdan mahalle adı bulma. Önce cihazın kendi servisi, olmazsa OpenStreetMap Nominatim.
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { LatLng } from './geo';

const cache = new Map<string, string>();

export async function neighborhoodName(p: LatLng): Promise<string> {
  const key = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  let name: string | null = null;
  if (Platform.OS !== 'web') {
    try {
      const [a] = await Location.reverseGeocodeAsync({ latitude: p.lat, longitude: p.lng });
      if (a) name = join(a.district, a.subregion ?? a.city);
    } catch {}
  }
  if (!name) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&accept-language=tr&lat=${p.lat}&lon=${p.lng}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'PatiRotasi/1.0' } });
      const j = await res.json();
      const a = j.address ?? {};
      name = join(a.suburb ?? a.neighbourhood ?? a.quarter ?? a.village, a.town ?? a.city_district ?? a.county ?? a.city);
    } catch {}
  }
  const result = name ?? 'Bilinmeyen Sokaklar';
  cache.set(key, result);
  return result;
}

function join(a?: string | null, b?: string | null) {
  const clean = (s?: string | null) => s?.replace(/ Mahallesi$/i, '').replace(/ Mah\.?$/i, '').trim();
  const x = clean(a);
  const y = clean(b);
  if (x && y && x !== y) return `${x}, ${y}`;
  return x || y || null;
}
