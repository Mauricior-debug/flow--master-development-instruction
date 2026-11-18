import 'react-native-gesture-handler';
import '../lib/locationTask';

import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeBridge } from '../components/providers';
import { StoreProvider } from '../data/store';
import { loadMapPrefs } from '../lib/mapPrefs';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    void loadMapPrefs();
    if (loaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <ThemeBridge>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#07110C' } }}>
              <Stack.Screen name="live" options={{ gestureEnabled: false, animation: 'fade' }} />
              <Stack.Screen name="camera" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen
                name="confirm-sheet"
                options={{ presentation: 'formSheet', sheetAllowedDetents: [0.42, 0.75], sheetGrabberVisible: true }}
              />
              <Stack.Screen
                name="voice-sheet"
                options={{ presentation: 'formSheet', sheetAllowedDetents: [0.58, 0.94], sheetGrabberVisible: true }}
              />
              <Stack.Screen
                name="controls-sheet"
                options={{ presentation: 'formSheet', sheetAllowedDetents: [0.4, 0.72], sheetGrabberVisible: true }}
              />
              <Stack.Screen
                name="map-options"
                options={{ presentation: 'formSheet', sheetAllowedDetents: [0.58, 0.9], sheetGrabberVisible: true }}
              />
            </Stack>
          </ThemeBridge>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
