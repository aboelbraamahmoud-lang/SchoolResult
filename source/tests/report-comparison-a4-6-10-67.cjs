'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadApp}=require('./harness.cjs');
const {ctx}=loadApp(),ws=ctx.zj(),subject='اللغة العربية';
const original=ws.rows.filter(r=>r.subject===subject&&r.className==='7/1');
assert.equal(original.length,18,'demo fixture must model the 18-student A4 overflow regression');
const create=(count)=>Array.from({length:count},(_,i)=>{
 const r=original[i%original.length];return {...r,id:'compare-student-'+i,studentId:'C-'+i,studentName:r.studentName+' '+(i+1)};
});
function verify(n,expected){
 const rows=create(n),pages=ctx.SR63.buildReportPages(rows,'className','الكل',subject,'comparison','exam4',50,ws.settings);
 assert.deepEqual(Array.from(pages,p=>p.rows.length),expected,'A4-safe comparison chunks');
 assert.equal(pages.reduce((k,p)=>k+p.rows.length,0),n,'no omitted students');
 assert.deepEqual(Array.from(pages).flatMap(p=>Array.from(p.rows,r=>r.id)),Array.from(rows,r=>r.id),'original student ordering preserved');
 assert.equal(new Set(Array.from(pages).flatMap(p=>Array.from(p.rows,r=>r.id))).size,n,'no duplicate students');
 pages.forEach((p,i)=>{
  assert.equal(p.rowOffset,i*40,'absolute student numbering');
  assert.equal(p.part,i+1,'continuation page label');
  assert.equal(p.totalParts,pages.length,'correct number of parts');
  assert.equal(p.allRows.length,n,'all-school metrics stay based on the complete class');
  assert.ok(p.rows.length<=40,'at most 40 student rows per A4 comparison page');
 });
}
verify(18,[18]);verify(28,[28]);verify(40,[40]);verify(90,[40,40,10]);
const summary=ctx.SR63.buildReportPages(original,'className','الكل',subject,'summary','exam4',50,ws.settings);
assert.equal(summary.length,1,'non-comparison report pagination unchanged');
const source=fs.readFileSync(path.join(__dirname,'../src/report-grouping.js'),'utf8');
assert.match(source,/pageSize=40/,'Source must reflect the safe comparison layout');
const build=fs.readFileSync(path.join(__dirname,'../build.cjs'),'utf8');
assert.match(build,/SR63\.buildReportPages\(reportRows,i,o,S,n,T,g,e\.settings\)/,'preview and PDF must share A4-safe pagination');
const ui=fs.readFileSync(path.join(__dirname,'../src/patches/ui.js'),'utf8');
assert.match(ui,/renderReportHTML\(D,isLandscape/,'printing prepares all comparison pages');
assert.match(ui,/renderReportHTML\(exportPages,isLandscape/,'vector PDF prepares all comparison pages');
console.log('PASS 6.10.67: 18/28/40-student comparison fitted to one A4 per class up to 40 rows, no omissions/duplicates, correct order/footers, unchanged other reports');
