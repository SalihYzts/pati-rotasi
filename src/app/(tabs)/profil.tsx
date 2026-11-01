// Profil: toplam istatistikler, yürüyüş geçmişi, ayarlar.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BadgesGrid, { earnedCount } from '@/components/BadgesGrid';
import { Button, Card, Stat, fmt } from '@/components/ui';
import { BADGES } from '@/lib/badges';
import { MODES, kcal } from '@/lib/activity';
import { areaKm2 } from '@/lib/geo';
import { useApp } from '@/store/AppStore';
import { C, F } from '@/theme';

function level(xp: number) {
  // Her seviye bir öncekinden biraz daha fazla puan ister.
  let lvl = 1;
  let need = 100;
  let rest = xp;
  while (rest >= need) {
    rest -= need;
    lvl++;
    need = Math.round(need * 1.35);
  }
  return { lvl, rest, need };
}

const TITLES = ['Çırak Kaşif', 'Sokak Gezgini', 'Kedi Fısıldayan', 'Mahalle Bilgesi', 'Pati Ustası', 'Efsane Rotacı'];

export default function ProfileScreen() {
  const { state, setMusic, reset } = useApp();
  const insets = useSafeAreaInsets();
  const [confirm, setConfirm] = useState(false);

  const xp = state.points + state.donatedPoints;
  const { lvl, rest, need } = level(xp);

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <View style={styles.hero}>
        <Image source={require('../../../assets/img/mascot.png')} style={styles.mascot} contentFit="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.lvl}>Seviye {lvl}</Text>
          <Text style={styles.title}>{TITLES[Math.min(lvl - 1, TITLES.length - 1)]}</Text>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${(rest / need) * 100}%` }]} />
          </View>
          <Text style={styles.xpText}>
            {rest}/{need} puan
          </Text>
        </View>
      </View>

      <Card style={styles.stats}>
        <Stat icon="footsteps" value={fmt.int(state.totalSteps)} label="adım" />
        <Stat icon="navigate" value={fmt.km(state.totalDistanceM)} label="yürüdün" />
        <Stat icon="cloud-outline" value={areaKm2(state.cells.length).toFixed(2).replace('.', ',')} label="km² açıldı" />
      </Card>

      <Card style={{ marginTop: 14 }}>
        <View style={styles.setting}>
          <Ionicons name="musical-notes" size={22} color={C.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Yürüyüş müziği</Text>
            <Text style={styles.settingSub}>Sakin bir akustik melodi döngüde çalar</Text>
          </View>
          <Switch value={state.musicOn} onValueChange={setMusic} trackColor={{ true: C.primary, false: C.line }} thumbColor="#fff" />
        </View>
      </Card>

      <Text style={styles.section}>
        Rozetler <Text style={styles.sectionCount}>{earnedCount(state)}/{BADGES.length}</Text>
      </Text>
      <BadgesGrid state={state} />

      <Text style={styles.section}>Son yürüyüşler</Text>
      {state.walks.length === 0 ? (
        <Card>
          <Text style={styles.empty}>Henüz yürüyüş yok. Haritadan “Yürüyüşe çık”a dokun.</Text>
        </Card>
      ) : (
        state.walks.slice(0, 8).map((w) => (
          <Card key={w.startedAt} style={styles.walk}>
            <View style={styles.walkIcon}>
              <Ionicons name={MODES[w.mode ?? 'yuruyus'].icon} size={20} color={C.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.walkTitle}>
                {MODES[w.mode ?? 'yuruyus'].label} · {fmt.date(w.startedAt)}
              </Text>
              <Text style={styles.walkSub}>
                {fmt.duration(w.endedAt - w.startedAt)} · {fmt.km(w.distanceM)} · {fmt.int(w.steps)} adım ·{' '}
                {w.kcal ?? kcal(w.mode ?? 'yuruyus', state.weightKg, w.endedAt - w.startedAt)} kcal
              </Text>
            </View>
            <Text style={styles.walkCells}>+{w.newCells}</Text>
          </Card>
        ))
      )}

      {!confirm ? (
        <Pressable onPress={() => setConfirm(true)} style={{ alignSelf: 'center', marginTop: 28, padding: 10 }}>
          <Text style={{ fontFamily: F.bodyBold, color: C.inkSoft }}>Tüm verileri sıfırla</Text>
        </Pressable>
      ) : (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>Kartların, haritan ve puanların silinecek. Emin misin?</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Vazgeç" variant="ghost" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
            <Button
              title="Sıfırla"
              variant="dark"
              style={{ flex: 1, backgroundColor: C.danger }}
              onPress={() => {
                reset();
                setConfirm(false);
              }}
            />
          </View>
        </View>
      )}
      <Text style={styles.version}>Pati Rotası 1.0 · Harita © OpenStreetMap katkıcıları</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  mascot: { width: 110, height: 110 },
  lvl: { fontFamily: F.bodyBold, color: C.primary, fontSize: 14 },
  title: { fontFamily: F.display, fontSize: 26, color: C.ink },
  xpTrack: { height: 10, borderRadius: 6, backgroundColor: C.cream, overflow: 'hidden', marginTop: 8 },
  xpFill: { height: '100%', backgroundColor: C.primary, borderRadius: 6 },
  xpText: { fontFamily: F.body, fontSize: 12, color: C.inkSoft, marginTop: 4 },
  stats: { flexDirection: 'row' },
  setting: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingTitle: { fontFamily: F.bodyBold, fontSize: 15, color: C.ink },
  settingSub: { fontFamily: F.body, fontSize: 12, color: C.inkSoft },
  sectionCount: { color: C.inkSoft, fontSize: 16 },
  section: { fontFamily: F.displayMed, fontSize: 20, color: C.ink, marginTop: 22, marginBottom: 12 },
  empty: { fontFamily: F.body, color: C.inkSoft },
  walk: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, padding: 12 },
  walkIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.tealSoft, alignItems: 'center', justifyContent: 'center' },
  walkTitle: { fontFamily: F.bodyBold, fontSize: 14, color: C.ink },
  walkSub: { fontFamily: F.body, fontSize: 12, color: C.inkSoft },
  walkCells: { fontFamily: F.display, fontSize: 16, color: C.teal },
  confirm: { marginTop: 24, gap: 12, backgroundColor: '#FFE7E7', padding: 14, borderRadius: 18 },
  confirmText: { fontFamily: F.bodyBold, color: C.ink },
  version: { fontFamily: F.body, fontSize: 11, color: C.inkSoft, textAlign: 'center', marginTop: 20 },
});
