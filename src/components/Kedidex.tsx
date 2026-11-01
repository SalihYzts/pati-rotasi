// Kedidex: 32 numaralı kedi türü. Bulunanlar fotoğrafla, bulunmayanlar "?" ile ipucu olarak görünür.
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Stars } from '@/components/CatCardView';
import { ProgressBar } from '@/components/ui';
import { COATS, EYES, RARITY, SPECIES, dexNo, type CatCard } from '@/lib/cats';
import { C, F } from '@/theme';

export default function Kedidex({ cats, width }: { cats: CatCard[]; width: number }) {
  const router = useRouter();
  const found = new Map<number, CatCard[]>();
  for (const s of SPECIES) {
    const list = cats.filter((c) => c.coat === s.coat && c.eyes === s.eyes);
    if (list.length) found.set(s.no, list.sort((a, b) => (b.encounters ?? 1) - (a.encounters ?? 1)));
  }
  const cols = width > 500 ? 5 : 4;
  const cell = (width - 32 - (cols - 1) * 8) / cols;

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.count}>
          {found.size}
          <Text style={styles.total}>/{SPECIES.length} tür</Text>
        </Text>
        <Text style={styles.hint}>Her desen + göz rengi ayrı bir tür. Hepsini yakala!</Text>
        <ProgressBar value={found.size} goal={SPECIES.length} color={C.primary} />
      </View>
      <View style={styles.grid}>
        {SPECIES.map((s) => {
          const list = found.get(s.no);
          const r = RARITY[s.rarity];
          const coat = COATS.find((c) => c.key === s.coat)!;
          const eye = EYES.find((e) => e.key === s.eyes)!;
          return (
            <Pressable
              key={s.no}
              disabled={!list}
              onPress={() => list && router.navigate({ pathname: '/kedi/[id]', params: { id: list[0].id } })}
              style={[styles.cell, { width: cell }, list && { borderColor: r.color }]}>
              <Text style={[styles.no, list && { color: r.color }]}>{dexNo(s.no)}</Text>
              {list ? (
                <Image source={{ uri: list[0].photoUri }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={[styles.photo, styles.unknown]}>
                  <Text style={styles.q}>?</Text>
                  <View style={styles.hints}>
                    {coat.swatch.map((c, i) => (
                      <View key={i} style={[styles.dot, { backgroundColor: c, marginLeft: i ? -4 : 0 }]} />
                    ))}
                    <View style={[styles.dot, styles.eye, { backgroundColor: eye.key === 'ayrik' ? '#8E6CEF' : eye.color }]} />
                  </View>
                </View>
              )}
              <Text numberOfLines={2} style={[styles.name, !list && styles.nameUnknown]}>
                {s.name}
              </Text>
              <View style={styles.foot}>
                <Stars count={r.stars} color={list ? r.color : C.inkSoft} size={8} />
                {list && list.length > 1 ? <Text style={styles.multi}>×{list.length}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { gap: 6, marginBottom: 14 },
  count: { fontFamily: F.display, fontSize: 28, color: C.ink },
  total: { fontSize: 16, color: C.inkSoft },
  hint: { fontFamily: F.body, fontSize: 13, color: C.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { backgroundColor: '#FFFBF5', borderRadius: 14, padding: 5, borderWidth: 2, borderColor: C.line },
  no: { fontFamily: F.bodyBold, fontSize: 10, color: C.inkSoft, marginBottom: 3 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 9, backgroundColor: C.cream },
  unknown: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFE3D3' },
  q: { fontFamily: F.display, fontSize: 24, color: '#BFAE98' },
  hints: { flexDirection: 'row', position: 'absolute', bottom: 5, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: '#00000025' },
  eye: { marginLeft: 4, borderColor: C.ink, borderWidth: 1.5 },
  name: { fontFamily: F.bodyBold, fontSize: 10, color: C.ink, marginTop: 4, minHeight: 26, lineHeight: 13 },
  nameUnknown: { color: '#A99A88' },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  multi: { fontFamily: F.bodyBold, fontSize: 10, color: C.teal },
});
