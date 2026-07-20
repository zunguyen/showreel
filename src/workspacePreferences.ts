import { create } from 'zustand';

export type WorkspaceRailTab = 'screens' | 'templates';

interface SavedWorkspacePreferences {
  activeRailTab: WorkspaceRailTab;
  panelLayout: Record<'rail' | 'canvas' | 'inspector', number>;
  coachStep: number;
  coachDismissed: boolean;
}

interface WorkspacePreferences extends SavedWorkspacePreferences {
  setActiveRailTab: (tab: WorkspaceRailTab) => void;
  setPanelLayout: (layout: Record<string, number>) => void;
  advanceCoach: () => void;
  dismissCoach: () => void;
}

const KEY = 'showreel-workspace-v1';

const defaults: SavedWorkspacePreferences = {
  activeRailTab: 'screens',
  panelLayout: { rail: 18, canvas: 57, inspector: 25 },
  coachStep: 0,
  coachDismissed: false,
};

function load(): SavedWorkspacePreferences {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<SavedWorkspacePreferences>;
    const layout = raw.panelLayout;
    return {
      activeRailTab: raw.activeRailTab === 'templates' ? 'templates' : 'screens',
      panelLayout:
        layout &&
        Number.isFinite(layout.rail) &&
        Number.isFinite(layout.canvas) &&
        Number.isFinite(layout.inspector)
          ? layout
          : defaults.panelLayout,
      coachStep: Math.max(0, Math.min(2, Number(raw.coachStep) || 0)),
      coachDismissed: raw.coachDismissed === true,
    };
  } catch {
    return defaults;
  }
}

function save(state: SavedWorkspacePreferences) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // The editor remains usable when storage is unavailable.
  }
}

function persisted(state: WorkspacePreferences): SavedWorkspacePreferences {
  return {
    activeRailTab: state.activeRailTab,
    panelLayout: state.panelLayout,
    coachStep: state.coachStep,
    coachDismissed: state.coachDismissed,
  };
}

export const useWorkspacePreferences = create<WorkspacePreferences>()((set) => ({
  ...load(),
  setActiveRailTab: (activeRailTab) =>
    set((state) => {
      const next = { ...state, activeRailTab };
      save(persisted(next));
      return { activeRailTab };
    }),
  setPanelLayout: (layout) =>
    set((state) => {
      if (!Number.isFinite(layout.rail) || !Number.isFinite(layout.canvas) || !Number.isFinite(layout.inspector)) {
        return state;
      }
      const panelLayout = {
        rail: layout.rail,
        canvas: layout.canvas,
        inspector: layout.inspector,
      };
      const next = { ...state, panelLayout };
      save(persisted(next));
      return { panelLayout };
    }),
  advanceCoach: () =>
    set((state) => {
      if (state.coachStep >= 2) {
        const next = { ...state, coachDismissed: true };
        save(persisted(next));
        return { coachDismissed: true };
      }
      const coachStep = state.coachStep + 1;
      const next = { ...state, coachStep };
      save(persisted(next));
      return { coachStep };
    }),
  dismissCoach: () =>
    set((state) => {
      const next = { ...state, coachDismissed: true };
      save(persisted(next));
      return { coachDismissed: true };
    }),
}));
