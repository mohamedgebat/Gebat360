import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-v567.js`,
        chunkFileNames: `assets/[name]-[hash]-v567.js`,
        assetFileNames: `assets/[name]-[hash]-v567.[ext]`
      }
    }
  }
})
