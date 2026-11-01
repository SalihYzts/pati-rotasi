// Rozetler ve mahalle albümü kuralları.
import { COATS, type CatCard, type Coat } from './cats';

export type BadgeId = 'ilk-kedi' | 'kasif' | 'nadir-avcisi' | 'yuruyucu' | 'seri' | 'maraton' | 'muhtar' | 'hayirsever';

export interface BadgeDef {
  id: BadgeId;
  title: string;
  desc: string;
  image: number;
}

export interface Progress {
  cats: CatCard[];
  cellCount: number;
  totalSteps: number;
  donatedPoints: number;
  totalDistanceM: number;
  bestStreak: number;
}

export const BADGES: BadgeDef[] = [
  { id: 'ilk-kedi', title: 'İlk Miyav', desc: 'İlk kedi kartını topla.', image: require('../../assets/img/badge_first.png') },
  { id: 'kasif', title: 'Sis Avcısı', desc: 'Haritada 150 sisli kareyi aç.', image: require('../../assets/img/badge_explorer.png') },
  { id: 'nadir-avcisi', title: 'Nadir Avcısı', desc: 'Nadir ya da daha üstü bir kedi bul.', image: require('../../assets/img/badge_rare.png') },
  { id: 'yuruyucu', title: 'Patiler Yolda', desc: 'Toplam 10.000 adım at.', image: require('../../assets/img/badge_walker.png') },
  { id: 'seri', title: 'Ateşli Patiler', desc: '7 gün üst üste günlük adım hedefini tuttur.', image: require('../../assets/img/badge_streak.png') },
  { id: 'maraton', title: 'Maraton Kedisi', desc: 'Toplam 42,2 km yürü.', image: require('../../assets/img/badge_marathon.png') },
  { id: 'muhtar', title: 'Mahalle Muhtarı', desc: 'Bir mahalle albümünün 8 desenini tamamla.', image: require('../../assets/img/badge_neighborhood.png') },
  { id: 'hayirsever', title: 'Mama Meleği', desc: 'Mama puanlarını ilk kez barınağa bağışla.', image: require('../../assets/img/badge_donor.png') },
];

export function badgeProgress(id: BadgeId, p: Progress): { value: number; goal: number } {
  switch (id) {
    case 'ilk-kedi':
      return { value: Math.min(p.cats.length, 1), goal: 1 };
    case 'kasif':
      return { value: Math.min(p.cellCount, 150), goal: 150 };
    case 'nadir-avcisi':
      return { value: p.cats.some((c) => c.rarity !== 'siradan') ? 1 : 0, goal: 1 };
    case 'yuruyucu':
      return { value: Math.min(p.totalSteps, 10_000), goal: 10_000 };
    case 'seri':
      return { value: Math.min(p.bestStreak, 7), goal: 7 };
    case 'maraton':
      return { value: Math.min(Math.round(p.totalDistanceM / 100) / 10, 42.2), goal: 42.2 };
    case 'muhtar': {
      const best = Math.max(0, ...albums(p.cats).map((a) => a.found.size));
      return { value: best, goal: COATS.length };
    }
    case 'hayirsever':
      return { value: p.donatedPoints > 0 ? 1 : 0, goal: 1 };
  }
}

export function earnedBadges(p: Progress): BadgeId[] {
  return BADGES.filter((b) => {
    const { value, goal } = badgeProgress(b.id, p);
    return value >= goal;
  }).map((b) => b.id);
}

export interface Album {
  neighborhood: string;
  cats: CatCard[];
  found: Map<Coat, CatCard>;
  complete: boolean;
}

/** Her mahallenin albümünde 8 desen yuvası var; o mahallede bulduğun her desen bir yuvayı doldurur. */
export function albums(cats: CatCard[]): Album[] {
  const by = new Map<string, CatCard[]>();
  for (const c of cats) {
    const list = by.get(c.neighborhood) ?? [];
    list.push(c);
    by.set(c.neighborhood, list);
  }
  return [...by.entries()]
    .map(([neighborhood, list]) => {
      const found = new Map<Coat, CatCard>();
      for (const c of [...list].sort((a, b) => a.createdAt - b.createdAt)) if (!found.has(c.coat)) found.set(c.coat, c);
      return { neighborhood, cats: list, found, complete: found.size === COATS.length };
    })
    .sort((a, b) => b.found.size - a.found.size);
}
