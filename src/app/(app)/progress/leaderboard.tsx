import { BrandHeader, Card, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { monthKm, nameFromEmail } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

export default function LeaderboardScreen() {
  const store = useAuthGuard();
  const colors = useTheme();
  const userId = store.user?.id ?? '';
  const km = monthKm(store.db.runs, userId);
  const friends = store.db.friends.filter((item) => item.userId === userId);
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Leaderboard</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>
        Shared ranks are coming soon. Only distance saved on this phone is shown. Routes are not published.
      </T>
      <Card>
        <T size={13} color={colors.link} weight="semibold">THIS MONTH</T>
        <T size={28} weight="bold" style={{ marginTop: 4 }}>{store.user ? nameFromEmail(store.user.email) : 'You'}</T>
        <T color={colors.muted}>{`${km.toFixed(1)} km from runs saved on this device`}</T>
      </Card>
      <T weight="semibold" style={{ marginTop: 18, marginBottom: 8 }}>Friends</T>
      {friends.length === 0 ? (
        <T color={colors.muted}>Add a training partner on the Friends screen. Their runs are not available here.</T>
      ) : (
        friends.map((friend) => (
          <Card key={friend.id} style={{ marginBottom: 8 }}>
            <T weight="bold">{friend.name}</T>
            <T color={colors.muted}>No shared runs. PACE AI does not invent a rank.</T>
          </Card>
        ))
      )}
    </Screen>
  );
}
