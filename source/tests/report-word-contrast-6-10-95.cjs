'use strict';
/* 6.10.95: report Word uses original HTML/rows and protects text contrast everywhere. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ctx}=require('./harness.cjs').loadApp(),S=ctx.SR63;
assert.equal(typeof S.readableReportColor,'function');
assert.equal(typeof S.ensureReportContrast,'function');
assert.equal(typeof S.wordReportBlob,'function');
assert.equal(typeof S.downloadWordReport,'function');
assert.equal(typeof S.downloadStaffReportWord,'function');
assert.equal(S.readableReportColor('#182631','#122b40'),'#ffffff','dark on dark => white');
assert.equal(S.readableReportColor('#112838','#ffffff'),'#112838','dark readable on white remains unchanged');
assert.equal(S.readableReportColor('#ffffff','#102a3d'),'#ffffff','white on dark remains unchanged');
const inSrc=p=>fs.readFileSync(path.resolve(__dirname,'../src',p),'utf8');
const ui=inSrc('patches/ui.js'),word=inSrc('report-word-export.js'),contrast=inSrc('report-contrast.js');
const pdf=inSrc('report-download-pdf.js'),print=inSrc('report-print-batch.js');
for(const role of ['admin','vice_principal','coordinator'])assert.ok(/downloadWordReport/.test(ui),'all roles share the original report center');
assert.match(ui,/تنزيل Word — نفس التقرير/);
assert.match(ui,/renderReportHTML\(exportPages,landscape/);
assert.match(pdf,/ensureReportContrast/);
assert.match(print,/ensureReportContrast/);
assert.match(word,/w:tbl/);assert.match(word,/w:document/);
assert.match(word,/application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/);
assert.match(word,/reportZipFromPdfs\(files,true\)/);
assert.match(word,/getReportStyleText/);
assert.match(contrast,/ratio\(painted,background\)>=4\.5/);
for(const p of ['staff.js','skills-plus-ui.js','year-over-year-ui.js','student-results-print.js','struggling-print.js'])
 assert.match(inSrc(p),/Word/,'a PDF/print report must offer a Word version: '+p);
console.log('PASS 6.10.95 unit: contrast WCAG, same report source, editable Word documents, common role export and additional staff reports');
