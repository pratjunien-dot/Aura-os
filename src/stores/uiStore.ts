import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Preset } from '@/types';

type View = 'dashboard' | 'chat' | 'settings' | 'debate';
type DrawerState = { favorites: boolean; history: boolean };

interface UIStore {
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  view: View;
  drawers: DrawerState;
  theme: string;
  glassIntensity: number;       // 1–5 (map vers blur px)
  glassOpacity: number;         // 0.03–0.25
  reduceMotion: boolean;
  mode: 'dark' | 'light' | 'oled';
  dockPinned: boolean;
  hasSeenDockTip: boolean;
  presets: Preset[];
  activePresetId: string | null;
  // Actions
  setView: (v: View) => void;
  openDrawer: (d: keyof DrawerState) => void;
  closeDrawer: (d: keyof DrawerState) => void;
  setTheme: (t: string) => void;
  setGlassIntensity: (n: number) => void;
  setMode: (m: 'dark' | 'light' | 'oled') => void;
  setDockPinned: (b: boolean) => void;
  setHasSeenDockTip: (b: boolean) => void;
  setPresets: (presets: Preset[]) => void;
  setActivePresetId: (id: string) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      view: 'dashboard',
      drawers: { favorites: false, history: false },
      theme: 'cyber',
      glassIntensity: 3,
      glassOpacity: 0.07,
      reduceMotion: false,
      mode: 'dark',
      dockPinned: false,
      hasSeenDockTip: false,
      presets: [],
      activePresetId: null,
      setView: (view) => set({ view }),
      openDrawer: (d) => set((s) => ({ drawers: { ...s.drawers, [d]: true } })),
      closeDrawer: (d) => set((s) => ({ drawers: { ...s.drawers, [d]: false } })),
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },
      setGlassIntensity: (n) => {
        const blur = [8, 12, 16, 24, 32][n - 1];
        document.documentElement.style.setProperty('--glass-blur-l2', `blur(${blur}px)`);
        set({ glassIntensity: n });
      },
      setMode: (mode) => {
        document.documentElement.setAttribute('data-mode', mode);
        set({ mode });
      },
      setDockPinned: (dockPinned) => set({ dockPinned }),
      setHasSeenDockTip: (hasSeenDockTip) => set({ hasSeenDockTip }),
      setPresets: (presets) => set({ presets, activePresetId: presets.length > 0 ? presets[0].id : null }),
      setActivePresetId: (activePresetId) => set({ activePresetId }),
    }),
    {
      name: 'aura-ui-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
          // Appliquer le thème et mode au chargement
          document.documentElement.setAttribute('data-theme', state.theme);
          document.documentElement.setAttribute('data-mode', state.mode || 'dark');
          const blur = [8, 12, 16, 24, 32][state.glassIntensity - 1];
          document.documentElement.style.setProperty('--glass-blur-l2', `blur(${blur}px)`);
        }
      },
    }
  )
);
