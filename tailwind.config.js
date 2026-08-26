/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Sicak krem / fildisi arka plan tonlari
        cream: {
          50: '#FBF7EF',
          100: '#F6EFE0',
          200: '#EDE1C9',
          300: '#E2D0AF',
        },
        // Derin terracotta (kiremit kirmizisi/turuncusu)
        terracotta: {
          50: '#FaEEE9',
          100: '#F4DAD0',
          300: '#DE8C74',
          400: '#CF6E52',
          500: '#BC4E32',
          600: '#A23D26',
          700: '#82301E',
        },
        // Zeytin yesili vurgular
        olive: {
          50: '#F0F1E4',
          100: '#E1E4CB',
          300: '#A7B274',
          400: '#8B9A54',
          500: '#6F7E3C',
          600: '#57642F',
          700: '#434D25',
        },
        // Koyu antrasit metinler
        charcoal: {
          600: '#4A433C',
          700: '#3A342E',
          800: '#2B2724',
          900: '#1E1B18',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Nunito', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 6px 20px -8px rgba(43, 39, 36, 0.18)',
        card: '0 10px 30px -12px rgba(43, 39, 36, 0.25)',
        glow: '0 0 0 3px rgba(188, 78, 50, 0.15)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.18s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
