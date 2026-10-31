// Preserve the existing report DOM/export paths, but only build them on request.
module.exports=function(code){
 const replace=(from,to)=>{if(code.split(from).length!==2)throw Error('Custom report performance anchor changed: '+from);code=code.replace(from,to);};
 replace('[i,a]=(0,v.useState)(`studentName`),o=U9(e,n.mode),',
  '[i,a]=(0,v.useState)(`studentName`),[preview,setPreview]=(0,v.useState)(null),prepared=preview?.workspace===e&&preview?.config===n,o=(0,v.useMemo)(()=>U9(e,n.mode),[e.settings,n.mode]),availableSubjects=(0,v.useMemo)(()=>Cj(e.rows,`subject`),[e.rows]),');
 replace('s=(0,v.useMemo)(()=>e.rows.filter','s=(0,v.useMemo)(()=>prepared?e.rows.filter');
 replace('r<=n.maxPercent}),[e,n.subject','r<=n.maxPercent}):[],[prepared,e,n.subject');
 replace('c=(0,v.useMemo)(()=>{let t=', 'c=(0,v.useMemo)(()=>{if(!prepared)return [];let t=');
 replace('},[s,n.mode,n.groupBy', '},[prepared,s,n.mode,n.groupBy');
 replace('f=Cj(e.rows.filter(e=>n.subject===`الكل`||e.subject===n.subject),n.entityDimension,n.exam)',
  'f=(0,v.useMemo)(()=>Cj(e.rows.filter(e=>n.subject===`الكل`||e.subject===n.subject),n.entityDimension,n.exam),[e.rows,n.subject,n.entityDimension,n.exam])');
 replace('...Cj(e.rows,`subject`).map','...availableSubjects.map');
 replace('title:`المخرجات`,desc:`${c.length.toLocaleString(`ar-EG`)} سجل في ${d.length.toLocaleString(`ar-EG`)} صفحة`,children:[',
  'title:`المخرجات`,desc:prepared?`${c.length.toLocaleString(`ar-EG`)} سجل في ${d.length.toLocaleString(`ar-EG`)} صفحة`:`حدد الإعدادات ثم اعرض التقرير.`,children:[(0,q.jsx)(dA,{className:`mb-3 w-full bg-teal-700`,onClick:()=>setPreview({workspace:e,config:n}),children:`عرض التقرير`}),');
 replace('children:`لا توجد بيانات تطابق الاختيارات الحالية`','children:prepared?`لا توجد بيانات تطابق الاختيارات الحالية`:`معاينة التقرير عند الطلب`');
 replace('children:SR63.customReportEmptyHint(e,n)','children:prepared?SR63.customReportEmptyHint(e,n):`اختر نطاق البيانات والأعمدة، ثم اضغط «عرض التقرير» من قسم المخرجات. بعد تعديل الإعدادات، اعرض التقرير مجددًا لتحديث الطباعة والتصدير.`');
 return code;
};
