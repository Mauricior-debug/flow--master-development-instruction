import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BrandHeader, Card, Screen, SecondaryButton, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { ensureNotificationPermission } from '../../../lib/reminders';
import { useTheme } from '../../../theme/Theme';

export default function DevicesScreen() {
  useAuthGuard();
  const colors = useTheme();
  const [location, setLocation] = useState('Checking…');
  const [notes, setNotes] = useState('Checking…');

  useEffect(() => {
    void Location.getForegroundPermissionsAsync()
      .then((result) => setLocation(result.granted ? 'Allowed while using the app' : 'Not allowed'))
      .catch(() => setLocation('Unavailable'));
    void ensureNotificationPermission()
      .then((granted) => setNotes(granted ? 'Allowed' : 'Not allowed'))
      .catch(() => setNotes('Unavailable'));
  }, []);

  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Connected Devices</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>What this phone can share with PACE AI right now.</T>
      <Card style={{ marginBottom: 10 }}>
        <T weight="bold">Location</T>
        <T color={colors.muted} style={{ marginTop: 4 }}>{location}</T>
        <View style={{ marginTop: 12 }}>
          <SecondaryButton
            label="Request location"
            onPress={() => {
              void Location.requestForegroundPermissionsAsync()
                .then((result) => setLocation(result.granted ? 'Allowed while using the app' : 'Denied'))
                .catch(() => setLocation('Unavailable'));
            }}
          />
        </View>
      </Card>
      <Card style={{ marginBottom: 10 }}>
        <T weight="bold">Notifications</T>
        <T color={colors.muted} style={{ marginTop: 4 }}>{notes}</T>
      </Card>
      <Card style={{ marginBottom: 10 }}>
        <T weight="bold">Apple Health and Health Connect</T>
        <T color={colors.muted} style={{ marginTop: 4 }}>
          Coming soon. Runs you record here still save on this phone without Apple Health or Health Connect.
        </T>
      </Card>
      <Card>
        <T weight="bold">Heart rate</T>
        <T color={colors.muted} style={{ marginTop: 4 }}>No heart-rate source is connected, so PACE AI does not show a number.</T>
      </Card>
    </Screen>
  );
}
