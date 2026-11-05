'use strict';
/* Browser checks downloadable editable DOCX, PDF and nationality-specific exports. */
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),cp=require('node:child_process');
const {chromium}=require('playwright'),{loadApp}=require('./harness.cjs');
const root=path.resolve(__dirname,'../..'),{ctx}=loadApp(),ws=JSON.parse(JSON.stringify(ctx.zj()));
ws.activeExam='exam1';ws.settings.schoolName='مدرسة اختبار الأوائل';ws.settings.academicYear='2026/2027';
ws.settings.reportDesign={...ws.settings.reportDesign,showSignatures:true};
ws.settings.exams=ws.settings.exams.map(e=>({...e,total:100,certificateTotal:100}));
const mk=(id,name,score)=>({id:'top-'+id,studentId:id,studentName:name,grade:'السابع',className:'7/1',subject:'الرياضيات',
 department:'الرياضيات',teacher:'معلم الرياضيات',scores:{exam1:score},totals:{exam1:100},statuses:{exam1:'present'}});
ws.rows=[mk('Q01','قطري أول',100),mk('Q02','قطري ثان',95),mk('R01','مقيم أول',99),mk('R02','مقيم ثان',92),mk('U01','غير مصنف',97)];
ws.studentNationalities={Q01:'qatari',Q02:'qatari',R01:'resident',R02:'resident'};
const server=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).slice(1)||'index.html',filepath=path.resolve(root,rel);
 if(!filepath.startsWith(root+path.sep)||!fs.existsSync(filepath)){res.writeHead(404);return res.end();}
 res.setHeader('content-type',rel.endsWith('.js')?'text/javascript':rel.endsWith('.css')?'text/css':rel.endsWith('.html')?'text/html':'application/octet-stream');
 fs.createReadStream(filepath).pipe(res);
});
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1390,height:980},acceptDownloads:true});
  const origin='http://127.0.0.1:'+server.address().port;
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.waitForFunction(()=>typeof SR63.topRanksDownload==='function');
  await page.evaluate(ws=>{
   const original=document.getElementById('root');if(original)original.style.display='none';
   const target=document.createElement('div');target.id='ranks-export-audit';document.body.appendChild(target);
   window.testRankRoot=y.createRoot(target);
   window.testRankRoot.render(v.createElement(SR63.StudentTopRanksCenter,{workspace:ws,mode:'grade',canPrint:true}));
  },ws);
  const area=page.locator('#ranks-export-audit');await area.getByRole('button',{name:'عرض المراكز العشرة'}).click();
  await area.getByText('الصف السابع — الطلاب القطريون').waitFor();
  const scope=area.getByLabel('تنزيل فئة الجنسية');
  assert.equal(await scope.inputValue(),'both');
  const wordDownload=page.waitForEvent('download');
  await area.getByRole('button',{name:'تحميل Word'}).click();
  const word=await wordDownload,docxPath=await word.path(),docx=fs.readFileSync(docxPath);
  assert.ok(word.suggestedFilename().endsWith('.docx'));
  assert.equal(docx.subarray(0,4).toString('binary'),'PK\u0003\u0004');
  cp.execFileSync('unzip',['-t',docxPath],{stdio:'pipe'});
  const entryNames=cp.execFileSync('unzip',['-Z','-1',docxPath],{encoding:'utf8'});
  for(const expected of ['[Content_Types].xml','_rels/.rels','word/document.xml','word/_rels/document.xml.rels','word/media/moehe.png'])assert.ok(entryNames.includes(expected));
  const documentXml=cp.execFileSync('unzip',['-p',docxPath,'word/document.xml'],{encoding:'utf8'});
  assert.ok(documentXml.includes('قطري أول')&&documentXml.includes('مقيم أول'));
  assert.ok(documentXml.indexOf('الطلاب القطريون')<documentXml.indexOf('الطلاب المقيمون'));
  assert.ok(!documentXml.includes('غير مصنف')&&!documentXml.includes('Q01')&&!documentXml.includes('R01'));
  assert.ok(documentXml.includes('w:orient="landscape"'));
  const malformed=await page.evaluate(xml=>new DOMParser().parseFromString(xml,'application/xml').getElementsByTagName('parsererror').length,documentXml);
  assert.equal(malformed,0,'DOCX XML should parse without errors');
  await scope.selectOption('qatari');
  const pdfDownload=page.waitForEvent('download');
  await area.getByRole('button',{name:'تحميل PDF'}).click();
  const pdf=await pdfDownload,pdfBytes=fs.readFileSync(await pdf.path());
  assert.ok(pdf.suggestedFilename().endsWith('.pdf'));
  assert.equal(pdfBytes.subarray(0,8).toString('latin1'),'%PDF-1.4');
  assert.equal((pdfBytes.toString('latin1').match(/\/Type\/Page\/Parent/g)||[]).length,1,'Qatari-only PDF is one landscape page');
  await scope.selectOption('resident');
  const residentDownload=page.waitForEvent('download');
  await area.getByRole('button',{name:'تحميل Word'}).click();
  const resident=await residentDownload;
  const rXml=cp.execFileSync('unzip',['-p',await resident.path(),'word/document.xml'],{encoding:'utf8'});
  assert.ok(rXml.includes('مقيم أول')&&!rXml.includes('قطري أول'),'resident-only file should not include Qatari students');
  assert.equal(errors.length,0,'no browser JavaScript errors: '+errors.join(' | '));
  await context.close();
  console.log('PASS 6.10.94 browser: real DOCX ZIP/Word XML, Qatari-first order, direct PDF bytes, nationality-specific files and original official theme.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
