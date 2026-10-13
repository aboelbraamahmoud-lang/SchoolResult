/* A print-only window avoids asking the browser to paginate the entire application DOM. */
SR63.printReportBatch=function(selector,title='تقرير المدرسة',landscape=false){
 const pages=[...document.querySelectorAll(selector)];
 if(!pages.length)throw new Error('جهّز المعاينة أولًا.');
 const win=window.open('','_blank');if(!win)throw new Error('فعّل السماح بالنوافذ المنبثقة للطباعة.');
 const escaped=String(title).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const css=new URL('./style.css',document.baseURI).href;
 const pageCss=`@page{size:A4 ${landscape?'landscape':'portrait'};margin:0}html,body{margin:0;padding:0;background:#fff}main{padding:0}#printable-reports{display:block!important}.school-report-page{box-shadow:none!important;margin:0 auto!important;break-after:page;page-break-after:always}.school-report-page:last-child{break-after:auto;page-break-after:auto}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}`;
 win.document.open();win.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>'+escaped+'</title><link rel="stylesheet" href="'+css+'"><style>'+pageCss+'</style></head><body><main><div id="printable-reports">'+pages.map(p=>p.outerHTML).join('')+'</div></main></body></html>');win.document.close();
 let fired=false;const print=()=>{if(fired||win.closed)return;fired=true;win.focus();win.print();};
 const awaitReady=()=>Promise.race([win.document.fonts?.ready||Promise.resolve(),new Promise(ok=>setTimeout(ok,1800))]).then(print);
 if(win.document.readyState==='complete')void awaitReady();else win.addEventListener('load',()=>void awaitReady(),{once:true});
 return pages.length;
};
SR63.printScopedStaffPanel=function(selector,title='تقرير المدرسة'){
 const node=document.querySelector(selector);if(!node)throw new Error('لم تُجهز معاينة التقرير.');
 const win=window.open('','_blank');if(!win)throw new Error('يجب السماح بالنوافذ المنبثقة حتى تظهر الطباعة.');
 const css=new URL('./style.css',document.baseURI).href;
 const safe=String(title).replace(/[&<>"']/g,'');
 win.document.open();win.document.write('<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>'+safe+'</title><link rel="stylesheet" href="'+css+'"><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,Tahoma,sans-serif;padding:12px;background:white}.srstaff-panel{border:0;box-shadow:none}.srstaff-band-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}button{display:none!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>'+node.outerHTML+'</body></html>');win.document.close();
 let printed=false;const print=()=>{if(!printed&&!win.closed){printed=true;win.focus();win.print();}};
 if(win.document.readyState==='complete')setTimeout(print,250);else win.addEventListener('load',()=>setTimeout(print,250),{once:true});
};
