import { StatusBar } from 'expo-status-bar';
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { useStore } from '../data/store';
import { ThemeProvider } from '../theme/Theme';
import { darkColors, lightColors } from '../theme/tokens';

export function ThemeBridge({ children }: { children: ReactNode }) {
  const { settings } = useStore();
  const colors = settings.theme === 'light' ? lightColors : darkColors;
  return (
    <ThemeProvider theme={settings.theme}>
      <StatusBar style={settings.theme === 'light' ? 'dark' : 'light'} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>{children}</View>
    </ThemeProvider>
  );
}
