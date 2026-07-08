import { create } from 'zustand';

interface PlaybackState {
  playing: boolean;
  timeMs: number;
  setPlaying: (playing: boolean) => void;
  toggle: () => void;
  seek: (timeMs: number) => void;
}

export const usePlayback = create<PlaybackState>()((set) => ({
  playing: true,
  timeMs: 0,
  setPlaying: (playing) => set({ playing }),
  toggle: () => set((s) => ({ playing: !s.playing })),
  seek: (timeMs) => set({ timeMs }),
}));
