import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BrandHeader, Card, PrimaryButton, Screen, SecondaryButton, T } from '../../components/ui';
import { useStore } from '../../data/store';
import { openSystemSettings, readPermissions, requestPermission, type PermissionKind, type PermissionState } from '../../lib/permissions';
import { useTheme } from '../../theme/Theme';

const SETTINGS_KEY: Record<PermissionKind, 'locationAllowed' | 'cameraAllowed' | 'microphoneAllowed' | 'photosAllowed' | 'notificationsEnabled'> = {
  location: 'locationAllowed',
  notifications: 'notificationsEnabled',
  camera: 'cameraAllowed',
  microphone: 'microphoneAllowed',
  photos: 'photosAllowed',
};

export default function PermissionsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const store = useStore();
  const [rows, setRows] = useState<PermissionState[]>([]);
  const [note, setNote] = useState('');

  useEffect(() => {
    void readPermissions().then(setRows);
  }, []);

  async function ask(kind: PermissionKind) {
    const next = await requestPermission(kind);
    setRows((current) => current.map((row) => (row.kind === kind ? next : row)));
    if (store.user) store.updateSettings({ [SETTINGS_KEY[kind]]: next.granted });
    setNote(next.granted ? `${next.title} is allowed and saved on this phone.` : next.canAskAgain ? `${next.title} was not allowed.` : `${next.title} is blocked. Open Settings to allow it.`);
  }

  return (
    <Screen>
      <BrandHeader back />
      <T size={32} weight="bold">Permissions</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>
        Allow what you want to use. Habits still work if you skip these. Each choice is saved on this phone.
      </T>
      {rows.map((row) => (
        <Card key={row.kind} style={{ marginBottom: 10 }}>
          <T weight="bold">{row.title}</T>
          <T color={colors.muted} style={{ marginTop: 4 }}>{row.detail}</T>
          <T color={row.granted ? colors.link : colors.muted} weight="semibold" style={{ marginTop: 8 }}>{row.status}</T>
          <View style={{ marginTop: 12, gap: 8 }}>
            <SecondaryButton label={row.granted ? `${row.title} allowed` : `Allow ${row.title}`} onPress={() => void ask(row.kind)} />
            {row.status === 'Denied' ? <SecondaryButton label="Open Settings" onPress={openSystemSettings} /> : null}
          </View>
        </Card>
      ))}
      {note ? <T style={{ marginBottom: 12 }}>{note}</T> : null}
      <PrimaryButton label="Save and continue" onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
    </Screen>
  );
}
