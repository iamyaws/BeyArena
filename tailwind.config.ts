import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // BX palette (Section 10.1 of spec) — kept in sync with CSS vars in index.css
        'bx-yellow': '#FDE047',
        'bx-yellow-deep': '#EAB308',
        'bx-crimson': '#DC2626',
        'bx-crimson-deep': '#991B1B',
        'bx-cobalt': '#2563EB',
        'bx-cobalt-deep': '#1E3A8A',
        'bx-ink': '#07070A',
        'bx-ink-2': '#0F1014',
        'bx-ink-3': '#16181F',
        'bx-ink-4': '#1E2029',
        'bx-line': '#2A2D38',
      },
      fontFamily: {
        display: ['"Saira Stencil One"', 'Bebas Neue', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        body: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'bx-spin': {
          to: { transform: 'rotate(360deg)' },
        },
        'bx-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        'bx-sweep': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(220%)' },
        },
      },
      animation: {
        'bx-spin': 'bx-spin 4.5s linear infinite',
        'bx-spin-fast': 'bx-spin 1.2s linear infinite',
        'bx-pulse': 'bx-pulse 1.6s ease-in-out infinite',
        'bx-sweep': 'bx-sweep 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
