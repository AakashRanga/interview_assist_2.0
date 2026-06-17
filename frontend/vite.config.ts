import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_API_BASE_URL || 'http://localhost:8000';

  return {
    plugins: [react()],
    base: '/',
    server: {
      port: 8189,
      host: '0.0.0.0',
      proxy: {
        '/admin': {
          target: backendUrl,
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept && req.headers.accept.indexOf('html') !== -1) {
              return '/index.html';
            }
          }
        },
        '/auth': {
          target: backendUrl,
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept && req.headers.accept.indexOf('html') !== -1) {
              return '/index.html';
            }
          }
        },
        '/resume': {
          target: backendUrl,
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept && req.headers.accept.indexOf('html') !== -1) {
              return '/index.html';
            }
          }
        },
        '/candidate': {
          target: backendUrl,
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept && req.headers.accept.indexOf('html') !== -1) {
              return '/index.html';
            }
          }
        },
        '/notification': {
          target: backendUrl,
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept && req.headers.accept.indexOf('html') !== -1) {
              return '/index.html';
            }
          }
        },
        '/feedback': {
          target: backendUrl,
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept && req.headers.accept.indexOf('html') !== -1) {
              return '/index.html';
            }
          }
        },
        '/user': {
          target: backendUrl,
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept && req.headers.accept.indexOf('html') !== -1) {
              return '/index.html';
            }
          }
        },
        '/uploads': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  };
})