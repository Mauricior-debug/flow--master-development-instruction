import { requestRecordingPermissionsAsync, useAudioStream } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';

import type { CallTurn, WorkoutNotice } from './call';
import { PaceVoice, type PaceContext, type PaceStatus } from './session';
import type { RealtimeVoiceId } from './voices';

type Options = {
  enabled: boolean;
  muted: boolean;
  voice: RealtimeVoiceId;
  speed: number;
  getContext: () => PaceContext;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onMute: (muted: boolean) => void;
  onTone: (tone: 'calm' | 'friendly' | 'energetic' | 'focused') => void;
  onSafety: (line: string) => void;
  onHeard: (text: string) => void;
  onSaid: (text: string) => void;
};

export function usePaceSession(options: Options): {
  status: PaceStatus;
  hearing: boolean;
  mic: 'unknown' | 'granted' | 'denied';
  say: (text: string) => boolean;
  note: (notice: WorkoutNotice) => void;
  setMuted: (muted: boolean) => void;
  ensure: () => void;
  retryMic: () => void;
} {
  const [status, setStatus] = useState<PaceStatus>('disconnected');
  const [hearing, setHearing] = useState(false);
  const [mic, setMic] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [kick, setKick] = useState(0);
  const voiceRef = useRef<PaceVoice | null>(null);
  const historyRef = useRef<CallTurn[]>([]);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const { stream } = useAudioStream({
    sampleRate: 24000,
    channels: 1,
    encoding: 'int16',
    onBuffer: (buffer) => {
      const data = buffer.data.slice(0);
      voiceRef.current?.pushMic(data, buffer.sampleRate || 24000);
    },
  });

  useEffect(() => {
    if (!options.enabled) {
      historyRef.current = voiceRef.current?.historySnapshot() ?? historyRef.current;
      voiceRef.current?.close();
      voiceRef.current = null;
      try {
        stream.stop();
      } catch {
        // The microphone may already be stopped.
      }
      setStatus('disconnected');
      setHearing(false);
      return undefined;
    }
    let alive = true;
    const session = new PaceVoice(options.voice, options.speed, {
      getContext: () => optionsRef.current.getContext(),
      onStatus: (next) => {
        if (alive) setStatus(next);
      },
      onHearing: (next) => {
        if (alive) setHearing(next);
      },
      onPause: () => optionsRef.current.onPause(),
      onResume: () => optionsRef.current.onResume(),
      onFinish: () => optionsRef.current.onFinish(),
      onMute: (muted) => optionsRef.current.onMute(muted),
      onTone: (tone) => optionsRef.current.onTone(tone),
      onSafety: (line) => optionsRef.current.onSafety(line),
      onHeard: (text) => optionsRef.current.onHeard(text),
      onSaid: (text) => optionsRef.current.onSaid(text),
    });
    session.restore(historyRef.current);
    session.setMuted(options.muted);
    voiceRef.current = session;
    void (async () => {
      try {
        const permission = await requestRecordingPermissionsAsync();
        if (!alive) return;
        if (!permission.granted) {
          setMic('denied');
          setStatus('disconnected');
          return;
        }
        setMic('granted');
        await session.connect();
        if (!alive) return;
        await stream.start();
      } catch {
        if (alive) setStatus('reconnecting');
      }
    })();
    return () => {
      alive = false;
      historyRef.current = session.historySnapshot();
      session.close();
      try {
        stream.stop();
      } catch {
        // Already stopped.
      }
    };
  }, [kick, options.enabled, options.speed, options.voice, stream]);

  useEffect(() => {
    voiceRef.current?.setMuted(options.muted);
  }, [options.muted]);

  return {
    status,
    hearing,
    mic,
    say: (text) => voiceRef.current?.say(text) ?? false,
    note: (notice) => voiceRef.current?.note(notice),
    setMuted: (muted) => voiceRef.current?.setMuted(muted),
    ensure: () => voiceRef.current?.ensure(),
    retryMic: () => setKick((value) => value + 1),
  };
}
