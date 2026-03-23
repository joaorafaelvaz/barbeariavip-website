/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './admin/index.html',
    './js/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        'vip-black': '#0A0A0A',
        'vip-green': '#00FF00',
        'vip-gold': '#D4AF37',
        'vip-cream': '#E5E2E1',
        'vip-sage': '#BDC9BC',
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
