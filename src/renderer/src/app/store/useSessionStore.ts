import { create } from 'zustand'

export interface SessionUser {
  id: string
  email: string
  role: 'operator'
}

interface SessionState {
  user: SessionUser | null
  setUser: (user: SessionUser | null) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  setUser: (user) => set({ user })
}))
