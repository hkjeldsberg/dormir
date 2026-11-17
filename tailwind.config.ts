import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#000000',
          card: '#1C1C1E',
          raised: '#2C2C2E',
          line: '#38383A',
        },
        label: {
          DEFAULT: '#F5F5F7',
          secondary: '#AEAEB2',
          muted: '#8E8E93',
        },
        amber: {
          DEFAULT: '#F5B041',
          soft: '#3A2C12',
        },
        indigo: {
          DEFAULT: '#7A78E6',
          soft: '#23224A',
        },
        // Validated ordinal ramp for sleep_quality 1→5 on #1C1C1E (dataviz validator, dark)
        q: {
          1: '#4a47a3',
          2: '#5b59c4',
          3: '#716fdc',
          4: '#8f8ded',
          5: '#b6b7f8',
        },
        danger: '#FF6961',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}

export default config
