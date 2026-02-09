import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAppStore } from '../lib/store'

// Mock the API
vi.mock('../lib/api', () => ({
  getTokenStatus: vi.fn(),
}))

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state
    useAppStore.setState({
      tokenStatus: null,
      isLoading: false,
      error: null,
    })
  })

  it('has correct initial state', () => {
    const state = useAppStore.getState()
    expect(state.tokenStatus).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('setError updates error state', () => {
    const { setError } = useAppStore.getState()
    setError('Test error')
    expect(useAppStore.getState().error).toBe('Test error')
  })

  it('clearError clears error state', () => {
    useAppStore.setState({ error: 'Some error' })
    const { clearError } = useAppStore.getState()
    clearError()
    expect(useAppStore.getState().error).toBeNull()
  })

  it('fetchTokenStatus sets loading state', async () => {
    const { getTokenStatus } = await import('../lib/api')
    const mockGetTokenStatus = vi.mocked(getTokenStatus)
    
    mockGetTokenStatus.mockImplementation(() => new Promise(() => {})) // Never resolves

    const { fetchTokenStatus } = useAppStore.getState()
    fetchTokenStatus()
    
    expect(useAppStore.getState().isLoading).toBe(true)
  })

  it('fetchTokenStatus updates tokenStatus on success', async () => {
    const { getTokenStatus } = await import('../lib/api')
    const mockGetTokenStatus = vi.mocked(getTokenStatus)
    
    const mockStatus = {
      device_id: 'test',
      free_uses_remaining: 3,
      paid_tokens: 0,
      total_available: 3,
    }
    mockGetTokenStatus.mockResolvedValue(mockStatus)

    const { fetchTokenStatus } = useAppStore.getState()
    await fetchTokenStatus()
    
    expect(useAppStore.getState().tokenStatus).toEqual(mockStatus)
    expect(useAppStore.getState().isLoading).toBe(false)
  })

  it('fetchTokenStatus sets error on failure', async () => {
    const { getTokenStatus } = await import('../lib/api')
    const mockGetTokenStatus = vi.mocked(getTokenStatus)
    
    mockGetTokenStatus.mockRejectedValue(new Error('Network error'))

    const { fetchTokenStatus } = useAppStore.getState()
    await fetchTokenStatus()
    
    expect(useAppStore.getState().error).toBe('Network error')
    expect(useAppStore.getState().isLoading).toBe(false)
  })
})
