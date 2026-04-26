import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    // Bind to all interfaces so Docker can expose the port
    host: '0.0.0.0',
    port: 5173,

    // Dev proxy — avoids CORS when running outside Docker
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/stream': {
        target: 'http://localhost:80',
        changeOrigin: true,
      },
    },
  },

  // Expose VITE_ env vars to the app
  envPrefix: 'VITE_',
})

