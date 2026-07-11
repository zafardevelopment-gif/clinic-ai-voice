import type { SessionPayload } from './session'

/**
 * Role-based access helper for the new Clinic OS modules (reminders++,
 * follow-ups, triage, lab reports). Existing routes are untouched — they
 * keep checking `role === 'admin'` or just the presence of `clinicId`.
 *
 * clinic_admin is always a superset of doctor/receptionist within their own
 * clinic (owner/manager persona). admin (Super Admin) passes every check
 * that also validates clinicId scoping, since admin routes resolve clinic_id
 * from a query param instead of session.clinicId.
 */
export type ClinicRole = 'clinic_admin' | 'doctor' | 'receptionist'

export function requireRole(
  session: SessionPayload | null,
  allowed: ClinicRole[],
): boolean {
  if (!session) return false
  if (session.role === 'admin') return true
  if (session.role === 'clinic_admin') return true
  return allowed.includes(session.role as ClinicRole)
}

/** Resolve the clinic_id a request should operate on, or null if unauthorized. */
export function resolveClinicScope(
  session: SessionPayload | null,
  queryClinicId?: string | null,
): string | null {
  if (!session) return null
  if (session.role === 'admin') return queryClinicId || session.clinicId || null
  return session.clinicId || null
}
