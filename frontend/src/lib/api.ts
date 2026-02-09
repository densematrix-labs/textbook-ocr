import { getDeviceId } from './fingerprint'

const API_BASE = '/api/v1'

export interface TokenStatus {
  device_id: string
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

export async function getTokenStatus(): Promise<TokenStatus> {
  const deviceId = await getDeviceId()
  
  const response = await fetch(`${API_BASE}/ocr/tokens`, {
    headers: {
      'X-Device-Id': deviceId,
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
  
  const response = await fetch(`${API_BASE}/ocr/process`, {
    method: 'POST',
    headers: {
      'X-Device-Id': deviceId,
    },
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
  
  const response = await fetch(`${API_BASE}/payment/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      device_id: deviceId,
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
  const response = await fetch(`${API_BASE}/payment/status/${checkoutId}`)
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(extractErrorMessage(data.detail))
  }
  
  return response.json()
}
