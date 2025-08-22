/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{astro,md,mdx,js,ts}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0b0b',
        fg: '#fafafa',
        neon: '#00ff9c',
        accent: '#ff2bd6',
        muted: '#9ca3af'
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular']
      },
      boxShadow: {
        neon: '0 0 0 2px #00ff9c, 0 0 20px #00ff9c99'
      },
      typography: ({ theme }) => ({
        invert: {
          css: {
            '--tw-prose-body': theme('colors.fg'),
            '--tw-prose-headings': theme('colors.fg'),
            '--tw-prose-links': theme('colors.neon'),
            '--tw-prose-bold': theme('colors.fg'),
            '--tw-prose-counters': theme('colors.muted'),
            '--tw-prose-bullets': theme('colors.muted'),
            '--tw-prose-hr': theme('colors.fg / 0.2'),
            '--tw-prose-quotes': theme('colors.fg'),
            '--tw-prose-quote-borders': theme('colors.neon'),
            '--tw-prose-captions': theme('colors.muted'),
            '--tw-prose-code': theme('colors.accent'),
            '--tw-prose-pre-code': theme('colors.fg'),
            '--tw-prose-pre-bg': '#111111',
            '--tw-prose-th-borders': theme('colors.fg / 0.2'),
            '--tw-prose-td-borders': theme('colors.fg / 0.1')
          }
        }
      })
    }
  },
  plugins: [require('@tailwindcss/typography')]
};
