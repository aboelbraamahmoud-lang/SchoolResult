/* Report print isolation — full stylesheet MUST be present before print(). */
SR63.reportStyleTextPromise=null;
SR63.getReportStyleText=function(){
  if(!SR63.reportStyleTextPromise){
    const styleUrl=new URL('./style.css',document.baseURI);styleUrl.searchParams.set('v',SR63.version||'6.10.61');
    SR63.reportStyleTextPromise=fetch(styleUrl.href,{cache:'force-cache'})
      .then(response=>{if(!response.ok)throw Error('تعذر تحميل تنسيق التقرير للطباعة.');return response.text();})
      .then(css=>{if(css.length<25000)throw Error('ملف تنسيق التقارير غير مكتمل.');return css;})
      .catch(error=>{SR63.reportStyleTextPromise=null;throw error;});
  }
  return SR63.reportStyleTextPromise;
};
// v6.10.56: isolate screen CSS to preserve official logo and title positions.
SR63.reportScreenCSS=function reportScreenCSS(css){
 let output='',cursor=0;
 const pattern=/@media\s+print\b[^{}]*\{/gi;
 let match;
 while((match=pattern.exec(css))){
  output+=css.slice(cursor,match.index);
  let pos=pattern.lastIndex,depth=1,quote=null,comment=false;
  for(;pos<css.length&&depth;pos++){
   const c=css[pos],next=css[pos+1];
   if(comment){if(c==='*'&&next==='/'){comment=false;pos++;}continue;}
   if(quote){if(c==='\\'){pos++;continue;}if(c===quote)quote=null;continue;}
   if(c==='/'&&next==='*'){comment=true;pos++;continue;}
   if(c==='"'||c==="'"){quote=c;continue;}
   if(c==='{')depth++;else if(c==='}')depth--;
  }
  if(depth)throw Error('تنسيق CSS للطباعة غير مكتمل؛ أُوقفت الطباعة لمنع الإخراج المشوه.');
  cursor=pos;pattern.lastIndex=pos;
 }
 return output+css.slice(cursor);
};
// Render one physical A4 sheet from the exact original screen report page.
SR63.reportPrintOverride=function reportPrintOverride(landscape=false){
 const w=landscape?'297mm':'210mm',h=landscape?'210mm':'297mm';
 return `@page{size:A4 ${landscape?'landscape':'portrait'};margin:0}
  html,body{margin:0!important;padding:0!important;background:#fff!important;direction:rtl!important}
  body{width:${w}!important;min-width:${w}!important}
  .sr646-print-document,.sr646-print-document *{visibility:visible!important}
  .sr646-print-document,#printable-reports{display:block!important;width:${w}!important;margin:0!important;padding:0!important}
  .sr650-sheet{position:relative!important;box-sizing:border-box!important;display:block!important;
    width:${w}!important;height:${h}!important;min-height:${h}!important;max-height:${h}!important;
    margin:0!important;padding:0!important;overflow:hidden!important;
    break-inside:avoid!important;page-break-inside:avoid!important;
    break-after:page!important;page-break-after:always!important}
  .sr650-sheet:last-child{break-after:auto!important;page-break-after:auto!important}
  .sr646-print-document .sr650-sheet>.school-report-page{
    box-sizing:border-box!important;display:flex!important;flex-direction:column!important;
    width:${w}!important;min-width:${w}!important;max-width:${w}!important;
    height:${h}!important;min-height:${h}!important;max-height:${h}!important;
    padding:9mm 9mm 8mm!important;margin:0!important;
    overflow:hidden!important;border-radius:0!important;box-shadow:none!important;
    transform:none!important;break-inside:avoid!important;page-break-inside:avoid!important;
    break-after:auto!important;page-break-after:auto!important}
   /* Preserve the original student-statement padding and signature/identity geometry. */
   .sr646-print-document .sr650-sheet>.student-result-page{
     padding:12mm 12mm 10mm!important;direction:rtl!important;
     font-family:Arial,Helvetica,sans-serif!important;border-radius:0!important}
   .sr646-print-document .student-result-table{width:100%!important;table-layout:fixed!important}
   .sr646-print-document .student-result-footer{margin-top:auto!important}
  @media print{
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    .report-screen-only,.sr-cloud-account{display:none!important}
    /* Preserve the same visible page outline in preview and print. */}
 `;
};
SR63.planReportSheet=function planReportSheet(page,targetWidth,targetHeight){
 if(!page||!page.style||!(targetWidth>0&&targetHeight>0))throw Error('صفحة التقرير أو مقاس الورق غير صالح للطباعة.');
 const style=page.style;
 for(const [name,value] of [
   ['zoom','1'],['transform','none'],['box-sizing','border-box'],
   ['display','flex'],['flex-direction','column'],['width',targetWidth+'px'],
   ['min-width',targetWidth+'px'],['max-width',targetWidth+'px'],
   ['height',targetHeight+'px'],['min-height',targetHeight+'px'],['max-height',targetHeight+'px'],
   ['overflow','visible'],['margin','0']
 ])style.setProperty(name,value,'important');
 const table=page.querySelector?.('.report-table:not(.grade-subject-matrix-all):not(.department-subject-matrix-official),.student-result-table,.srskill-table');
 const rows=[...(table?.querySelectorAll?.('tbody tr')||[])].filter(Boolean);
 const measure=()=>{
   const r=page.getBoundingClientRect();let width=Math.max(page.scrollWidth||0,r.width),height=Math.max(page.scrollHeight||0,r.height);
   for(const node of page.querySelectorAll?.('table,thead,tbody,tr,td,th,img,svg,.report-head,.report-context,.report-meta-grid,.report-footer,.report-page-number,.student-result-header,.student-result-identity,.student-result-summary,.student-result-method-note,.student-result-footer,.srskill-header,.srskill-footer,.srskill-page-number')||[]){
     const q=node?.getBoundingClientRect?.();if(!q||!q.width||!q.height)continue;
     width=Math.max(width,q.right-r.left);height=Math.max(height,q.bottom-r.top);
   }
   return {left:r.left,top:r.top,width,height};
 };
 let box=measure();
 // Preserve preview row heights, typography, spacing and footer position.
 // Reject overflow instead of silently changing only the printed copy.
 if(box.width>targetWidth+2||box.height>targetHeight+2)throw Error('بيانات التقرير تتجاوز حدود صفحة A4 واحدة بحجم مقروء. اختر نطاقًا أصغر أو قسّم التقرير إلى صفحات مستقلة دون حذف صفوف الطلاب.');
 return {...box,scale:1,zoom:1,fill:Math.min(1,box.width/targetWidth),
   verticalFill:Math.min(1,box.height/targetHeight),rows:rows.length,singleSheet:true};
};
SR63.fitReportPagesForPrint=function fitReportPagesForPrint(doc,landscape=false){
 const factor=96/25.4,width=(landscape?297:210)*factor,height=(landscape?210:297)*factor,results=[];
 for(const page of doc.querySelectorAll('.school-report-page')){
  const plan=SR63.planReportSheet(page,width,height);
  page.style.setProperty('break-inside','avoid','important');
  page.style.setProperty('page-break-inside','avoid','important');
  results.push(plan);
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
    const css=SR63.reportScreenCSS(await SR63.getReportStyleText());
    if(win.closed)return 0;
    const safe=String(title).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    // Copy the already-rendered original pages; never recalculate their data.
    const holder=document.createElement('div');
    holder.innerHTML=pages.map(p=>'<div class="sr650-sheet">'+(typeof p==='string'?p:p.outerHTML)+'</div>').join('');
    // A rewritten popup can leave relative image requests pending. Embed the
    // original image bytes before writing the print document, as PDF export does.
    const embeddedImages=new Map();
    for(const img of holder.querySelectorAll('img')){
     const source=img.getAttribute('src')||'';
     if(!source||source.startsWith('data:'))continue;
     if(embeddedImages.has(source))img.setAttribute('src',embeddedImages.get(source));
     else{await SR63.reportEmbedImage(img);embeddedImages.set(source,img.getAttribute('src'));}
    }
    const html=holder.innerHTML;
    const doc='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+safe+'</title><base href="'+document.baseURI.replace(/"/g,'%22')+'"><style>'+css.replace(/<\/style/gi,'<\\/style')+'</style><style>'+SR63.reportPrintOverride(landscape)+'</style></head><body><main class="sr646-print-document" dir="rtl"><div id="printable-reports">'+html+'</div></main></body></html>';
    win.document.open();win.document.write(doc);win.document.close();
    const imageTasks=[...win.document.images].map(img=>img.complete?Promise.resolve():img.decode?.().catch(()=>{})||new Promise(ok=>{img.onload=ok;img.onerror=ok;}));
    await Promise.race([Promise.all([win.document.fonts?.ready||Promise.resolve(),...imageTasks]),new Promise(ok=>setTimeout(ok,15000))]);
    if(win.closed)return 0;
    if([...win.document.images].some(img=>!img.complete||!img.naturalWidth))throw Error('لم يكتمل تحميل صور التقرير؛ أُوقفت الطباعة حتى لا تختفي الترويسة أو التوقيعات.');
    // If any page cannot be styled correctly, do not send broken, unformatted sheets to the printer.
    const logo=win.document.querySelector('.report-logo-image,.student-result-header img');
    if(logo && logo.getBoundingClientRect().width>230)throw Error('لم يكتمل تنسيق شعار التقرير؛ تم إيقاف الطباعة لتجنب الصفحات غير المنسقة.');
    const fit=SR63.fitReportPagesForPrint(win.document,landscape);
    if(fit.some(page=>page.zoom<.35))throw Error('عرض التقرير يتجاوز مساحة A4 بشكل كبير؛ اختر صفًا أو معلمًا أو عددًا أقل من الأعمدة.');
    win.focus();win.print();
    return pages.length;
  }catch(error){
    if(win.closed)return 0;
     try{win.document.body.innerHTML='<div dir="rtl" style="font:16px Tahoma;padding:24px;color:#ad2639">تعذر تجهيز التقرير بتنسيقه الصحيح. أغلق هذه النافذة وأعد المحاولة.</div>';}catch{}
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
