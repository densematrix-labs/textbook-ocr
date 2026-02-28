import { getDeviceId } from './fingerprint'

const API_BASE = '/api/v1'

export interface TokenStatus {
  device_id: string | null
  user_id: string | null
  phone?: string
  mode: 'device' | 'user'
  free_uses_remaining: number
  paid_tokens: number
  total_available: number
}

export interface OCRResult {
  success: boolean
  markdown?: string
  error?: string
  tokens_remaining: number
}

export interface Product {
  id: string
  name: string
  tokens: number
  price_cents: number
  price_display: string
}

export interface CheckoutResponse {
  checkout_url: string
  checkout_id: string
}

export interface PaymentStatus {
  status: string
  tokens_granted: number
  token_status: TokenStatus
}

function extractErrorMessage(detail: unknown): string {
  if (typeof detail === 'string') {
    return detail
  }
  if (typeof detail === 'object' && detail !== null) {
    const obj = detail as Record<string, unknown>
    return String(obj.error || obj.message || 'An error occurred')
  }
  return 'An error occurred'
}

/**
 * Get auth headers including JWT if available
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  
  const token = localStorage.getItem('access_token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const internalKey = localStorage.getItem('internalKey')
  if (internalKey) {
    headers['X-Internal-Key'] = internalKey
  }
  
  return headers
}

export async function getTokenStatus(): Promise<TokenStatus> {
  const deviceId = await getDeviceId()
  
  const response = await fetch(`${API_BASE}/ocr/tokens`, {
    headers: {
      'X-Device-Id': deviceId,
      ...getAuthHeaders(),
    },
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(extractErrorMessage(data.detail))
  }
  
  return response.json()
}

export async function processOCR(file: File): Promise<OCRResult> {
  const deviceId = await getDeviceId()
  
  const formData = new FormData()
  formData.append('file', file)
  
  const headers: Record<string, string> = {
    'X-Device-Id': deviceId,
    ...getAuthHeaders(),
  }
  
  const response = await fetch(`${API_BASE}/ocr/process`, {
    method: 'POST',
    headers,
    body: formData,
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(extractErrorMessage(data.detail))
  }
  
  return response.json()
}

export async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE}/payment/products`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }
  
  const data = await response.json()
  return data.products
}

export async function createCheckout(productId: string): Promise<CheckoutResponse> {
  const deviceId = await getDeviceId()
  const token = localStorage.getItem('access_token')
  
  // Get user_id if logged in
  let userId: string | undefined
  if (token) {
    try {
      // Decode JWT to get user_id (simple base64 decode of payload)
      const payload = JSON.parse(atob(token.split('.')[1]))
      userId = payload.sub || payload.user_id
    } catch {
      // Ignore decode errors
    }
  }
  
  const response = await fetch(`${API_BASE}/payment/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      product_id: productId,
      device_id: deviceId,
      user_id: userId,
      success_url: `${window.location.origin}/payment/success`,
      cancel_url: `${window.location.origin}/pricing`,
    }),
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(extractErrorMessage(data.detail))
  }
  
  return response.json()
}

export async function getPaymentStatus(checkoutId: string): Promise<PaymentStatus> {
  const response = await fetch(`${API_BASE}/payment/status/${checkoutId}`, {
    headers: getAuthHeaders(),
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(extractErrorMessage(data.detail))
  }
  
  return response.json()
}

export async function convertToDocx(markdown: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/ocr/convert-docx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ markdown }),
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(extractErrorMessage(data.detail))
  }
  
  return response.blob()
}
