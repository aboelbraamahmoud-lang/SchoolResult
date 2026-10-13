/* SchoolResult 6.10.40: one whole-school quantitative + descriptive report for principal/vice.
   Strictly school-wide: no teacher/department selector, no access outside staff-scoped data. */
(function(){
 const round=n=>Math.round(n*10)/10;
 const fmt=n=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(1)+'%':'—';
 const diff=n=>typeof n==='number'&&Number.isFinite(n)?(n>0?'+':'')+n.toFixed(1)+' نقطة':'—';
 const gradeName={'7':'السابع','8':'الثامن','9':'التاسع'};
 SR63.schoolQuantitativeAnalyze=function(workspace,exam){
  const settings=workspace?.settings||{},examIds=(settings.exams||[]).map(x=>x.key),index=examIds.indexOf(exam),previous=index>0?examIds[index-1]:null;
  const exams=settings.exams||[],totalFor=(row,e)=>Number(row.totals?.[e]??exams.find(x=>x.key===e)?.total),scoreFor=(row,e)=>{
   if(!e||row.statuses?.[e]!=='present')return null;
   const score=row.scores?.[e],max=totalFor(row,e);
   return typeof score==='number'&&Number.isFinite(score)&&Number.isFinite(max)&&max>0?{score,max,percent:100*score/max}:null;
  };
  const entries=new Map();
  for(const r of workspace?.rows||[]){
   if(SR63.isSupportRow(r,exam))continue;
   const grade=SR63.departmentGradeKey(r,exam);if(!gradeName[grade])continue;
   const id=String(r.studentId||r.studentName||'').trim(),subject=String(r.subject||'').trim(),klass=String(r.examClasses?.[exam]||r.className||'').trim();
   if(!id||!subject)continue;
   const key=grade+'|'+id+'|'+subject;
   if(!entries.has(key)||!scoreFor(entries.get(key).row,exam)&&scoreFor(r,exam))entries.set(key,{row:r,grade,id,klass});
  }
  const list=[...entries.values()].map(({row,grade,id,klass})=>({row,grade,id,klass,current:scoreFor(row,exam),previous:scoreFor(row,previous)}));
  const summarize=items=>{
   const current=items.filter(x=>x.current),previousRows=items.filter(x=>x.previous),paired=items.filter(x=>x.current&&x.previous);
   const possible=current.reduce((a,x)=>a+x.current.max,0),earned=current.reduce((a,x)=>a+x.current.score,0);
   const prevPossible=previousRows.reduce((a,x)=>a+x.previous.max,0),prevEarned=previousRows.reduce((a,x)=>a+x.previous.score,0),pass=Number(settings.pass??50);
   return {records:items.length,evaluated:current.length,ungraded:items.length-current.length,compared:paired.length,
    studentCount:new Set(items.map(x=>x.grade+'|'+x.id)).size,success:current.length?round(100*current.filter(x=>x.current.percent>=pass).length/current.length):null,
    achievement:possible?round(100*earned/possible):null,previousAchievement:prevPossible?round(100*prevEarned/prevPossible):null,
    valueAdded:paired.length?round(paired.reduce((n,x)=>n+x.current.percent-x.previous.percent,0)/paired.length):null,
    high90:current.length?round(100*current.filter(x=>x.current.percent>=90).length/current.length):null};
  };
  return {schoolName:settings.schoolName||'',academicYear:settings.academicYear||'',principalName:settings.principalName||'',academicViceName:settings.academicViceName||'',exam,examName:exams.find(x=>x.key===exam)?.name||exam,
   previousExam:previous,previousExamName:exams.find(x=>x.key===previous)?.name||null,grades:Object.fromEntries(['7','8','9'].map(g=>[g,{grade:g,label:gradeName[g],...summarize(list.filter(x=>x.grade===g))}])),...summarize(list)};
 };
 SR63.schoolReportRecommendations=function(report){
  const suggestions=[];
  if(report.evaluated===0)return 'لا تتوافر نتائج مرصودة لإصدار توصيات كمية؛ يُرجى استكمال رصد نتائج الاختبار أولًا.';
  if(report.success!==null&&report.success<80)suggestions.push('تحليل أسئلة ومهارات المقررات التي ظهرت فيها نتائج دون المستهدف، ثم إعداد تدخلات تعليمية قصيرة وإعادة قياس أثرها.');
  if(report.valueAdded!==null&&report.valueAdded<0)suggestions.push('متابعة الصفوف التي انخفض فيها التحصيل بين التقييمين، والتحقق من تباين مستويات صعوبة الاختبارين قبل تفسير أسباب التراجع.');
  if(report.ungraded)suggestions.push(`مراجعة ${report.ungraded} نتيجة غير مرصودة أو غير محتسبة دون التعامل معها بوصفها درجة صفر.`);
  if(report.high90!==null&&report.high90>=25)suggestions.push('الاستمرار في أنشطة الإثراء للطلاب مرتفعي التحصيل، مع مراجعة المؤشرات بعد الاختبار التالي.');
  if(!suggestions.length)suggestions.push('استمرار متابعة نسب النجاح والتحصيل حسب الصف، ومراجعة خطة التحسين في ضوء تقويم تشخيصي وقياسات دورية موثقة.');
  suggestions.push('توثيق الإجراءات والمسؤولين ومؤشرات الإنجاز ومواعيد المراجعة على مستوى المدرسة، دون افتراض أسباب لم تثبتها البيانات.');
  return suggestions.join('\n');
 };
 const metrics=[['نسبة النجاح','success','percent'],['التحصيل الأكاديمي','achievement','percent'],['تحصيل الاختبار السابق','previousAchievement','percent'],['القيمة المضافة (عينة مشتركة)','valueAdded','delta'],['نسبة نتائج 90% فأعلى','high90','percent']];
 SR63.schoolQuantitativeWordBuild=function(r,edits={}){
  if(typeof SR63.teacherWordKit!=='function')throw Error('تعذر تحميل مُنشئ مستندات Word.');
  const kit=SR63.teacherWordKit({schoolName:r.schoolName,teacher:'إدارة المدرسة',vice:r.academicViceName,principal:r.principalName},{landscape:true});
  const {p,heading,gridTable,make}=kit,format=(n,type)=>type==='delta'?diff(n):fmt(n);
  let body=p('التقرير الكمي والوصفي للمدرسة كاملة',{size:30,bold:true,color:'920D39',center:true,after:95});
  body+=p('تحليل نتائج '+r.examName+' — العام الأكاديمي '+r.academicYear,{size:20,bold:true,center:true,after:95});
  body+=p('اسم المدرسة: '+r.schoolName+' — الصفوف السابع والثامن والتاسع',{size:18,bold:true,after:90});
  body+=p('المؤشرات تشمل جميع الأقسام والمواد والشعب المدرسية دون تقسيم إلى تقارير معلمين أو أقسام؛ لا يُعدّ عدم الرصد صفرًا.',{size:17,after:70});
  const cols=[['بنود التقرير','السابع','الثامن','التاسع','إجمالي المدرسة','تحقيق المستهدف']];
  for(const [label,key,formatType] of metrics){if(key==='previousAchievement'&&!r.previousExam||key==='valueAdded'&&!r.previousExam)continue;cols.push([label,...['7','8','9'].map(g=>format(r.grades[g][key],formatType)),format(r[key],formatType),edits.targets?.[key]!==undefined&&edits.targets?.[key]!==''&&Number.isFinite(Number(edits.targets?.[key]))?(r[key]===null?'غير متاح':Number(r[key])>=Number(edits.targets[key])?'متحقق':'غير متحقق'):'غير محدد']);}
  cols.push(['عدد النتائج المرصودة',...['7','8','9'].map(g=>String(r.grades[g].evaluated)),String(r.evaluated),'—']);
  cols.push(['عدد الطلاب المختلفين',...['7','8','9'].map(g=>String(r.grades[g].studentCount)),String(r.studentCount),'—']);
  body+=gridTable(cols,[3450,1600,1600,1600,1850,1500],{head:true,size:17,compact:false,alternate:true});
  body+=p('تنبيه منهجي: النسب مبنية على سجلات طالب × مادة مرصودة؛ العدد الفريد للطلاب يظهر مستقلًا، والقيمة المضافة تستعمل السجلات ذات نتيجتين فعليتين فقط.',{size:16,color:'526B77',after:110});
  body+=heading('التحليل الوصفي لنتائج المدرسة');body+=p(edits.interpretation?.trim()||SR63.schoolReportNarrative(r),{size:18,after:90});
  body+=heading('التوصيات وخطة التحسين على مستوى المدرسة');body+=p(edits.recommendations?.trim()||SR63.schoolReportRecommendations(r),{size:18,after:90});
  body+=heading('اعتماد التقرير');body+=gridTable([['جهة الاعتماد','الاسم','التوقيع'],['النائب الأكاديمي',r.academicViceName||'........................','........................'],['مدير المدرسة',r.principalName||'........................','........................']],[2900,5100,2900],{size:17,head:true});
  return make(body,'التقرير-الكمي-والوصفي-للمدرسة-'+r.examName);
 };
 SR63.schoolReportNarrative=function(r){return `شمل التقرير ${r.studentCount} طالبًا مختلفًا، و${r.evaluated} نتيجة مرصودة من أصل ${r.records} سجل طالب ومادة ضمن التعليم العام. بلغت نسبة النجاح ${fmt(r.success)}، والتحصيل ${fmt(r.achievement)}، ونسبة النتائج التي حققت 90% فأكثر ${fmt(r.high90)}. `+
  (r.previousExam?`بلغت القيمة المضافة ${diff(r.valueAdded)} اعتمادًا على ${r.compared} سجلًا ذا نتيجتين فعليتين بين ${r.previousExamName} و${r.examName}. `:'لا يوجد تقييم سابق مباشر لحساب قيمة مضافة. ')+
  `بلغ عدد السجلات غير المرصودة ${r.ungraded}، ولا تُعامل كدرجات صفرية. لا يُستنتج سبب النجاح أو التعثر من هذه المؤشرات وحدها.`;};
 SR63.SchoolQuantitativePage=function({workspace,canExport=true}){
  const [interpretation,setInterpretation]=(0,v.useState)(''),[recommendations,setRecommendations]=(0,v.useState)(''),[targets,setTargets]=(0,v.useState)({success:'',achievement:'',valueAdded:'',high90:''}),[problem,setProblem]=(0,v.useState)('');
  const exam=workspace.activeExam;const report=(0,v.useMemo)(()=>SR63.schoolQuantitativeAnalyze(workspace,exam),[workspace,exam]);
  const suggestion=recommendations||SR63.schoolReportRecommendations(report),narrative=interpretation||SR63.schoolReportNarrative(report);
  const h=(tag,props,children)=>(0,q.jsx)(tag,{...props,children});
  const chart=SR63.staffReportBarChart('مقارنة تحصيل الصفوف على مستوى المدرسة',['7','8','9'].map(g=>({name:'الصف '+gradeName[g],value:report.grades[g].achievement,second:report.grades[g].success})),{two:true,color:'#1b8d80',secondColor:'#c39130'});
  const print=()=>{try{SR63.staffPrintHtml({title:'التقرير الكمي والوصفي للمدرسة كاملة',subtitle:'الاختبار: '+report.examName,body:SR63.staffReportBarChart('تحصيل الصفوف ونجاحها',['7','8','9'].map(g=>({name:gradeName[g],value:report.grades[g].achievement,second:report.grades[g].success})),{two:true})+'<section class="sr640-section"><h3>المؤشرات الأكاديمية لجميع صفوف المدرسة</h3>'+SR63.schoolReportTableHtml(report,targets)+'</section><h3>التحليل الوصفي</h3><p>'+SR63.staffReportEsc(narrative)+'</p><h3>التوصيات وخطة التحسين المدرسية</h3><p style="white-space:pre-wrap">'+SR63.staffReportEsc(suggestion)+'</p>'},{schoolName:report.schoolName,academicYear:report.academicYear,principalName:report.principalName});}catch(e){setProblem(e.message);}};
  const download=()=>{try{if(!canExport)throw Error('ليس لديك صلاحية تصدير التقرير.');const doc=SR63.schoolQuantitativeWordBuild(report,{interpretation,recommendations,targets});SR63.teacherWordDownload(doc);setProblem('');}catch(e){setProblem(e.message);}};
  const rows=metrics.filter(([_,key])=>report.previousExam||!['previousAchievement','valueAdded'].includes(key));
  return h('main',{className:'sr619-teacher-center sr640-school-report',dir:'rtl'},[
   h('header',{className:'sr616-title'},[h('h1',{},'التقرير الكمي والوصفي للمدرسة كاملة'),h('p',{},'تقرير مدرسي واحد يضم جميع الأقسام والمواد والصفوف، مع التحليل الوصفي والتوصيات المدرسية، دون تحديد معلم أو قسم.')]),
   h('section',{className:'sr619-card'},[h('h2',{},'مؤشرات '+report.examName),h('p',{},'التعليم العام · العام الأكاديمي '+report.academicYear+' · عدد الطلاب المختلفين '+report.studentCount),h('div',{className:'srstaff-kpis srcoord-kpis'},[
    ...[['نتائج مرصودة',report.evaluated],['نسبة النجاح',fmt(report.success)],['نسبة التحصيل',fmt(report.achievement)],['القيمة المضافة',diff(report.valueAdded)],['الحالات غير المرصودة',report.ungraded],['الطلاب الفريدون',report.studentCount]].map(([a,b])=>h('article',{key:a},[h('span',{},a),h('strong',{},b)]))
   ]),h('div',{className:'sr640-chart-live',dangerouslySetInnerHTML:{__html:chart}}),
   h('div',{className:'srstaff-scroll'},h('table',{},[h('thead',{},h('tr',{},['المؤشر','السابع','الثامن','التاسع','إجمالي المدرسة'].map(x=>h('th',{key:x},x)))),
    h('tbody',{},rows.map(([label,key,formatType])=>h('tr',{key},[label,...['7','8','9'].map(g=>formatType==='delta'?diff(report.grades[g][key]):fmt(report.grades[g][key])),formatType==='delta'?diff(report[key]):fmt(report[key])].map((x,i)=>h('td',{key:i},x)))))])),
   h('h3',{},'المستهدفات المعتمدة من خطة المدرسة التشغيلية'),
   h('p',{},'المستهدفات غير مفترضة؛ أدخل القيم التي اعتمدتها المدرسة لتظهر حالة تحقيق المستهدف.'),
   h('div',{className:'sr640-targets'},[['success','مستهدف النجاح (%)'],['achievement','مستهدف التحصيل (%)'],['valueAdded','مستهدف القيمة المضافة (نقطة)'],['high90','مستهدف نتائج 90% فأعلى (%)']].map(([key,label])=>h('label',{key},[h('span',{},label),h('input',{type:'number',step:'0.1',min:key==='valueAdded'?-100:0,max:100,value:targets[key],onChange:e=>setTargets(old=>({...old,[key]:e.target.value}))})]))),
   h('h3',{},'تفسير النتائج على مستوى المدرسة'),h('textarea',{rows:4,maxLength:3800,value:interpretation,onChange:e=>setInterpretation(e.target.value),placeholder:SR63.schoolReportNarrative(report)}),
   h('h3',{},'التوصيات وخطة التحسين المدرسية'),h('textarea',{rows:6,maxLength:4000,value:recommendations,onChange:e=>setRecommendations(e.target.value),placeholder:SR63.schoolReportRecommendations(report)}),
   h('p',{className:'sr640-note'},'اترك الحقول فارغة لإصدار الوصف والتوصيات المبنية على المؤشرات، ويمكن تعديلها قبل التصدير. لا تشمل التقرير بيانات شخصية للطلاب.'),
   problem?h('p',{className:'srstaff-alert',role:'alert'},problem):null,
   h('div',{className:'sr640-actions'},[h('button',{type:'button',disabled:!canExport,onClick:download},'تنزيل تقرير المدرسة Word'),h('button',{type:'button',disabled:!canExport,onClick:print},'طباعة التقرير / حفظ PDF')])
   ])
  ]);
 };
 SR63.schoolReportTableHtml=function(r,targets={}){const esc=SR63.staffReportEsc;return `<table class="sr640-table"><thead><tr><th>المؤشر</th><th>السابع</th><th>الثامن</th><th>التاسع</th><th>إجمالي المدرسة</th><th>تحقيق المستهدف</th></tr></thead><tbody>${metrics.filter(([_,key])=>r.previousExam||!['previousAchievement','valueAdded'].includes(key)).map(([label,key,type])=>`<tr><th>${esc(label)}</th>${['7','8','9'].map(g=>`<td>${esc(type==='delta'?diff(r.grades[g][key]):fmt(r.grades[g][key]))}</td>`).join('')}<td>${esc(type==='delta'?diff(r[key]):fmt(r[key]))}</td><td>${esc(targets[key]!==undefined&&targets[key]!==''&&Number.isFinite(Number(targets[key]))?(r[key]===null?'غير متاح':r[key]>=Number(targets[key])?'متحقق':'غير متحقق'):'غير محدد')}</td></tr>`).join('')}</tbody></table>`;};
})();
