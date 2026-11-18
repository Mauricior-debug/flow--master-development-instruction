import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PrimaryButton, SecondaryButton, T } from '../components/ui';
import { clearConfirm, readConfirm } from '../lib/confirm';
import { useTheme } from '../theme/Theme';

export default function ConfirmSheet() {
  const router = useRouter();
  const colors = useTheme();
  const request = readConfirm();
  const [loading, setLoading] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 20, gap: 12 }}>
      <T size={28} weight="bold">{request?.title ?? 'Confirm'}</T>
      <T color={colors.muted}>{request?.message ?? 'Nothing is waiting to confirm.'}</T>
      {request ? (
        <PrimaryButton
          label={request.confirmLabel}
          loading={loading}
          onPress={() => {
            setLoading(true);
            void Promise.resolve(request.run()).then(() => {
              if (request.destructive) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              clearConfirm();
              setLoading(false);
              router.back();
            });
          }}
        />
      ) : null}
      <SecondaryButton
        label="Cancel"
        onPress={() => {
          clearConfirm();
          router.back();
        }}
      />
    </View>
  );
}
