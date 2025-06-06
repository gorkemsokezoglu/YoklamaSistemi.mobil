/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1e40af', // IUC mavi rengi
        secondary: '#64748b',
        error: '#ef4444',
        background: '#f5f5f5',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
}

