/* PATCH Nde.Be.o */
o=async()=>{
  if(!oe.size)return;
  if(B==='present'&&e.rows.some(row=>oe.has(row.id)&&(row.scores[e.activeExam]===null||!Number.isFinite(row.scores[e.activeExam]))))return eb.error('لا يمكن تعيين حاضر لسجل بلا درجة؛ أدخل الدرجات أولًا.');
  if(!await Kj(e,'قبل تعديل حالة نتائج جماعي'))return eb.error('تعذر إنشاء نقطة استعادة؛ لم يتغير شيء.');
  ue(await qj());t(previous=>({...previous,rows:previous.rows.map(row=>oe.has(row.id)?{...row,scores:{...row.scores,[previous.activeExam]:B==='present'?row.scores[previous.activeExam]:null},statuses:{...row.statuses,[previous.activeExam]:B},importBatches:{...row.importBatches,[previous.activeExam]:null}}:row)}));se(new Set());eb.success('تم تطبيق الحالة وتوثيق التعديلات.');
}
/* PATCH Nde.Be.s */
s=async()=>{if(!oe.size)return;if(!await Kj(e,'قبل حذف سجلات نتائج'))return eb.error('تعذر إنشاء نقطة استعادة؛ لم يُحذف شيء.');ue(await qj());t(previous=>({...previous,rows:previous.rows.filter(row=>!oe.has(row.id))}));se(new Set());eb.success('تم حذف السجلات مع حفظ نقطة استعادة وسجل مراجعة.');}
/* PATCH Dde.y */
y=()=>SR63.exportCustom(n,c)
/* PATCH Dde.b */
b=()=>{const rows=[n.columns.map(column=>SR63.csvValue(column.label)),...c.map(row=>n.columns.map(column=>SR63.csvValue(row[column.key]??'')))];SR63.download('\ufeff'+Gv.sheet_to_csv(Gv.aoa_to_sheet(rows)),`${n.name||'تقرير-مخصص'}.csv`,'text/csv;charset=utf-8');}
/* PATCH Z9.c */
async function c(){
  const name=a.teacher.trim(),subject=a.subject.trim(),department=a.department.trim()||subject,classes=[...new Set(a.classes.map(lj).filter(Boolean))];
  if(!name||!subject||!classes.length||classes.some(value=>!D9(value)))return eb.error('أدخل اسم المعلم والمادة وشعبًا صحيحة مثل 7/1.');
  if(e.teachers.some(profile=>profile.id!==n?.id&&ij(profile.teacher)===ij(name)&&ij(profile.subject)===ij(subject)))return eb.error('المعلم والمادة مسجلان بالفعل.');
  if(!await Kj(e,n?'قبل تعديل بيانات معلم':'قبل إضافة معلم'))return eb.error('تعذر إنشاء نقطة استعادة؛ لم يتغير شيء.');
  const id=n?.id||'profile-'+crypto.randomUUID(),profile={...a,id,teacher:name,subject,department,classes};
  const assignments=classes.map(className=>({id:`assignment-${id}-${dj(subject,className)}`,profileId:id,teacher:name,subject,department,className,grade:uj(className)}));
  t(previous=>jj({...previous,teachers:n?previous.teachers.map(p=>p.id===id?profile:p):[...previous.teachers,profile],teacherAssignments:[...previous.teacherAssignments.filter(p=>p.profileId!==id),...assignments]},n?'تعديل بيانات معلم':'إضافة معلم',`${name} — ${subject}؛ الإسنادات الحالية، مع الاحتفاظ بأسماء المعلمين في النتائج التاريخية`,id));i(false);eb.success('تم حفظ بيانات المعلم.');
}
/* PATCH Z9.l */
async function l(){if(!n)return;if(!await Kj(e,'قبل حذف معلم'))return eb.error('تعذر إنشاء نقطة استعادة؛ لم يُحذف شيء.');t(previous=>jj({...previous,teachers:previous.teachers.filter(p=>p.id!==n.id),teacherAssignments:previous.teacherAssignments.filter(p=>p.profileId!==n.id)},'حذف معلم',n.teacher+' — حُفظت النتائج التاريخية',n.id));eb.success('تم حذف المعلم مع الاحتفاظ بنتائجه التاريخية.');}
/* PATCH Nde.et */
function et(){return (0,q.jsx)(SR63.Archives,{workspace:e,snapshots:le,status:c,bytes:u,onSave:()=>_e(),onBackup:Oe,onRestore:ke,onSnapshot:$e,onRollback:Qe,onNewYear:Ie,onClear:Ze,onRefresh:async()=>ue(await qj()),onChange:t});}
/* PATCH Nde.nt */
function nt(){return (0,q.jsxs)('section',{className:'executive-hero sr63-start',children:[(0,q.jsx)('span',{className:'sr63-kicker',children:`برنامج نتائج المدرسة · الإصدار السحابي ${SR63.version}`}),(0,q.jsx)('h1',{children:SR63.storage.blocked?'استعادة بياناتك المحفوظة':'جهّز قاعدة حسابك السحابية'}),(0,q.jsx)('p',{children:SR63.storage.blocked?'تعذّر الاتصال أو التحقق من بيانات حسابك. أعد الاتصال ثم أعد تحميل الصفحة؛ لن نستبدل البيانات السحابية بقاعدة فارغة.':'اختر قاعدة فارغة لإدخال نتائج مدرستك، أو استعد نسخة احتياطية، أو افتح البيانات التجريبية.'}),SR63.storage.blocked&&(0,q.jsx)('p',{role:'alert',children:SR63.storage.error}),(0,q.jsxs)('div',{className:'sr63-actions',children:[!SR63.storage.blocked&&(0,q.jsx)('button',{className:'sr63-button',onClick:()=>Me('empty'),children:'قاعدة فارغة'}),!SR63.storage.blocked&&(0,q.jsx)('button',{className:'sr63-button',onClick:()=>Me('demo'),children:'جولة تجريبية'}),(0,q.jsxs)('label',{className:'sr63-button',children:['استعادة نسخة JSON',(0,q.jsx)('input',{type:'file',accept:'.json',className:'sr63-file',onChange:event=>{const file=event.target.files?.[0];if(file)ke(file);event.target.value='';}})]}),SR63.storage.blocked&&(0,q.jsx)('button',{className:'sr63-button',onClick:async()=>{const raw=await Yj();SR63.storage.block('لم يتم اعتماد البيانات بعد.');if(raw)SR63.download(raw,'بيانات-للفحص.json');},children:'تنزيل البيانات للفحص'})]})]});}
/* PATCH Nde.Me */
async function Me(mode){if(SR63.storage.blocked)return eb.error('استعد نسخة صالحة قبل بدء العمل.');const next=mode==='demo'?zj():Aj();if(await _e(next)){srRawSet(next);r(structuredClone(next.settings));h(false);s(mode==='demo'?'dashboard':'import');eb.success(mode==='demo'?'تم تحميل الجولة التعريفية.':'تم إنشاء قاعدة سحابية فارغة.');}}
/* PATCH Nde.Ze */
async function Ze(exam='all'){
  const label=exam==='all'?'جميع نتائج الطلاب':XA.includes(exam)?`نتائج ${tj(e.settings,exam).name}`:'';if(!label)return eb.error('الاختبار المحدد غير صالح.');
  if(!await Kj(e,`قبل تفريغ ${label}`))return eb.error('تعذر إنشاء نقطة استعادة؛ لم تُفرّغ النتائج.');
  try{const next=SR63.clearResults(e,exam);if(!await _e(next))return;srRawSet(next);ue(await qj());if(exam==='all')s('import');eb.success(`تم تفريغ ${label} فقط وحفظ نقطة استعادة.`);}catch(error){eb.error(error.message);}
}

/* PATCH xde */
function xde({workspace:e,onExportExcel:t,readOnly=false,canPrint=true,onSchoolSummary=null,reportScope='school',canCompareSubjects=false}){let[n,r]=(0,v.useState)(`summary`),[i,a]=(0,v.useState)(`className`),[o,s]=(0,v.useState)(`الكل`),[c,l]=(0,v.useState)(`الكل`),[u,d]=(0,v.useState)(e.activeExam),[f,p]=(0,v.useState)(`exam1`),[m,h]=(0,v.useState)(e.activeExam),[upperLimit,_]=(0,v.useState)(e.settings.pass),[reportOverflowCount,b]=(0,v.useState)(0),[printStart,setPrintStart]=(0,v.useState)(0),[prepared,setPrepared]=(0,v.useState)(!1),[downloadState,setDownloadState]=(0,v.useState)(``),[rangeMinimum,setRangeMinimum]=(0,v.useState)(0),
 g=(0,v.useMemo)(()=>n==='struggling'?{min:rangeMinimum,max:upperLimit}:upperLimit,[n,rangeMinimum,upperLimit]),
 rangeError=n==='struggling'?SR63.studentPercentRange(g).error:'',departmentMode=reportScope==='department',
 [subjectData,setSubjectData]=(0,v.useState)(null),[subjectBusy,setSubjectBusy]=(0,v.useState)(false),[subjectError,setSubjectError]=(0,v.useState)(''),
 subjectRequest=(0,v.useMemo)(()=>({serial:0}),[]),subjectMode=departmentMode&&n==='subjects',
 subjectReady=subjectData?.exam===u&&subjectData?.workspace===e,
 subjectBlocked=subjectMode&&!canCompareSubjects,

 departmentSubjects=(0,v.useMemo)(()=>departmentMode?[...new Set((e.rows||[]).map(row=>String(row.subject||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar')):[],[departmentMode,e.rows]),
 specialEducationAvailable=SR63.specialEducationRows(e.rows,u).length>0,
  fixedSubject=departmentSubjects[0]||'',
 fixedSubjectLabel=fixedSubject||'لا توجد مادة مسجلة لهذا القسم',
 reportRows=(0,v.useMemo)(()=>departmentMode?(n==='struggling'||n==='support'||n==='levels'&&i==='support'?(e.rows||[]):(e.rows||[]).filter(row=>row&&String(row.subject||'').trim()===fixedSubject).map(row=>({...row,subject:fixedSubject,studentName:typeof row.studentName==='string'?row.studentName:String(row.studentName??'')}))):e.rows,[departmentMode,n,i,e.rows,fixedSubject]),
 supportLevels=n===`levels`&&i===`support`,
 x=n===`subjects`,S=departmentMode?((n==='struggling'||n==='support'||supportLevels)?c:(fixedSubject||`__UNASSIGNED_SUBJECT__`)):(x?`الكل`:c),C=departmentMode?reportRows:(S===`الكل`?e.rows:e.rows.filter(row=>row.subject===S)),w=n===`comparison`,T=w?m:u,E=n==='support'?SR63.supportLevelGradeChoices(reportRows,T):n==='struggling'&&i==='gradeGroup'?['7','8','9'].filter(grade=>SR63.generalRows(C,T).some(row=>String(SR63.reportGradeNumber(row,T))===grade)):n==='struggling'&&i==='teacherGroup'?[...new Set(SR63.generalRows(C,T).map(row=>String(mj(row,T)||row.teacher||'غير محدد').trim()||'غير محدد'))].sort((a,b)=>a.localeCompare(b,'ar')):supportLevels?SR63.supportLevelGradeChoices(reportRows,T):subjectMode&&subjectReady?subjectData.report.grades.map(g=>g.grade).sort((a,b)=>SR63.gradeOrder(a)-SR63.gradeOrder(b)):Cj(C,i,T),pageResult=(0,v.useMemo)(()=>{if([`yearComparison`,`topGrade`,`topSubject`].includes(n)||!prepared||!!rangeError||subjectBlocked||departmentMode&&!subjectMode&&!departmentSubjects.length)return {pages:[],error:''};try{const pages=subjectMode?(subjectReady?SR63.subjectComparisonPages(subjectData.report,o,e.settings):[]):mde(reportRows,i,o,S,n,T,g,e.settings);if(!Array.isArray(pages))throw Error('استجابة إعداد التقرير غير صالحة');return {pages,error:''};}catch(error){console.error('SchoolResult report preparation:',error);return {pages:[],error:String(error?.message||error||'تعذر تجهيز التقرير')};}},[prepared,rangeError,departmentMode,departmentSubjects.length,reportRows,e.settings,i,o,S,n,T,g,subjectBlocked,subjectMode,subjectReady,subjectData]),D=pageResult.pages,previewError=pageResult.error,visible=D.slice(printStart,printStart+8),leaderMode=readOnly&&typeof onSchoolSummary===`function`,
 reportGeneratedAt=(0,v.useMemo)(()=>new Date().toLocaleString('ar-EG'),[prepared,n,i,o,S,u,f,m,g,e.settings]),
 yearComparisonCard={id:`yearComparison`,title:`مقارنة عامين دراسيين`,text:`مقارنة الاختبار المناظر بين العام الحالي والعام السابق حسب المواد والصفوف`,icon:iy},
 topGradeCard={id:`topGrade`,title:`المراكز العشرة الأولى حسب الصف`,text:`ترتيب طلاب كل صف أو شعبة بالمجموع مع المراكز المكررة`,icon:gy},
 topSubjectCard={id:`topSubject`,title:`المراكز العشرة الأولى حسب المادة`,text:`ترتيب أعلى عشرة مراكز في المواد لكل صف مع حفظ التعادلات`,icon:Ay},
 specialMode=[`yearComparison`,`topGrade`,`topSubject`].includes(n),
 leaderCards=leaderMode?[{id:`levels`,title:`مستويات الطلاب`,text:`قوائم ومستويات الأداء والنتائج المرصودة`,icon:Ay},...(specialEducationAvailable?[{id:`support`,title:`التربية الخاصة — كشف الطلاب بالأسماء`,text:`طلاب السابع والثامن والتاسع في كل مادة، مع الأسماء والدرجات ونسب النجاح والتحصيل`,icon:Ay}]:[]),
 {id:`summary`,title:`تحصيل الصفوف والشعب`,text:`التقرير الأصلي لكل صف أو شعبة`,icon:xy},
 {id:`teachers`,title:`تحصيل المعلمين`,text:`نفس تقارير المعلمين الأصلية`,icon:Cy},
 {id:`struggling`,title:`الطلاب ضمن نسبة`,text:`طلاب بين حد أدنى شامل وحد أعلى غير شامل`,icon:Wy},
 {id:`comparison`,title:`مقارنة الاختبارين`,text:`نتائج الاختبارين والفروق لكل شعبة`,icon:iy},
 {id:`subjects`,title:`تقرير مقارنة المواد`,text:`التقرير الشامل بين المواد: نسب النجاح والتحصيل حسب الصف والشعبة`,icon:oy},yearComparisonCard,...(departmentMode?[]:[topGradeCard]),topSubjectCard]:[...pde,yearComparisonCard,topGradeCard,topSubjectCard],
 printBatch=async()=>{
 if(!canPrint||!prepared||!D.length||!!rangeError||subjectBlocked||subjectBusy||departmentMode&&!subjectMode&&!fixedSubject)return;
 if(w&&f===m){eb.error('اختر اختبارين مختلفين قبل الطباعة.');return;}
 if(D.length>250){eb.error('اختر نطاقًا أصغر من 250 صفحة للطباعة في ملف واحد.');return;}
 const printWindow=window.open('','_blank');
 if(!printWindow){eb.error('اسمح بالنوافذ المنبثقة لعرض التقرير والطباعة.');return;}
 try{
  const isLandscape=SR63.reportPageIsLandscape(n);
  const pageHTML=await renderReportHTML(D,isLandscape,index=>setDownloadState('تجهيز الطباعة: صفحة '+index+' من '+D.length),()=>printWindow.closed);
  if(printWindow.closed)throw Error('تم إغلاق نافذة الطباعة قبل اكتمال التقرير.');
  await SR63.printReportBatch(pageHTML,'تقرير '+(e.settings.reportDesign.reportNames[n]||n),isLandscape,printWindow);
 }catch(error){if(!printWindow.closed)printWindow.close();eb.error('تعذر طباعة التقرير: '+String(error?.message||error));}
 finally{setDownloadState('');}
},O=D.reduce((count,page)=>count+(Array.isArray(page?.rows)?page.rows:[]).filter(row=>String(row?.studentName??'').length>45).length,0),invalidate=()=>{subjectRequest.serial++;setSubjectBusy(false);setSubjectError('');setPrepared(!1);setPrintStart(0);b(0)},
renderReportPage=(t,pageNumber,pageTotal)=>{let i=w?`${tj(e.settings,f).name} × ${tj(e.settings,m).name}`:tj(e.settings,u).name,a=t.totalParts>1?` — الجزء ${t.part} من ${t.totalParts}`:``;return(0,q.jsxs)(`section`,{ref:node=>SR63.prepareReportPreview(node),className:`school-report-page sr-fitted-report ${SR63.reportPageIsLandscape(n,t)?'grade-subjects-landscape report-landscape':'report-portrait'}`,'data-orientation':SR63.reportPageIsLandscape(n,t)?'landscape':'portrait',style:j9(e),children:(0,q.jsxs)(`div`,{className:`sr-report-fit-content`,children:[(0,q.jsx)(M9,{workspace:e,title:`${e.settings.reportDesign.reportNames[n]}: ${i}${a}`,subject:t.subject,assessment:i}),n===`summary`&&(0,q.jsx)(hde,{page:t,exam:u,workspace:e}),` `,n===`levels`&&(0,q.jsx)(gde,{page:t,exam:u,workspace:e}),` `,n===`struggling`&&(0,q.jsx)(vde,{page:t,exam:u,threshold:g,workspace:e}),` `,n===`teachers`&&(0,q.jsx)(yde,{page:{...t,teacher:t.teacher||t.entity},exam:u,workspace:e}),` `,n===`comparison`&&(0,q.jsx)(_de,{page:t,from:f,to:m,workspace:e}),` `,n===`subjects`&&(0,q.jsx)(bde,{page:t,exam:u,workspace:e}),(0,q.jsx)(N9,{workspace:{...e,reportGeneratedAt},teacher:x?``:t.teacher,subject:t.subject}),(0,q.jsxs)(`span`,{className:`report-page-number`,children:[`صفحة `,pageNumber,` من `,pageTotal]})]})},t.key)};
 // The report preview deliberately shows eight pages at a time. Print, unlike
 // preview, must render EVERY page from the same selected scope and React template.
 const renderReportHTML=async(pages,isLandscape,progress,isClosed=()=>false,capture=null,pageOffset=0,pageTotal=pages.length)=>{
  let stage=null,root=null;
  const pageHTML=[];
  try{
   stage=document.createElement('div');stage.id='sr655-print-render-stage';
   stage.style.cssText='position:fixed;left:-20000px;top:0;z-index:-1;pointer-events:none;width:'+(isLandscape?'297mm':'210mm')+';background:#fff;';
   document.body.appendChild(stage);
   root=(0,y.createRoot)(stage);
   for(let pIndex=0;pIndex<pages.length;pIndex++){
    if(isClosed())throw Error('تم إغلاق نافذة معاينة الطباعة.');
    const page=pages[pIndex];
    if(SR63.reportPageIsLandscape(n,page)!==isLandscape)throw Error('الصفحات المختارة لها اتجاهات طباعة مختلفة.');
    progress?.(pageOffset+pIndex+1);
    // Wait for React's committed DOM, not a guessed number of animation frames.
    // Concurrent rendering may otherwise leave the previous student's page in the stage.
    await new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>reject(Error('تعذر اكتمال تجهيز صفحة التقرير.')),15000);
     root.render(v.cloneElement(renderReportPage(page,pageOffset+pIndex+1,pageTotal),{
      ref:node=>{if(node){clearTimeout(timer);resolve();}}
     }));
    });
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    await (document.fonts?.ready||Promise.resolve());
    const node=stage.querySelector('.school-report-page');
    if(!node)throw Error('تعذر تجهيز إحدى صفحات التقرير للطباعة.');
    await Promise.all([...node.querySelectorAll('img')].map(img=>img.decode()));
    SR63.planReportSheet(node,(isLandscape?297:210)*96/25.4,(isLandscape?210:297)*96/25.4);
    pageHTML.push(capture?await capture(node,page,pIndex):node.outerHTML);
   }
   return pageHTML;
  }finally{
   if(root)root.unmount();
   if(stage)stage.remove();
  }
 };

 // Fetch only when the coordinator requests a preview/export. Discard obsolete requests.
 const loadSubjectPages=async()=>{
  if(subjectBlocked)throw Error('مقارنة المواد غير مفعلة لهذا الحساب.');
  if(subjectReady)return SR63.subjectComparisonPages(subjectData.report,o,e.settings);
  const serial=++subjectRequest.serial;setSubjectBusy(true);setSubjectError('');
  try{
   const result=await SR63.staff.call({action:'subject_comparison',exam:u});
   if(serial!==subjectRequest.serial)throw Error('تغير اختيار التقرير؛ أعد تجهيز المعاينة.');
   if(result?.report?.exam!==u||!Array.isArray(result.report.grades))throw Error('تعذر قراءة مقارنة المواد. أعد المحاولة.');
   const pages=SR63.subjectComparisonPages(result.report,o,e.settings);
   setSubjectData({exam:u,workspace:e,report:result.report});setPrepared(true);return pages;
  }catch(error){if(serial===subjectRequest.serial)setSubjectError(String(error?.message||error));throw error;}
  finally{if(serial===subjectRequest.serial)setSubjectBusy(false);}
 };
 const preparePreview=async()=>{
  if(rangeError||subjectBlocked||subjectBusy)return;
  if(subjectMode){try{await loadSubjectPages();setPrepared(true);}catch{}return;}
  setPrepared(true);
 };
 (0,v.useEffect)(()=>{setPrepared(false);return()=>{subjectRequest.serial++;};},[e]);

 const saveVectorPDF=async()=>{
  if(downloadState||!canPrint||rangeError||subjectBlocked||subjectBusy)return;
  if(w&&f===m){eb.error('اختر اختبارين مختلفين قبل تجهيز PDF المتجهي.');return;}
  // Reserve the native print dialog during the user's original click.
  // Chrome's Save as PDF preserves vector Arabic fonts at unlimited zoom.
  const printWindow=window.open('','_blank');
  if(!printWindow){eb.error('اسمح بالنوافذ المنبثقة لحفظ PDF المتجهي.');return;}
  printWindow.document.open();
  printWindow.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>PDF متجهي — جارٍ التجهيز</title></head><body style="font:16px Tahoma,Arial;padding:30px;direction:rtl">جارٍ إنشاء التقرير المتجهي بالنصوص الأصلية…</body></html>');
  printWindow.document.close();
  const exportPages=subjectMode?await loadSubjectPages().catch(error=>{eb.error(error.message);return [];}):prepared?D:(departmentMode&&!fixedSubject?[]:SR63.buildReportPages(reportRows,i,o,S,n,T,g,e.settings));
  if(!exportPages.length){printWindow.close();eb.error('لا توجد تقارير ضمن الاختيارات الحالية.');return;}
  if(exportPages.length>250){printWindow.close();eb.error('عدد الصفحات كبير جدًا؛ اختر نطاقًا أصغر.');return;}

  let stage=null,root=null;
  try{
   const isLandscape=SR63.reportPageIsLandscape(n);
   const pageHTML=await renderReportHTML(exportPages,isLandscape,
    index=>setDownloadState('جارٍ تجهيز PDF المتجهي: صفحة '+index+' من '+exportPages.length),
    ()=>printWindow.closed);
   if(printWindow.closed)return;
   setDownloadState('جارٍ فتح حفظ PDF المتجهي…');
   const generated=await SR63.printReportBatch(pageHTML,'تقرير '+(e.settings.reportDesign.reportNames[n]||n),isLandscape,printWindow);
   if(generated===exportPages.length)eb.success('اختر «حفظ بتنسيق PDF» من وجهة الطباعة؛ ستبقى الكتابة متجهية وحادة عند التكبير.');
  }catch(error){
   if(printWindow.closed)return;
   printWindow.close();
   eb.error('تعذّر تجهيز PDF المتجهي: '+String(error?.message||error));
  }finally{
   if(root)root.unmount();
   if(stage)stage.remove();
   setDownloadState('');
  }
 };

 const exportPDF=async(split=false)=>{
  if(downloadState||!canPrint||rangeError||subjectBlocked||subjectBusy)return;
  if(w&&f===m){eb.error('اختر اختبارين مختلفين قبل تنزيل المقارنة.');return;}
  // A new selection must be downloadable without first clicking Prepare Preview.
  // The old handler silently returned while its disabled button looked clickable.
  const exportPages=subjectMode?await loadSubjectPages().catch(error=>{eb.error(error.message);return [];}):prepared?D:(departmentMode&&!fixedSubject?[]:SR63.buildReportPages(reportRows,i,o,S,n,T,g,e.settings));
  if(!exportPages.length){eb.error('لا توجد صفحات لهذا التقرير حسب الاختيارات الحالية.');return;}
  if(exportPages.length>250){eb.error('التقرير يحتوي أكثر من 250 صفحة. اختر صفًا أو معلمًا لتجزئة التصدير بأمان.');return;}
  let stage=null,root=null;
  try{
   setDownloadState('جارٍ تحميل تنسيق التقارير…');
   const css=await SR63.getReportStyleText();
   const isLandscape=SR63.reportPageIsLandscape(n);
   const label=e.settings.reportDesign.reportNames[n]||'تقرير المدرسة';
   const examLabel=w?`${tj(e.settings,f).name} - ${tj(e.settings,m).name}`:tj(e.settings,u).name;
   const groups=split?SR63.groupReportPages(exportPages,i,n):[{name:label,pages:exportPages}];
   if(groups.length>200)throw Error('عدد الملفات كبير؛ اختر نطاقًا أصغر.');
   const outputs=[],usedNames=new Map();let processed=0;
   for(const group of groups){
    const images=await renderReportHTML(group.pages,isLandscape,
     index=>setDownloadState('جارٍ إعداد صفحة '+index+' من '+exportPages.length+' للتنزيل…'),
     ()=>false,
     async (node,page)=>{
      const intended=SR63.reportPageIsLandscape(n,page),shown=SR63.reportPageIsLandscape(n,node);
      if(shown!==intended)throw Error('اتجاه صفحة التقرير لا يطابق القالب؛ تمت حماية الملف من التصدير بوضع غير صحيح.');
      return SR63.reportPageJPEG(node,css,shown);
     },processed,exportPages.length);
    processed+=group.pages.length;
    if(images.length!==group.pages.length)throw Error('عدد صفحات PDF لا يطابق المعاينة.');
    const name=SR63.safeReportFilename(`${label} - ${split?group.name:'الكل'} - ${examLabel}`);
    const seen=usedNames.get(name)||0;usedNames.set(name,seen+1);outputs.push({name:`${name}${seen?` (${seen+1})`:``}.pdf`,blob:SR63.reportPdfFromJpegs(images)});
   }
   if(processed!==exportPages.length||outputs.length!==groups.length)throw Error('ملفات PDF وZIP لا تشمل جميع الصفحات المحددة.');
   setDownloadState('جارٍ تجهيز ملف التحميل…');
   if(split)SR63.downloadReportFile(await SR63.reportZipFromPdfs(outputs),`${SR63.safeReportFilename(label+' - تقارير مفردة - '+examLabel)}.zip`);
   else SR63.downloadReportFile(outputs[0].blob,outputs[0].name);
   if(!prepared)setPrepared(true);
   eb.success(split?`تم تجهيز ${outputs.length} تقريرًا منفصلًا.`:`تم تجهيز ${exportPages.length} صفحة في ملف PDF واحد.`);
  }catch(error){eb.error('تعذر تنزيل PDF: '+String(error?.message||error));}
  finally{if(root)root.unmount();if(stage)stage.remove();setDownloadState('');}
 };
 return(0,v.useEffect)(()=>{if(!prepared){b(0);return}let e=requestAnimationFrame(()=>{b([...document.querySelectorAll(`#printable-reports .school-report-page`)].filter(e=>e.dataset.fitError||(!e.classList.contains('sr-fitted-report')&&(e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2))).length)});return()=>cancelAnimationFrame(e)},[prepared,D,n,u,f,m]),(0,q.jsxs)(`div`,{className:`space-y-6 ${leaderMode?`sr644-leadership-center`:``}`,children:[(0,q.jsxs)(`div`,{className:`report-screen-only space-y-6`,children:[(0,q.jsx)(p9,{kicker:`مركز التقارير والطباعة`,title:leaderMode?(reportScope==='department'?`تقارير الأقسام المعتمدة`: `التقارير المدرسية المعتمدة`): `مخرجات جاهزة لكل اختبار أو مقارنة`,desc:leaderMode?(reportScope==='department'?`اختر التقرير والاختبار والشعبة أو المعلم من أقسامك فقط. كل التقارير مطابقة لنماذج المدير والنائب وتلتزم بنطاق حسابك.`:`اختر التقرير من البطاقات الواضحة أدناه، ثم حدد الاختبار والشعبة أو المعلم. الطباعة والتنزيل يستخدمان قالب التقارير الأصلي نفسه.`):`اختر شكل التقرير، ثم المعلم أو الصف، والاختبار أو الاختبارين. خيار «الكل» ينشئ جميع الصفحات، وتُعرض المعاينة في دفعات من 8، بينما تشمل الطباعة كل الصفحات المحددة. يمكنك تنزيل PDF شامل أو ZIP بملف مستقل لكل معلم أو صف.`,action:(0,q.jsxs)(q.Fragment,{children:[!readOnly&&!specialMode&&(0,q.jsxs)(dA,{variant:`outline`,onClick:t,children:[(0,q.jsx)(vy,{}),`Excel شامل`]}),!specialMode&&(0,q.jsxs)(dA,{onClick:printBatch,disabled:!canPrint||!prepared||!D.length||w&&f===m||!!rangeError||subjectBlocked||subjectBusy||departmentMode&&!subjectMode&&!fixedSubject,className:`bg-[#8f3f12]`,children:[(0,q.jsx)(Fy,{}),`طباعة / حفظ PDF`]})]})}),(0,q.jsx)(`div`,{className:leaderMode?`sr644-leader-report-cards`:`grid gap-3 md:grid-cols-2 xl:grid-cols-6`,children:leaderCards.map(t=>(0,q.jsxs)(`button`,{type:`button`,onClick:()=>{r(t.id),i===`support`&&t.id!==`levels`&&a(`className`),t.id===`teachers`&&a(`teacher`),t.id===`summary`&&a(`className`),t.id===`subjects`&&(a(`grade`),l(`الكل`),s(`الكل`)),t.id===`support`&&(a(`grade`),l(`الكل`),s(`الكل`)),invalidate()},className:leaderMode?`sr644-report-card ${n===t.id?`active`:``}`:`rounded-2xl border p-4 text-right transition ${n===t.id?`border-[#8f3f12] bg-[#fff7ed] shadow-[0_10px_30px_rgba(143,63,18,.12)]`:`bg-white hover:border-slate-300`}`,children:[leaderMode?(0,q.jsxs)(`div`,{className:`sr644-report-thumb sr644-thumb-${t.id}`,'aria-hidden':true,children:[(0,q.jsx)(`span`,{className:`sr644-thumb-head`}),(0,q.jsx)(`span`,{className:`sr644-thumb-heading`}),(0,q.jsx)(`span`,{className:`sr644-thumb-metrics`}),(0,q.jsx)(`span`,{className:`sr644-thumb-graphic`}),(0,q.jsx)(`span`,{className:`sr644-thumb-lines`})]}):(0,q.jsx)(t.icon,{className:`size-6 ${n===t.id?`text-[#8f3f12]`:`text-slate-500`}`}),(0,q.jsx)(`b`,{className:leaderMode?`sr644-report-card-title`:`mt-3 block`,children:leaderMode?t.title:(t.id==='struggling'?'الطلاب ضمن نسبة':e.settings.reportDesign.reportNames[t.id]||t.title)}),(0,q.jsx)(`small`,{className:leaderMode?`sr644-report-card-desc`:`mt-1 block leading-5 text-slate-500`,children:leaderMode?t.text:t.text})]},t.id))}),specialMode?null:(0,q.jsxs)(m9,{title:`إعداد التقرير`,desc:`حدد النطاق أولًا، ثم اضغط «تجهيز المعاينة». لا تُنشأ صفحات الطباعة الثقيلة عند فتح المركز.`,children:[(0,q.jsxs)(`div`,{className:`grid gap-4 md:grid-cols-2 xl:grid-cols-5`,children:[(0,q.jsxs)(`div`,{children:[(0,q.jsx)(J,{children:`المخرج حسب`}),x?(0,q.jsx)(`div`,{className:`mt-2 rounded-md border bg-slate-50 px-3 py-2 text-sm font-bold`,children:`صف / شعبة`}):(0,q.jsx)(g9,{className:`mt-2 w-full`,value:i,onChange:e=>{a(e);s(`الكل`);e===`support`&&l(`الكل`);invalidate()},items:n===`teachers`?[{value:`teacher`,label:`معلم`}]:[{value:`className`,label:`صف / شعبة`},{value:`teacher`,label:`معلم`},...(n===`struggling`?[{value:`gradeGroup`,label:`كشف مجمع لكل صف ومادة`},{value:`teacherGroup`,label:`كشف مجمع لكل معلم`}]:[]),...(n===`levels`&&specialEducationAvailable?[{value:`support`,label:`التربية الخاصة / طلاب الدمج — حسب الصف والمادة`}]:[])]})]}),(0,q.jsxs)(`div`,{children:[(0,q.jsx)(J,{children:supportLevels?`صف طلاب الدمج`:i===`gradeGroup`?`الصف الدراسي`:i===`teacherGroup`?`المعلم`:i===`teacher`?`المعلم`:`الصف / الشعبة`}),(0,q.jsx)(g9,{className:`mt-2 w-full`,value:E.includes(o)?o:`الكل`,onChange:value=>{s(value);invalidate()},items:[{value:`الكل`,label:supportLevels?`جميع صفوف الدمج — سابع ثم ثامن ثم تاسع`:i===`gradeGroup`?`السابع ثم الثامن ثم التاسع`:i===`teacherGroup`?`جميع المعلمين — كشف لكل معلم`:i===`teacher`?`كل المعلمين — صفحة لكل معلم`:`كل الصفوف — صفحة لكل صف`},...E.map(e=>({value:e,label:supportLevels?SR63.supportClassInfo(e)?.label||e:i===`gradeGroup`?({7:'السابع',8:'الثامن',9:'التاسع'}[e]||e):e}))]})]}),(0,q.jsxs)(`div`,{children:[(0,q.jsx)(J,{children:`المادة`}),departmentMode&&!subjectMode&&n!==`struggling`?(0,q.jsx)(`div`,{className:`mt-2 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800`,role:`textbox`,'aria-readonly':true,'aria-label':`المادة الثابتة لقسم المنسق`,children:fixedSubjectLabel}):x?(0,q.jsx)(`div`,{className:`mt-2 rounded-md border bg-slate-50 px-3 py-2 text-sm font-bold`,children:`كل المواد للمقارنة`}):(0,q.jsx)(g9,{className:`mt-2 w-full`,value:c,onChange:e=>{l(e);s(`الكل`);invalidate()},items:[{value:`الكل`,label:`كل المواد`},...(supportLevels?SR63.supportLevelSubjectChoices(reportRows,u,e.settings):departmentMode&&n===`struggling`?departmentSubjects:Cj(e.rows,`subject`)).map(subject=>({value:subject,label:SR63.reportSubjectLabel(subject,e.settings)}))]})]}),w?(0,q.jsxs)(q.Fragment,{children:[(0,q.jsxs)(`div`,{children:[(0,q.jsx)(J,{children:`الاختبار الأول`}),(0,q.jsx)(g9,{className:`mt-2 w-full`,value:f,onChange:e=>{p(e);invalidate()},items:e.settings.exams.map(e=>({value:e.key,label:e.name}))})]}),(0,q.jsxs)(`div`,{children:[(0,q.jsx)(J,{children:`الاختبار الثاني`}),(0,q.jsx)(g9,{className:`mt-2 w-full`,value:m,onChange:e=>{h(e);invalidate()},items:e.settings.exams.map(e=>({value:e.key,label:e.name}))})]})]}):(0,q.jsxs)(`div`,{children:[(0,q.jsx)(J,{children:`الاختبار`}),(0,q.jsx)(g9,{className:`mt-2 w-full`,value:u,onChange:e=>{d(e);invalidate()},items:e.settings.exams.map(e=>({value:e.key,label:e.name}))})]}),n===`struggling`&&(0,q.jsxs)(q.Fragment,{children:[
 (0,q.jsxs)(`div`,{children:[(0,q.jsx)(J,{htmlFor:`sr-range-min`,children:`الحد الأدنى (%) — شامل`}),(0,q.jsx)(fA,{id:`sr-range-min`,className:`mt-2`,type:`number`,min:`0`,max:`100`,step:`any`,value:rangeMinimum,'aria-invalid':!!rangeError,onChange:e=>{setRangeMinimum(e.target.value);invalidate()}})]}),
 (0,q.jsxs)(`div`,{children:[(0,q.jsx)(J,{htmlFor:`sr-range-max`,children:`الحد الأعلى (%) — أقل من`}),(0,q.jsx)(fA,{id:`sr-range-max`,className:`mt-2`,type:`number`,min:`0`,max:`100`,step:`any`,value:upperLimit,'aria-invalid':!!rangeError,onChange:e=>{_(e.target.value);invalidate()}})]}),
 (0,q.jsx)(`p`,{className:`col-span-full text-sm font-bold`,role:rangeError?`alert`:undefined,children:rangeError||`يشمل الحد الأدنى ويستبعد الحد الأعلى؛ مثال: من 90% إلى أقل من 100%.`})]})]}),(0,q.jsxs)(`div`,{className:`mt-4 flex flex-wrap items-center gap-2`,children:[prepared?(0,q.jsx)(uA,{className:reportOverflowCount?`bg-rose-50 text-rose-700`:`bg-emerald-50 text-emerald-700`,children:reportOverflowCount?`فحص الطباعة: ${reportOverflowCount.toLocaleString(`ar-EG`)} صفحة تحتاج مراجعة`:`فحص الطباعة: جاهز`}):(0,q.jsx)(uA,{className:`bg-sky-50 text-sky-800`,children:`المعاينة لم تُجهز بعد`}),(0,q.jsxs)(uA,{className:`bg-slate-100 text-slate-700`,children:[prepared?D.length.toLocaleString(`ar-EG`):`0`,` صفحة`]}),O>0&&(0,q.jsxs)(uA,{className:`bg-amber-50 text-amber-800`,children:[O.toLocaleString(`ar-EG`),` اسم طويل — راجع المعاينة`]}),w&&f===m&&(0,q.jsx)(uA,{className:`bg-rose-50 text-rose-700`,children:`اختر اختبارين مختلفين`}),(0,q.jsxs)(dA,{onClick:()=>void preparePreview(),disabled:w&&f===m||!!rangeError||subjectBlocked||subjectBusy||departmentMode&&!subjectMode&&!fixedSubject,className:`mr-auto bg-teal-700`,children:[subjectBusy?`جارٍ تحميل مقارنة المواد…`:`تجهيز المعاينة`]}),(previewError||subjectError||subjectBlocked)&&(0,q.jsx)(uA,{className:`bg-rose-50 text-rose-800`,children:`${subjectBlocked?'مقارنة المواد تتطلب صلاحية مقارنة القسم بالأقسام الأخرى.':subjectError||('تعذر تجهيز المعاينة: '+previewError)}`}),!specialMode&&(0,q.jsxs)(dA,{onClick:printBatch,disabled:!canPrint||!prepared||!D.length||w&&f===m||!!rangeError||subjectBlocked||subjectBusy||departmentMode&&!subjectMode&&!fixedSubject,className:`bg-[#123247]`,children:[(0,q.jsx)(Fy,{}),`طباعة التقرير الحالي`]}),
 (0,q.jsx)(dA,{onClick:()=>void exportPDF(false),disabled:!canPrint||!!downloadState||w&&f===m||!!rangeError||subjectBlocked||subjectBusy||departmentMode&&!subjectMode&&!fixedSubject,className:`bg-teal-700`,children:`تنزيل PDF كامل — ملف واحد`}),
  (0,q.jsx)(dA,{onClick:()=>void saveVectorPDF(),disabled:!canPrint||!!downloadState||w&&f===m||!!rangeError||subjectBlocked||subjectBusy||departmentMode&&!subjectMode&&!fixedSubject,variant:`outline`,children:`حفظ PDF متجهي — بدون بكسلة عند التكبير`}),
 (0,q.jsx)(dA,{onClick:()=>void exportPDF(true),disabled:!canPrint||!!downloadState||w&&f===m||!!rangeError||subjectBlocked||subjectBusy||departmentMode&&!subjectMode&&!fixedSubject,variant:`outline`,children:`تنزيل تقارير مفردة ZIP — حسب ${i===`teacher`?'المعلم':'الصف'}`}),
 downloadState&&(0,q.jsx)(`span`,{role:`status`,className:`sr646-export-status`,children:downloadState}),
 (0,q.jsx)(`span`,{className:`text-sm font-bold text-slate-600`,children:`الدفعة ${D.length?Math.floor(printStart/8)+1:0} من ${Math.ceil(D.length/8)} — تعرض المعاينة 8 صفحات، والطباعة تشمل جميع الصفحات المحددة`}),(0,q.jsx)(dA,{variant:`outline`,disabled:printStart<8,onClick:()=>setPrintStart(v=>Math.max(0,v-8)),children:`الدفعة السابقة`}),(0,q.jsx)(dA,{variant:`outline`,disabled:printStart+8>=D.length,onClick:()=>setPrintStart(v=>v+8),children:`الدفعة التالية`})]})]})]}),n===`yearComparison`?(0,q.jsx)(SR63.YearComparisonCenter,{workspace:e,canPrint}):n===`topGrade`||n===`topSubject`?(0,q.jsx)(SR63.StudentTopRanksCenter,{key:n,workspace:e,mode:n===`topGrade`?`grade`:`subject`,canPrint,departmentMode}):(0,q.jsx)(`div`,{className:`report-preview-shell`,children:(0,q.jsx)(`div`,{id:`printable-reports`,className:`print-zone`,children:!prepared?(0,q.jsxs)(`div`,{className:`sr610-report-lazy`,children:[(0,q.jsx)(zy,{className:`size-10`}),(0,q.jsx)(`b`,{children:`المعاينة تُنشأ عند الطلب`}),(0,q.jsx)(`p`,{children:`حدد التقرير والنطاق والتقييم، ثم اضغط «تجهيز المعاينة». هذا يجعل مركز التقارير أسرع عند الفتح.`})]}):D.length?visible.map((t,r)=>renderReportPage(t,printStart+r+1,D.length)):(0,q.jsxs)(`div`,{className:`rounded-2xl border bg-white p-12 text-center`,children:[(0,q.jsx)(zy,{className:`mx-auto size-10 text-slate-300`}),(0,q.jsx)(`b`,{className:`mt-4 block`,children:`لا توجد بيانات تطابق الاختيارات`})]})})})]})}

/* PATCH Nde.We */
function We(){let t=Sj(e.rows,`className`,e.activeExam,e.settings,xe);return(0,q.jsxs)(`div`,{className:`space-y-6`,children:[(0,q.jsx)(p9,{kicker:`اختبار مقابل اختبار`,title:`مقارنة الاختبارات الأربعة`,desc:`الرسوم توضح اتجاه النجاح والتحصيل، والمصفوفة تعرض حجم العينة مع كل شعبة حتى تكون المقارنة أكثر دقة.`}),(0,q.jsx)(`div`,{className:`grid gap-4 sm:grid-cols-2 xl:grid-cols-4`,children:XA.map((t,n)=>{let r=bj(e.rows,t,e.settings),i=n?XA[n-1]:null;return(0,q.jsx)(h9,{label:tj(e.settings,t).name,value:wj(r.achievement),hint:`نجاح ${wj(r.success)} · ${Q(r.students)} طالب${i?` · تغير ${Tj(xj(e.rows,i,t,e.settings).delta)}`:` · خط أساس`}`,icon:n?iy:cy,tone:n%2?`teal`:`navy`},t)})}),(0,q.jsx)(m9,{title:`الاتجاه البصري للاختبارات`,desc:`خطا النجاح والتحصيل عبر الاختبارات الأربعة مع إظهار حجم العينة.`,children:(0,q.jsx)(SR63.AssessmentComparisonChart,{workspace:e,rows:e.rows})}),(0,q.jsx)(m9,{title:`مصفوفة الصفوف`,children:(0,q.jsx)(`div`,{className:`max-h-[620px] overflow-auto rounded-xl border`,children:(0,q.jsxs)(pA,{children:[(0,q.jsx)(mA,{className:`sticky top-0 bg-slate-50`,children:(0,q.jsxs)(gA,{children:[(0,q.jsx)(_A,{className:`text-right`,children:`الشعبة`}),XA.map(t=>(0,q.jsx)(_A,{className:`min-w-44 text-center`,children:tj(e.settings,t).name},t)),(0,q.jsx)(_A,{className:`text-center`,children:`١ ← ٤`})]})}),(0,q.jsx)(hA,{children:t.map(t=>(0,q.jsxs)(gA,{children:[(0,q.jsx)(vA,{className:`font-bold`,children:t.name}),XA.map((n,r)=>{let i=bj(t.subset,n,e.settings),a=r?XA[r-1]:null;return(0,q.jsxs)(vA,{className:`text-center`,children:[(0,q.jsx)(`b`,{children:wj(i.achievement)}),(0,q.jsxs)(`small`,{className:`block text-slate-500`,children:[`نجاح `,wj(i.success),` · `,Q(i.students),` طالب · `,Q(i.evaluated),` نتيجة`]}),a&&(0,q.jsx)(`small`,{className:xj(t.subset,a,n,e.settings).delta>=0?`text-emerald-700`:`text-rose-700`,children:Tj(xj(t.subset,a,n,e.settings).delta)})]},n)}),(0,q.jsx)(vA,{className:`text-center`,children:(0,q.jsx)(_9,{v:xj(t.subset,`exam1`,`exam4`,e.settings).delta})})]},t.name))})]})})})]})}
