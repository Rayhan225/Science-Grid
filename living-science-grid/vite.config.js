import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pdfjs-dist') || id.includes('react-pdf')) {
              return 'vendor-pdf';
            }
            if (id.includes('mathjs')) {
              return 'vendor-mathjs';
            }
            if (id.includes('katex') || id.includes('rehype-katex') || id.includes('remark-math')) {
              return 'vendor-katex';
            }
            if (id.includes('@xyflow') || id.includes('react-force-graph-2d')) {
              return 'vendor-graph';
            }
            if (id.includes('recharts')) {
              return 'vendor-recharts';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-lucide';
            }
            if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) {
              return 'vendor-react';
            }
          }
        }
      }
    }
  }
})
