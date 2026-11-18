import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Pressable, View } from 'react-native';

import { T } from './ui';
import { useTheme } from '../theme/Theme';

type Props = {
  time: string;
  distance: string;
  pace: string;
  companion: string;
  onUnlock: () => void;
  onPause: () => void;
};

function useHold(action: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return {
    onPressIn: () => {
      timer.current = setTimeout(action, 700);
    },
    onPressOut: () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    },
  };
}

export function RunLock({ time, distance, pace, companion, onUnlock, onPause }: Props) {
  const colors = useTheme();
  const unlock = useHold(onUnlock);
  const pause = useHold(onPause);
  return (
    <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.bg, padding: 24, justifyContent: 'space-between', zIndex: 30 }}>
      <View style={{ marginTop: 36, gap: 8 }}>
        <T size={13} weight="bold" color={colors.link}>PACE AI</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="lock-closed" size={18} color={colors.lime} />
          <T weight="bold">Run protected</T>
        </View>
        <T color={colors.muted}>The phone’s own lock button still works. This only blocks accidental taps.</T>
      </View>
      <View style={{ gap: 8 }}>
        <T size={56} weight="bold">{time}</T>
        <T size={22} weight="semibold">{distance}</T>
        <T color={colors.muted}>{pace}</T>
        <T color={colors.link} weight="semibold">{companion}</T>
      </View>
      <View style={{ gap: 12, marginBottom: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Hold to unlock the run screen" {...unlock} style={({ pressed }) => [{ minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 }]}>
          <T weight="bold">Hold to unlock</T>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Hold to pause the run" {...pause} style={({ pressed }) => [{ minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lime, opacity: pressed ? 0.75 : 1 }]}>
          <T weight="bold" color={colors.onLime}>Hold to pause</T>
        </Pressable>
      </View>
    </View>
  );
}
