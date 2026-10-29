/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'Syne', 'system-ui', 'sans-serif'],
        syne: ['Syne', 'system-ui', 'sans-serif'],
        editorial: ['Instrument Serif', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        titanium: {
          950: '#0B0C0E',
          900: '#121418',
          800: '#1B1E24',
        },
        alabaster: {
          50: '#F4F3EF',
          100: '#EAE6DF',
          200: '#DCD6CB',
        },
        volt: '#D4FF33',
        coral: '#FF5A36',
        mint: '#2EE59D',
        prisma: {
          volt: '#D4FF33',
          mint: '#2EE59D',
          coral: '#FF5A36',
          sky: '#38BDF8',
        },
      },
      borderRadius: {
        pass: '24px',
        card: '18px',
      },
    },
  },
  plugins: [],
};
