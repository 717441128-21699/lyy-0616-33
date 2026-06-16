/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        brand: {
          50: '#e8eef5',
          100: '#c5d5e8',
          200: '#9eb8d8',
          300: '#779bc8',
          400: '#5a86bc',
          500: '#3d71b0',
          600: '#346098',
          700: '#2a4e7f',
          800: '#1e3a5f',
          900: '#132640',
        },
        accent: {
          500: '#ff6b35',
          600: '#e55a2b',
        },
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
      },
      fontFamily: {
        display: ['DM Sans', 'sans-serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
