import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { BrandHeader, LinkRow, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { nameFromEmail } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

const avatar = require('../../../../assets/images/avatar-profile.jpg');

export default function ProfileScreen() {
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  if (!store.user) return <Screen tab><T>Sign in to see your profile.</T></Screen>;
  const photo = store.user.avatarUri ? { uri: store.user.avatarUri } : avatar;
  return (
    <Screen tab>
      <BrandHeader back={false} />
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <Image source={photo} style={{ width: 140, height: 140, borderRadius: 70 }} contentFit="cover" accessibilityLabel="Profile photo" />
        <T size={28} weight="bold" style={{ marginTop: 14 }}>{nameFromEmail(store.user.email)}</T>
        <T color={colors.muted}>{store.user.email}</T>
      </View>
      <View style={{ gap: 12, marginTop: 28 }}>
        <LinkRow icon="person-outline" title="Edit Profile" onPress={() => router.push('/profile/edit')} />
        <LinkRow icon="settings-outline" title="Settings" onPress={() => router.push('/profile/settings')} />
        <LinkRow icon="log-out-outline" title="Sign Out" destructive onPress={() => { void store.signOut().then(() => router.replace('/')); }} />
      </View>
    </Screen>
  );
}
