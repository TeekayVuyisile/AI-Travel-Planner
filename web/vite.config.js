import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    // A fixed zone keeps date formatting in tests the same on every machine and in CI
    env: { TZ: 'Africa/Johannesburg' },
  },
  server: {
    port: 5173,
    // Same-origin API calls in development, so no CORS setup is needed
    proxy: {
      '/api': process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
    },
  },
})
