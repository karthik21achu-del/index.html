import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import worker from './worker/index.js';
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), { name: 'ecoshield-api', configureServer(server) {
    const env = loadEnv(mode, process.cwd(), '');
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/api/')) return next();
      try { const response = await worker.fetch(new Request('http://localhost' + req.url), env, {});
        res.statusCode = response.status; response.headers.forEach((v,k) => res.setHeader(k,v)); res.end(await response.text());
      } catch { res.statusCode = 503; res.end(JSON.stringify({ error: 'DATA SOURCE TEMPORARILY UNAVAILABLE' })); }
    });
  }}],
  envPrefix: 'ECO_PUBLIC_',
  build: { outDir: 'dist/client', chunkSizeWarningLimit: 900 },
}));
