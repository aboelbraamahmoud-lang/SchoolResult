const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1400,height:1400}});
 await page.setContent('<html dir="rtl"><body></body></html>');
 await page.addStyleTag({content:fs.readFileSync(path.resolve(__dirname,'../../style.css'),'utf8')});
 await page.evaluate(()=>window.SR63={});
 await page.addScriptTag({content:fs.readFileSync(path.resolve(__dirname,'../src/report-print-batch.js'),'utf8')});
 for(const landscape of [false,true])for(const rows of [4,20,45]){
 const result=await page.evaluate(({landscape,rows})=>{
 document.body.innerHTML='';
 const root=document.createElement('section');root.className='school-report-page sr-fitted-report '+(landscape?'report-landscape':'report-portrait');
 root.innerHTML='<div class="sr-report-fit-content"><header class="report-head">تقرير تجريبي</header><table class="report-table"><tbody>'+Array.from({length:rows},(_,i)=>'<tr><td>طالب '+i+'</td><td style="font-size:10pt;font-weight:bold;color:black">95.5%</td></tr>').join('')+'</tbody></table><footer class="report-footer"><div class="report-signatures">النائب والمدير</div><p>الرؤية: تعليم متميز يحقق التنمية المستدامة</p><div class="report-attribution"><span>البرمجة والتصميم: مطور النظام</span></div></footer><span class="report-page-number">صفحة 1 من 1</span></div>';
 document.body.append(root);
 const mm=96/25.4,w=(landscape?297:210)*mm,h=(landscape?210:297)*mm;
 const first=SR63.planReportSheet(root,w,h),again=SR63.planReportSheet(root,w,h);
 const r=root.getBoundingClientRect(),s=getComputedStyle(root),c=root.firstElementChild.getBoundingClientRect();
 const footerBounds=[...root.querySelectorAll('.report-footer,.report-footer p,.report-attribution,.report-page-number')].map(n=>{const b=n.getBoundingClientRect();return {top:b.top-r.top,bottom:b.bottom-r.top,height:b.height,position:getComputedStyle(n).position}});
 return {footerBounds,bottomInset:parseFloat(s.paddingBottom),first,again,padding:parseFloat(s.paddingTop),paper:[r.width,r.height],expected:[w,h],content:[c.left-r.left,c.right-r.left,c.bottom-r.top],rows:root.querySelectorAll('tr').length};
 },{landscape,rows});
 assert.equal(result.rows,rows);
 assert.ok(Math.abs(result.bottomInset-7*96/25.4)<.1,'printer-safe bottom inset');
 for(const footer of result.footerBounds){assert.ok(footer.height>0,'footer visible');assert.notEqual(footer.position,'absolute','footer participates in fit');assert.ok(footer.bottom<=result.paper[1]-result.bottomInset+1,'footer remains above printer safety area');}
 assert.ok(result.footerBounds[2].top>=result.footerBounds[1].bottom-1,'attribution follows vision without overlap');assert.ok(Math.abs(result.padding-3*96/25.4)<.1);
 result.paper.forEach((v,i)=>assert.ok(Math.abs(v-result.expected[i])<1));
 assert.ok(result.content[0]>=-1&&result.content[1]<=result.paper[0]+1&&result.content[2]<=result.paper[1]+1,'no content clipped');
 assert.ok(Math.abs(result.first.scale-result.again.scale)<.001,'repeat export is stable');
 if(rows===4)assert.ok(result.first.scale>1,'short report grows instead of retaining old whitespace');
 }
 fs.mkdirSync('audit-artifacts',{recursive:true});await page.screenshot({path:'audit-artifacts/compact-report-page.png'});
 console.log('PASS compact A4 insets: portrait/landscape, sparse/dense rows, proportional enlargement, stable repeat fit and no clipping');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
