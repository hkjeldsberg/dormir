import type { Metadata, Viewport } from 'next'
import { Cormorant, EB_Garamond, Work_Sans } from 'next/font/google'
import './globals.css'

const serif = EB_Garamond({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' })
// Google's EB Garamond subset lacks the `onum` feature; Cormorant's default figures are old-style
const numerals = Cormorant({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-numerals', display: 'swap' })
const sans = Work_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })

export const metadata: Metadata = {
  title: 'dormir',
  description: 'Personal sleep & factor tracker',
  appleWebApp: { capable: true, title: 'dormir', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0F1D17',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${numerals.variable} ${sans.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  )
}
