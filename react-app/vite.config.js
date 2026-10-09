import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // The GitHub Pages demo is served from /worklog-hub/ (set VITE_BASE there).
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
})
