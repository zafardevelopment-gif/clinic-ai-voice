import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Your SaaS platform's own domains — custom clinic domains get rewritten
const PLATFORM_DOMAINS = [
  'medivoice.ai',
  'www.medivoice.ai',
  'localhost',
  'clinicvoice.aivexallp.com',
  // Add your Vercel preview URLs here if needed
]

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl

  // ── Custom domain handling ───────────────────────────────────
  // If the request is NOT from our platform domain, treat it as
  // a clinic custom domain and rewrite to /c/[slug].
  // The slug lookup happens in the layout/page via Supabase.
  //
  // Flow: drclinic.com/anything → rewrite to /c/__custom_domain__/anything
  // The [slug] layout checks custom_domain column in clinics table.

  const isPlatformDomain = PLATFORM_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))

  if (!isPlatformDomain) {
    // Skip API routes, static files on custom domains
    if (
      pathname.startsWith('/api/') ||
      pathname.startsWith('/_next/') ||
      pathname.match(/\.(ico|png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2|ttf)$/)
    ) {
      return NextResponse.next()
    }

    // Rewrite: encode the hostname as the slug placeholder
    // The layout will resolve custom_domain → slug
    const url = request.nextUrl.clone()
    url.pathname = `/c/__domain__${pathname === '/' ? '' : pathname}`
    url.searchParams.set('_domain', hostname)
    return NextResponse.rewrite(url)
  }

  // ── Normal session handling for platform domain ───────────────
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
