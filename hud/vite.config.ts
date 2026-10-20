import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Nur lokal erreichbar (TCK-140); LAN-Zugriff explizit per VITE_HOST=0.0.0.0
    host: process.env.VITE_HOST || 'localhost',
  },
})
