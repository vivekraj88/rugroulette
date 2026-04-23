/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Fira Code"', 'monospace'],
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        rugroulette: {
          primary: '#ef4444',
          secondary: '#22c55e',
          accent: '#f59e0b',
          neutral: '#1a1a1a',
          'base-100': '#0d0d0d',
          'base-200': '#1a1a1a',
          'base-300': '#242424',
          info: '#3b82f6',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
    ],
  },
};
