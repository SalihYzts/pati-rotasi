// Hareket: günlük hedef, seri, haftalık grafik, görevler, rekorlar ve ayarlar.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoalRing, WeekChart } from '@/components/ActivityCharts';
import { Button, Card, ProgressBar, Title, fmt } from '@/components/ui';
import {
  EMPTY_DAY,
  MODES,
  WEEKLY,
  bestStreak,
  claimKey,
  dailyQuests,
  dayKey,
  kcalFromSteps,
  lastDays,
  questCtx,
  streak,
  weekStart,
  type Quest,
  type WalkMode,
} from '@/lib/activity';
import { useApp } from '@/store/AppStore';
import { useWalk } from '@/store/WalkStore';
import { C, F } from '@/theme';

export default function ActivityScreen() {
  const { state, claimQuest, setGoal, setWeight } = useApp();
  const walk = useWalk();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const todayKey = dayKey();
  const today = state.days[todayKey] ?? EMPTY_DAY;
  const ctx = questCtx(state.days, state.cats, state.goal);
  const curStreak = streak(state.days, state.goal);
  const best = bestStreak(state.days, state.goal);
  const week = lastDays(7).map((k) => ({ key: k, steps: state.days[k]?.steps ?? 0 }));
  const weekKey = dayKey(weekStart());

  const bestDay = Object.entries(state.days).reduce((a, [k, d]) => (d.steps > a.steps ? { key: k, steps: d.steps } : a), { key: '', steps: 0 });
  const longest = state.walks.reduce((a, w) => (w.distanceM > a ? w.distanceM : a), 0);

  function startWalk(mode: WalkMode) {
    walk.start({ mode });
    router.navigate('/');
  }

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <Title sub={new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}>Hareket</Title>

      <Card style={styles.hero}>
        <GoalRing value={today.steps} goal={state.goal} />
        <View style={styles.heroStats}>
          <MiniStat icon="navigate" value={fmt.km(today.distanceM)} label="mesafe" />
          <MiniStat icon="flame" value={`${kcalFromSteps(today.steps, state.weightKg)}`} label="kcal" />
          <MiniStat icon="time" value={`${Math.round(today.activeMs / 60_000)}`} label="aktif dk" />
        </View>
        <View style={styles.streak}>
          <Text style={styles.streakFire}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>{curStreak > 0 ? `${curStreak} günlük seri` : 'Seri başlat'}</Text>
            <Text style={styles.streakSub}>
              {today.steps >= state.goal
                ? 'Bugünkü hedef tamam, seri devam ediyor!'
                : `Seriyi sürdürmek için bugün ${fmt.int(state.goal - today.steps)} adım daha.`}
            </Text>
          </View>
          <Text style={styles.streakBest}>en iyi {best}</Text>
        </View>
      </Card>

      {walk.pedometer === 'needs-permission' && (
        <Card style={styles.notice}>
          <Ionicons name="footsteps" size={22} color={C.primary} />
          <Text style={styles.noticeText}>Gün boyu adımlarını saymak için hareket iznine ihtiyacımız var.</Text>
          <Button title="İzin ver" onPress={walk.enablePedometer} style={{ minHeight: 40, paddingHorizontal: 14 }} />
        </Card>
      )}
      {walk.pedometer === 'unavailable' && (
        <Card style={styles.notice}>
          <Ionicons name="information-circle" size={22} color={C.teal} />
          <Text style={styles.noticeText}>
            {Platform.OS === 'web'
              ? 'Tarayıcıda adım sayar yok; adımlar yürüyüş sırasında mesafeden tahmin edilir.'
              : 'Bu cihazda adım sayar bulunamadı; adımlar yürüyüş sırasında mesafeden tahmin edilir.'}
          </Text>
        </Card>
      )}

      <View style={styles.startRow}>
        {(Object.keys(MODES) as WalkMode[]).map((m) => (
          <Pressable key={m} style={styles.startBtn} onPress={() => startWalk(m)} disabled={walk.walking}>
            <Ionicons name={MODES[m].icon} size={22} color={m === 'kosu' ? C.danger : m === 'tempolu' ? C.teal : C.primary} />
            <Text style={styles.startText}>{MODES[m].label}</Text>
          </Pressable>
        ))}
      </View>
      {walk.walking && <Text style={styles.walkingNote}>Şu an bir {MODES[walk.mode].label.toLocaleLowerCase('tr-TR')} sürüyor, haritadan takip edebilirsin.</Text>}

      <Text style={styles.section}>Son 7 gün</Text>
      <Card>
        <WeekChart days={week} goal={state.goal} />
      </Card>

      <Text style={styles.section}>Günlük görevler</Text>
      <Card style={{ gap: 14 }}>
        {dailyQuests(todayKey).map((q) => (
          <QuestRow key={q.id} q={q} value={q.value(ctx)} claimKeyStr={claimKey('g', todayKey, q.id)} claimed={state.claimed} onClaim={claimQuest} />
        ))}
      </Card>

      <Text style={styles.section}>Haftalık meydan okuma</Text>
      <Card style={{ gap: 14 }}>
        {WEEKLY.map((q) => (
          <QuestRow key={q.id} q={q} value={q.value(ctx)} claimKeyStr={claimKey('h', weekKey, q.id)} claimed={state.claimed} onClaim={claimQuest} />
        ))}
      </Card>

      <Text style={styles.section}>Rekorların</Text>
      <View style={styles.records}>
        <Record icon="trophy" value={fmt.int(bestDay.steps)} label="en çok adım (gün)" />
        <Record icon="map" value={fmt.km(longest)} label="en uzun yürüyüş" />
        <Record icon="flame" value={`${best} gün`} label="en uzun seri" />
        <Record icon="earth" value={fmt.km(state.totalDistanceM)} label="toplam mesafe" />
      </View>

      <Text style={styles.section}>Ayarlar</Text>
      <Card style={{ gap: 14 }}>
        <Stepper label="Günlük adım hedefi" value={`${fmt.int(state.goal)} adım`} onMinus={() => setGoal(Math.max(2000, state.goal - 1000))} onPlus={() => setGoal(Math.min(25000, state.goal + 1000))} />
        <Stepper label="Kilo (kalori için)" value={`${state.weightKg} kg`} onMinus={() => setWeight(Math.max(30, state.weightKg - 1))} onPlus={() => setWeight(Math.min(200, state.weightKg + 1))} />
      </Card>
      <Text style={styles.foot}>Kalori ve mesafe tahminidir; tıbbi ölçüm yerine geçmez.</Text>
    </ScrollView>
  );
}

type IconName = ComponentProps<typeof Ionicons>['name'];

function MiniStat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={styles.mini}>
      <Ionicons name={icon} size={16} color={C.inkSoft} />
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function QuestRow({
  q,
  value,
  claimKeyStr,
  claimed,
  onClaim,
}: {
  q: Quest;
  value: number;
  claimKeyStr: string;
  claimed: Record<string, number>;
  onClaim: (key: string, reward: number) => void;
}) {
  const done = value >= q.goal;
  const got = !!claimed[claimKeyStr];
  const show = (n: number) => (q.unit === 'km' ? fmt.km(n) : q.unit === 'dk' ? `${Math.floor(n)} dk` : fmt.int(n));
  return (
    <View style={styles.quest}>
      <View style={[styles.questIcon, done && { backgroundColor: C.tealSoft }]}>
        <Ionicons name={q.icon} size={18} color={done ? C.teal : C.primary} />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <View style={styles.questHead}>
          <Text style={styles.questTitle}>{q.title}</Text>
          <Text style={styles.questReward}>+{q.reward}</Text>
        </View>
        <ProgressBar value={Math.min(value, q.goal)} goal={q.goal} color={done ? C.teal : C.primary} />
        <Text style={styles.questProgress}>
          {show(Math.min(value, q.goal))} / {show(q.goal)}
        </Text>
      </View>
      {got ? (
        <Ionicons name="checkmark-circle" size={26} color={C.teal} accessibilityLabel="Ödül alındı" />
      ) : done ? (
        <Pressable
          style={styles.claim}
          onPress={() => {
            onClaim(claimKeyStr, q.reward);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }}>
          <Text style={styles.claimText}>Al</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Record({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={styles.record}>
      <Ionicons name={icon} size={18} color={C.gold} />
      <Text style={styles.recordValue}>{value}</Text>
      <Text style={styles.recordLabel}>{label}</Text>
    </View>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <Pressable accessibilityLabel={`${label} azalt`} style={styles.stepBtn} onPress={onMinus}>
        <Ionicons name="remove" size={18} color={C.ink} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable accessibilityLabel={`${label} artır`} style={styles.stepBtn} onPress={onPlus}>
        <Ionicons name="add" size={18} color={C.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'center', gap: 16 },
  heroStats: { flexDirection: 'row', alignSelf: 'stretch' },
  mini: { flex: 1, alignItems: 'center', gap: 2 },
  miniValue: { fontFamily: F.display, fontSize: 20, color: C.ink },
  miniLabel: { fontFamily: F.body, fontSize: 12, color: C.inkSoft },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch', backgroundColor: '#FFF0E4', borderRadius: 16, padding: 12 },
  streakFire: { fontSize: 26 },
  streakTitle: { fontFamily: F.displayMed, fontSize: 17, color: C.ink },
  streakSub: { fontFamily: F.body, fontSize: 12, color: C.inkSoft },
  streakBest: { fontFamily: F.bodyBold, fontSize: 11, color: C.inkSoft },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 12 },
  noticeText: { flex: 1, fontFamily: F.body, fontSize: 13, color: C.ink },
  startRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  startBtn: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: '#FFFBF5', borderRadius: 18, paddingVertical: 14, borderWidth: 2, borderColor: C.line },
  startText: { fontFamily: F.bodyBold, fontSize: 13, color: C.ink },
  walkingNote: { fontFamily: F.bodyBold, fontSize: 12, color: C.teal, textAlign: 'center', marginTop: 8 },
  section: { fontFamily: F.displayMed, fontSize: 20, color: C.ink, marginTop: 22, marginBottom: 12 },
  quest: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  questIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFE9DA', alignItems: 'center', justifyContent: 'center' },
  questHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questTitle: { fontFamily: F.bodyBold, fontSize: 14, color: C.ink, flexShrink: 1 },
  questReward: { fontFamily: F.bodyBold, fontSize: 12, color: C.primary },
  questProgress: { fontFamily: F.body, fontSize: 11, color: C.inkSoft },
  claim: { backgroundColor: C.teal, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  claimText: { fontFamily: F.bodyBold, color: '#fff', fontSize: 14 },
  records: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  record: { width: '47%', flexGrow: 1, backgroundColor: '#FFFBF5', borderRadius: 18, padding: 14, gap: 4, borderWidth: 1.5, borderColor: C.line },
  recordValue: { fontFamily: F.display, fontSize: 20, color: C.ink },
  recordLabel: { fontFamily: F.body, fontSize: 12, color: C.inkSoft },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperLabel: { flex: 1, fontFamily: F.bodyBold, fontSize: 14, color: C.ink },
  stepBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontFamily: F.display, fontSize: 15, color: C.ink, minWidth: 86, textAlign: 'center' },
  foot: { fontFamily: F.body, fontSize: 11, color: C.inkSoft, textAlign: 'center', marginTop: 16 },
});
