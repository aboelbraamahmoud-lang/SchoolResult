const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain; charset=utf-8'
};

function safeFile(root, pathname) {
  const decoded = decodeURIComponent(pathname || '/');
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const normalized = path.normalize(relative).replace(/^(\.\.(\/|\\|$))+/, '');
  const target = path.resolve(root, normalized);
  const resolvedRoot = path.resolve(root);
  const base = resolvedRoot + path.sep;
  if (target !== resolvedRoot && !target.startsWith(base)) return null;
  return target;
}

function validateWebRoot(root) {
  const required = ['index.html', 'app.js', 'style.css', 'supabase.js', 'version.json'];
  const missing = required.filter(name => !fs.existsSync(path.join(root, name)));
  if (missing.length) throw new Error(`ملفات تشغيل مفقودة: ${missing.join(', ')}`);
}

function createStaticServer(root, requestedPort = 0) {
  validateWebRoot(root);
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const currentAddress = server.address();
        const currentPort = currentAddress && typeof currentAddress === 'object' ? currentAddress.port : requestedPort;
        const url = new URL(req.url, `http://127.0.0.1:${currentPort}`);
        let filePath = safeFile(root, url.pathname);
        if (!filePath) {
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Forbidden');
        }
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Not found');
        }
        const ext = path.extname(filePath).toLowerCase();
        const headers = {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': ext === '.html' || ext === '.js' || ext === '.css' ? 'no-cache, no-store, must-revalidate' : 'private, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
          'Cross-Origin-Resource-Policy': 'same-origin',
          'Referrer-Policy': 'no-referrer',
          'X-Frame-Options': 'DENY',
          'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; worker-src 'self' blob:"
        };
        if (ext === '.xlsx') {
          const name = encodeURIComponent(path.basename(filePath));
          headers['Content-Disposition'] = `attachment; filename*=UTF-8''${name}`;
        }
        res.writeHead(200, headers);
        fs.createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal server error');
      }
    });

    server.once('error', reject);
    server.listen(requestedPort, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address !== 'object') {
        server.close();
        return reject(new Error('تعذر تحديد منفذ الخادم المحلي.'));
      }
      resolve({
        server,
        port: address.port,
        origin: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

module.exports = { createStaticServer, validateWebRoot };
