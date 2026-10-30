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
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});
