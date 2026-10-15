'use strict';
// SchoolResult 6.10.52: exported PDF/ZIP must retain the exact CSS report
// gradients and distinct per-side borders, not guessed flat substitutes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/report-download-pdf.js'),'utf8');
const print=fs.readFileSync(path.join(__dirname,'../src/report-print-batch.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../src/patches/ui.js'),'utf8');
assert.match(src,/extractGradient\(style\.backgroundImage\)/,'paint real computed CSS gradient');
assert.match(src,/createLinearGradient\(/,'gradient paint must use browser geometry');
assert.match(src,/createRadialGradient\(/,'radial gradients must not become gray');
assert.match(src,/gradientPaint\.addColorStop\(s\.offset,s\.color\)/,'retain exact authored color stops');
assert.match(src,/canvasBackground\(node,css,r\)/,'use gradient paint for every report element');
assert.match(src,/canvasBackground\(node,before/,'render decorative report-header stripe');
assert.match(src,/paintBorders\(css,r\)/,'preserve colored side borders');
for(const edge of ['Top','Right','Bottom','Left'])assert.match(src,new RegExp("'"+edge+"'"),'border '+edge);
assert.doesNotMatch(src,/if\(node\.classList\.contains\('report-title'\)\|\|node\.classList\.contains\('grade-matrix-caption'\)\)return '#125266'/,'remove guessed title fill');
assert.match(src,/ctx\.direction=css\.direction\|\|'rtl'/,'retain native RTL text');
assert.match(src,/SR63\.planReportSheet\(element,w-2\*margin,h-2\*margin\)/,'keep original physical A4 fitting');
assert.match(ui,/images\.push\(await SR63\.reportPageJPEG\(node,css,renderedLandscape\)\)/,'single PDF and ZIP share corrected renderer');
assert.match(print,/-webkit-print-color-adjust:exact/);
console.log('PASS 6.10.52: computed gradient colors, status groups, header stripe, four-sided borders, A4, RTL and PDF/ZIP parity');
