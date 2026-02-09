import { create } from 'zustand'
import { TokenStatus, getTokenStatus } from './api'

interface AppState {
  tokenStatus: TokenStatus | null
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchTokenStatus: () => Promise<void>
  setError: (error: string | null) => void
  clearError: () => void
}

export const useAppStore = create<AppState>((set) => ({
  tokenStatus: null,
  isLoading: false,
  error: null,
  
  fetchTokenStatus: async () => {
    set({ isLoading: true, error: null })
    try {
      const status = await getTokenStatus()
      set({ tokenStatus: status, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch token status',
        isLoading: false 
      })
    }
  },
  
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}))
