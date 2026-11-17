'use client'

import { useState } from 'react'
import { motion } from 'motion/react'

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
        className="w-full max-w-sm space-y-4"
      >
        <div className="mb-8 text-center">
          <div className="text-5xl" aria-hidden>🌙</div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Dormir</h1>
        </div>
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          className="w-full rounded-2xl bg-ink-card px-4 py-4 text-lg outline-none ring-indigo/60 placeholder:text-label-muted focus:ring-2"
        />
        {error && <p role="alert" className="text-center text-sm text-danger">{error}</p>}
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={busy || !password}
          className="w-full rounded-2xl bg-amber py-4 text-lg font-semibold text-black disabled:opacity-40"
        >
          {busy ? 'Checking…' : 'Enter'}
        </motion.button>
      </motion.form>
    </main>
  )
}
