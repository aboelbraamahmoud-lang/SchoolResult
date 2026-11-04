'use strict';
/* 6.10.92 browser integration: real XLSX upload, preview, confirm, separate rank print. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),{loadApp}=require('./harness.cjs');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'audit-artifacts');fs.mkdirSync(out,{recursive:true});
const {ctx}=loadApp(),ws=JSON.parse(JSON.stringify(ctx.zj()));
ws.activeExam='exam1';ws.settings.schoolName='مدرسة اختبار الجنسيات';
ws.settings.exams=ws.settings.exams.map(e=>({...e,total:100,certificateTotal:100}));
const row=(id,name,score)=>({id:'rank-'+id,studentId:id,studentName:name,
 subject:'الرياضيات',department:'الرياضيات',className:'7/1',grade:'السابع',teacher:'المعلم',
 scores:{exam1:score},totals:{exam1:100},statuses:{exam1:'present'}});
ws.rows=[row('Q01','طالب قطري',95),row('R01','طالب مقيم',92),row('U01','طالب مجهول الجنسية',100)];
ws.studentNationalities={};
async function main(){
 const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html',file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return res.writeHead(404).end();
  res.setHeader('content-type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream');
  fs.createReadStream(file).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:'+server.address().port;
 try{
  const context=await browser.newContext({viewport:{width:1390,height:1000},acceptDownloads:true});
  await context.route('**/*',req=>new URL(req.request().url()).origin===origin?req.continue():req.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto(origin);await page.waitForFunction(()=>typeof SR63.StudentNationalityAdmin==='function');
  await page.evaluate(ws=>{
   document.getElementById('root').style.display='none';
   window.Kj=async()=>true;window.jj=(value)=>value;
   const mount=document.createElement('div');mount.id='nat-test';document.body.append(mount);
   window.natRoot=y.createRoot(mount);window.natInitial=ws;
   function Harness(){const [current,setWorkspace]=v.useState(ws);window.getSavedNationalities=()=>current.studentNationalities;return v.createElement(SR63.StudentNationalityAdmin,{workspace:current,setWorkspace});}
   window.natRoot.render(v.createElement(Harness));
  },ws);
  await page.getByRole('heading',{name:'جنسيات الطلاب — تقسيم المراكز العشرة الأولى'}).waitFor();
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'تنزيل نموذج الجنسيات (Excel)'}).click();
  const file=await download;assert.match(file.suggestedFilename(),/جنسيات/);
  const workbookDownload=page.waitForEvent('download');
  await page.evaluate(()=>{
   const wb=Gv.book_new(),header=['الرقم','الاسم','الجنسية','الصف','الشعبة الصفية'];
   const qatari=['Q01','طالب قطري','قطر','7','07/1'];
   const resident=['R01','طالب مقيم','مصر','8','08/1'];
   const add=(name,rows)=>Gv.book_append_sheet(wb,Gv.aoa_to_sheet([header,...rows]),name);
   add('7',[qatari]);add('8',[resident]);add('9',[]);
   add('الجميع',[qatari,resident]);
   Tv(wb,'سجل-القيد-التجريبي.xlsx');
  });
  const workbookFile=await workbookDownload;
  const workbookBytes=fs.readFileSync(await workbookFile.path());
  await page.locator('#nat-test input[type="file"]').setInputFiles({
   name:'سجل-القيد-التجريبي.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
   buffer:workbookBytes
  });
  await page.getByRole('button',{name:'الخطوة ٣ — اعتماد الجنسيات وحفظها'}).waitFor();
  assert.equal(await page.getByText('طلاب مطابقون').locator('..').locator('strong').innerText(),'2');
  assert.equal(await page.getByText('صفوف الملف').locator('..').locator('strong').innerText(),'2','combined sheet avoids duplicate rows');
  await page.getByText('الأوراق المقروءة: الجميع').waitFor();
  assert.deepEqual(await page.evaluate(()=>getSavedNationalities()),{},'preview must not persist data');
  await page.getByRole('button',{name:'الخطوة ٣ — اعتماد الجنسيات وحفظها'}).click();
  await page.waitForFunction(()=>getSavedNationalities()?.Q01==='qatari'&&getSavedNationalities()?.R01==='resident');
  const saved=await page.evaluate(()=>getSavedNationalities());
  assert.equal(saved.Q01,'qatari');assert.equal(saved.R01,'resident');
  assert.equal(saved.U01,undefined);
  await page.evaluate(ws=>{
   const area=document.createElement('div');area.id='top-ranking-test';document.body.append(area);
   window.__printedTopHtml='';
   SR63.staffPrintHtml=({body})=>{window.__printedTopHtml=body;};
   window.rankRoot=y.createRoot(area);
   rankRoot.render(v.createElement(SR63.StudentTopRanksCenter,{workspace:{...ws,studentNationalities:getSavedNationalities()},mode:'grade',canPrint:true}));
  },ws);
  await page.locator('#top-ranking-test').getByRole('button',{name:'عرض المراكز العشرة'}).click();
  const headings=await page.locator('#top-ranking-test h3').allTextContents();
  assert.equal(headings.length,2);
  assert.match(headings[0],/الطلاب القطريون/);
  assert.match(headings[1],/الطلاب المقيمون/);
  await page.locator('#top-ranking-test').getByRole('button',{name:'معاينة الطباعة / حفظ PDF'}).click();
  const html=await page.evaluate(()=>window.__printedTopHtml);
  assert.ok(html.indexOf('الطلاب القطريون')<html.indexOf('الطلاب المقيمون'),'print Qatari before resident');
  assert.ok(html.includes('طالب قطري')&&html.includes('طالب مقيم'));
  assert.ok(!html.includes('طالب مجهول الجنسية'),'unclassified child cannot enter ranked lists');
  assert.ok(!html.includes('Q01')&&!html.includes('R01'),'academic IDs must not print');
  assert.deepEqual(errors,[],'no JavaScript page failures');
  await page.screenshot({path:path.join(out,'nationality-admin-6-10-92.png'),fullPage:true});
  await context.close();
  console.log('PASS browser: admin template download, actual XLSX upload and preview, explicit save, separate Qatari/resident top-ten and printed ordering');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
