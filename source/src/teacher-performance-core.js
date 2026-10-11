/* 6.10.19 — teacher-specific quantitative/descriptive analysis and improvement planning.
   Derive exclusively from the workspace; no student personal data leaves the browser. */
SR63.teacherPerformanceChoices=function(workspace,exam=workspace.activeExam){
 const keys=new Map(),settings=workspace.settings||{};
 for(const r of workspace.rows||[]){
  const teacher=String(mj(r,exam)||'').trim();
  const subject=String(r.subject||'').trim(),alias=SR63.subjectAliasKey(subject);
  if(!teacher||teacher==='غير محدد'||!alias)continue;
  const key=teacher+'|'+alias;
  if(!keys.has(key))keys.set(key,{key,teacher,subject,subjectLabel:SR63.reportSubjectLabel(subject,settings)});
 }
 return [...keys.values()].sort((a,b)=>a.teacher.localeCompare(b.teacher,'ar')||SR63.reportSubjectCompare(a.subject,b.subject,settings));
};
SR63.teacherPerformanceAnalyze=function(workspace,options={}){
 const exam=options.exam||workspace.activeExam,idx=XA.indexOf(exam);
 if(idx<0)SR63.fail('اختر اختبارًا صالحًا.');
 const prevExam=idx>0?XA[idx-1]:null,settings=workspace.settings||{};
 const teacher=String(options.teacher||'').trim(),subject=String(options.subject||'').trim();
 if(!teacher||!subject)SR63.fail('حدد المعلم والمادة أولًا.');
 const lower=Number(options.lower??60),upper=Number(options.upper??80);
 if(!Number.isFinite(lower)||!Number.isFinite(upper)||lower<1||upper>100||lower>=upper)SR63.fail('حدود المستويات غير صحيحة؛ يجب أن يكون الحد الأدنى أصغر من الحد الأعلى.');
 const cohort=options.cohort==='support'?'support':'general';
 const classFilter=String(options.className||'').trim();
 const round=x=>Math.round(x*10)/10;
 const pct=(r,key)=>{if(!key||r.statuses?.[key]!=='present')return null;const score=r.scores?.[key],total=pj(r,key,settings);return typeof score==='number'&&Number.isFinite(score)&&Number.isFinite(total)&&total>0?round(score/total*100):null;};
 const chosen=(workspace.rows||[]).filter(r=>
   SR63.subjectAliasKey(r.subject)===SR63.subjectAliasKey(subject)&&
   ij(mj(r,exam)||'')===ij(teacher)&&
   ((cohort==='support')===SR63.isSupportRow(r,exam))&&
   (!classFilter||String(hj(r,exam)||r.className||'').trim()===classFilter)
 );
 const uniq=new Map();
 for(const row of chosen){const k=String(row.studentId)+'|'+SR63.subjectAliasKey(subject);if(!uniq.has(k))uniq.set(k,row);}
 // A class improvement plan must list every known student of the selected class,
 // including those with no result row for this teacher's subject. Never assign zero.
 if(classFilter&&chosen.length){
  for(const row of workspace.rows||[]){
   if(String(hj(row,exam)||row.className||'').trim()!==classFilter)continue;
   if(((cohort==='support')!==SR63.isSupportRow(row,exam)))continue;
   const id=String(row.studentId||'').trim();if(!id)continue;
   const key=id+'|'+SR63.subjectAliasKey(subject);
   if(!uniq.has(key))uniq.set(key,{...row,subject,scores:{},statuses:{},totals:{}});
  }
 }
 const rows=[...uniq.values()];
 if(!rows.length)SR63.fail('لا توجد نتائج للمعلم والمادة والفئة المختارة.');
 const students=rows.map(r=>{
   const current=pct(r,exam),previous=pct(r,prevExam),klass=hj(r,exam)||r.className;
   const grade=gj(r,exam)||r.grade||'';
   return {studentId:r.studentId,studentName:r.studentName,className:klass,grade,
     current,previous,change:current!==null&&previous!==null?round(current-previous):null,
     currentStatus:r.statuses?.[exam]||'unentered',previousStatus:prevExam?r.statuses?.[prevExam]||'unentered':null,
     score:r.scores?.[exam],total:pj(r,exam,settings),
     band:current===null?'missing':current<lower?'low':current<upper?'middle':'high'};
 }).sort((a,b)=>a.className.localeCompare(b.className,'ar',{numeric:true})||a.studentName.localeCompare(b.studentName,'ar'));
 const summary=list=>{
  const valid=list.filter(s=>s.current!==null),compared=valid.filter(s=>s.previous!==null);
  const marks=valid.reduce((acc,s)=>({achieved:acc.achieved+s.score,possible:acc.possible+s.total}),{achieved:0,possible:0});
  return {students:list.length,evaluated:valid.length,missing:list.length-valid.length,
    passed:valid.filter(s=>s.current>=Number(settings.pass??50)).length,
    success:valid.length?round(100*valid.filter(s=>s.current>=Number(settings.pass??50)).length/valid.length):null,
    achievement:marks.possible?round(100*marks.achieved/marks.possible):null,
    high90:valid.length?round(100*valid.filter(s=>s.current>=90).length/valid.length):null,
    compared:compared.length,
    matchedPrevious:compared.length?round(compared.reduce((n,s)=>n+s.previous,0)/compared.length):null,
    matchedCurrent:compared.length?round(compared.reduce((n,s)=>n+s.current,0)/compared.length):null,
    valueAdded:compared.length?round(compared.reduce((n,s)=>n+s.change,0)/compared.length):null,
    improved:compared.filter(s=>s.change>0).length,declined:compared.filter(s=>s.change<0).length,stable:compared.filter(s=>s.change===0).length};
 };
 const classes=[...new Set(students.map(s=>s.className))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
 const groups=classes.map(className=>({className,students:students.filter(s=>s.className===className),...summary(students.filter(s=>s.className===className))}));
 return {teacher,subject,classFilter,subjectLabel:SR63.reportSubjectLabel(subject,settings),exam,examName:tj(settings,exam).name,
   prevExam,prevExamName:prevExam?tj(settings,prevExam).name:null,cohort,lower,upper,students,groups,
   bands:{low:students.filter(s=>s.band==='low'),middle:students.filter(s=>s.band==='middle'),high:students.filter(s=>s.band==='high'),missing:students.filter(s=>s.band==='missing')},...summary(students),studentCount:students.length,students,
   schoolName:settings.schoolName||'—',academicYear:settings.academicYear||'—',coordinator:SR63.subjectCoordinator(workspace,subject)||'',
   academicViceName:settings.academicViceName||'',principalName:settings.principalName||''};
};
SR63.teacherImprovementDefaults=function(subject){
 const key=SR63.subjectAliasKey(subject);
 let kind='general';
 if(/اسلام|شرع|قران|دين/.test(key))kind='islamic';
 else if(/عربي/.test(key))kind='arabic';
 else if(/انجليز|english/.test(key))kind='english';
 else if(/رياض/.test(key))kind='math';
 else if(/علوم|science/.test(key))kind='science';
 else if(/اجتماع|تاريخ|جغراف/.test(key))kind='social';
 else if(/حاسوب|حاسب|تكنولوج|رقمي/.test(key))kind='computer';
 else if(/فني|رسم|art/.test(key))kind='art';
 else if(/بدني|رياضة|sport/.test(key))kind='pe';
 const tailored={
 islamic:['تحديد مواضع التعثر في التلاوة والحفظ وأحكام التجويد من خلال تسميع تشخيصي قصير.','تنفيذ حلقات تدريب صغيرة على أحكام التجويد والتلاوة الصحيحة مع تغذية راجعة فردية.','إعداد بطاقات وأسئلة متدرجة لفهم المفاهيم الشرعية وربطها بمواقف حياتية.'],
 arabic:['تشخيص جوانب الضعف في القراءة الجهرية والفهم القرائي والإملاء والتراكيب.','تدريبات قصيرة متدرجة على القراءة والفهم وبناء الجمل مع تصحيح فوري.','إجراء تقويم كتابي وشفهي أسبوعي لمتابعة تحسن المهارات.'],
 english:['إجراء تشخيص لمهارات المفردات والقراءة والاستماع والتعبير الكتابي.','تطبيق مجموعات قراءة موجهة وأنشطة استماع ونطق مع بنك مفردات مصور.','تكليف الطلاب بمحادثات قصيرة وكتابة جمل وتقديم تغذية راجعة أسبوعية.'],
 math:['اختبار تشخيصي لتحديد أخطاء المفاهيم والخطوات في المهارات الحسابية.','تقديم أمثلة محلولة وتدريبات متدرجة من المحسوس إلى المجرد مع تصحيح الأخطاء.','تنفيذ اختبارات إتقان قصيرة ومسائل حياتية أسبوعيًا.'],
 science:['تحديد صعوبات فهم المصطلحات والمفاهيم والتفسير العلمي.','تنفيذ تجارب آمنة أو محاكاة مصورة وأنشطة ملاحظة وتصنيف.','استخدام خرائط مفاهيم وأسئلة استقصاء وتطبيق واختبارات قصيرة.'],
 social:['تحديد جوانب القصور في قراءة الخرائط والتسلسل الزمني والمفاهيم الاجتماعية.','تطبيق أنشطة تحليل صور وخرائط ومصادر تاريخية ومناقشات موجهة.','تقويم فهم المفاهيم بأسئلة تفسير ومقارنة وربط بالأحداث.'],
 computer:['قياس أداء الطلاب عمليًا في المهارات الرقمية المطلوبة.','تنفيذ مهام تطبيقية قصيرة خطوة بخطوة مع تدريب ثنائي موجه.','تقييم نواتج الأداء بمقياس تقدير وقائمة تحقق.'],
 art:['تحديد المهارات الفنية المطلوب تحسينها عبر منتج عملي قبلي.','تدريبات على الأدوات والتقنيات مع عرض نماذج وتغذية راجعة فردية.','تقييم المنتجات وفق معايير الإتقان والإبداع والتحسن.'],
 pe:['قياس المهارات الحركية الأساسية بملاحظة منظمة وتدريبات مناسبة وآمنة.','تخصيص محطات تدريب متدرجة وتنويع الممارسة وفق القدرة الفردية.','متابعة التقدم ببطاقة ملاحظة أداء تراعي السلامة والفروق الفردية.'],
 general:['تنفيذ تقويم تشخيصي يحدد المهارات المتعثرة بدقة.','إعداد أنشطة وأوراق عمل متدرجة وإعادة تعليم المهارات مع تغذية راجعة.','تطبيق تقويمات قصيرة ومقارنة تحسن الإتقان أسبوعيًا.']};
 return {lowActions:tailored[kind].join('\n')+'\nالتواصل مع الأسرة عند الحاجة وتوثيق خطة متابعة فردية.',
 middleActions:'إعداد مهام صفية متدرجة تزيد عمق الفهم، وتفعيل التعلم التعاوني والأقران، وتكليف الطلاب بتطبيقات قصيرة مع متابعة التغذية الراجعة.',
 highActions:'تكليف الطلاب بمشاريع وتحديات إثرائية، ومنحهم أدوار قيادة تعلم الأقران، وإشراكهم في المسابقات والأنشطة المتقدمة مع متابعة المحافظة على التفوق.',
 lowGoal:'رفع مستوى إتقان المهارات التي يكشفها الاختبار التشخيصي وتقليص فجوة الأداء.',
 middleGoal:'رفع التحصيل وتنمية مهارات التطبيق والمقارنة والتحليل من خلال أنشطة متدرجة.',
 highGoal:'المحافظة على التحصيل المرتفع وتعزيز البحث والتفكير العليا والإبداع.',
 lowIndicator:'تحسن قابل للقياس في اختبار بعدي مماثل للتشخيص لا يقل عن 5 نقاط مئوية حيثما تسمح نقطة البداية.',
 middleIndicator:'تحسن متوسط أداء الفئة بمقدار 3 نقاط مئوية على الأقل في التقييم القادم.',
 highIndicator:'المحافظة على مستوى 80% فأعلى والتقدم في مهمة إثرائية موثقة.'};
};
SR63.teacherReportNarrative=function(analysis){
 const change=analysis.valueAdded,parts=[];
 parts.push(`شملت النتائج ${analysis.studentCount} طالبًا موزعين على ${analysis.groups.length} شعبة، ورُصدت درجات ${analysis.evaluated} طالبًا، في حين توجد ${analysis.missing} حالة غير مرصودة أو غير محتسبة.`);
 parts.push(analysis.achievement===null?'لا توجد درجات حاضرة كافية لحساب التحصيل.':`بلغ التحصيل الأكاديمي ${analysis.achievement}% ونسبة النجاح ${analysis.success}% ونسبة الحاصلين على 90% فأعلى ${analysis.high90}%.`);
 if(analysis.prevExam)parts.push(change===null?`لم تتوافر درجات مزدوجة كافية للمقارنة مع «${analysis.prevExamName}».`:`بالمقارنة مع «${analysis.prevExamName}» بلغ متوسط التغير ${change>0?'+':''}${change} نقطة مئوية بين ${analysis.compared} طالبًا لديهم نتيجتان؛ تحسن ${analysis.improved} طالبًا، وتراجع ${analysis.declined}، واستقر ${analysis.stable}.`);
 parts.push('الدرجات وحدها لا تثبت أسباب ارتفاع أو انخفاض الأداء؛ تُستكمل الأسباب بتشخيص المهارات وملاحظات المعلم، وتُراجع إجراءات العلاج والإثراء بعد التقويم اللاحق.');
 return parts.join(' ');
};
