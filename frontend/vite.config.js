import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Subcaminho de publicação (ex.: VITE_BASE_PATH=rateios → /rateios/). Vazio = raiz do domínio
const base = `/${(process.env.VITE_BASE_PATH || '').replace(/^\/+|\/+$/g, '')}/`.replace(/\/+/g, '/')

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    // Em desenvolvimento, /api vai para o backend local (npm run dev na pasta backend)
    proxy: { '/api': process.env.VITE_API_PROXY || 'http://localhost:5000' },
  },
})
