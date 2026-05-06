import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // PraxAM brand tokens — see ../BRAND.md
        navy: {
          DEFAULT: '#0F2D4F',
          soft: '#E5EBF3',
        },
        teal: {
          DEFAULT: '#1B9D9D',
          soft: '#E0F4F4',
          deep: '#147878',
        },
        violet: {
          DEFAULT: '#6B4FA8',
          soft: '#EDE7F8',
        },
        paper: '#FAFBFD',
        surface: {
          DEFAULT: '#FFFFFF',
          cool: '#F1F4F8',
        },
        ink: {
          DEFAULT: '#0F2D4F',
          soft: '#4A5C75',
          muted: '#8492A8',
        },
        line: {
          DEFAULT: '#DCE3EC',
          strong: '#C2CCD9',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '20px',
        'xl': '28px',
        'pill': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(15, 45, 79, 0.05)',
        'md': '0 4px 16px rgba(15, 45, 79, 0.07)',
        'lg': '0 24px 48px -12px rgba(15, 45, 79, 0.14)',
        'glow': '0 0 0 1px #E0F4F4, 0 8px 24px rgba(27, 157, 157, 0.22)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6B4FA8 0%, #0F2D4F 50%, #1B9D9D 100%)',
      },
      transitionTimingFunction: {
        'brand': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
