/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#10454B',       // fox's deep navy-teal shadow — primary dark tone
        parchment: '#FBF1DE', // was pure white/cream, now a soft gold tint
        moss: '#D9791E',      // fox's vivid ear orange — primary accent color
        clay: '#25615C',      // fox's mid teal-blue coat — secondary accent
        gold: '#10454B',      // fox's cream/gold muzzle tone
      }, 
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};