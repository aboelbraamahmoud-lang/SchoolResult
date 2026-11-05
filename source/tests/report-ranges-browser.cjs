'use strict';
// Browser boundary verification with synthetic rows and real preview/print controls.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm'),cp=require('node:child_process');
const {chromium}=require('playwright'),{transformSync}=require('esbuild'),{loadApp}=require('./harness.cjs');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'audit-artifacts');fs.mkdirSync(out,{recursive:true});
const {ctx}=loadApp(),ws=JSON.parse(JSON.stringify(ctx.zj()));ws.activeExam='exam1';ws.settings.schoolName='مدرسة اختبار نطاق النسب';ws.settings.exams.forEach(e=>e.total=100);
ws.rows=[0,49.9,50,59.9,60,69.9,70,79.9,80,89.9,90,99.9,100].map((pct,i)=>({id:'range-'+i,studentId:'RANGE'+i,studentName:'طالب النطاق '+i,className:'7/1',grade:'السابع',subject:'الرياضيات',department:'الرياضيات',teacher:'معلم الرياضيات',scores:{exam1:pct,exam2:pct},totals:{exam1:100,exam2:100},statuses:{exam1:'present',exam2:'present'}}));
const full={...ws,rows:[...ws.rows,...ws.rows.map(r=>({...r,id:r.id+'-ar',studentId:r.studentId+'-ar',studentName:'اسم خارج القسم',subject:'اللغة العربية',department:'اللغة العربية',teacher:'معلم العربية',scores:{exam1:100,exam2:50}}))]};
const edge={module:{exports:{}}};vm.runInNewContext(transformSync(fs.readFileSync(path.join(root,'supabase/functions/school-staff/subject-comparison.ts'),'utf8'),{loader:'ts',format:'cjs'}).code,edge);
const aggregates=Object.fromEntries(['exam1','exam2'].map(e=>[e,edge.module.exports.subjectComparison(full,e)]));
async function main(){
 const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return res.writeHead(404).end();res.setHeader('content-type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),results=[];
 try{for(const role of ['admin','principal','vice_principal','coordinator']){
  const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());await context.addInitScript(()=>{window.print=()=>window.__rangePrinted=true;});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>typeof xde==='function');
  await page.evaluate(({ws,role,aggregates})=>{
   document.getElementById('root').style.display='none';const mount=document.createElement('div');mount.id='range-test';document.body.append(mount);window.rangeRoot=y.createRoot(mount);SR63.currentWorkspace=ws;window.subjectCalls=[];
   SR63.staff.call=async body=>{subjectCalls.push(body);await new Promise(r=>setTimeout(r,60));return {report:aggregates[body.exam]};};
   rangeRoot.render(v.createElement(xde,{workspace:ws,onExportExcel:()=>{},readOnly:role!=='admin',onSchoolSummary:role==='admin'?null:()=>{},reportScope:role==='coordinator'?'department':'school',canCompareSubjects:true,canPrint:true}));
  },{ws,role,aggregates});
  const host=page.locator('#range-test');await host.locator('button').filter({has:page.getByText('الطلاب ضمن نسبة',{exact:true})}).first().click();
  // One-click Word must be visibly available on every regular report card.
  const directCards=host.locator('.sr-word-report-card-action');
  assert.ok(await directCards.count()>=5,'Word actions must be visible on regular report cards');
  const quickSummary=host.locator('.sr-word-report-card-wrap[data-report-id="summary"] .sr-word-report-card-action');
  await quickSummary.waitFor({state:'visible'});
  assert.equal(await quickSummary.isEnabled(),true,'summary Word action must work before preview');
  const quickPromise=page.waitForEvent('download',{timeout:30000});
  await quickSummary.click();
  const quickDownload=await quickPromise,quickPath=await quickDownload.path();
  assert.match(quickDownload.suggestedFilename(),/\.docx$/i);
  assert.equal(fs.readFileSync(quickPath).subarray(0,2).toString('latin1'),'PK');
  const quickXML=cp.execFileSync('unzip',['-p',quickPath,'word/document.xml'],{encoding:'utf8'});
  assert.match(quickXML,/w:bidiVisual w:val="1"/);
  assert.ok(quickXML.includes('طالب النطاق'),'the selected report includes the right student data');
  const wordButton=host.getByRole('button',{name:'تحميل Word (.docx) — نفس التقرير',exact:true});
  const pdfButton=host.getByRole('button',{name:'تنزيل PDF كامل — ملف واحد',exact:true});
  await wordButton.waitFor({state:'visible'});
  assert.equal(await wordButton.isVisible(),true,'Word button must be visible in the exact report settings panel for role '+role);
  assert.equal(await pdfButton.isVisible(),true,'PDF button must remain visible beside Word for role '+role);
  assert.equal(await wordButton.isEnabled(),true,'Word download must be available before preparing preview for role '+role);
  assert.equal(await host.getByRole('button',{name:'تنزيل Word',exact:true}).isVisible(),true,'header shortcut also visible for role '+role);

  for(const [min,max,indices] of [[90,100,[10,11,12]],[50,60,[2,3]],[0,60,[0,1,2,3]],[70,80,[6,7]]]){
   await host.locator('#sr-range-min').fill(String(min));await host.locator('#sr-range-max').fill(String(max));
   assert.equal(await host.locator('.school-report-page').count(),0,'bound change clears preview');
   await host.getByRole('button',{name:'تجهيز المعاينة',exact:true}).click();await host.locator('.school-report-page').first().waitFor();
   if(role==='admin'&&min===90&&max===100){
    const downloadPromise=page.waitForEvent('download',{timeout:45000});
    await wordButton.click();
    const downloaded=await downloadPromise;
    assert.match(downloaded.suggestedFilename(),/\.docx$/i);
    const fullPath=await downloaded.path(),bytes=fs.readFileSync(fullPath);
    assert.equal(bytes.subarray(0,2).toString('latin1'),'PK');
    cp.execFileSync('unzip',['-t',fullPath],{stdio:'pipe'});
    const doc=cp.execFileSync('unzip',['-p',fullPath,'word/document.xml'],{encoding:'utf8'});
    const wordPlain=[...doc.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(m=>m[1]).join('');
    assert.ok(wordPlain.includes('طالب النطاق 10')&&wordPlain.includes('طالب النطاق 12'),'Word file includes same selected 90–100% students');
    assert.ok(!wordPlain.includes('طالب النطاق 2'),'Word file excludes rows outside range');
   }

   const names=await host.locator('.target-student-name b').allTextContents();assert.deepEqual(names,indices.map(i=>'طالب النطاق '+i));assert.equal(await host.locator('.target-student-name small').count(),0,'personal IDs must not be rendered');
   assert.deepEqual(await host.locator('.target-percent b').allTextContents(),indices.map(i=>ws.rows[i].scores.exam1+'%'));
   assert.match(await host.locator('.target-range-hero').innerText(),new RegExp('من '+min+'% إلى '+max+'% '+(max===100?'شاملًا':'\\(غير شامل\\)')));
  }
  await host.locator('#sr-range-min').fill('80');assert.equal(await host.getByRole('button',{name:'تجهيز المعاينة',exact:true}).isDisabled(),true);
  assert.equal(await host.getByRole('button',{name:'تنزيل PDF كامل — ملف واحد',exact:true}).isDisabled(),true);
  await host.locator('#sr-range-min').fill('90');await host.locator('#sr-range-max').fill('100');await host.getByRole('button',{name:'تجهيز المعاينة',exact:true}).click();
  await host.locator('.target-student-name b').first().waitFor();
  const popupPromise=page.waitForEvent('popup');await host.getByRole('button',{name:'طباعة التقرير الحالي',exact:true}).click();const popup=await popupPromise;await popup.waitForFunction(()=>window.__rangePrinted===true);
  assert.deepEqual(await popup.locator('.target-student-name b').allTextContents(),['طالب النطاق 10','طالب النطاق 11','طالب النطاق 12']);assert.equal(await popup.locator('.target-student-name small').count(),0,'IDs must never appear in PDF');await popup.pdf({path:path.join(out,'range-'+role+'.pdf'),preferCSSPageSize:true,printBackground:true});await popup.close();
  await page.screenshot({path:path.join(out,'range-'+role+'.png'),fullPage:true});
  assert.equal(await page.evaluate(()=>subjectCalls.length),0,'range report never loads school-wide aggregates');
  await host.locator('button').filter({has:page.getByText(role==='admin'?ws.settings.reportDesign.reportNames.subjects:'تقرير مقارنة المواد',{exact:true})}).first().click();
  assert.equal(await page.evaluate(()=>subjectCalls.length),0,'comparison card is lazy');
  if(role==='coordinator'){
   const popupPromise=page.waitForEvent('popup');
   await host.getByRole('button',{name:'حفظ PDF متجهي — بدون بكسلة عند التكبير',exact:true}).click();
   const comparisonPopup=await popupPromise;await comparisonPopup.waitForFunction(()=>window.__rangePrinted===true);
   assert.equal(await comparisonPopup.locator('.grade-subject-matrix').count(),2);await comparisonPopup.close();
  }else await host.getByRole('button',{name:'تجهيز المعاينة',exact:true}).click();
  await host.locator('.grade-subject-matrix').first().waitFor();
  assert.equal(await host.locator('.grade-subject-matrix').count(),2,'same success and achievement pages');
  if(role==='coordinator'){
   assert.equal(await page.evaluate(()=>subjectCalls.length),1);assert.ok((await host.locator('.grade-subject-matrix').first().innerText()).includes('معلم العربية'));
   assert.ok(!(await host.innerText()).includes('اسم خارج القسم'));assert.equal(await host.getByRole('textbox',{name:'المادة الثابتة لقسم المنسق'}).count(),0);
  }
  assert.deepEqual(errors,[]);results.push({role,boundaries:4,printedRange:'90 <= p <= 100',subjectPages:2,status:'PASS'});await context.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,'report-ranges-browser.json'),JSON.stringify(results,null,2));}
 console.log('PASS browser ranges and original comparison reports across all four roles');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
