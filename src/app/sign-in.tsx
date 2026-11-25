import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BrandHeader, ErrorText, Field, PrimaryButton, Screen, T } from '../components/ui';
import { useStore } from '../data/store';
import { useTheme } from '../theme/Theme';

export default function SignInScreen() {
  const colors = useTheme();
  const router = useRouter();
  const store = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shown, setShown] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <Screen>
      <BrandHeader back />
      <T size={32} weight="bold">
        Welcome Back
      </T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 22 }}>
        Your runs and coach are on this phone.
      </T>
      <View style={{ gap: 12 }}>
        <Field icon="mail-outline" value={email} onChangeText={setEmail} placeholder="Email" keyboard="email-address" />
        <Field icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="Password" secure shown={shown} onToggleSecure={() => setShown((value) => !value)} />
        <Pressable accessibilityRole="button" accessibilityLabel="Forgot password" onPress={() => router.push({ pathname: '/reset-password', params: { email } })} style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center' }, pressed && { opacity: 0.7 }]}>
          <T weight="bold" color={colors.link}>
            Forgot Password?
          </T>
        </Pressable>
        <ErrorText>{error}</ErrorText>
        <PrimaryButton
          label="Sign In"
          loading={loading}
          onPress={() => {
            setLoading(true);
            setError('');
            void store.signIn(email, password).then((result) => {
              setLoading(false);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.replace('/home');
            });
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.stroke }} />
        <T color={colors.faint}>or</T>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.stroke }} />
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/sign-up')} style={({ pressed }) => [{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.7 }]}>
        <T color={colors.muted}>
          Don’t have an account? <T color={colors.link} weight="bold">Sign Up</T>
        </T>
      </Pressable>
    </Screen>
  );
}
