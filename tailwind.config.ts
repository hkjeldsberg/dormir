import type { Config } from 'tailwindcss'

// "Midnight Garden" design system — colors sampled from design/06 · Midnight Garden@2x.png
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#0F1D17', // page background, inset fields
        surface: '#16291F', // arch / cards
        line: '#2F4A3A', // hairline borders
        cream: '#EDEFE6', // primary text, CTA
        mist: '#A9B8AE', // secondary text, labels
        sage: { DEFAULT: '#8FB89A', soft: '#1F3A2B' }, // selected, logo
        moss: '#5E7A68', // inactive moons, quiet marks
        rose: '#D9A6A0', // accent: toggle, underline, selected ring
        danger: '#E88A7D',
        // Validated ordinal ramp for rest (sleep_quality) 1→5 on #16291F (dataviz validator, dark)
        q: { 1: '#3f6650', 2: '#548069', 3: '#6d9a81', 4: '#8fb89a', 5: '#bcd8c3' },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        // Leaf cuts: small corners with one long "tip"
        leaf: '9px 9px 20px 9px',
        'leaf-lg': '30px 8px 30px 6px',
        card: '24px 12px 24px 12px',
      },
    },
  },
  plugins: [],
}

export default config
