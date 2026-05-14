import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/

export default defineConfig({
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'https://3dprintings.xyz',
        changeOrigin: true
      }
    }
  },
  plugins: [react(), tailwindcss()],
})
