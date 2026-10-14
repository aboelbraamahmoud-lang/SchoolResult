'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../src');
const src=fs.readFileSync(path.join(root,'report-print-batch.js'),'utf8');
const pdf=fs.readFileSync(path.join(root,'report-download-pdf.js'),'utf8');
const scope={SR63:{},console,URL,Blob,TextEncoder,Uint8Array,Uint32Array,DataView,atob};
vm.runInNewContext(src+'\n'+pdf,scope);
const SR=scope.SR63,css=SR.reportPrintOverride(false);
assert.match(css,/sr650-sheet/);
assert.match(css,/visibility:visible!important/);
assert.match(css,/break-inside:avoid!important/);
assert.match(src,/pages\.map\(p=>'<div class="sr650-sheet">'/);
assert.match(pdf,/SR63\.planReportSheet\(element,w-2\*margin,h-2\*margin\)/);
assert.match(pdf,/offsetX-2\*scale\*layout\.left/);
function sample(height){
 let width=756,extra=0;
 const tab={style:{setProperty:(k,v)=>{if(k==='height')extra=Math.max(0,parseFloat(v)-400)}},getBoundingClientRect:()=>({width:width-8,height:400}),querySelectorAll:()=>Array(20).fill(null)};
 return {get scrollWidth(){return width},get scrollHeight(){return height+extra},style:{setProperty:(k,v)=>{if(k==='width')width=parseFloat(v)}},getBoundingClientRect:()=>({left:0,right:width,top:0,bottom:height+extra,width,height:height+extra}),querySelectorAll:()=>[],querySelector:()=>tab};
}
const plan=SR.planReportSheet(sample(1350),756,1085);
assert.equal(plan.singleSheet,true);
assert.ok(plan.fill>.98);
assert.ok(plan.scale>.44);
assert.ok(plan.height*plan.scale<1085);
const pages=SR.fitReportPagesForPrint({querySelectorAll:()=>[sample(1100),sample(1250)]});
assert.equal(pages.length,2);
assert.ok(pages.every(p=>p.singleSheet&&p.fill>.8));
console.log('SchoolResult 6.10.50: one class per sheet, A4 fill, shared PDF/ZIP sizing PASS');
