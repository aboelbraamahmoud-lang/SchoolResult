/* SchoolResult 6.10.40: one whole-school quantitative + descriptive report for principal/vice.
   Strictly school-wide: no teacher/department selector, no access outside staff-scoped data. */
(function(){
 const round=n=>Math.round(n*10)/10;
 const fmt=n=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(1)+'%':'—';
 const diff=n=>typeof n==='number'&&Number.isFinite(n)?(n>0?'+':'')+n.toFixed(1)+' نقطة':'—';
 const gradeName={'7':'السابع','8':'الثامن','9':'التاسع'};
 /* Match the dashboard's canonical subject catalogue; selection is report-only. */
 SR63.schoolQuantitativeSubjectChoices=function(workspace,exam=workspace.activeExam){
  const seen=new Map(),settings=workspace?.settings||{};
  for(const row of workspace?.rows||[]){
   if(SR63.isSupportRow(row,exam)||!gradeName[SR63.departmentGradeKey(row,exam)])continue;
   const subject=String(row.subject||'').trim(),key=SR63.subjectAliasKey(subject);
   if(key&&!seen.has(key))seen.set(key,{key,name:SR63.reportSubjectLabel(subject,settings)});
  }
  return [...seen.values()].sort((a,b)=>SR63.reportSubjectCompare(a.name,b.name,settings));
 };
 SR63.schoolQuantitativeDashboardSubjects=function(workspace,exam=workspace.activeExam){
  const choices=SR63.schoolQuantitativeSubjectChoices(workspace,exam),active=SR63.dashboardIncludedSubjects(workspace);
  return choices.filter(item=>active.some(name=>SR63.subjectEquivalent(name,item.name)||SR63.subjectAliasKey(name)===item.key)).map(item=>item.key);
 };
 SR63.schoolQuantitativeAnalyze=function(workspace,exam,subjectSelection=null){
  const settings=workspace?.settings||{},examIds=(settings.exams||[]).map(x=>x.key),index=examIds.indexOf(exam),previous=index>0?examIds[index-1]:null;
  const availableSubjects=SR63.schoolQuantitativeSubjectChoices(workspace,exam),
    selection=subjectSelection===null||subjectSelection===undefined?null:new Set((Array.isArray(subjectSelection)?subjectSelection:[]).map(x=>SR63.subjectAliasKey(String(x))).filter(Boolean)),
    includedSubjects=availableSubjects.filter(item=>!selection||selection.has(item.key)),
    excludedSubjects=availableSubjects.filter(item=>selection&&!selection.has(item.key)),
    subjectScopeLabel=selection?'المواد المختارة: '+(includedSubjects.map(item=>item.name).join('، ')||'لا توجد مواد محددة'):'جميع مواد المدرسة';
   const exams=settings.exams||[],totalFor=(row,e)=>Number(row.totals?.[e]??exams.find(x=>x.key===e)?.total),scoreFor=(row,e)=>{
   if(!e||row.statuses?.[e]!=='present')return null;
   const score=row.scores?.[e],max=totalFor(row,e);
   return typeof score==='number'&&Number.isFinite(score)&&Number.isFinite(max)&&max>0?{score,max,percent:100*score/max}:null;
  };
  const entries=new Map();
  for(const r of workspace?.rows||[]){
   if(SR63.isSupportRow(r,exam)||selection&&!selection.has(SR63.subjectAliasKey(r.subject)))continue;
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
  return {scopeMode:selection?'selected':'all',availableSubjects,includedSubjects,excludedSubjects,
    subjectScopeLabel,subjectCount:includedSubjects.length,excludedCount:excludedSubjects.length,
    schoolName:settings.schoolName||'',academicYear:settings.academicYear||'',principalName:settings.principalName||'',academicViceName:settings.academicViceName||'',exam,examName:exams.find(x=>x.key===exam)?.name||exam,
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
 // Reuse the precise, approved departmental quantitative/descriptive Word
 // form: official headers, borders, RTL cells, metric slots and signatures.
 // One school-wide page only, with the three columns representing grades 7-9.
 SR63.schoolQuantitativeWordBuild=function(r,edits={}){
  if(!r?.grades)throw Error('لا توجد بيانات صالحة لتقرير المدرسة.');
  const groups=['7','8','9'].map(g=>({
   ...r.grades[g],className:'الصف '+gradeName[g],currentAchievement:r.grades[g]?.achievement??null
  }));
  const analysis={...r,groups,prevExam:r.previousExam||null,prevExamName:r.previousExamName||null,
   currentAchievement:r.achievement??null,subjectLabel:r.subjectScopeLabel||'جميع مواد المدرسة',departmentName:'المدرسة',
   teacher:r.academicViceName||'النائب الأكاديمي'};
  return SR63.teacherQuantitativeWordBuild(analysis,{
   schoolMode:true,targets:edits.targets||{},
   interpretation:(r.subjectScopeLabel||'جميع مواد المدرسة')+'؛ '+(edits.interpretation||SR63.schoolReportNarrative(r)),
   feedback:edits.recommendations||SR63.schoolReportRecommendations(r)
  });
 };
 SR63.schoolReportNarrative=function(r){return `شمل التقرير ${r.studentCount} طالبًا مختلفًا، و${r.evaluated} نتيجة مرصودة من أصل ${r.records} سجل طالب ومادة ضمن التعليم العام. بلغت نسبة النجاح ${fmt(r.success)}، والتحصيل ${fmt(r.achievement)}، ونسبة النتائج التي حققت 90% فأكثر ${fmt(r.high90)}. `+
  (r.previousExam?`بلغت القيمة المضافة ${diff(r.valueAdded)} اعتمادًا على ${r.compared} سجلًا ذا نتيجتين فعليتين بين ${r.previousExamName} و${r.examName}. `:'لا يوجد تقييم سابق مباشر لحساب قيمة مضافة. ')+
  `بلغ عدد السجلات غير المرصودة ${r.ungraded}، ولا تُعامل كدرجات صفرية. لا يُستنتج سبب النجاح أو التعثر من هذه المؤشرات وحدها.`;};
 // Word and PDF are now two renderers for one *official-form* data model:
 // identical metric slots, targets, interpretation, signatories and school scope.
 SR63.schoolQuantitativeOfficialRows=function(report,edits={}){
  if(!report?.grades)throw Error('لا توجد بيانات صالحة لتقرير المدرسة.');
  const target=edits.targets||{},analysis={...report,prevExam:report.previousExam||null,prevExamName:report.previousExamName||null,
   currentAchievement:report.achievement,subjectLabel:report.subjectScopeLabel||'جميع مواد المدرسة'},rows=SR63.departmentQuantitativeMetricRows(analysis);
  const display=(object,key,format)=>{
   const value=(key==='currentAchievement'?object?.achievement:object?.[key]);
   if(typeof value!=='number'||!Number.isFinite(value))return '—';
   return format==='delta'?(value>0?'+':'')+value.toFixed(1)+' نقطة':format==='percentage'?value.toFixed(1)+'%':value.toFixed(value%1===0?0:1);
  };
  const status=row=>{
   if(row.key==='previousAchievement')return 'غير محدد';
   const input=target[row.target],num=typeof input==='string'&&input.trim()?Number(input):typeof input==='number'?input:NaN;
   if(!Number.isFinite(num)||num<(row.target==='valueAdded'?-100:0)||num>100)return 'غير محدد';
   const value=(row.key==='currentAchievement'?report.achievement:report[row.key]);
   return typeof value==='number'&&Number.isFinite(value)?value>=num?'متحقق':'غير متحقق':'—';
  };
  return rows.map(row=>({slot:row.slot,label:row.label,grades:['7','8','9'].map(g=>display(report.grades[g],row.key,row.format)),school:display(report,row.key,row.format),target:status(row)}));
 };
 SR63.schoolQuantitativePrintBuild=function(report,edits={}){
  const esc=SR63.staffReportEsc,rows=SR63.schoolQuantitativeOfficialRows(report,edits),
   narrative=edits.interpretation||SR63.schoolReportNarrative(report),
   feedback=edits.recommendations||SR63.schoolReportRecommendations(report);
  const officialIntro='بصفتي النائب الأكاديمي أرفع إلى سيادتكم التقرير الكمي والوصفي لنتائج '+report.examName+' على مستوى المدرسة، متضمنًا المؤشرات والتحليل والتوصيات، عن '+(report.subjectScopeLabel||'جميع مواد المدرسة')+'.';
   const scopeNote='المواد الداخلة في الحساب: '+(report.subjectScopeLabel||'جميع مواد المدرسة')+' ('+(report.subjectCount??0)+' مادة). '+
    (report.excludedSubjects?.length?'المواد المستبعدة: '+report.excludedSubjects.map(x=>x.name).join('، ')+'. ':'')+
    'نسبة النجاح = النتائج الناجحة ÷ النتائج المرصودة؛ ونسبة التحصيل = مجموع الدرجات المحصّلة ÷ مجموع الدرجات الكلية للنتائج المرصودة، في المواد الداخلة في الحساب فقط.';
  const cell=value=>'<td>'+esc(value)+'</td>';
  const body=`<main class="sr644-official-doc" dir="rtl">
   <header class="sr644-official-header"><div class="sr644-ministry"><img src="__OFFICIAL_LOGO__" alt="شعار وزارة التربية والتعليم والتعليم العالي"/><span>وزارة التربية والتعليم والتعليم العالي<br/>إدارة التوجيه التربوي</span></div><h1>نموذج تقرير كمي وصفي</h1><h2>لتحليل نتائج ${esc(report.examName)} على مستوى ${esc(report.schoolName||'المدرسة')} - ${esc(report.academicYear)}م</h2></header>
   <section class="sr644-official-intro"><p><b>السيد الفاضل/ مدير المدرسة: ${esc(report.principalName||'........................')}</b></p><p>${esc(officialIntro)}</p><p class="sr682-scope">${esc(scopeNote)}</p></section>
   <table class="sr644-official-table"><thead><tr><th class="sr644-metric-label">بنود التقرير</th><th>الصف السابع</th><th>الصف الثامن</th><th>الصف التاسع</th><th>إجمالي المدرسة</th><th>تحقيق المستهدف</th></tr></thead><tbody>${rows.map(row=>'<tr><th>'+esc(row.label)+'</th>'+row.grades.map(cell).join('')+cell(row.school)+cell(row.target)+'</tr>').join('')}</tbody></table>
   <section class="sr644-official-prose"><h3>تفسير النتائج</h3><p>${esc(narrative).replace(/\n/g,'<br>')}</p><h3>توصيات النائب الأكاديمي المرفوعة إلى مدير المدرسة</h3><p>${esc(feedback).replace(/\n/g,'<br>')}</p></section>
   <table class="sr644-signature-table"><thead><tr><th>اسم النائب الأكاديمي وتوقيعه</th><th>اطلاع واعتماد مدير المدرسة</th></tr></thead><tbody><tr><td><strong>${esc(report.academicViceName||'........................')}</strong><div class="sr644-sign-line">التوقيع: ______________________</div></td><td><strong>${esc(report.principalName||'........................')}</strong><div class="sr644-sign-line">التوقيع: ______________________</div></td></tr></tbody></table>
   <footer class="sr644-print-footer">تقرير كمي ووصفي على مستوى المدرسة — ${esc(report.academicYear)}</footer>
  </main>`;
  return {official:true,title:'نموذج تقرير كمي وصفي',body,
   css:`@page{size:A4 portrait;margin:13mm 13mm 12mm}*{box-sizing:border-box}html,body{margin:0;background:#fff;color:#151515;direction:rtl;font-family:'Traditional Arabic','Times New Roman',Tahoma,serif;font-size:14px;line-height:1.65}.sr644-official-doc{max-width:185mm;margin:0 auto;direction:rtl}.sr644-official-header{text-align:center}.sr644-ministry{display:flex;align-items:center;justify-content:space-between;text-align:right;gap:18px;color:#6f2946;font-size:13px;min-height:65px}.sr644-ministry img{max-width:170px;max-height:70px;object-fit:contain}.sr644-official-header h1{font-size:20px;text-decoration:underline;margin:8px 0 3px;color:#111;font-weight:900}.sr644-official-header h2{font-size:13px;font-weight:700;margin:0 0 10px;color:#111}.sr644-official-intro{font-size:14px;line-height:1.75;margin:8px 0 13px}.sr644-official-intro p{margin:6px 0}.sr682-scope{font-size:11px;line-height:1.5;background:#f3f7f8;border:1px solid #cbd9de;padding:5px 8px;overflow-wrap:anywhere}.sr644-official-table,.sr644-signature-table{width:100%;border-collapse:collapse;table-layout:fixed;direction:rtl;font-size:12px}.sr644-official-table td,.sr644-official-table th,.sr644-signature-table td,.sr644-signature-table th{border:1px solid #242424;padding:6px 5px;vertical-align:middle;text-align:center;line-height:1.4;overflow-wrap:anywhere}.sr644-official-table th.sr644-metric-label{width:28%}.sr644-official-table thead th,.sr644-signature-table thead th{background:#770b34;color:#fff;font-weight:900;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sr644-official-table tbody th{background:#e8e8e8;font-weight:800;text-align:right}.sr644-official-table tbody td{background:#f2f2f2}.sr644-official-prose{margin-top:13px;line-height:1.65;font-size:14px}.sr644-official-prose h3{background:#770b34;color:#fff;padding:5px 10px;font-size:14px;margin:9px 0 5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sr644-official-prose p{margin:4px 0 9px;white-space:normal}.sr644-signature-table{margin-top:12px}.sr644-signature-table td{height:66px;text-align:center}.sr644-sign-line{margin-top:10px;color:#555}.sr644-print-footer{text-align:center;color:#666;font-size:10px;margin-top:6px}@media print{.sr644-official-doc{max-width:none}tr,.sr644-signature-table,.sr644-official-prose h3{break-inside:avoid;page-break-inside:avoid}}`};
 };
 SR63.SchoolQuantitativePage=function({workspace,canExport=true}){
  const [interpretation,setInterpretation]=(0,v.useState)(''),[recommendations,setRecommendations]=(0,v.useState)(''),[targets,setTargets]=(0,v.useState)({success:'',achievement:'',valueAdded:'',high90:''}),[problem,setProblem]=(0,v.useState)(''),[exporting,setExporting]=(0,v.useState)(false);
  const [selectedSubjects,setSelectedSubjects]=(0,v.useState)(null);
   const exam=workspace.activeExam;
   const subjectChoices=(0,v.useMemo)(()=>SR63.schoolQuantitativeSubjectChoices(workspace,exam),[workspace,exam]);
   const includedKeys=selectedSubjects===null?subjectChoices.map(x=>x.key):subjectChoices.filter(x=>selectedSubjects.includes(x.key)).map(x=>x.key);
   const dashboardPreset=SR63.schoolQuantitativeDashboardSubjects(workspace,exam);
   const toggleSubject=key=>setSelectedSubjects(current=>{
    const prior=current===null?subjectChoices.map(x=>x.key):current;
    return prior.includes(key)?prior.filter(x=>x!==key):[...prior,key];
   });
   const report=(0,v.useMemo)(()=>SR63.schoolQuantitativeAnalyze(workspace,exam,selectedSubjects),[workspace,exam,selectedSubjects]);
  const suggestion=recommendations||SR63.schoolReportRecommendations(report),narrative=interpretation||SR63.schoolReportNarrative(report);
  const h=(tag,props,children)=>(0,q.jsx)(tag,{...props,children});
  const chart=SR63.staffReportBarChart('مقارنة تحصيل الصفوف على مستوى المدرسة',['7','8','9'].map(g=>({name:'الصف '+gradeName[g],value:report.grades[g].achievement,second:report.grades[g].success})),{two:true,color:'#1b8d80',secondColor:'#c39130'});
  const print=()=>{try{
     if(!canExport)throw Error('ليس لديك صلاحية طباعة هذا التقرير.');
     if(!report.subjectCount)throw Error('اختر مادة واحدة على الأقل قبل الطباعة.');
    SR63.staffPrintHtml(SR63.schoolQuantitativePrintBuild(report,{targets,interpretation:narrative,recommendations:suggestion}),{schoolName:report.schoolName,academicYear:report.academicYear,principalName:report.principalName});
    setProblem('');
   }catch(e){setProblem(e.message||'تعذر طباعة التقرير.');}};
  const download=async()=>{if(exporting)return;setExporting(true);setProblem('');try{
    if(!canExport)throw Error('ليس لديك صلاحية تصدير التقرير.');
     if(!report.subjectCount)throw Error('اختر مادة واحدة على الأقل قبل التصدير.');
    await SR63.loadWordTemplate('reference');
    const doc=SR63.schoolQuantitativeWordBuild(report,{interpretation,recommendations,targets});
    SR63.teacherWordDownload(doc);
   }catch(e){setProblem(e.message||'تعذر تصدير التقرير الرسمي.');}finally{setExporting(false);}};
  const rows=metrics.filter(([_,key])=>report.previousExam||!['previousAchievement','valueAdded'].includes(key));
  return h('main',{className:'sr619-teacher-center sr640-school-report',dir:'rtl'},[
   h('header',{className:'sr616-title'},[h('h1',{},'التقرير الكمي والوصفي'),h('p',{},'تقرير نجاح وتحصيل المدرسة للمواد المختارة مع تفصيل الصفوف السابع والثامن والتاسع، وفق النموذج الرسمي. لا تتغير البيانات الأصلية عند اختيار المواد.')]),
   h('section',{className:'sr619-card sr682-subject-selector'},[
     h('h2',{},'اختيار المواد الداخلة في نجاح وتحصيل المدرسة'),
     h('p',{},'يمكنك احتساب جميع المواد، أو المواد الأساسية فقط، أو أي مجموعة محددة. هذا الاختيار خاص بالتقرير ومعاينته وطباعته، ولا يغيّر إعدادات لوحة التحكم.'),
     h('div',{className:'sr682-scope-actions'},[
      h('button',{type:'button',onClick:()=>setSelectedSubjects(null),className:selectedSubjects===null?'is-active':''},'كل المواد'),
      h('button',{type:'button',onClick:()=>setSelectedSubjects(dashboardPreset)},'مواد لوحة التحكم ('+dashboardPreset.length+')'),
      h('button',{type:'button',onClick:()=>setSelectedSubjects([])},'إلغاء تحديد الكل')
     ]),
     h('div',{className:'sr682-subject-choices'},subjectChoices.map(item=>
      h('label',{key:item.key,className:includedKeys.includes(item.key)?'is-selected':''},[
       h('input',{type:'checkbox',checked:includedKeys.includes(item.key),onChange:()=>toggleSubject(item.key)}),
       h('span',{},item.name)
      ])
     )),
     h('p',{className:'sr682-selection-info'},'المواد المحتسبة: '+report.subjectCount+' من '+subjectChoices.length+' · المواد المستبعدة: '+report.excludedCount),
     !report.subjectCount?h('p',{className:'srstaff-alert',role:'alert'},'اختر مادة واحدة على الأقل لحساب النتائج وإصدار التقرير.'):null
    ]),
    h('section',{className:'sr619-card'},[h('div',{className:'sr641-report-address'},[h('p',{},'إلى: مدير المدرسة / '+(report.principalName||'........................')),h('p',{},'من: النائب الأكاديمي / '+(report.academicViceName||'........................'))]),h('h2',{},'مؤشرات '+report.examName),h('p',{},'التعليم العام · العام الأكاديمي '+report.academicYear+' · عدد الطلاب المختلفين '+report.studentCount),h('p',{className:'sr682-report-scope'},'نطاق التقرير: '+report.subjectScopeLabel),h('div',{className:'srstaff-kpis srcoord-kpis'},[
    ...[['نتائج مرصودة',report.evaluated],['نسبة النجاح',fmt(report.success)],['نسبة التحصيل',fmt(report.achievement)],['القيمة المضافة',diff(report.valueAdded)],['الحالات غير المرصودة',report.ungraded],['الطلاب الفريدون',report.studentCount]].map(([a,b])=>h('article',{key:a},[h('span',{},a),h('strong',{},b)]))
   ]),h('div',{className:'sr640-chart-live',dangerouslySetInnerHTML:{__html:chart}}),
   h('div',{className:'srstaff-scroll'},h('table',{},[h('thead',{},h('tr',{},['المؤشر','السابع','الثامن','التاسع','إجمالي المدرسة'].map(x=>h('th',{key:x},x)))),
    h('tbody',{},rows.map(([label,key,formatType])=>h('tr',{key},[label,...['7','8','9'].map(g=>formatType==='delta'?diff(report.grades[g][key]):fmt(report.grades[g][key])),formatType==='delta'?diff(report[key]):fmt(report[key])].map((x,i)=>h('td',{key:i},x)))))])),
   h('h3',{},'المستهدفات المعتمدة من خطة المدرسة التشغيلية'),
   h('p',{},'المستهدفات غير مفترضة؛ أدخل القيم التي اعتمدتها المدرسة لتظهر حالة تحقيق المستهدف.'),
   h('div',{className:'sr640-targets'},[['success','مستهدف النجاح (%)'],['achievement','مستهدف التحصيل (%)'],['valueAdded','مستهدف القيمة المضافة (نقطة)'],['high90','مستهدف نتائج 90% فأعلى (%)']].map(([key,label])=>h('label',{key},[h('span',{},label),h('input',{type:'number',step:'0.1',min:key==='valueAdded'?-100:0,max:100,value:targets[key],onChange:e=>setTargets(old=>({...old,[key]:e.target.value}))})]))),
   h('h3',{},'تفسير النتائج على مستوى المدرسة'),h('textarea',{rows:4,maxLength:3800,value:interpretation,onChange:e=>setInterpretation(e.target.value),placeholder:SR63.schoolReportNarrative(report)}),
   h('h3',{},'توصيات النائب الأكاديمي إلى مدير المدرسة'),h('textarea',{rows:6,maxLength:4000,value:recommendations,onChange:e=>setRecommendations(e.target.value),placeholder:SR63.schoolReportRecommendations(report)}),
   h('p',{className:'sr640-note'},'يُصدر ملف Word بنفس نموذج الأقسام الرسمي مع توجيه الخطاب من النائب الأكاديمي إلى مدير المدرسة. يمكن تعديل التفسير والتوصيات قبل التصدير. لا يتضمن التقرير بيانات شخصية للطلاب.'),
   problem?h('p',{className:'srstaff-alert',role:'alert'},problem):null,
   h('div',{className:'sr640-actions'},[h('button',{type:'button',disabled:!canExport||exporting||!report.subjectCount,onClick:()=>void download()},exporting?'جارٍ تحميل النموذج الرسمي…':'تنزيل التقرير الرسمي Word'),h('button',{type:'button',disabled:!canExport||!report.subjectCount,onClick:print},'طباعة التقرير / حفظ PDF')])
   ])
  ]);
 };
 SR63.schoolReportTableHtml=function(r,targets={}){const esc=SR63.staffReportEsc;return `<table class="sr640-table"><thead><tr><th>المؤشر</th><th>السابع</th><th>الثامن</th><th>التاسع</th><th>إجمالي المدرسة</th><th>تحقيق المستهدف</th></tr></thead><tbody>${metrics.filter(([_,key])=>r.previousExam||!['previousAchievement','valueAdded'].includes(key)).map(([label,key,type])=>`<tr><th>${esc(label)}</th>${['7','8','9'].map(g=>`<td>${esc(type==='delta'?diff(r.grades[g][key]):fmt(r.grades[g][key]))}</td>`).join('')}<td>${esc(type==='delta'?diff(r[key]):fmt(r[key]))}</td><td>${esc(targets[key]!==undefined&&targets[key]!==''&&Number.isFinite(Number(targets[key]))?(r[key]===null?'غير متاح':r[key]>=Number(targets[key])?'متحقق':'غير متحقق'):'غير محدد')}</td></tr>`).join('')}</tbody></table>`;};
})();
