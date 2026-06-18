import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Increase the chunk size warning threshold (in kB). Adjust as needed.
    chunkSizeWarningLimit: 2000
  },
})
