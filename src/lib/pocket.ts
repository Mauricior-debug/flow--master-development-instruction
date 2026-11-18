import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { bytesToBase64, pcm16ToWav } from './pace/audio';
import { setPocketRecording } from './pocketFlag';
import { LOCK_CONTROLS, nowPlayingCopy, remotePauseIntent } from './pocketPolicy';
import { ensureNotificationPermission } from './reminders';
import { getRunControl } from './runControl';

const CATEGORY = 'pace-run';

export type PocketSnapshot = {
  time: string;
  distance: string;
  pace: string;
  companion: string;
  paused: boolean;
  status: string;
};

let player: AudioPlayer | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let noteId: string | null = null;
let noteAt = 0;
let ignoreStatus = false;
let active = false;
let responseSub: { remove: () => void } | null = null;

async function silenceUri(): Promise<string> {
  const file = new File(Paths.cache, 'pace-keep.wav');
  file.create({ overwrite: true });
  await file.write(bytesToBase64(pcm16ToWav(new Uint8Array(24000 * 2), 24000)), { encoding: 'base64' });
  return file.uri;
}

async function ensureCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    { identifier: 'pause', buttonTitle: 'Pause', options: { opensAppToForeground: false } },
    { identifier: 'resume', buttonTitle: 'Resume', options: { opensAppToForeground: false } },
    { identifier: 'open', buttonTitle: 'Open PACE AI', options: { opensAppToForeground: true } },
  ]);
}

function listenForActions(): void {
  if (responseSub) return;
  responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const action = response.actionIdentifier;
    const control = getRunControl();
    if (!control || !active) return;
    if (action === 'pause') control.pause();
    if (action === 'resume') control.resume();
  });
}

async function publishNote(snapshot: PocketSnapshot): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (Date.now() - noteAt < 15000 && noteId) return;
  const allowed = await ensureNotificationPermission();
  if (!allowed) return;
  if (noteId) await Notifications.dismissNotificationAsync(noteId).catch(() => undefined);
  noteId = await Notifications.scheduleNotificationAsync({
    content: {
      title: snapshot.paused ? 'PACE AI · Paused' : 'PACE AI · Live run',
      body: `${snapshot.distance} · ${snapshot.time} · ${snapshot.pace}`,
      categoryIdentifier: CATEGORY,
      sticky: true,
      data: { pace: 'run' },
    },
    trigger: null,
  });
  noteAt = Date.now();
}

async function syncTransport(paused: boolean, snapshot?: PocketSnapshot): Promise<void> {
  if (!player) return;
  ignoreStatus = true;
  try {
    if (snapshot) player.updateLockScreenMetadata(nowPlayingCopy(snapshot));
    if (paused) {
      if (player.playing) player.pause();
    } else if (!player.playing) {
      player.play();
    }
  } catch {
    // The system may already own the session during a call.
  } finally {
    setTimeout(() => {
      ignoreStatus = false;
    }, 400);
  }
}

export async function startPocket(get: () => PocketSnapshot, options: { controls: boolean; notify: boolean }): Promise<void> {
  await stopPocket();
  active = true;
  setPocketRecording(true);
  try {
    await setIsAudioActiveAsync(true);
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      allowsRecording: true,
      shouldPlayInBackground: true,
      allowsBackgroundRecording: true,
      shouldRouteThroughEarpiece: false,
    });
  } catch {
    // GPS still records if the audio session is busy.
  }
  if (options.controls) {
    try {
      const uri = await silenceUri();
      const next = createAudioPlayer({ uri });
      next.loop = true;
      next.volume = 0;
      next.addListener('playbackStatusUpdate', (status) => {
        if (ignoreStatus || !active) return;
        const control = getRunControl();
        if (!control) return;
        const runStatus = control.getSession().status;
        const intent = remotePauseIntent(status.timeControlStatus, status.playing, runStatus);
        if (intent === 'pause') control.pause();
        if (intent === 'resume') control.resume();
      });
      player = next;
      const snapshot = get();
      next.setActiveForLockScreen(true, nowPlayingCopy(snapshot), LOCK_CONTROLS);
      if (!snapshot.paused) next.play();
    } catch {
      player = null;
    }
  }
  if (options.notify) {
    try {
      await ensureCategory();
      listenForActions();
    } catch {
      // Notification actions are optional. The run does not depend on them.
    }
  }
  const tick = () => {
    if (!active) return;
    const snapshot = get();
    if (options.controls) void syncTransport(snapshot.paused, snapshot);
    if (options.notify) void publishNote(snapshot);
  };
  timer = setInterval(tick, 5000);
  tick();
}

export async function syncPocket(): Promise<void> {
  if (!active || !player) return;
  const control = getRunControl();
  if (!control) return;
  const session = control.getSession();
  await syncTransport(session.status === 'paused');
}

export async function stopPocket(): Promise<void> {
  active = false;
  setPocketRecording(false);
  if (timer) clearInterval(timer);
  timer = null;
  try {
    player?.clearLockScreenControls();
    player?.pause();
    player?.remove();
  } catch {
    // The player may already have been released.
  }
  player = null;
  if (noteId) {
    await Notifications.dismissNotificationAsync(noteId).catch(() => undefined);
    noteId = null;
  }
}
