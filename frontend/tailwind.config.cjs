/**
 * OCC - Object Control Center
 * @author Cleiton Otávio de Sousa
 * @version 1.0.0
 *
 * Tokens visuais alinhados à identidade das Lojas Renner S/A.
 */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#e30613',
          dark: '#b9050f',
          soft: '#fdecee',
          50: '#fff5f5',
        },
        ink: {
          DEFAULT: '#1c1c1a',
          soft: '#2a2a27',
          muted: '#57534e',
        },
        sand: '#d7a17a',
        sea: '#487a7b',
        ochre: '#cc8400',
        clay: '#be5400',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgb(28 28 26 / 0.05)',
        card: '0 1px 2px 0 rgb(28 28 26 / 0.04), 0 8px 24px -12px rgb(28 28 26 / 0.18)',
        lift: '0 2px 4px 0 rgb(28 28 26 / 0.05), 0 18px 40px -18px rgb(28 28 26 / 0.28)',
      },
      blur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 260ms ease-out',
        'rise-in': 'riseIn 320ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        riseIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
