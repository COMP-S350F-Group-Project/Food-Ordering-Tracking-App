import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Let esbuild treat any "*.js" under src/ as JSX during dep optimization
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    host: true, // expose to LAN for mobile testing
    port: Number(process.env.PORT) || 5173,
    // Disable overlay from breaking the page; errors still print in terminal
    hmr: { overlay: false },
    // Proxy API and WebSocket to backend during dev
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', changeOrigin: true, ws: true },
      '/intro': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  preview: {
    host: true,
    port: 4173
  }
})
