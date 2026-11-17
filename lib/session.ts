import type { SessionOptions } from 'iron-session'

export interface SessionData {
  isLoggedIn: boolean
}

export const sessionOptions: SessionOptions = {
  cookieName: 'dormir-session',
  password: process.env.SESSION_SECRET as string,
  ttl: 60 * 60 * 24 * 365, // 1 year — zero friction at 6:30 AM
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  },
}
