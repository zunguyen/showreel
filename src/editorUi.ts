import { create } from 'zustand';

/** Transient editor UI state shared between the control panel and canvas gizmos. */
interface EditorUiState {
  selectedOrb: number;
  setSelectedOrb: (i: number) => void;
  selectedStop: number | null;
  setSelectedStop: (i: number | null) => void;
}

export const useEditorUi = create<EditorUiState>()((set) => ({
  selectedOrb: 0,
  setSelectedOrb: (i) => set({ selectedOrb: i }),
  selectedStop: 0,
  setSelectedStop: (i) => set({ selectedStop: i }),
}));
