import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', 
  build: {
    outDir: 'dist',
    rollupOptions: {
      // CRITICAL: Tell Vite to ignore these imports during build/serve
      // and assume they exist in the browser (via index.html importmap)
      external: [
        'react',
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
  // Also optimizeDeps exclusion for dev server
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