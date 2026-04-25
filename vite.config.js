import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: 'public',
  server: {
    port: 3004,
  },
  preview: {
    port: 3004,
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 5000,
  },
})
