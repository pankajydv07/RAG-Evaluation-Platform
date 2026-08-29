/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0d0f0e',
        surface: '#151915',
        'surface-hover': '#20251f',
        primary: {
          50: '#f5ffd9',
          500: '#c7e86b',
          600: '#a7c84f',
          700: '#7f9e35',
        },
        accent: {
          cyan: '#c7e86b',
          emerald: '#b6de63',
          violet: '#c7e86b',
        }
      },
    },
  },
  plugins: [],
}
