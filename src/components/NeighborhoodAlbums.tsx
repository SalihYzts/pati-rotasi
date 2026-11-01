// Mahalle albümleri: her mahallede 8 tüy deseni yuvası.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ProgressBar } from '@/components/ui';
import { albums } from '@/lib/badges';
import { COATS, type CatCard } from '@/lib/cats';
import { C, F } from '@/theme';

export default function NeighborhoodAlbums({ cats }: { cats: CatCard[] }) {
  const router = useRouter();
  const list = albums(cats);

  return (
    <View>
      <Text style={styles.hint}>Her mahallede 8 tüy desenini bul, albümü tamamla, mahallenin muhtarı ol.</Text>
      {list.length === 0 && (
        <Card>
          <Text style={styles.emptyText}>İlk kediyi yakaladığında bulunduğun mahallenin albümü açılacak.</Text>
        </Card>
      )}
      {list.map((a) => (
        <Card key={a.neighborhood} style={{ marginBottom: 14 }}>
          <View style={styles.albumHead}>
            <Ionicons name={a.complete ? 'trophy' : 'home'} size={20} color={a.complete ? C.gold : C.primary} />
            <Text style={styles.albumTitle} numberOfLines={1}>
              {a.neighborhood}
            </Text>
            <Text style={styles.albumCount}>
              {a.found.size}/{COATS.length}
            </Text>
          </View>
          <ProgressBar value={a.found.size} goal={COATS.length} color={a.complete ? C.gold : C.primary} />
          <View style={styles.slots}>
            {COATS.map((coat) => {
              const cat = a.found.get(coat.key);
              return (
                <Pressable
                  key={coat.key}
                  disabled={!cat}
                  onPress={() => cat && router.navigate({ pathname: '/kedi/[id]', params: { id: cat.id } })}
                  style={styles.slot}>
                  {cat ? (
                    <Image source={{ uri: cat.photoUri }} style={styles.slotImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.slotImg, styles.slotEmpty]}>
                      <View style={{ flexDirection: 'row' }}>
                        {coat.swatch.map((s, i) => (
                          <View key={i} style={[styles.dot, { backgroundColor: s, marginLeft: i ? -5 : 0 }]} />
                        ))}
                      </View>
                      <Text style={styles.q}>?</Text>
                    </View>
                  )}
                  <Text numberOfLines={1} style={[styles.slotLabel, !cat && { color: C.inkSoft }]}>
                    {coat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.albumFoot}>
            {a.complete ? 'Albüm tamam! Bu mahallenin muhtarı sensin.' : `Bu mahallede ${a.cats.length} kedi buldun.`}
          </Text>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: F.body, fontSize: 13, color: C.inkSoft, marginBottom: 12 },
  emptyText: { fontFamily: F.body, color: C.inkSoft, fontSize: 14 },
  albumHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  albumTitle: { flex: 1, fontFamily: F.displayMed, fontSize: 18, color: C.ink },
  albumCount: { fontFamily: F.display, fontSize: 16, color: C.inkSoft },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  slot: { width: '22%', flexGrow: 1, alignItems: 'center' },
  slotImg: { width: '100%', aspectRatio: 1, borderRadius: 14, backgroundColor: C.cream },
  slotEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: C.line, gap: 2 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#00000025' },
  q: { fontFamily: F.display, fontSize: 16, color: C.inkSoft },
  slotLabel: { fontFamily: F.bodyBold, fontSize: 11, color: C.ink, marginTop: 4 },
  albumFoot: { fontFamily: F.body, fontSize: 12, color: C.inkSoft, marginTop: 10 },
});
