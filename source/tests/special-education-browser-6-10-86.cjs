'use strict';
/* Browser-backed regression: special-education printable report must contain
   real pupil names and marks, not a count-only summary. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),{loadApp}=require('./harness.cjs');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'audit-artifacts');
fs.mkdirSync(out,{recursive:true});
const {ctx}=loadApp(),ws=JSON.parse(JSON.stringify(ctx.zj()));
ws.activeExam='exam1';ws.settings.schoolName='مدرسة اختبار التربية الخاصة';ws.settings.exams=ws.settings.exams.map((e,i)=>i===0?{...e,total:30,certificateTotal:15}:e);
const make=(id,name,klass,subject,department,score,status='present')=>({
 id:'special-'+id,studentId:id,studentName:name,className:klass,
 grade:klass.startsWith('7')?'السابع':klass.startsWith('8')?'الثامن':'التاسع',
 subject,department,teacher:'',
 scores:{exam1:score},statuses:{exam1:status},totals:{exam1:30},
 examClasses:{exam1:klass},examTeachers:{exam1:''}
});
const special=[
 make('SPEC-71','طالبة رياضيات سابع','7/1','الرياضيات','التربية الخاصة',14.5),
 make('SPEC-72','طالبة دمج سابع','7/ESE','الرياضيات','الدعم الإضافي',12),
 make('SPEC-81','طالبة علوم ثامن','8/1','العلوم','التربية الخاصة',20),
 make('SPEC-91','طالبة تاسع','9/2','الرياضيات','التربية الخاصة',27),
 make('SPEC-ABS','طالبة غائبة','7/2','الرياضيات','التربية الخاصة',null,'absent')
];
const general=make('GENERAL','طالب عام لا يظهر','7/1','الرياضيات','الرياضيات',30);
async function main(){
 const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return res.writeHead(404).end();res.setHeader('content-type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true});
 try{
  for(const role of ['admin','principal','vice_principal','coordinator']){
   const workspace={...ws,rows:role==='coordinator'?special:[...special,general]};
   const context=await browser.newContext({viewport:{width:1440,height:1100}});
   await context.route('**/*',req=>new URL(req.request().url()).origin===origin?req.continue():req.abort());
   await context.addInitScript(()=>{window.print=()=>window.__specialReportPrinted=true;});
   const page=await context.newPage(),errors=[];page.on('pageerror',err=>errors.push(err.message));
   await page.goto(origin);await page.waitForFunction(()=>typeof xde==='function');
   await page.evaluate(({workspace,role})=>{
    document.getElementById('root').style.display='none';
    const mount=document.createElement('div');mount.id='special-report-test';document.body.append(mount);
    SR63.currentWorkspace=workspace;window.specialRoot=y.createRoot(mount);
    specialRoot.render(v.createElement(xde,{workspace,onExportExcel:()=>{},readOnly:role!=='admin',onSchoolSummary:role==='admin'?null:()=>{},reportScope:role==='coordinator'?'department':'school',canCompareSubjects:true,canPrint:true}));
   },{workspace,role});
   const host=page.locator('#special-report-test');
   const card=host.locator('button').filter({has:page.getByText('التربية الخاصة — كشف الطلاب بالأسماء',{exact:true})}).first();
   await card.waitFor({timeout:10000});await card.click();
   await host.getByRole('button',{name:'تجهيز المعاينة',exact:true}).click();
   await host.locator('.sr686-special-roster').first().waitFor({timeout:15000});
   const names=await host.locator('.sr686-student-name strong').allTextContents();
   for(const row of special)assert.ok(names.includes(row.studentName),role+' must show '+row.studentName);
   assert.ok(!names.includes(general.studentName),role+' must exclude general education');
   assert.equal(names.length,special.length,role+' all recorded and absent pupils exactly once');
   const printText=await host.locator('.sr686-special-roster').allInnerTexts();
   assert.ok(printText.join(' ').includes('7.5'),role+' certificate conversion must print 7.5');
   assert.ok(!(await host.innerText()).includes('SPEC-71'),role+' personal identifiers must be hidden');
   const promise=page.waitForEvent('popup');
   await host.getByRole('button',{name:'طباعة / حفظ PDF'}).click();
   const popup=await promise;await popup.locator('.sr686-student-name strong').first().waitFor();
   await popup.waitForFunction(()=>window.__specialReportPrinted===true,{timeout:15000});
   const popupNames=await popup.locator('.sr686-student-name strong').allTextContents();
   assert.deepEqual(popupNames.sort(),names.sort(),role+' printed page names match preview');
   await popup.pdf({path:path.join(out,'special-education-'+role+'.pdf'),preferCSSPageSize:true,printBackground:true});
   await popup.close();
   assert.deepEqual(errors,[],role+' has no JavaScript page errors');
   await context.close();
  }
  console.log('PASS 6.10.86 browser: admin/principal/vice/coordinator special education names+marks, ESE and structure department, preview/print PDF, no general pupil or ID leakage');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
