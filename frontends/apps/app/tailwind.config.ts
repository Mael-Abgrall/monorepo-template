import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{html,js}'],
  theme: {
    extend: {
      colors: {
        brand: {
          '50': '#f8fcfb',
          '100': '#d5f2e9',
          '200': '#abe4d2',
          '300': '#7aceb7',
          '400': '#4eb39a',
          '500': '#349881',
          '600': '#287969',
          '700': '#26695c',
          '800': '#204f47',
          '900': '#1f423c',
          '950': '#0c2723',
        },
      },
    },
  },
  plugins: [typography],
};
