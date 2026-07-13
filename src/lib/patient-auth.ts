import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

/**
 * Patient app auth — separate from src/lib/session.ts (clinic staff).
 *
 * Staff auth is cookie-based (server components read next/headers cookies()).
 * The patient app is a mobile client with no shared cookie jar, so it
 * authenticates via a bearer JWT sent on every request instead — short-lived
 * access token + longer-lived refresh token, both signed (not just
 * base64-encoded like the legacy staff session).
 *
 * IMPORTANT: `role` here is deliberately NOT merged into the staff
 * SessionPayload's role union — a patient token must never be usable against
 * a /api/clinic/* or /api/admin/* route, and vice versa. Keeping the two
 * token types structurally distinct (different secret, different payload
 * shape) makes that a type-level guarantee, not just a runtime check.
 */

export interface PatientTokenPayload {
  patientId: string
  email: string
  type: 'access' | 'refresh'
}

const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL = '30d'

function getSecret(): Uint8Array {
  const secret = process.env.PATIENT_JWT_SECRET
  if (!secret) throw new Error('PATIENT_JWT_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export async function signPatientAccessToken(patientId: string, email: string): Promise<string> {
  return new SignJWT({ patientId, email, type: 'access' } satisfies PatientTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecret())
}

export async function signPatientRefreshToken(patientId: string, email: string): Promise<string> {
  return new SignJWT({ patientId, email, type: 'refresh' } satisfies PatientTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(getSecret())
}

export async function verifyPatientToken(token: string): Promise<PatientTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (typeof payload.patientId !== 'string' || typeof payload.email !== 'string') return null
    if (payload.type !== 'access' && payload.type !== 'refresh') return null
    return { patientId: payload.patientId, email: payload.email, type: payload.type }
  } catch {
    return null
  }
}

/** Extracts + verifies the bearer access token from an incoming request. Returns null if missing/invalid/not an access token. */
export async function getPatientSession(req: NextRequest): Promise<PatientTokenPayload | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice('Bearer '.length)
  const payload = await verifyPatientToken(token)
  if (!payload || payload.type !== 'access') return null
  return payload
}
