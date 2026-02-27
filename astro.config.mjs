import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  site: 'https://hayashi-antas.github.io',
  base: '/AI-policy',

  vite: {
    plugins: [tailwindcss()],
  },
});