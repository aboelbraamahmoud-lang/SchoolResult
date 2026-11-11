'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../src/report-print-batch.js'),'utf8');
for(const file of ['grade-review.js','ai-plans-ui.js']){
 const text=fs.readFileSync(path.resolve(__dirname,'../src',file),'utf8');
 assert.match(text,/const prepareContrast=\(\)=>SR63\.ensureReportContrast\?\.\(root\)/);
 assert.match(text,/window\.addEventListener\('beforeprint',prepareContrast\)/,'hidden report uses print-media colors');
 assert.match(text,/window\.removeEventListener\('beforeprint',prepareContrast\)/,'cleanup must remove print listeners');
}
assert.match(fs.readFileSync(path.resolve(__dirname,'../src/behavior-reports.js'),'utf8'),/SR63\.ensureReportContrast\?\.\(win\.document\);win\.focus\(\);win\.print\(\)/,'behavior popup checks contrast immediately before printing');
async function check(mode){
 const events=[];
 const doc={images:[],fonts:{ready:Promise.resolve().then(()=>events.push('fonts'))},open(){},write(){events.push('write');},close(){},querySelector(){return null;}};
 const win={closed:false,document:doc,focus(){},print(){events.push('print');}};
 const node={outerHTML:'<section>تقرير</section>'};
 const context={console,Promise,setTimeout:()=>0,window:{open:()=>win},document:{baseURI:'http://localhost/',querySelector:()=>node,createElement:()=>({innerHTML:'',querySelectorAll:()=>[]})},SR63:{}};
 vm.runInNewContext(source,context);
 const S=context.SR63;
 S.getReportStyleText=async()=>'';S.reportScreenCSS=x=>x;S.reportPrintOverride=()=>'';
 S.ensureReportContrast=root=>{assert.equal(root,doc);events.push('contrast');};
 S.fitReportPagesForPrint=()=>{events.push('fit');return [{zoom:1}];};
 if(mode==='batch')assert.equal(await S.printReportBatch(['<section>تقرير HTML</section>'],'اختبار',false),1);
 else{S.printScopedStaffPanel('#report','اختبار');await new Promise(resolve=>setImmediate(resolve));}
 assert.ok(events.includes('contrast'),mode+' must repair the final popup');
 assert.ok(events.indexOf('contrast')>events.indexOf('write'),mode+' waits until popup contents exist');
 assert.ok(events.indexOf('contrast')>events.indexOf('fonts'),mode+' waits for font readiness');
 assert.ok(events.indexOf('contrast')<events.indexOf('print'),mode+' repairs before printing');
 if(mode==='batch')assert.ok(events.indexOf('contrast')<events.indexOf('fit'),'repair before final fitting');
}
(async()=>{await check('batch');await check('staff');console.log('PASS print contrast: string report batches and scoped staff popups repaired before print');})().catch(error=>{console.error(error);process.exitCode=1;});
