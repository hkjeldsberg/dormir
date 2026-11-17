'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import { CheckIn } from './CheckIn'

const TABS = [
  { href: '/', label: 'Check-In', icon: '☾' },
  { href: '/insights', label: 'Insights', icon: '◔' },
  { href: '/history', label: 'History', icon: '▦' },
]

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.href = '/login'
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="mx-auto min-h-dvh max-w-[1440px] lg:grid lg:grid-cols-[380px_1fr] lg:gap-6 lg:px-6">
      {/* Desktop: fixed logger column */}
      <aside className="hidden lg:block">
        <div className="sticky top-0 max-h-dvh overflow-y-auto py-6">
          <CheckIn sticky={false} />
        </div>
      </aside>

      <div className="min-w-0">
        {/* Desktop top nav */}
        <nav className="sticky top-0 z-30 hidden items-center gap-1 bg-black/80 py-4 backdrop-blur lg:flex" aria-label="Main">
          <span className="mr-4 text-lg font-bold">🌙 Dormir</span>
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                pathname === t.href ? 'bg-ink-raised text-label' : 'text-label-muted hover:text-label'
              }`}
            >
              {t.href === '/' ? 'Overview' : t.label}
            </Link>
          ))}
          <button type="button" onClick={logout} className="ml-auto text-sm text-label-muted hover:text-label">
            Log out
          </button>
        </nav>

        <main className="px-4 pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+16px)] lg:px-0 lg:pb-12 lg:pt-2">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-line bg-black/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <ul className="grid h-[var(--tabbar-h)] grid-cols-3">
          {TABS.map((t) => {
            const active = pathname === t.href
            return (
              <li key={t.href} className="relative">
                <Link
                  href={t.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                    active ? 'text-amber' : 'text-label-muted'
                  }`}
                >
                  <span className="text-xl leading-none" aria-hidden>
                    {t.icon}
                  </span>
                  {t.label}
                </Link>
                {active && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute inset-x-8 top-0 h-0.5 rounded-full bg-amber"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
