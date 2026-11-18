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
    title: 'Small Steps\nBig Changes',
    body: 'Build habits, stay consistent, and become your best self with AI by your side.',
    image: require('../../assets/images/onboarding-hero.jpg'),
    alt: 'Companion celebrating habit check-ins',
    points: [
      ['flag-outline', 'Track your habits'],
      ['sparkles-outline', 'Get AI-powered insights'],
      ['ribbon-outline', 'Stay motivated daily'],
    ],
  },
  {
    title: 'Never Run\nAlone Again',
    body: 'An intelligent running companion that coaches, motivates and runs with you.',
    image: require('../../assets/images/splash-hero.jpg'),
    alt: 'Companion running beside habit tiles',
    points: [
      ['navigate-outline', 'GPS distance and pace'],
      ['chatbubble-ellipses-outline', 'A coach who talks with you'],
      ['lock-closed-outline', 'Routes stay on your phone'],
    ],
  },
  {
    title: 'A Coach\nWho Fits You',
    body: 'Choose a personality, a goal, and how often you want to hear from them.',
    image: require('../../assets/images/onboarding-hero.jpg'),
    alt: 'Companion with a progress ring',
    points: [
      ['happy-outline', 'Motivator, Strategist, or Calm'],
      ['volume-medium-outline', 'You choose when they speak'],
      ['camera-outline', 'Camera stays optional'],
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
            <T weight="semibold" color={colors.muted}>
              Skip
            </T>
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
            <T size={34} weight="bold" center>
              {slide.title}
            </T>
            <T color={colors.muted} center style={{ marginTop: 10 }}>
              {slide.body}
            </T>
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
          <T color={colors.link} weight="semibold" onPress={() => router.push('/privacy')}>
            Privacy Policy
          </T>
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
