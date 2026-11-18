import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';

import { PaceMap } from '../components/PaceMap';
import { RunLock } from '../components/RunLock';
import { useMapPrefs } from '../lib/mapPrefs';
import { BrandHeader, Screen, T } from '../components/ui';
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
  pointAlongRoute,
  practicePoint,
  resumeSession,
  shouldSpeak,
  type Session,
} from '../lib/engine';
import { DB_KEY, startBackgroundUpdates, stopBackgroundUpdates } from '../lib/locationTask';
import { startPocket, stopPocket, syncPocket } from '../lib/pocket';
import { getRunControl, setRunControl } from '../lib/runControl';
import { useUserLocation } from '../lib/useUserLocation';
import { usePaceSession } from '../lib/pace/usePaceSession';
import { workoutNotice } from '../lib/pace/call';
import { distanceToPathMeters, nextMapCue } from '../lib/pace/mapCues';
import { openSystemSettings, requestPermission } from '../lib/permissions';
import { speakLine } from '../lib/pace/session';
import { isRealtimeVoice, voiceTitle } from '../lib/pace/voices';
import { useTheme } from '../theme/Theme';

export default function LiveRunScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useStore();
  const router = useRouter();
  const colors = useTheme();
  const prefs = useMapPrefs();
  const [expanded, setExpanded] = useState(false);
  const device = useUserLocation();
  const stored = store.db.runs.find((item) => item.id === id);
  const [session, setSession] = useState<Session | null>(stored?.session ?? null);
  const [now, setNow] = useState(Date.now());
  const [offline, setOffline] = useState(false);
  const [gpsNote, setGpsNote] = useState('');
  const [backgroundOn, setBackgroundOn] = useState(false);
  const sessionRef = useRef<Session | null>(stored?.session ?? null);
  const liveTalk = store.coach.liveTalk === true;
  const pace = usePaceSession({
    enabled: Boolean(liveTalk && stored && session && session.status !== 'finished'),
    muted: !store.coach.voiceEnabled,
    voice: isRealtimeVoice(store.coach.voiceId) ? store.coach.voiceId : 'marin',
    speed: store.coach.speechSpeed || 1,
    getContext: () => {
      const current = sessionRef.current;
      const latest = storeRef.current;
      const unit = latest.settings.units;
      const distanceM = current?.distanceM ?? 0;
      const plannedM = stored?.planned?.distanceM ?? 0;
      return {
        status: current?.status ?? 'idle',
        distance: `${formatDistance(distanceM, unit)} ${unit}`,
        currentPace: formatPace(current ? currentPace(current, unit) : null),
        averagePace: formatPace(current ? averagePace(current, unit) : null),
        time: formatDuration(current ? activeMs(current, Date.now()) : 0),
        goal: stored?.goalLabel ?? 'Easy run',
        remaining: plannedM > distanceM ? `${formatDistance(plannedM - distanceM, unit)} ${unit}` : 'No target left',
        tone: latest.coach.coachingTone ?? 'friendly',
        frequency: latest.coach.speak,
        milestones: latest.coach.milestoneAnnouncements !== false,
        recovery: latest.coach.recoveryAnnouncements !== false,
        safety: false,
      };
    },
    onPause: () => undefined,
    onResume: () => undefined,
    onFinish: () => getRunControl()?.finish(),
    onMute: (muted) => storeRef.current.saveCoach({ voiceEnabled: !muted }),
    onTone: (tone) => storeRef.current.saveCoach({ coachingTone: tone, personality: tone === 'calm' ? 'calm' : tone === 'energetic' ? 'motivator' : 'strategist' }),
    onSafety: (line) => {
      Speech.speak(line, { rate: 0.95 });
      router.push('/safety-sheet');
    },
    onHeard: (text) => {
      if (stored) storeRef.current.addMessage('you', text, stored.id);
    },
    onSaid: (text) => {
      if (stored) storeRef.current.addMessage('coach', text, stored.id);
    },
  });
  const paceRef = useRef(pace);
  paceRef.current = pace;
  const storeRef = useRef(store);
  storeRef.current = store;
  const practiceIndex = useRef(stored?.session.points.length ?? 0);
  const watch = useRef<Location.LocationSubscription | null>(null);
  const practiceTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    const net = NetInfo.addEventListener((state) => setOffline(state.isConnected === false));
    if (liveTalk) {
      setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        allowsRecording: true,
        shouldPlayInBackground: true,
        allowsBackgroundRecording: true,
        shouldRouteThroughEarpiece: false,
      }).catch(() => undefined);
    }
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active' && liveTalk) {
        if (paceRef.current.mic === 'denied') paceRef.current.retryMic();
        else paceRef.current.ensure();
      }
    });
    return () => {
      clearInterval(timer);
      net();
      app.remove();
    };
  }, [liveTalk]);

  useEffect(() => {
    if (!stored) return;
    const ask = (question: string) => {
      const current = sessionRef.current;
      if (!current) return 'Start a run first.';
      const latest = storeRef.current;
      latest.addMessage('you', question, stored.id);
      const coachNow = latest.coach;
      const voice = isRealtimeVoice(coachNow.voiceId) ? coachNow.voiceId : 'marin';
      if (coachNow.liveTalk && paceRef.current.say(question)) return 'On the call.';
      const unit = latest.settings.units;
      const distance = `${formatDistance(current.distanceM, unit)} ${unit}`;
      const paceLabel = formatPace(currentPace(current, unit) ?? averagePace(current, unit));
      const reply = answerQuestion(
        question,
        {
          distance,
          pace: paceLabel,
          time: formatDuration(activeMs(current, Date.now())),
          goal: stored.goalLabel,
          kmLeft: null,
        },
        latest.coach.personality,
      );
      latest.addMessage('coach', reply, stored.id);
      if (coachNow.voiceEnabled) void speakLine(reply, voice, coachNow.speechSpeed || 1, coachNow.coachingTone ?? 'friendly');
      return reply;
    };
    const sayUpdate = (text: string, kind: 'start' | 'km' | 'pause' | 'resume' | 'encourage' | 'finish') => {
      const coachNow = storeRef.current.coach;
      if (coachNow.liveTalk || !coachNow.voiceEnabled || !shouldSpeak(kind, coachNow.speak)) return;
      const voice = isRealtimeVoice(coachNow.voiceId) ? coachNow.voiceId : 'marin';
      void speakLine(text, voice, coachNow.speechSpeed || 1, coachNow.coachingTone ?? 'friendly');
    };
    setRunControl({
      getSession: () => sessionRef.current ?? stored.session,
      pause: () => {
        setSession((current) => {
          if (!current) return current;
          return pauseSession(current, Date.now());
        });
        if (storeRef.current.coach.liveTalk) paceRef.current.note(workoutNotice('pause', 'The runner paused the workout from the screen.'));
        else sayUpdate(coachLine({ kind: 'pause' }, storeRef.current.coach.personality), 'pause');
        void syncPocket();
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
      resume: () => {
        setSession((current) => {
          if (!current) return current;
          return resumeSession(current, Date.now());
        });
        if (storeRef.current.coach.liveTalk) paceRef.current.note(workoutNotice('resume', 'The runner resumed the workout.'));
        else sayUpdate(coachLine({ kind: 'resume' }, storeRef.current.coach.personality), 'resume');
        void syncPocket();
      },
      finish: () => {
        const current = sessionRef.current;
        if (!current) return;
        const latest = storeRef.current;
        const finished = finishSession(current, Date.now());
        const summary = finishSummary(finished, latest.settings.units, latest.coach.personality);
        latest.finishRun(stored.id, finished, summary);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({ pathname: '/results', params: { id: stored.id } });
      },
      ask,
    });
    return () => setRunControl(null);
  }, [router, stored?.id]);

  const spokenCues = useRef(new Set<string>());
  const lastOffRouteAt = useRef(0);
  const lastContextAt = useRef(0);

  useEffect(() => {
    if (!session || !stored || session.status !== 'running') return;
    const coach = store.coach;
    if (!coach.voiceEnabled) return;
    const live = coach.liveTalk === true;
    const point = session.points[session.points.length - 1];
    const offRouteM = stored.planned && point ? distanceToPathMeters(point, stored.planned.coordinates) : null;
    const unit = store.settings.units;
    const paceLabel = formatPace(currentPace(session, unit) ?? averagePace(session, unit));
    const nowMs = Date.now();
    if (live && nowMs - lastContextAt.current > 45000) {
      lastContextAt.current = nowMs;
      paceRef.current.note(workoutNotice('context', `Distance ${formatDistance(session.distanceM, unit)} ${unit}. Pace ${paceLabel}.`));
    }
    if (coach.milestoneAnnouncements === false) return;
    const cue = nextMapCue({
      distanceM: session.distanceM,
      status: session.status,
      plannedM: stored.planned?.distanceM ?? 0,
      routeName: stored.planned?.name || stored.goalLabel,
      offRouteM,
      unit,
      paceLabel,
      voiceName: voiceTitle(coach.voiceId),
      tone: coach.coachingTone ?? 'friendly',
      spoken: spokenCues.current,
      now: nowMs,
      lastOffRouteAt: lastOffRouteAt.current,
    });
    if (!cue || (live && cue.kind === 'start')) return;
    if (coach.speak === 'quiet' && (cue.kind === 'halfway' || cue.kind === 'offroute')) return;
    spokenCues.current.add(cue.id);
    if (cue.kind === 'offroute') lastOffRouteAt.current = nowMs;
    if (live) {
      const kind = cue.kind === 'km' ? 'km' : cue.kind === 'halfway' ? 'halfway' : cue.kind === 'almost' ? 'almost' : 'offroute';
      paceRef.current.note(workoutNotice(kind, cue.line));
      return;
    }
    store.addMessage('coach', cue.line, stored.id);
    const voice = isRealtimeVoice(coach.voiceId) ? coach.voiceId : 'marin';
    void speakLine(cue.line, voice, coach.speechSpeed || 1, coach.coachingTone ?? 'friendly');
  }, [session, store, stored]);

  useEffect(() => {
    if (!stored || stored.session.source !== 'practice') return;
    practiceTimer.current = setInterval(() => {
      setSession((current) => {
        if (!current || current.status !== 'running') return current;
      const index = practiceIndex.current;
      practiceIndex.current += 1;
      const planned = stored.planned?.coordinates;
      const point = planned && planned.length > 1
        ? pointAlongRoute(planned, index * 3.4, current.startedAt + index * 1000)
        : practicePoint(index, current.startedAt);
      if (!point) return current;
      return addPoint(current, point);
      });
    }, 1000);
    return () => {
      if (practiceTimer.current) clearInterval(practiceTimer.current);
    };
  }, [stored?.id, stored?.session.source]);

  useEffect(() => {
    if (!stored || !session || session.status === 'finished') return undefined;
    const controls = store.settings.headphoneControls !== false;
    const notify = store.settings.backgroundAudio !== false;
    if (!controls && !notify) {
      void stopPocket();
      return undefined;
    }
    void startPocket(() => {
      const current = sessionRef.current;
      const latest = storeRef.current;
      const unit = latest.settings.units;
      const coach = latest.coach;
      const distance = current ? `${formatDistance(current.distanceM, unit)} ${unit}` : `0 ${unit}`;
      const paceValue = current ? formatPace(currentPace(current, unit) ?? averagePace(current, unit)) : '—';
      const mode = coach.liveTalk ? 'Live' : 'Coach';
      return {
        time: current ? formatDuration(activeMs(current, Date.now())) : '00:00',
        distance,
        pace: `${paceValue} /${unit}`,
        companion: `${voiceTitle(coach.voiceId)} · ${mode}${coach.voiceEnabled ? '' : ' · quiet'}`,
        paused: current?.status === 'paused',
        status: current?.status ?? 'running',
      };
    }, { controls, notify });
    return () => {
      void stopPocket();
    };
  }, [session?.status, stored?.id, store.settings.backgroundAudio, store.settings.headphoneControls]);

  useEffect(() => {
    if (!stored || stored.session.source !== 'gps') return;
    let alive = true;
    void startBackgroundUpdates().then((on) => {
      if (alive) setBackgroundOn(on);
    });
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
  const track = session.points.map((point) => [point.lon, point.lat] as [number, number]);
  const planned = stored.planned?.coordinates ?? [];
  const kmCount = Math.floor(session.distanceM / (unit === 'mi' ? 1609.344 : 1000));
  const markers = prefs.markers
    ? Array.from({ length: kmCount }, (_, index) => {
        const point = pointAlongRoute(track.length > 1 ? track : planned, (index + 1) * (unit === 'mi' ? 1609.344 : 1000), session.startedAt);
        return point ? { lon: point.lon, lat: point.lat, label: `${index + 1}` } : null;
      }).filter((item): item is { lon: number; lat: number; label: string } => Boolean(item))
    : [];
  const thread = store.db.messages.filter((item) => item.runId === stored.id);
  const lastYou = [...thread].reverse().find((item) => item.role === 'you')?.text;
  const lastPace = [...thread].reverse().find((item) => item.role === 'coach')?.text;
  const toneName = store.coach.coachingTone === 'energetic' ? 'Energetic' : store.coach.coachingTone === 'calm' ? 'Calm' : store.coach.coachingTone === 'focused' ? 'Focused' : 'Friendly';
  const callState = callLabel(pace.status, pace.hearing, !store.coach.voiceEnabled, pace.mic);
  async function allowMic() {
    const result = await requestPermission('microphone');
    store.updateSettings({ microphoneAllowed: result.granted });
    if (result.granted) pace.retryMic();
    else openSystemSettings();
  }
  const runner = last ? { lon: last.lon, lat: last.lat } : null;
  const user = session.source === 'gps' ? device ?? runner : runner;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PaceMap
        prefs={prefs}
        follow={session.status === 'running'}
        user={user}
        markers={markers}
        tracks={[
          ...(planned.length > 1 ? [{ id: 'planned', coordinates: planned, color: '#3E5A24', width: 6, opacity: 0.9 }] : []),
          ...(track.length > 1 ? [{ id: 'track', coordinates: track, color: '#B6FF00', width: 5, opacity: 1 }] : []),
        ]}
      />
      <View style={{ position: 'absolute', top: 54, left: 16, right: 16, gap: 8 }} pointerEvents="box-none">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close map" onPress={() => (expanded ? setExpanded(false) : router.back())} style={({ pressed }) => [pill(colors.surface), pressed && { opacity: 0.7 }]}>
            <T weight="bold">{expanded ? 'Close' : 'Back'}</T>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={liveTalk ? 'Switch to coach updates' : 'Turn on live conversation'} onPress={() => store.saveCoach({ liveTalk: !liveTalk, voiceEnabled: true })} style={({ pressed }) => [pill(liveTalk ? colors.lime : colors.surface), pressed && { opacity: 0.8 }]}>
            <T weight="bold" color={liveTalk ? colors.onLime : colors.text}>{liveTalk ? 'Live' : 'Coach'}</T>
            <T size={11} color={liveTalk ? colors.onLime : colors.muted}>{liveTalk ? 'Tap for coach' : 'Tap for live'}</T>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/map-options')} style={({ pressed }) => [pill(colors.surface), pressed && { opacity: 0.7 }]}>
            <T weight="semibold">Layers</T>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={pill(colors.surface)}><T weight="bold">{`${formatDistance(session.distanceM, unit)} ${unit}`}</T><T size={11} color={colors.muted}>Distance</T></View>
          <View style={pill(colors.surface)}><T weight="bold">{`${formatPace(currentPace(session, unit) ?? averagePace(session, unit))} /${unit}`}</T><T size={11} color={colors.muted}>Pace</T></View>
          {!expanded ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Expand map" onPress={() => setExpanded(true)} style={({ pressed }) => [pill(colors.surface), pressed && { opacity: 0.7 }]}>
              <T weight="semibold">Expand</T>
            </Pressable>
          ) : null}
        </View>
        {!expanded ? (
          <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 12, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T size={13} weight="semibold">{liveTalk ? 'Live conversation' : 'Coach updates'}</T>
              {liveTalk ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 14 }}>
                  {[0, 1, 2].map((bar) => (
                    <View key={bar} style={{ width: 3, height: 6 + bar * 4, borderRadius: 2, backgroundColor: pace.hearing || pace.status === 'speaking' ? colors.lime : colors.faint }} />
                  ))}
                </View>
              ) : null}
            </View>
            {liveTalk && pace.mic === 'denied' ? (
              <Pressable accessibilityRole="button" onPress={() => void allowMic()} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <T weight="semibold">The microphone is off. Allow it so PACE can hear you.</T>
                <T color={colors.link} weight="bold" style={{ marginTop: 4 }}>Allow microphone</T>
              </Pressable>
            ) : (
              <T size={12} color={colors.muted}>{liveTalk ? (pace.mic === 'unknown' ? 'Checking the microphone…' : store.coach.voiceEnabled ? `${callState} · Mic open` : 'Muted · Mic open') : 'Speaks the splits. The mic stays off until you turn Live on.'}</T>
            )}
            {liveTalk ? <T size={11} color={colors.link} weight="semibold">YOU</T> : null}
            {liveTalk ? <T size={13}>{lastYou || (pace.mic === 'denied' ? 'Allow the microphone, then just talk.' : 'The mic is open. Just talk.')}</T> : null}
            <T size={11} color={colors.link} weight="semibold">{voiceTitle(store.coach.voiceId).toUpperCase()}</T>
            <T size={13} color={colors.muted}>{lastPace || (liveTalk ? 'Saying hello…' : 'I will speak at the start and at each split.')}</T>
            <T size={12} color={colors.muted}>{`${voiceTitle(store.coach.voiceId)} · ${toneName}`}</T>
          </View>
        ) : prefs.elevation ? (
          <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 12, alignSelf: 'flex-start' }}>
            <T size={12} color={colors.muted}>Elevation</T>
            <T weight="bold">{stored.planned?.elevationM ? `${stored.planned.elevationM} m` : 'Not sampled'}</T>
          </View>
        ) : null}
      </View>
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 24, gap: 8 }} pointerEvents="box-none">
        {offline ? <T size={12} color={colors.text}>No network. The run is still recording on this phone.</T> : null}
        {weak || gpsNote ? <T size={12} color={colors.text}>{gpsNote || 'GPS is weak. Distance stays at the last good point.'}</T> : null}
        {session.source === 'practice' ? <T size={12} color={colors.text}>{stored.planned ? 'Following the saved route without GPS.' : 'Practice route. These points are not your real location.'}</T> : null}
        {backgroundOn ? <T size={12} color={colors.text}>Background location is on.</T> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <T size={28} weight="bold">{formatDuration(activeMs(session, now))}</T>
            <T size={13} color={colors.muted}>{`${formatDistance(session.distanceM, unit)} ${unit} · ${formatPace(averagePace(session, unit))} avg`}</T>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={session.status === 'paused' ? 'Resume' : 'Pause'} onPress={() => router.push('/controls-sheet')} style={({ pressed }) => [{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 }]}>
            <T weight="bold" color={colors.onLime}>{session.status === 'paused' ? 'Go' : 'Pause'}</T>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/voice-sheet')} style={({ pressed }) => [pill(colors.surface), { flex: 1 }, pressed && { opacity: 0.7 }]}><T weight="semibold">Ask</T></Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/camera', params: { id: stored.id } })} style={({ pressed }) => [pill(colors.surface), { flex: 1 }, pressed && { opacity: 0.7 }]}><T weight="semibold">Note</T></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={store.coach.voiceEnabled ? 'Mute companion' : 'Unmute companion'} onPress={() => store.saveCoach({ voiceEnabled: !store.coach.voiceEnabled })} style={({ pressed }) => [pill(store.coach.voiceEnabled ? colors.surface : colors.lime), { flex: 1 }, pressed && { opacity: 0.7 }]}><T weight="semibold" color={store.coach.voiceEnabled ? colors.text : colors.onLime}>{store.coach.voiceEnabled ? 'Mute' : 'Unmute'}</T></Pressable>
        </View>
      </View>
      {store.settings.lockRun ? (
        <RunLock
          time={formatDuration(activeMs(session, now))}
          distance={`${formatDistance(session.distanceM, unit)} ${unit}`}
          pace={`${formatPace(currentPace(session, unit) ?? averagePace(session, unit))} /${unit}`}
          companion={liveTalk ? `${callState} · ${voiceTitle(store.coach.voiceId)}` : `${voiceTitle(store.coach.voiceId)} · Coach updates`}
          onUnlock={() => store.updateSettings({ lockRun: false })}
          onPause={() => getRunControl()?.pause()}
        />
      ) : null}
    </View>
  );
}

function callLabel(status: 'listening' | 'thinking' | 'speaking' | 'reconnecting' | 'disconnected', hearing: boolean, muted: boolean, mic: 'unknown' | 'granted' | 'denied'): string {
  if (mic === 'denied') return 'Mic off';
  if (muted) return 'Muted';
  if (hearing) return 'You are talking';
  if (status === 'speaking') return 'Speaking';
  if (status === 'thinking') return 'Thinking';
  if (status === 'reconnecting') return 'Reconnecting';
  if (status === 'disconnected') return 'Connecting';
  return 'Listening';
}

function pill(background: string) {
  return { backgroundColor: background, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, justifyContent: 'center' as const };
}
