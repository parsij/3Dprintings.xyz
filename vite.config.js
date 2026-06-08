import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import process from "node:process";

const backendPort = process.env.VITE_BACKEND_PORT || "3000";
const backendTarget = `http://localhost:${backendPort}`;

export default defineConfig({
  optimizeDeps: {
    include: ['react-spinners'],
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      '3dprintings.xyz',
      'www.3dprintings.xyz',
      'localhost',
      'seller.localhost',
      '.localhost',
      '127.0.0.1',
    ],
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
      }
    }
  },
  plugins: [react(), tailwindcss()],
})
