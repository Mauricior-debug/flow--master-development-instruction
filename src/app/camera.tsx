import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { BrandHeader, PrimaryButton, Screen, SecondaryButton, T } from '../components/ui';
import { useStore } from '../data/store';
import { useTheme } from '../theme/Theme';
import { Image } from 'expo-image';

export default function CameraSessionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useStore();
  const router = useRouter();
  const colors = useTheme();
  const camera = useRef<CameraView>(null);
  const [permission, request] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function capture() {
    try {
      const picture = await camera.current?.takePictureAsync({ quality: 0.6 });
      if (!picture?.uri) {
        setError('No photo was captured.');
        return;
      }
      setPhoto(picture.uri);
      if (id) store.attachRunNote(id, picture.uri);
    } catch {
      setError('The camera could not take a photo. Your run is unaffected.');
    }
  }

  return (
    <Screen>
      <BrandHeader back />
      <T size={32} weight="bold">Camera Session</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 12 }}>
        Optional photo note. Form analysis is coming soon. This does not detect hazards, traffic, or injuries, and a run never requires it.
      </T>
      {!permission?.granted ? (
        <View style={{ gap: 12 }}>
          <T>Camera access is off. You can keep running without it.</T>
          <PrimaryButton label="Allow camera" onPress={() => void request()} />
          <SecondaryButton label="Not now" onPress={() => router.back()} />
        </View>
      ) : photo ? (
        <View style={{ gap: 12 }}>
          <Image source={{ uri: photo }} style={{ width: '100%', height: 320, borderRadius: 18 }} contentFit="cover" accessibilityLabel="Visual note you just captured" />
          <T>Saved with this run. Compare it yourself: tall posture, relaxed shoulders, short stride. PACE AI is not scoring the photo.</T>
          <PrimaryButton label="Done" onPress={() => router.back()} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <CameraView ref={camera} style={{ height: 360, borderRadius: 18, overflow: 'hidden' }} facing="back" />
          {error ? <T color={colors.danger}>{error}</T> : null}
          <PrimaryButton label="Take photo" onPress={() => void capture()} />
          <SecondaryButton label="Cancel" onPress={() => router.back()} />
        </View>
      )}
    </Screen>
  );
}
