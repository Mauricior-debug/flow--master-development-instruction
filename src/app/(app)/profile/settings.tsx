import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { BrandHeader, Card, LinkRow, Screen, T, ToggleRow } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { askConfirm } from '../../../lib/confirm';
import { requestPermission } from '../../../lib/permissions';
import { useTheme } from '../../../theme/Theme';

export default function SettingsScreen() {
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Settings</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>Customize your experience.</T>
      <View style={{ gap: 12 }}>
        <Card>
          <ToggleRow
            icon="notifications-outline"
            title="Notifications"
            detail="Push reminders and alerts"
            value={store.settings.notificationsEnabled}
            onValueChange={(value) => {
              if (!value) {
                store.updateSettings({ notificationsEnabled: false });
                return;
              }
              void requestPermission('notifications').then((result) => {
                store.updateSettings({ notificationsEnabled: result.granted });
              });
            }}
          />
        </Card>
        <Card>
          <ToggleRow
            icon="moon-outline"
            title="Dark Mode"
            detail="Use dark theme (recommended)"
            value={store.settings.theme === 'dark'}
            onValueChange={(value) => store.updateSettings({ theme: value ? 'dark' : 'light' })}
          />
        </Card>
        <Card>
          <ToggleRow
            icon="speedometer-outline"
            title="Kilometres"
            detail={store.settings.units === 'km' ? 'Distances show in kilometres' : 'Distances show in miles'}
            value={store.settings.units === 'km'}
            onValueChange={(value) => store.updateSettings({ units: value ? 'km' : 'mi' })}
          />
        </Card>
        <LinkRow icon="shield-checkmark-outline" title="Privacy Policy" detail="Read our privacy policy" onPress={() => router.push('/privacy')} />
        <LinkRow icon="watch-outline" title="Connected devices" detail="Location, health, and what this phone can do" onPress={() => router.push('/profile/devices')} />
        <LinkRow icon="card-outline" title="Subscription" detail="Free, and what a production build can bill" onPress={() => router.push('/profile/subscription')} />
        <LinkRow icon="download-outline" title="Export my data" detail="A file of habits, runs, and messages" onPress={() => router.push('/profile/export')} />
        <LinkRow
          icon="trash-outline"
          title="Delete Account"
          detail="Permanently remove your data"
          destructive
          onPress={() => {
            askConfirm({
              title: 'Delete your account?',
              message: 'Habits, runs, messages, and settings on this device will be removed. This cannot be undone.',
              confirmLabel: 'Delete account',
              destructive: true,
              run: async () => {
                await store.deleteAccount();
                router.replace('/');
              },
            });
            router.push('/confirm-sheet');
          }}
        />
      </View>
    </Screen>
  );
}
