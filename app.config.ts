import type { ExpoConfig } from 'expo/config';

const projectId = 'f50068f7-69bf-4ab3-b32e-6a5a1cde20a5';

const config: ExpoConfig = {
  name: 'PACE AI',
  slug: 'pace-ai',
  owner: 'naza123',
  scheme: 'paceai',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  runtimeVersion: '58.0.0',
  backgroundColor: '#07110C',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.paceai.app',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription:
        'PACE AI uses your location to record distance, pace, and your route while you run.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'PACE AI uses your location in the background so a run can keep recording if you lock your phone.',
      NSCameraUsageDescription:
        'PACE AI uses the camera only when you choose a visual note or profile photo. Camera access is never required to record a run.',
      NSMicrophoneUsageDescription:
        'PACE AI uses the microphone when you talk to your coach during a run.',
      NSPhotoLibraryUsageDescription: 'PACE AI uses your photo library when you choose a profile photo.',
      UIBackgroundModes: ['location', 'audio'],
    },
  },
  android: {
    package: 'com.paceai.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#07110C',
    },
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'CAMERA',
      'RECORD_AUDIO',
      'POST_NOTIFICATIONS',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
    ],
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    'expo-asset',
    'expo-audio',
    'expo-sharing',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'PACE AI uses your location to record distance, pace, and your route while you run.',
        locationAlwaysAndWhenInUsePermission:
          'PACE AI uses your location in the background so a run can keep recording if you lock your phone.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'PACE AI uses the camera only when you choose a visual note or profile photo. Camera access is never required to record a run.',
        microphonePermission: 'PACE AI uses the microphone when you talk to your coach during a run.',
        recordAudioAndroid: true,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'PACE AI uses your photo library when you choose a profile photo.',
      },
    ],
    [
      'expo-notifications',
      {
        color: '#B6FF00',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#07110C',
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        imageWidth: 220,
      },
    ],
  ],
  updates: {
    url: `https://u.expo.dev/${projectId}`,
  },
  extra: {
    eas: { projectId },
    API_KEY: process.env.API_KEY ?? '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ?? '',
    router: {},
  },
};

export default config;
