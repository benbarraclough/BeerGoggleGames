/** @type {import('tailwindcss').Config} */
module.exports = {
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
      }
    }
  },
  plugins: []
};