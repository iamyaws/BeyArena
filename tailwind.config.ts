import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // BX palette (Section 10.1 of spec)
        'bx-yellow': '#FDE047',
        'bx-crimson': '#DC2626',
        'bx-cobalt': '#2563EB',
      },
      fontFamily: {
        display: ['"Druk Wide"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
