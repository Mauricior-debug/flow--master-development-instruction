import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';

import { RouteLine } from '../components/charts';
import { mapPreviewUrl } from '../lib/map';
import { BrandHeader, Card, Screen, T } from '../components/ui';
import { useStore } from '../data/store';
import {
  activeMs,
  addPoint,
  answerQuestion,
  averagePace,
  coachLine,
  currentPace,
  elapsedMs,
  finishSession,
  finishSummary,
  formatDistance,
  formatDuration,
  formatPace,
  pauseSession,
  practicePoint,
  resumeSession,
  shouldSpeak,
  type Session,
} from '../lib/engine';
import { DB_KEY, startBackgroundUpdates, stopBackgroundUpdates } from '../lib/locationTask';
import { setRunControl } from '../lib/runControl';
import { useTheme } from '../theme/Theme';
import { Image } from 'expo-image';

export default function LiveRunScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useStore();
  const router = useRouter();
  const colors = useTheme();
  const stored = store.db.runs.find((item) => item.id === id);
  const [session, setSession] = useState<Session | null>(stored?.session ?? null);
  const [now, setNow] = useState(Date.now());
  const [offline, setOffline] = useState(false);
  const [gpsNote, setGpsNote] = useState('');
  const [backgroundOn, setBackgroundOn] = useState(false);
  const sessionRef = useRef<Session | null>(stored?.session ?? null);
  const storeRef = useRef(store);
  storeRef.current = store;
  const spokenKm = useRef(0);
  const practiceIndex = useRef(stored?.session.points.length ?? 0);
  const watch = useRef<Location.LocationSubscription | null>(null);
  const practiceTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    const net = NetInfo.addEventListener((state) => setOffline(state.isConnected === false));
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => undefined);
    return () => {
      clearInterval(timer);
      net();
    };
  }, []);

  useEffect(() => {
    if (!stored) return;
    const speak = (text: string, kind: 'start' | 'km' | 'pause' | 'resume' | 'encourage' | 'finish') => {
      const coach = storeRef.current.coach;
      if (!coach.voiceEnabled || !shouldSpeak(kind, coach.speak)) return;
      Speech.stop();
      Speech.speak(text, { rate: 0.96 });
    };
    const ask = (question: string) => {
      const current = sessionRef.current;
      if (!current) return 'Start a run first.';
      const latest = storeRef.current;
      const unit = latest.settings.units;
      const distance = `${formatDistance(current.distanceM, unit)} ${unit}`;
      const pace = formatPace(currentPace(current, unit) ?? averagePace(current, unit));
      const reply = answerQuestion(
        question,
        {
          distance,
          pace,
          time: formatDuration(activeMs(current, Date.now())),
          goal: stored.goalLabel,
          kmLeft: null,
        },
        latest.coach.personality,
      );
      latest.addMessage('you', question, stored.id);
      latest.addMessage('coach', reply, stored.id);
      speak(reply, 'encourage');
      return reply;
    };
    setRunControl({
      getSession: () => sessionRef.current ?? stored.session,
      pause: () => {
        setSession((current) => {
          if (!current) return current;
          const next = pauseSession(current, Date.now());
          speak(coachLine({ kind: 'pause' }, storeRef.current.coach.personality), 'pause');
          return next;
        });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
      resume: () => {
        setSession((current) => {
          if (!current) return current;
          speak(coachLine({ kind: 'resume' }, storeRef.current.coach.personality), 'resume');
          return resumeSession(current, Date.now());
        });
      },
      finish: () => {
        const current = sessionRef.current;
        if (!current) return;
        const latest = storeRef.current;
        const finished = finishSession(current, Date.now());
        const summary = finishSummary(finished, latest.settings.units, latest.coach.personality);
        latest.finishRun(stored.id, finished, summary);
        speak(summary, 'finish');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({ pathname: '/results', params: { id: stored.id } });
      },
      ask,
    });
    if (sessionRef.current && sessionRef.current.points.length === 0) {
      speak(coachLine({ kind: 'start' }, storeRef.current.coach.personality), 'start');
    }
    return () => setRunControl(null);
  }, [router, stored?.id]);

  useEffect(() => {
    if (!session || !stored) return;
    const km = Math.floor(session.distanceM / 1000);
    const coach = storeRef.current.coach;
    if (km > spokenKm.current && coach.voiceEnabled && shouldSpeak('km', coach.speak)) {
      spokenKm.current = km;
      const pace = formatPace(averagePace(session, storeRef.current.settings.units));
      const line = coachLine({ kind: 'km', km, pace }, coach.personality);
      Speech.speak(line);
      storeRef.current.addMessage('coach', line, stored.id);
    }
  }, [session, stored?.id]);

  useEffect(() => {
    if (!stored || stored.session.source !== 'practice') return;
    practiceTimer.current = setInterval(() => {
      setSession((current) => {
        if (!current || current.status !== 'running') return current;
        const index = practiceIndex.current;
        practiceIndex.current += 1;
        return addPoint(current, practicePoint(index, current.startedAt));
      });
    }, 1000);
    return () => {
      if (practiceTimer.current) clearInterval(practiceTimer.current);
    };
  }, [stored?.id, stored?.session.source]);

  useEffect(() => {
    if (!stored || stored.session.source !== 'gps') return;
    let alive = true;
    async function watchForeground() {
      try {
        watch.current?.remove();
        watch.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 4 },
          (location) => {
            setGpsNote('');
            setSession((current) => {
              if (!current || current.status !== 'running') return current;
              return addPoint(current, {
                lat: location.coords.latitude,
                lon: location.coords.longitude,
                t: location.timestamp,
                accuracy: location.coords.accuracy ?? undefined,
              });
            });
          },
        );
      } catch {
        if (alive) setGpsNote('GPS is not updating. The timer continues, and distance stays at the last good point.');
      }
    }
    void watchForeground();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void stopBackgroundUpdates().then(async () => {
          setBackgroundOn(false);
          const raw = await AsyncStorage.getItem(DB_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as { runs?: { id: string; session: Session }[] };
            const fresh = parsed.runs?.find((item) => item.id === stored.id);
            if (fresh) setSession(fresh.session);
          }
          void watchForeground();
        });
      } else {
        watch.current?.remove();
        storeRef.current.updateRun(stored.id, sessionRef.current ?? stored.session);
        void startBackgroundUpdates().then(setBackgroundOn);
      }
    });
    return () => {
      alive = false;
      watch.current?.remove();
      sub.remove();
      void stopBackgroundUpdates();
    };
  }, [stored?.id, stored?.session.source]);

  useEffect(() => {
    if (!stored || !session) return;
    const handle = setTimeout(() => storeRef.current.updateRun(stored.id, session), 1500);
    return () => clearTimeout(handle);
  }, [session, stored?.id]);

  if (!stored || !session) {
    return (
      <Screen>
        <BrandHeader back />
        <T size={28} weight="bold">No active run</T>
        <T color={colors.muted} style={{ marginTop: 8 }}>Start one from the Run tab. Nothing was lost.</T>
      </Screen>
    );
  }

  const unit = store.settings.units;
  const last = session.points[session.points.length - 1];
  const weak = session.source === 'gps' && session.status === 'running' && (!last || now - last.t > 20000);
  const map = mapPreviewUrl(session.points);

  return (
    <Screen>
      <BrandHeader back={false} right={<T color={colors.lime} weight="semibold">{session.source === 'practice' ? 'Practice' : 'GPS'}</T>} />
      <T size={13} color={colors.muted}>{stored.goalLabel}</T>
      <T size={56} weight="bold" style={{ marginTop: 8 }}>{formatDuration(activeMs(session, now))}</T>
      <T color={colors.muted}>{session.status === 'paused' ? 'Paused' : 'Active time'}</T>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
        <Stat label="Distance" value={`${formatDistance(session.distanceM, unit)} ${unit}`} />
        <Stat label="Pace" value={`${formatPace(currentPace(session, unit) ?? averagePace(session, unit))} /${unit}`} />
        <Stat label="Elapsed" value={formatDuration(elapsedMs(session, now))} />
      </View>
      <View style={{ marginTop: 16 }}>
        {map ? (
          <Image source={{ uri: map }} style={{ height: 180, borderRadius: 18 }} contentFit="cover" accessibilityLabel="Map of the current route" />
        ) : (
          <RouteLine points={session.points} />
        )}
      </View>
      {offline ? <Note text="No network. Your run is still recording on this phone." /> : null}
      {weak ? <Note text="GPS signal is weak. Recording continues and will fill in when the signal returns." /> : null}
      {gpsNote ? <Note text={gpsNote} /> : null}
      {backgroundOn ? <Note text="Background location is on, so the route can keep recording if you lock the phone." /> : null}
      {session.source === 'practice' ? <Note text="Practice route. These points are simulated, not your real location." /> : null}
      <Card style={{ marginTop: 14 }}>
        <T size={13} color={colors.link} weight="semibold">COACH</T>
        <T style={{ marginTop: 6 }}>
          {store.db.messages.filter((item) => item.runId === stored.id).slice(-1)[0]?.text || 'I am here. Ask me about pace, distance, or what is left.'}
        </T>
      </Card>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <Round label={session.status === 'paused' ? 'Resume' : 'Pause'} onPress={() => router.push('/controls-sheet')} />
        <Round label="Ask" onPress={() => router.push('/voice-sheet')} />
        <Round label="Note" onPress={() => router.push({ pathname: '/camera', params: { id: stored.id } })} />
        <Round label={store.coach.voiceEnabled ? 'Mute' : 'Speak'} onPress={() => store.saveCoach({ voiceEnabled: !store.coach.voiceEnabled })} />
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useTheme();
  return (
    <Card style={{ flex: 1, padding: 12 }}>
      <T size={12} color={colors.muted}>{label}</T>
      <T weight="bold" style={{ marginTop: 4 }}>{value}</T>
    </Card>
  );
}

function Note({ text }: { text: string }) {
  const colors = useTheme();
  return <T size={13} color={colors.muted} style={{ marginTop: 10 }}>{text}</T>;
}

function Round({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [{ flex: 1, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: label === 'Pause' || label === 'Resume' ? colors.lime : colors.surface, opacity: pressed ? 0.75 : 1 }]}>
      <T weight="bold" color={label === 'Pause' || label === 'Resume' ? colors.onLime : colors.text}>{label}</T>
    </Pressable>
  );
}
