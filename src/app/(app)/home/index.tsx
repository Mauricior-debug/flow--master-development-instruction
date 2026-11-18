import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Ring } from '../../../components/charts';
import { BrandHeader, Card, EmptyState, LoadingBlock, PrimaryButton, Screen, T } from '../../../components/ui';
import { useStore } from '../../../data/store';
import { currentStreak, dueToday, greeting, habitIconName, nameFromEmail, todayKey } from '../../../lib/engine';
import { weekScore } from '../../../lib/stats';
import { voiceTitle } from '../../../lib/pace/voices';
import { useTheme } from '../../../theme/Theme';

const avatar = require('../../../../assets/images/avatar-profile.jpg');
const tones = ['#B6FF00', '#3D8BFF', '#F5B942'] as const;

export default function HomeScreen() {
  const store = useStore();
  const router = useRouter();
  const colors = useTheme();
  if (!store.ready) return <Screen tab><LoadingBlock label="Loading your habits" /></Screen>;
  if (!store.user) return <Screen tab><LoadingBlock label="Sending you to sign in" /></Screen>;
  const userId = store.user.id;
  const habits = store.db.habits.filter((item) => item.userId === userId);
  const checkins = store.db.checkins.filter((item) => item.userId === userId);
  const today = todayKey();
  const todays = habits.filter((habit) => dueToday(habit, checkins, today));
  const score = weekScore(habits, checkins, today);
  const ratio = score.scheduled ? score.done / score.scheduled : 0;
  const unread = store.db.notices.filter((item) => item.userId === userId && !item.read).length;
  const active = store.db.runs.find((item) => item.userId === userId && item.session.status !== 'finished');

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
              <Image source={store.user.avatarUri ? { uri: store.user.avatarUri } : avatar} style={{ width: 40, height: 40, borderRadius: 20 }} accessibilityLabel={`${nameFromEmail(store.user.email)} profile photo`} />
            </Pressable>
          </View>
        }
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <T size={32} weight="bold">{`${greeting()} 👋`}</T>
          <T color={colors.muted} style={{ marginTop: 4 }}>Small steps. Big progress.</T>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/home/plan')} style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center' }, pressed && { opacity: 0.7 }]}>
          <T color={colors.link} weight="semibold">Today’s plan</T>
        </Pressable>
      </View>
      <Card style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <T weight="semibold">This Week</T>
          <T size={32} weight="bold" style={{ marginTop: 4 }}>{`${score.done}/${Math.max(score.scheduled, score.done)}`}</T>
          <T color={colors.muted}>Habits completed</T>
        </View>
        <Ring progress={ratio} label={`${Math.round(ratio * 100)}%`} />
      </Card>
      <Pressable accessibilityRole="button" onPress={() => router.push('/companion/studio')} style={({ pressed }) => [{ marginTop: 12, opacity: pressed ? 0.85 : 1 }]}>
        <Card>
          <T size={13} color={colors.link} weight="semibold">YOUR PACE COMPANION</T>
          <T weight="bold" style={{ marginTop: 4 }}>{`Voice: ${voiceTitle(store.coach.voiceId)} · ${store.coach.coachingTone ?? 'Friendly'} · ${store.coach.speak}`}</T>
          <T color={colors.muted}>Ready for your next run</T>
        </Card>
      </Pressable>
      {active ? (
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/live', params: { id: active.id } })} style={({ pressed }) => [{ marginTop: 12, opacity: pressed ? 0.8 : 1 }]}>
          <Card style={{ borderColor: colors.lime }}>
            <T weight="bold">Run in progress</T>
            <T color={colors.muted}>Tap to resume. The session is saved on this phone.</T>
          </Card>
        </Pressable>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 10 }}>
        <T size={22} weight="bold">Today’s Habits</T>
        <Pressable accessibilityRole="button" onPress={() => router.push('/home/all')} style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center' }, pressed && { opacity: 0.7 }]}>
          <T color={colors.muted}>See all</T>
        </Pressable>
      </View>
      {todays.length === 0 ? (
        <EmptyState title="Nothing due today" detail="Add a habit, or enjoy the day off. Your streak stays put until tomorrow." action="Add Habit" onAction={() => router.push('/home/add')} />
      ) : (
        todays.map((habit, index) => {
          const check = checkins.find((item) => item.habitId === habit.id && item.date === today);
          const dates = checkins
            .filter((item) => item.habitId === habit.id && (habit.goalType === 'break' ? item.status === 'skipped' : item.status === 'done'))
            .map((item) => item.date);
          const streak = currentStreak(dates, today);
          const done = check?.status === 'done' || (habit.goalType === 'break' && check?.status === 'skipped');
          const label = habit.goalType === 'break' ? (done ? 'Skipped' : 'Skip') : done ? 'Done' : 'Done';
          return (
            <Pressable key={habit.id} accessibilityRole="button" accessibilityLabel={habit.name} onPress={() => router.push(`/home/habit/${habit.id}`)} style={({ pressed }) => [{ marginBottom: 10, opacity: pressed ? 0.85 : 1 }]}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: tones[index % tones.length] }}>
                  <Ionicons name={habitIconName(habit.name)} size={20} color="#10210A" />
                </View>
                <View style={{ flex: 1 }}>
                  <T weight="bold">{habit.name}</T>
                  <T size={13} color={colors.muted}>{`${streak} day streak`}</T>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={done ? `Undo ${habit.name}` : `Mark ${habit.name} ${label}`}
                  onPress={() => {
                    if (!done) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    store.setCheckin(habit.id, habit.goalType === 'break' ? 'skipped' : 'done');
                  }}
                  style={({ pressed }) => [{
                    minHeight: 44,
                    minWidth: 84,
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done ? colors.surface2 : habit.goalType === 'break' && !done ? colors.surface2 : colors.lime,
                    opacity: pressed ? 0.75 : 1,
                  }]}
                >
                  <T weight="bold" color={done || habit.goalType === 'break' ? colors.text : colors.onLime}>{label}</T>
                </Pressable>
              </Card>
            </Pressable>
          );
        })
      )}
      <View style={{ marginTop: 8 }}>
        <PrimaryButton label="+  Add Habit" onPress={() => router.push('/home/add')} />
      </View>
      {!store.coach.goal ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/setup/goals')} style={({ pressed }) => [{ marginTop: 14, opacity: pressed ? 0.8 : 1 }]}>
          <Card>
            <T weight="bold">Set a running goal</T>
            <T color={colors.muted} style={{ marginTop: 4 }}>Optional. Habits already work without it. A goal builds your four-week plan.</T>
          </Card>
        </Pressable>
      ) : null}
    </Screen>
  );
}
