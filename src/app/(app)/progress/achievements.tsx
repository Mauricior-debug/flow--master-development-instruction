import { BrandHeader, Card, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { xpTotal } from '../../../data/store';
import { ACHIEVEMENTS, levelFor } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

export default function AchievementsScreen() {
  const store = useAuthGuard();
  const colors = useTheme();
  const userId = store.user?.id ?? '';
  const unlocked = new Set(store.db.achievements.filter((item) => item.userId === userId).map((item) => item.key));
  const level = levelFor(xpTotal(store.db, userId));
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Achievements</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>{`Level ${level.level} · ${xpTotal(store.db, userId)} XP. Rewards are granted only when the rule is met.`}</T>
      {ACHIEVEMENTS.map((item) => {
        const open = unlocked.has(item.key);
        return (
          <Card key={item.key} style={{ marginBottom: 10, opacity: open ? 1 : 0.72 }}>
            <T weight="bold">{item.title}</T>
            <T color={colors.muted} style={{ marginTop: 4 }}>{item.detail}</T>
            <T color={open ? colors.link : colors.faint} weight="semibold" style={{ marginTop: 6 }}>{open ? 'Unlocked' : 'Locked'}</T>
          </Card>
        );
      })}
    </Screen>
  );
}
