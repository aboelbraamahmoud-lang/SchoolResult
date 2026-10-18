'use strict';
// 6.10.53 — preserve vector text in Chromium Save-as-PDF, while upgrading
// automatic PDF and ZIP JPEG output from 192 to 300 dpi.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=p=>fs.readFileSync(path.join(__dirname,'../src',p),'utf8');
const pdf=source('report-download-pdf.js'),printer=source('report-print-batch.js'),ui=source('patches/ui.js');
assert.match(pdf,/const density=300\/96/,'300dpi must be used, not old 192dpi');
assert.match(pdf,/canvas\.width=Math\.round\(w\*density\)/,'physical pixel dimensions must match density');
assert.match(pdf,/canvas\.height=Math\.round\(h\*density\)/);
assert.match(pdf,/ctx\.setTransform\(density\*scale/);
assert.match(pdf,/toDataURL\('image\/jpeg',\.985\)/,'avoid low quality jpeg artifacts');
assert.doesNotMatch(pdf,/canvas\.width=w\*2;canvas\.height=h\*2/);
assert.match(pdf,/ctx\.measureText\?\.\(label\)/,'avoid unnecessary Arabic text squeezing');
assert.match(ui,/const saveVectorPDF=async\(\)=>/);
assert.match(ui,/const printWindow=window\.open\('','_blank'\)/,'reserve native dialog synchronously in click handler');
assert.match(ui,/const exportPages=prepared\?D:\(departmentMode&&!fixedSubject\?\[\]:SR63\.buildReportPages\(reportRows/,'vector path must render only authorized selected subject, not 8-preview only');
assert.match(ui,/pageHTML\.push\(capture\?await capture\(node,page,pIndex\):node\.outerHTML\)/,'original DOM and selectable text in vector print');
assert.match(ui,/SR63\.printReportBatch\(pageHTML,.*isLandscape,printWindow\)/,'vector print must share tested A4 engine');
assert.match(ui,/حفظ PDF متجهي — بدون بكسلة عند التكبير/);
assert.match(ui,/return SR63\.reportPageJPEG\(node,css,shown\)/,'preserve shared automatic PDF/ZIP renderer');
assert.match(printer,/Array\.isArray\(selector\)\?selector:\[\.\.\.document\.querySelectorAll\(selector\)\]/);
assert.match(printer,/const win=preparedWindow\|\|window\.open/);
assert.match(printer,/typeof p==='string'\?p:p\.outerHTML/);
assert.match(printer,/win\.print\(\)/,'vector generation must invoke native browser print');
assert.match(printer,/-webkit-print-color-adjust:exact/);
assert.match(printer,/@page\{size:A4/);
console.log('PASS 6.10.53 vector PDF path, native Arabic text, true A4 print, 300dpi raster PDF/ZIP');
