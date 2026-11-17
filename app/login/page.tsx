'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Flower } from '@/components/ui'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        window.location.href = '/'
        return
      }
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Login failed')
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-end justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+48px)] sm:items-center">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="w-full max-w-sm"
      >
        <div
          className="mb-6 border border-line bg-surface px-6 pb-8 pt-12 text-center"
          style={{ borderRadius: '50% 50% 28px 28px / 150px 150px 28px 28px' }}
        >
          <Flower size={60} className="mx-auto" />
          <h1 className="mt-4 font-serif text-[52px] italic leading-none text-sage">dormir</h1>
          <p className="mt-2 font-serif text-[18px] italic text-rose">the garden is resting</p>
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            aria-label="Password"
            className="mt-8 h-14 w-full rounded-card border border-line bg-night px-4 text-center text-lg text-cream outline-none placeholder:text-moss focus:border-sage"
          />
          {error && (
            <p role="alert" className="mt-3 text-sm text-rose">
              {error}
            </p>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={busy || !password}
          className="h-[60px] w-full rounded-leaf-lg bg-cream font-serif text-[23px] text-night disabled:opacity-40"
        >
          {busy ? 'Opening…' : 'Open the book'}
        </motion.button>
      </motion.form>
    </main>
  )
}
