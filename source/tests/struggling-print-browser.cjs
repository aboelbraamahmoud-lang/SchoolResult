// Real analytics entry point and complete multi-page A4 print pipeline, with synthetic records only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),{loadApp}=require('./harness.cjs'),root=path.resolve(__dirname,'../..');
const {ctx}=loadApp(),ws=JSON.parse(JSON.stringify(ctx.zj()));ws.activeExam='exam1';ws.settings.schoolName='مدرسة اختبار تقرير المتعثرين';ws.settings.pass=50;
const make=(id,subject,p,className='7/1')=>({id:id+subject,studentId:id,studentName:'طالب تجريبي '+id,className,subject,department:subject,teacher:'معلم سابق',scores:{exam1:p},totals:{exam1:100},statuses:{exam1:'present'},examTeachers:{exam1:'معلم '+subject}});
ws.rows=Array.from({length:105},(_,i)=>make('P'+i,'الرياضيات',20));
ws.rows.push(make('P0','اللغة العربية',45),make('P0','العلوم',90),make('Passing','العلوم',50));
const out=path.join(root,'audit-artifacts');fs.mkdirSync(out,{recursive:true});
async function main(){
 const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+'/')||!fs.existsSync(file))return res.writeHead(404).end();res.setHeader('content-type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.SR_BROWSER_EXECUTABLE?{executablePath:process.env.SR_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']}: {})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1050}});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());await context.addInitScript(()=>{window.print=()=>window.__strugglingPrinted=true;});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>SR63.OriginalAnalytics&&SR63.StrugglingPrintButton);
  await page.evaluate(ws=>{document.getElementById('root').style.display='none';const host=document.createElement('main');host.id='struggling-test';document.body.append(host);window.printTestRoot=y.createRoot(host);window.printTestWS=ws;SR63.currentWorkspace=ws;printTestRoot.render(v.createElement(SR63.OriginalAnalytics,{workspace:ws,page:'struggling',onNavigate:()=>{},canPrint:true}));},ws);
  const host=page.locator('#struggling-test'),button=host.getByRole('button',{name:'طباعة تقرير المتعثرين',exact:true});await button.waitFor();
  const inputs=host.locator('input[type=number]');await inputs.nth(1).fill('20');
  const popupPromise=page.waitForEvent('popup');await button.click();const popup=await popupPromise;await popup.waitForFunction(()=>window.__strugglingPrinted===true,{},{timeout:60000});
  const printed=popup.locator('.sr678-struggling-table tbody tr');assert.equal(await printed.count(),106,'all 105 students, including the second failed subject outside range');
  const names=await popup.locator('.sr678-student b').allTextContents();assert.equal(new Set(names).size,105);assert.equal(names.filter(name=>name==='طالب تجريبي P0').length,1);assert.ok(!names.includes('طالب تجريبي Passing'));assert.equal(await popup.locator('[data-student-id]').count(),0);assert.equal(await popup.locator('.sr678-student small').count(),0);assert.ok(!(await popup.locator('body').innerText()).includes('الرقم الأكاديمي'));
  const texts=await popup.locator('.sr678-struggling-table').allTextContents();assert.ok(texts.join(' ').includes('معلم اللغة العربية'));assert.ok(!texts.join(' ').includes('معلم سابق'));assert.ok(!texts.join(' ').includes('العلوم'));
  const count=await popup.locator('.school-report-page').count();assert.equal(count,9);assert.equal(await popup.locator('.report-ministry-emblem').count(),count);assert.equal(await popup.locator('.report-footer').count(),count);
  const bounds=await popup.locator('.school-report-page').evaluateAll(pages=>pages.map(p=>{const box=p.getBoundingClientRect();return [...p.querySelectorAll('th,td,.report-footer,.report-page-number')].every(el=>{const r=el.getBoundingClientRect();return r.left>=box.left-2&&r.right<=box.right+2&&r.bottom<=box.bottom+2})}));assert.ok(bounds.every(Boolean),'nothing clipped on A4');
  await popup.locator('.school-report-page').first().screenshot({path:path.join(out,'struggling-print-first.png')});await popup.pdf({path:path.join(out,'struggling-print.pdf'),preferCSSPageSize:true,printBackground:true});await popup.close();
  await inputs.nth(0).fill('50');await inputs.nth(1).fill('100');assert.equal(await button.isDisabled(),true,'no passing students printed');
  await page.evaluate(()=>printTestRoot.render(v.createElement(SR63.OriginalAnalytics,{workspace:printTestWS,page:'struggling',onNavigate:()=>{},canPrint:false})));await button.waitFor({state:'detached'});
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'struggling-print-results.json'),JSON.stringify({students:105,subjects:106,pages:count,allRowsPrinted:true,noClipping:true,permissions:true,status:'PASS'},null,2));
  console.log('PASS browser: actual struggling page, 105 students / 106 failed subjects / 9 A4 pages, current teachers, range changes and export permissions');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1});
