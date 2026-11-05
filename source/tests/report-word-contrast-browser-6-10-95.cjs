'use strict';
/* 6.10.95 browser: real DOCX bytes and contrast, no external conversion or record mutation. */
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),cp=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).slice(1)||'index.html';
 const filepath=path.resolve(root,pathname);
 if(!filepath.startsWith(root+path.sep)||!fs.existsSync(filepath)){res.writeHead(404);return res.end();}
 res.setHeader('content-type',pathname.endsWith('.js')?'text/javascript':pathname.endsWith('.css')?'text/css':pathname.endsWith('.html')?'text/html':'application/octet-stream');
 fs.createReadStream(filepath).pipe(res);
});
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 try{
  const ctx=await browser.newContext({viewport:{width:1370,height:965},acceptDownloads:true});
  const origin='http://127.0.0.1:'+server.address().port;
  await ctx.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await ctx.newPage(),errs=[];page.on('pageerror',e=>errs.push(e.message));
  await page.goto(origin);await page.waitForFunction(()=>typeof SR63.downloadWordReport==='function');
  const colors=await page.evaluate(()=>{
   const style=document.createElement('style');style.textContent='#sr95-test .dark {background:#11283d;color:#142638;padding:14px} #sr95-test .light {background:#eff6fa;color:#193a4b} #sr95-test table {border-collapse:collapse} #sr95-test th {background:#17374a;color:#1a3945} #sr95-test td {background:#f0f7f9;color:#133747}';
   document.head.appendChild(style);
   const section=document.createElement('section');section.id='sr95-test';section.className='school-report-page report-landscape';
   section.innerHTML='<header><img src="./moehe.png" width="110" height="44"><h1>تقرير تجريبي للمدرسة</h1><div class="dark"><span class="dark-text">عنوان بخلفية داكنة</span></div></header><div class="light"><span>مؤشرات أداء المدرسة</span></div><table><thead><tr><th>الطالب</th><th>النسبة</th></tr></thead><tbody><tr><td>طالب تجريبي</td><td>91.5%</td></tr></tbody></table><footer><strong>مدير المدرسة</strong></footer>';
   document.body.appendChild(section);
   const before=getComputedStyle(section.querySelector('.dark-text')).color;
   const affected=SR63.ensureReportContrast(section);
   const after=getComputedStyle(section.querySelector('.dark-text')).color;
   return {before,after,affected,html:section.outerHTML};
  });
  assert.notEqual(colors.after,colors.before,'dark text on dark report background must be corrected');
  assert.ok(/rgb\(255, 255, 255\)|rgb\(255,255,255\)/.test(colors.after),colors.after);
  assert.ok(colors.affected>=1);
  const downloadEvent=page.waitForEvent('download',{timeout:25000});
  await page.evaluate(()=>SR63.downloadWordReport([document.getElementById('sr95-test').outerHTML],{landscape:true,
   title:'تقرير تجريبي',filename:'تقرير تجريبي Word'}));
  const download=await downloadEvent;
  assert.match(download.suggestedFilename(),/\.docx$/i);
  const filename=await download.path(),bytes=fs.readFileSync(filename);
  assert.equal(bytes.subarray(0,4).toString('latin1'),'PK\u0003\u0004');
  cp.execFileSync('unzip',['-t',filename]);
  const names=cp.execFileSync('unzip',['-Z','-1',filename],{encoding:'utf8'});
  for(const part of ['[Content_Types].xml','_rels/.rels','word/document.xml','word/_rels/document.xml.rels'])
   assert.ok(names.includes(part),'DOCX must include '+part);
  assert.match(names,/word\/media\/report-/);
  const doc=cp.execFileSync('unzip',['-p',filename,'word/document.xml'],{encoding:'utf8'});
  for(const value of ['تقرير تجريبي للمدرسة','عنوان بخلفية داكنة','طالب تجريبي','91.5%','مدير المدرسة'])assert.ok(doc.includes(value),'editable text '+value);
  assert.ok(doc.includes('<w:tbl>')&&doc.includes('w:orient="landscape"'));
  const invalid=await page.evaluate(x=>new DOMParser().parseFromString(x,'application/xml').getElementsByTagName('parsererror').length,doc);
  assert.equal(invalid,0,'Word OOXML must be valid');
  const duplicate=doc.match(/<w:t xml:space="preserve">طالب تجريبي<\/w:t>/g)||[];
  assert.equal(duplicate.length,1,'no duplicate student content');
  assert.deepEqual(errs,[]);
  console.log('PASS 6.10.95 browser: WCAG contrast, real editable DOCX, logo embedded, table cells, landscape and valid Word XML');
  await ctx.close();
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
