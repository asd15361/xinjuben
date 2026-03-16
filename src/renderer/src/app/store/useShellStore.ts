import { create } from 'zustand'

interface ShellState {
  isDegraded: boolean
  setDegradedMode: (isDegraded: boolean) => void
}

export const useShellStore = create<ShellState>((set) => ({
  isDegraded: false,
  setDegradedMode: (isDegraded) => set({ isDegraded })
}))
