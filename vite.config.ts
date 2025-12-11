import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', 
  build: {
    target: 'esnext', // Ensure modern JS output that uses native imports
    outDir: 'dist',
    rollupOptions: {
      // Externalize dependencies so Vite leaves the imports alone
      // and let the browser's Import Map handle them.
      external: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        'react-dom/client',
        'leaflet',
        'react-leaflet',
        'lucide-react',
        'jszip',
        '@turf/turf'
      ]
    }
  },
  optimizeDeps: {
    exclude: [
      'react',
      'react-dom',
      'leaflet',
      'react-leaflet',
      'lucide-react',
      'jszip',
      '@turf/turf'
    ]
  }
});