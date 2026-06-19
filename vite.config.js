/* eslint-disable no-undef */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    // Optional bundle visualizer; run with ANALYZE=1 to generate `dist/stats.html`
    process.env.ANALYZE === '1' && visualizer({ filename: 'dist/stats.html', open: false })
  ],
  build: {
    // Increase the chunk size warning threshold (in kB). Adjust as needed.
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id) return;
          if (id.includes('node_modules')) {
            if (id.includes('chart.js')) return 'vendor-chartjs';
            if (id.includes('xlsx') || id.includes('sheetjs')) return 'vendor-xlsx';
            if (id.includes('papaparse')) return 'vendor-papaparse';
            if (id.includes('react-chartjs-2')) return 'vendor-react-chartjs';
            if (id.includes('@supabase')) return 'vendor-supabase';
            return 'vendor';
          }
        }
      }
    }
  },
})
