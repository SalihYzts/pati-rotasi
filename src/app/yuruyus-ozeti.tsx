// Yürüyüş/koşu bitince gösterilen özet.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, ProgressBar, fmt } from '@/components/ui';
import { EMPTY_DAY, MODES, dayKey, pace, streak } from '@/lib/activity';
import { useApp } from '@/store/AppStore';
import { C, F } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function WalkSummary() {
  const router = useRouter();
  const { state } = useApp();
  const w = state.walks[0];

  if (!w) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Henüz bir yürüyüş yok.</Text>
      </View>
    );
  }

  const mode = MODES[w.mode ?? 'yuruyus'];
  const duration = w.endedAt - w.startedAt;
  const today = state.days[dayKey()] ?? EMPTY_DAY;
  const left = Math.max(0, state.goal - today.steps);
  const s = streak(state.days, state.goal);
  const km = w.distanceM / 1000;
  const headline = km >= 5 ? 'Muhteşem bir rota!' : km >= 2 ? 'Harika iş çıkardın!' : 'Güzel bir başlangıç!';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Image source={require('../../assets/img/mascot.png')} style={styles.mascot} contentFit="contain" />
      <Text style={styles.kicker}>
        {mode.label.toLocaleUpperCase('tr-TR')} TAMAMLANDI
      </Text>
      <Text style={styles.title}>{headline}</Text>

      <Card style={styles.grid}>
        <Big icon="time" value={fmt.duration(duration)} label="süre" />
        <Big icon="navigate" value={fmt.km(w.distanceM)} label="mesafe" />
        <Big icon="footsteps" value={fmt.int(w.steps)} label="adım" />
        <Big icon="speedometer" value={pace(duration, w.distanceM)} label="tempo (dk/km)" />
        <Big icon="flame" value={String(w.kcal ?? 0)} label="kcal" />
        <Big icon="cloud-outline" value={`+${w.newCells}`} label="sisli kare" />
      </Card>

      <Card style={styles.rewards}>
        <Reward icon="heart" color={C.primary} text={`+${w.points ?? 0} mama puanı kazandın`} />
        <Reward icon="camera" color={C.teal} text={w.cats ? `${w.cats} kedi yakaladın` : 'Bu yürüyüşte kedi yakalamadın'} />
        <Reward icon="flame" color={C.danger} text={s > 0 ? `${s} günlük serin sürüyor` : 'Hedefi tutturup seri başlat'} />
      </Card>

      <Card style={{ marginTop: 14, gap: 8 }}>
        <View style={styles.goalHead}>
          <Text style={styles.goalTitle}>Bugünkü hedef</Text>
          <Text style={styles.goalValue}>
            {fmt.int(today.steps)} / {fmt.int(state.goal)}
          </Text>
        </View>
        <ProgressBar value={today.steps} goal={state.goal} color={left ? C.primary : C.teal} />
        <Text style={styles.goalSub}>{left ? `Hedefe ${fmt.int(left)} adım kaldı.` : 'Günlük hedef tamam! 🎉'}</Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
        <Button title="Görevler" variant="ghost" icon="list" onPress={() => router.replace('/hareket')} style={{ flex: 1 }} />
        <Button title="Harita" icon="map" onPress={() => router.back()} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

function Big({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={styles.big}>
      <Ionicons name={icon} size={18} color={C.inkSoft} />
      <Text style={styles.bigValue}>{value}</Text>
      <Text style={styles.bigLabel}>{label}</Text>
    </View>
  );
}

function Reward({ icon, color, text }: { icon: IconName; color: string; text: string }) {
  return (
    <View style={styles.reward}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.rewardText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, maxWidth: 520, width: '100%', alignSelf: 'center', alignItems: 'stretch' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: F.bodyBold, color: C.inkSoft },
  mascot: { width: 120, height: 120, alignSelf: 'center' },
  kicker: { fontFamily: F.bodyBold, fontSize: 13, letterSpacing: 1.5, color: C.primary, textAlign: 'center', marginTop: 6 },
  title: { fontFamily: F.display, fontSize: 30, color: C.ink, textAlign: 'center', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  big: { width: '33.33%', alignItems: 'center', gap: 2 },
  bigValue: { fontFamily: F.display, fontSize: 22, color: C.ink, fontVariant: ['tabular-nums'] },
  bigLabel: { fontFamily: F.body, fontSize: 11, color: C.inkSoft },
  rewards: { marginTop: 14, gap: 10 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rewardText: { fontFamily: F.bodyBold, fontSize: 14, color: C.ink },
  goalHead: { flexDirection: 'row', justifyContent: 'space-between' },
  goalTitle: { fontFamily: F.bodyBold, fontSize: 14, color: C.ink },
  goalValue: { fontFamily: F.bodyBold, fontSize: 14, color: C.inkSoft },
  goalSub: { fontFamily: F.body, fontSize: 12, color: C.inkSoft },
});
