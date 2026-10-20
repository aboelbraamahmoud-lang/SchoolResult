const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const download=fs.readFileSync(path.join(root,'source/src/report-download-pdf.js'),'utf8');
const print=fs.readFileSync(path.join(root,'source/src/report-print-batch.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'source/src/patches/ui.js'),'utf8');
const sandbox={SR63:{},atob,TextEncoder,Blob,Uint8Array,Uint32Array,DataView,URL,console};
vm.runInNewContext(print+'\n'+download,sandbox,{filename:'report-download.js'});
const SR=sandbox.SR63;
assert.match(print,/const css=SR63\.reportScreenCSS\(await SR63\.getReportStyleText\(\)\)/,'print must wait for the complete CSS');
assert.match(print,/win\.document\.fonts\?\.ready/,'print must wait for font resources');
assert.doesNotMatch(print,/<link rel="stylesheet"/,'print must not rely on a late network stylesheet');
assert.match(ui,/renderReportPage=\(t,pageNumber,pageTotal\)/,'same React renderer must power preview and downloads');
assert.match(ui,/D\.length\?visible\.map\(\(t,r\)=>renderReportPage/,'preview and pdf use shared renderer');
assert.match(ui,/SR63\.groupReportPages\(exportPages,i,n\)/,'per-teacher/per-class grouping');
assert.match(ui,/تنزيل PDF كامل — ملف واحد/);
assert.match(ui,/const exportPages=prepared\?D:\(departmentMode&&!fixedSubject\?\[\]:SR63\.buildReportPages\(reportRows/, 'download auto prepares the authorized selection');
assert.match(ui,/if\(split\)SR63\.downloadReportFile\(await SR63\.reportZipFromPdfs/, 'ZIP always, even for one report');
assert.match(ui,/تنزيل تقارير مفردة ZIP — حسب/);
assert.match(ui,/disabled:!canPrint\|\|!!downloadState/,'exports respect export permissions');
assert.deepEqual(Array.from(SR.groupReportPages([
 {scope:'teacher',teacher:'أحمد',subject:'رياضيات'},
 {scope:'teacher',teacher:'أحمد',subject:'علوم'},
 {scope:'teacher',teacher:'نورة',subject:'لغة عربية'}],'teacher','teachers')).map(x=>[x.name,x.pages.length]),
 [['المعلم أحمد',2],['المعلم نورة',1]]);
assert.deepEqual(Array.from(SR.groupReportPages([
 {className:'7/1'},{className:'7/1'},{className:'7/2'}],'className','comparison')).map(x=>[x.name,x.pages.length]),
 [['الصف 7/1',2],['الصف 7/2',1]]);
assert.deepEqual(Array.from(SR.groupReportPages([{grade:'السابع'},{grade:'السابع'},{grade:'الثامن'}],'className','subjects')).map(x=>[x.name,x.pages.length]),
 [['الصف السابع',2],['الصف الثامن',1]]);
assert.equal(SR.safeReportFilename('نتائج 7/1:*?'), 'نتائج 7-1---');
(async()=>{
 const image='data:image/jpeg;base64,'+fs.readFileSync(path.join(__dirname,'fixtures/report-sample.jpg')).toString('base64');
 const pdf=SR.reportPdfFromJpegs([{dataUrl:image,landscape:false,width:5,height:4},{dataUrl:image,landscape:true,width:5,height:4}]);
 const bytes=new Uint8Array(await pdf.arrayBuffer());
 assert.equal(Buffer.from(bytes.slice(0,8)).toString('latin1'),'%PDF-1.4');
 assert.ok(Buffer.from(bytes).includes(Buffer.from('/Count 2')),'two pages in one PDF');
 assert.ok(Buffer.from(bytes).includes(Buffer.from('595.28 841.89')),'portrait A4');
 assert.ok(Buffer.from(bytes).includes(Buffer.from('841.89 595.28')),'landscape A4');
 const single=SR.reportPdfFromJpegs([{dataUrl:image,landscape:false,width:5,height:4}]);
 const zip=await SR.reportZipFromPdfs([{name:'تقرير المعلم أحمد.pdf',blob:single},{name:'الصف 7-1.pdf',blob:single}]);
 const buffer=Buffer.from(await zip.arrayBuffer());
 assert.equal(buffer.readUInt32LE(0),0x04034b50,'valid ZIP local file');
 assert.equal(buffer.readUInt32LE(buffer.length-22),0x06054b50,'valid ZIP directory');
 assert.ok(buffer.includes(Buffer.from('تقرير المعلم أحمد.pdf','utf8')),'UTF8 Arabic filename');
 fs.mkdirSync(path.join(__dirname,'output'),{recursive:true});
 fs.writeFileSync(path.join(__dirname,'output/report-export-test.zip'),buffer);
 fs.writeFileSync(path.join(__dirname,'output/report-export-test.pdf'),Buffer.from(bytes));
 console.log('PASS 6.10.46: isolated printing, A4 multi-page PDF, Arabic ZIP naming/grouping, role-gated exports');
})().catch(e=>{console.error(e);process.exitCode=1});
