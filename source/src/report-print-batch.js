/* Report print isolation — full stylesheet MUST be present before print(). */
SR63.reportStyleTextPromise=null;
SR63.getReportStyleText=function(){
  if(!SR63.reportStyleTextPromise){
    const styleUrl=new URL('./style.css',document.baseURI);styleUrl.searchParams.set('v',SR63.version||'6.10.50');
    SR63.reportStyleTextPromise=fetch(styleUrl.href,{cache:'force-cache'})
      .then(response=>{if(!response.ok)throw Error('تعذر تحميل تنسيق التقرير للطباعة.');return response.text();})
      .then(css=>{if(css.length<25000)throw Error('ملف تنسيق التقارير غير مكتمل.');return css;})
      .catch(error=>{SR63.reportStyleTextPromise=null;throw error;});
  }
  return SR63.reportStyleTextPromise;
};
SR63.reportPrintOverride=function(landscape=false){
  const width=landscape?'287mm':'200mm';
  return `@page{size:A4 ${landscape?'landscape':'portrait'};margin:5mm!important}
    html,body{margin:0!important;padding:0!important;background:white!important;color:#17364b!important;direction:rtl!important}
    body{font-family:Tahoma,Arial,sans-serif!important}
    .sr646-print-document,.sr646-print-document *{visibility:visible!important}
    .sr646-print-document{direction:rtl;width:100%;margin:0 auto}
    .sr650-sheet{position:relative!important;box-sizing:border-box!important;width:${width}!important;
      height:${landscape?'200mm':'287mm'}!important;margin:0!important;padding:0!important;
      overflow:hidden!important;break-inside:avoid!important;page-break-inside:avoid!important;
      break-after:page!important;page-break-after:always!important}
    .sr650-sheet:last-child{break-after:auto!important;page-break-after:auto!important}
    .sr650-sheet>.school-report-page{display:block!important;box-sizing:border-box!important;
      min-height:0!important;height:auto!important;max-height:none!important;overflow:visible!important;
      padding:0!important;margin:0!important;border-radius:0!important;box-shadow:none!important;
      transform:none!important;break-inside:avoid!important;page-break-inside:avoid!important;
      break-after:auto!important;page-break-after:auto!important}
    .school-report-page img,.report-head img,.report-logo-image{object-fit:contain!important;max-width:49mm!important;max-height:19mm!important}
    .report-head img.report-ministry-emblem-official{max-height:11mm!important}
    .report-table{break-inside:auto!important;width:calc(100% - 4mm)!important}
    .report-table thead{display:table-header-group!important}
    .report-table tr{break-inside:avoid!important}
    .report-head,.report-title,.report-context,.report-footer{break-inside:avoid!important}
    .report-page-number{position:static!important}
    @media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      body{width:auto!important}.school-report-page{box-shadow:none!important}
      .report-screen-only,.sr-cloud-account,header:not(.report-head){display:none!important}}
  `;
};
// Keep each original report on exactly one A4 sheet. Expand its logical
// columns first, then apply a UNIFORM scale so text is not stretched.
SR63.planReportSheet=function(page,targetWidth,targetHeight){
 if(!page||!page.style)throw Error('صفحة التقرير غير صالحة للطباعة.');
 const style=page.style,baseline=Math.max(1,targetWidth);
 for(const [name,value] of [['zoom','1'],['height','auto'],['min-height','0'],['max-height','none'],['overflow','visible'],['box-sizing','border-box']])style.setProperty(name,value,'important');
 function setWidth(width){for(const key of ['width','min-width','max-width'])style.setProperty(key,width+'px','important');}
 function measure(){
  const rect=page.getBoundingClientRect();
  let left=rect.left,right=rect.right,top=rect.top,bottom=rect.bottom;
  const nodes=page.querySelectorAll?.('table,thead,tbody,tr,td,th,img,svg,.report-context,.report-meta-grid,.report-footer,.report-head')||[];
  for(const node of nodes){const r=node.getBoundingClientRect();if(!r.width||!r.height)continue;left=Math.min(left,r.left);right=Math.max(right,r.right);top=Math.min(top,r.top);bottom=Math.max(bottom,r.bottom);}
  return {left,top,width:Math.max(1,page.scrollWidth||0,right-left),height:Math.max(1,page.scrollHeight||0,bottom-top)};
 }
 let width=baseline,box,scale=1;
 for(let attempt=0;attempt<6;attempt++){
  setWidth(width);box=measure();scale=Math.min(1,targetWidth/box.width,targetHeight/box.height);
  const next=Math.min(baseline*1.8,Math.max(baseline,targetWidth/scale));
  if(Math.abs(next-width)<2)break;
  width=next;
 }
 setWidth(width);box=measure();scale=Math.min(1,targetWidth/box.width,targetHeight/box.height);
 const table=page.querySelector?.('.report-table:not(.grade-subject-matrix-all):not(.department-subject-matrix-official)');
 const rows=table?.querySelectorAll('tbody tr')?.length||0,spare=targetHeight/scale-box.height;
 if(rows>=8&&spare>15){
  const extra=Math.min(spare*.95,rows*12);
  table.style.setProperty('height',(table.getBoundingClientRect().height+extra)+'px','important');
  box=measure();
 }
 scale=Math.min(1,targetWidth/box.width,targetHeight/box.height)*.995;
 const fill=box.width*scale/targetWidth;
 if(scale<.44||fill<.80)throw Error('بيانات التقرير أطول من صفحة A4 واحدة بالخط المقروء. قسّم التقرير إلى أجزاء بدل تصغيره أو قصه.');
 return {...box,scale,fill,singleSheet:true};
};
SR63.fitReportPagesForPrint=function(doc,landscape=false){
 const factor=96/25.4,width=(landscape?287:200)*factor,height=(landscape?200:287)*factor,results=[];
 for(const page of doc.querySelectorAll('.school-report-page')){
  const plan=SR63.planReportSheet(page,width,height);
  page.style.setProperty('zoom',String(plan.scale),'important');
  page.style.setProperty('break-inside','avoid','important');
  page.style.setProperty('page-break-inside','avoid','important');
  results.push({...plan,zoom:plan.scale});
 }
 return results;
};
SR63.printReportBatch=async function(selector,title='تقرير المدرسة',landscape=false){
  const pages=[...document.querySelectorAll(selector)];
  if(!pages.length)throw new Error('جهّز المعاينة أولًا.');
  // Open synchronously while the click's user activation is available.
  const win=window.open('','_blank');if(!win)throw new Error('فعّل السماح بالنوافذ المنبثقة للطباعة.');
  win.document.open();win.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تجهيز الطباعة…</title></head><body><p dir="rtl">جارٍ تجهيز التقرير والتأكد من تحميل الخطوط والصور قبل الطباعة…</p></body></html>');win.document.close();
  try{
    const css=await SR63.getReportStyleText();
    if(win.closed)return 0;
    const safe=String(title).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    // Copy the already-rendered original pages; never recalculate their data.
    const html=pages.map(p=>'<div class="sr650-sheet">'+p.outerHTML+'</div>').join('');
    const doc='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+safe+'</title><base href="'+document.baseURI.replace(/"/g,'%22')+'"><style>'+css.replace(/<\/style/gi,'<\\/style')+'</style><style>'+SR63.reportPrintOverride(landscape)+'</style></head><body><main class="sr646-print-document" dir="rtl"><div id="printable-reports">'+html+'</div></main></body></html>';
    win.document.open();win.document.write(doc);win.document.close();
    const imageTasks=[...win.document.images].map(img=>img.complete?Promise.resolve():img.decode?.().catch(()=>{})||new Promise(ok=>{img.onload=ok;img.onerror=ok;}));
    await Promise.race([Promise.all([win.document.fonts?.ready||Promise.resolve(),...imageTasks]),new Promise(ok=>setTimeout(ok,15000))]);
    if(win.closed)return 0;
    // If any page cannot be styled correctly, do not send broken, unformatted sheets to the printer.
    const logo=win.document.querySelector('.report-logo-image');
    if(logo && logo.getBoundingClientRect().width>230)throw Error('لم يكتمل تنسيق شعار التقرير؛ تم إيقاف الطباعة لتجنب الصفحات غير المنسقة.');
    const fit=SR63.fitReportPagesForPrint(win.document,landscape);
    if(fit.some(page=>page.zoom<.35))throw Error('عرض التقرير يتجاوز مساحة A4 بشكل كبير؛ اختر صفًا أو معلمًا أو عددًا أقل من الأعمدة.');
    win.focus();win.print();
    return pages.length;
  }catch(error){
    if(!win.closed){win.document.body.innerHTML='<div dir="rtl" style="font:16px Tahoma;padding:24px;color:#ad2639">تعذر تجهيز التقرير بتنسيقه الصحيح. أغلق هذه النافذة وأعد المحاولة.</div>';}
    throw error;
  }
};
SR63.printScopedStaffPanel=function(selector,title='تقرير المدرسة'){
 const node=document.querySelector(selector);if(!node)throw new Error('لم تُجهز معاينة التقرير.');
 const win=window.open('','_blank');if(!win)throw new Error('يجب السماح بالنوافذ المنبثقة حتى تظهر الطباعة.');
 // Keep its isolated stylesheet too, not the print modes intended for other views.
 void SR63.getReportStyleText().then(css=>{
  if(win.closed)return;
  win.document.open();win.document.write('<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>'+String(title).replace(/[<>"']/g,'')+'</title><style>'+css.replace(/<\/style/gi,'<\\/style')+'</style><style>@page{size:A4 landscape;margin:10mm}body{font-family:Tahoma,Arial,sans-serif;padding:12px;background:white}.srstaff-panel{border:0;box-shadow:none}.srstaff-band-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}button{display:none!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>'+node.outerHTML+'</body></html>');win.document.close();
  void (win.document.fonts?.ready||Promise.resolve()).then(()=>{if(!win.closed){win.focus();win.print();}});
 }).catch(()=>{if(!win.closed)win.document.body.textContent='تعذر تحميل تنسيق التقرير. لم تُنفذ الطباعة.';});
};
