'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import { CheckIn, Wordmark } from './CheckIn'

const TABS = [
  { href: '/', label: 'Check-in', desktopLabel: 'Overview' },
  { href: '/insights', label: 'Insights', desktopLabel: 'Insights' },
  { href: '/history', label: 'History', desktopLabel: 'History' },
]

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.href = '/login'
}

function TabLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative inline-block font-serif text-[22px] ${active ? 'italic text-cream' : 'text-mist hover:text-cream'}`}
    >
      {label}
      {active && (
        <motion.span
          layoutId="tab-underline"
          className="absolute inset-x-0 -bottom-0.5 h-px bg-rose"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}
    </Link>
  )
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="mx-auto min-h-dvh max-w-[1440px] lg:grid lg:grid-cols-[400px_1fr] lg:gap-8 lg:px-8">
      {/* Desktop: fixed logger column */}
      <aside className="hidden lg:block">
        <div className="sticky top-0 max-h-dvh overflow-y-auto py-8 pr-1">
          <CheckIn sticky={false} />
        </div>
      </aside>

      <div className="min-w-0">
        {/* Desktop top nav */}
        <nav className="sticky top-0 z-30 hidden items-center gap-8 border-b border-line bg-night/90 py-5 backdrop-blur lg:flex" aria-label="Main">
          {TABS.map((t) => (
            <TabLink key={t.href} href={t.href} label={t.desktopLabel} active={pathname === t.href} />
          ))}
          <button type="button" onClick={logout} className="ml-auto text-sm text-mist hover:text-cream">
            Log out
          </button>
        </nav>

        <main className="px-4 pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+20px)] lg:px-0 lg:pb-12 lg:pt-6">
          {children}
        </main>
      </div>

      {/* Mobile tab bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 bg-night pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="mx-4 grid h-[var(--tabbar-h)] grid-cols-3 items-center border-t border-line text-center">
          {TABS.map((t) => (
            <li key={t.href}>
              <TabLink href={t.href} label={t.label} active={pathname === t.href} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

