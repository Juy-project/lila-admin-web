/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: { lila: { dark: '#0a0a0a', primary: '#8b5cf6' } }
    },
  },
  plugins: [],
}