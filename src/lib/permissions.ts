import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

export type PermissionKind = 'location' | 'notifications' | 'camera' | 'microphone' | 'photos';

export type PermissionState = {
  kind: PermissionKind;
  title: string;
  detail: string;
  status: 'Allowed' | 'Denied' | 'Not asked' | 'Unavailable';
  granted: boolean;
  canAskAgain: boolean;
};

const COPY: Record<PermissionKind, { title: string; detail: string }> = {
  location: { title: 'Location', detail: 'Used to record distance, pace, and your route.' },
  notifications: { title: 'Notifications', detail: 'Habit reminders and streak alerts on this phone.' },
  camera: { title: 'Camera', detail: 'Optional photos. A run never requires the camera.' },
  microphone: { title: 'Microphone', detail: 'So PACE can hear you during a run and in Voice Studio.' },
  photos: { title: 'Photos', detail: 'Used when you choose a profile photo.' },
};

function label(granted: boolean, asked: boolean): PermissionState['status'] {
  if (granted) return 'Allowed';
  if (!asked) return 'Not asked';
  return 'Denied';
}

export async function readPermissions(): Promise<PermissionState[]> {
  const [location, notes, camera, microphone, photos] = await Promise.all([
    Location.getForegroundPermissionsAsync().catch(() => null),
    Notifications.getPermissionsAsync().catch(() => null),
    Camera.getCameraPermissionsAsync().catch(() => null),
    getRecordingPermissionsAsync().catch(() => null),
    ImagePicker.getMediaLibraryPermissionsAsync().catch(() => null),
  ]);
  return [
    pack('location', location),
    pack('notifications', notes),
    pack('camera', camera),
    pack('microphone', microphone),
    pack('photos', photos),
  ];
}

function pack(kind: PermissionKind, result: { granted?: boolean; status?: string; canAskAgain?: boolean } | null): PermissionState {
  const granted = Boolean(result?.granted || result?.status === 'granted');
  const asked = result?.status !== 'undetermined' && result != null;
  return {
    kind,
    ...COPY[kind],
    status: result ? label(granted, asked) : 'Unavailable',
    granted,
    canAskAgain: result?.canAskAgain !== false,
  };
}

export async function requestPermission(kind: PermissionKind): Promise<PermissionState> {
  try {
    if (kind === 'location') {
      const result = await Location.requestForegroundPermissionsAsync();
      return pack(kind, result);
    }
    if (kind === 'notifications') {
      const result = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      return pack(kind, result);
    }
    if (kind === 'camera') {
      const result = await Camera.requestCameraPermissionsAsync();
      return pack(kind, result);
    }
    if (kind === 'microphone') {
      const result = await requestRecordingPermissionsAsync();
      return pack(kind, result);
    }
    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return pack(kind, result);
  } catch {
    return { kind, ...COPY[kind], status: 'Unavailable', granted: false, canAskAgain: false };
  }
}

export function openSystemSettings(): void {
  void Linking.openSettings();
}
