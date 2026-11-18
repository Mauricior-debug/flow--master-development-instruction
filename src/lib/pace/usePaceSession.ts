import { requestRecordingPermissionsAsync, useAudioStream } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';

import { PaceVoice, type PaceContext, type PaceStatus } from './session';
import type { RealtimeVoiceId } from './voices';

type Options = {
  enabled: boolean;
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

export function usePaceSession(options: Options): { status: PaceStatus; announce: (text: string, important: boolean) => void } {
  const [status, setStatus] = useState<PaceStatus>('disconnected');
  const voiceRef = useRef<PaceVoice | null>(null);
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
      voiceRef.current?.close();
      voiceRef.current = null;
      try {
        stream.stop();
      } catch {
        // The microphone may already be stopped.
      }
      setStatus('disconnected');
      return undefined;
    }
    let alive = true;
    const session = new PaceVoice(options.voice, options.speed, {
      getContext: () => optionsRef.current.getContext(),
      onStatus: (next) => {
        if (alive) setStatus(next);
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
    voiceRef.current = session;
    void (async () => {
      try {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted || !alive) {
          setStatus('disconnected');
          return;
        }
        await session.connect();
        if (!alive) return;
        await stream.start();
      } catch {
        if (alive) setStatus('disconnected');
      }
    })();
    return () => {
      alive = false;
      session.close();
      try {
        stream.stop();
      } catch {
        // Already stopped.
      }
    };
  }, [options.enabled, options.speed, options.voice, stream]);

  return {
    status,
    announce: (text, important) => voiceRef.current?.announce(text, important),
  };
}
