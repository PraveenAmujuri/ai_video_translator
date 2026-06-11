import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '../../is-buffer/index.js': 'is-buffer',
      '../is-buffer/index.js': 'is-buffer',
    }
  },
  // Injects CommonJS support definitions for the global execution scope
  define: {
    'global': 'globalThis',
  },
  commonjsOptions: {
    transformMixedEsModules: true, // Converts modules using mixed import/require types
  }
})
