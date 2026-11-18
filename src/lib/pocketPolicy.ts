export const LOCK_CONTROLS = {
  isLiveStream: true,
  showSeekForward: false,
  showSeekBackward: false,
  showNextTrack: false,
  showPreviousTrack: false,
} as const;

export function nowPlayingCopy(input: { time: string; distance: string; pace: string; companion: string; paused: boolean }): {
  title: string;
  artist: string;
  albumTitle: string;
} {
  return {
    title: input.paused ? 'PACE AI · Paused' : 'PACE AI · Live run',
    artist: `${input.distance} · ${input.pace}`,
    albumTitle: `${input.time} · ${input.companion}`,
  };
}

export function remotePauseIntent(timeControlStatus: string, playing: boolean, runStatus: string): 'pause' | 'resume' | 'ignore' {
  if (timeControlStatus === 'waiting') return 'ignore';
  if (!playing && runStatus === 'running') return 'pause';
  if (playing && runStatus === 'paused') return 'resume';
  return 'ignore';
}
