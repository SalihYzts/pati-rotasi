// Yeni rozet kazanılınca çıkan kutlama penceresi.
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';

import { BADGES } from '@/lib/badges';
import { useApp } from '@/store/AppStore';
import { C, F } from '@/theme';
import { Button } from './ui';

export default function BadgeCelebration() {
  const { freshBadges, clearFreshBadges } = useApp();
  const badge = BADGES.find((b) => b.id === freshBadges[0]);
  const scale = useRef(new Animated.Value(0.3)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!badge) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    scale.setValue(0.3);
    spin.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
    ]).start();
  }, [badge, scale, spin]);

  if (!badge) return null;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] });

  return (
    <Modal transparent animationType="fade" visible onRequestClose={clearFreshBadges}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.kicker}>YENİ ROZET!</Text>
          <Animated.View style={{ transform: [{ scale }, { rotate }] }}>
            <Image source={badge.image} style={styles.img} contentFit="contain" />
          </Animated.View>
          <Text style={styles.title}>{badge.title}</Text>
          <Text style={styles.desc}>{badge.desc}</Text>
          {freshBadges.length > 1 && <Text style={styles.more}>+{freshBadges.length - 1} rozet daha</Text>}
          <Button title="Harika!" onPress={clearFreshBadges} style={{ alignSelf: 'stretch', marginTop: 18 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,33,64,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  sheet: { backgroundColor: C.bg, borderRadius: 28, padding: 24, alignItems: 'center', width: '100%', maxWidth: 360 },
  kicker: { fontFamily: F.bodyBold, color: C.primary, letterSpacing: 2, fontSize: 13 },
  img: { width: 180, height: 180, marginVertical: 10 },
  title: { fontFamily: F.display, fontSize: 26, color: C.ink },
  desc: { fontFamily: F.body, fontSize: 15, color: C.inkSoft, textAlign: 'center', marginTop: 4 },
  more: { fontFamily: F.bodyBold, color: C.teal, marginTop: 8 },
});
