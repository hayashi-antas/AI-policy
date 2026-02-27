/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'marble-bg': '#ffffff',
        'marble-surface': '#f8f9fa',
        'obsidian-text': '#1a1a1a',
        'stone-text': '#4a4a4a',
        'divine-gold': '#c5a059',
        'faint-line': '#e0e0e0',
      },
      fontFamily: {
        serif: ['Instrument Serif', 'serif'],
        sans: ['Noto Sans JP', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
