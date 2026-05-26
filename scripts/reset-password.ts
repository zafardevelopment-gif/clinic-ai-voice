/**
 * Password reset utility.
 *
 * Use when you forget an admin/clinic user's password.
 *
 * Usage (from project root):
 *   npx tsx scripts/reset-password.ts <email> <new-password>
 *
 * Examples:
 *   npx tsx scripts/reset-password.ts admin@clinicai.com MyNewPass123
 *   npx tsx scripts/reset-password.ts clinic@demo.com Clinic@2026
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local automatically
 * (Next.js loads them) — but when running standalone with tsx, we load .env.local
 * manually below.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const contents = readFileSync(envPath, 'utf-8')
    for (const line of contents.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // .env.local missing is fine if env vars are already set
  }
}

async function main() {
  loadEnvLocal()

  const [, , email, newPassword] = process.argv

  if (!email || !newPassword) {
    console.error('Usage: npx tsx scripts/reset-password.ts <email> <new-password>')
    process.exit(1)
  }

  if (newPassword.length < 8) {
    console.error('Password must be at least 8 characters.')
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const normalizedEmail = email.toLowerCase().trim()
  const hash = await bcrypt.hash(newPassword, 12)

  const { data: existing, error: lookupErr } = await supabase
    .from('users')
    .select('id, email, role, full_name')
    .eq('email', normalizedEmail)
    .single()

  if (lookupErr || !existing) {
    console.error(`No user found with email: ${normalizedEmail}`)
    console.error(lookupErr?.message || '')
    process.exit(1)
  }

  const { error: updateErr } = await supabase
    .from('users')
    .update({ password_hash: hash, updated_at: new Date().toISOString() })
    .eq('id', existing.id)

  if (updateErr) {
    console.error('Failed to update password:', updateErr.message)
    process.exit(1)
  }

  console.log('Password updated successfully.')
  console.log(`  Email: ${existing.email}`)
  console.log(`  Name:  ${existing.full_name || '(none)'}`)
  console.log(`  Role:  ${existing.role}`)
  console.log(`  New password: ${newPassword}`)
  console.log('')
  console.log('You can now log in at http://localhost:3000/login')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
