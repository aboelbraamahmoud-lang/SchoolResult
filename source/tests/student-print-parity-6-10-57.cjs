'use strict';
// Print preview, actual A4 output and the independent PDF workflow use the same student result DOM.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=path.resolve(__dirname,'../src');
const student=fs.readFileSync(path.join(src,'student-results-print.js'),'utf8');
const printer=fs.readFileSync(path.join(src,'report-print-batch.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../../style.css'),'utf8');
const i=student.indexOf('SR63.printStudentResults=async function(){'),j=student.indexOf('SR63.StudentResultsPrint=function(',i);
assert.ok(i>=0&&j>i,'student print method exists');
const fn=student.slice(i,j);
assert.doesNotMatch(fn,/window\.print\s*\(/,'never print the main application window');
assert.doesNotMatch(fn,/cloneNode/,'do not generate an alternative student result model');
assert.match(fn,/printReportBatch\(pages,'بيان نتائج الطلاب',false,win\)/);
assert.match(student,/className:'school-report-page student-result-page'/,'React preview is still the original template');
assert.match(printer,/\.sr646-print-document \.sr650-sheet>\.student-result-page/,'student-specific print A4 styles');
assert.match(printer,/padding:12mm 12mm 10mm!important/,'original report identity spacing is retained');
assert.match(printer,/\.student-result-footer\{margin-top:auto!important\}/,'signatures stay in their expected position');
assert.match(printer,/\.report-footer,\.student-result-footer/,'both report kinds are measured');
assert.match(printer,/\.student-result-table/,'student results table may adjust to A4, not be clipped');
assert.match(css,/\.student-result-header img\{width:25mm/,'official logo screen template remains intact');
const original=[{outerHTML:'<section class="student-result-page">one</section>'},{outerHTML:'<section class="student-result-page">two</section>'}];
const actions=[],errors=[];
const win={closed:false,close(){this.closed=true}};
const context={
 SR63:{printReportBatch:async (...a)=>{actions.push({pages:a[0],title:a[1],landscape:a[2],window:a[3]});return a[0].length;}},
 document:{getElementById:id=>id==='printable-reports'?{querySelectorAll:()=>original}:null},
 window:{open:(url,target)=>{actions.push({open:true,url,target});return win}},
 eb:{error:value=>errors.push(value)}
};
vm.runInNewContext(fn,context);
(async()=>{
 await context.SR63.printStudentResults();
 assert.equal(actions[0].open,true,'open synchronously before any awaiting');
 assert.equal(actions[1].pages.length,2,'all prepared student preview pages must print');
 assert.equal(actions[1].landscape,false);
 assert.equal(actions[1].window,win);
 assert.equal(errors.length,0);
 const freshWin={closed:false,close(){this.closed=true}};
 context.window.open=()=>freshWin;
 context.SR63.printReportBatch=async()=>{freshWin.closed=true;throw Error('Object has been destroyed')};
 await context.SR63.printStudentResults();
 assert.equal(errors.length,0,'closing student preview should not display an error');
 context.window.open=()=>null;
 await context.SR63.printStudentResults();
 assert.match(errors.at(-1),/النوافذ المنبثقة/);
 // Realistic geometry mock: the summary/note follow the student score table.
 // Previous code treated them as empty space and pushed the signatures off A4.
 const layoutSandbox={SR63:{},URL,console};
 vm.runInNewContext(printer,layoutSandbox);
 let extra=0;
 const rect=(top,bottom,width=700)=>({left:20,top,right:20+width,bottom,width,height:bottom-top});
 const lastNote={getBoundingClientRect:()=>rect(620+extra,648+extra)};
 const footer={previousElementSibling:lastNote,getBoundingClientRect:()=>{
  const pushed=Math.max(0,extra-310);
  return rect(959+pushed,1084+pushed);
 }};
 const table={style:{setProperty:(name,value)=>{if(name==='height')extra=Math.max(0,parseFloat(value)-304)},removeProperty:()=>{extra=0}},
  getBoundingClientRect:()=>rect(236,540+extra),
  querySelectorAll:sel=>sel==='tbody tr'?Array.from({length:9},()=>({style:{setProperty(){}}})):[]};
 const page={style:{setProperty(){}},scrollWidth:794,
  get scrollHeight(){return Math.max(1123,footer.getBoundingClientRect().bottom)},
  getBoundingClientRect:()=>rect(0,1123,794),
  querySelector:selector=>selector.includes('student-result-table')?table:selector.includes('student-result-footer')?footer:null,
  querySelectorAll:()=>[footer,table,lastNote]};
 const plan=layoutSandbox.SR63.planReportSheet(page,794,1123);
 assert.equal(plan.singleSheet,true,'nine subjects and their report footer fit exactly one A4');
 assert.ok(extra>60&&extra<300,'only actual available space may be distributed to score rows');
 assert.ok(footer.getBoundingClientRect().bottom<=1123,'student summary and signatures never leave paper');
 console.log('PASS 6.10.57 student results preview/print parity, no clipped main-window report, safe popup closing');
})().catch(err=>{console.error(err);process.exitCode=1});
