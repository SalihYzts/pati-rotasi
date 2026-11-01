// Rozet ızgarası: kazanılanlar tarihli, kilitliler ilerleme çubuğuyla.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { ProgressBar, fmt } from '@/components/ui';
import { bestStreak } from '@/lib/activity';
import { BADGES, badgeProgress } from '@/lib/badges';
import type { AppState } from '@/store/AppStore';
import { C, F } from '@/theme';

export default function BadgesGrid({ state }: { state: AppState }) {
  const progress = {
    cats: state.cats,
    cellCount: state.cells.length,
    totalSteps: state.totalSteps,
    donatedPoints: state.donatedPoints,
    totalDistanceM: state.totalDistanceM,
    bestStreak: bestStreak(state.days, state.goal),
  };
  return (
    <View style={styles.badges}>
      {BADGES.map((b) => {
        const at = state.badges[b.id];
        const { value, goal } = badgeProgress(b.id, progress);
        return (
          <View key={b.id} style={styles.badge}>
            <Image source={b.image} style={[styles.badgeImg, !at && styles.locked]} contentFit="contain" />
            {!at && (
              <View style={styles.lock}>
                <Ionicons name="lock-closed" size={12} color="#fff" />
              </View>
            )}
            <Text numberOfLines={1} style={styles.badgeTitle}>
              {b.title}
            </Text>
            {at ? (
              <Text style={styles.badgeMeta}>{fmt.date(at)}</Text>
            ) : (
              <View style={{ width: '80%', marginTop: 4 }}>
                <ProgressBar value={value} goal={goal} color={C.teal} />
              </View>
            )}
            <Text numberOfLines={2} style={styles.badgeDesc}>
              {b.desc}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function earnedCount(state: AppState) {
  return BADGES.filter((b) => state.badges[b.id]).length;
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { width: '31%', flexGrow: 1, alignItems: 'center', backgroundColor: '#FFFBF5', borderRadius: 18, padding: 10, borderWidth: 1.5, borderColor: C.line },
  badgeImg: { width: 72, height: 72 },
  locked: { opacity: 0.28 },
  lock: { position: 'absolute', top: 38, backgroundColor: C.ink, borderRadius: 10, padding: 4 },
  badgeTitle: { fontFamily: F.bodyBold, fontSize: 13, color: C.ink, marginTop: 4 },
  badgeMeta: { fontFamily: F.body, fontSize: 10, color: C.teal, marginTop: 2 },
  badgeDesc: { fontFamily: F.body, fontSize: 10, color: C.inkSoft, textAlign: 'center', marginTop: 4 },
});
