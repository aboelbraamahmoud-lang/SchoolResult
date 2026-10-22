'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm'),esbuild=require('esbuild');
const {chromium}=require('playwright'),{loadApp}=require('./harness.cjs');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'audit-artifacts');fs.mkdirSync(out,{recursive:true});
const {ctx}=loadApp(),ws=JSON.parse(JSON.stringify(ctx.zj()));ws.settings.schoolName='مدرسة اختبار مطابقة الأدوار';ws.settings.dashboardSubjects=['اللغة العربية'];
const edge={exports:{},require:()=>({createClient:()=>({})}),Deno:{serve:()=>{}},TextEncoder,URL,Response,console};
vm.runInNewContext(esbuild.transformSync(fs.readFileSync(path.join(root,'supabase/functions/school-staff/index.ts'),'utf8')+'\nexports.project=cleanLeadership;',{loader:'ts',format:'cjs'}).code,edge);
const projected=JSON.parse(JSON.stringify(edge.exports.project(ws).workspace));
const secretFixture=structuredClone(ws);secretFixture.grades=[{id:'safe',name:'صف',privateToken:'excluded'}];assert.equal(edge.exports.project(secretFixture).workspace.grades[0].privateToken,undefined);
assert.deepEqual(projected.grades,ws.grades);assert.deepEqual(projected.settings.dashboardSubjects,ws.settings.dashboardSubjects);
const labels={dashboard:'لوحة المتابعة',classes:'تحليل الصفوف',teachers:'تحليل المعلمين',departments:'تحليل الأقسام',school:'تحليل المدرسة',comparison:'مقارنة الاختبارات',value:'القيمة المضافة',levels:'مستويات الطلاب',struggling:'الطلاب المتعثرون'};
async function main(){
 const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return res.writeHead(404).end();res.setHeader('content-type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),results=[];
 async function open(role){const context=await browser.newContext({viewport:{width:1500,height:1100}});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>typeof SR63!=='undefined');await page.evaluate(({ws,projected,role})=>{document.getElementById('root').style.display='none';const mount=document.createElement('div');mount.id='parity';document.body.append(mount);window.testRoot=y.createRoot(mount);SR63.storage={...SR63.storage,revision:27,savedAt:'2026-10-22T08:00:00Z',blocked:false,pending:false,error:''};window.testWorkspace=ws;
 if(role==='owner'){Yj=async()=>ws;qj=async()=>[];testRoot.render(v.createElement(Nde));}
 else{const profile={role,ownerId:'synthetic-owner',username:role,displayName:role,permissions:{reports:true,compare:true,export:true,studentLevels:true,failedStudents:true,teacherAnalysis:true}};SR63.staff.coordinatorLoad=async()=>({workspace:projected,revision:27,savedAt:'2026-10-22T08:00:00Z',profile});SR63.staff.call=async()=>({report:null});testRoot.render(v.createElement(SR63.CoordinatorPortal,{profile}));}}, {ws,projected,role});await page.locator('#parity .sr69-dashboard').waitFor();return {page,context,errors};}
 const owner=await open('owner');const expected={};
 async function navigate(page,id){if(id==='dashboard')return;const search=page.locator('#parity input[placeholder="بحث في وظائف البرنامج"]');await search.fill(labels[id]);await page.locator('#parity').getByRole('button',{name:labels[id],exact:true}).click();await search.fill('');await page.waitForTimeout(350);}
 async function interact(page,id){
 const main=page.locator('#parity main').last();
 if(id==='dashboard'){await main.locator('details summary').click();await main.locator('input[type=checkbox]').first().click();}
 else if(['classes','teachers','departments','value'].includes(id)){await main.getByRole('combobox').first().click();await page.getByRole('option').last().click();}
 else if(id==='struggling')await main.locator('input[type=number]').last().fill('60');
 await page.waitForTimeout(150);
 }
 async function snapshot(page){const main=page.locator('#parity main').last();return await main.evaluate(el=>({text:el.innerText,selects:[...el.querySelectorAll('select')].map(x=>({value:x.value,options:[...x.options].map(o=>[o.value,o.text])})),inputs:[...el.querySelectorAll('input')].map(x=>({type:x.type,value:x.value,checked:x.checked})),tables:el.querySelectorAll('table').length,svg:el.querySelectorAll('svg').length}));}
 try{for(const id of Object.keys(labels)){await navigate(owner.page,id);expected[id]=await snapshot(owner.page);await interact(owner.page,id);expected[id+'-changed']=await snapshot(owner.page);}
 for(const role of ['principal','vice_principal']){const staff=await open(role);for(const id of Object.keys(labels)){await navigate(staff.page,id);assert.deepEqual(await snapshot(staff.page),expected[id],role+' '+id+' exact admin content and controls');await interact(staff.page,id);assert.deepEqual(await snapshot(staff.page),expected[id+'-changed'],role+' '+id+' interactive parity');results.push({role,page:id,status:'PASS',interactive:true});}assert.deepEqual(staff.errors,[]);await staff.page.screenshot({path:path.join(out,role+'-sidebar.png'),fullPage:true});await staff.page.setViewportSize({width:390,height:844});await staff.page.waitForTimeout(200);
 await staff.page.locator('#parity').getByRole('button',{name:'Toggle Sidebar'}).click();
 await staff.page.waitForTimeout(500);
 await staff.page.screenshot({path:path.join(out,role+'-mobile-sidebar.png'),fullPage:true});
 const mobileItem=await staff.page.getByRole('button',{name:'تحليل الصفوف',exact:true}).boundingBox();assert.ok(mobileItem.x>=0&&mobileItem.x+mobileItem.width<=391,'mobile sidebar within viewport');
 assert.equal(await staff.page.getByRole('button',{name:'تحليل الصفوف',exact:true}).isVisible(),true);
 await staff.context.close();}assert.deepEqual(owner.errors,[]);
 }catch(error){console.error('OWNER_ERRORS',owner.errors);await owner.page.screenshot({path:path.join(out,'parity-failure.png'),fullPage:true,timeout:5000}).catch(()=>{});throw error;}finally{await owner.context.close();await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,'leadership-parity.json'),JSON.stringify(results,null,2));}
 console.log('PASS admin/leadership parity: '+results.length+' comparisons');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
