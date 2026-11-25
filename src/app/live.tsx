import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';

import { RouteMap } from '../components/RouteMap';
import { BrandHeader, Card, Screen, T } from '../components/ui';
import { useStore } from '../data/store';
import { openCoach, type CoachHandle } from '../lib/coachSession';
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
  type Units,
} from '../lib/engine';
import { DB_KEY, startBackgroundUpdates, stopBackgroundUpdates } from '../lib/locationTask';
import { getRunControl, setRunControl } from '../lib/runControl';
import { cuePrompt, questionPrompt, type LiveStats } from '../lib/voice';
import { useTheme } from '../theme/Theme';

function snapshot(session: Session, unit: Units, goal: string, now: number): LiveStats {
  return {
    distance: `${formatDistance(session.distanceM, unit)} ${unit}`,
    pace: `${formatPace(currentPace(session, unit) ?? averagePace(session, unit))} /${unit}`,
    time: formatDuration(activeMs(session, now)),
    goal,
    status: session.status,
  };
}

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
  const [line, setLine] = useState('I am here. Ask me about pace, distance, or how you feel.');
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('On-device voice');
  const sessionRef = useRef<Session | null>(stored?.session ?? null);
  const storeRef = useRef(store);
  storeRef.current = store;
  const spokenKm = useRef(0);
  const lastEncourage = useRef(0);
  const practiceIndex = useRef(stored?.session.points.length ?? 0);
  const watch = useRef<Location.LocationSubscription | null>(null);
  const practiceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const coachRef = useRef<CoachHandle | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    const net = NetInfo.addEventListener((state) => setOffline(state.isConnected === false));
    return () => {
      clearInterval(timer);
      net();
    };
  }, []);

  useEffect(() => {
    if (!stored) return;
    const handle = openCoach({
      getProfile: () => storeRef.current.coach,
      onStatus: setVoiceStatus,
    });
    coachRef.current = handle;
    const cue = (fallback: string, prompt?: string) => {
      setLine(fallback);
      void handle
        .say(fallback, prompt)
        .then((text) => {
          if (text) setLine(text);
          if (text) storeRef.current.addMessage('coach', text, stored.id);
        })
        .catch(() => setVoiceStatus('Coach quiet. Your run is still recording.'));
    };
    const ask = async (question: string) => {
      const current = sessionRef.current;
      const latest = storeRef.current;
      if (!current) return 'Start a run first.';
      const stats = snapshot(current, latest.settings.units, stored.goalLabel, Date.now());
      const fallback = answerQuestion(
        question,
        { distance: stats.distance, pace: stats.pace, time: stats.time, goal: stored.goalLabel, kmLeft: null },
        latest.coach.personality,
      );
      latest.addMessage('you', question, stored.id);
      setLine('Listening…');
      const text = await handle.say(fallback, questionPrompt(question, stats));
      setLine(text);
      latest.addMessage('coach', text, stored.id);
      return text;
    };
    setRunControl({
      getSession: () => sessionRef.current ?? stored.session,
      pause: () => {
        setSession((current) => {
          if (!current) return current;
          const next = pauseSession(current, Date.now());
          const stats = snapshot(next, storeRef.current.settings.units, stored.goalLabel, Date.now());
          const spoken = coachLine({ kind: 'pause' }, storeRef.current.coach.personality);
          if (shouldSpeak('pause', storeRef.current.coach.speak)) cue(spoken, cuePrompt(spoken, stats));
          return next;
        });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
      resume: () => {
        setSession((current) => {
          if (!current) return current;
          const next = resumeSession(current, Date.now());
          const stats = snapshot(next, storeRef.current.settings.units, stored.goalLabel, Date.now());
          const spoken = coachLine({ kind: 'resume' }, storeRef.current.coach.personality);
          if (shouldSpeak('resume', storeRef.current.coach.speak)) cue(spoken, cuePrompt(spoken, stats));
          return next;
        });
      },
      finish: () => {
        const current = sessionRef.current;
        if (!current) return;
        const latest = storeRef.current;
        const finished = finishSession(current, Date.now());
        const summary = finishSummary(finished, latest.settings.units, latest.coach.personality);
        latest.finishRun(stored.id, finished, summary);
        latest.addMessage('coach', summary, stored.id);
        handle.interrupt();
        if (latest.coach.voiceEnabled) {
          try {
            Speech.speak(summary, { rate: 0.96 });
          } catch {
            // The results screen still shows the summary.
          }
        }
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({ pathname: '/results', params: { id: stored.id } });
      },
      ask,
      askAudio: async (uri) => {
        const heard = await handle.transcribe(uri);
        if (!heard) return 'I could not hear that. Type it instead. Your run is still recording.';
        return ask(heard);
      },
      interrupt: () => handle.interrupt(),
      voiceStatus: () => handle.status(),
    });
    if ((sessionRef.current?.points.length ?? 0) === 0 && shouldSpeak('start', storeRef.current.coach.speak)) {
      const spoken = coachLine({ kind: 'start' }, storeRef.current.coach.personality);
      const current = sessionRef.current;
      const stats = current
        ? snapshot(current, storeRef.current.settings.units, stored.goalLabel, Date.now())
        : { distance: '0.00 km', pace: '—', time: '00:00', goal: stored.goalLabel, status: 'running' };
      cue(spoken, cuePrompt(spoken, stats));
    }
    return () => {
      setRunControl(null);
      handle.close();
      coachRef.current = null;
    };
  }, [router, stored?.id]);

  useEffect(() => {
    if (!session || !stored || session.status !== 'running') return;
    const km = Math.floor(session.distanceM / 1000);
    const coach = storeRef.current.coach;
    let announcedKm = false;
    if (km > spokenKm.current && shouldSpeak('km', coach.speak)) {
      announcedKm = true;
      spokenKm.current = km;
      lastEncourage.current = session.distanceM;
      const pace = formatPace(averagePace(session, storeRef.current.settings.units));
      const spoken = coachLine({ kind: 'km', km, pace }, coach.personality);
      const stats = snapshot(session, storeRef.current.settings.units, stored.goalLabel, Date.now());
      setLine(spoken);
      void coachRef.current?.say(spoken, cuePrompt(spoken, stats)).then((text) => {
        if (text) {
          setLine(text);
          storeRef.current.addMessage('coach', text, stored.id);
        }
      });
    }
    const moved = session.distanceM - lastEncourage.current;
    if (!announcedKm && coach.speak !== 'quiet' && session.distanceM > 400 && moved > 500 && shouldSpeak('encourage', coach.speak)) {
      lastEncourage.current = session.distanceM;
      const stats = snapshot(session, storeRef.current.settings.units, stored.goalLabel, Date.now());
      const spoken = coachLine({ kind: 'encourage', distance: stats.distance, pace: stats.pace }, coach.personality);
      setLine(spoken);
      void coachRef.current?.say(spoken, cuePrompt(spoken, stats)).then((text) => {
        if (text) setLine(text);
      });
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

  return (
    <Screen>
      <BrandHeader back={false} right={<T color={colors.lime} weight="semibold">{session.source === 'practice' ? 'Practice' : 'GPS'}</T>} />
      <T size={13} color={colors.muted}>{stored.goalLabel}</T>
      <T size={64} weight="bold" style={{ marginTop: 4 }}>{formatDuration(activeMs(session, now))}</T>
      <T color={colors.muted}>{session.status === 'paused' ? 'Paused' : 'Active time'}</T>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <Stat label="Distance" value={`${formatDistance(session.distanceM, unit)}`} unit={unit} />
        <Stat label="Pace" value={formatPace(currentPace(session, unit) ?? averagePace(session, unit))} unit={`/${unit}`} />
      </View>
      <T size={13} color={colors.faint} style={{ marginTop: 8 }}>{`Elapsed ${formatDuration(elapsedMs(session, now))}`}</T>
      <View style={{ marginTop: 16 }}>
        <RouteMap points={session.points} height={210} />
      </View>
      <Card style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <T size={13} color={colors.link} weight="semibold">COACH</T>
          <T size={13} color={colors.muted}>{voiceStatus}</T>
        </View>
        <T style={{ marginTop: 8 }}>{line}</T>
      </Card>
      {offline ? <Note text="No network. Your run is still recording on this phone." /> : null}
      {weak ? <Note text="GPS signal is weak. Recording continues and will fill in when the signal returns." /> : null}
      {gpsNote ? <Note text={gpsNote} /> : null}
      {backgroundOn ? <Note text="Background location is on, so the route can keep recording if you lock the phone." /> : null}
      {session.source === 'practice' ? <Note text="Practice route. These points are simulated, not your real location." /> : null}
      {confirmFinish ? (
        <View style={{ marginTop: 18, gap: 10 }}>
          <T weight="bold">Save this run?</T>
          <T color={colors.muted}>The route, splits, and summary stay on this phone.</T>
          <Round label="Save run" primary onPress={() => getRunControl()?.finish()} />
          <Round label="Keep going" onPress={() => setConfirmFinish(false)} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Round
            label={session.status === 'paused' ? 'Resume' : 'Pause'}
            primary
            onPress={() => {
              const control = getRunControl();
              if (!control) return;
              if (session.status === 'paused') control.resume();
              else control.pause();
            }}
          />
          <Round label="Ask" onPress={() => router.push('/voice-sheet')} />
          <Round label="Finish" onPress={() => setConfirmFinish(true)} />
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <Round label="Note" onPress={() => router.push({ pathname: '/camera', params: { id: stored.id } })} />
        <Round label={store.coach.voiceEnabled ? 'Mute' : 'Speak'} onPress={() => store.saveCoach({ voiceEnabled: !store.coach.voiceEnabled })} />
      </View>
    </Screen>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  const colors = useTheme();
  return (
    <Card style={{ flex: 1, paddingVertical: 16 }}>
      <T size={13} color={colors.muted}>{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
        <T size={28} weight="bold">{value}</T>
        <T size={14} color={colors.muted} style={{ marginLeft: 4, marginBottom: 4 }}>{unit}</T>
      </View>
    </Card>
  );
}

function Note({ text }: { text: string }) {
  const colors = useTheme();
  return <T size={13} color={colors.muted} style={{ marginTop: 10 }}>{text}</T>;
}

function Round({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [{
        flex: 1,
        minHeight: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary ? colors.lime : colors.surface,
        opacity: pressed ? 0.75 : 1,
      }]}
    >
      <T weight="bold" color={primary ? colors.onLime : colors.text}>{label}</T>
    </Pressable>
  );
}
