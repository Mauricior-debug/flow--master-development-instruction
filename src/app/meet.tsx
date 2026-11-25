import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { BrandHeader, PrimaryButton, Screen, T } from '../components/ui';
import { useTheme } from '../theme/Theme';

const hero = require('../../assets/images/splash-mark.png');

export default function MeetScreen() {
  const colors = useTheme();
  const router = useRouter();
  return (
    <Screen>
      <BrandHeader back />
      <T size={32} weight="bold" center>Meet your companion</T>
      <T color={colors.muted} center style={{ marginTop: 8 }}>
        A friendly running partner with the judgement of a coach. Plans and runs stay on this phone.
      </T>
      <Image source={hero} style={{ width: '100%', height: 320 }} contentFit="contain" accessibilityLabel="PACE AI companion" />
      <PrimaryButton label="Choose a personality" onPress={() => router.push('/setup/personality')} />
    </Screen>
  );
}
