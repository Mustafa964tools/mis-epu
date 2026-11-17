import fs from 'node:fs';
import { spawn, ChildProcess } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const PYTHON_PORT = Number(process.env.PYTHON_PORT || 5001);
const IS_PROD = process.env.NODE_ENV === 'production';

let pythonProc: ChildProcess | null = null;

function startPythonServer(): void {
  const pyScript = path.join(__dirname, 'python_app', 'app.py');
  pythonProc = spawn('python3', [pyScript], {
    env: { ...process.env, PYTHON_PORT: String(PYTHON_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  pythonProc.stdout?.on('data', (chunk: Buffer) => {
    process.stdout.write(`[python] ${chunk.toString()}`);
  });

  pythonProc.stderr?.on('data', (chunk: Buffer) => {
    process.stderr.write(`[python:err] ${chunk.toString()}`);
  });

  pythonProc.on('exit', (code) => {
    console.log(`[python] exited with code ${code}`);
    pythonProc = null;
  });
}

async function waitForPython(maxWaitMs = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const ok = await new Promise<boolean>((resolve) => {
      const req = http.get(`http://127.0.0.1:${PYTHON_PORT}/api/health`, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(500, () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 150));
  }
}

function proxyToPython(req: Request, res: Response): void {
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    const bodyBuf = Buffer.concat(chunks);
    const headers: Record<string, string> = {};
    if (req.headers['content-type']) {
      headers['content-type'] = String(req.headers['content-type']);
    }
    if (req.headers['authorization']) {
      headers['authorization'] = String(req.headers['authorization']);
    }
    if (bodyBuf.length > 0) {
      headers['content-length'] = String(bodyBuf.length);
    }

    const proxyReq = http.request(
      {
        hostname: '127.0.0.1',
        port: PYTHON_PORT,
        path: req.originalUrl,
        method: req.method,
        headers,
      },
      (proxyRes) => {
        res.status(proxyRes.statusCode || 502);
        const contentType = proxyRes.headers['content-type'];
        if (contentType) {
          res.setHeader('Content-Type', contentType);
        }
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.status(502).json({ error: 'Python backend unavailable', detail: err.message });
      }
    });

    if (bodyBuf.length > 0) {
      proxyReq.write(bodyBuf);
    }
    proxyReq.end();
  });
}

async function isPythonAlive(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const req = http.get(`http://127.0.0.1:${PYTHON_PORT}/api/health`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(400, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensurePythonRunning(): Promise<void> {
  if (await isPythonAlive()) {
    return;
  }
  startPythonServer();
  await waitForPython(4000);
}

async function bootstrap(): Promise<void> {
  // Start Python backend asynchronously so Express binds port 3000 immediately
  void ensurePythonRunning();

  const app = express();

  const newsAssetsDir = path.join(__dirname, 'public', 'assets', 'news');
  const staffAssetsDir = path.join(__dirname, 'public', 'assets', 'staff');
  fs.mkdirSync(newsAssetsDir, { recursive: true });
  fs.mkdirSync(staffAssetsDir, { recursive: true });
  app.use('/assets/news', express.static(newsAssetsDir));
  app.use('/assets/staff', express.static(staffAssetsDir));

  // Proxy all /api/* traffic to the live Python PyFrame server
  app.use('/api', proxyToPython);

  if (IS_PROD) {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Express] Gateway listening on http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    if (pythonProc) {
      pythonProc.kill('SIGTERM');
    }
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  if (pythonProc) pythonProc.kill('SIGTERM');
  process.exit(1);
});
