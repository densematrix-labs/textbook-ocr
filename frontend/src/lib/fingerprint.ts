import FingerprintJS from '@fingerprintjs/fingerprintjs'

let cachedDeviceId: string | null = null

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId
  
  // Check localStorage first
  const stored = localStorage.getItem('deviceId')
  if (stored) {
    cachedDeviceId = stored
    return stored
  }
  
  // Generate new fingerprint
  const fp = await FingerprintJS.load()
  const result = await fp.get()
  const deviceId = result.visitorId
  
  localStorage.setItem('deviceId', deviceId)
  cachedDeviceId = deviceId
  
  return deviceId
}
