import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { BrandHeader, Card, EmptyState, LoadingBlock, PrimaryButton, Screen, T } from '../../../components/ui';
import { xpTotal, useStore } from '../../../data/store';
import { averagePace, formatDistance, formatPace, greeting, levelFor, nameFromEmail, PERSONALITIES, runTotals, todayKey } from '../../../lib/engine';
import { voiceLabel, resolveVoice, readVoiceKeys } from '../../../lib/voice';
import { useTheme } from '../../../theme/Theme';

const avatar = require('../../../../assets/images/avatar-profile.png');
const companion = require('../../../../assets/images/splash-mark.png');

export default function HomeScreen() {
  const store = useStore();
  const router = useRouter();
  const colors = useTheme();
  if (!store.ready) return <Screen tab><LoadingBlock label="Getting your coach ready" /></Screen>;
  if (!store.user) return <Screen tab><LoadingBlock label="Sending you to sign in" /></Screen>;
  const userId = store.user.id;
  const today = todayKey();
  const workout = store.db.workouts.find((item) => item.userId === userId && item.date === today);
  const active = store.db.runs.find((item) => item.userId === userId && item.session.status !== 'finished');
  const totals = runTotals(store.db.runs, userId);
  const recent = store.db.runs.filter((item) => item.userId === userId && item.session.status === 'finished').slice(0, 3);
  const unread = store.db.notices.filter((item) => item.userId === userId && !item.read).length;
  const level = levelFor(xpTotal(store.db, userId));
  const personality = PERSONALITIES.find((item) => item.id === store.coach.personality);
  const voice = voiceLabel(resolveVoice(store.coach.voiceProvider, readVoiceKeys()));
  const unit = store.settings.units;

  return (
    <Screen tab>
      <BrandHeader
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push('/home/notifications')} style={({ pressed }) => [{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.6 }]}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              {unread ? <View style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }} /> : null}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => router.push('/profile')} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <Image source={store.user.avatarUri ? { uri: store.user.avatarUri } : avatar} style={{ width: 40, height: 40, borderRadius: 20 }} contentFit="cover" accessibilityLabel={`${nameFromEmail(store.user.email)} profile photo`} />
            </Pressable>
          </View>
        }
      />
      <T size={32} weight="bold">{greeting()}</T>
      <T color={colors.muted} style={{ marginTop: 4 }}>Never run alone again.</T>

      {active ? (
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/live', params: { id: active.id } })} style={({ pressed }) => [{ marginTop: 18, opacity: pressed ? 0.85 : 1 }]}>
          <Card style={{ borderColor: colors.lime, backgroundColor: colors.limeDim }}>
            <T size={13} color={colors.link} weight="semibold">RUN IN PROGRESS</T>
            <T size={22} weight="bold" style={{ marginTop: 4 }}>{active.goalLabel}</T>
            <T color={colors.muted} style={{ marginTop: 4 }}>Tap to resume. Distance already recorded stays on this phone.</T>
          </Card>
        </Pressable>
      ) : null}

      <View style={{ marginTop: 18, borderRadius: 28, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.stroke, padding: 18 }}>
        <T size={13} color={colors.link} weight="semibold">{workout ? 'TODAY' : 'FREE RUN'}</T>
        <T size={28} weight="bold" style={{ marginTop: 6 }}>{workout ? workout.title : 'Start when you are ready'}</T>
        <T color={colors.muted} style={{ marginTop: 8 }}>
          {workout ? workout.detail : 'GPS keeps recording even if the coach goes quiet.'}
        </T>
        <View style={{ marginTop: 16 }}>
          <PrimaryButton
            label={active ? 'Resume run' : workout?.kind === 'rest' ? 'Run anyway' : 'Start run'}
            icon="play"
            onPress={() => (active ? router.push({ pathname: '/live', params: { id: active.id } }) : router.push('/run'))}
          />
        </View>
        {!store.coach.goal ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/setup/goals')} style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center', marginTop: 8 }, pressed && { opacity: 0.7 }]}>
            <T color={colors.link} weight="semibold" center>Set a running goal</T>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => router.push('/home/plan')} style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center', marginTop: 8 }, pressed && { opacity: 0.7 }]}>
            <T color={colors.link} weight="semibold" center>Today’s plan</T>
          </Pressable>
        )}
      </View>

      <View style={{ marginTop: 14, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.stroke, flexDirection: 'row' }}>
        <Meter label="This week" value={`${formatDistance(totals.weekM, unit)} ${unit}`} />
        <Meter label="Runs" value={String(totals.finished)} />
        <Meter label="Level" value={String(level.level)} last />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16, padding: 12, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.stroke }}>
        <Image source={companion} style={{ width: 72, height: 72 }} contentFit="contain" accessibilityLabel="PACE AI companion" />
        <View style={{ flex: 1 }}>
          <T weight="bold">{personality?.title ?? 'Your coach'}</T>
          <T size={13} color={colors.muted} style={{ marginTop: 2 }}>{voice}</T>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/companion')} style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }, pressed && { opacity: 0.7 }]}>
          <T color={colors.link} weight="semibold">Open</T>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
        <T size={22} weight="bold">Recent runs</T>
        <Pressable accessibilityRole="button" onPress={() => router.push('/progress/runs')} style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center' }, pressed && { opacity: 0.7 }]}>
          <T color={colors.muted}>History</T>
        </Pressable>
      </View>
      {recent.length === 0 ? (
        <EmptyState title="No saved runs yet" detail="Finish a GPS or practice run and it will show here with pace and distance." />
      ) : (
        recent.map((run) => (
          <Pressable key={run.id} accessibilityRole="button" onPress={() => router.push(`/run/${run.id}`)} style={({ pressed }) => [{ marginTop: 10, opacity: pressed ? 0.85 : 1 }]}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <T weight="bold">{run.goalLabel}</T>
                <T size={13} color={colors.muted} style={{ marginTop: 4 }}>{run.session.source === 'practice' ? 'Practice route' : 'GPS route'}</T>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <T weight="bold">{`${formatDistance(run.session.distanceM, unit)} ${unit}`}</T>
                <T size={13} color={colors.muted}>{`${formatPace(averagePace(run.session, unit))} /${unit}`}</T>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

function Meter({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const colors = useTheme();
  return (
    <View style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 12, borderRightWidth: last ? 0 : 1, borderRightColor: colors.stroke }}>
      <T size={12} color={colors.muted}>{label}</T>
      <T size={18} weight="bold" style={{ marginTop: 4 }}>{value}</T>
    </View>
  );
}
