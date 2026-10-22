'use strict';
// Real Chromium controls and files, using synthetic workspaces only.
// Authentication/Edge calls are mocked at the boundary; export/render functions are not mocked.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const {loadApp}=require('./harness.cjs');
const vm=require('node:vm'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'audit-artifacts');
fs.mkdirSync(out,{recursive:true});
const edgeSandbox={exports:{},require:()=>({createClient:()=>({})}),Deno:{serve:()=>{}},TextEncoder,URL,Response,console};
const edgeSource=fs.readFileSync(path.join(root,'supabase/functions/school-staff/index.ts'),'utf8');
vm.runInNewContext(esbuild.transformSync(edgeSource+'\nexports.projection={coordinator:cleanCoordinator,principal:cleanLeadership,vice_principal:cleanLeadership};',{loader:'ts',format:'cjs',target:'es2022'}).code,edgeSandbox);
const projections=edgeSandbox.exports.projection;
const {ctx}=loadApp(),demo=JSON.parse(JSON.stringify(ctx.zj())),records=[];
const subject='اللغة العربية',baseRow=demo.rows.find(r=>r.subject===subject&&r.className==='7/1');
assert.ok(baseRow);
function fixture(count,classes=1){
 const ws=structuredClone(demo);ws.settings.schoolName='مدرسة التدقيق الاصطناعي';
 ws.settings.principalName='مدير تجريبي';ws.settings.academicYear='2026/2027';
 ws.settings.coordinatorName='منسق تجريبي';ws.settings.schoolVision='VISION61070';ws.settings.preparedByName='PREPARED61070';ws.settings.reportDesign.footerText='FOOTER61070';ws.settings.reportDesign.showVision=true;ws.settings.reportDesign.showAttribution=true;ws.settings.reportDesign.showSignatures=true;ws.activeExam='exam4';
 ws.rows=Array.from({length:count},(_,i)=>{
  const className='7/'+(1+i%classes),r={...structuredClone(baseRow),id:'row-'+i,studentId:'AUDIT'+String(i+1).padStart(4,'0'),
   studentName:'طالب تجريبي AUDIT'+String(i+1).padStart(4,'0'),className,grade:'7',teacher:'معلم تجريبي',
   examClasses:{},examTeachers:{},scores:{},statuses:{},totals:{}};
  for(const e of ws.settings.exams){r.examClasses[e.key]=className;r.examTeachers[e.key]='معلم تجريبي';
   r.totals[e.key]=e.total;r.statuses[e.key]='present';r.scores[e.key]=Math.round(e.total*(0.3+(i%6)*0.1));}
  return r;
 });
 return ws;
}
function inspectPDF(file,{pages,landscape,vector=false,ids=[]}={}){
 assert.ok(fs.statSync(file).size>500,'nonempty PDF');
 assert.equal(fs.readFileSync(file).subarray(0,5).toString(),'%PDF-');
 const info=execFileSync('pdfinfo',[file],{encoding:'utf8'});
 const count=Number(/Pages:\s+(\d+)/.exec(info)?.[1]);assert.ok(count>0);
 if(pages!==undefined)assert.equal(count,pages,'physical PDF page count');
 const dimensions=execFileSync('pdfinfo',['-f','1','-l',String(count),file],{encoding:'utf8'});
 const sizes=[...dimensions.matchAll(/(?:Page\s+\d+\s+size|Page size):\s+([\d.]+)\s+x\s+([\d.]+)/g)];
 assert.equal(sizes.length,count,'every page size inspected');
 for(const [,w,h] of sizes){
  if(landscape!==undefined)assert.equal(Number(w)>Number(h),landscape,'orientation');
  assert.ok(Math.abs(Math.min(+w,+h)-595.28)<2&&Math.abs(Math.max(+w,+h)-841.89)<2,'A4 dimensions');
 }
 const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});
 if(vector){
  assert.ok(text.trim().length>30,'selectable vector text');
  const tokens=text.match(/AUDIT\d{4}/g)||[];
  if(ids.length)assert.deepEqual(tokens.slice().sort(),ids.slice().sort(),'all students exactly once in physical PDF');
  for(let n=1;n<=count;n++){
   const pageText=execFileSync('pdftotext',['-f',String(n),'-l',String(n),file,'-'],{encoding:'utf8'});
   assert.ok(pageText.trim().length>20,'no blank native PDF page '+n);
  }
  const bbox=execFileSync('pdftotext',['-bbox',file,'-'],{encoding:'utf8'});
  for(const pg of bbox.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)){
   for(const box of pg[3].matchAll(/<word xMin="(-?[\d.]+)" yMin="(-?[\d.]+)" xMax="(-?[\d.]+)" yMax="(-?[\d.]+)"/g)){
    assert.ok(+box[1]>=-1&&+box[2]>=-1&&+box[3]<=+pg[1]+1&&+box[4]<=+pg[2]+1,'text within physical page');
   }
  }
 }
 execFileSync('pdftoppm',['-scale-to','1000','-png',file,file.replace(/\.pdf$/, '')],{timeout:120000});
 return {file:path.basename(file),bytes:fs.statSync(file).size,pages:count,
 orientation:+sizes[0][1]>+sizes[0][2]?'landscape':'portrait',selectableText:!!text.trim(),allPagesRendered:true};
}
async function main(){
 const server=http.createServer((req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\/+/,'')||'index.html';
  const file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true});
 async function open(ws,role='owner',yearReport=null){
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1500,height:1100}});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await context.addInitScript(()=>{window.print=()=>{window.__auditPrinted=true;};});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(String(err)));
  await page.goto(origin,{waitUntil:'load'});
  await page.waitForFunction(()=>typeof xde==='function'&&typeof SR63!=='undefined');
  await page.evaluate(({ws,role,yearReport})=>{
   document.getElementById('root').style.display='none';
   const mount=document.createElement('div');mount.id='audit-mount';document.body.appendChild(mount);
   window.auditRoot=y.createRoot(mount);SR63.currentWorkspace=ws;
   window.auditCaptures=[];
   const capture=SR63.reportPageJPEG;
   SR63.reportPageJPEG=async function(node,...args){
    window.auditCaptures.push({text:node.innerText,orientation:node.dataset.orientation});
    return capture.call(this,node,...args);
   };
   if(role==='student'){
    auditRoot.render(v.createElement(SR63.StudentResultsPrint,{workspace:ws}));
   }else if(role==='skills'){
    auditRoot.render(v.createElement(SR63.SkillCenter,{workspace:ws,readOnly:true,canPrint:true}));
   }else if(role==='year'){
    SR63.staff.call=async()=>({report:yearReport});
    auditRoot.render(v.createElement(SR63.YearComparisonCenter,{workspace:ws,canPrint:true}));
   }else if(role==='owner'){
    auditRoot.render(v.createElement(xde,{workspace:ws,onExportExcel:()=>{},canPrint:true}));
   }else{
    const profile={role,ownerId:'synthetic-owner',username:'synthetic-'+role,displayName:'COORDINATOR61070',departments:['اللغة العربية'],
     permissions:{reports:true,compare:true,export:true,studentLevels:true,failedStudents:true,teacherAnalysis:true},skillsWrite:false};
    SR63.staff.coordinatorLoad=async()=>({workspace:ws,profile,revision:1,benchmarks:[],comparisonExam:ws.activeExam});
    SR63.staff.call=async()=>({report:null});
    auditRoot.render(v.createElement(SR63.CoordinatorPortal,{profile}));
   }
  },{ws,role,yearReport});
  if(!['owner','year','student','skills'].includes(role)){
   assert.equal(await page.getByRole('button',{name:'تحليل مهارات المواد',exact:true}).count(),role==='coordinator'?1:0);
   await page.getByRole('button',{name:'مركز التقارير والطباعة',exact:true}).click();
   if(role==='coordinator'){
    await page.getByRole('textbox',{name:'المادة الثابتة لقسم المنسق'}).waitFor();
    assert.equal(await page.getByRole('textbox',{name:'المادة الثابتة لقسم المنسق'}).innerText(),subject);
   }
  }
  return {context,page,errors};
 }
 async function caseReport(mode,count,{role='owner',classes=1,zip=false}={}){
  const id=role+'-'+mode+'-'+count+'-'+classes,ws=fixture(count,classes);
  if(role!=='owner'){const projected=projections[role](ws,[subject]).workspace;Object.assign(ws,projected);ws.subjects=[];ws.teachers=ws.teachers.map(t=>({...t,coordinator:''}));}
  const state=await open(ws,role),{page,context,errors}=state;
  const record={case:id,role,authentication:'synthetic boundary only',mode,count,status:'FAIL',downloads:[]};
  try{
   const titles={levels:'مستويات الطلاب',teachers:'تحصيل المعلمين',comparison:'مقارنة الاختبارين',subjects:role==='coordinator'?'مقارنة مادة القسم':'مقارنة جميع المواد'};
   if(mode!=='summary'){
    const title=role==='owner'?await page.evaluate(mode=>SR63.currentWorkspace.settings.reportDesign.reportNames[mode]||pde.find(x=>x.id===mode)?.title,mode):titles[mode];
    assert.ok(title,'report title '+mode);
    await page.locator('button').filter({has:page.getByText(title,{exact:true})}).first().click();
   }
   await page.getByRole('button',{name:'تجهيز المعاينة',exact:true}).click();
   await page.locator('#printable-reports .school-report-page').first().waitFor();
   const previewFooters=await page.locator('#printable-reports .report-footer').allTextContents();
   const footerTokens=['FOOTER61070','VISION61070','PREPARED61070',...(role==='coordinator'?['COORDINATOR61070']:[])];
   for(const footer of previewFooters)for(const token of footerTokens)assert.ok(footer.includes(token),'preview footer includes '+token);
   const landscape=['subjects','departmentStats'].includes(mode);
   let expectedPages=mode==='comparison'?classes*Math.ceil(Math.ceil(count/classes)/10):
    mode==='levels'?classes*Math.ceil(Math.ceil(count/classes)/34):undefined;
   const previewCount=await page.locator('#printable-reports .school-report-page').count();
   if(expectedPages)assert.equal(previewCount,Math.min(8,expectedPages));
   const fullIds=['comparison','levels'].includes(mode)?ws.rows.map(r=>r.studentId):[];
   const popupPromise=page.waitForEvent('popup');
   await page.getByRole('button',{name:'طباعة التقرير الحالي',exact:true}).click();
   const popup=await popupPromise;
   await popup.waitForFunction(()=>window.__auditPrinted===true,{},{timeout:60000});
   const printedFooters=await popup.locator('.report-footer').allTextContents();
   for(const footer of printedFooters)for(const token of footerTokens)assert.ok(footer.includes(token),'print footer includes '+token);
   assert.deepEqual(printedFooters.slice(0,previewFooters.length),previewFooters,'print footer equals preview');
   const printPages=await popup.locator('.school-report-page').count();
   if(expectedPages!==undefined)assert.equal(printPages,expectedPages);
   expectedPages=printPages;
   const overflow=await popup.locator('.school-report-page').evaluateAll(nodes=>nodes.map(p=>{
    const r=p.getBoundingClientRect();
    const invalid=[...p.querySelectorAll('td,th,img,svg,.report-footer,.report-page-number')].filter(n=>{
     const b=n.getBoundingClientRect();return b.width&&b.height&&(b.left<r.left-2||b.right>r.right+2||b.top<r.top-2||b.bottom>r.bottom+2);
    });
    return invalid.length;
   }));
   assert.ok(overflow.every(x=>x===0),'native print content stays in A4');
   const native=path.join(out,id+'-native.pdf');
   await popup.pdf({path:native,preferCSSPageSize:true,printBackground:true});
   record.downloads.push(inspectPDF(native,{pages:expectedPages,landscape,vector:true,ids:fullIds}));
   await popup.close();
   const downloadPromise=page.waitForEvent('download',{timeout:120000});
   await page.getByRole('button',{name:'تنزيل PDF كامل — ملف واحد',exact:true}).click();
   const download=await downloadPromise,downloadFile=path.join(out,id+'-download.pdf');
   assert.equal(await download.failure(),null);await download.saveAs(downloadFile);
   record.downloads.push({...inspectPDF(downloadFile,{pages:expectedPages,landscape}),suggestedFilename:download.suggestedFilename()});
   const captured=await page.evaluate(()=>window.auditCaptures);
   assert.equal(captured.length,expectedPages);
   for(const capture of captured)for(const token of footerTokens)assert.ok(capture.text.includes(token),'download footer includes '+token);
   if(fullIds.length)assert.deepEqual(captured.flatMap(x=>x.text.match(/AUDIT\d{4}/g)||[]).sort(),fullIds.slice().sort());
   if(zip){
    const promise=page.waitForEvent('download',{timeout:120000});
    await page.getByRole('button',{name:/تنزيل تقارير مفردة ZIP/}).click();
    const dl=await promise,file=path.join(out,id+'.zip');await dl.saveAs(file);
    const zipResult=JSON.parse(execFileSync('python3',['-c',
     'import zipfile,json,sys,pathlib\nz=zipfile.ZipFile(sys.argv[1]); names=z.namelist(); assert z.testzip() is None; assert len(names)==len(set(names)); assert all(n.endswith(".pdf") for n in names)\nfiles=[]\nfor i,n in enumerate(names):\n p=str(pathlib.Path(sys.argv[1]).with_suffix(""))+"-entry-"+str(i)+".pdf"; pathlib.Path(p).write_bytes(z.read(n)); files.append(p)\nprint(json.dumps({"names":names,"files":files}))',file],{encoding:'utf8'}));
    assert.equal(zipResult.files.length,classes,'one ZIP PDF per requested class');
    const entries=zipResult.files.map(f=>inspectPDF(f,{landscape}));
    assert.equal(entries.reduce((sum,x)=>sum+x.pages,0),expectedPages,'ZIP includes all pages');
    record.zip={file:path.basename(file),entries,names:zipResult.names,crc:'PASS'};
    const zipCaptures=await page.evaluate(()=>window.auditCaptures.slice());
    for(const capture of zipCaptures)for(const token of footerTokens)assert.ok(capture.text.includes(token),'ZIP footer includes '+token);
   }
   assert.deepEqual(errors,[],'no uncaught browser errors');
   record.status='PASS';
  }catch(error){
   record.error=String(error.stack||error);record.browserErrors=errors;
   await page.screenshot({path:path.join(out,id+'-failure.png'),fullPage:true}).catch(()=>{});
  }finally{await context.close();records.push(record);console.log('AUDIT_RESULT '+JSON.stringify(record));}
 }
 async function extraReports(){
  for(const kind of ['student','arabic','english']){
   const ws=fixture(kind==='student'?3:28,kind==='student'?1:2);
   if(kind==='english')ws.rows=ws.rows.map(r=>({...r,subject:'اللغة الإنجليزية'}));
   if(kind!=='student'){
    ws.skillsAssessments=['exam4','exam1'].map(exam=>{
     const a=JSON.parse(JSON.stringify(ctx.SR63.skillCreate(ws,kind,exam)));
     a.skills=a.skills.map(s=>({...s,max:10}));
     a.records=a.records.map((r,i)=>({...r,marks:Object.fromEntries(a.skills.map(s=>[s.key,i===0?null:2+i%7]))}));
     return a;
    });
   }
   const {page,context,errors}=await open(ws,kind==='student'?'student':'skills');
   if(kind==='english')await page.locator('label').filter({has:page.getByText('المادة',{exact:true})}).locator('select').selectOption('english');
   for(const mode of kind==='student'?['statement']:['school','summary','students','weak','ranking','audit','comparison']){
    const id=kind+'-'+mode,record={case:id,status:'FAIL',authentication:'synthetic boundary only',downloads:[]};
    try{
     if(kind==='student')await page.getByRole('button',{name:'تجهيز المعاينة',exact:true}).click();
     else await page.locator('label').filter({has:page.getByText('نوع التقرير',{exact:true})}).locator('select').selectOption(mode);
     const popupPromise=page.waitForEvent('popup');
     await page.getByRole('button',{name:kind==='student'?'طباعة 3 نتيجة':'معاينة وطباعة',exact:true}).click();
     const popup=await popupPromise;
     await popup.waitForFunction(()=>window.__auditPrinted===true,{},{timeout:60000});
     record.images=await popup.locator('img').evaluateAll(images=>images.map(im=>({complete:im.complete,width:im.naturalWidth,display:getComputedStyle(im).display})));
     assert.ok(record.images.every(im=>im.complete&&im.width>0&&im.display!=='none'),'all official logos/images loaded before printing');
     const native=path.join(out,id+'-native.pdf');
     await popup.pdf({path:native,preferCSSPageSize:true,printBackground:true});
     record.downloads.push(inspectPDF(native,{landscape:kind!=='student',vector:true,pages:kind==='student'?3:undefined}));
     if(kind!=='student'){
      const labels=await popup.locator('.srskill-page-number').allTextContents();
      labels.forEach((label,i)=>assert.equal(label.trim(),'صفحة '+(i+1)+' من '+labels.length));
     }
     await popup.close();
     if(kind!=='student'){
      const event=page.waitForEvent('download',{timeout:120000});
      await page.getByRole('button',{name:'تنزيل PDF',exact:true}).click();
      const dl=await event,file=path.join(out,id+'-download.pdf');await dl.saveAs(file);
      record.downloads.push(inspectPDF(file,{landscape:true,pages:record.downloads[0].pages}));
      if(mode==='students'){
       const csvEvent=page.waitForEvent('download');
       await page.getByRole('button',{name:'تصدير Excel (CSV)',exact:true}).click();
       const csv=await csvEvent,csvFile=path.join(out,id+'.csv');await csv.saveAs(csvFile);
       const rows=fs.readFileSync(csvFile,'utf8').trim().split(/\r?\n/);
       assert.equal(rows.length,29);record.csv={rows:28,file:path.basename(csvFile)};
      }
     }
     assert.deepEqual(errors,[]);record.status='PASS';
    }catch(e){record.error=String(e.stack||e);await page.screenshot({path:path.join(out,id+'-failure.png'),fullPage:true}).catch(()=>{});}
    records.push(record);console.log('AUDIT_RESULT '+JSON.stringify(record));
   }
   await context.close();
  }
 }
 try{
  await extraReports();
  for(const count of [10,18,28,40,80,90])await caseReport('comparison',count,{zip:count===18});
  for(const mode of ['summary','levels','struggling','teachers','subjects','departmentStats','executive'])await caseReport(mode,18,{zip:mode==='summary'});
  await caseReport('comparison',40,{classes:2,zip:true});
  for(const role of ['coordinator','principal','vice_principal'])for(const mode of ['summary','levels','teachers','comparison','subjects'])await caseReport(mode,18,{role,zip:true});
  // Real annual-report UI/print button with actual calculator output and synthetic cohorts.
  const ts=fs.readFileSync(path.join(root,'supabase/functions/school-staff/year-over-year.ts'),'utf8');
  const code=require('esbuild').transformSync(ts,{loader:'ts',format:'cjs'}).code,mod={exports:{}};
  new Function('module','exports',code)(mod,mod.exports);
  for(const empty of [false,true]){
   const ws=fixture(18),prior=fixture(10);prior.settings.academicYear='2025/2026';
   for(const data of [ws,prior])data.rows.push(...data.rows.map(x=>({...x,subject:'الرياضيات',department:'الرياضيات'})));
   if(empty)ws.rows=[];
   const report=mod.exports.yearExamCompare(ws,prior,'exam4');
   const {context,page}=await open(ws,'year',report);
   const record={case:'year-over-year-'+(empty?'empty':'valid'),status:'FAIL',authentication:'synthetic boundary only'};
   try{
    const button=page.getByRole('button',{name:'معاينة الطباعة / حفظ PDF',exact:true});
    await page.waitForFunction(()=>!document.querySelector('.sr67-year-status'));
    assert.equal(await button.isDisabled(),empty);
    if(!empty){
     const screenRows=await page.locator('.sr67-year-table tbody tr').allTextContents();
     assert.equal(screenRows.length,report.subjects.length+1);assert.match(screenRows.at(-1),/إجمالي المدرسة/);
     const promise=page.waitForEvent('popup');await button.click();const popup=await promise;
     await popup.waitForFunction(()=>window.__auditPrinted===true,{},{timeout:15000});
     assert.deepEqual(await popup.locator('.sr640-table tbody tr').allTextContents(),screenRows,'annual subject table identical in preview and print');
     const file=path.join(out,'year-over-year.pdf');await popup.pdf({path:file,preferCSSPageSize:true,printBackground:true});
     record.pdf=inspectPDF(file,{landscape:true,vector:true});
    }else assert.match(await page.locator('#audit-mount').innerText(),/لا توجد نتائج/);
    record.status='PASS';
   }catch(e){record.error=String(e.stack||e);}finally{await context.close();records.push(record);console.log('AUDIT_RESULT '+JSON.stringify(record));}
  }
 }finally{
  await browser.close();await new Promise(ok=>server.close(ok));
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({testedCommit:process.env.GITHUB_SHA||null,records,
   limits:['No authenticated production test','No physical printer test','No Safari/iPhone test','Direct PDF/ZIP retains the existing raster path; native print PDF is vector','Rendered PNGs require human visual review']},null,2));
 }
 const failures=records.filter(x=>x.status!=='PASS');
 if(failures.length)throw Error(failures.length+' browser audit cases failed; see audit-artifacts/results.json');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
