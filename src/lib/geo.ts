// Sisli harita ızgarası ve mesafe hesapları.
// Dünya ~40 metrelik hücrelere bölünür; yürüdükçe çevrendeki hücreler "açılır".

export const CELL_LAT = 0.00036; // ~40 m
export const REVEAL_RADIUS_M = 60;

export interface LatLng {
  lat: number;
  lng: number;
}

function cellLng(lat: number) {
  return CELL_LAT / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
}

export function cellKey(lat: number, lng: number): string {
  const i = Math.floor(lat / CELL_LAT);
  const j = Math.floor(lng / cellLng(i * CELL_LAT));
  return `${i}:${j}`;
}

/** Hücre anahtarından hücrenin merkez koordinatı. */
export function cellCenter(key: string): LatLng {
  const [i, j] = key.split(':').map(Number);
  const lat = (i + 0.5) * CELL_LAT;
  return { lat, lng: (j + 0.5) * cellLng(i * CELL_LAT) };
}

/** Bir konumun çevresinde REVEAL_RADIUS_M içinde kalan tüm hücreler. */
export function cellsAround(p: LatLng, radiusM = REVEAL_RADIUS_M): string[] {
  const out: string[] = [];
  const dLat = radiusM / 111_320;
  const steps = Math.ceil(dLat / CELL_LAT);
  const ci = Math.floor(p.lat / CELL_LAT);
  for (let di = -steps; di <= steps; di++) {
    const i = ci + di;
    const lng = cellLng(i * CELL_LAT);
    const cj = Math.floor(p.lng / lng);
    for (let dj = -steps - 1; dj <= steps + 1; dj++) {
      const key = `${i}:${cj + dj}`;
      if (distanceM(p, cellCenter(key)) <= radiusM) out.push(key);
    }
  }
  return out;
}

export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Ortalama adım uzunluğu; pedometre yoksa mesafeden adım tahmini için. */
export const STEP_LENGTH_M = 0.74;

/** Bir hücre ~1600 m² → açılan alan (km²). */
export function areaKm2(cellCount: number) {
  return (cellCount * 40 * 40) / 1_000_000;
}
