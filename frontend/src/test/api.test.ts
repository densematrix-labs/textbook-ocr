import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must import after mocking fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Dynamic import to ensure mock is in place
const importApi = async () => {
  vi.resetModules()
  return import('../lib/api')
}

describe('API error handling', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('handles string error detail', async () => {
    const { getTokenStatus } = await importApi()
    
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: 'Something went wrong' }),
    })

    await expect(getTokenStatus()).rejects.toThrow('Something went wrong')
  })

  it('handles object error detail with error field', async () => {
    const { getTokenStatus } = await importApi()
    
    mockFetch.mockResolvedValue({
      ok: false,
      status: 402,
      json: () => Promise.resolve({
        detail: { error: 'No tokens remaining', code: 'payment_required' },
      }),
    })

    await expect(getTokenStatus()).rejects.toThrow('No tokens remaining')
  })

  it('handles object error detail with message field', async () => {
    const { getTokenStatus } = await importApi()
    
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({
        detail: { message: 'Invalid input' },
      }),
    })

    await expect(getTokenStatus()).rejects.toThrow('Invalid input')
  })

  it('never returns [object Object] in error message', async () => {
    const { getTokenStatus } = await importApi()
    
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({
        detail: { foo: 'bar', baz: 123 },
      }),
    })

    try {
      await getTokenStatus()
    } catch (e) {
      const message = (e as Error).message
      expect(message).not.toContain('[object Object]')
      expect(message).not.toContain('object Object')
    }
  })

  it('handles successful token status response', async () => {
    const { getTokenStatus } = await importApi()
    
    const mockStatus = {
      device_id: 'test-device',
      free_uses_remaining: 3,
      paid_tokens: 0,
      total_available: 3,
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStatus),
    })

    const result = await getTokenStatus()
    expect(result).toEqual(mockStatus)
  })

  it('handles successful products response', async () => {
    const { getProducts } = await importApi()
    
    const mockProducts = {
      products: [
        { id: 'ocr_3', name: 'Starter', tokens: 3, price_cents: 299, price_display: '$2.99' },
      ],
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProducts),
    })

    const result = await getProducts()
    expect(result).toEqual(mockProducts.products)
  })
})
