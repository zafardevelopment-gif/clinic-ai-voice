import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'ca_session'

export interface SessionPayload {
  userId: string
  email: string
  role: 'admin' | 'clinic_admin' | 'doctor' | 'receptionist'
  fullName: string | null
  clinicId: string | null
}

// Simple base64 encode/decode (no crypto dependency needed for demo)
// For production, replace with a proper JWT or encrypted cookie library.
export function encodeSession(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

export function decodeSession(token: string): SessionPayload | null {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf8')
    return JSON.parse(json) as SessionPayload
  } catch {
    return null
  }
}

// Read session from server component (uses next/headers cookies())
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return decodeSession(token)
}
