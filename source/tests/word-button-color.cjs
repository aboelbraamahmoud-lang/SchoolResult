const assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync(__dirname+'/../src/repair.css','utf8'),ui=fs.readFileSync(__dirname+'/../src/patches/ui.js','utf8');
assert.match(ui,/className:`sr-word-download-button/);
assert.match(css,/\.sr-word-download-button\{background:#285c76!important;color:#fff!important/);
assert.match(css,/\.sr-word-download-button:focus-visible/);
assert.match(css,/\.sr-word-download-button:disabled/);
console.log('PASS explicit accessible Word download button colors');
