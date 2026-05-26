import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, decodeSession } from '@/lib/session'

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? decodeSession(token) : null

  // Public routes — redirect to dashboard if already logged in
  if (path === '/login' || path === '/') {
    if (session) {
      const dest = session.role === 'admin' ? '/admin/dashboard' : '/clinic/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return NextResponse.next()
  }

  // API routes — let them handle their own auth
  if (path.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Protected routes — must be logged in
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role-based access
  if (path.startsWith('/admin') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/clinic/dashboard', request.url))
  }

  if (path.startsWith('/clinic') && session.role !== 'clinic_admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return NextResponse.next()
}
