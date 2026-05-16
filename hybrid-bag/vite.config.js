import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    open: process.env.VITE_OPEN === 'true',
    warmup: {
      clientFiles: ['./src/main.jsx', './src/App.jsx'],
    },
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'three',
      'three/examples/jsm/objects/Water.js',
      'three/examples/jsm/loaders/GLTFLoader.js',
      'three/examples/jsm/postprocessing/EffectComposer.js',
      'three/examples/jsm/postprocessing/RenderPass.js',
      'three/examples/jsm/postprocessing/UnrealBloomPass.js',
    ],
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
})
