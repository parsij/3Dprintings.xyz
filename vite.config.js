import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

const backendPort = process.env.VITE_BACKEND_PORT || "3000";
const backendTarget = `http://localhost:${backendPort}`;

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      '3dprintings.xyz',
      'www.3dprintings.xyz',
      'localhost',
      '127.0.0.1',
    ],
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [react(), tailwindcss()],
})
