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
 for(const media of ['screen','print']){
 await page.emulateMedia({media});
 const results=await page.evaluate(()=>[...document.querySelectorAll('.report-meter > b')].map(el=>{const s=getComputedStyle(el);return {bg:s.backgroundColor,fill:s.webkitTextFillColor,weight:s.fontWeight,size:parseFloat(s.fontSize),width:el.getBoundingClientRect().width,parent:el.parentElement.getBoundingClientRect().width}}));
 for(const r of results){assert.equal(r.bg,'rgb(255, 255, 255)');assert.equal(r.fill,'rgb(0, 0, 0)');assert.ok(+r.weight>=700);assert.ok(r.size>=12);assert.ok(r.width<=r.parent+1);}
 const dark=await page.$eval('.dark',e=>getComputedStyle(e).webkitTextFillColor);assert.equal(dark,'rgb(255, 255, 255)');
 const mid=await page.$eval('.mid',e=>getComputedStyle(e).color);assert.equal(mid,'rgb(0, 0, 0)');
 }
 await page.screenshot({path:path.resolve(__dirname,'output/report-meter-readability.png')});
 console.log('PASS screen/print: 18 meters across six backgrounds, zero/partial/full fills, bold 9pt scores, text-fill correction and mid-tone contrast');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
