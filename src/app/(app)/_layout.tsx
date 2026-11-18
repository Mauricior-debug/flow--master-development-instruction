import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '../../theme/Theme';

export default function AppTabs() {
  const colors = useTheme();
  return (
    <NativeTabs
      tintColor={colors.lime}
      backgroundColor={colors.bg}
      iconColor={{ default: colors.muted, selected: colors.lime }}
      labelStyle={{ default: { color: colors.muted }, selected: { color: colors.lime } }}
    >
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="run">
        <NativeTabs.Trigger.Label>Run</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="figure.run" md="directions_run" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="companion">
        <NativeTabs.Trigger.Label>Companion</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right.fill" md="forum" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="bar_chart" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
