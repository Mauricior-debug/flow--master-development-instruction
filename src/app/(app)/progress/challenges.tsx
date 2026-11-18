import { View } from 'react-native';

import { BrandHeader, Card, PrimaryButton, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { CHALLENGES, currentStreak, monthKm, showUpDates } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

export default function ChallengesScreen() {
  const store = useAuthGuard();
  const colors = useTheme();
  const userId = store.user?.id ?? '';
  const km = monthKm(store.db.runs, userId);
  const streak = currentStreak(showUpDates(store.db.checkins, store.db.runs, userId));
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Challenges</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>Progress uses your own runs and check-ins. Rewards are applied once by the rules.</T>
      {CHALLENGES.map((challenge) => {
        const joined = store.db.challenges.find((item) => item.userId === userId && item.challengeId === challenge.id);
        const progress = challenge.id === '30k-month' ? Math.min(30, km) : Math.min(7, streak);
        const target = challenge.id === '30k-month' ? 30 : 7;
        const width = `${Math.round((progress / target) * 100)}%` as `${number}%`;
        return (
          <Card key={challenge.id} style={{ marginBottom: 12 }}>
            <T size={20} weight="bold">{challenge.title}</T>
            <T color={colors.muted} style={{ marginTop: 6 }}>{challenge.detail}</T>
            <T weight="semibold" style={{ marginTop: 10 }}>{`${challenge.id === '30k-month' ? progress.toFixed(1) : progress} / ${target}`}</T>
            <View style={{ height: 8, borderRadius: 99, backgroundColor: colors.surface2, marginTop: 8 }}>
              <View style={{ width, height: 8, borderRadius: 99, backgroundColor: colors.lime }} />
            </View>
            <T color={colors.link} style={{ marginTop: 8 }}>{`Reward ${challenge.reward}`}</T>
            <T color={colors.muted}>{joined?.rewarded ? 'Reward granted' : joined ? 'Joined' : 'Not joined'}</T>
            {!joined ? (
              <View style={{ marginTop: 12 }}>
                <PrimaryButton label="Join" onPress={() => store.joinChallenge(challenge.id)} />
              </View>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
