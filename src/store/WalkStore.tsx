// Yürüyüş oturumu ve gün boyu adım sayımı.
// - Adım sayar, uygulama açıkken sürekli dinlenir (yürüyüş başlatılmasa da adımlar sayılır).
// - iPhone'da uygulama öne gelince günün adımları telefondan da okunur.
// - Yürüyüş/koşu oturumu konum takibi yapar, sisi açar, tempo ve kaloriyi hesaplar.
// Sekmeler arasında geçişte yürüyüş kesilmesin diye context olarak tutulur.
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState, Platform } from 'react-native';

import { MODES, kcal, type WalkMode } from '@/lib/activity';
import { cellsAround, distanceM, type LatLng } from '@/lib/geo';
import { useApp, type WalkLog } from './AppStore';

/** Konum alınamazsa haritanın açılacağı yer (Kadıköy, Moda). */
export const DEFAULT_CENTER: LatLng = { lat: 40.9862, lng: 29.0262 };

/** Demo yürüyüşte saat hızlandırılır ki tempo ve kalori gerçekçi görünsün. */
const DEMO_TIME_SCALE = 20;

export type PedometerStatus = 'checking' | 'unavailable' | 'needs-permission' | 'active';

interface WalkCtx {
  walking: boolean;
  demo: boolean;
  mode: WalkMode;
  position: LatLng | null;
  track: LatLng[];
  sessionSteps: number;
  sessionDistance: number;
  sessionCells: number;
  startedAt: number | null;
  /** Oturumun geçen süresi (ms); demoda hızlandırılmış. */
  elapsed: () => number;
  pedometer: PedometerStatus;
  error: string | null;
  start: (opts?: { demo?: boolean; mode?: WalkMode }) => Promise<void>;
  /** Yürüyüşü bitirir; kaydedilecek kadar uzunsa özeti döner. */
  stop: () => WalkLog | null;
  locate: () => Promise<LatLng | null>;
  enablePedometer: () => Promise<void>;
}

const WalkContext = createContext<WalkCtx | null>(null);

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function WalkProvider({ children }: { children: ReactNode }) {
  const app = useApp();
  const [walking, setWalking] = useState(false);
  const [demo, setDemo] = useState(false);
  const [mode, setMode] = useState<WalkMode>('yuruyus');
  const [position, setPosition] = useState<LatLng | null>(null);
  const [track, setTrack] = useState<LatLng[]>([]);
  const [sessionSteps, setSessionSteps] = useState(0);
  const [sessionDistance, setSessionDistance] = useState(0);
  const [sessionCells, setSessionCells] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pedometer, setPedometer] = useState<PedometerStatus>(Platform.OS === 'web' ? 'unavailable' : 'checking');
  const [error, setError] = useState<string | null>(null);

  const subs = useRef<{ remove: () => void }[]>([]);
  const last = useRef<LatLng | null>(null);
  const session = useRef({ walking: false, demo: false, mode: 'yuruyus' as WalkMode, startedAt: 0, pointsAtStart: 0 });
  const stats = useRef({ steps: 0, distance: 0, cells: 0 });
  const appRef = useRef(app);
  appRef.current = app;
  const pedometerRef = useRef(pedometer);
  pedometerRef.current = pedometer;
  // İzin verilince adım sayar aboneliğini yeniden kurmak için.
  const [pedoEpoch, setPedoEpoch] = useState(0);

  // ---- Gün boyu adım sayar --------------------------------------------------

  const syncIosSteps = useCallback(async () => {
    if (Platform.OS !== 'ios') return;
    try {
      const { steps } = await Pedometer.getStepCountAsync(startOfToday(), new Date());
      appRef.current.syncTodaySteps(steps);
    } catch {}
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;

    const subscribe = () => {
      if (sub) return;
      let lastCount = 0;
      sub = Pedometer.watchStepCount(({ steps }) => {
        const delta = steps - lastCount;
        lastCount = steps;
        if (delta <= 0) return;
        appRef.current.addSteps(delta, 0);
        if (session.current.walking && !session.current.demo) {
          stats.current.steps += delta;
          setSessionSteps(stats.current.steps);
        }
      });
    };
    const unsubscribe = () => {
      sub?.remove();
      sub = null;
    };

    (async () => {
      const available = await Pedometer.isAvailableAsync().catch(() => false);
      if (cancelled) return;
      if (!available) return setPedometer('unavailable');
      const perm = await Pedometer.getPermissionsAsync().catch(() => null);
      if (cancelled) return;
      if (!perm?.granted) return setPedometer('needs-permission');
      setPedometer('active');
      subscribe();
      syncIosSteps();
    })();

    const appStateSub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') {
        Pedometer.getPermissionsAsync()
          .then((p) => {
            if (p.granted) {
              setPedometer('active');
              subscribe();
              syncIosSteps();
            }
          })
          .catch(() => {});
      } else {
        unsubscribe();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
      appStateSub.remove();
    };
  }, [pedoEpoch, syncIosSteps]);

  const enablePedometer = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const p = await Pedometer.requestPermissionsAsync().catch(() => null);
    if (p?.granted) {
      setPedometer('checking');
      setPedoEpoch((n) => n + 1);
    }
  }, []);

  // ---- Yürüyüş oturumu ------------------------------------------------------

  const onPosition = useCallback((p: LatLng) => {
    const prev = last.current;
    let d = 0;
    if (prev) {
      d = distanceM(prev, p);
      if (d < 2) return; // GPS titremesi
    }
    last.current = p;
    setPosition(p);
    setTrack((t) => [...t, p]);
    appRef.current.setLastPosition(p);

    const opened = appRef.current.addCells(cellsAround(p));
    if (opened > 0) {
      const before = stats.current.cells;
      stats.current.cells += opened;
      setSessionCells(stats.current.cells);
      // Her 10 yeni karede bir hafif titreşim; her adımda titremesin.
      if (Math.floor(before / 10) !== Math.floor(stats.current.cells / 10)) Haptics.selectionAsync().catch(() => {});
    }
    if (d > 0 && d < 150) {
      stats.current.distance += d;
      setSessionDistance(stats.current.distance);
      // Adım sayar çalışıyorsa adımlar oradan gelir; yoksa mesafeden tahmin ederiz.
      const estimate = session.current.demo || pedometerRef.current !== 'active';
      if (estimate) {
        const steps = Math.round(d / MODES[session.current.mode].stepLength);
        stats.current.steps += steps;
        setSessionSteps(stats.current.steps);
        appRef.current.addSteps(steps, d);
      } else {
        appRef.current.addSteps(0, d);
      }
    }
  }, []);

  const elapsed = useCallback(() => {
    if (!session.current.walking) return 0;
    return (Date.now() - session.current.startedAt) * (session.current.demo ? DEMO_TIME_SCALE : 1);
  }, []);

  const locate = useCallback(async (): Promise<LatLng | null> => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return null;
      const loc =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const p = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setPosition(p);
      appRef.current.setLastPosition(p);
      return p;
    } catch {
      return null;
    }
  }, []);

  const stop = useCallback((): WalkLog | null => {
    subs.current.forEach((s) => s.remove());
    subs.current = [];
    const s = session.current;
    let log: WalkLog | null = null;
    if (s.walking) {
      const duration = elapsed();
      const st = appRef.current.state;
      const endedAt = s.startedAt + duration;
      log = {
        startedAt: s.startedAt,
        endedAt,
        steps: stats.current.steps,
        distanceM: stats.current.distance,
        newCells: stats.current.cells,
        mode: s.mode,
        kcal: kcal(s.mode, st.weightKg, duration),
        points: Math.max(0, st.points - s.pointsAtStart),
        cats: st.cats.filter((c) => c.createdAt >= s.startedAt).length,
      };
      // Çok kısa denemeleri kaydetme.
      if (duration >= 60_000 || stats.current.distance >= 50) appRef.current.logWalk(log);
      else log = null;
    }
    session.current.walking = false;
    setWalking(false);
    setDemo(false);
    return log;
  }, [elapsed]);

  const start = useCallback(
    async (opts?: { demo?: boolean; mode?: WalkMode }) => {
      setError(null);
      const m = opts?.mode ?? 'yuruyus';
      stats.current = { steps: 0, distance: 0, cells: 0 };
      setSessionSteps(0);
      setSessionDistance(0);
      setSessionCells(0);
      setTrack([]);
      setMode(m);
      last.current = null;

      const begin = (isDemo: boolean) => {
        const now = Date.now();
        session.current = { walking: true, demo: isDemo, mode: m, startedAt: now, pointsAtStart: appRef.current.state.points };
        setDemo(isDemo);
        setWalking(true);
        setStartedAt(now);
      };

      if (opts?.demo) {
        // Demo: gerçek konum yerine mahallede rastgele bir yürüyüş simüle eder.
        begin(true);
        const origin = appRef.current.state.lastPosition ?? position ?? DEFAULT_CENTER;
        let cur = { ...origin };
        let heading = Math.random() * Math.PI * 2;
        onPosition(cur);
        const tickMs = 600;
        // Saat 20 kat hızlı akıyor; tick başına mesafe modun gerçek hızına göre.
        const speed = { yuruyus: 1.3, tempolu: 1.8, kosu: 2.9 }[m];
        const stepM = speed * (tickMs / 1000) * DEMO_TIME_SCALE;
        const id = setInterval(() => {
          heading += (Math.random() - 0.5) * 0.9;
          cur = {
            lat: cur.lat + (Math.cos(heading) * stepM) / 111_320,
            lng: cur.lng + (Math.sin(heading) * stepM) / (111_320 * Math.cos((cur.lat * Math.PI) / 180)),
          };
          onPosition(cur);
        }, tickMs);
        subs.current.push({ remove: () => clearInterval(id) });
        return;
      }

      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setError('Sisi kaldırmak için konum izni gerekiyor. Ayarlardan izin verebilirsin.');
        return;
      }
      if (pedometerRef.current === 'needs-permission') await enablePedometer();

      try {
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 },
          (loc) => {
            if (loc.coords.accuracy && loc.coords.accuracy > 60) return;
            onPosition({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          },
        );
        subs.current.push(sub);
      } catch {
        setError('Konum alınamadı. GPS açık mı?');
        subs.current.forEach((s) => s.remove());
        subs.current = [];
        return;
      }
      begin(false);
    },
    [onPosition, position, enablePedometer],
  );

  useEffect(() => () => subs.current.forEach((s) => s.remove()), []);

  return (
    <WalkContext.Provider
      value={{
        walking,
        demo,
        mode,
        position,
        track,
        sessionSteps,
        sessionDistance,
        sessionCells,
        startedAt,
        elapsed,
        pedometer,
        error,
        start,
        stop,
        locate,
        enablePedometer,
      }}>
      {children}
    </WalkContext.Provider>
  );
}

export function useWalk() {
  const ctx = useContext(WalkContext);
  if (!ctx) throw new Error('useWalk, WalkProvider içinde kullanılmalı');
  return ctx;
}
