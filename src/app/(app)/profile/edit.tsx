import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { BrandHeader, ErrorText, Field, LinkRow, PrimaryButton, Screen, SecondaryButton, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { useTheme } from '../../../theme/Theme';

const avatar = require('../../../../assets/images/avatar-edit.jpg');

export default function EditProfileScreen() {
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  const [email, setEmail] = useState(store.user?.email ?? '');
  const [photo, setPhoto] = useState<string | null>(store.user?.avatarUri ?? null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function pick() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is off. The current photo stays.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
  }

  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Edit Profile</T>
      <T color={colors.muted} style={{ marginTop: 6 }}>Update your account details.</T>
      <View style={{ alignItems: 'center', marginVertical: 18 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Change photo" onPress={() => void pick()} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
          <Image source={photo ? { uri: photo } : avatar} style={{ width: 140, height: 140, borderRadius: 70 }} contentFit="cover" accessibilityLabel="Profile photo" />
          <View style={{ position: 'absolute', right: 0, bottom: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg }}>
            <Ionicons name="camera" size={18} color={colors.text} />
          </View>
        </Pressable>
        <T color={colors.muted} style={{ marginTop: 8 }}>Tap to change photo</T>
      </View>
      <T weight="semibold" style={{ marginBottom: 8 }}>Email</T>
      <Field icon="mail-outline" value={email} onChangeText={setEmail} placeholder="Email" keyboard="email-address" />
      <View style={{ marginTop: 12 }}>
        <LinkRow icon="lock-closed-outline" title="Change Password" onPress={() => router.push({ pathname: '/reset-password', params: { email, current: '1' } })} />
      </View>
      <ErrorText>{error}</ErrorText>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        <View style={{ flex: 1 }}><SecondaryButton label="Cancel" onPress={() => router.back()} /></View>
        <View style={{ flex: 1.3 }}>
          <PrimaryButton
            label="Save Changes"
            loading={loading}
            onPress={() => {
              setLoading(true);
              void store.updateProfile(email, photo).then((result) => {
                setLoading(false);
                if (!result.ok) setError(result.error);
                else router.back();
              });
            }}
          />
        </View>
      </View>
    </Screen>
  );
}
