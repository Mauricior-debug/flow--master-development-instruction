import { Ionicons } from '@expo/vector-icons';
import { useRouter, useScrollToTop } from 'expo-router';
import { forwardRef, isValidElement, useEffect, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '../data/store';
import { asText } from '../lib/engine';
import { font, space } from '../theme/tokens';
import { useTheme } from '../theme/Theme';

const logo = require('../../assets/images/logo.png');

import { Image } from 'expo-image';

function safeNode(children: unknown): ReactNode {
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (isValidElement(children)) return children;
  if (Array.isArray(children)) return children.map((child) => safeNode(child));
  return asText(children);
}

export function T({
  children,
  size = 16,
  weight = 'regular',
  color,
  style,
  center,
  onPress,
}: {
  children: unknown;
  size?: number;
  weight?: keyof typeof font;
  color?: string;
  style?: StyleProp<TextStyle>;
  center?: boolean;
  onPress?: () => void;
}) {
  const colors = useTheme();
  return (
    <Text
      onPress={onPress}
      style={[
        {
          color: color ?? colors.text,
          fontFamily: font[weight],
          fontSize: size,
          lineHeight: Math.round(size * 1.3),
          textAlign: center ? 'center' : 'left',
        },
        style,
      ]}
    >
      {safeNode(children)}
    </Text>
  );
}

export function Screen({
  children,
  scroll = true,
  footer,
  tab,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  tab?: boolean;
}) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef<ScrollView | null>(null);
  useScrollToTop(ref as never);
  // Native tabs float over the screen. The home-indicator inset does not include that bar.
  const bottom = tab ? insets.bottom + 108 : insets.bottom + 16;
  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8, paddingBottom: bottom }}>
        {children}
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={ref as never}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        scrollIndicatorInsets={{ bottom }}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: bottom + 28, paddingHorizontal: space.lg }}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View style={{ paddingHorizontal: space.lg, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.bg }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function BrandHeader({
  back,
  right,
  onBack,
}: {
  back?: boolean;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const colors = useTheme();
  const router = useRouter();
  return (
    <View style={styles.header}>
      <View style={styles.side}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (onBack ? onBack() : router.canGoBack() ? router.back() : router.replace('/'))}
            style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.brand}>
        <Image source={logo} style={styles.logo} contentFit="cover" accessibilityLabel="PACE AI runner mark" />
        <T size={22} weight="bold">
          PACE
        </T>
        <T size={22} weight="bold" color={colors.lime} style={{ marginLeft: 4 }}>
          AI
        </T>
      </View>
      <View style={[styles.side, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export function Wordmark({ subtitle }: { subtitle?: string }) {
  const colors = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={styles.brand}>
        <Image source={logo} style={{ width: 36, height: 36, borderRadius: 10 }} contentFit="cover" accessibilityLabel="PACE AI" />
        <T size={28} weight="bold">
          PACE
        </T>
        <T size={28} weight="bold" color={colors.lime} style={{ marginLeft: 6 }}>
          AI
        </T>
      </View>
      {subtitle ? (
        <T size={16} color={colors.muted} center>
          {subtitle}
        </T>
      ) : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: colors.lime, opacity: disabled ? 0.45 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
      ]}
    >
      {loading ? <ActivityIndicator color={colors.onLime} /> : null}
      {icon && !loading ? <Ionicons name={icon} size={18} color={colors.onLime} /> : null}
      <T size={17} weight="bold" color={colors.onLime}>
        {loading ? 'Please wait…' : label}
      </T>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondary,
        {
          backgroundColor: destructive ? colors.dangerBg : colors.surface2,
          borderColor: destructive ? colors.danger : colors.stroke,
          opacity: pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <T size={17} weight="bold" color={destructive ? colors.danger : colors.text}>
        {label}
      </T>
    </Pressable>
  );
}

export function Field({
  icon,
  value,
  onChangeText,
  placeholder,
  secure,
  shown,
  onToggleSecure,
  keyboard,
  autoCapitalize = 'none',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secure?: boolean;
  shown?: boolean;
  onToggleSecure?: () => void;
  keyboard?: 'email-address' | 'default';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  const colors = useTheme();
  return (
    <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.stroke }]}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        secureTextEntry={secure && !shown}
        keyboardType={keyboard === 'email-address' ? 'email-address' : 'default'}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={{ flex: 1, color: colors.text, fontFamily: font.regular, fontSize: 16, minHeight: 52 }}
      />
      {secure ? (
        <Pressable accessibilityRole="button" accessibilityLabel={shown ? 'Hide password' : 'Show password'} onPress={onToggleSecure} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
          <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Choice({
  label,
  icon,
  selected,
  onPress,
  wide,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
  wide?: boolean;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        wide && { flexDirection: 'row', justifyContent: 'flex-start', gap: 10, paddingHorizontal: 14 },
        {
          flex: 1,
          backgroundColor: selected ? colors.limeDim : colors.surface,
          borderColor: selected ? colors.lime : colors.stroke,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={selected ? colors.lime : colors.text} />
      <T size={14} weight="semibold" center={!wide} style={wide ? undefined : { marginTop: 6 }}>
        {label}
      </T>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.stroke }, style]}>{children}</View>;
}

export function ToggleRow({
  icon,
  title,
  detail,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const colors = useTheme();
  return (
    <View style={styles.toggle}>
      <Ionicons name={icon} size={20} color={colors.text} />
      <View style={{ flex: 1 }}>
        <T weight="semibold">{title}</T>
        {detail ? (
          <T size={13} color={colors.muted}>
            {detail}
          </T>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.stroke, true: colors.lime }}
        thumbColor={colors.white}
      />
    </View>
  );
}

export function LinkRow({
  icon,
  title,
  detail,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.linkRow,
        { backgroundColor: colors.surface, borderColor: destructive ? colors.dangerStroke : colors.stroke, opacity: pressed ? 0.78 : 1 },
      ]}
    >
      <Ionicons name={icon} size={20} color={destructive ? colors.danger : colors.text} />
      <View style={{ flex: 1 }}>
        <T weight="semibold" color={destructive ? colors.danger : colors.text}>
          {title}
        </T>
        {detail ? (
          <T size={13} color={colors.muted}>
            {detail}
          </T>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

export function ErrorText({ children }: { children: unknown }) {
  const colors = useTheme();
  if (!asText(children)) return null;
  return (
    <T size={14} color={colors.danger}>
      {children}
    </T>
  );
}

export function EmptyState({ title, detail, action, onAction }: { title: string; detail: string; action?: string; onAction?: () => void }) {
  const colors = useTheme();
  return (
    <Card>
      <T size={18} weight="bold">
        {title}
      </T>
      <T color={colors.muted} style={{ marginTop: 6 }}>
        {detail}
      </T>
      {action && onAction ? (
        <View style={{ marginTop: 16 }}>
          <PrimaryButton label={action} onPress={onAction} />
        </View>
      ) : null}
    </Card>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  const colors = useTheme();
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center', gap: 12 }}>
      <ActivityIndicator color={colors.lime} />
      <T color={colors.muted}>{label}</T>
    </View>
  );
}

export function useAuthGuard() {
  const store = useStoreSafe();
  const router = useRouter();
  useEffect(() => {
    if (store.ready && !store.user) router.replace('/sign-in');
  }, [router, store.ready, store.user]);
  return store;
}

function useStoreSafe() {
  return useStore();
}

export const ScreenScroll = forwardRef<ScrollView, { children: ReactNode }>(function ScreenScroll({ children }, ref) {
  return <ScrollView ref={ref as never}>{children}</ScrollView>;
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, minHeight: 44 },
  side: { flex: 1, minHeight: 44, justifyContent: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 28, height: 28, borderRadius: 8, marginRight: 8 },
  hit: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  primary: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  secondary: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 18,
  },
  field: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  choice: {
    minHeight: 84,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  card: { borderRadius: 22, borderWidth: 1, padding: 16 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  linkRow: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
