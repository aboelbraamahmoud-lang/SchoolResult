/* SchoolResult 6.10.16 — private, human-approved AI intervention planning. */
SR63.aiPlanDefaults=Object.freeze({weeks:4,sessionsPerWeek:2,minutesPerSession:25,maxGroupSize:12,resources:'سبورة، أوراق عمل، كتاب الطالب',skillNotes:''});
SR63.aiPlanSafeNote=function(value,max=500){
  return String(value??'').replace(/[\x00-\x1f]/g,' ').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[محذوف]')
    .replace(/(?:\+?\d[\d -]{6,}\d)/g,'[محذوف]').replace(/\s+/g,' ').trim().slice(0,max);
};
SR63.aiPlanSettings=function(workspace){return {...SR63.aiPlanDefaults,...(workspace.aiPlanSettings||{})};};
SR63.aiPlanCandidateSet=function(workspace,filters){
  const exam=filters.exam||workspace.activeExam,subject=filters.subject,cohort=filters.cohort||'general';
  if(!XA.includes(exam)||!subject)SR63.fail('اختر الاختبار والمادة أولًا.');
  const pages=SR63.studentResultPages(workspace,exam),chosen=[],type=filters.level||'below60';
  for(const page of pages){
    if((cohort==='support')!==SR63.isSupportClass(page.className))continue;
    if(filters.grade&&filters.grade!=='الكل'&&ij(page.grade)!==ij(filters.grade))continue;
    if(filters.className&&filters.className!=='الكل'&&lj(page.className)!==lj(filters.className))continue;
    if(filters.studentId&&filters.studentId!=='الكل'&&page.studentId!==filters.studentId)continue;
    const item=page.results.find(item=>SR63.subjectAliasKey(item.rawSubject)===SR63.subjectAliasKey(subject));
    if(!item)continue;
    if(filters.teacher&&filters.teacher!=='الكل'){
      const original=workspace.rows.find(r=>r.id===item.rowId);
      const teacher=original?.examTeachers?.[exam]||original?.teacher||'';
      if(ij(teacher)!==ij(filters.teacher))continue;
    }
    const p=Number.isFinite(item.score)&&Number.isFinite(item.total)&&item.total>0&&item.status==='present'?Math.round(1000*item.score/item.total)/10:null;
    if(filters.mode!=='individual'&&type==='below50'&&!(p!==null&&p<50))continue;
    if(filters.mode!=='individual'&&type==='below60'&&!(p!==null&&p<60))continue;
    if(filters.mode!=='individual'&&type==='between60and80'&&!(p!==null&&p>=60&&p<80))continue;
    if(filters.mode!=='individual'&&type==='unentered'&&item.status!=='unentered')continue;
    chosen.push({studentId:page.studentId,studentName:page.studentName,className:page.className,grade:page.grade,
      percentage:p,status:item.status,subject:item.rawSubject});
  }
  chosen.sort((a,b)=>(a.percentage??1000)-(b.percentage??1000)||a.studentName.localeCompare(b.studentName,'ar'));
  return chosen;
};
SR63.aiPlanRequest=function(workspace,filters,options){
  const students=SR63.aiPlanCandidateSet(workspace,filters);
  if(!students.length)SR63.fail('لا توجد نتائج مطابقة لهذه الفلاتر؛ راجع الاختبار والمادة والمستوى.');
  if(filters.mode==='individual'&&(!filters.studentId||students.length!==1))SR63.fail('اختر طالبًا واحدًا للخطة الفردية.');
  if(students.length>250)SR63.fail('اختر صفًا أو شعبة لتقليل حجم المجموعة قبل إنشاء الخطة.');
  const n=students.filter(s=>s.percentage!==null),pct=n.map(s=>s.percentage).sort((a,b)=>a-b),average=n.length?Math.round(pct.reduce((a,b)=>a+b,0)/n.length*10)/10:null;
  const groups={under50:pct.filter(x=>x<50).length,between50and60:pct.filter(x=>x>=50&&x<60).length,between60and80:pct.filter(x=>x>=60&&x<80).length,atLeast80:pct.filter(x=>x>=80).length,unscored:students.length-n.length};
  const o={...SR63.aiPlanDefaults,...(options||{})};
  const clamp=(v,min,max,defaultValue)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.round(Number(v)))):defaultValue;
  const config={weeks:clamp(o.weeks,1,8,4),sessionsPerWeek:clamp(o.sessionsPerWeek,1,5,2),minutesPerSession:clamp(o.minutesPerSession,10,90,25),maxGroupSize:clamp(o.maxGroupSize,2,30,12),resources:SR63.aiPlanSafeNote(o.resources,220),skillNotes:SR63.aiPlanSafeNote(o.skillNotes,480)};
  for(const student of students)if(student.studentName&&student.studentName.length>2)config.skillNotes=config.skillNotes.split(student.studentName).join('[اسم محذوف]');
  // No names, academic numbers, row identifiers, or raw student records leave the school workspace.
  const evidence={scope:['individual','group','teacher','department'].includes(filters.mode)?filters.mode:'group',cohort:filters.cohort==='support'?'support':'general',
    subject:SR63.reportSubjectLabel(filters.subject,workspace.settings),assessment:tj(workspace.settings,filters.exam).name,
    grade:filters.grade||'الكل',className:filters.className||'الكل',participants:students.length,assessed:n.length,
    meanPercentage:average,minPercentage:pct[0]??null,maxPercentage:pct.at(-1)??null,distribution:groups,
    statusSummary:{absent:students.filter(s=>s.status==='absent'||s.status==='unexcused').length,
      excused:students.filter(s=>s.status==='excused').length,deprived:students.filter(s=>s.status==='deprived').length,
      unentered:students.filter(s=>s.status==='unentered').length},config};
  return {evidence,members:students.map(({studentId,studentName,className,grade})=>({studentId,studentName,className,grade}))};
};
SR63.aiPlanNormalize=function(input,evidence){
  if(!input||typeof input!=='object'||Array.isArray(input))SR63.fail('استجابة الذكاء الاصطناعي غير صالحة.');
  const str=(x,n=300)=>String(x??'').trim().slice(0,n),steps=Array.isArray(input.steps)?input.steps:[];
  if(steps.length<1||steps.length>16)SR63.fail('لم تُعد الأداة خطوات علاجية قابلة للتنفيذ.');
  const normalized=steps.map((s,i)=>({week:Math.max(1,Math.min(evidence.config.weeks,Math.round(Number(s.week)||i+1))),
    objective:str(s.objective,220),action:str(s.action,600),resources:str(s.resources,250),
    measure:str(s.measure,320),responsible:str(s.responsible||'معلم المادة',100),completed:false,followUp:'',observed:''}));
  if(normalized.some(s=>!s.action||!s.measure))SR63.fail('تحتوي الخطة على إجراء بلا طريقة قياس واضحة.');
  return {title:str(input.title,140)||`خطة علاجية — ${evidence.subject}`,
    diagnosis:str(input.diagnosis,850),goal:str(input.goal,500),successCriterion:str(input.successCriterion,320),
    cautions:str(input.cautions,500),steps:normalized};
};
SR63.aiPlanManualDraft=function(evidence){
  const weeks=evidence.config.weeks,steps=[];
  for(let week=1;week<=weeks;week++)steps.push({week,objective:week===1?'تحديد المهارات المتعثرة':week===weeks?'التحقق من أثر التدخل':'إعادة بناء المهارات تدريجيًا',
    action:week===1?'إجراء اختبار تشخيصي قصير ثم تصنيف أخطاء الإجابات بحسب المهارة.':week===weeks?'تطبيق تقويم بعدي مشابه للتشخيص، ومقارنة مستوى إتقان المهارة قبل التدخل وبعده.':'تقديم شرح نموذجي وتدريبات متدرجة ثم نشاط فردي قصير مع تغذية راجعة.',
    resources:evidence.config.resources,measure:week===1?'قائمة بالمهارات التي ثبت تعثر الطلاب فيها.':week===weeks?'نسبة الإتقان بعد التدخل مقارنة بنتيجة التقويم التشخيصي.':'اختبار ختامي قصير لكل حصة، وتسجيل نسبة الإتقان.',responsible:'معلم المادة',completed:false,followUp:'',observed:''});
  return {title:`مسودة تدخل علاجي — ${evidence.subject}`,diagnosis:'الدرجات وحدها لا تحدد المهارات المتعثرة؛ تُحدد بدقة بعد اختبار تشخيصي.',
    goal:'تحسين إتقان المهارات المستهدفة بناءً على نتائج التقويم التشخيصي.',successCriterion:'ارتفاع نسبة إتقان المهارات المستهدفة وفق مقارنة قبلي/بعدي موثقة.',
    cautions:'مسودة إجرائية محلية، وليست خطة مولدة بالذكاء الاصطناعي؛ تحتاج اعتماد المعلم.',steps};
};
SR63.aiPlanCreate=function(workspace,request,draft,source='manual'){
  const now=new Date().toISOString(),plan={id:crypto.randomUUID(),createdAt:now,updatedAt:now,exam:request.evidence.assessment,
    scope:request.evidence.scope,cohort:request.evidence.cohort,subject:request.evidence.subject,
    grade:request.evidence.grade,className:request.evidence.className,source,status:'draft',
    members:request.members,evidence:request.evidence,...SR63.aiPlanNormalize(draft,request.evidence),approvedAt:null,approvedBy:''};
  return {...workspace,aiPlans:[plan,...(workspace.aiPlans||[])].slice(0,300)};
};
SR63.aiPlanUpdate=function(workspace,id,change){
  const plans=workspace.aiPlans||[],old=plans.find(p=>p.id===id);if(!old)SR63.fail('الخطة غير موجودة.');
  const allowed=['status','approvedBy','title','goal','successCriterion','steps'];
  if(Object.keys(change).some(k=>!allowed.includes(k)))SR63.fail('التعديل غير مسموح.');
  if(change.status&&!['draft','approved','in_progress','completed'].includes(change.status))SR63.fail('حالة الخطة غير صالحة.');
  if(change.title!==undefined&&(!String(change.title).trim()||String(change.title).length>140))SR63.fail('عنوان الخطة مطلوب بحد أقصى 140 حرفًا.');
  if(change.goal!==undefined&&String(change.goal).length>500)SR63.fail('نص الهدف يتجاوز الحد المسموح.');
  if(change.successCriterion!==undefined&&String(change.successCriterion).length>320)SR63.fail('معيار النجاح طويل جدًا.');
  if(change.status==='approved'&&!String(change.approvedBy||old.approvedBy).trim())SR63.fail('اكتب اسم المسؤول الذي اعتمد الخطة.');
  if(change.status==='completed'&&!old.steps.every(s=>s.completed))SR63.fail('سجل تنفيذ الإجراءات قبل إغلاق الخطة.');
  let steps=old.steps;
  if(change.steps){if(!Array.isArray(change.steps)||change.steps.length!==old.steps.length)SR63.fail('لا يمكن حذف إجراءات الخطة من سجل المتابعة.');
    steps=change.steps.map((s,i)=>({...old.steps[i],action:String(s.action??old.steps[i].action).slice(0,600),measure:String(s.measure??old.steps[i].measure).slice(0,320),
      completed:!!s.completed,followUp:String(s.followUp??'').slice(0,600),observed:String(s.observed??'').slice(0,120)}));}
  const next={...old,...change,steps,updatedAt:new Date().toISOString()};
  if(change.status==='approved')next.approvedAt=new Date().toISOString();
  return {...workspace,aiPlans:plans.map(p=>p.id===id?next:p)};
};
