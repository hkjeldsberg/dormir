import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { timingSafeEqual, createHash } from 'crypto'
import { sessionOptions, type SessionData } from '@/lib/session'

function safeEqual(a: string, b: string): boolean {
  // Hash both so lengths match and comparison stays constant-time
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export async function POST(request: NextRequest) {
  const expected = process.env.APP_PASSWORD
  if (!expected || !process.env.SESSION_SECRET) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  let password: unknown
  try {
    ;({ password } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (typeof password !== 'string' || !safeEqual(password, expected)) {
    await new Promise((r) => setTimeout(r, 1000)) // brute-force friction
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  session.isLoggedIn = true
  await session.save()
  return NextResponse.json({ ok: true })
}
