// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sentry from '@sentry/astro';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [
    react(),
    sentry({
      sourceMapsUploadOptions: {
        telemetry: false,
      },
    })
  ]
});