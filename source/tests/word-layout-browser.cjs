'use strict';
// Real controls, real PDF/DOCX exporters; synthetic fixtures and server boundaries only.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),esbuild=require('esbuild');
const {loadApp}=require('./harness.cjs');
const root=path.resolve(__dirname,'../..'),out=process.env.WORD_AUDIT_OUT||path.join(root,'audit-artifacts/word-layout');
fs.mkdirSync(out,{recursive:true});
const {ctx}=loadApp();
function moduleTS(file){const mod={exports:{}};new Function('module','exports',esbuild.transformSync(fs.readFileSync(path.join(root,file),'utf8'),{loader:'ts',format:'cjs'}).code)(mod,mod.exports);return mod.exports;}
const {subjectComparison}=moduleTS('supabase/functions/school-staff/subject-comparison.ts');
const {yearExamCompare}=moduleTS('supabase/functions/school-staff/year-over-year.ts');
function fixture(count=30,classes=1){
 const ws=JSON.parse(JSON.stringify(ctx.zj()));ws.activeExam='exam1';
 Object.assign(ws.settings,{schoolName:'مدرسة الاختبار الآمن',principalName:'مديرة تجريبية',coordinatorName:'منسقة تجريبية',academicYear:'2026/2027',preparedByName:'معلمة تجريبية'});
 ws.settings.exams[0].name='اختبار منتصف الفصل الدراسي الأول';
 const original=ws.rows.find(r=>r.subject==='اللغة العربية');
 ws.rows=Array.from({length:count},(_,i)=>{
  const r={...structuredClone(original),id:'synthetic-'+i,studentId:'TEST'+String(i+1).padStart(4,'0'),studentName:'طالبة اختبار '+String(i+1).padStart(4,'0'),className:'7/'+(1+i%classes),grade:'7',teacher:'معلمة تجريبية',scores:{},totals:{},statuses:{},examClasses:{},examTeachers:{}};
  for(const e of ws.settings.exams){r.scores[e.key]=Math.round(e.total*(.35+(i%7)*.1)*100)/100;r.totals[e.key]=e.total;r.statuses[e.key]='present';r.examClasses[e.key]=r.className;r.examTeachers[e.key]=r.teacher;}
  return r;
 });ws.studentNationalities=Object.fromEntries(ws.rows.map((r,i)=>[r.studentId,i%2?'qatari':'resident']));return ws;
}
async function main(){
 const server=http.createServer((req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html',f=path.resolve(root,rel);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=process.env.WORD_BASE_URL||'http://127.0.0.1:'+server.address().port,records=[];let browser;
 try{
  browser=await chromium.launch({headless:true,env:{...process.env,LANG:'C.UTF-8',LC_ALL:'C.UTF-8'},...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
  const modes=(process.env.WORD_MODES||'executive,summary,levels,struggling,strugglingStats,teachers,comparison,subjects,departmentStats,support,yearComparison,topGrade,topSubject').split(',');
  for(const mode of modes){
   const context=await browser.newContext({acceptDownloads:true,viewport:{width:1500,height:1100}}),record={mode,status:'FAIL'};
   try{
    await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    await context.addInitScript(()=>{window.print=()=>{window.__auditPrinted=true;};});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>typeof xde==='function');record.version=await page.evaluate(()=>SR63.version);if(process.env.WORD_EXPECT_VERSION)assert.equal(record.version,process.env.WORD_EXPECT_VERSION);
    const ws=fixture(Number(process.env.WORD_ROWS||30),Number(process.env.WORD_CLASSES||1));
    if(mode==='comparison')ws.activeExam='exam2';
    if(mode==='support')for(const r of ws.rows)r.department='التربية الخاصة';
    const prior=fixture(18);prior.settings.academicYear='2025/2026';
    if(mode==='yearComparison'&&process.env.WORD_YEAR_SUBJECTS){for(const data of [ws,prior]){const base=[...data.rows];for(let i=1;i<Number(process.env.WORD_YEAR_SUBJECTS);i++)data.rows.push(...base.map(r=>({...r,subject:'مادة اختبار '+i,department:'مادة اختبار '+i})));}}
    await page.evaluate(({ws,subjects,year})=>{
     document.getElementById('root').style.display='none';const m=document.createElement('div');document.body.append(m);window.auditRoot=y.createRoot(m);SR63.currentWorkspace=ws;
     SR63.staff.call=async b=>({report:b.action==='year_comparison'?year:subjects[b.exam]});SR63.staff.supportCoordinator=async()=> 'منسقة تجريبية';
     window.auditWordInputs=[];const original=SR63.wordReportBlob;
     SR63.wordReportBlob=async function(pages,opts){window.auditWordInputs.push({pages:pages.map(p=>typeof p==='string'?p:p.root?p.root.outerHTML:p.outerHTML),css:opts?.css||'',landscape:opts?.landscape});return original.call(this,pages,opts);};
     auditRoot.render(v.createElement(xde,{workspace:ws,onExportExcel:()=>{},canPrint:true}));
    },{ws,subjects:Object.fromEntries(ws.settings.exams.map(e=>[e.key,subjectComparison(ws,e.key)])),year:yearExamCompare(ws,prior,ws.activeExam)});
    await page.locator('[data-report-id="'+mode+'"] button').first().click();
    const special=['topGrade','topSubject'].includes(mode),annual=mode==='yearComparison';
    if(special)await page.getByRole('button',{name:'عرض المراكز العشرة',exact:true}).click();
    else if(annual)await page.waitForFunction(()=>!document.querySelector('.sr67-year-status'));
    else{
     await page.getByRole('button',{name:'تجهيز المعاينة',exact:true}).click();await page.locator('#printable-reports .school-report-page').first().waitFor();await page.evaluate(()=>document.fonts.ready);
     await page.locator('#printable-reports .school-report-page').first().screenshot({path:path.join(out,mode+'-source.png')});
    }
    const download=async(format,name)=>{
     const pending=page.waitForEvent('download',{timeout:240000});await page.getByRole('button',{name,exact:typeof name==='string'}).click();const dl=await pending;assert.equal(await dl.failure(),null);record[format+'Filename']=dl.suggestedFilename();assert.ok(dl.suggestedFilename().endsWith('.'+format),'Download filename must retain extension: '+dl.suggestedFilename());await dl.saveAs(path.join(out,mode+'.'+format));record[format+'Bytes']=fs.statSync(path.join(out,mode+'.'+format)).size;assert.ok(record[format+'Bytes']>500);
    };
    await download('docx',annual?'تنزيل Word':special?'تحميل Word':/تحميل Word \(\.docx\)/);
    const inputs=await page.evaluate(()=>window.auditWordInputs);assert.equal(inputs.length,1,'single shared editable exporter');record.pages=inputs[0].pages.length;fs.writeFileSync(path.join(out,mode+'-source.json'),JSON.stringify(inputs[0],null,2));
    if(!process.env.WORD_SKIP_PDF){
     if(annual){const pending=page.waitForEvent('popup');await page.getByRole('button',{name:'معاينة الطباعة / حفظ PDF',exact:true}).click();const popup=await pending;await popup.waitForFunction(()=>window.__auditPrinted===true);await popup.pdf({path:path.join(out,mode+'.pdf'),preferCSSPageSize:true,printBackground:true});}
     else await download('pdf',special?'تحميل PDF':'تنزيل PDF كامل — ملف واحد');
    }
    assert.deepEqual(errors,[]);record.status='PASS';
   }catch(e){record.error=String(e.stack||e);}
   finally{await context.close();records.push(record);fs.writeFileSync(path.join(out,'downloads.json'),JSON.stringify(records,null,2));console.log(JSON.stringify(record));}
  }
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
 assert.ok(records.every(r=>r.status==='PASS'),'all report controls must download successfully');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
