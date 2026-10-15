/* Report print isolation — full stylesheet MUST be present before print(). */
SR63.reportStyleTextPromise=null;
SR63.getReportStyleText=function(){
  if(!SR63.reportStyleTextPromise){
    const styleUrl=new URL('./style.css',document.baseURI);styleUrl.searchParams.set('v',SR63.version||'6.10.54');
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
    .sr650-sheet{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;width:${width}!important;
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
// A4-safe fitting shared by isolated printing and PDF/ZIP. Use actual CSS-pixel
// paper dimensions. Never widen a logical page then shrink all of its text.
SR63.planReportSheet=function(page,targetWidth,targetHeight){
 if(!page||!page.style||!(targetWidth>0&&targetHeight>0))throw Error('صفحة التقرير أو مقاس الورق غير صالح للطباعة.');
 const style=page.style,baseline=targetWidth;
 for(const [name,value] of [['zoom','1'],['height','auto'],['min-height','0'],['max-height','none'],['overflow','visible'],['box-sizing','border-box'],['margin','0'],['padding','0'],['border-radius','0'],['box-shadow','none'],['transform','none']])style.setProperty(name,value,'important');
 for(const key of ['width','min-width','max-width'])style.setProperty(key,baseline+'px','important');
 // One official emblem footprint for printing and offline PDF rendering.
 for(const img of page.querySelectorAll?.('.report-head img,.report-logo-image')||[]){
  if(!img.style)continue;
  img.style.setProperty('object-fit','contain','important');
  img.style.setProperty('max-width','49mm','important');
  img.style.setProperty('max-height',img.classList?.contains('report-ministry-emblem-official')?'11mm':'19mm','important');
 }
 function measure(){
  const rect=page.getBoundingClientRect();
  let left=rect.left,right=rect.right,top=rect.top,bottom=rect.bottom;
  const nodes=page.querySelectorAll?.('table,thead,tbody,tr,td,th,img,svg,.report-context,.report-meta-grid,.report-footer,.report-head')||[];
  for(const node of nodes){if(!node?.getBoundingClientRect)continue;const q=node.getBoundingClientRect();if(!q.width||!q.height)continue;left=Math.min(left,q.left);right=Math.max(right,q.right);top=Math.min(top,q.top);bottom=Math.max(bottom,q.bottom);}
  return {left,top,width:Math.max(1,page.scrollWidth||0,right-left),height:Math.max(1,page.scrollHeight||0,bottom-top)};
 }
 const allTable=page.querySelector?.('.report-table');
 if(allTable?.style?.setProperty)allTable.style.setProperty('width','calc(100% - 4mm)','important');
 const pageNumber=page.querySelector?.('.report-page-number');
 if(pageNumber?.style?.setProperty)pageNumber.style.setProperty('position','static','important');
 const table=page.querySelector?.('.report-table:not(.grade-subject-matrix-all):not(.department-subject-matrix-official)');
 const rowNodes=[...(table?.querySelectorAll?.('tbody tr')||[])].filter(Boolean),rows=rowNodes.length;
 const view=page.ownerDocument?.defaultView;
 const readStyle=view?.getComputedStyle?.bind(view)||(typeof getComputedStyle==='function'?getComputedStyle:null);
 // Grow readable font sizes before filling any remaining vertical space.
 const fontSelector='.report-title,.report-head b,.report-head strong,.report-context,.report-context b,.report-meta-grid,.report-meta-grid b,.report-kpis,.report-kpis b,.report-section-title,.report-table,.report-table th,.report-table td,.report-table td b,.report-table td small,.report-table td span,.report-footer,.report-footer b,.report-signatures b';
 const fonts=readStyle?[...(page.querySelectorAll?.(fontSelector)||[])].filter(node=>node?.style).map(node=>[node,parseFloat(readStyle(node).fontSize)]).filter(([,size])=>size>0&&Number.isFinite(size)):[];
 const fontScale=factor=>{for(const [node,size] of fonts)node.style.setProperty('font-size',(size*factor).toFixed(2)+'px','important');};
 let box=measure(),growth=1;
 if(fonts.length&&box.width<targetWidth*1.02&&box.height<targetHeight*.94){
  let low=1,high=rows<=12?1.36:rows<=30?1.25:1.14;
  for(let k=0;k<7;k++){
   const mid=(low+high)/2;fontScale(mid);const trial=measure();
   if(trial.width<=targetWidth-3&&trial.height<=targetHeight*.91){low=mid;box=trial;}else high=mid;
  }
  growth=low;fontScale(growth);box=measure();
 }
 // Make the student rows use the available paper height, rather than leaving it white.
 if(table&&rows>=2){
  const spare=targetHeight-box.height;
  if(spare>20){
   // Few-student classes need more of the physical sheet; never widen text to fake the fill.
   const perRow=rows<=12?90:rows<=20?36:rows<=40?20:11;
   const extra=Math.max(0,Math.min(spare*.90-8,rows*perRow));
   if(extra>8){
    const before=table.getBoundingClientRect().height;
    table.style.setProperty('height',(before+extra)+'px','important');
    const after=table.getBoundingClientRect().height;
    // Chromium variants that ignore explicit table height get per-row allocation.
    if(after<before+extra*.60){
     table.style.removeProperty?.('height');
     for(const tr of rowNodes){if(!tr.style?.setProperty)continue;const h=tr.getBoundingClientRect().height;tr.style.setProperty('height',(h+extra/rows)+'px','important');}
    }
    box=measure();
   }
  }
 }
 // If the full original rows cannot fit on one A4 page at a legible size,
 // STOP instead of cropping them or silently generating a second sheet.
 const scale=Math.min(1,(targetWidth-3)/box.width,(targetHeight-3)/box.height);
 const fill=box.width*scale/targetWidth,verticalFill=box.height*scale/targetHeight;
 if(!Number.isFinite(scale)||scale<.79||fill<.79||verticalFill>1.001)throw Error('بيانات التقرير تتجاوز حدود صفحة A4 واحدة بحجم مقروء. اختر نطاقًا أصغر أو قسّم التقرير إلى صفحات مستقلة دون حذف صفوف الطلاب.');
 return {...box,scale,fill,verticalFill,growth,rows,singleSheet:true};
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
SR63.printReportBatch=async function(selector,title='تقرير المدرسة',landscape=false,preparedWindow=null){
  // The same print engine supports live preview nodes and already-rendered HTML
  // for the entire selected report scope (including pages beyond preview batch 8).
  const pages=Array.isArray(selector)?selector:[...document.querySelectorAll(selector)];
  if(!pages.length)throw new Error('جهّز المعاينة أولًا.');
  // Open synchronously while the click's user activation is available.
  const win=preparedWindow||window.open('','_blank');if(!win)throw new Error('فعّل السماح بالنوافذ المنبثقة للطباعة.');
  win.document.open();win.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تجهيز الطباعة…</title></head><body><p dir="rtl">جارٍ تجهيز التقرير والتأكد من تحميل الخطوط والصور قبل الطباعة…</p></body></html>');win.document.close();
  try{
    const css=await SR63.getReportStyleText();
    if(win.closed)return 0;
    const safe=String(title).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    // Copy the already-rendered original pages; never recalculate their data.
    const html=pages.map(p=>'<div class="sr650-sheet">'+(typeof p==='string'?p:p.outerHTML)+'</div>').join('');
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
