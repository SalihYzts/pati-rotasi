// Koleksiyon kartı: nadirliğe göre çerçeve rengi, yıldızlar ve efsanevilerde parıltı.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { COATS, EYES, RARITY, catStats, coatLabel, dexNo, friendship, power, speciesOf, type CatCard } from '@/lib/cats';
import { C, F, shadow } from '@/theme';

const FRAME: Record<CatCard['rarity'], [string, string, string]> = {
  siradan: ['#E9D9C6', '#CDB8A0', '#E9D9C6'],
  nadir: ['#8FD3CC', '#2E8B85', '#8FD3CC'],
  'cok-nadir': ['#C7B1FF', '#7B4FD6', '#E3D6FF'],
  efsanevi: ['#FFE08A', '#D9A21B', '#FFF2C4'],
};

export function Stars({ count, color, size = 12 }: { count: number; color: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Ionicons key={i} name={i < count ? 'star' : 'star-outline'} size={size} color={i < count ? color : '#00000025'} />
      ))}
    </View>
  );
}

function Shine({ width }: { width: number }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(1400),
        Animated.timing(x, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [x]);
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [-width, width * 1.5] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateX }, { rotate: '20deg' }] }]}>
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ width: width * 0.45, height: '160%', marginTop: '-30%' }}
      />
    </Animated.View>
  );
}

export default function CatCardView({ cat, width, compact }: { cat: CatCard; width: number; compact?: boolean }) {
  const r = RARITY[cat.rarity];
  const coat = COATS.find((c) => c.key === cat.coat);
  const eye = EYES.find((e) => e.key === cat.eyes);
  const pad = compact ? 5 : 8;
  const sp = speciesOf(cat);
  const f = friendship(cat.encounters);
  return (
    <View style={[{ width, borderRadius: compact ? 16 : 24 }, shadow]}>
      <LinearGradient colors={FRAME[cat.rarity]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.frame, { padding: pad, borderRadius: compact ? 16 : 24 }]}>
        <View style={[styles.inner, { borderRadius: compact ? 12 : 18 }]}>
          <View style={styles.header}>
            <Text style={[styles.dex, { color: r.color }]}>{dexNo(sp.no)}</Text>
            <Text numberOfLines={1} style={[styles.name, compact && { fontSize: 14 }]}>
              {cat.name}
            </Text>
            <Stars count={r.stars} color={r.color} size={compact ? 9 : 13} />
          </View>
          <View style={[styles.photoWrap, { borderColor: r.color }]}>
            <Image source={{ uri: cat.photoUri }} style={styles.photo} contentFit="cover" transition={200} />
            {cat.rarity === 'efsanevi' || cat.rarity === 'cok-nadir' ? <Shine width={width} /> : null}
            <View style={styles.hearts}>
              {Array.from({ length: f.hearts }).map((_, i) => (
                <Ionicons key={i} name="heart" size={compact ? 10 : 13} color="#FF5A5F" />
              ))}
            </View>
            <View style={[styles.rarityTag, { backgroundColor: r.color }]}>
              <Text style={[styles.rarityText, compact && { fontSize: 9 }]}>{r.label.toLocaleUpperCase('tr-TR')}</Text>
            </View>
          </View>
          {!compact && (
            <>
              <View style={styles.speciesRow}>
                <Text style={styles.species}>{sp.name}</Text>
                <Text style={[styles.power, { color: r.color }]}>⚡ {power(catStats(cat))}</Text>
              </View>
              <View style={styles.traits}>
                <View style={styles.chip}>
                  <View style={styles.swatches}>
                    {coat?.swatch.map((s, i) => <View key={i} style={[styles.swatch, { backgroundColor: s }]} />)}
                  </View>
                  <Text style={styles.chipText}>{coatLabel(cat.coat)}</Text>
                </View>
                <View style={styles.chip}>
                  <Ionicons name="eye" size={14} color={eye?.color} />
                  <Text style={styles.chipText}>{eye?.label}</Text>
                </View>
                {cat.earTipped && (
                  <View style={styles.chip}>
                    <Ionicons name="cut" size={13} color={C.teal} />
                    <Text style={styles.chipText}>Kısır</Text>
                  </View>
                )}
              </View>
              <View style={styles.footer}>
                <Ionicons name="location" size={13} color={C.inkSoft} />
                <Text numberOfLines={1} style={styles.footerText}>
                  {cat.neighborhood}
                </Text>
                <Text style={styles.footerText}>· +{r.points} mama</Text>
              </View>
            </>
          )}
          {compact && (
            <Text numberOfLines={1} style={styles.compactMeta}>
              {sp.name}
            </Text>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {},
  inner: { backgroundColor: '#FFFDF8', padding: 8, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 6, paddingHorizontal: 2 },
  name: { flex: 1, fontFamily: F.display, fontSize: 20, color: C.ink },
  dex: { fontFamily: F.bodyBold, fontSize: 11 },
  hearts: { position: 'absolute', right: 6, top: 6, flexDirection: 'row', gap: 1, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 5, paddingVertical: 3, borderRadius: 8 },
  speciesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  species: { fontFamily: F.displayMed, fontSize: 15, color: C.ink, flexShrink: 1 },
  power: { fontFamily: F.display, fontSize: 15 },
  photoWrap: { aspectRatio: 3 / 4, borderRadius: 12, overflow: 'hidden', borderWidth: 2, backgroundColor: C.cream },
  photo: { width: '100%', height: '100%' },
  rarityTag: { position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  rarityText: { fontFamily: F.bodyBold, fontSize: 11, color: '#fff', letterSpacing: 0.6 },
  traits: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.cream, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  chipText: { fontFamily: F.bodyBold, fontSize: 12, color: C.ink },
  swatches: { flexDirection: 'row' },
  swatch: { width: 10, height: 10, borderRadius: 5, marginRight: -3, borderWidth: 1, borderColor: '#00000030' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  footerText: { fontFamily: F.body, fontSize: 12, color: C.inkSoft, flexShrink: 1 },
  compactMeta: { fontFamily: F.body, fontSize: 11, color: C.inkSoft, marginTop: 5, paddingHorizontal: 2 },
});
