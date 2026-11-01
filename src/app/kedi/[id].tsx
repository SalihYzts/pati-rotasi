// Kedi kartı detayı.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import CatCardView from '@/components/CatCardView';
import { Button, Card, ProgressBar, fmt } from '@/components/ui';
import { FRIENDSHIP, RARITY, STAT_LABELS, catStats, coatLabel, dexNo, eyesLabel, friendship, power, speciesOf } from '@/lib/cats';
import { deletePhoto } from '@/lib/photo';
import { useApp } from '@/store/AppStore';
import { C, F } from '@/theme';

export default function CatDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, removeCat } = useApp();
  const { width } = useWindowDimensions();
  const [confirm, setConfirm] = useState(false);
  const cat = state.cats.find((c) => c.id === id);

  if (!cat) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Bu kart bulunamadı.</Text>
      </View>
    );
  }
  const r = RARITY[cat.rarity];
  const sameHood = state.cats.filter((c) => c.neighborhood === cat.neighborhood).length;
  const sp = speciesOf(cat);
  const stats = catStats(cat);
  const enc = cat.encounters ?? 1;
  const f = friendship(enc);
  const next = FRIENDSHIP.find((x) => x.min > enc);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: cat.name,
          headerRight: () => (
            <Pressable
              accessibilityLabel="Paylaş"
              hitSlop={10}
              onPress={() =>
                Share.share({ message: `${cat.name} adlı ${r.label.toLocaleLowerCase('tr-TR')} ${coatLabel(cat.coat).toLocaleLowerCase('tr-TR')} kediyi ${cat.neighborhood} sokaklarında buldum! 🐾 #PatiRotası` }).catch(() => {})
              }>
              <Ionicons name="share-outline" size={24} color={C.ink} />
            </Pressable>
          ),
        }}
      />
      <View style={{ alignItems: 'center' }}>
        <CatCardView cat={cat} width={Math.min(width - 48, 360)} />
      </View>

      <Card style={{ marginTop: 22, gap: 10 }}>
        <View style={styles.statHead}>
          <Text style={styles.statTitle}>
            {dexNo(sp.no)} {sp.name}
          </Text>
          <Text style={[styles.statPower, { color: r.color }]}>⚡ {power(stats)}</Text>
        </View>
        {STAT_LABELS.map((st) => (
          <View key={st.key} style={styles.statRow}>
            <Text style={styles.statLabel}>{st.label}</Text>
            <View style={{ flex: 1 }}>
              <ProgressBar value={stats[st.key]} goal={100} color={st.color} />
            </View>
            <Text style={styles.statValue}>{stats[st.key]}</Text>
          </View>
        ))}
      </Card>

      <Card style={{ marginTop: 14, gap: 8 }}>
        <View style={styles.statHead}>
          <Text style={styles.statTitle}>Dostluk</Text>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {[1, 2, 3, 4].map((i) => (
              <Ionicons key={i} name={i <= f.hearts ? 'heart' : 'heart-outline'} size={18} color="#FF5A5F" />
            ))}
          </View>
        </View>
        <Text style={styles.friendText}>
          {f.label} · {enc} karşılaşma
          {next ? ` · ${next.label} olmak için ${next.min - enc} karşılaşma daha` : ''}
        </Text>
        <Text style={styles.friendHint}>Bu kediyi tekrar gördüğünde yine fotoğrafla; uygulama aynı kedi olduğunu sorar ve dostluğunuz artar.</Text>
      </Card>

      <Card style={{ marginTop: 14, gap: 12 }}>
        <Row icon="color-palette" label="Desen" value={coatLabel(cat.coat)} />
        <Row icon="eye" label="Gözler" value={eyesLabel(cat.eyes)} />
        <Row icon="cut" label="Kısırlaştırılmış" value={cat.earTipped ? 'Evet (kulak ucu kesik)' : 'Bilinmiyor'} />
        <Row icon="location" label="Mahalle" value={`${cat.neighborhood} (${sameHood} kedi)`} />
        <Row icon="calendar" label="Bulunduğu gün" value={fmt.date(cat.createdAt)} />
        <Row icon="sparkles" label="Nadirlik" value={`${r.label} · +${r.points} mama`} color={r.color} />
      </Card>

      {cat.lat != null && (
        <Button title="Haritada göster" icon="map" variant="ghost" style={{ marginTop: 16 }} onPress={() => router.navigate('/')} />
      )}

      {!confirm ? (
        <Pressable onPress={() => setConfirm(true)} style={styles.delete}>
          <Text style={styles.deleteText}>Kartı sil</Text>
        </Pressable>
      ) : (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>Kart ve fotoğraf silinsin mi? Kazandığın mama puanları kalır.</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Vazgeç" variant="ghost" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
            <Button
              title="Sil"
              variant="dark"
              style={{ flex: 1, backgroundColor: C.danger }}
              onPress={() => {
                deletePhoto(cat.photoUri);
                removeCat(cat.id);
                router.back();
              }}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Row({ icon, label, value, color = C.ink }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; color?: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={C.inkSoft} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, maxWidth: 520, width: '100%', alignSelf: 'center' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missingText: { fontFamily: F.bodyBold, color: C.inkSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  statTitle: { fontFamily: F.displayMed, fontSize: 17, color: C.ink, flexShrink: 1 },
  statPower: { fontFamily: F.display, fontSize: 18 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statLabel: { fontFamily: F.bodyBold, fontSize: 13, color: C.inkSoft, width: 82 },
  statValue: { fontFamily: F.display, fontSize: 15, color: C.ink, width: 30, textAlign: 'right' },
  friendText: { fontFamily: F.bodyBold, fontSize: 14, color: C.ink },
  friendHint: { fontFamily: F.body, fontSize: 12, color: C.inkSoft },
  rowLabel: { fontFamily: F.body, fontSize: 14, color: C.inkSoft, width: 118 },
  rowValue: { flex: 1, fontFamily: F.bodyBold, fontSize: 14, textAlign: 'right' },
  delete: { alignSelf: 'center', marginTop: 24, padding: 10 },
  deleteText: { fontFamily: F.bodyBold, color: C.danger },
  confirm: { marginTop: 20, gap: 12, backgroundColor: '#FFE7E7', padding: 14, borderRadius: 18 },
  confirmText: { fontFamily: F.bodyBold, color: C.ink, fontSize: 14 },
});
