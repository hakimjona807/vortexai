import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/apiRoutes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Support JSON and URL-encoded payloads (common for telephony webhooks)
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Request logger for telephony and audit inspection
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API ${req.method}] ${req.path}`);
    }
    next();
  });

  // Mount backend API routes
  app.use('/api', apiRouter);

  // Vite middleware in dev mode or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VORTEX AI Server] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[VORTEX AI Server] Telephony Webhook: http://0.0.0.0:${PORT}/api/telephony/incoming-call`);
  });
}

bootstrap().catch((err) => {
  console.error('[VORTEX AI] Failed to start server:', err);
  process.exit(1);
});
