'use strict';
// Browser regression: an unavailable archive cannot block the dashboard, menu
// searches must not recalculate school analytics, annual reports are opt-in.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),{loadApp}=require('./harness.cjs');
const root=path.resolve(__dirname,'../..'),ws=JSON.parse(JSON.stringify(loadApp().ctx.zj()));
ws.settings.schoolName='مدرسة اختبار سرعة التحميل';
(async()=>{
 const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return res.writeHead(404).end();res.setHeader('content-type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true});
 try{for(const role of ['owner','principal','vice_principal','coordinator']){
  const context=await browser.newContext({viewport:{width:1500,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin);await page.waitForFunction(()=>typeof SR63!=='undefined');
  await page.evaluate(({ws,role})=>{
   document.getElementById('root').style.display='none';const mount=document.createElement('div');mount.id='startup-test';document.body.append(mount);
   window.testRoot=y.createRoot(mount);window.testCalls={catalog:0,comparison:0,annual:0};window.archivePending=false;
   const catalog=SR63.ensureCatalog;SR63.ensureCatalog=(...args)=>{testCalls.catalog++;return catalog(...args);};
   const compare=SR63.staffExamComparison;SR63.staffExamComparison=(...args)=>{testCalls.comparison++;return compare(...args);};
   SR63.staff.call=async body=>{if(body.action==='year_comparison'){testCalls.annual++;return {report:null};}throw Error('Unexpected request '+body.action);};
   if(role==='owner'){
    Yj=async()=>ws;qj=()=>{archivePending=true;return new Promise(()=>{});};
    testRoot.render(v.createElement(Nde));
   }else{
    const profile={role,ownerId:'synthetic',username:role,departments:['اللغة العربية'],permissions:{reports:true,compare:true,export:true,studentLevels:true,failedStudents:true,teacherAnalysis:true}};
    SR63.staff.coordinatorLoad=async()=>({workspace:ws,revision:1,profile,benchmarks:[]});
    testRoot.render(v.createElement(SR63.CoordinatorPortal,{profile}));
   }
  },{ws,role});
  await page.locator(role==='coordinator'?'#startup-test .srcoord-kpis':'#startup-test .sr69-dashboard h1').waitFor();
  if(role==='owner')assert.equal(await page.evaluate(()=>archivePending),true,'dashboard appears while archive is still pending');
  if(role!=='coordinator'){
   const search=page.locator('#startup-test input[placeholder="بحث في وظائف البرنامج"]');
   await page.evaluate(()=>testCalls.catalog=0);await search.fill('تحليل');await search.fill('');
   assert.equal(await page.evaluate(()=>testCalls.catalog),0,'sidebar search reuses the catalog');
   if(role==='owner')await page.locator('#startup-test').getByRole('button',{name:'فتح التقارير',exact:true}).click();
   else{await search.fill('مركز التقارير');await page.locator('#startup-test').getByRole('button',{name:'مركز التقارير والطباعة',exact:true}).click();}
  }else{
   assert.equal(await page.evaluate(()=>testCalls.comparison),0,'coordinator does not calculate unopened comparison');
   await page.locator('#startup-test').getByRole('button',{name:'مركز التقارير والطباعة',exact:true}).click();
  }
  const annual=page.locator('#startup-test button').filter({hasText:'مقارنة عامين دراسيين'});await annual.waitFor();
  assert.equal(await page.evaluate(()=>testCalls.annual),0,'opening report center never fetches annual archive');
  await annual.click();await page.waitForFunction(()=>testCalls.annual===1);
  assert.deepEqual(errors,[],role+' has no browser errors');
  await context.close();console.log('PASS startup, sidebar and lazy annual report: '+role);
 }
 for(const mode of ['ai','custom']){
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin);await page.waitForFunction(()=>typeof SR63!=='undefined');
  await page.evaluate(({ws,mode})=>{
   document.getElementById('root').style.display='none';const mount=document.createElement('div');mount.id='tab-test';document.body.append(mount);
   window.tabCalls={connection:0,studentPages:0,cells:0};
   const pages=SR63.studentResultPages;SR63.studentResultPages=(...a)=>{tabCalls.studentPages++;return pages(...a);};
   const cell=Tde;Tde=(...a)=>{tabCalls.cells++;return cell(...a);};
   SR63.cloud.client=()=>({functions:{invoke:async()=>{tabCalls.connection++;return {data:{configured:false}};}}});
   SR63.currentWorkspace=ws;
   y.createRoot(mount).render(v.createElement(mode==='ai'?SR63.AIPlans:Dde,{workspace:ws,setWorkspace:()=>{}}));
  },{ws,mode});
  const root=page.locator('#tab-test');
  if(mode==='ai'){
   await root.getByText('الطلاب المطابقون:',{exact:false}).waitFor();
   assert.equal(await page.evaluate(()=>tabCalls.connection),0,'AI entry does not request Gemini settings');
   assert.equal(await page.evaluate(()=>tabCalls.studentPages),1);
   await root.getByRole('button',{name:'إعدادات اتصال Gemini',exact:true}).click();
   await page.waitForFunction(()=>tabCalls.connection===1);
   await root.getByRole('button',{name:'إعداد خطة جديدة',exact:true}).click();
   assert.equal(await page.evaluate(()=>tabCalls.studentPages),1,'tab switching reuses student analysis');
   await root.getByRole('button',{name:'مسودة إجرائية بدون ذكاء اصطناعي',exact:true}).click();
   await root.getByText('3. مراجعة الخطة وتعديلها قبل الحفظ',{exact:true}).waitFor();
  }else{
   const show=root.getByRole('button',{name:'عرض التقرير',exact:true});await show.waitFor();
   assert.equal(await page.evaluate(()=>tabCalls.cells),0,'no report cells on tab entry');
   assert.equal(await root.locator('.school-report-page').count(),0);
   await show.click();await root.locator('.school-report-page').first().waitFor();
   const computed=await page.evaluate(()=>tabCalls.cells);assert.ok(computed>0);
   await root.locator('input').nth(1).fill('عنوان اختبار السرعة');
   assert.equal(await root.locator('.school-report-page').count(),0,'edited configuration invalidates old print preview');
   assert.equal(await page.evaluate(()=>tabCalls.cells),computed,'typing does not rebuild report data');
   assert.equal(await root.getByRole('button',{name:'طباعة / PDF',exact:true}).isEnabled(),false);
   await show.click();await root.locator('.school-report-page').first().waitFor();
   assert.ok((await root.locator('.school-report-page').first().innerText()).includes('عنوان اختبار السرعة'));
  }
  assert.deepEqual(errors,[]);await context.close();console.log('PASS tab performance and interaction: '+mode);
 }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});
