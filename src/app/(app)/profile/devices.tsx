import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { BrandHeader, Card, Screen, SecondaryButton, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { openSystemSettings, readPermissions, requestPermission, type PermissionKind, type PermissionState } from '../../../lib/permissions';
import { useTheme } from '../../../theme/Theme';

const SETTINGS_KEY: Record<PermissionKind, 'locationAllowed' | 'cameraAllowed' | 'microphoneAllowed' | 'photosAllowed' | 'notificationsEnabled'> = {
  location: 'locationAllowed',
  notifications: 'notificationsEnabled',
  camera: 'cameraAllowed',
  microphone: 'microphoneAllowed',
  photos: 'photosAllowed',
};

export default function DevicesScreen() {
  const store = useAuthGuard();
  const colors = useTheme();
  const [rows, setRows] = useState<PermissionState[]>([]);

  const refresh = useCallback(() => {
    void readPermissions().then(setRows);
  }, []);

  useFocusEffect(refresh);

  async function ask(kind: PermissionKind) {
    const next = await requestPermission(kind);
    setRows((current) => current.map((row) => (row.kind === kind ? next : row)));
    store.updateSettings({ [SETTINGS_KEY[kind]]: next.granted });
  }

  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Connected Devices</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>Allow location, alerts, the camera, the microphone, or photos. The choice is saved on this phone.</T>
      {rows.map((row) => (
        <Card key={row.kind} style={{ marginBottom: 10 }}>
          <T weight="bold">{row.title}</T>
          <T color={colors.muted} style={{ marginTop: 4 }}>{row.detail}</T>
          <T color={row.granted ? colors.link : colors.muted} weight="semibold" style={{ marginTop: 8 }}>{row.status}</T>
          <View style={{ marginTop: 12, gap: 8 }}>
            <SecondaryButton label={row.granted ? 'Allowed' : `Allow ${row.title}`} onPress={() => void ask(row.kind)} />
            {row.status === 'Denied' ? <SecondaryButton label="Open Settings" onPress={openSystemSettings} /> : null}
          </View>
        </Card>
      ))}
      <Card style={{ marginBottom: 10 }}>
        <T weight="bold">Apple Health and Health Connect</T>
        <T color={colors.muted} style={{ marginTop: 4 }}>
          Not available in this Expo Go build. Runs you record here still save on this phone.
        </T>
      </Card>
      <Card>
        <T weight="bold">Heart rate</T>
        <T color={colors.muted} style={{ marginTop: 4 }}>No heart-rate source is connected, so PACE AI does not show a number.</T>
      </Card>
    </Screen>
  );
}
