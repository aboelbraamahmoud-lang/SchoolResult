/* Report print isolation — full stylesheet MUST be present before print(). */
SR63.reportStyleTextPromise=null;
SR63.getReportStyleText=function(){
  if(!SR63.reportStyleTextPromise){
    const styleUrl=new URL('./style.css',document.baseURI);styleUrl.searchParams.set('v',SR63.version||'6.10.46');
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
    .sr646-print-document{direction:rtl;width:100%;margin:0 auto}
    .school-report-page{display:block!important;box-sizing:border-box!important;width:${width}!important;max-width:${width}!important;
      min-height:0!important;height:auto!important;max-height:none!important;overflow:visible!important;
      padding:0!important;margin:0 auto!important;border-radius:0!important;box-shadow:none!important;
      page-break-inside:avoid!important;break-inside:avoid!important;break-after:page!important;page-break-after:always!important}
    .school-report-page:last-child{break-after:auto!important;page-break-after:auto!important}
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
    const html=pages.map(p=>p.outerHTML).join('');
    const doc='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+safe+'</title><base href="'+document.baseURI.replace(/"/g,'%22')+'"><style>'+css.replace(/<\/style/gi,'<\\/style')+'</style><style>'+SR63.reportPrintOverride(landscape)+'</style></head><body><main class="sr646-print-document" dir="rtl"><div id="printable-reports">'+html+'</div></main></body></html>';
    win.document.open();win.document.write(doc);win.document.close();
    const imageTasks=[...win.document.images].map(img=>img.complete?Promise.resolve():img.decode?.().catch(()=>{})||new Promise(ok=>{img.onload=ok;img.onerror=ok;}));
    await Promise.race([Promise.all([win.document.fonts?.ready||Promise.resolve(),...imageTasks]),new Promise(ok=>setTimeout(ok,15000))]);
    if(win.closed)return 0;
    // If any page cannot be styled correctly, do not send broken, unformatted sheets to the printer.
    const logo=win.document.querySelector('.report-logo-image');
    if(logo && logo.getBoundingClientRect().width>230)throw Error('لم يكتمل تنسيق شعار التقرير؛ تم إيقاف الطباعة لتجنب الصفحات غير المنسقة.');
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
