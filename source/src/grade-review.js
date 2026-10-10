/* SchoolResult 6.10.14 — single-assessment student score review, protected edits and missing-grade reports. */
SR63.gradeReviewReasons={
  unentered:'غير مرصود',absent:'غائب',excused:'غياب بعذر',unexcused:'غياب دون عذر',
  deprived:'محروم',not_enrolled:'غير مقيد',invalid:'حاضر بلا درجة',partial:'أقل من الدرجة الكاملة'
};
SR63.gradeReviewPages=function(workspace,exam){
  if(!XA.includes(exam))SR63.fail('التقييم المحدد غير صالح.');
  return SR63.studentResultPages(workspace,exam);
};
SR63.gradeReviewExceptions=function(pages,filters={}){
  const reason=filters.reason||'all',cohort=filters.cohort||'general',subject=filters.subject||'all',result=[];
  for(const page of pages){
    if(cohort==='general'&&SR63.isSupportClass(page.className)||cohort==='support'&&!SR63.isSupportClass(page.className))continue;
    if(filters.grade&&filters.grade!=='الكل'&&ij(page.grade)!==ij(filters.grade))continue;
    if(filters.className&&filters.className!=='الكل'&&lj(page.className)!==lj(filters.className))continue;
    if(filters.studentId&&filters.studentId!=='الكل'&&ij(page.studentId)!==ij(filters.studentId))continue;
    if(filters.search&&!ij(page.studentName+' '+page.studentId).includes(ij(filters.search)))continue;
    for(const item of page.results){
      if(subject!=='all'&&SR63.subjectAliasKey(item.rawSubject)!==subject)continue;
      const type=item.status==='present'?(Number.isFinite(item.score)&&Number.isFinite(item.total)&&item.total>0?(item.score<item.total?'partial':null):'invalid'):item.status;
      if(!type||!SR63.gradeReviewReasons[type])continue;
      if(reason!=='all'&&reason!==type||reason==='all'&&type==='partial')continue;
      result.push({studentId:page.studentId,studentName:page.studentName,grade:page.grade,className:page.className,subject:item.subject,rawSubject:item.rawSubject,rowId:item.rowId,status:item.status,reason:type,reasonLabel:SR63.gradeReviewReasons[type],score:item.score,total:item.total,exam:page.exam});
    }
  }
  return result;
};
SR63.gradeReviewApply=function(workspace,exam,request){
  if(!XA.includes(exam))SR63.fail('التقييم المحدد غير صالح.');
  const status=String(request.status??''),allowed=['present','absent','excused','unexcused','deprived','not_enrolled','unentered'];
  if(!allowed.includes(status))SR63.fail('حالة النتيجة غير صالحة.');
  const score=status==='present'?SR63.number(request.score):null;
  const subject=String(request.subject??'').trim(),className=lj(request.className),studentId=String(request.studentId??'').trim(),studentName=String(request.studentName??'').trim();
  if(!subject||!studentId||!studentName||!D9(className))SR63.fail('تعذّر تحديد الطالب أو المادة أو الشعبة.');
  const seed=workspace.rows.find(row=>ij(row.studentId)===ij(studentId)&&lj(hj(row,exam)||row.className)===className);
  if(!seed)SR63.fail('الطالب غير موجود في الشعبة المحددة.');
  const matches=workspace.rows.filter(row=>ij(row.studentId)===ij(studentId)&&SR63.subjectEquivalent(row.subject,subject));
  if(matches.length>1)SR63.fail('للطالب سجلات مكررة للمادة نفسها. عالج التعارض أولًا.');
  const existing=matches[0]??null;
  if(request.rowId&&existing?.id!==request.rowId)SR63.fail('تغيّر سجل النتيجة. أعد فتح الطالب قبل التعديل.');
  if(!request.rowId&&existing)SR63.fail('أضيفت المادة بالفعل لهذا الطالب. أعد فتح الطالب.');
  if(existing&&lj(hj(existing,exam)||existing.className)!==className)SR63.fail('شعبة النتيجة الحالية تختلف عن شعبة الطالب. صححها أولًا.');
  const total=existing?pj(existing,exam,workspace.settings):tj(workspace.settings,exam)?.total;
  if(!Number.isFinite(total)||total<=0)SR63.fail('الدرجة الكلية غير صالحة.');
  if(status==='present'&&(score===null||score<0||score>total))SR63.fail(`أدخل درجة من 0 إلى ${total}، ولا تترك الدرجة فارغة عند اختيار حاضر.`);
  if(!existing&&status==='unentered')return workspace;
  if(existing&&existing.statuses?.[exam]===status&&(status!=='present'||existing.scores?.[exam]===score))return workspace;
  let newRow=existing;
  if(!newRow){
    const catalog=SR63.ensureCatalog(workspace),defined=catalog.subjects.find(s=>s.active!==false&&SR63.subjectEquivalent(s.name,subject));
    if(!defined)SR63.fail('المادة غير موجودة في الهيكل الأكاديمي؛ لا يمكن إضافتها تلقائيًا.');
    const cls=catalog.classes.find(item=>lj(item.className)===className);
    if(defined.gradeIds?.length&&cls?.gradeId&&!defined.gradeIds.includes(cls.gradeId))SR63.fail('المادة لا تتبع الصف الدراسي لهذا الطالب.');
    const support=SR63.isSupportClass(className),assignments=support?[]:SR63.assignmentMatches(workspace,defined.name,className);
    if(!support&&assignments.length!==1)SR63.fail('لا يوجد إسناد فريد للمادة والشعبة. أكمل التكليف قبل إضافة النتيجة.');
    const teacher=support?SR63.SUPPORT_DEPARTMENT:assignments[0].teacher;
    newRow={id:`row-${crypto.randomUUID()}`,studentId,studentName,className,grade:uj(className),subject:defined.name,department:support?SR63.SUPPORT_DEPARTMENT:defined.department||defined.name,teacher,
      scores:Object.fromEntries(XA.map(key=>[key,null])),statuses:Object.fromEntries(XA.map(key=>[key,'unentered'])),totals:Object.fromEntries(XA.map(key=>[key,null])),examTeachers:Object.fromEntries(XA.map(key=>[key,''])),examClasses:Object.fromEntries(XA.map(key=>[key,''])),importBatches:Object.fromEntries(XA.map(key=>[key,null]))};
  }
  const updated={...newRow,scores:{...newRow.scores,[exam]:score},statuses:{...newRow.statuses,[exam]:status},totals:{...newRow.totals,[exam]:total},examClasses:{...newRow.examClasses,[exam]:className},examTeachers:{...newRow.examTeachers,[exam]:newRow.examTeachers?.[exam]||newRow.teacher},importBatches:{...newRow.importBatches,[exam]:null}};
  if(!SR63.validResult(updated,exam,workspace.settings))SR63.fail('النتيجة المعدلة لا تجتاز التحقق من الدرجات والحالة.');
  const rows=existing?workspace.rows.map(row=>row.id===existing.id?updated:row):[...workspace.rows,updated];
  return {...workspace,rows};
};
SR63.gradeReviewExcel=function(items,workspace,exam,cohort){
  if(!items.length)return eb.error('لا توجد حالات مطابقة للتصدير.');
  const book=Gv.book_new(),records=items.map((item,i)=>({'م':i+1,'اسم الطالب':item.studentName,'الرقم الأكاديمي':item.studentId,'الصف':item.grade,'الشعبة':item.className,'المادة':item.subject,'الدرجة':item.score,'الدرجة الكلية':item.total,'السبب':item.reasonLabel,'التقييم':tj(workspace.settings,exam).name}));
  Gv.book_append_sheet(book,Gv.json_to_sheet(records),'حالات تحتاج مراجعة');
  Tv(book,`كشف-نواقص-الدرجات-${cohort==='support'?'الدعم-الإضافي':'المدرسة'}-${exam}.xlsx`);
};
SR63.gradeReviewPrint=function(items,workspace,exam,cohort){
  if(!items.length)return eb.error('لا توجد حالات مطابقة للطباعة.');
  if(document.getElementById('sr63-print-root'))document.getElementById('sr63-print-root').remove();
  const root=document.createElement('div');root.id='sr63-print-root';root.className='sr613-print-report';
  const safe=SR63.escape,examName=tj(workspace.settings,exam).name,scope=cohort==='support'?'قسم الدعم الإضافي':cohort==='general'?'طلاب التعليم العام':'كشف منفصل بحسب الفئة';
  const tr=items.map((item,index)=>`<tr><td>${index+1}</td><td>${safe(item.studentName)}</td><td>${safe(item.studentId)}</td><td>${safe(item.className)}</td><td>${safe(item.subject)}</td><td>${safe(item.score===null?'—':item.score)}</td><td>${safe(item.total??'—')}</td><td>${safe(item.reasonLabel)}</td></tr>`).join('');
  root.innerHTML=`<div class="sr613-print-heading"><h1>${safe(workspace.settings.schoolName)}</h1><h2>كشف مراجعة الدرجات غير المكتملة</h2><p>${safe(examName)} — ${safe(scope)} — ${items.length} حالة</p><p>العام الأكاديمي: ${safe(workspace.settings.academicYear)}</p></div><table><thead><tr><th>م</th><th>اسم الطالب</th><th>الرقم الأكاديمي</th><th>الشعبة</th><th>المادة</th><th>الدرجة</th><th>الكلي</th><th>السبب</th></tr></thead><tbody>${tr}</tbody></table><p class="sr613-print-note">لم تُحوَّل حالات الغياب أو عدم الرصد إلى درجة صفر. التقرير يعرض الحالات المطابقة للفلاتر المختارة.</p>`;
  document.body.appendChild(root);document.body.classList.add('sr613-printing');
  const cleanup=()=>{root.remove();document.body.classList.remove('sr613-printing');};
  window.addEventListener('afterprint',cleanup,{once:true});
  try{window.print();}catch(error){cleanup();eb.error('تعذر فتح نافذة الطباعة.');}
};
SR63.StudentGradeReview=function({workspace,setWorkspace}){
  const [exam,setExam]=(0,v.useState)(workspace.activeExam),[grade,setGrade]=(0,v.useState)('الكل'),[className,setClassName]=(0,v.useState)('الكل'),[cohort,setCohort]=(0,v.useState)('general'),[search,setSearch]=(0,v.useState)(''),[selected,setSelected]=(0,v.useState)(''),[mode,setMode]=(0,v.useState)('student'),[reason,setReason]=(0,v.useState)('all'),[subject,setSubject]=(0,v.useState)('all'),[draft,setDraft]=(0,v.useState)(null),[busy,setBusy]=(0,v.useState)(false);
  const pages=(0,v.useMemo)(()=>SR63.gradeReviewPages(workspace,exam),[workspace,exam]);
  const scoped=(0,v.useMemo)(()=>pages.filter(page=>(cohort==='support'?SR63.isSupportClass(page.className):!SR63.isSupportClass(page.className))&&(grade==='الكل'||ij(page.grade)===ij(grade))&&(className==='الكل'||lj(page.className)===lj(className))&&(!search.trim()||ij(page.studentName+' '+page.studentId).includes(ij(search)))),[pages,cohort,grade,className,search]);
  const availableGrades=[...new Set(pages.filter(p=>cohort==='support'?SR63.isSupportClass(p.className):!SR63.isSupportClass(p.className)).map(p=>p.grade))].sort((a,b)=>SR63.gradeOrder(a)-SR63.gradeOrder(b));
  const availableClasses=[...new Set(pages.filter(p=>(cohort==='support'?SR63.isSupportClass(p.className):!SR63.isSupportClass(p.className))&&(grade==='الكل'||ij(p.grade)===ij(grade))).map(p=>p.className))].sort((a,b)=>lj(a).localeCompare(lj(b),'en',{numeric:true}));
  const current=scoped.find(page=>page.studentId===selected)||scoped[0]||null;
  const exceptions=(0,v.useMemo)(()=>SR63.gradeReviewExceptions(pages,{cohort,grade,className,search,reason,subject}),[pages,cohort,grade,className,search,reason,subject]);
  const allProblems=(0,v.useMemo)(()=>SR63.gradeReviewExceptions(pages,{cohort,grade,className,search}),[pages,cohort,grade,className,search]);
  const reasons=[['all','كل حالات عدم اكتمال الرصد'],...Object.entries(SR63.gradeReviewReasons).map(([value,label])=>[value,label])];
  const subjects=[...new Map(pages.flatMap(p=>p.results).map(r=>[SR63.subjectAliasKey(r.rawSubject),r.subject])).entries()].sort((a,b)=>SR63.reportSubjectCompare(a[1],b[1],workspace.settings));
  const label=(title,control)=>(0,q.jsxs)('label',{className:'sr613-filter',children:[(0,q.jsx)('span',{children:title}),control]}),options=(value,change,choices)=>(0,q.jsx)('select',{value,onChange:event=>change(event.target.value),children:choices.map(([id,name])=>(0,q.jsx)('option',{value:id,children:name},id))});
  const reset=()=>{setSelected('');setDraft(null);};
  const startEdit=(page,item)=>setDraft({rowId:item.rowId,subject:item.rawSubject,display:item.subject,className:page.className,studentId:page.studentId,studentName:page.studentName,status:item.status,score:item.score===null?'':String(item.score),total:item.total});
  const saveEdit=async()=>{
    if(!draft||busy)return;
    try{
      const candidate=SR63.gradeReviewApply(workspace,exam,draft);
      if(candidate===workspace){setDraft(null);return eb.info('لم تتغير النتيجة.');}
      if(SR63.storage.blocked)throw new Error('الحفظ السحابي متوقف بسبب تعارض؛ عالج الاتصال أولًا.');
      if(!window.confirm(`اعتماد تعديل ${draft.display} للطالب «${draft.studentName}» في ${tj(workspace.settings,exam).name}؟ ستُنشأ نقطة استعادة أولًا.`))return;
      setBusy(true);
      if(!await Kj(workspace,'قبل تعديل درجة أو حالة طالب من مراجعة الدرجات'))throw new Error('تعذر إنشاء نقطة استعادة؛ لم تُحفظ النتيجة.');
      setWorkspace(current=>SR63.gradeReviewApply(current,exam,draft));
      setDraft(null);eb.success('تم تعديل النتيجة وتوثيقها في سجل المراجعة.');
    }catch(error){eb.error(error.message||'تعذر تعديل النتيجة.');}finally{setBusy(false);}
  };
  const summary={students:scoped.length,missing:allProblems.length,notEntered:allProblems.filter(x=>x.reason==='unentered'||x.reason==='invalid').length,absent:allProblems.filter(x=>['absent','excused','unexcused'].includes(x.reason)).length,deprived:allProblems.filter(x=>x.reason==='deprived').length};
  return (0,q.jsxs)('div',{className:'sr613-grade-review',children:[
    (0,q.jsxs)('section',{className:'sr613-hero',children:[(0,q.jsx)('span',{children:'مراجعة النتائج · لكل اختبار على حدة'}),(0,q.jsx)('h1',{children:'مراجعة درجات الطلاب ونواقص الرصد'}),(0,q.jsx)('p',{children:'اعرض مواد الطالب كاملة، صحح درجة أو حالة محددة مع نقطة استعادة، ثم اطبع أو صدّر كشف حالات الغياب والعذر والحرمان وعدم الرصد.'})]}),
    (0,q.jsxs)('section',{className:'sr613-filters',children:[
      label('التقييم',options(exam,value=>{setExam(value);reset()},workspace.settings.exams.map(item=>[item.key,item.name]))),
      label('الفئة',options(cohort,value=>{setCohort(value);setGrade('الكل');setClassName('الكل');reset()},[['general','التعليم العام'],['support','طلاب الدمج — الدعم الإضافي']])),
      label('الصف',options(grade,value=>{setGrade(value);setClassName('الكل');reset()},[['الكل','جميع الصفوف'],...availableGrades.map(value=>[value,value])])),
      label('الشعبة',options(className,value=>{setClassName(value);reset()},[['الكل','جميع الشعب'],...availableClasses.map(value=>[value,value])])),
      label('بحث بالاسم أو الرقم الأكاديمي',(0,q.jsx)('input',{type:'search',value:search,onChange:event=>{setSearch(event.target.value);reset()},placeholder:'ابحث عن طالب…'}))
    ]}),
    (0,q.jsx)('div',{className:'sr613-stats',children:[['الطلاب',summary.students],['حالات تحتاج مراجعة',summary.missing],['غير مرصود',summary.notEntered],['غياب بأنواعه',summary.absent],['محروم',summary.deprived]].map(([title,value])=>(0,q.jsxs)('article',{children:[(0,q.jsx)('span',{children:title}),(0,q.jsx)('strong',{children:value})]},title))}),
    (0,q.jsxs)('nav',{className:'sr613-tabs',children:[(0,q.jsx)('button',{className:mode==='student'?'active':'',onClick:()=>setMode('student'),children:'درجات الطالب وتعديلها'}),(0,q.jsx)('button',{className:mode==='missing'?'active':'',onClick:()=>setMode('missing'),children:'كشف الدرجات الناقصة وأسبابها'})]}),
    mode==='student'?(0,q.jsxs)('section',{className:'sr613-layout',children:[
      (0,q.jsxs)('aside',{className:'sr613-students',children:[(0,q.jsxs)('b',{children:['الطلاب ضمن الاختيار (',scoped.length,')']}),scoped.slice(0,80).map(page=>(0,q.jsxs)('button',{className:current?.studentId===page.studentId?'active':'',onClick:()=>{setSelected(page.studentId);setDraft(null)},children:[(0,q.jsx)('strong',{children:page.studentName}),(0,q.jsxs)('small',{children:[page.studentId,' · ',page.className]})]},page.studentId)),scoped.length>80?(0,q.jsx)('small',{children:'تظهر أول 80 نتيجة فقط. استخدم البحث للوصول إلى بقية الطلاب.'}):null]}),
      current?(0,q.jsxs)('div',{className:'sr613-panel',children:[(0,q.jsxs)('header',{children:[(0,q.jsx)('h2',{children:current.studentName}),(0,q.jsxs)('p',{children:['الرقم الأكاديمي: ',current.studentId,' · ',current.grade,' · الشعبة ',current.className,' · ',tj(workspace.settings,exam).name]})]}),(0,q.jsx)('div',{className:'sr613-table-wrap',children:(0,q.jsxs)('table',{className:'sr613-table',children:[(0,q.jsx)('thead',{children:(0,q.jsxs)('tr',{children:['المادة','درجة الطالب','الدرجة الكلية','النسبة','الحالة / سبب عدم الاكتمال','تعديل'].map(h=>(0,q.jsx)('th',{children:h},h))})}),(0,q.jsx)('tbody',{children:current.results.map(item=>(0,q.jsxs)('tr',{children:[(0,q.jsx)('td',{children:item.subject}),(0,q.jsx)('td',{children:Number.isFinite(item.score)?item.score:'—'}),(0,q.jsx)('td',{children:item.total??'—'}),(0,q.jsx)('td',{children:item.percent===null?'—':wj(item.percent)}),(0,q.jsx)('td',{children:item.status==='present'?'مرصود':SR63.gradeReviewReasons[item.status]??Dj(item.status)}),(0,q.jsx)('td',{children:(0,q.jsx)('button',{type:'button',onClick:()=>startEdit(current,item),children:item.rowId?'تعديل':'رصد جديد'})})]},item.key))})]})})]}):(0,q.jsx)('div',{className:'sr613-panel',children:'لا يوجد طلاب يطابقون البحث والفلاتر.'})
    ]}):(0,q.jsxs)('section',{className:'sr613-panel',children:[
      (0,q.jsxs)('header',{children:[(0,q.jsx)('h2',{children:'كشف الدرجات غير المكتملة'}),(0,q.jsx)('p',{children:'تُستبعد الدرجات المرصودة الصحيحة من كشف النواقص، حتى لو كانت الدرجة صفرًا. «أقل من الدرجة الكاملة» خيار مستقل، وليس حالة غياب أو درجة مفقودة.'})]}),
      (0,q.jsxs)('div',{className:'sr613-report-controls',children:[label('نوع الحالة',options(reason,setReason,reasons)),label('المادة',options(subject,setSubject,[['all','جميع المواد'],...subjects.map(([key,name])=>[key,name])])),(0,q.jsx)('button',{disabled:!exceptions.length,onClick:()=>SR63.gradeReviewExcel(exceptions,workspace,exam,cohort),children:'تصدير Excel'}),(0,q.jsx)('button',{disabled:!exceptions.length,onClick:()=>SR63.gradeReviewPrint(exceptions,workspace,exam,cohort),children:'طباعة التقرير'})]}),
      (0,q.jsxs)('p',{className:'sr613-count',children:['عدد الحالات المطابقة: ',exceptions.length,' · عدد الطلاب المتأثرين: ',new Set(exceptions.map(item=>item.studentId)).size]}),
      (0,q.jsx)('div',{className:'sr613-table-wrap',children:(0,q.jsxs)('table',{className:'sr613-table',children:[(0,q.jsx)('thead',{children:(0,q.jsxs)('tr',{children:['الطالب','الشعبة','المادة','الدرجة','الكلي','السبب','مراجعة'].map(h=>(0,q.jsx)('th',{children:h},h))})}),(0,q.jsx)('tbody',{children:exceptions.slice(0,120).map((item,i)=>(0,q.jsxs)('tr',{children:[(0,q.jsxs)('td',{children:[(0,q.jsx)('b',{children:item.studentName}),(0,q.jsx)('small',{children:item.studentId})]}),(0,q.jsx)('td',{children:item.className}),(0,q.jsx)('td',{children:item.subject}),(0,q.jsx)('td',{children:item.score??'—'}),(0,q.jsx)('td',{children:item.total??'—'}),(0,q.jsx)('td',{children:item.reasonLabel}),(0,q.jsx)('td',{children:(0,q.jsx)('button',{onClick:()=>{setSelected(item.studentId);setMode('student')},children:'فتح الطالب'})})]},`${item.studentId}-${item.subject}-${i}`))})]})}),exceptions.length>120?(0,q.jsx)('p',{children:'تعرض الشاشة أول 120 حالة حفاظًا على سرعة العرض؛ ملف Excel والطباعة يشملان جميع الحالات المطابقة.'}):null
    ]}),
    draft?(0,q.jsx)('div',{className:'sr613-overlay',children:(0,q.jsxs)('section',{className:'sr613-editor',role:'dialog','aria-modal':true,'aria-label':'تعديل درجة الطالب',children:[(0,q.jsx)('h2',{children:'تعديل درجة أو حالة'}),(0,q.jsxs)('p',{children:[draft.studentName,' · ',draft.display,' · ',tj(workspace.settings,exam).name]}),label('الحالة',options(draft.status,value=>setDraft({...draft,status:value,score:value==='present'?draft.score:''}),[['present','حاضر — درجة مرصودة'],['unentered','غير مرصود'],['absent','غائب'],['excused','غياب بعذر'],['unexcused','غياب دون عذر'],['deprived','محروم'],['not_enrolled','غير مقيد']])),label('الدرجة من '+draft.total,(0,q.jsx)('input',{type:'text',inputMode:'decimal',value:draft.score,onChange:event=>setDraft({...draft,score:event.target.value}),disabled:draft.status!=='present',placeholder:'اكتب الدرجة'})),(0,q.jsx)('small',{children:'عند اختيار غياب أو عذر أو حرمان أو غير مرصود، تُحفظ الدرجة فارغة، وليس صفرًا. تنشأ نقطة استعادة قبل الحفظ ويُسجَّل التغيير.'}),(0,q.jsxs)('div',{className:'sr613-editor-actions',children:[(0,q.jsx)('button',{disabled:busy,onClick:()=>setDraft(null),children:'إلغاء'}),(0,q.jsx)('button',{disabled:busy,onClick:()=>void saveEdit(),children:busy?'جارٍ الحفظ…':'اعتماد التعديل'})]})]})}):null
  ]});
};
