import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { BrandHeader, EmptyState, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { ago, type Notice } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

const icons: Record<Notice['type'], keyof typeof Ionicons.glyphMap> = {
  reminder: 'flame-outline',
  streak: 'trophy-outline',
  progress: 'stats-chart-outline',
  challenge: 'star-outline',
  system: 'water-outline',
};

export default function NotificationsScreen() {
  const store = useAuthGuard();
  const colors = useTheme();
  const notices = store.user ? store.db.notices.filter((item) => item.userId === store.user?.id) : [];
  return (
    <Screen tab>
      <BrandHeader
        back
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Clear all" onPress={() => store.clearNotices()} style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center' }, pressed && { opacity: 0.6 }]}>
            <T color={colors.link} weight="semibold">Clear all</T>
          </Pressable>
        }
      />
      <T size={32} weight="bold" style={{ marginBottom: 12 }}>Notifications</T>
      {notices.length === 0 ? (
        <EmptyState title="You’re up to date" detail="Saved runs and coach notes will show up here." />
      ) : (
        notices.map((notice) => (
          <Pressable key={notice.id} accessibilityRole="button" accessibilityLabel={notice.title} onPress={() => store.markNotice(notice.id)} style={({ pressed }) => [{ marginBottom: 10, opacity: pressed ? 0.8 : 1 }]}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icons[notice.type]} size={18} color={colors.lime} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <T weight="bold" style={{ flex: 1 }}>{notice.title}</T>
                  <T size={12} color={colors.faint}>{ago(notice.createdAt)}</T>
                </View>
                <T size={13} color={colors.muted}>{notice.message}</T>
              </View>
              {!notice.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lime }} /> : null}
            </View>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
