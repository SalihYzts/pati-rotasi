// Kedi kartı koleksiyonu.
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CatCardView from '@/components/CatCardView';
import Kedidex from '@/components/Kedidex';
import NeighborhoodAlbums from '@/components/NeighborhoodAlbums';
import { Button, Title } from '@/components/ui';
import { RARITY, SPECIES, type Rarity } from '@/lib/cats';
import { useApp } from '@/store/AppStore';
import { C, F } from '@/theme';

const FILTERS: (Rarity | 'hepsi')[] = ['hepsi', 'efsanevi', 'cok-nadir', 'nadir', 'siradan'];

export default function CollectionScreen() {
  const { state } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('hepsi');
  const [view, setView] = useState<'kartlar' | 'dex' | 'mahalle'>('kartlar');

  const counts = useMemo(() => {
    const c: Record<string, number> = { hepsi: state.cats.length };
    for (const cat of state.cats) c[cat.rarity] = (c[cat.rarity] ?? 0) + 1;
    return c;
  }, [state.cats]);

  const list = view !== 'kartlar' ? [] : filter === 'hepsi' ? state.cats : state.cats.filter((c) => c.rarity === filter);
  const speciesFound = new Set(state.cats.map((c) => `${c.coat}/${c.eyes}`)).size;
  const contentW = Math.min(width, 640);
  const cols = contentW > 500 ? 3 : 2;
  const cardW = (contentW - 32 - (cols - 1) * 12) / cols;

  return (
    <FlatList
      key={cols}
      data={list}
      numColumns={cols}
      keyExtractor={(c) => c.id}
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, maxWidth: 640 }]}
      columnWrapperStyle={{ gap: 12 }}
      ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 16 }}>
          <Title sub={`${state.cats.length} kedi yakaladın · ${speciesFound}/${SPECIES.length} tür`}>Koleksiyon</Title>
          <View style={styles.segment}>
            {(['kartlar', 'dex', 'mahalle'] as const).map((v) => (
              <Pressable key={v} onPress={() => setView(v)} style={[styles.segBtn, view === v && styles.segOn]}>
                <Text style={[styles.segText, view === v && { color: '#fff' }]}>{v === 'kartlar' ? 'Kartlarım' : v === 'dex' ? 'Kedidex' : 'Mahalleler'}</Text>
              </Pressable>
            ))}
          </View>
          {view === 'dex' ? (
            <Kedidex cats={state.cats} width={contentW} />
          ) : view === 'mahalle' ? (
            <NeighborhoodAlbums cats={state.cats} />
          ) : (
            <View style={styles.filters}>
              {FILTERS.map((f) => {
                const on = f === filter;
                const color = f === 'hepsi' ? C.ink : RARITY[f].color;
                return (
                  <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filter, on && { backgroundColor: color, borderColor: color }]}>
                    <Text style={[styles.filterText, on && { color: '#fff' }]}>
                      {f === 'hepsi' ? 'Hepsi' : RARITY[f].label} {counts[f] ?? 0}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        view !== 'kartlar' ? undefined : (
        <View style={styles.empty}>
          <Image source={require('../../../assets/img/empty_cats.png')} style={{ width: 180, height: 180 }} contentFit="contain" />
          <Text style={styles.emptyTitle}>{filter === 'hepsi' ? 'Henüz kartın yok' : 'Bu nadirlikte kart yok'}</Text>
          <Text style={styles.emptyText}>
            {filter === 'hepsi' ? 'Yürüyüşe çık, sokakta gördüğün ilk kediyi fotoğrafla.' : 'Üç renkli ya da mavi gözlü kedileri gözden kaçırma!'}
          </Text>
          {filter === 'hepsi' && <Button title="İlk kediyi yakala" icon="camera" onPress={() => router.navigate('/yeni-kedi')} style={{ marginTop: 16 }} />}
        </View>
        )
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => router.navigate({ pathname: '/kedi/[id]', params: { id: item.id } })}>
          <CatCardView cat={item} width={cardW} compact />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, width: '100%', alignSelf: 'center' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segment: { flexDirection: 'row', backgroundColor: C.cream, borderRadius: 14, padding: 4, marginBottom: 14 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 11 },
  segOn: { backgroundColor: C.ink },
  segText: { fontFamily: F.bodyBold, fontSize: 14, color: C.ink },
  filter: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 2, borderColor: C.line, backgroundColor: '#FFFBF5' },
  filterText: { fontFamily: F.bodyBold, fontSize: 13, color: C.ink },
  empty: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  emptyTitle: { fontFamily: F.display, fontSize: 22, color: C.ink, marginTop: 8 },
  emptyText: { fontFamily: F.body, fontSize: 14, color: C.inkSoft, textAlign: 'center', marginTop: 4 },
});
