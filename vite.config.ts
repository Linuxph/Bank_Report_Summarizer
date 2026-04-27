import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/process-pdf': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/download-report': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/generate-summary': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/download-summary': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
