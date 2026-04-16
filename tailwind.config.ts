import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        black: 'var(--black)',
        dark: 'var(--dark)',
        card: 'var(--card)',
        border: 'var(--border)',
        red: 'var(--red)',
        'red-dark': 'var(--red-dark)',
        'red-glow': 'var(--red-glow)',
        blue: 'var(--blue)',
        'blue-dark': 'var(--blue-dark)',
        'blue-glow': 'var(--blue-glow)',
        white: 'var(--white)',
        subtle: 'var(--subtle)',
        muted: 'var(--muted)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'var(--radius-sm)',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}
export default config
