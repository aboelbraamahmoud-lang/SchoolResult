'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.cjs'), 'utf8');
const html = fs.readFileSync(path.join(root, 'web', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'web', 'desktop-print-bridge.js'), 'utf8');
assert.match(html, /<script defer src="\.\/desktop-print-bridge\.js"><\/script>/);
assert.match(main, /url === 'about:blank' && frameName === '_blank'/);
assert.match(main, /child\.webContents\.setWindowOpenHandler\(\(\) => \(\{ action: 'deny' \}\)\)/);
assert.match(main, /contents\.getPrintersAsync\(\)/);
assert.match(main, /silent: false, printBackground: true, color: true, pageSize: 'A4', landscape/);
assert.match(main, /contents\.printToPDF\(\{/);
assert.match(main, /ipcMain\.handle\('app:print-popup'/);
assert.match(main, /ipcMain\.handle\('app:print-current'/);
const calls = [];
const popup = { document: { querySelectorAll: () => [{ textContent: '@page{size:A4 landscape;margin:5mm}' }] } };
const window = {
  schoolResultDesktop: {
    isDesktop: true,
    printPopup: options => { calls.push({ kind: 'popup', ...options }); return Promise.resolve({ status: 'submitted' }); },
    printCurrent: options => { calls.push({ kind: 'current', ...options }); return Promise.resolve({ status: 'submitted' }); }
  },
  open(url) { return url === '' ? popup : { print: () => calls.push({ kind: 'external-original' }) }; },
  alert: message => { throw new Error('Unexpected error dialog: ' + message); }
};
const document = { querySelectorAll: () => [{ textContent: '@page{size:A4 portrait;margin:4mm}' }] };
vm.runInNewContext(js, { window, document, console, Promise }, { timeout: 2000 });
window.open('', '_blank').print();
window.print();
window.open('https://example.com', '_blank').print();
assert.deepEqual(calls, [
  { kind: 'popup', landscape: true },
  { kind: 'current', landscape: false },
  { kind: 'external-original' }
]);
console.log('Desktop print bridge: local popup, native Windows printing, orientation and external URL separation PASS');