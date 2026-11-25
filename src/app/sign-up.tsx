import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BrandHeader, ErrorText, Field, PrimaryButton, Screen, T } from '../components/ui';
import { useStore } from '../data/store';
import { useTheme } from '../theme/Theme';

export default function SignUpScreen() {
  const colors = useTheme();
  const router = useRouter();
  const store = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <Screen>
      <BrandHeader back />
      <T size={32} weight="bold">
        Create Your Account
      </T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 22 }}>
        A coach for the runs you are about to do.
      </T>
      <View style={{ gap: 12 }}>
        <Field icon="mail-outline" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboard="email-address" />
        <Field icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="Password" secure shown={showPassword} onToggleSecure={() => setShowPassword((value) => !value)} />
        <Field icon="lock-closed-outline" value={confirm} onChangeText={setConfirm} placeholder="Confirm password" secure shown={showConfirm} onToggleSecure={() => setShowConfirm((value) => !value)} />
        <ErrorText>{error}</ErrorText>
        <PrimaryButton
          label="Sign Up"
          loading={loading}
          onPress={() => {
            setLoading(true);
            setError('');
            void store.signUp(email, password, confirm).then((result) => {
              setLoading(false);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.replace('/setup/goals');
            });
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.stroke }} />
        <T color={colors.faint}>or</T>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.stroke }} />
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/sign-in')} style={({ pressed }) => [{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.7 }]}>
        <T color={colors.muted}>
          Already have an account? <T color={colors.link} weight="bold">Sign In</T>
        </T>
      </Pressable>
    </Screen>
  );
}
