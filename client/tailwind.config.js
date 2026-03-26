/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'stoic-black': '#0a0a0a',
        'stoic-gray': '#141414',
        'stoic-border': '#262626',
      },
    },
  },
  plugins: [],
}
