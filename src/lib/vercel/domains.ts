/**
 * Vercel Domains API wrapper — used to give each clinic a fully working
 * custom domain (drclinic.com) pointed at their /c/[slug] public website,
 * fully automated (no manual dashboard steps per clinic).
 *
 * Docs: https://vercel.com/docs/rest-api/reference/endpoints/projects/add-a-domain-to-a-project
 *
 * Auth: requires VERCEL_API_TOKEN (Account Settings → Tokens) and
 * VERCEL_PROJECT_ID (Project Settings → General → Project ID). If the
 * project lives under a Team, also set VERCEL_TEAM_ID (Team Settings →
 * General → Team ID) — omitted for personal-account projects.
 */

const VERCEL_API_BASE = 'https://api.vercel.com'

export interface VerificationChallenge {
  type: string
  domain: string
  value: string
  reason: string
}

export interface AddDomainResult {
  verified: boolean
  verification: VerificationChallenge[] | null
}

export interface DomainConfigResult {
  verified: boolean
  misconfigured: boolean
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `${name} is not set. Custom domain automation requires VERCEL_API_TOKEN and ` +
      `VERCEL_PROJECT_ID (see CLINIC_OS_MODULES.md → Custom Domains for setup steps).`,
    )
  }
  return value
}

function apiUrl(path: string): string {
  const teamId = process.env.VERCEL_TEAM_ID
  const url = new URL(`${VERCEL_API_BASE}${path}`)
  if (teamId) url.searchParams.set('teamId', teamId)
  return url.toString()
}

async function vercelFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = requireEnv('VERCEL_API_TOKEN')
  return fetch(apiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
}

/**
 * Register a domain to this Vercel project. Idempotent — if the domain is
 * already registered to this project, Vercel returns its current state
 * rather than erroring.
 */
export async function addDomainToProject(domain: string): Promise<AddDomainResult> {
  const projectId = requireEnv('VERCEL_PROJECT_ID')
  const res = await vercelFetch(`/v10/projects/${projectId}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: domain }),
  })

  const data = await res.json()

  if (!res.ok) {
    // 409 = already added to this project — treat as success, re-check status.
    if (res.status === 409) {
      return checkDomainStatus(domain).then(s => ({ verified: s.verified, verification: null }))
    }
    throw new Error(data?.error?.message || `Vercel addDomain failed (${res.status})`)
  }

  return {
    verified: !!data.verified,
    verification: data.verification || null,
  }
}

/** Remove a domain from the project (clinic disconnects their domain). */
export async function removeDomainFromProject(domain: string): Promise<void> {
  const projectId = requireEnv('VERCEL_PROJECT_ID')
  const res = await vercelFetch(`/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}`, {
    method: 'DELETE',
  })
  if (!res.ok && res.status !== 404) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error?.message || `Vercel removeDomain failed (${res.status})`)
  }
}

/**
 * Check current verification/DNS-configuration status for a domain already
 * added to the project. Call this to poll until `verified` flips true.
 */
export async function checkDomainStatus(domain: string): Promise<DomainConfigResult> {
  const projectId = requireEnv('VERCEL_PROJECT_ID')

  const [domainRes, configRes] = await Promise.all([
    vercelFetch(`/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}`),
    vercelFetch(`/v6/domains/${encodeURIComponent(domain)}/config`),
  ])

  if (!domainRes.ok) {
    if (domainRes.status === 404) return { verified: false, misconfigured: true }
    const data = await domainRes.json().catch(() => ({}))
    throw new Error(data?.error?.message || `Vercel checkDomain failed (${domainRes.status})`)
  }

  const domainData = await domainRes.json()
  const configData = configRes.ok ? await configRes.json() : { misconfigured: true }

  return {
    verified: !!domainData.verified,
    misconfigured: !!configData.misconfigured,
  }
}
