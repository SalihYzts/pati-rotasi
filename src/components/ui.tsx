import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { C, F, shadow } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'teal' | 'ghost' | 'dark';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = { primary: C.primary, teal: C.teal, ghost: 'transparent', dark: C.ink }[variant];
  const fg = variant === 'ghost' ? C.ink : '#fff';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        variant === 'ghost' && { borderWidth: 2, borderColor: C.line },
        variant !== 'ghost' && shadow,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={20} color={fg} />}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Title({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.title}>{children}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

export function Stat({ icon, value, label, color = C.ink }: { icon: IconName; value: string; label: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ProgressBar({ value, goal, color = C.primary }: { value: number; goal: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, goal ? value / goal : 0));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

export const fmt = {
  int: (n: number) => Math.round(n).toLocaleString('tr-TR'),
  km: (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(m >= 10_000 ? 0 : 1).replace('.', ',')} km` : `${Math.round(m)} m`),
  date: (t: number) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
  duration: (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  },
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 22,
    borderRadius: 18,
  },
  btnText: { fontFamily: F.bodyBold, fontSize: 16 },
  title: { fontFamily: F.display, fontSize: 30, color: C.ink, letterSpacing: -0.3 },
  sub: { fontFamily: F.body, fontSize: 15, color: C.inkSoft, marginTop: 2 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontFamily: F.display, fontSize: 20 },
  statLabel: { fontFamily: F.body, fontSize: 12, color: C.inkSoft },
  card: { backgroundColor: C.card, borderRadius: 22, padding: 16, ...shadow },
  track: { height: 10, borderRadius: 6, backgroundColor: C.cream, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
});
