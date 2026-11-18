import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { Image } from 'expo-image';

import { ErrorText, PrimaryButton, Screen, T, Wordmark } from '../components/ui';
import { useStore } from '../data/store';
import { useTheme } from '../theme/Theme';

const hero = require('../../assets/images/splash-hero.jpg');

export default function SplashScreen() {
  const store = useStore();
  const router = useRouter();
  const colors = useTheme();
  const progress = useRef(new Animated.Value(0.08)).current;
  const [failed, setFailed] = useState(false);
  const routed = useRef(false);

  useEffect(() => {
    Animated.timing(progress, { toValue: store.ready ? 1 : 0.45, duration: 900, useNativeDriver: false }).start();
  }, [progress, store.ready]);

  useEffect(() => {
    if (!store.ready || routed.current) return;
    if (store.error) {
      setFailed(true);
      return;
    }
    const timer = setTimeout(() => {
      routed.current = true;
      if (!store.db.onboardingSeen) router.replace('/onboarding');
      else if (!store.user) router.replace('/sign-in');
      else router.replace('/home');
    }, 700);
    return () => clearTimeout(timer);
  }, [router, store.db.onboardingSeen, store.error, store.ready, store.user]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['8%', '100%'] });

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <Wordmark subtitle="Your AI Habit Companion" />
        </View>
        <Image
          source={hero}
          style={{ width: '100%', height: 320 }}
          contentFit="contain"
          accessibilityLabel="PACE AI companion running with habit icons"
        />
        <View style={{ gap: 16, marginBottom: 12 }}>
          <T size={32} weight="bold" center>
            Build Better Habits{'\n'}A Brighter You
          </T>
          {failed ? (
            <View style={{ gap: 12 }}>
              <ErrorText>{store.error}</ErrorText>
              <PrimaryButton
                label="Try again"
                onPress={() => {
                  setFailed(false);
                  routed.current = false;
                  void store.hydrate();
                }}
              />
            </View>
          ) : (
            <>
              <View style={{ height: 8, borderRadius: 99, backgroundColor: colors.surface2, overflow: 'hidden' }}>
                <Animated.View style={{ height: 8, width, backgroundColor: colors.lime, borderRadius: 99 }} />
              </View>
              <T color={colors.muted} center>
                Loading your better tomorrow...
              </T>
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}
