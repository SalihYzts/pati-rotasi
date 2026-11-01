// Kedi kartlarının veri modeli, nadirlik kuralları ve isim üretici.

export type Coat =
  | 'tekir'
  | 'sarman'
  | 'uc-renkli'
  | 'kaplumbaga'
  | 'siyah'
  | 'beyaz'
  | 'smokin'
  | 'gri';

export type Eyes = 'sari' | 'yesil' | 'mavi' | 'ayrik';

export type Rarity = 'siradan' | 'nadir' | 'cok-nadir' | 'efsanevi';

export interface CatCard {
  id: string;
  name: string;
  photoUri: string;
  coat: Coat;
  eyes: Eyes;
  earTipped: boolean; // kısırlaştırılmış (kulak ucu kesik)
  note?: string;
  lat?: number;
  lng?: number;
  neighborhood: string;
  createdAt: number;
  rarity: Rarity;
  /** Kaç kez karşılaşıldı (ilk yakalama dahil). */
  encounters?: number;
  lastSeenAt?: number;
}

export const COATS: { key: Coat; label: string; swatch: string[] }[] = [
  { key: 'tekir', label: 'Tekir', swatch: ['#8B7B6B', '#4A3F35'] },
  { key: 'sarman', label: 'Sarman', swatch: ['#F0A04B', '#C9671F'] },
  { key: 'uc-renkli', label: 'Üç Renkli', swatch: ['#FFFFFF', '#F0A04B', '#2B2B2B'] },
  { key: 'kaplumbaga', label: 'Kaplumbağa', swatch: ['#3B2A20', '#B5651D'] },
  { key: 'siyah', label: 'Siyah', swatch: ['#1F1B24'] },
  { key: 'beyaz', label: 'Beyaz', swatch: ['#FAFAF5'] },
  { key: 'smokin', label: 'Smokin', swatch: ['#1F1B24', '#FFFFFF'] },
  { key: 'gri', label: 'Gri', swatch: ['#9AA0A6'] },
];

export const EYES: { key: Eyes; label: string; color: string }[] = [
  { key: 'sari', label: 'Sarı / Bal', color: '#E9B949' },
  { key: 'yesil', label: 'Yeşil', color: '#6BAA5B' },
  { key: 'mavi', label: 'Mavi', color: '#4A9BE8' },
  { key: 'ayrik', label: 'Ayrık (iki renk)', color: '#8E6CEF' },
];

export const RARITY: Record<Rarity, { label: string; color: string; points: number; stars: number }> = {
  siradan: { label: 'Sıradan', color: '#8C7A6B', points: 10, stars: 1 },
  nadir: { label: 'Nadir', color: '#2E8B85', points: 30, stars: 2 },
  'cok-nadir': { label: 'Çok Nadir', color: '#7B4FD6', points: 60, stars: 3 },
  efsanevi: { label: 'Efsanevi', color: '#D9A21B', points: 120, stars: 4 },
};

/**
 * Nadirlik kuralları:
 * - Üç renkli / kaplumbağa desen veya mavi göz → en az Nadir
 * - Beyaz + mavi göz, ya da üç renkli + mavi göz → Çok Nadir
 * - Ayrık göz (heterokromi) → Efsanevi
 * - Üç renkli + ayrık göz gibi kombinasyonlar zaten Efsanevi
 */
export function computeRarity(coat: Coat, eyes: Eyes): Rarity {
  if (eyes === 'ayrik') return 'efsanevi';
  const patterned = coat === 'uc-renkli' || coat === 'kaplumbaga';
  const blue = eyes === 'mavi';
  if (blue && (coat === 'beyaz' || patterned)) return 'cok-nadir';
  if (blue || patterned) return 'nadir';
  return 'siradan';
}

const NAME_START = ['Pamuk', 'Boncuk', 'Duman', 'Tarçın', 'Fındık', 'Zeytin', 'Lokum', 'Şeker', 'Paşa', 'Mırmır', 'Simit', 'Kömür', 'Bulut', 'Karamel', 'Minnoş', 'Reis'];
const NAME_END = ['', '', '', ' Hanım', ' Bey', ' Efendi', ' Sultan', ' Kaptan'];
const COAT_NAMES: Partial<Record<Coat, string[]>> = {
  siyah: ['Kömür', 'Gece', 'Zeytin', 'Mürekkep'],
  beyaz: ['Pamuk', 'Kar', 'Bulut', 'Süt'],
  sarman: ['Tarçın', 'Karamel', 'Portakal', 'Ballı'],
  gri: ['Duman', 'Füme', 'Kül'],
  smokin: ['Frak', 'Piyano', 'Domino'],
  'uc-renkli': ['Alaca', 'Kırkyama', 'Benekli'],
};

export function suggestName(coat: Coat): string {
  const pool = COAT_NAMES[coat] ?? NAME_START;
  const base = Math.random() < 0.7 ? pool[Math.floor(Math.random() * pool.length)] : NAME_START[Math.floor(Math.random() * NAME_START.length)];
  return base + NAME_END[Math.floor(Math.random() * NAME_END.length)];
}

export function coatLabel(coat: Coat) {
  return COATS.find((c) => c.key === coat)?.label ?? coat;
}

export function eyesLabel(eyes: Eyes) {
  return EYES.find((e) => e.key === eyes)?.label ?? eyes;
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------------------------------------------------------------------------
// Kedidex: 8 desen × 4 göz = 32 numaralı tür. Pokédex gibi, bulunmayanlar "?".

const COAT_SPECIES: Record<Coat, string> = {
  tekir: 'Tekir',
  sarman: 'Sarman',
  'uc-renkli': 'Alaca',
  kaplumbaga: 'Kaplumbağa',
  siyah: 'Kara',
  beyaz: 'Ak',
  smokin: 'Smokin',
  gri: 'Duman',
};

const EYE_SPECIES: Record<Eyes, string> = {
  sari: 'Bal Gözlü',
  yesil: 'Zümrüt Gözlü',
  mavi: 'Gök Gözlü',
  ayrik: 'Ayrık Gözlü',
};

export interface Species {
  no: number;
  coat: Coat;
  eyes: Eyes;
  name: string;
  rarity: Rarity;
}

export const SPECIES: Species[] = COATS.flatMap((c, ci) =>
  EYES.map((e, ei) => ({
    no: ci * EYES.length + ei + 1,
    coat: c.key,
    eyes: e.key,
    name: `${EYE_SPECIES[e.key]} ${COAT_SPECIES[c.key]}`,
    rarity: computeRarity(c.key, e.key),
  })),
);

export function speciesOf(cat: Pick<CatCard, 'coat' | 'eyes'>): Species {
  return SPECIES.find((s) => s.coat === cat.coat && s.eyes === cat.eyes)!;
}

export function dexNo(n: number) {
  return '#' + String(n).padStart(3, '0');
}

// ---------------------------------------------------------------------------
// İstatistikler: her kedinin kimliğinden türetilir (kayıt gerektirmez), nadirlik taban değeri yükseltir.

export const STAT_LABELS = [
  { key: 'sevimlilik', label: 'Sevimlilik', color: '#E8743B' },
  { key: 'ceviklik', label: 'Çeviklik', color: '#2E8B85' },
  { key: 'uykuculuk', label: 'Uykuculuk', color: '#7B4FD6' },
  { key: 'cesaret', label: 'Cesaret', color: '#D9A21B' },
] as const;

export type StatKey = (typeof STAT_LABELS)[number]['key'];

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function catStats(cat: Pick<CatCard, 'id' | 'rarity' | 'encounters'>): Record<StatKey, number> {
  const base = { siradan: 20, nadir: 35, 'cok-nadir': 48, efsanevi: 60 }[cat.rarity];
  const bond = Math.min(15, ((cat.encounters ?? 1) - 1) * 2); // dostluk istatistikleri biraz yükseltir
  const out = {} as Record<StatKey, number>;
  STAT_LABELS.forEach((s, i) => {
    const r = hash(cat.id + ':' + s.key + i) % 41; // 0–40
    out[s.key] = Math.min(100, base + r + bond);
  });
  return out;
}

export function power(stats: Record<StatKey, number>) {
  return Object.values(stats).reduce((a, b) => a + b, 0);
}

// ---------------------------------------------------------------------------
// Dostluk: aynı kediyle tekrar karşılaşınca artar.

export const FRIENDSHIP = [
  { min: 1, label: 'Yeni tanışık', hearts: 1 },
  { min: 3, label: 'Dost', hearts: 2 },
  { min: 6, label: 'Can dostu', hearts: 3 },
  { min: 10, label: 'Mahallenin efsanesi', hearts: 4 },
];

export function friendship(encounters = 1) {
  return [...FRIENDSHIP].reverse().find((f) => encounters >= f.min)!;
}

/** Tekrar karşılaşmada kazanılan mama puanı (günde bir kez). */
export const MEET_AGAIN_POINTS = 5;

/** Ünlü uyumuna göre soru eki: "Pamuk mu?", "Ballı Bey mi?", "Kömür mü?". */
export function questionParticle(word: string) {
  const v = [...word.toLocaleLowerCase('tr-TR')].reverse().find((ch) => 'aıoueiöü'.includes(ch));
  if (v === 'a' || v === 'ı') return 'mı';
  if (v === 'o' || v === 'u') return 'mu';
  if (v === 'ö' || v === 'ü') return 'mü';
  return 'mi';
}
