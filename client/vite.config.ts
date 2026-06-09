import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/ms/lesson-runner/',
  plugins: [tailwindcss()],
  server: { port: 5173 },
});