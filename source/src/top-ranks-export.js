/* SchoolResult 6.10.94 — download the existing top-ten ranking as real DOCX or PDF. */
(function(){
 const labels=['المركز','اسم الطالب','الشعبة','الدرجة المحصّلة','الدرجة الكلية','النسبة','رصد المواد'];
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const nums=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
 const cells=r=>[r.position,r.studentName,r.className,nums(r.score),nums(r.total),Number(r.percentage).toFixed(3)+'%',r.recordedCount+' / '+r.expectedCount+(r.complete?' · مكتمل':' · جزئي')];
 SR63.topRanksExportPages=function(groups,options={}){
  const selected=(groups||[]).filter(g=>options.scope==='qatari'||options.scope==='resident'?g.nationalityGroup===options.scope:true),out=[];
  for(const g of selected){if(!g.rows?.length)continue;for(let i=0;i<g.rows.length;i+=10)
   out.push({group:g,rows:g.rows.slice(i,i+10),part:Math.floor(i/10)+1,parts:Math.ceil(g.rows.length/10)});}
  return out;
 };
 SR63.topRanksExportName=(scope,mode,ext)=>'العشرة الأوائل - '+(scope==='qatari'?'القطريون':scope==='resident'?'المقيمون':'القطريون والمقيمون')+' - '+(mode==='subject'?'حسب المادة':'حسب الصف')+'.'+ext;
 const css=[
 '*{box-sizing:border-box}.top-ranks-export{width:1122px;height:794px;overflow:hidden;background:#fff;direction:rtl;color:#19384a;font-family:Arial,Tahoma,sans-serif;font-size:13px;padding:33px 42px 25px;display:flex;flex-direction:column}',
 '.tr-header{height:118px;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;gap:20px;border-bottom:3px solid #71304a}',
 '.tr-header img{object-fit:contain;width:158px;height:84px}.tr-header h1{font-size:22px;font-weight:900;color:#71304a;margin:5px 0}.tr-header h2{font-size:17px;color:#24516b;margin:5px 0}.tr-header p,.tr-ministry{font-size:12px;color:#496b7c;margin:3px 0}',
 '.tr-content{flex:1;min-height:0}.tr-content h3{font-size:18px;color:#24516b;margin:10px 0 5px}.tr-metrics{font-size:12px;color:#526d7a;margin:3px 0 9px}',
 '.tr-table{width:100%;border-collapse:collapse;direction:rtl;table-layout:fixed;font-size:12px}.tr-table th,.tr-table td{border:1px solid #bdced6;padding:7px 6px;text-align:right;line-height:1.35;overflow-wrap:anywhere}.tr-table th{background:#d9e9ee;color:#173f51;font-weight:900}.tr-table th:nth-child(2){width:27%}.tr-table th:nth-child(7){width:15%}.tr-table tbody tr:nth-child(odd){background:#f5fafb}',
 '.tr-note{font-size:9.3px;line-height:1.4;color:#506978;margin-top:9px;border-top:1px solid #e0e8ed;padding-top:7px;max-height:76px}',
 '.top-ranks-export .report-footer{margin:0;padding-top:8px;border-top:1px solid #cbd8de;font-size:10px;max-height:90px;overflow:hidden;flex-shrink:0}.top-ranks-export .report-signatures{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}',
 '.top-ranks-export .report-signatures>div{border:1px solid #d2e1e6;text-align:center;min-height:42px}.top-ranks-export .report-signatures b{display:block;background:#e5eff1;color:#28576a;padding:3px}.top-ranks-export .report-signatures span{display:block;padding:3px}',
 '.top-ranks-export .report-custom-footer,.top-ranks-export .report-attribution{margin:3px 0;font-size:9.5px}.top-ranks-export .report-stamp-image{max-width:60px;max-height:38px}.tr-page-num{text-align:left;font-size:10px;color:#607583}'
 ].join('');
 const foot=(meta,page)=>SR63.reportFooterHTML(meta.workspace,meta.mode==='subject'?page.group.subject:'','','',{scope:page.group.className?'className':meta.mode==='subject'?'subject':'grade'});
 function pageHtml(p,meta,n,count){
  const s=meta.workspace.settings,logo=new URL('./moehe.png',document.baseURI).href;
  const rows=p.rows.map((r,i)=>'<tr>'+cells(r).map((v,j)=>'<td'+((j===3||j===5)?' style="font-weight:800;color:#24516b"':'')+'>'+esc(v)+'</td>').join('')+'</tr>').join('');
  return '<article class="top-ranks-export"><header class="tr-header"><div><div class="tr-ministry">وزارة التربية والتعليم والتعليم العالي</div><h1>'+esc(s.schoolName||'المدرسة')+'</h1><h2>'+esc(meta.title)+'</h2><p>'+esc(meta.examName)+' · العام الأكاديمي: '+esc(s.academicYear||'')+'</p></div><img src="'+esc(logo)+'" alt="شعار الوزارة"></header>'+
   '<div class="tr-content"><h3>'+esc(p.group.title)+(p.parts>1?' — الجزء '+p.part+' من '+p.parts:'')+'</h3><p class="tr-metrics">'+p.group.eligible+' طالب محسوب · '+p.group.incompleteCount+' نتيجة جزئية · '+p.group.rows.length+' اسمًا في القائمة</p>'+
   '<table class="tr-table"><thead><tr>'+labels.map(v=>'<th>'+esc(v)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table>'+
   '<p class="tr-note">'+esc(meta.method+' '+meta.note)+'</p></div>'+foot(meta,p)+
   '<div class="tr-page-num">صفحة '+n+' من '+count+'</div></article>';
 }
 SR63.topRanksExportHtml=(pages,meta)=>'<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+pages.map((p,i)=>pageHtml(p,meta,i+1,pages.length)).join('')+'</body></html>';
 // The same pageHtml/css used by PDF is the only Word design source.
 SR63.topRanksWordBlob=async(pages,meta)=>{
  if(!pages.length)throw Error('لا توجد أسماء في النطاق المحدد.');
  return SR63.wordReportBlob(pages.map((p,i)=>pageHtml(p,meta,i+1,pages.length)),{css,landscape:true});
 };
 SR63.topRanksPdfBlob=async(pages,meta)=>{
  if(!pages.length)throw Error('لا توجد أسماء في النطاق المحدد.');
  const host=document.createElement('div');host.style.cssText='position:fixed;left:-15000px;top:0;z-index:-1;background:white;width:1122px;';
  const style=document.createElement('style');style.textContent=css;host.appendChild(style);document.body.appendChild(host);
  const images=[];
  try{
   await(document.fonts?.ready||Promise.resolve());
   for(let i=0;i<pages.length;i++){
    const mount=document.createElement('div');mount.innerHTML=pageHtml(pages[i],meta,i+1,pages.length);host.appendChild(mount);
    const el=mount.firstElementChild;
    for(const img of el.querySelectorAll('img')){await SR63.reportEmbedImage(img);await img.decode();}
    const canvas=await SR72Canvas.toCanvas(el,{pixelRatio:2.5,backgroundColor:'#ffffff',width:1122,height:794,canvasWidth:1122,canvasHeight:794,skipAutoScale:true});
    images.push({dataUrl:canvas.toDataURL('image/jpeg',.975),width:canvas.width,height:canvas.height,landscape:true});
    mount.remove();
   }
   return SR63.reportPdfFromJpegs(images);
  }finally{host.remove();}
 };
 SR63.topRanksDownload=async(format,groups,options)=>{
  const pages=SR63.topRanksExportPages(groups,{scope:options.scope});
  if(!pages.length)throw Error('لا يوجد طلاب في قائمة الجنسية المحددة.');
  const meta={workspace:options.workspace,mode:options.mode,title:options.title,examName:options.examName,method:options.method,note:options.note};
  const blob=format==='docx'?await SR63.topRanksWordBlob(pages,meta):format==='pdf'?await SR63.topRanksPdfBlob(pages,meta):null;
  if(!blob)throw Error('صيغة الملف غير مدعومة.');
  SR63.downloadReportFile(blob,SR63.topRanksExportName(options.scope,options.mode,format));
  return {pages:pages.length,bytes:blob.size};
 };
})();