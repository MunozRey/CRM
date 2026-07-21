import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './views/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-hanken)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-hanken)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        propel: {
          green: '#0C8A68',
          'green-dark': '#0A6E54',
          ink: '#0C1F1A',
          'ink-deep': '#06231B',
          mint: '#44C2A0',
          'mint-bright': '#11A57E',
          'mint-light': '#9BE8CE',
          'mint-soft': '#7BE0BE',
          cream: '#FBFAF7',
          paper: '#EEFAF5',
          border: '#E8E5DD',
          'border-soft': '#EFEDE7',
          orange: '#FF6A45',
          'orange-light': '#FF8B6B',
           tint: '#D6F2E8',
          text: '#0C1F1A',
          'text-body': '#4A5852',
          'text-muted': '#5E6B66',
          'text-subtle': '#8A938E',
          'text-faint': '#A6ABA4',
          'on-ink': '#9FB3AB',
          'on-ink-soft': '#C9D6D0',
        },
        surface: {
          0: 'rgb(var(--color-surface-0) / <alpha-value>)',
          1: 'rgb(var(--color-surface-1) / <alpha-value>)',
          2: 'rgb(var(--color-surface-2) / <alpha-value>)',
        },
        sidebar: {
          DEFAULT: 'rgb(var(--color-sidebar) / <alpha-value>)',
          2: 'rgb(var(--color-sidebar-2) / <alpha-value>)',
        },
        fg: {
          DEFAULT: 'rgb(var(--color-fg) / <alpha-value>)',
          muted: 'rgb(var(--color-fg-muted) / <alpha-value>)',
          subtle: 'rgb(var(--color-fg-subtle) / <alpha-value>)',
        },
        accent: {
          300: 'rgb(var(--color-accent-300) / <alpha-value>)',
          400: 'rgb(var(--color-accent-400) / <alpha-value>)',
          500: 'rgb(var(--color-accent-500) / <alpha-value>)',
          600: 'rgb(var(--color-accent-600) / <alpha-value>)',
          700: 'rgb(var(--color-accent-700) / <alpha-value>)',
          800: 'rgb(var(--color-accent-800) / <alpha-value>)',
        },
        // Semantic + border colors (tokens existed but were never mapped, so
        // every bg-danger / text-success / border-border-subtle was a no-op).
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        ring: 'rgb(var(--color-ring) / <alpha-value>)',
        'border-subtle': 'rgb(var(--color-border-subtle) / 0.1)',
        'border-strong': 'rgb(var(--color-border-strong) / 0.16)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      // Custom scales referenced across the app that were never defined, so the
      // classes (text-2xs, duration-fast, min-h-control, z-modal, …) were no-ops.
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.95rem' }],
      },
      minHeight: {
        control: '2.5rem',
        row: '2.75rem',
      },
      transitionDuration: {
        fast: '150ms',
        base: '250ms',
      },
      transitionTimingFunction: {
        'out-strong': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      zIndex: {
        popover: '40',
        modal: '50',
        // `z-calendar`, `z-overlay`, `z-dropdown` were USED (Modal, SearchableSelect,
        // DropdownMenu) but never defined here → they resolved to no z-index, so any
        // select/menu opened inside a modal (e.g. the New Company form) rendered
        // BEHIND the modal (z-50) and looked like "no options". These must sit ABOVE
        // modals so a portalled dropdown always shows above whatever opened it.
        calendar: '60',
        overlay: '70',
        dropdown: '75',
      },
    },
  },
  plugins: [],
}

export default config
