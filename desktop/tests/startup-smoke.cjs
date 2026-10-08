const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { createStaticServer, validateWebRoot } = require('../server.cjs');

(async () => {
  const root = path.join(__dirname, '..', 'web');
  validateWebRoot(root);

  // Occupy the legacy fixed port to prove startup no longer depends on it.
  const blocker = http.createServer((_req, res) => res.end('occupied'));
  let blockerActive = false;
  try {
    await new Promise((resolve, reject) => {
      blocker.once('error', error => {
        if (error.code === 'EADDRINUSE') return resolve();
        reject(error);
      });
      blocker.listen(43817, '127.0.0.1', () => { blockerActive = true; resolve(); });
    });

    const local = await createStaticServer(root, 0);
    assert(local.port > 0, 'dynamic port was not assigned');
    if (blockerActive) assert.notEqual(local.port, 43817, 'server incorrectly reused occupied legacy port');

    const response = await fetch(`${local.origin}/index.html`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert(html.includes('app.js'), 'index.html does not load app.js');

    for (const file of ['app.js', 'style.css', 'supabase.js', 'version.json']) {
      const res = await fetch(`${local.origin}/${file}`);
      assert.equal(res.status, 200, `${file} failed to load`);
    }

    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert(response.headers.get('content-security-policy'), 'CSP header missing');
    await new Promise(resolve => local.server.close(resolve));

    const version = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
    console.log(`Startup smoke test passed for SchoolResult ${version.version} on dynamic localhost port.`);
  } finally {
    if (blockerActive) await new Promise(resolve => blocker.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
