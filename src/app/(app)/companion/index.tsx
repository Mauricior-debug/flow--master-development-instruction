import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { BrandHeader, Card, LinkRow, PrimaryButton, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { xpTotal } from '../../../data/store';
import { levelFor, PERSONALITIES } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

const hero = require('../../../../assets/images/onboarding-hero.jpg');

export default function CompanionHomeScreen() {
  const store = useAuthGuard();
  const router = useRouter();
  const colors = useTheme();
  const userId = store.user?.id ?? '';
  const level = levelFor(xpTotal(store.db, userId));
  const personality = PERSONALITIES.find((item) => item.id === store.coach.personality);
  const cosmetics = [
    { title: 'Trail suit', need: 1 },
    { title: 'Lime visor', need: 3 },
    { title: 'Night visor', need: 5 },
  ];
  return (
    <Screen tab>
      <BrandHeader />
      <T size={32} weight="bold">Companion</T>
      <T color={colors.muted} style={{ marginTop: 6 }}>Never run alone again.</T>
      <Image source={hero} style={{ width: '100%', height: 230 }} contentFit="contain" accessibilityLabel="Your PACE AI companion" />
      <Card>
        <T size={13} color={colors.link} weight="semibold">PERSONALITY</T>
        <T size={22} weight="bold" style={{ marginTop: 4 }}>{personality?.title ?? 'The Motivator'}</T>
        <T color={colors.muted} style={{ marginTop: 4 }}>{personality?.detail}</T>
        <T weight="semibold" style={{ marginTop: 12 }}>{`Level ${level.level}`}</T>
        <View style={{ height: 8, borderRadius: 99, backgroundColor: colors.surface2, marginTop: 8 }}>
          <View style={{ width: `${Math.round((level.into / level.span) * 100)}%`, height: 8, borderRadius: 99, backgroundColor: colors.lime }} />
        </View>
        <T size={13} color={colors.muted} style={{ marginTop: 6 }}>{`${level.into} / ${level.span} XP to the next level`}</T>
      </Card>
      <View style={{ marginTop: 12, gap: 10 }}>
        <PrimaryButton label="Talk" onPress={() => router.push('/voice-sheet')} />
        <LinkRow icon="options-outline" title="Voice and personality" detail="Tone, how often they speak, speaker" onPress={() => router.push('/companion/voice')} />
        <LinkRow icon="chatbubbles-outline" title="Conversation history" detail="What you and the coach have said" onPress={() => router.push('/companion/history')} />
        <LinkRow icon="person-outline" title="Meet your companion" onPress={() => router.push('/meet')} />
        <LinkRow icon="flag-outline" title="Running goal" onPress={() => router.push('/setup/goals')} />
      </View>
      <T size={20} weight="bold" style={{ marginTop: 20, marginBottom: 8 }}>Cosmetics</T>
      {cosmetics.map((item) => {
        const open = level.level >= item.need;
        return (
          <Card key={item.title} style={{ marginBottom: 8 }}>
            <T weight="bold">{item.title}</T>
            <T color={open ? colors.link : colors.muted}>{open ? 'Unlocked by your level' : `Unlocks at level ${item.need}`}</T>
          </Card>
        );
      })}
    </Screen>
  );
}
