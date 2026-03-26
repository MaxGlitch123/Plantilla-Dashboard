import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api-proxy': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy/, ''),
        secure: false
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Forzar uso de modo desarrollo para React
  define: {
    'process.env.NODE_ENV': '"development"',
    global: 'globalThis', // Fix para SockJS
  },
  build: {
    minify: false, // Desactivar minificación para ver mensajes de error completos
    sourcemap: true // Habilitar sourcemaps
  }
});
