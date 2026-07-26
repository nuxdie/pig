import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import wasm from 'vite-plugin-wasm';

// Pages serves the project under /pig/; dev stays at the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/pig/' : '/',
  plugins: [svelte(), wasm()],
  build: { target: 'es2022' },
  worker: { format: 'es' }
}));
