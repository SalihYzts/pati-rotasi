// Bağış ortakları. Şimdilik pilot için örnek kayıtlar; gerçek barınak
// anlaşmaları yapıldığında bu liste sunucudan gelecek.

export interface Shelter {
  id: string;
  name: string;
  city: string;
  cats: number;
  goal: number; // bu ayki mama hedefi (kap)
  raised: number; // topluluktan toplanan (kap)
  blurb: string;
}

export const SHELTERS: Shelter[] = [
  {
    id: 'moda-patiler',
    name: 'Moda Patiler Derneği',
    city: 'İstanbul · Kadıköy',
    cats: 140,
    goal: 6000,
    raised: 3820,
    blurb: 'Sahildeki koloni kedilerine her gün mama ve su taşıyan gönüllüler.',
  },
  {
    id: 'kordon-dostlari',
    name: 'Kordon Sokak Dostları',
    city: 'İzmir · Alsancak',
    cats: 95,
    goal: 4000,
    raised: 1710,
    blurb: 'Kısırlaştırma ve kış barınağı projeleri yürüten küçük bir ekip.',
  },
  {
    id: 'kale-kedileri',
    name: 'Kale Kedileri Evi',
    city: 'Ankara · Altındağ',
    cats: 60,
    goal: 2500,
    raised: 2240,
    blurb: 'Yaşlı ve engelli kedilere kalıcı yuva sağlayan barınak.',
  },
];

/** 100 mama puanı = 1 kap (~100 g) mama. */
export const POINTS_PER_BOWL = 100;
/** 100 adım = 1 mama puanı. */
export const STEPS_PER_POINT = 100;
