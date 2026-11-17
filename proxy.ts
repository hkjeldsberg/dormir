import { NextResponse, type NextRequest } from 'next/server'
import { unsealData } from 'iron-session'
import { sessionOptions, type SessionData } from '@/lib/session'

const PUBLIC_PREFIXES = ['/login', '/api/auth/']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const cookie = request.cookies.get(sessionOptions.cookieName)?.value
  let ok = false
  if (cookie && sessionOptions.password) {
    try {
      const s = await unsealData<SessionData>(cookie, {
        password: sessionOptions.password as string,
        ttl: sessionOptions.ttl,
      })
      ok = s.isLoggedIn === true
    } catch {
      ok = false
    }
  }
  if (ok) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  // Everything except Next internals and public PWA/static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest).*)'],
}
