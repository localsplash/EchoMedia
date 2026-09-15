require('./timezone');
const buildInfo = require('./buildInfo');

const express = require('express');
const morgan = require('morgan');
const path = require('path');

const app = express();
const port = process.env.PORT || 8082;
const MEDIA_ROOT = path.resolve(process.env.MEDIA_ROOT || '/media');

app.use(morgan('combined'));

// CORS — media is public for now; auth hooks added here in v2
app.use((_req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  if (_req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Health check
app.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'EchoMedia', ...buildInfo });
});

// Serve media files
// Paths like: /7146403939/7146120126/51/<uid>/image000001.jpg
app.get('/*', (req, res) => {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(req.path);
  } catch {
    return res.sendStatus(400);
  }
  const filePath = path.join(MEDIA_ROOT, decodedPath);

  // Prevent directory traversal
  if (!filePath.startsWith(MEDIA_ROOT)) {
    return res.sendStatus(403);
  }

  res.sendFile(filePath, {
    headers: { 'Cache-Control': 'public, max-age=86400' }
  }, (err) => {
    if (err && !res.headersSent) {
      if (err.code === 'ENOENT') return res.sendStatus(404);
      console.error(`[media] Error serving ${req.path}:`, err.message);
      res.sendStatus(500);
    }
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`EchoMedia listening on :${port} (root: ${MEDIA_ROOT})`);
});
