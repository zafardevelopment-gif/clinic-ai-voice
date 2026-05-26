'use client'

import { useEffect, useState } from 'react'

export interface ClientSession {
  userId: string
  email: string
  role: 'admin' | 'clinic_admin'
  fullName: string | null
  clinicId: string | null
}

export function useSession() {
  const [session, setSession] = useState<ClientSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setSession(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return { session, loading }
}
