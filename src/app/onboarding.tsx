import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { BrandHeader, ErrorText, PrimaryButton, Screen, T } from '../components/ui';
import { useStore } from '../data/store';
import { useTheme } from '../theme/Theme';

const slides = [
  {
    title: 'Never Run\nAlone Again',
    body: 'GPS, pace, and a coach who runs with you.',
    image: require('../../assets/images/splash-mark.png'),
    alt: 'PACE AI companion',
    points: [
      ['navigate-outline', 'GPS distance, pace, and route'],
      ['chatbubble-ellipses-outline', 'A coach you can interrupt'],
      ['lock-closed-outline', 'Routes stay on your phone'],
    ],
  },
  {
    title: 'Talk while\nyou run',
    body: 'Ask about pace, distance, or a walk break. Tracking continues if the coach goes quiet.',
    image: require('../../assets/images/onboarding-hero.png'),
    alt: 'Companion illustration',
    points: [
      ['mic-outline', 'Ask a question mid-run'],
      ['speedometer-outline', 'Pace and split feedback'],
      ['shield-checkmark-outline', 'Stop if something hurts'],
    ],
  },
  {
    title: 'A plan that\nfits you',
    body: 'Choose a goal, how often you can run, and the coach you want to hear.',
    image: require('../../assets/images/onboarding-hero.png'),
    alt: 'Companion with a training plan',
    points: [
      ['happy-outline', 'Motivator, Strategist, or Calm'],
      ['volume-medium-outline', 'You choose when they speak'],
      ['calendar-outline', 'Four weeks, with rest days'],
    ],
  },
] as const;

export default function OnboardingScreen() {
  const colors = useTheme();
  const router = useRouter();
  const store = useStore();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const page = Math.min(width, 520);

  function continueToSignUp(agreed: boolean) {
    store.markOnboardingSeen(agreed);
    router.replace('/sign-up');
  }

  return (
    <Screen>
      <BrandHeader
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Skip" onPress={() => continueToSignUp(false)} style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center' }, pressed && { opacity: 0.6 }]}>
            <T weight="semibold" color={colors.muted}>Skip</T>
          </Pressable>
        }
      />
      <ScrollView
        ref={scroller as never}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / page);
          if (next !== index) setIndex(next);
        }}
        scrollEventThrottle={16}
      >
        {slides.map((slide) => (
          <View key={slide.title} style={{ width: page - 40, paddingRight: 8 }}>
            <T size={34} weight="bold" center>{slide.title}</T>
            <T color={colors.muted} center style={{ marginTop: 10 }}>{slide.body}</T>
            <Image source={slide.image} style={{ width: '100%', height: 250, marginTop: 8 }} contentFit="contain" accessibilityLabel={slide.alt} />
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4 }}>
        {slides.map((slide, dot) => (
          <View key={slide.title} style={{ width: dot === index ? 18 : 8, height: 8, borderRadius: 99, backgroundColor: dot === index ? colors.lime : colors.surface2 }} />
        ))}
      </View>
      <View style={{ marginTop: 16, borderRadius: 20, backgroundColor: colors.surface, padding: 16, gap: 14 }}>
        {slides[index].points.map(([icon, label]) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name={icon} size={18} color={colors.lime} />
            <T weight="semibold">{label}</T>
          </View>
        ))}
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consent }}
        onPress={() => setConsent((value) => !value)}
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, marginTop: 14 }, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name={consent ? 'checkbox' : 'square-outline'} size={22} color={consent ? colors.lime : colors.muted} />
        <T>
          I agree to the{' '}
          <T color={colors.link} weight="semibold" onPress={() => router.push('/privacy')}>Privacy Policy</T>
        </T>
      </Pressable>
      <ErrorText>{error}</ErrorText>
      <View style={{ marginTop: 12 }}>
        <PrimaryButton
          label="Get Started"
          onPress={() => {
            if (!consent) {
              setError('Agree to the Privacy Policy to continue.');
              return;
            }
            continueToSignUp(true);
          }}
        />
      </View>
    </Screen>
  );
}
