/* SchoolResult 6.10.40 — self-contained, print-safe school staff reports.
   All input data comes from the server-scoped staff workspace. Never clone the application DOM;
   app-wide @media print rules previously hid entire standalone print windows. */
(function(){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safeColor=c=>/^#[0-9a-f]{6}$/i.test(String(c))?c:'#1d6977';
 const pct=n=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(1)+'%':'—';
 const int=n=>Number.isFinite(Number(n))?String(n):'—';
 const delta=n=>typeof n==='number'&&Number.isFinite(n)?(n>0?'+':'')+n.toFixed(1)+' نقطة':'—';
 const group=(items,size)=>{const all=[];for(let i=0;i<items.length;i+=size)all.push(items.slice(i,i+size));return all;};
 const table=(columns,rows)=>`<table class="sr640-table" dir="rtl"><thead><tr>${columns.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map((cells,i)=>`<tr>${cells.map((x,j)=>`<${j===0?'th scope="row"':'td'}>${esc(x)}</${j===0?'th':'td'}>`).join('')}</tr>`).join('')}</tbody></table>`;
 const barChart=(title,items,opts={})=>{
  // Keep all Arabic and numeric labels in HTML (correct RTL shaping in browsers/PDF).
  // SVG carries only vector bars: it prints in color even with Background graphics unchecked.
  const entries=items.slice(0,Math.max(1,opts.limit||25));
  const val=n=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(100,n)):0;
  const color=safeColor(opts.color||'#138578');
  const rows=entries.length?entries.map(x=>{
   const a=val(x.value),b=val(x.second),c=safeColor(x.color||color),c2=safeColor(opts.secondColor||'#c19036');
   const firstLabel=x.label??pct(x.value),secondLabel=pct(x.second);
   const bars=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 ${opts.two?54:28}" preserveAspectRatio="none" role="img" aria-label="${esc(firstLabel)}${opts.two?'، '+esc(secondLabel):''}"><rect x="0" y="1" rx="6" width="700" height="22" fill="#e9f0f2"/><rect x="0" y="1" rx="6" width="${(700*a/100).toFixed(1)}" height="22" fill="${c}"/>${opts.two?`<rect x="0" y="30" rx="6" width="700" height="22" fill="#edf1f2"/><rect x="0" y="30" rx="6" width="${(700*b/100).toFixed(1)}" height="22" fill="${c2}"/>`:''}</svg>`;
   return `<div class="sr640-chart-row" dir="rtl"><strong class="sr640-chart-label">${esc(String(x.name||'').slice(0,90))}</strong><div class="sr640-chart-vectors">${bars}</div><span class="sr640-chart-values">${esc(firstLabel)}${opts.two?'<small>'+esc(secondLabel)+'</small>':''}</span></div>`;
  }).join(''):'<p>لا توجد نتائج للرسم البياني.</p>';
  const legend=opts.two?`<p class="sr640-legend"><span style="color:${color}">● ${esc(opts.firstLabel||'الشريط الأول: نسبة التحصيل')}</span> <span style="color:${safeColor(opts.secondColor||'#c19036')}">● ${esc(opts.secondLabel||'الشريط الثاني: نسبة النجاح')}</span></p>`:'';
  return `<section class="sr640-chart" dir="rtl"><h3>${esc(title)}</h3>${legend}<div class="sr640-chart-rows">${rows}</div></section>`;
 };
 const levelChart=(bands)=>{
  const n=bands.reduce((a,b)=>a+b.students.length,0),items=bands.map(b=>({name:b.label,value:n?b.students.length/n*100:0,label:`${b.students.length} طالب · ${n?(100*b.students.length/n).toFixed(1):'0.0'}%`,color:safeColor(b.color)}));
  return barChart('توزيع أعداد الطلاب على مستويات الأداء',items,{limit:15});
 };
 const stats=items=>`<div class="sr640-stats">${items.map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div>`;
 const detail=html=>`<section class="sr640-section">${html}</section>`;
 const formatClass=r=>String(r?.className||'غير محدد');
 const reports={
  levels({groups,examName,className,subject}){
   const total=groups.reduce((a,g)=>a+g.students.length,0);
   return {title:'تقرير مستويات الطلاب بالألوان',subtitle:`التقييم: ${examName} · الشعبة: ${className} · المادة: ${subject}`,
    body:stats([['إجمالي الطلاب',total],['مستويات الأداء',groups.filter(g=>g.students.length).length],['غير مرصود',groups.find(g=>g.id==='not_assessed')?.students.length||0]])+levelChart(groups)+
    groups.map(g=>detail(`<h3 style="border-right:6px solid ${safeColor(g.color)}">${esc(g.label)} — ${g.students.length} طالب</h3>`+(g.students.length?table(['اسم الطالب','الشعبة','النسبة','عدد المواد المرصودة'],g.students.map(s=>[s.name,s.className,pct(s.percentage),s.evaluated])):'<p>لا يوجد طلاب بهذا المستوى.</p>'))).join('')+
    '<p class="sr640-note">لا تُحوَّل حالات الغياب وعدم الرصد إلى درجة صفر. عدد الطلاب في كل مستوى بحسب المواد المرصودة المحددة.</p>'};
  },
  failed({failed,examName,scopeLabel}){
   const s=new Map();for(const x of failed){const k=String(x.subject||'غير محدد');s.set(k,(s.get(k)||0)+1);}
   const bySubject=[...s].sort((a,b)=>b[1]-a[1]),max=Math.max(1,...bySubject.map(x=>x[1]));
   return {title:'تقرير الطلاب المتعثرين',subtitle:`${scopeLabel} · ${examName}`,
    body:stats([['عدد نتائج التعثر',failed.length],['طلاب مختلفون',new Set(failed.map(x=>x.studentId||x.name+'|'+x.className)).size],['المواد',s.size]])+
    barChart('توزيع حالات التعثر حسب المادة',bySubject.map(([name,count])=>({name,value:100*count/max,label:count+' نتيجة',color:'#df784e'})))+
    detail(table(['اسم الطالب','الشعبة','المادة','المعلم','الدرجة','النسبة'],failed.map(x=>[x.name,x.className,x.subject,x.teacher||'—',`${x.score}/${x.total}`,pct(x.percentage)])))+
    '<p class="sr640-note">تشمل الحالات درجات مرصودة تقل عن حد النجاح؛ الغياب وعدم الرصد غير محسوبين كرسوب. يراعى التمييز بين النتائج والطلاب الفريدين.</p>'};
  },
  teachers({teachers,examName,scopeLabel}){
   const rows=[...teachers].sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar'));
   return {title:'التقرير الشامل لأداء المعلمين',subtitle:`${scopeLabel} · ${examName}`,
    body:stats([['عدد المعلمين',rows.length],['النتائج المرصودة',rows.reduce((a,x)=>a+x.results,0)],['متوسط التحصيل حسب النتائج',(rows.reduce((a,x)=>a+(x.achievement||0)*x.results,0)/(rows.reduce((a,x)=>a+x.results,0)||1)).toFixed(1)+'%']])+
    group(rows,7).map((batch,i)=>barChart(`مؤشرات أداء المعلمين ${rows.length>7?'— مجموعة '+(i+1):''}`,batch.map(x=>({name:x.name,value:x.achievement,second:x.successRate})),{two:true,color:'#0c887e',secondColor:'#c79236',firstLabel:'الشريط الأول: التحصيل الأكاديمي',secondLabel:'الشريط الثاني: نسبة نجاح النتائج'})).join('')+
    detail(table(['المعلم','النتائج المرصودة','نسبة النجاح','نسبة التحصيل'],rows.map(x=>[x.name,x.results,pct(x.successRate),pct(x.achievement)])))+
    '<p class="sr640-note">المؤشرات تصف نتائج الطلاب المرصودة ولا تمثل تقييمًا فرديًا كاملًا للمعلم؛ تُراجع في ضوء اختلاف المواد وحجم العينات.</p>'};
  },
  comparison({rows,benchmarks,fromName,toName,scopeLabel}){
   const valid=rows.filter(x=>x.previous!==null&&x.current!==null);
   return {title:'تقرير المقارنة بين الاختبارين',subtitle:`${scopeLabel} · السابق: ${fromName} · الحالي: ${toName}`,
    body:stats([['عدد الشعب',rows.length],['شعب بمقارنة صالحة',valid.length],['شعب تحسنت',valid.filter(x=>x.change>0).length]])+
    group(rows,7).map((batch,i)=>barChart(`مقارنة التحصيل ${rows.length>7?'— مجموعة '+(i+1):''}`,batch.map(x=>({name:x.className,value:x.previous,second:x.current})),{two:true,color:'#0c887e',secondColor:'#c79236',firstLabel:'الاختبار الأقدم: '+fromName,secondLabel:'الاختبار الأحدث: '+toName})).join('')+
    detail(table(['الشعبة','السابق','الحالي','الفارق بالنقاط المئوية','نتائج سابقة / حالية'],rows.map(x=>[x.className,pct(x.previous),pct(x.current),delta(x.change),x.previousCount+' / '+x.currentCount])))+
    (benchmarks?.length?detail('<h3>مؤشرات الأقسام في الاختبار الحالي — إجماليات فقط</h3>'+table(['القسم','النتائج','النجاح','التحصيل'],benchmarks.map(x=>[x.department,x.evaluated,pct(x.success),pct(x.achievement)]))):'')+
    '<p class="sr640-note">الفرق هو فرق تحصيل الشعبة بين الاختبارين وليس قيمة مضافة لأفراد مطابقين. أعداد النتائج السابقة والحالية قد تختلف.</p>'};
  }
 };
 const css=`.report-footer{margin-top:16px;border-top:1px solid #c9d6dc;padding-top:8px;font-size:9pt;break-inside:avoid}.report-signatures{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.report-signatures b,.report-signatures span{display:block}.report-stamp-image{max-width:90px;max-height:60px}.report-attribution{font-size:8pt} @page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#19384a;font-family:Arial,Tahoma,sans-serif;direction:rtl;font-size:11pt}main{max-width:275mm;margin:0 auto}header.sr640-header{display:flex;justify-content:space-between;align-items:center;gap:14px;border-bottom:3px solid #71304a;padding:8px 0 13px;margin-bottom:14px}header.sr640-header img{width:140px;height:60px;object-fit:contain}h1{color:#71304a;font-size:19pt;margin:7px 0}h2{font-size:14pt;margin:8px 0;color:#24516b}h3{font-size:12pt;margin:12px 0 9px;color:#24516b}.sr640-subtitle{color:#456778;font-size:10pt}.sr640-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0 18px}.sr640-stats>div{border:1px solid #bacfd5;border-top:3px solid #16887c;border-radius:8px;padding:11px;background:#f0f8f8}.sr640-stats span,.sr640-stats strong{display:block}.sr640-stats strong{font-size:16pt;margin-top:4px}.sr640-section{margin:14px 0;break-inside:auto}.sr640-section h3{padding-right:12px}.sr640-chart{padding:10px;border:1px solid #d5e3e6;border-radius:10px;margin:12px 0;break-inside:avoid;page-break-inside:avoid}.sr640-chart svg{width:100%;max-height:205mm;display:block}.sr640-legend{font-size:9pt;color:#476473}.sr640-table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:9pt;direction:rtl}.sr640-table th,.sr640-table td{border:1px solid #becfd6;padding:8px 7px;text-align:right;overflow-wrap:anywhere;line-height:1.4}.sr640-table thead th{background:#d9e9ee;color:#173f51;font-weight:900}.sr640-table tbody tr:nth-child(odd){background:#f5fafb}.sr640-table tbody th{color:#175e6c}.sr640-table thead{display:table-header-group}.sr640-table tr{break-inside:avoid;page-break-inside:avoid}.sr640-note{font-size:9pt;line-height:1.7;color:#526775;padding-top:9px;border-top:1px solid #d7e3e7}.sr640-foot{margin-top:16px;font-size:9pt;color:#4b6174;border-top:1px solid #c9d6dc;padding-top:10px}.sr640-chart-rows{display:grid;gap:11px}.sr640-chart-row{display:grid;grid-template-columns:minmax(110px,205px) minmax(230px,1fr) minmax(72px,118px);align-items:center;gap:12px;min-height:35px;break-inside:avoid}.sr640-chart-label{font-size:10pt;color:#173a50;overflow-wrap:anywhere}.sr640-chart-vectors svg{width:100%;max-height:48px;display:block}.sr640-chart-values{font-size:9pt;color:#143a50;font-weight:900;text-align:left;white-space:nowrap;direction:rtl}.sr640-chart-values small{display:block;font-size:9pt;margin-top:6px}.sr640-legend{display:flex;flex-wrap:wrap;gap:14px;line-height:1.8}.sr640-legend span:first-child{color:#138578}.sr640-legend span:nth-child(2){color:#ae8230}svg{overflow:visible}svg rect,svg text,svg circle{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}@media print{.sr640-chart,.sr640-stats>div,.sr640-table th,.sr640-table td{-webkit-print-color-adjust:exact;print-color-adjust:exact}main{width:auto!important;max-width:none!important}header.sr640-header{break-inside:avoid} .sr640-chart{box-shadow:none}}`;
 SR63.staffReportEsc=esc;SR63.staffReportBarChart=barChart;SR63.staffReportLevelChart=levelChart;
 SR63.staffReportBuild=function(type,args){if(!reports[type])throw Error('نوع التقرير غير معروف.');return reports[type](args);};
 SR63.staffReportDocument=function(report,meta={}){
  const logo=new URL('./moehe.png',document.baseURI).href;
  if(report.official===true){
   // The print/PDF route uses the approved Word report's order, metrics,
   // labels, narrative and signatories, rather than a separate chart report.
   return '<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>'+esc(report.title)+'</title><style>'+report.css+'</style></head><body>'+report.body.replaceAll('__OFFICIAL_LOGO__',esc(logo))+'</body></html>';
  }
  return '<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+esc(report.title)+'</title><style>'+css+'</style></head><body><main><header class="sr640-header"><div><small>وزارة التربية والتعليم والتعليم العالي</small><h1>'+esc(meta.schoolName||'المدرسة')+'</h1><h2>'+esc(report.title)+'</h2><div class="sr640-subtitle">'+esc(report.subtitle||'')+' · العام الأكاديمي: '+esc(meta.academicYear||'—')+'</div></div><img alt="شعار وزارة التربية والتعليم والتعليم العالي" src="'+esc(logo)+'"></header>'+report.body+(meta.workspace?SR63.reportFooterHTML(meta.workspace,meta.subject||''):'<footer class="sr640-foot">'+esc(meta.schoolName||'')+' · تقرير للعرض والطباعة · المدير: '+esc(meta.principalName||'—')+'</footer>')+'</main></body></html>';
 };
 SR63.staffPrintHtml=function(report,meta={}){
  // Open in the click handler before performing any awaited operations.
  const win=window.open('','_blank');
  if(!win)throw Error('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير.');
  win.document.open();win.document.write(SR63.staffReportDocument(report,meta));win.document.close();
  let started=false;const print=()=>{if(started||win.closed)return;started=true;win.focus();win.print();};
  const ready=()=>Promise.race([win.document.fonts?.ready||Promise.resolve(),new Promise(done=>setTimeout(done,1200))]).then(()=>{if(win.closed)return;const image=win.document.querySelector('header img');if(image&&!image.complete){image.addEventListener('load',print,{once:true});image.addEventListener('error',print,{once:true});setTimeout(print,1200);}else print();}).catch(error=>{if(!win.closed)console.error('Staff report printing:',error);});
  if(win.document.readyState==='complete')void ready();else win.addEventListener('load',()=>void ready(),{once:true});
 };
 SR63.staffReportPrint=function(type,args,meta={}){return SR63.staffPrintHtml(SR63.staffReportBuild(type,args),meta);};
})();
