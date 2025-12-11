import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', 
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-leaflet',
        'leaflet',
        'lucide-react',
        'jszip',
        '@turf/turf'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-leaflet': 'ReactLeaflet',
          leaflet: 'L',
          jszip: 'JSZip'
        },
        paths: {
          // Ensure these match the import map keys if necessary, 
          // though usually 'external' is enough for browser native imports
        }
      }
    }
  },
});