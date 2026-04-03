/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        crown: {
          bg: '#0f0f13',
          surface: '#1a1a24',
          border: '#2a2a3a',
          accent: '#7c5cbf',
          'accent-light': '#9b7fd4',
          text: '#e2e2f0',
          muted: '#7a7a9a',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#e2e2f0',
            a: { color: '#9b7fd4' },
            strong: { color: '#e2e2f0' },
            code: { color: '#f0a0c0' },
            h1: { color: '#e2e2f0' },
            h2: { color: '#e2e2f0' },
            h3: { color: '#e2e2f0' },
            h4: { color: '#e2e2f0' },
            blockquote: { color: '#9a9ab8', borderLeftColor: '#7c5cbf' },
          },
        },
      },
    },
  },
  plugins: [],
};
