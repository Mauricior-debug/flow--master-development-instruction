import { requestRecordingPermissionsAsync } from 'expo-audio';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BrandHeader, Card, PrimaryButton, Screen, SecondaryButton, T } from '../../components/ui';
import { ensureNotificationPermission } from '../../lib/reminders';
import { useTheme } from '../../theme/Theme';

type Row = { title: string; detail: string; status: string };

export default function PermissionsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([
    { title: 'Location', detail: 'Used when you start a GPS run, including in the background if you allow it.', status: 'Not asked' },
    { title: 'Microphone', detail: 'Used when you talk to your coach during a run.', status: 'Not asked' },
    { title: 'Notifications', detail: 'Optional reminders for a planned run. A run does not need them.', status: 'Not asked' },
  ]);

  function setStatus(title: string, status: string) {
    setRows((current) => current.map((row) => (row.title === title ? { ...row, status } : row)));
  }

  async function ask(title: string) {
    try {
      if (title === 'Location') {
        const result = await Location.requestForegroundPermissionsAsync();
        setStatus(title, result.granted ? 'Allowed' : 'Denied');
      } else if (title === 'Notifications') {
        const granted = await ensureNotificationPermission();
        setStatus(title, granted ? 'Allowed' : 'Denied');
      } else {
        const result = await requestRecordingPermissionsAsync();
        setStatus('Microphone', result.granted ? 'Allowed' : 'Denied');
      }
    } catch {
      setStatus(title, 'Unavailable');
    }
  }

  return (
    <Screen>
      <BrandHeader back />
      <T size={32} weight="bold">Permissions</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>
        Location records the run. The microphone is only for talking to your coach. You can still run if you skip either one.
      </T>
      {rows.map((row) => (
        <Card key={row.title} style={{ marginBottom: 10 }}>
          <T weight="bold">{row.title}</T>
          <T color={colors.muted} style={{ marginTop: 4 }}>{row.detail}</T>
          <T color={colors.link} weight="semibold" style={{ marginTop: 8 }}>{row.status}</T>
          <View style={{ marginTop: 12 }}>
            <SecondaryButton label={`Allow ${row.title}`} onPress={() => void ask(row.title)} />
          </View>
        </Card>
      ))}
      <T size={13} color={colors.faint} style={{ marginBottom: 12 }}>Camera form review is coming soon and is never required to record a run.</T>
      <PrimaryButton label="Done" onPress={() => router.replace('/home')} />
    </Screen>
  );
}
