'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../src/report-download-pdf.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../src/patches/ui.js'),'utf8');
const scope={SR63:{},atob,Blob,URL,TextEncoder,DataView,Uint8Array,Uint32Array};
vm.runInNewContext(src,scope);
const landscape=scope.SR63.reportPageIsLandscape;
for(const type of ['summary','levels','struggling','teachers','comparison','support','executive'])assert.equal(landscape(type),false,type);
for(const type of ['subjects','departmentStats'])assert.equal(landscape(type),true,type);
assert.equal(landscape('comparison',{dataset:{orientation:'landscape'}}),true);
assert.equal(landscape('subjects',{dataset:{orientation:'portrait'}}),false);
assert.match(ui,/const isLandscape=SR63\.reportPageIsLandscape\(n\)/,'print chooses template-defined orientation');
assert.match(ui,/SR63\.printReportBatch\(pageHTML,[^;]*isLandscape,printWindow\)/,'full-scope printer passes template orientation');
assert.match(ui,/SR63\.reportPageIsLandscape\(n,page\)!==isLandscape/,'reject mixed page orientations');
assert.match(ui,/reportPageJPEG\(node,css,renderedLandscape\)/);
assert.doesNotMatch(ui,/w\|\|n==='subjects'/);
const jpeg='data:image/jpeg;base64,'+Buffer.from([255,216,255,217]).toString('base64');
const pages=[false,true,false].map(wide=>({dataUrl:jpeg,width:2,height:2,landscape:wide}));
(async()=>{
 const pdf=scope.SR63.reportPdfFromJpegs(pages);const bytes=Buffer.from(await pdf.arrayBuffer());
 const boxes=[...bytes.toString('latin1').matchAll(/\/MediaBox\[0 0 ([\d.]+) ([\d.]+)\]/g)].map(m=>Number(m[1])>Number(m[2]));
 assert.deepEqual(boxes,[false,true,false]);
 const zip=await scope.SR63.reportZipFromPdfs([{name:'المقارنة.pdf',blob:scope.SR63.reportPdfFromJpegs([pages[0]])},{name:'المواد.pdf',blob:scope.SR63.reportPdfFromJpegs([pages[1]])}]);
 const data=Buffer.from(await zip.arrayBuffer());let p=0,zipOrientations=[];
 while(data.readUInt32LE(p)===0x04034b50){const len=data.readUInt32LE(p+18),names=data.readUInt16LE(p+26),extras=data.readUInt16LE(p+28),start=p+30+names+extras,content=data.subarray(start,start+len).toString('latin1');const match=/\/MediaBox\[0 0 ([\d.]+) ([\d.]+)\]/.exec(content);assert.ok(match);zipOrientations.push(Number(match[1])>Number(match[2]));p=start+len;}
 assert.deepEqual(zipOrientations,[false,true]);
 console.log('Report orientations: portrait comparison, landscape subjects, actual PDF and ZIP MediaBoxes PASS');
})().catch(e=>{console.error(e);process.exitCode=1});