'use strict';
// Regression tests for common A4 dimensions shared across print, PDF and ZIP.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../src/report-print-batch.js'),'utf8');
const scope={SR63:{},URL,Blob,console,setTimeout};
vm.runInNewContext(src,scope);
const plan=scope.SR63.planReportSheet;
function sheet(height,count=20){
 let width=756,extra=0;const requested=[];
 const table={style:{setProperty:(key,val)=>{if(key==='height')extra=Math.max(0,parseFloat(val)-400)},removeProperty:()=>{extra=0}},getBoundingClientRect:()=>({width:width-12,height:400+extra}),querySelectorAll:()=>Array.from({length:count},()=>({style:{setProperty(){}},getBoundingClientRect:()=>({height:24})}))};
 const root={style:{setProperty:(key,val)=>{if(key==='width'){width=parseFloat(val);requested.push(width)}}},getBoundingClientRect:()=>({left:0,top:0,right:width,bottom:height+extra,width,height:height+extra}),get scrollWidth(){return width},get scrollHeight(){return height+extra},querySelectorAll:()=>[],querySelector:()=>table};
 return {root,requested,get tableExtra(){return extra}};
}
for(const [name,content,students] of [['few',460,7],['medium',730,19],['large',1010,38]]){
 const sample=sheet(content,students),f=plan(sample.root,756,1085);
 assert.equal(f.singleSheet,true,name);assert.equal(f.rows,students,name);
 assert.ok(f.fill>.98,name+': uses nearly the whole A4 width');
 assert.ok(f.verticalFill>(students<=12?.80:students<=20?.90:.95),name+': prevent excessive blank vertical A4 space');
 assert.ok(f.scale>.96,name+': avoids unnecessary downscaling');
 assert.ok(f.height*f.scale<=1085,name+': all rows fit the physical page');
 assert.ok(sample.requested.every(w=>w<=756.01),name+': never widen the logical page');
 assert.ok(sample.tableExtra>0,name+': distribute free space across student rows');
}
assert.throws(()=>plan(sheet(2000,65).root,756,1085),/صفحة A4/,'must reject unreadable layout, not clip student data');
const portrait=scope.SR63.reportPrintOverride(false),landscape=scope.SR63.reportPrintOverride(true);
assert.match(portrait,/@page\{size:A4 portrait;margin:5mm/);
assert.match(landscape,/@page\{size:A4 landscape;margin:5mm/);
assert.match(portrait,/display:flex!important;align-items:center!important/);
assert.match(src,/fontScale\(growth\)/);
assert.doesNotMatch(src,/baseline\*1\.8/);
console.log('SchoolResult 6.10.51: short, medium and long class A4 fitting PASS');
