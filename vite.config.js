import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rawTarget = (env.VITE_BACKEND_TARGET || '').trim()
  // Auto-normalize: strip trailing /api or trailing slash to prevent double /api in proxy routing
  const backendTarget = rawTarget.replace(/\/api\/?$/, '').replace(/\/$/, '')

  return {
    base: '/admin/',
    plugins: [react()],
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          headers: {
            'X-Tunnel-Skip-Anti-Phishing-Page': '1',
          },
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, res) => {
              console.warn(`[Vite Proxy] Target (${backendTarget}) unreachable:`, err.message);
              if (res && !res.headersSent && typeof res.writeHead === 'function') {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                  error: `Backend target (${backendTarget}) unreachable. Make sure the server or devtunnel is running.`,
                  details: err.message
                }));
              }
            });
          },
        },
      },
    },
  }
})
