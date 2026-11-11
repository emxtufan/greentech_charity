import 'dotenv/config';

import express from 'express';
import {existsSync} from 'node:fs';
import {createServer as createHttpServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import adminHandler from './api/admin.js';
import submissionsHandler from './api/submissions.js';
import {smtpIsConfigured} from './api/_mailer.js';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const production = process.argv.includes('--production') || (
  process.env.NODE_ENV === 'production' && !process.argv.includes('--dev')
);

process.env.NODE_ENV = production ? 'production' : 'development';

const app = express();
const httpServer = createHttpServer(app);
const host = String(process.env.HOST || '0.0.0.0');
const port = Number.parseInt(process.env.PORT || '3000', 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT trebuie sa fie un numar intre 1 si 65535.');
}

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({limit: '64kb'}));

app.get('/healthz', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json({status: 'ok', service: 'greentech-charity', smtpConfigured: smtpIsConfigured()});
});

app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use('/admin', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  next();
});

function route(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}

app.all('/api/submissions', route(submissionsHandler));
app.all('/api/admin', route(adminHandler));

if (production) {
  const distRoot = path.join(projectRoot, 'dist');

  if (!existsSync(path.join(distRoot, 'index.html'))) {
    throw new Error('Build-ul lipseste. Ruleaza mai intai `npm run build`.');
  }

  app.use(express.static(distRoot, {
    index: 'index.html',
    setHeaders(res, filePath) {
      if (/[\\/]brandbook-section[\\/]content\.json$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
        return;
      }

      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
        return;
      }

      if (filePath.endsWith('stage-worker.js') || filePath.endsWith('index.js')) {
        res.setHeader('Cache-Control', 'no-cache');
        return;
      }

      if (/[\\/]brandbook-section[\\/]assets[\\/]/.test(filePath)) {
        const versioned = /[?&]v=/.test(String(res.req?.originalUrl || ''));
        if (versioned) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('CDN-Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
        }
        return;
      }

      if (filePath.endsWith('.glb')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('CDN-Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Accept-Ranges', 'bytes');
      }
    }
  }));

  app.use((_req, res) => {
    const notFoundPage = path.join(distRoot, '404', 'index.html');
    if (existsSync(notFoundPage)) return res.status(404).sendFile(notFoundPage);
    return res.status(404).type('text').send('Pagina nu a fost gasita.');
  });
} else {
  const {createServer: createViteServer} = await import('vite');
  const vite = await createViteServer({
    root: projectRoot,
    server: {
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR === 'true' ? false : {server: httpServer}
    }
  });

  app.use(vite.middlewares);
}

app.use((error, _req, res, _next) => {
  console.error('Server request failed', error);
  if (res.headersSent) return res.end();
  return res.status(500).json({error: 'A aparut o eroare interna.'});
});

httpServer.listen(port, host, () => {
  const label = production ? 'productie' : 'dezvoltare';
  console.log(`GREENTECH Charity (${label}): http://${host}:${port}`);
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal}: serverul se opreste controlat.`);

  const forceTimer = setTimeout(() => {
    console.error('Oprire fortata dupa expirarea perioadei de gratie.');
    httpServer.closeAllConnections?.();
    process.exit(1);
  }, 15_000);
  forceTimer.unref();

  httpServer.close((error) => {
    clearTimeout(forceTimer);
    if (error) {
      console.error('Serverul nu s-a putut opri corect.', error);
      process.exitCode = 1;
    }
  });
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
