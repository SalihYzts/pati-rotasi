// Günlük hedef halkası ve 7 günlük adım grafiği.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { fmt } from '@/components/ui';
import { C, F } from '@/theme';

export function GoalRing({ value, goal, size = 176, stroke = 14 }: { value: number; goal: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, goal ? value / goal : 0);
  const done = value >= goal;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.cream} strokeWidth={stroke} fill="none" />
        {pct > 0 && (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={done ? C.teal : C.primary}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        )}
      </Svg>
      {done && <Ionicons name="checkmark-circle" size={22} color={C.teal} style={{ marginBottom: 2 }} />}
      <Text style={styles.ringValue}>{fmt.int(value)}</Text>
      <Text style={styles.ringLabel}>/ {fmt.int(goal)} adım</Text>
      <Text style={[styles.ringPct, { color: done ? C.teal : C.primary }]}>%{Math.round(pct * 100)}</Text>
    </View>
  );
}

const DAY_SHORT = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
const DAY_LONG = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

/** Son 7 günün adımları; tek seri, hedef ince bir referans çizgisi. Dokununca o günün değeri görünür. */
export function WeekChart({ days, goal }: { days: { key: string; steps: number }[]; goal: number }) {
  const [sel, setSel] = useState(days.length - 1);
  const H = 132;
  const max = Math.max(goal * 1.15, ...days.map((d) => d.steps), 1);
  const goalY = H - (goal / max) * H;
  const picked = days[sel];
  const pickedDate = new Date(picked.key + 'T12:00:00');

  return (
    <View>
      <View style={styles.readout}>
        <Text style={styles.readoutDay}>{sel === days.length - 1 ? 'Bugün' : DAY_LONG[pickedDate.getDay()]}</Text>
        <Text style={styles.readoutValue}>{fmt.int(picked.steps)} adım</Text>
      </View>
      <View style={[styles.plot, { height: H }]}>
        <View style={[styles.goalLine, { top: goalY }]} />
        <Text style={[styles.goalLabel, { top: goalY - 16 }]}>Hedef {fmt.int(goal)}</Text>
        {days.map((d, i) => {
          const h = Math.max(3, (d.steps / max) * H);
          const on = i === sel;
          return (
            <Pressable
              key={d.key}
              accessibilityLabel={`${DAY_LONG[new Date(d.key + 'T12:00:00').getDay()]}: ${fmt.int(d.steps)} adım`}
              onPress={() => setSel(i)}
              style={styles.slot}>
              <View style={[styles.bar, { height: h, opacity: on ? 1 : 0.55 }]} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.axis}>
        {days.map((d, i) => {
          const date = new Date(d.key + 'T12:00:00');
          return (
            <View key={d.key} style={styles.axisCell}>
              <Text style={[styles.axisText, i === sel && { color: C.ink }]}>{DAY_SHORT[date.getDay()]}</Text>
              {d.steps >= goal ? <Ionicons name="checkmark" size={12} color={C.teal} /> : <View style={{ height: 12 }} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ringValue: { fontFamily: F.display, fontSize: 34, color: C.ink, lineHeight: 38 },
  ringLabel: { fontFamily: F.body, fontSize: 13, color: C.inkSoft },
  ringPct: { fontFamily: F.bodyBold, fontSize: 13, marginTop: 2 },
  readout: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  readoutDay: { fontFamily: F.bodyBold, fontSize: 13, color: C.inkSoft },
  readoutValue: { fontFamily: F.display, fontSize: 18, color: C.ink },
  plot: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: C.line },
  goalLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.inkSoft, opacity: 0.35 },
  goalLabel: { position: 'absolute', right: 0, fontFamily: F.bodyBold, fontSize: 10, color: C.inkSoft },
  slot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '62%', maxWidth: 24, backgroundColor: C.primary, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axis: { flexDirection: 'row', marginTop: 6 },
  axisCell: { flex: 1, alignItems: 'center', gap: 1 },
  axisText: { fontFamily: F.bodyBold, fontSize: 11, color: C.inkSoft },
});
