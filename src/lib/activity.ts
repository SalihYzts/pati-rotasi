// Hareket tarafı: günlük kayıtlar, antrenman modları, kalori/tempo, seri ve görevler.
import type { CatCard } from './cats';

export interface DayStats {
  steps: number;
  distanceM: number;
  cells: number;
  activeMs: number;
}

export const EMPTY_DAY: DayStats = { steps: 0, distanceM: 0, cells: 0, activeMs: 0 };

/** Yerel saate göre "2026-11-01". */
export function dayKey(t: number | Date = Date.now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Haftanın pazartesisi (yerel saat). */
export function weekStart(t: number | Date = Date.now()) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function lastDays(n: number, now = Date.now()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Antrenman modları

export type WalkMode = 'yuruyus' | 'tempolu' | 'kosu';

export const MODES: Record<WalkMode, { label: string; icon: 'walk' | 'speedometer' | 'flash'; met: number; stepLength: number }> = {
  yuruyus: { label: 'Yürüyüş', icon: 'walk', met: 3.5, stepLength: 0.74 },
  tempolu: { label: 'Tempolu', icon: 'speedometer', met: 5.0, stepLength: 0.82 },
  kosu: { label: 'Koşu', icon: 'flash', met: 9.0, stepLength: 1.1 },
};

/** Kalori ≈ MET × kilo (kg) × süre (saat). */
export function kcal(mode: WalkMode, weightKg: number, ms: number) {
  return Math.round(MODES[mode].met * weightKg * (ms / 3_600_000));
}

/** Adımdan kalori tahmini (gün boyu adımlar için): ~0,04 kcal/adım, 70 kg'a göre ölçeklenir. */
export function kcalFromSteps(steps: number, weightKg: number) {
  return Math.round(steps * 0.04 * (weightKg / 70));
}

/** Tempo "dk:sn /km" — mesafe çok kısaysa tire. */
export function pace(ms: number, distanceM: number) {
  if (distanceM < 50) return '–';
  const secPerKm = ms / 1000 / (distanceM / 1000);
  if (!isFinite(secPerKm) || secPerKm > 3600) return '–';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Seri: hedefin tutturulduğu ardışık günler. Bugün henüz tutmadıysa dünden geriye sayar.

export function streak(days: Record<string, DayStats>, goal: number, now = Date.now()) {
  let n = 0;
  const d = new Date(now);
  if ((days[dayKey(d)]?.steps ?? 0) < goal) d.setDate(d.getDate() - 1);
  while ((days[dayKey(d)]?.steps ?? 0) >= goal) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function bestStreak(days: Record<string, DayStats>, goal: number) {
  const keys = Object.keys(days).filter((k) => days[k].steps >= goal).sort();
  let best = 0;
  let cur = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const d = new Date(k + 'T12:00:00');
    cur = prev && Math.round((d.getTime() - prev.getTime()) / 86_400_000) === 1 ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Görevler

export interface QuestCtx {
  today: DayStats;
  week: DayStats;
  weekGoalDays: number;
  catsToday: number;
  newSpeciesToday: number;
}

export interface Quest {
  id: string;
  title: string;
  icon: 'footsteps' | 'navigate' | 'cloud-outline' | 'camera' | 'time' | 'sparkles' | 'flame' | 'trophy';
  goal: number;
  reward: number;
  value: (c: QuestCtx) => number;
  unit?: 'km' | 'dk';
}

const DAILY_POOL: Quest[] = [
  { id: 'adim-4000', title: '4.000 adım at', icon: 'footsteps', goal: 4000, reward: 15, value: (c) => c.today.steps },
  { id: 'adim-7000', title: '7.000 adım at', icon: 'footsteps', goal: 7000, reward: 30, value: (c) => c.today.steps },
  { id: 'adim-10000', title: '10.000 adım at', icon: 'footsteps', goal: 10000, reward: 50, value: (c) => c.today.steps },
  { id: 'km-2', title: '2 km yürü', icon: 'navigate', goal: 2000, reward: 20, value: (c) => c.today.distanceM, unit: 'km' },
  { id: 'km-4', title: '4 km yürü', icon: 'navigate', goal: 4000, reward: 35, value: (c) => c.today.distanceM, unit: 'km' },
  { id: 'sis-40', title: '40 sisli kare aç', icon: 'cloud-outline', goal: 40, reward: 20, value: (c) => c.today.cells },
  { id: 'sis-100', title: '100 sisli kare aç', icon: 'cloud-outline', goal: 100, reward: 40, value: (c) => c.today.cells },
  { id: 'kedi-1', title: '1 kedi yakala', icon: 'camera', goal: 1, reward: 15, value: (c) => c.catsToday },
  { id: 'kedi-3', title: '3 kedi yakala', icon: 'camera', goal: 3, reward: 35, value: (c) => c.catsToday },
  { id: 'aktif-20', title: '20 dakika aktif ol', icon: 'time', goal: 20, reward: 20, value: (c) => c.today.activeMs / 60_000, unit: 'dk' },
  { id: 'aktif-40', title: '40 dakika aktif ol', icon: 'time', goal: 40, reward: 40, value: (c) => c.today.activeMs / 60_000, unit: 'dk' },
  { id: 'tur-1', title: 'Yeni bir tür keşfet', icon: 'sparkles', goal: 1, reward: 30, value: (c) => c.newSpeciesToday },
];

export const WEEKLY: Quest[] = [
  { id: 'hafta-adim', title: 'Bu hafta 35.000 adım', icon: 'trophy', goal: 35000, reward: 100, value: (c) => c.week.steps },
  { id: 'hafta-hedef', title: 'Haftada 5 gün hedefini tuttur', icon: 'flame', goal: 5, reward: 80, value: (c) => c.weekGoalDays },
  { id: 'hafta-km', title: 'Bu hafta 20 km yürü', icon: 'navigate', goal: 20000, reward: 80, value: (c) => c.week.distanceM, unit: 'km' },
];

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Günün 3 görevi: biri adım, biri hareket (mesafe/süre/sis), biri kedi. Tarihe göre sabit. */
export function dailyQuests(day: string): Quest[] {
  const rnd = seeded(day);
  const pick = (ids: string[]) => {
    const id = ids[Math.floor(rnd() * ids.length)];
    return DAILY_POOL.find((q) => q.id === id)!;
  };
  return [
    pick(['adim-4000', 'adim-7000', 'adim-10000']),
    pick(['km-2', 'km-4', 'sis-40', 'sis-100', 'aktif-20', 'aktif-40']),
    pick(['kedi-1', 'kedi-3', 'tur-1']),
  ];
}

export function questCtx(days: Record<string, DayStats>, cats: CatCard[], goal: number, now = Date.now()): QuestCtx {
  const today = days[dayKey(now)] ?? EMPTY_DAY;
  const ws = weekStart(now);
  const week = { ...EMPTY_DAY };
  let weekGoalDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws);
    d.setDate(d.getDate() + i);
    const s = days[dayKey(d)];
    if (!s) continue;
    week.steps += s.steps;
    week.distanceM += s.distanceM;
    week.cells += s.cells;
    week.activeMs += s.activeMs;
    if (s.steps >= goal) weekGoalDays++;
  }
  const todayKey = dayKey(now);
  const catsToday = cats.filter((c) => dayKey(c.createdAt) === todayKey);
  const newSpeciesToday = catsToday.filter(
    (c) => !cats.some((o) => o.coat === c.coat && o.eyes === c.eyes && o.createdAt < c.createdAt && dayKey(o.createdAt) !== todayKey),
  );
  const speciesToday = new Set(newSpeciesToday.map((c) => c.coat + '/' + c.eyes)).size;
  return { today, week, weekGoalDays, catsToday: catsToday.length, newSpeciesToday: speciesToday };
}

export function claimKey(kind: 'g' | 'h', period: string, questId: string) {
  return `${kind}:${period}:${questId}`;
}
