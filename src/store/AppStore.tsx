// Uygulamanın tüm kalıcı durumu: kediler, açılan sis hücreleri, adımlar, günlük kayıtlar, görevler, puanlar, rozetler.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { EMPTY_DAY, bestStreak, dayKey, type DayStats, type WalkMode } from '@/lib/activity';
import { earnedBadges, type BadgeId } from '@/lib/badges';
import { MEET_AGAIN_POINTS, RARITY, type CatCard } from '@/lib/cats';
import { STEPS_PER_POINT } from '@/data/shelters';

const KEY = 'pati-rotasi/state/v1';

export interface Donation {
  shelterId: string;
  points: number;
  at: number;
}

export interface WalkLog {
  startedAt: number;
  endedAt: number;
  steps: number;
  distanceM: number;
  newCells: number;
  mode?: WalkMode;
  kcal?: number;
  /** Bu yürüyüşte kazanılan mama puanı (adım + kedi). */
  points?: number;
  /** Yürüyüş sırasında yakalanan kedi sayısı. */
  cats?: number;
}

export interface AppState {
  onboarded: boolean;
  cats: CatCard[];
  cells: string[];
  totalSteps: number;
  /** Mama puanına çevrilmemiş artık adımlar (STEPS_PER_POINT altı). */
  stepRemainder: number;
  totalDistanceM: number;
  points: number;
  donatedPoints: number;
  donations: Donation[];
  walks: WalkLog[];
  badges: Partial<Record<BadgeId, number>>;
  musicOn: boolean;
  lastPosition?: { lat: number; lng: number };
  /** Günlük kayıtlar, anahtar "YYYY-AA-GG". */
  days: Record<string, DayStats>;
  /** Günlük adım hedefi. */
  goal: number;
  /** Kalori tahmini için kilo. */
  weightKg: number;
  /** Ödülü alınmış görevler (claimKey → zaman). */
  claimed: Record<string, number>;
}

const initialState: AppState = {
  onboarded: false,
  cats: [],
  cells: [],
  totalSteps: 0,
  stepRemainder: 0,
  totalDistanceM: 0,
  points: 0,
  donatedPoints: 0,
  donations: [],
  walks: [],
  badges: {},
  musicOn: false,
  days: {},
  goal: 6000,
  weightKg: 70,
  claimed: {},
};

interface Ctx {
  state: AppState;
  ready: boolean;
  /** Son eylemle yeni kazanılan rozetler (kutlama göstermek için, sırayla). */
  freshBadges: BadgeId[];
  /** Sıradaki kutlamayı kapatır. */
  clearFreshBadges: () => void;
  completeOnboarding: () => void;
  addCat: (cat: CatCard) => void;
  updateCat: (id: string, patch: Partial<CatCard>) => void;
  removeCat: (id: string) => void;
  /** Aynı kediyle tekrar karşılaşma: dostluk artar, günde bir kez puan verir. Kazanılan puanı döner. */
  meetAgain: (id: string) => number;
  addCells: (keys: string[]) => number;
  addSteps: (steps: number, distanceM: number) => void;
  /** iPhone'un kendi adım sayımı bizdekinden fazlaysa farkı ekler. */
  syncTodaySteps: (steps: number) => void;
  claimQuest: (key: string, reward: number) => void;
  setGoal: (goal: number) => void;
  setWeight: (kg: number) => void;
  logWalk: (w: WalkLog) => void;
  donate: (shelterId: string, points: number) => void;
  setMusic: (on: boolean) => void;
  setLastPosition: (p: { lat: number; lng: number }) => void;
  reset: () => void;
}

const AppContext = createContext<Ctx | null>(null);

function bumpDay(s: AppState, patch: Partial<DayStats>, t = Date.now()): Record<string, DayStats> {
  const k = dayKey(t);
  const d = s.days[k] ?? EMPTY_DAY;
  return {
    ...s.days,
    [k]: {
      steps: d.steps + (patch.steps ?? 0),
      distanceM: d.distanceM + (patch.distanceM ?? 0),
      cells: d.cells + (patch.cells ?? 0),
      activeMs: d.activeMs + (patch.activeMs ?? 0),
    },
  };
}

function stepsReducer(s: AppState, steps: number, distanceM: number): AppState {
  const pool = s.stepRemainder + steps;
  const gained = Math.floor(pool / STEPS_PER_POINT);
  return {
    ...s,
    totalSteps: s.totalSteps + steps,
    totalDistanceM: s.totalDistanceM + distanceM,
    stepRemainder: pool - gained * STEPS_PER_POINT,
    points: s.points + gained,
    days: bumpDay(s, { steps, distanceM }),
  };
}

function withBadges(next: AppState): { state: AppState; fresh: BadgeId[] } {
  const earned = earnedBadges({
    cats: next.cats,
    cellCount: next.cells.length,
    totalSteps: next.totalSteps,
    donatedPoints: next.donatedPoints,
    totalDistanceM: next.totalDistanceM,
    bestStreak: bestStreak(next.days, next.goal),
  });
  const fresh = earned.filter((id) => !next.badges[id]);
  if (!fresh.length) return { state: next, fresh };
  const badges = { ...next.badges };
  for (const id of fresh) badges[id] = Date.now();
  return { state: { ...next, badges }, fresh };
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const [freshBadges, setFreshBadges] = useState<BadgeId[]>([]);
  const cellSet = useRef(new Set<string>());

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const saved = { ...initialState, ...JSON.parse(raw) } as AppState;
          cellSet.current = new Set(saved.cells);
          setState(saved);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // Durum her değiştiğinde kısa bir gecikmeyle diske yaz.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [state, ready]);

  const apply = useCallback((fn: (s: AppState) => AppState) => {
    setState((prev) => {
      const { state: next, fresh } = withBadges(fn(prev));
      if (fresh.length) setFreshBadges((f) => [...new Set([...f, ...fresh])]);
      return next;
    });
  }, []);

  const addCells = useCallback(
    (keys: string[]) => {
      const added = keys.filter((k) => !cellSet.current.has(k));
      if (!added.length) return 0;
      for (const k of added) cellSet.current.add(k);
      apply((s) => ({ ...s, cells: [...s.cells, ...added], days: bumpDay(s, { cells: added.length }) }));
      return added.length;
    },
    [apply],
  );

  const value = useMemo<Ctx>(
    () => ({
      state,
      ready,
      freshBadges,
      clearFreshBadges: () => setFreshBadges((f) => f.slice(1)),
      completeOnboarding: () => apply((s) => ({ ...s, onboarded: true })),
      addCat: (cat) => apply((s) => ({ ...s, cats: [{ encounters: 1, lastSeenAt: cat.createdAt, ...cat }, ...s.cats], points: s.points + RARITY[cat.rarity].points })),
      updateCat: (id, patch) => apply((s) => ({ ...s, cats: s.cats.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeCat: (id) => apply((s) => ({ ...s, cats: s.cats.filter((c) => c.id !== id) })),
      meetAgain: (id) => {
        const cat = state.cats.find((c) => c.id === id);
        if (!cat) return 0;
        const sameDay = cat.lastSeenAt != null && new Date(cat.lastSeenAt).toDateString() === new Date().toDateString();
        const gained = sameDay ? 0 : MEET_AGAIN_POINTS;
        apply((s) => ({
          ...s,
          points: s.points + gained,
          cats: s.cats.map((c) => (c.id === id ? { ...c, encounters: (c.encounters ?? 1) + 1, lastSeenAt: Date.now() } : c)),
        }));
        return gained;
      },
      addCells,
      addSteps: (steps, distanceM) => apply((s) => stepsReducer(s, steps, distanceM)),
      syncTodaySteps: (steps) =>
        apply((s) => {
          const diff = steps - (s.days[dayKey()]?.steps ?? 0);
          return diff > 0 ? stepsReducer(s, diff, 0) : s;
        }),
      claimQuest: (key, reward) =>
        apply((s) => (s.claimed[key] ? s : { ...s, claimed: { ...s.claimed, [key]: Date.now() }, points: s.points + reward })),
      setGoal: (goal) => apply((s) => ({ ...s, goal })),
      setWeight: (kg) => apply((s) => ({ ...s, weightKg: kg })),
      logWalk: (w) =>
        apply((s) => ({
          ...s,
          walks: [w, ...s.walks].slice(0, 50),
          days: bumpDay(s, { activeMs: w.endedAt - w.startedAt }, w.startedAt),
        })),
      donate: (shelterId, points) =>
        apply((s) => {
          const p = Math.min(points, s.points);
          if (p <= 0) return s;
          return {
            ...s,
            points: s.points - p,
            donatedPoints: s.donatedPoints + p,
            donations: [{ shelterId, points: p, at: Date.now() }, ...s.donations],
          };
        }),
      setMusic: (on) => apply((s) => ({ ...s, musicOn: on })),
      setLastPosition: (p) => setState((s) => ({ ...s, lastPosition: p })),
      reset: () => {
        cellSet.current = new Set();
        setState({ ...initialState, onboarded: true });
      },
    }),
    [state, ready, freshBadges, apply, addCells],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp, AppStoreProvider içinde kullanılmalı');
  return ctx;
}
