// Ana ekran: sisli harita ve yürüyüş kontrolü.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FogMap from '@/components/FogMap';
import type { FogMapData } from '@/components/fogMapHtml';
import { Button, fmt } from '@/components/ui';
import { MODES, dayKey, kcal, pace, type WalkMode } from '@/lib/activity';
import { RARITY } from '@/lib/cats';
import { cellCenter } from '@/lib/geo';
import { useApp } from '@/store/AppStore';
import { DEFAULT_CENTER, useWalk } from '@/store/WalkStore';
import { C, F, shadow } from '@/theme';

const SHOW_DEMO = __DEV__ || Platform.OS === 'web';

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const walk = useWalk();
  const [recenter, setRecenter] = useState(0);
  const [, setTick] = useState(0);
  const [mode, setMode] = useState<WalkMode>('yuruyus');
  const today = state.days[dayKey()]?.steps ?? 0;

  useEffect(() => {
    if (!walk.position && !state.lastPosition) walk.locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!walk.walking) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [walk.walking]);

  const cells = useMemo(() => state.cells.map((k) => {
    const c = cellCenter(k);
    return [c.lat, c.lng] as [number, number];
  }), [state.cells]);

  const position = walk.position ?? state.lastPosition ?? null;
  const data = useMemo<FogMapData>(
    () => ({
      center: position ?? DEFAULT_CENTER,
      position,
      cells,
      track: walk.track.map((p) => [p.lat, p.lng] as [number, number]),
      cats: state.cats
        .filter((c) => c.lat != null && c.lng != null)
        .map((c) => ({ id: c.id, lat: c.lat!, lng: c.lng!, color: RARITY[c.rarity].color })),
      follow: walk.walking,
      recenter,
    }),
    [position, cells, walk.track, walk.walking, state.cats, recenter],
  );

  return (
    <View style={styles.root}>
      <FogMap data={data} onCatPress={(id) => router.navigate({ pathname: '/kedi/[id]', params: { id } })} />

      <View style={[styles.top, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <View style={styles.hud}>
          <Pressable style={styles.hudItem} onPress={() => router.navigate('/hareket')}>
            <Text style={styles.hudValue}>{fmt.int(today)}</Text>
            <Text style={styles.hudLabel}>/ {fmt.int(state.goal)} adım</Text>
            <View style={styles.hudTrack}>
              <View style={[styles.hudFill, { width: `${Math.min(100, (today / state.goal) * 100)}%` }]} />
            </View>
          </Pressable>
          <View style={styles.sep} />
          <View style={styles.hudItem}>
            <Text style={styles.hudValue}>{state.cats.length}</Text>
            <Text style={styles.hudLabel}>kedi</Text>
          </View>
          <View style={styles.sep} />
          <View style={styles.hudItem}>
            <Text style={[styles.hudValue, { color: C.primary }]}>{fmt.int(state.points)}</Text>
            <Text style={styles.hudLabel}>mama puanı</Text>
          </View>
        </View>
        {walk.error && (
          <View style={styles.error}>
            <Ionicons name="alert-circle" size={18} color="#fff" />
            <Text style={styles.errorText}>{walk.error}</Text>
          </View>
        )}
      </View>

      <Pressable
        accessibilityLabel="Konumuma git"
        style={[styles.locBtn, shadow, { bottom: walk.walking ? 290 : 200 }]}
        onPress={async () => {
          if (!walk.position) await walk.locate();
          setRecenter((n) => n + 1);
        }}>
        <Ionicons name="locate" size={22} color={C.ink} />
      </Pressable>

      <View style={[styles.bottom, { paddingBottom: 14 }]} pointerEvents="box-none">
        {walk.walking ? (
          <View style={[styles.panel, shadow]}>
            <View style={styles.panelHead}>
              <View style={styles.live} />
              <Ionicons name={MODES[walk.mode].icon} size={18} color={C.ink} />
              <Text style={styles.panelTitle}>
                {MODES[walk.mode].label}
                {walk.demo ? ' (demo)' : ''}
              </Text>
              <Text style={styles.timer}>{fmt.duration(walk.elapsed())}</Text>
            </View>
            <View style={styles.panelStats}>
              <Metric value={fmt.int(walk.sessionSteps)} label={walk.pedometer === 'active' && !walk.demo ? 'adım' : 'adım (tahmini)'} />
              <Metric value={fmt.km(walk.sessionDistance)} label="mesafe" />
              <Metric value={pace(walk.elapsed(), walk.sessionDistance)} label="dk/km" />
              <Metric value={String(kcal(walk.mode, state.weightKg, walk.elapsed()))} label="kcal" />
            </View>
            <Text style={styles.cellsLine}>☁️ +{walk.sessionCells} sisli kare açıldı</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Kedi gördüm!" icon="camera" onPress={() => router.navigate('/yeni-kedi')} style={{ flex: 1 }} />
              <Button
                title="Bitir"
                variant="dark"
                onPress={() => {
                  const log = walk.stop();
                  if (log) router.navigate('/yuruyus-ozeti');
                }}
              />
            </View>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <View style={styles.modes}>
              {(Object.keys(MODES) as WalkMode[]).map((m) => (
                <Pressable key={m} onPress={() => setMode(m)} style={[styles.mode, mode === m && styles.modeOn]}>
                  <Ionicons name={MODES[m].icon} size={15} color={mode === m ? '#fff' : C.ink} />
                  <Text style={[styles.modeText, mode === m && { color: '#fff' }]}>{MODES[m].label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                title={mode === 'kosu' ? 'Koşuya başla' : 'Yürüyüşe çık'}
                icon={MODES[mode].icon}
                onPress={() => walk.start({ mode })}
                style={{ flex: 1 }}
              />
              <Pressable accessibilityLabel="Kedi ekle" style={[styles.camBtn, shadow]} onPress={() => router.navigate('/yeni-kedi')}>
                <Ionicons name="camera" size={26} color="#fff" />
              </Pressable>
            </View>
            {SHOW_DEMO && (
              <Pressable onPress={() => walk.start({ demo: true, mode })} style={styles.demo}>
                <Text style={styles.demoText}>Konum yok mu? Demo yürüyüşü başlat</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  top: { position: 'absolute', left: 16, right: 16, top: 0, gap: 8 },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,251,245,0.96)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 8,
    ...shadow,
  },
  hudItem: { flex: 1, alignItems: 'center' },
  hudValue: { fontFamily: F.display, fontSize: 20, color: C.ink },
  hudLabel: { fontFamily: F.body, fontSize: 11, color: C.inkSoft },
  sep: { width: 1, height: 28, backgroundColor: C.line },
  hudTrack: { width: '70%', height: 4, borderRadius: 2, backgroundColor: C.cream, marginTop: 3, overflow: 'hidden' },
  hudFill: { height: '100%', backgroundColor: C.primary, borderRadius: 2 },
  modes: { flexDirection: 'row', alignSelf: 'center', backgroundColor: 'rgba(255,251,245,0.96)', borderRadius: 14, padding: 4, gap: 4, ...shadow },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 11 },
  modeOn: { backgroundColor: C.ink },
  modeText: { fontFamily: F.bodyBold, fontSize: 13, color: C.ink },
  cellsLine: { fontFamily: F.bodyBold, fontSize: 12, color: C.inkSoft, textAlign: 'center', marginTop: -6 },
  error: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: C.danger, borderRadius: 14, padding: 10 },
  errorText: { flex: 1, color: '#fff', fontFamily: F.bodyBold, fontSize: 13 },
  locBtn: {
    position: 'absolute',
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFBF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 0 },
  camBtn: { width: 56, height: 52, borderRadius: 18, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center' },
  demo: { alignSelf: 'center', backgroundColor: 'rgba(255,251,245,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  demoText: { fontFamily: F.bodyBold, fontSize: 12, color: C.inkSoft },
  panel: { backgroundColor: '#FFFBF5', borderRadius: 24, padding: 16, gap: 14 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  live: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  panelTitle: { flex: 1, fontFamily: F.displayMed, fontSize: 18, color: C.ink },
  timer: { fontFamily: F.display, fontSize: 18, color: C.inkSoft, fontVariant: ['tabular-nums'] },
  panelStats: { flexDirection: 'row' },
  metricValue: { fontFamily: F.display, fontSize: 20, color: C.ink, fontVariant: ['tabular-nums'] },
  metricLabel: { fontFamily: F.body, fontSize: 12, color: C.inkSoft },
});
