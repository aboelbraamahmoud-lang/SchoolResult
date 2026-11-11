const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{
 const page=await browser.newPage({viewport:{width:1000,height:1000}});
 await page.setContent('<html dir="rtl"><body></body></html>');
 await page.addStyleTag({content:fs.readFileSync(path.resolve(__dirname,'../../style.css'),'utf8')});
 await page.evaluate(()=>window.SR63={});
 await page.addScriptTag({content:fs.readFileSync(path.resolve(__dirname,'../src/report-contrast.js'),'utf8')});
 await page.evaluate(()=>{
 const root=document.createElement('section');root.className='school-report-page';root.id='fixture';
 const colors=['#084b28','#f3dc10','#ab1f18','#000000','#ffffff','#777777'];
 root.innerHTML='<h2>اختبار وضوح الدرجات والنسب</h2><table class="level-analysis-table"><tbody>'+colors.map((color,i)=>'<tr><td>طالب تجريبي '+(i+1)+'</td>'+['level-score-visual','level-certificate-visual','level-percent-visual'].map((cls,j)=>'<td class="'+cls+'"><div class="report-meter sr-band-linked" style="--sr-band-color:'+color+'"><i style="width:'+([0,25,50,70,95,100][i])+'%"></i><b>'+(['28.5','14.5','95%'][j])+'</b></div></td>').join('')+'</tr>').join('')+'</tbody></table><div class="dark" style="background:#11283d;color:#132638;-webkit-text-fill-color:#142638">عنوان داكن</div><div class="mid" style="background:#777;color:#888">عنوان متوسط</div>';
 document.body.append(root);SR63.ensureReportContrast(root);
 });
 await page.evaluate(()=>{SR63.escape=v=>String(v??'');SR63.subjectCoordinator=()=> 'منسق';});
 await page.addScriptTag({content:fs.readFileSync(path.resolve(__dirname,'../src/report-footer.js'),'utf8')});
 await page.evaluate(()=>{
 const ws={settings:{reportDesign:{showSignatures:true},academicViceName:'نائب',principalName:'مدير'}};
 for(const scope of ['school','department','teacher']){
 const section=document.createElement('section');section.id='signatures-'+scope;
 section.innerHTML=SR63.reportFooterHTML(ws,'رياضيات','معلم','',{scope});document.body.append(section);
 }
 });
 for(const media of ['screen','print']){
 await page.emulateMedia({media});
 for(const [scope,count] of [['school',2],['department',3],['teacher',4]]){
 const result=await page.$eval('#signatures-'+scope+' .report-signatures',e=>({count:e.children.length,columns:getComputedStyle(e).gridTemplateColumns.split(' ').length,text:e.textContent}));
 assert.equal(result.count,count);assert.equal(result.columns,count);
 assert.equal(result.text.includes('معلم المادة'),scope==='teacher');
 assert.equal(result.text.includes('منسق المادة'),scope!=='school');
 }

 const geometry=()=>page.evaluate(()=>[...document.querySelectorAll('#fixture,table,tr,td,.report-meter')].map(e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return [r.width,r.height,s.zoom,s.transform];}));
 const current=await geometry();
 const baseline=await page.addStyleTag({content:'.school-report-page .level-analysis-table .report-meter > b {font-size:9pt!important;line-height:1.2!important;padding:0 .22em!important;background:#fff!important}.school-report-page .level-analysis-table .level-certificate-visual .report-meter > b {font-size:inherit!important}'});
 const previous=await geometry();
 await baseline.evaluate(e=>e.remove());
 assert.equal(current.length,previous.length);
 current.forEach((r,i)=>{assert.ok(Math.abs(r[0]-previous[i][0])<.1,`unchanged width ${i}: ${r[0]} / ${previous[i][0]}`);assert.ok(Math.abs(r[1]-previous[i][1])<.1,`unchanged height ${i}: ${r[1]} / ${previous[i][1]}`);assert.equal(r[2],previous[i][2]);assert.equal(r[3],previous[i][3]);});
 const results=await page.evaluate(()=>[...document.querySelectorAll('.report-meter > b')].map(el=>{const s=getComputedStyle(el);return {bg:s.backgroundColor,fill:s.webkitTextFillColor,weight:s.fontWeight,size:parseFloat(s.fontSize),width:el.getBoundingClientRect().width,parent:el.parentElement.getBoundingClientRect().width}}));
 for(const r of results){assert.equal(r.bg,'rgba(0, 0, 0, 0)');assert.equal(r.fill,'rgb(0, 0, 0)');assert.ok(+r.weight>=700);assert.ok(r.size>=13.3);assert.ok(r.width<=r.parent+1);}
 const dark=await page.$eval('.dark',e=>getComputedStyle(e).webkitTextFillColor);assert.equal(dark,'rgb(255, 255, 255)');
 const mid=await page.$eval('.mid',e=>getComputedStyle(e).color);assert.equal(mid,'rgb(0, 0, 0)');
 }
 fs.mkdirSync(path.resolve(__dirname,'../../audit-artifacts'),{recursive:true});
 await page.screenshot({path:path.resolve(__dirname,'../../audit-artifacts/report-meter-readability.png')});
 console.log('PASS screen/print: 18 meters across six backgrounds, zero/partial/full fills, bold 10pt unboxed scores, unchanged page/cell geometry, text-fill correction and mid-tone contrast');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
