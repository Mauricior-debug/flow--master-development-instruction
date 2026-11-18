import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BrandHeader, ErrorText, Field, PrimaryButton, Screen, T } from '../components/ui';
import { useStore } from '../data/store';
import { asText } from '../lib/engine';
import { useTheme } from '../theme/Theme';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string; current?: string }>();
  const colors = useTheme();
  const router = useRouter();
  const store = useStore();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [shown, setShown] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const needsCurrent = params.current === '1';

  return (
    <Screen>
      <BrandHeader back />
      <T size={32} weight="bold">
        {needsCurrent ? 'Change Password' : 'Reset Password'}
      </T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 22 }}>
        {needsCurrent
          ? 'Confirm your current password, then choose a new one.'
          : 'This device holds your account. Choose a new password. No email is sent.'}
      </T>
      {done ? (
        <View style={{ gap: 16 }}>
          <T>Your password is updated. Sign in with the new one.</T>
          <PrimaryButton label="Back to Sign In" onPress={() => router.replace('/sign-in')} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Field icon="mail-outline" value={email} onChangeText={setEmail} placeholder="Email" keyboard="email-address" />
          {needsCurrent ? (
            <Field icon="lock-closed-outline" value={current} onChangeText={setCurrent} placeholder="Current password" secure shown={shown} onToggleSecure={() => setShown((value) => !value)} />
          ) : null}
          <Field icon="lock-closed-outline" value={next} onChangeText={setNext} placeholder="New password" secure shown={shown} onToggleSecure={() => setShown((value) => !value)} />
          <Field icon="lock-closed-outline" value={confirm} onChangeText={setConfirm} placeholder="Confirm new password" secure />
          <ErrorText>{error}</ErrorText>
          <PrimaryButton
            label="Save Password"
            loading={loading}
            onPress={() => {
              setLoading(true);
              void store.resetPassword(email, next, confirm, needsCurrent ? current : undefined).then((result) => {
                setLoading(false);
                if (!result.ok) setError(asText(result.error));
                else setDone(true);
              });
            }}
          />
        </View>
      )}
    </Screen>
  );
}
