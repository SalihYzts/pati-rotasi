// Mama puanı ve barınak bağışları.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, ProgressBar, Title, fmt } from '@/components/ui';
import { POINTS_PER_BOWL, SHELTERS, STEPS_PER_POINT } from '@/data/shelters';
import { useApp } from '@/store/AppStore';
import { C, F, shadow } from '@/theme';

export default function MamaScreen() {
  const { state, donate } = useApp();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(SHELTERS[0].id);
  const [thanks, setThanks] = useState<string | null>(null);

  const bowls = Math.floor(state.points / POINTS_PER_BOWL);
  const toNext = POINTS_PER_BOWL - (state.points % POINTS_PER_BOWL);
  const donatedBowls = state.donatedPoints / POINTS_PER_BOWL;

  function give() {
    const pts = bowls * POINTS_PER_BOWL;
    if (pts <= 0) return;
    donate(selected, pts);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const name = SHELTERS.find((s) => s.id === selected)?.name;
    setThanks(`${bowls} kap mama ${name} kedilerine gidiyor. Teşekkürler!`);
  }

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <Title sub="Attığın her adım, sokaktaki bir kedinin kabına mama oluyor.">Mama</Title>

      <View style={[styles.hero, shadow]}>
        <Image source={require('../../../assets/img/onb_shelter.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.heroShade} />
        <View style={styles.heroBody}>
          <Text style={styles.heroLabel}>Mama puanın</Text>
          <Text style={styles.heroValue}>{fmt.int(state.points)}</Text>
          <Text style={styles.heroSub}>
            = {bowls} kap mama · sonraki kaba {toNext} puan
          </Text>
        </View>
      </View>

      <View style={styles.rules}>
        <Rule icon="footsteps" text={`${STEPS_PER_POINT} adım = 1 puan`} />
        <Rule icon="camera" text="Yeni kedi = 10–120 puan" />
        <Rule icon="restaurant" text={`${POINTS_PER_BOWL} puan = 1 kap`} />
      </View>

      <Text style={styles.section}>Barınak seç</Text>
      {SHELTERS.map((s) => {
        const on = s.id === selected;
        const mine = state.donations.filter((d) => d.shelterId === s.id).reduce((a, d) => a + d.points, 0) / POINTS_PER_BOWL;
        return (
          <Pressable key={s.id} onPress={() => setSelected(s.id)}>
            <Card style={[styles.shelter, on && styles.shelterOn]}>
              <View style={styles.shelterHead}>
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? C.primary : C.inkSoft} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shelterName}>{s.name}</Text>
                  <Text style={styles.shelterCity}>{s.city} · {s.cats} kedi</Text>
                </View>
              </View>
              <Text style={styles.blurb}>{s.blurb}</Text>
              <ProgressBar value={s.raised + mine} goal={s.goal} color={C.teal} />
              <Text style={styles.goal}>
                Bu ay {fmt.int(s.raised + mine)} / {fmt.int(s.goal)} kap
                {mine > 0 ? ` · senden ${fmt.int(mine)}` : ''}
              </Text>
            </Card>
          </Pressable>
        );
      })}

      {thanks && (
        <View style={styles.thanks}>
          <Ionicons name="heart" size={20} color={C.primary} />
          <Text style={styles.thanksText}>{thanks}</Text>
        </View>
      )}

      <Button
        title={bowls > 0 ? `${bowls} kap mamayı bağışla` : `Bağış için ${toNext} puan daha`}
        icon="heart"
        disabled={bowls <= 0}
        onPress={give}
        style={{ marginTop: 6 }}
      />

      <View style={styles.total}>
        <Text style={styles.totalValue}>{fmt.int(donatedBowls)}</Text>
        <Text style={styles.totalLabel}>kap mama bağışladın</Text>
      </View>
      <Text style={styles.note}>
        Pilot sürüm: bağışlar ortak barınaklarla yapılan anlaşmalar üzerinden sponsor markalar tarafından karşılanacak. Barınak listesi örnektir.
      </Text>
    </ScrollView>
  );
}

function Rule({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.rule}>
      <Ionicons name={icon} size={16} color={C.teal} />
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { height: 190, borderRadius: 26, overflow: 'hidden', justifyContent: 'flex-end' },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(43,33,64,0.45)' },
  heroBody: { padding: 18 },
  heroLabel: { fontFamily: F.bodyBold, color: '#FFE9DA', fontSize: 14 },
  heroValue: { fontFamily: F.display, color: '#fff', fontSize: 46, lineHeight: 52 },
  heroSub: { fontFamily: F.bodyBold, color: '#fff', fontSize: 14 },
  rules: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.tealSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  ruleText: { fontFamily: F.bodyBold, fontSize: 12, color: C.ink },
  section: { fontFamily: F.displayMed, fontSize: 20, color: C.ink, marginTop: 22, marginBottom: 12 },
  shelter: { marginBottom: 12, gap: 10, borderWidth: 2, borderColor: 'transparent' },
  shelterOn: { borderColor: C.primary },
  shelterHead: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  shelterName: { fontFamily: F.bodyBold, fontSize: 16, color: C.ink },
  shelterCity: { fontFamily: F.body, fontSize: 12, color: C.inkSoft },
  blurb: { fontFamily: F.body, fontSize: 13, color: C.ink },
  goal: { fontFamily: F.body, fontSize: 12, color: C.inkSoft },
  thanks: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#FFE9DA', padding: 12, borderRadius: 16, marginBottom: 12 },
  thanksText: { flex: 1, fontFamily: F.bodyBold, color: C.ink, fontSize: 14 },
  total: { alignItems: 'center', marginTop: 24 },
  totalValue: { fontFamily: F.display, fontSize: 36, color: C.primary },
  totalLabel: { fontFamily: F.bodyBold, fontSize: 14, color: C.inkSoft },
  note: { fontFamily: F.body, fontSize: 11, color: C.inkSoft, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
