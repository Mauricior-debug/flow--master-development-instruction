import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { View } from 'react-native';

import { BrandHeader, Card, PrimaryButton, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { useTheme } from '../../../theme/Theme';

export default function ExportScreen() {
  const store = useAuthGuard();
  const colors = useTheme();
  const [message, setMessage] = useState('');
  const json = store.user ? store.exportData() : '{}';
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Export data</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>
        Runs, your plan, and messages. Password hashes are left out.
      </T>
      <Card>
        <T size={13} color={colors.muted}>{`${json.length} characters ready`}</T>
      </Card>
      {message ? <T style={{ marginTop: 12 }}>{message}</T> : null}
      <View style={{ marginTop: 16 }}>
        <PrimaryButton
          label="Share export"
          onPress={() => {
            void (async () => {
              try {
                const file = new File(Paths.cache, 'pace-ai-export.json');
                file.create({ overwrite: true });
                file.write(json);
                const can = await Sharing.isAvailableAsync();
                if (!can) {
                  setMessage('Sharing is not available here. The export was written in the app cache.');
                  return;
                }
                await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'PACE AI export' });
                setMessage('Export ready to share.');
              } catch {
                setMessage('The export could not be shared. Your data is still on this device.');
              }
            })();
          }}
        />
      </View>
    </Screen>
  );
}
