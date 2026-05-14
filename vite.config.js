import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/

export default defineConfig({
  server: {
    host: true,
    port: 3000, // Ensure this matches what Nginx is looking for
    allowedHosts: [
      '3dprintings.xyz',
      'www.3dprintings.xyz'
    ],
    proxy: {
      '/api': {
        // Point this directly to your Node.js backend port
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [react(), tailwindcss()],
})