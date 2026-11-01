// İlk açılış tanıtımı: üç sayfa.
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { useApp } from '@/store/AppStore';
import { C, F } from '@/theme';

const PAGES = [
  {
    image: require('../../assets/img/onb_walk.png'),
    title: 'Gerçek kedileri yakala',
    text: 'Sokakta gördüğün kediyi fotoğrafla, kartı koleksiyonuna girsin. Kedidex\'teki 32 türü tamamla; üç renkliler ve mavi gözlüler nadirdir!',
  },
  {
    image: require('../../assets/img/onb_fog.png'),
    title: 'Sisi kaldır',
    text: 'Haritan sisle kaplı. Yürüdükçe sis dağılır, mahallenin bilinmeyen sokakları açılır.',
  },
  {
    image: require('../../assets/img/onb_shelter.png'),
    title: 'Adımın mama olsun',
    text: 'Her 100 adım 1 mama puanı. Puanlarını gerçek barınaklardaki kedilere mama olarak bağışla.',
  },
];

export default function Onboarding() {
  const [i, setI] = useState(0);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { completeOnboarding } = useApp();
  const page = PAGES[i];
  const last = i === PAGES.length - 1;
  const imgW = Math.min(width - 32, 480);

  function finish() {
    completeOnboarding();
    router.replace('/');
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.top}>
        <Text style={styles.brand}>Pati Rotası</Text>
        {!last && (
          <Pressable onPress={finish} hitSlop={10}>
            <Text style={styles.skip}>Geç</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.body}>
        <Image key={i} source={page.image} transition={250} style={{ width: imgW, height: Math.min(imgW * 0.75, height * 0.42), borderRadius: 28 }} contentFit="cover" />
        <Text style={styles.title}>{page.title}</Text>
        <Text style={styles.text}>{page.text}</Text>
      </View>
      <View style={styles.dots}>
        {PAGES.map((_, k) => (
          <View key={k} style={[styles.dot, k === i && styles.dotOn]} />
        ))}
      </View>
      <Button title={last ? 'Hadi başlayalım' : 'Devam'} icon={last ? 'paw' : 'arrow-forward'} onPress={() => (last ? finish() : setI(i + 1))} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontFamily: F.display, fontSize: 22, color: C.primary },
  skip: { fontFamily: F.bodyBold, color: C.inkSoft, fontSize: 15 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { fontFamily: F.display, fontSize: 30, color: C.ink, textAlign: 'center', marginTop: 18 },
  text: { fontFamily: F.body, fontSize: 16, color: C.inkSoft, textAlign: 'center', lineHeight: 23, paddingHorizontal: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.line },
  dotOn: { width: 26, backgroundColor: C.primary },
});
