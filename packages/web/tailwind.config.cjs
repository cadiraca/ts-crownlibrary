/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        crown: {
          bg: '#0f0f1a',
          surface: '#1a1a2e',
          accent: '#e94560',
          text: '#e4e4e4',
          muted: '#888',
          border: '#2a2a3e',
          hover: '#252540',
        }
      }
    },
  },
  plugins: [],
};
