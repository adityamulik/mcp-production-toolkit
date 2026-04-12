import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/logs/stream': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
      '/logs': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/stats': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/events': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/mcp': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/metrics': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/teams': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
