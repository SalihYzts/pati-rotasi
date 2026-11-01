// Kedi yakalama: fotoğraf → özellikler → (aynı kedi mi?) → yakalama ekranı.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';

import CatCardView from '@/components/CatCardView';
import { Button } from '@/components/ui';
import { COATS, EYES, RARITY, computeRarity, dexNo, friendship, newId, questionParticle, speciesOf, suggestName, type CatCard, type Coat, type Eyes } from '@/lib/cats';
import { distanceM, type LatLng } from '@/lib/geo';
import { persistPhoto, pickPhoto } from '@/lib/photo';
import { neighborhoodName } from '@/lib/place';
import { useApp } from '@/store/AppStore';
import { useWalk } from '@/store/WalkStore';
import { C, F, shadow } from '@/theme';

export default function NewCatScreen() {
  const router = useRouter();
  const { addCat, meetAgain, state } = useApp();
  const walk = useWalk();
  const { width } = useWindowDimensions();

  const [photo, setPhoto] = useState<string | null>(null);
  const [coat, setCoat] = useState<Coat | null>(null);
  const [eyes, setEyes] = useState<Eyes | null>(null);
  const [earTipped, setEarTipped] = useState(false);
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ cat: CatCard; newSpecies: boolean } | null>(null);
  // Yakında aynı desen ve gözde bir kedi varsa "aynı kedi mi?" diye sorarız.
  const [match, setMatch] = useState<{ cat: CatCard; pos: LatLng | null } | null>(null);
  const [reunion, setReunion] = useState<{ cat: CatCard; gained: number } | null>(null);

  useEffect(() => {
    if (coat && !nameTouched) setName(suggestName(coat));
  }, [coat, nameTouched]);

  const rarity = coat && eyes ? computeRarity(coat, eyes) : null;

  async function choose(source: 'camera' | 'library') {
    setError(null);
    try {
      const uri = await pickPhoto(source);
      if (uri) setPhoto(uri);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function save() {
    if (!photo || !coat || !eyes) return;
    setSaving(true);
    setError(null);
    try {
      const pos = walk.position ?? (await walk.locate()) ?? state.lastPosition ?? null;
      const nearby = pos
        ? state.cats
            .filter((c) => c.coat === coat && c.eyes === eyes && c.lat != null && c.lng != null)
            .map((c) => ({ c, d: distanceM(pos, { lat: c.lat!, lng: c.lng! }) }))
            .filter((x) => x.d < 150)
            .sort((a, b) => a.d - b.d)[0]
        : undefined;
      if (nearby) {
        setMatch({ cat: nearby.c, pos });
        return;
      }
      await create(pos);
    } catch (e) {
      setError('Kart kaydedilemedi: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function create(pos: LatLng | null) {
    if (!photo || !coat || !eyes) return;
    const id = newId();
    const [photoUri, neighborhood] = await Promise.all([
      persistPhoto(photo, id),
      pos ? neighborhoodName(pos) : Promise.resolve('Bilinmeyen Sokaklar'),
    ]);
    const cat: CatCard = {
      id,
      name: name.trim() || suggestName(coat),
      photoUri,
      coat,
      eyes,
      earTipped,
      lat: pos?.lat,
      lng: pos?.lng,
      neighborhood,
      createdAt: Date.now(),
      rarity: computeRarity(coat, eyes),
    };
    const newSpecies = !state.cats.some((c) => c.coat === coat && c.eyes === eyes);
    addCat(cat);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCreated({ cat, newSpecies });
  }

  if (created)
    return (
      <Reveal
        cat={created.cat}
        newSpecies={created.newSpecies}
        onDone={() => router.back()}
        onOpen={() => router.replace({ pathname: '/kedi/[id]', params: { id: created.cat.id } })}
      />
    );

  if (reunion) {
    const cat = state.cats.find((c) => c.id === reunion.cat.id) ?? reunion.cat;
    const f = friendship(cat.encounters);
    return (
      <View style={styles.reveal}>
        <Text style={[styles.revealKicker, { color: C.primary }]}>TEKRAR MERHABA!</Text>
        <CatCardView cat={cat} width={Math.min(width - 80, 300)} />
        <View style={styles.reward}>
          <Ionicons name="heart" size={18} color={C.primary} />
          <Text style={styles.rewardText}>
            {cat.encounters}. karşılaşma · {f.label}
            {reunion.gained ? ` · +${reunion.gained} mama` : ''}
          </Text>
        </View>
        {!reunion.gained && <Text style={styles.matchSub}>Bugün zaten görüşmüştünüz; dostluk arttı, puan yarın.</Text>}
        <View style={{ flexDirection: 'row', gap: 10, width: Math.min(width - 80, 300) }}>
          <Button title="Karta bak" variant="ghost" onPress={() => router.replace({ pathname: '/kedi/[id]', params: { id: cat.id } })} style={{ flex: 1 }} />
          <Button title="Devam et" onPress={() => router.back()} style={{ flex: 1 }} />
        </View>
      </View>
    );
  }

  if (match) {
    return (
      <ScrollView contentContainerStyle={[styles.content, { alignItems: 'center', gap: 14 }]}>
        <Text style={styles.matchTitle}>
          Bu {match.cat.name} {questionParticle(match.cat.name)}?
        </Text>
        <Text style={styles.matchSub}>
          Buraya çok yakın bir yerde aynı desen ve göz renginde bir kedi yakalamıştın. Aynı kediyse yeni kart yerine dostluğunuz artar.
        </Text>
        <View style={styles.compare}>
          <View style={{ flex: 1, gap: 6 }}>
            <Image source={{ uri: match.cat.photoUri }} style={styles.compareImg} contentFit="cover" />
            <Text style={styles.compareLabel}>{match.cat.name}</Text>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Image source={{ uri: photo! }} style={styles.compareImg} contentFit="cover" />
            <Text style={styles.compareLabel}>Yeni fotoğraf</Text>
          </View>
        </View>
        <Button
          title={`Evet, ${match.cat.name}!`}
          icon="heart"
          style={{ alignSelf: 'stretch' }}
          onPress={() => {
            const gained = meetAgain(match.cat.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            setReunion({ cat: match.cat, gained });
            setMatch(null);
          }}
        />
        <Button
          title="Hayır, başka bir kedi"
          variant="ghost"
          loading={saving}
          style={{ alignSelf: 'stretch' }}
          onPress={async () => {
            setSaving(true);
            try {
              await create(match.pos);
              setMatch(null);
            } catch (e) {
              setError('Kart kaydedilemedi: ' + (e as Error).message);
              setMatch(null);
            } finally {
              setSaving(false);
            }
          }}
        />
      </ScrollView>
    );
  }

  const thumb = Math.min(width - 32, 420);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!photo ? (
        <View style={[styles.photoEmpty, { height: thumb * 0.9 }]}>
          <Ionicons name="camera-outline" size={48} color={C.inkSoft} />
          <Text style={styles.emptyTitle}>Sokakta bir kedi mi var?</Text>
          <Text style={styles.emptyText}>Yaklaşmadan, ürkütmeden bir fotoğrafını çek.</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Button title="Fotoğraf çek" icon="camera" onPress={() => choose('camera')} />
            <Button title="Galeri" icon="images" variant="ghost" onPress={() => choose('library')} />
          </View>
        </View>
      ) : (
        <View>
          <Image source={{ uri: photo }} style={[styles.photo, { height: thumb * 1.05 }]} contentFit="cover" />
          <Pressable style={styles.retake} onPress={() => choose('camera')}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.retakeText}>Yeniden çek</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.label}>Tüy deseni</Text>
      <View style={styles.grid}>
        {COATS.map((c) => (
          <Pressable
            key={c.key}
            onPress={() => {
              setCoat(c.key);
              Haptics.selectionAsync().catch(() => {});
            }}
            style={[styles.option, coat === c.key && styles.optionOn]}>
            <View style={styles.swatchRow}>
              {c.swatch.map((s, i) => (
                <View key={i} style={[styles.swatch, { backgroundColor: s, marginLeft: i ? -6 : 0 }]} />
              ))}
            </View>
            <Text style={styles.optionText}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Göz rengi</Text>
      <View style={styles.grid}>
        {EYES.map((e) => (
          <Pressable
            key={e.key}
            onPress={() => {
              setEyes(e.key);
              Haptics.selectionAsync().catch(() => {});
            }}
            style={[styles.option, styles.optionWide, eyes === e.key && styles.optionOn]}>
            {e.key === 'ayrik' ? (
              <View style={styles.swatchRow}>
                <View style={[styles.eye, { backgroundColor: '#4A9BE8' }]} />
                <View style={[styles.eye, { backgroundColor: '#E9B949', marginLeft: 4 }]} />
              </View>
            ) : (
              <View style={[styles.eye, { backgroundColor: e.color }]} />
            )}
            <Text style={styles.optionText}>{e.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Kulak ucu kesik</Text>
          <Text style={styles.rowSub}>Kısırlaştırılmış sokak kedilerinin işareti</Text>
        </View>
        <Switch value={earTipped} onValueChange={setEarTipped} trackColor={{ true: C.teal, false: C.line }} thumbColor="#fff" />
      </View>

      <Text style={styles.label}>Adı</Text>
      <View style={styles.nameRow}>
        <TextInput
          value={name}
          onChangeText={(t) => {
            setName(t);
            setNameTouched(true);
          }}
          placeholder="Önce deseni seç, isim önerelim"
          placeholderTextColor={C.inkSoft}
          style={styles.input}
          maxLength={28}
        />
        <Pressable accessibilityLabel="Başka isim öner" style={styles.dice} onPress={() => coat && setName(suggestName(coat))}>
          <Ionicons name="dice" size={22} color={C.primary} />
        </Pressable>
      </View>

      {rarity && (
        <View style={[styles.preview, { borderColor: RARITY[rarity].color }]}>
          <Ionicons name="sparkles" size={20} color={RARITY[rarity].color} />
          <Text style={[styles.previewText, { color: RARITY[rarity].color }]}>
            {RARITY[rarity].label} kart · +{RARITY[rarity].points} mama puanı
          </Text>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        title={!photo ? 'Önce fotoğraf ekle' : !coat || !eyes ? 'Desen ve göz rengini seç' : 'Yakala!'}
        icon="sparkles"
        disabled={!photo || !coat || !eyes}
        loading={saving}
        onPress={save}
        style={{ marginTop: 18 }}
      />
    </ScrollView>
  );
}

function Reveal({ cat, newSpecies, onDone, onOpen }: { cat: CatCard; newSpecies: boolean; onDone: () => void; onOpen: () => void }) {
  const { width } = useWindowDimensions();
  const flip = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const r = RARITY[cat.rarity];
  const sp = speciesOf(cat);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(flip, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, [flip, pop]);

  const rotateY = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '0deg'] });
  const scale = flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.85, 1] });
  const cardW = Math.min(width - 80, 320);

  return (
    <View style={styles.reveal}>
      <Animated.View style={{ alignItems: 'center', opacity: pop }}>
        <Text style={[styles.revealKicker, { color: r.color }]}>YAKALANDI!</Text>
        <Text style={styles.revealSpecies}>
          {dexNo(sp.no)} · {sp.name} · {r.label}
        </Text>
        {newSpecies && (
          <View style={styles.newSpecies}>
            <Ionicons name="sparkles" size={14} color="#fff" />
            <Text style={styles.newSpeciesText}>YENİ TÜR · Kedidex'e eklendi</Text>
          </View>
        )}
      </Animated.View>
      <Animated.View style={{ transform: [{ perspective: 1000 }, { rotateY }, { scale }] }}>
        <CatCardView cat={cat} width={cardW} />
      </Animated.View>
      <Animated.View style={[styles.reward, { opacity: pop, transform: [{ scale: pop }] }]}>
        <Ionicons name="heart" size={18} color={C.primary} />
        <Text style={styles.rewardText}>+{r.points} mama puanı kazandın</Text>
      </Animated.View>
      <View style={{ flexDirection: 'row', gap: 10, width: cardW }}>
        <Button title="Karta bak" variant="ghost" onPress={onOpen} style={{ flex: 1 }} />
        <Button title="Devam et" onPress={onDone} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, maxWidth: 520, width: '100%', alignSelf: 'center' },
  photoEmpty: {
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFFBF5',
  },
  emptyTitle: { fontFamily: F.display, fontSize: 22, color: C.ink, marginTop: 10 },
  emptyText: { fontFamily: F.body, fontSize: 14, color: C.inkSoft, textAlign: 'center', marginTop: 4 },
  photo: { width: '100%', borderRadius: 24, backgroundColor: C.cream },
  retake: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(43,33,64,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  retakeText: { color: '#fff', fontFamily: F.bodyBold, fontSize: 13 },
  label: { fontFamily: F.displayMed, fontSize: 18, color: C.ink, marginTop: 22, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    width: '22%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#FFFBF5',
    borderWidth: 2,
    borderColor: C.line,
  },
  optionWide: { width: '47%', flexDirection: 'row', justifyContent: 'center' },
  optionOn: { borderColor: C.primary, backgroundColor: '#FFE9DA' },
  optionText: { fontFamily: F.bodyBold, fontSize: 12, color: C.ink },
  swatchRow: { flexDirection: 'row' },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#00000025' },
  eye: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#2B2140' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, backgroundColor: '#FFFBF5', borderRadius: 16, padding: 14 },
  rowTitle: { fontFamily: F.bodyBold, fontSize: 15, color: C.ink },
  rowSub: { fontFamily: F.body, fontSize: 12, color: C.inkSoft },
  nameRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#FFFBF5',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.line,
    paddingHorizontal: 14,
    height: 52,
    fontFamily: F.bodyBold,
    fontSize: 16,
    color: C.ink,
  },
  dice: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFE9DA', alignItems: 'center', justifyContent: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, padding: 12, borderRadius: 16, borderWidth: 2, backgroundColor: '#fff' },
  previewText: { fontFamily: F.bodyBold, fontSize: 15 },
  error: { color: C.danger, fontFamily: F.bodyBold, marginTop: 12 },
  reveal: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, backgroundColor: C.bg },
  revealKicker: { fontFamily: F.display, fontSize: 30, letterSpacing: 1 },
  revealSpecies: { fontFamily: F.bodyBold, fontSize: 14, color: C.inkSoft },
  newSpecies: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.teal, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
  newSpeciesText: { fontFamily: F.bodyBold, fontSize: 12, color: '#fff', letterSpacing: 0.5 },
  matchTitle: { fontFamily: F.display, fontSize: 28, color: C.ink, textAlign: 'center', marginTop: 8 },
  matchSub: { fontFamily: F.body, fontSize: 14, color: C.inkSoft, textAlign: 'center' },
  compare: { flexDirection: 'row', gap: 12, alignSelf: 'stretch', marginVertical: 6 },
  compareImg: { width: '100%', aspectRatio: 3 / 4, borderRadius: 18, backgroundColor: C.cream },
  compareLabel: { fontFamily: F.bodyBold, fontSize: 13, color: C.ink, textAlign: 'center' },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, ...shadow },
  rewardText: { fontFamily: F.bodyBold, fontSize: 15, color: C.ink },
});
