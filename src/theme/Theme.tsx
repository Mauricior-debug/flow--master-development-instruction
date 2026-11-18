import { createContext, useContext, type ReactNode } from 'react';

import { darkColors, lightColors, type Palette } from './tokens';

const ThemeContext = createContext<Palette>(darkColors);

export function ThemeProvider({ theme, children }: { theme: 'dark' | 'light'; children: ReactNode }) {
  return <ThemeContext.Provider value={theme === 'light' ? lightColors : darkColors}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}
