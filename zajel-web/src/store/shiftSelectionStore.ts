import { create } from "zustand";

type ShiftSelectionState = {
  selectedShift: any | null;
  setSelectedShift: (shift: any | null) => void;
};

export const useShiftSelectionStore =
  create<ShiftSelectionState>((set) => ({
    selectedShift: null,
    setSelectedShift: (shift) =>
      set({ selectedShift: shift }),
  }));
