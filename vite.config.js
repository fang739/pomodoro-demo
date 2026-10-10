import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 使用相对路径，方便部署到任意静态托管 / 子路径
  base: './',
  server: {
    port: 5173,
    open: false,
  },
})
