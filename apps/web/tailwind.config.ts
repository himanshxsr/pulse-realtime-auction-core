import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        shell: '#0F172A',
        canvas: '#F8FAFC',
        card: '#FFFFFF',
        border: '#E2E8F0',
        emerald: {
          50: '#ECFDF5',
          600: '#059669',
          700: '#047857',
        },
        crimson: {
          50: '#FEF2F2',
          600: '#DC2626',
          700: '#B91C1C',
        },
        amber: {
          50: '#FFFBEB',
          600: '#D97706',
          700: '#B45309',
        },
      },
    },
  },
  plugins: [],
};

export default config;
