/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF9F4',
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#1B211F',
          muted: '#5B655F',
          faint: '#8A9490',
        },
        hairline: '#E3E1D6',
        moss: {
          50: '#EEF4F1',
          100: '#D7E6DF',
          400: '#4C8A76',
          500: '#2F6F5E',
          600: '#25594B',
          700: '#1C4339',
        },
        ochre: {
          100: '#F3E6C8',
          400: '#C99A3E',
          500: '#B9862E',
          600: '#976D22',
        },
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
