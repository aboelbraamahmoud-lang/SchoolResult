/* 6.10.21 — whole-department quantitative/descriptive analysis, grades seven to nine.
   Never infer student weakness from a grade alone. No personal data is sent off-device. */
SR63.departmentGradeKey=function(row,exam){
 const text=String(gj(row,exam)||row.grade||'')+' '+String(hj(row,exam)||row.className||'');
 const converted=text.replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
 const match=converted.match(/(?:^|\D)0?([789])(?=\D|$)/);
 if(match)return match[1];
 if(/التاسع|تاسع/.test(converted))return '9';
 if(/الثامن|ثامن/.test(converted))return '8';
 if(/السابع|سابع/.test(converted))return '7';
 return '';
};
SR63.departmentPerformanceChoices=function(workspace,exam=workspace.activeExam){
 const settings=workspace.settings||{},values=new Map();
 for(const row of workspace.rows||[]){
  if(!['7','8','9'].includes(SR63.departmentGradeKey(row,exam)))continue;
  const subject=String(row.subject||'').trim(),key=SR63.subjectAliasKey(subject);
  if(!key)continue;
  if(!values.has(key))values.set(key,{subject,key,label:SR63.reportSubjectLabel(subject,settings)});
 }
 return [...values.values()].sort((a,b)=>SR63.reportSubjectCompare(a.subject,b.subject,settings));
};
SR63.departmentPerformanceAnalyze=function(workspace,options={}){
 const exam=options.exam||workspace.activeExam,examIndex=XA.indexOf(exam),subject=String(options.subject||'').trim(),settings=workspace.settings||{};
 if(examIndex<0||!subject)SR63.fail('اختر التقييم والقسم/المادة أولًا.');
 const previousExam=examIndex>0?XA[examIndex-1]:null;
 const alias=SR63.subjectAliasKey(subject),cohort=options.cohort==='support'?'support':'general',pass=Number(settings.pass??50);
 const round=n=>Math.round(n*10)/10;
 const rate=(r,x)=>{
  if(!x||r.statuses?.[x]!=='present')return null;
  const score=r.scores?.[x],total=pj(r,x,settings);
  return typeof score==='number'&&Number.isFinite(score)&&typeof total==='number'&&Number.isFinite(total)&&total>0?round(100*score/total):null;
 };
 const unique=new Map();
 for(const row of workspace.rows||[]){
  if(SR63.subjectAliasKey(row.subject)!==alias)continue;
  const grade=SR63.departmentGradeKey(row,exam);
  if(!['7','8','9'].includes(grade))continue;
  if(SR63.isSupportRow(row,exam)!==(cohort==='support'))continue;
  const id=String(row.studentId||'').trim(),klass=String(hj(row,exam)||row.className||'').trim();
  if(!id||!klass)continue;
  const key=grade+'|'+id;
  const old=unique.get(key);
  // If duplicate teacher assignments describe the same pupil, keep a genuinely assessed record.
  if(!old||rate(old,exam)===null&&rate(row,exam)!==null)unique.set(key,row);
 }
 if(!unique.size)SR63.fail('لا توجد نتائج للقسم المختار في الصفوف السابع والثامن والتاسع.');
 const entries=[...unique.values()].map(row=>({
  id:String(row.studentId),name:String(row.studentName||''),grade:SR63.departmentGradeKey(row,exam),className:String(hj(row,exam)||row.className||''),
  current:rate(row,exam),previous:rate(row,previousExam),score:row.scores?.[exam],total:pj(row,exam,settings),
  status:row.statuses?.[exam]||'unentered',
  previousScore:previousExam&&row.statuses?.[previousExam]==='present'?row.scores?.[previousExam]:null,
  previousTotal:previousExam&&row.statuses?.[previousExam]==='present'?pj(row,previousExam,settings):null
 }));
 const summarize=(arr)=>{
  const graded=arr.filter(s=>s.current!==null),pairs=graded.filter(s=>s.previous!==null);
  let earned=0,possible=0,previousEarned=0,previousPossible=0;
  for(const s of graded){if(typeof s.score==='number'&&Number.isFinite(s.total)&&s.total>0){earned+=s.score;possible+=s.total;}}
  // Previous attainment is a separate *actual* assessment, not today's
  // grades relabelled. Only genuinely recorded grades enter its denominator.
  if(previousExam)for(const s of arr){
   if(s.previous!==null&&typeof s.previousScore==='number'&&Number.isFinite(s.previousTotal)&&s.previousTotal>0){
    previousEarned+=s.previousScore;previousPossible+=s.previousTotal;
   }
  }
  return {studentCount:arr.length,evaluated:graded.length,ungraded:arr.length-graded.length,compared:pairs.length,
   success:graded.length?round(100*graded.filter(s=>s.current>=pass).length/graded.length):null,
   achievement:possible?round(100*earned/possible):null,
   currentAchievement:possible?round(100*earned/possible):null,
   previousAchievement:previousPossible?round(100*previousEarned/previousPossible):null,
   high90:graded.length?round(100*graded.filter(s=>s.current>=90).length/graded.length):null,
   valueAdded:pairs.length?round(pairs.reduce((acc,s)=>acc+s.current-s.previous,0)/pairs.length):null};
 };
 const gradeNames={'7':'السابع','8':'الثامن','9':'التاسع'};
 const byGrade=Object.fromEntries(['7','8','9'].map(g=>[g,{grade:g,label:gradeNames[g],...summarize(entries.filter(x=>x.grade===g)),classes:[...new Set(entries.filter(x=>x.grade===g).map(x=>x.className))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}))}]));
 return {subject,subjectLabel:SR63.reportSubjectLabel(subject,settings),departmentName:SR63.reportSubjectLabel(subject,settings),exam,examName:tj(settings,exam).name,
  previousExam,previousExamName:previousExam?tj(settings,previousExam).name:null,
  prevExam:previousExam,prevExamName:previousExam?tj(settings,previousExam).name:null,
  cohort,grades:byGrade,...summarize(entries),
  schoolName:settings.schoolName||'',academicYear:settings.academicYear||'',coordinator:SR63.subjectCoordinator(workspace,subject)||'',
  academicViceName:settings.academicViceName||'',entries,gradeNames};
};
/* The department and teacher reports now share the same *five-slot*
   official teacher form. Both reports derive the metric labels and rows
   dynamically from the selected examination and its immediate predecessor. */
SR63.departmentQuantitativeMetricRows=function(analysis){
 const name=String(analysis.examName||'').trim();
 const previous=analysis.previousExam?String(analysis.previousExamName||'').trim():null;
 const rows=[
  {key:'success',slot:1,label:'نسبة النجاح في '+name,format:'plain',target:'success'},
  {key:'currentAchievement',slot:2,label:'نسبة التحصيل الأكاديمي في '+name,format:'plain',target:'achievement'}
 ];
 if(previous){
  rows.push({key:'previousAchievement',slot:3,label:'نسبة التحصيل الأكاديمي في '+previous,format:'plain',target:'achievement'});
  rows.push({key:'valueAdded',slot:4,label:'القيمة المضافة في التحصيل الأكاديمي بين '+previous+' و'+name,format:'delta',target:'valueAdded'});
 }
 rows.push({key:'high90',slot:5,label:'5.2 نسبة الطلبة الحاصلين على 90% فأعلى في جميع الصفوف',format:'percentage',target:'high90'});
 return rows;
};
SR63.departmentNarrative=function(analysis){
 const fmt=v=>typeof v==='number'?v.toFixed(1)+'%':'لا تتوافر بيانات كافية';
 const parts=[`شمل التحليل ${analysis.studentCount} طالبًا في الصفوف السابع والثامن والتاسع، وبلغ عدد النتائج المرصودة ${analysis.evaluated}، مع وجود ${analysis.ungraded} حالة غير مرصودة أو غير محتسبة.`,
 `في ${analysis.examName} بلغت نسبة النجاح ${fmt(analysis.success)} ونسبة التحصيل الأكاديمي ${fmt(analysis.achievement)} ونسبة الحاصلين على 90% فأعلى ${fmt(analysis.high90)}.`];
 if(analysis.previousExam){
  parts.push(analysis.valueAdded===null?'لا تتوافر نتائج مشتركة صالحة لحساب القيمة المضافة.':`بلغت القيمة المضافة ${analysis.valueAdded>0?'+':''}${analysis.valueAdded.toFixed(1)} نقطة مئوية عند مقارنة ${analysis.examName} بـ${analysis.previousExamName} لـ${analysis.compared} طالبًا لديهم نتيجتان مرصودتان.`);
 }
 parts.push('تُراجع المهارات المتعثرة من تحليل بنود الاختبار والتقويم التشخيصي قبل نسبة النتائج إلى أسباب محددة، وتحدد الإجراءات المناسبة وفق إمكانات القسم.');
 return parts.join(' ');
};
