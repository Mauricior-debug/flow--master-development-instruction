import { View } from 'react-native';

import { BrandHeader, Card, Screen, SecondaryButton, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { useTheme } from '../../../theme/Theme';

export default function SubscriptionScreen() {
  const store = useAuthGuard();
  const colors = useTheme();
  const plan = store.db.entitlements.find((item) => item.userId === store.user?.id);
  const plus = plan?.plan === 'plus';
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Subscription</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>
        App Store and Google Play billing needs a production build. This preview cannot charge you.
      </T>
      <Card style={{ marginBottom: 12, borderColor: !plus ? colors.lime : colors.stroke }}>
        <T weight="bold">Free</T>
        <T color={colors.muted} style={{ marginTop: 4 }}>Habits, GPS runs, on-device coach, and a four-week plan.</T>
        <T color={colors.link} style={{ marginTop: 8 }}>{!plus ? 'Current plan' : 'Included'}</T>
      </Card>
      <Card style={{ borderColor: plus ? colors.lime : colors.stroke }}>
        <T weight="bold">PACE Plus</T>
        <T color={colors.muted} style={{ marginTop: 4 }}>The same training tools, with a preview flag so the entitlement can be tested on this device. It is not a store purchase.</T>
        <T color={colors.link} style={{ marginTop: 8 }}>{plus ? 'Preview entitlement on' : 'Not purchased'}</T>
        <View style={{ marginTop: 12 }}>
          <SecondaryButton label={plus ? 'Return to Free' : 'Turn on preview entitlement'} onPress={() => store.setPreviewPlan(plus ? 'free' : 'plus')} />
        </View>
      </Card>
    </Screen>
  );
}
