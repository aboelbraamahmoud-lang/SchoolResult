/* SchoolResult 6.10.85 — compact grouped target-range reports.
   Input is always the already-authorized workspace. Student identities stay
   internal to filtering and React keys; no personal numbers in printed output. */
SR63.reportScoreHeaderMax=function(rows,exam,settings,kind='raw'){
 const values=new Set();
 for(const row of rows||[]){
  const c=SR63.certificateScore(row,exam,settings);
  if(!c)continue;
  values.add(kind==='certificate'?c.certificateTotal:c.rawTotal);
 }
 if(!values.size){
  const rule=SR63.certificateExamRule(settings,exam);
  return String(kind==='certificate'?rule.certificateTotal:rule.rawTotal);
 }
 return values.size===1?String([...values][0]):'متعددة';
};
SR63.reportGradeNumber=function(row,exam){
 const klass=String(hj(row,exam)||row.className||''),m=/^\s*([789])(?:\s*\/|\s*$)/.exec(klass);
 return m?Number(m[1]):SR63.gradeOrder(gj(row,exam)||row.grade);
};
SR63.groupedRangePages=function(rows,exam,settings,range,dimension,selectedEntity='الكل',selectedSubject='الكل'){
 const source=SR63.generalRows(rows||[],exam),eligible=[],seen=new Set(),pages=[];
 const valid=SR63.studentPercentRange(range);
 if(valid.error)throw Error(valid.error);
 const allSubjects=!selectedSubject||selectedSubject==='الكل'||selectedSubject==='كل المواد';
 for(const row of source){
  const original=vj(row,exam,settings),cert=SR63.certificateScore(row,exam,settings);
  if(!cert||!SR63.percentInRange(original,valid))continue;
  const gradeNo=SR63.reportGradeNumber(row,exam);
  if(![7,8,9].includes(gradeNo))continue;
  if(!allSubjects&&!SR63.subjectEquivalent(row.subject,selectedSubject))continue;
  const teacher=String(mj(row,exam)||row.teacher||'غير محدد').trim()||'غير محدد';
  const identity=SR63.studentEntityKey(row,exam)||ij(row.studentName);
  const key=[gradeNo,lj(hj(row,exam)||row.className),identity,SR63.subjectAliasKey(row.subject),ij(teacher)].join('|');
  if(seen.has(key))continue;
  seen.add(key);eligible.push({row,gradeNo,teacher});
 }
 const labels={7:'السابع',8:'الثامن',9:'التاسع'},maxPerPage=23;
 const makePages=(items,meta)=>{
  if(!items.length)return;
  const sorted=items.map(item=>item.row).sort((a,b)=>
   (SR63.reportGradeNumber(a,exam)-SR63.reportGradeNumber(b,exam))||
   String(hj(a,exam)||a.className).localeCompare(String(hj(b,exam)||b.className),'ar',{numeric:true})||
   SR63.reportSubjectCompare(a.subject,b.subject,settings)||
   String(a.studentName).localeCompare(String(b.studentName),'ar',{numeric:true}));
  const pieces=Math.ceil(sorted.length/maxPerPage);
  for(let i=0;i<pieces;i++)pages.push({
   ...meta,groupedRange:dimension,exam,range:valid,
   key:['range',dimension,meta.groupCode,i].join('-'),rows:sorted.slice(i*maxPerPage,(i+1)*maxPerPage),
   allRows:sorted,rowOffset:i*maxPerPage,part:i+1,totalParts:pieces,
   scope:dimension==='gradeGroup'?'grade':'school',
   // Only grade pages have a grade filter; teacher pages cover many grades.
   className:'',teacher:'',department:''
  });
 };
 if(dimension==='gradeGroup'){
  const choice=String(selectedEntity||'الكل'),match=/([789])/.exec(choice);
  const wanted=choice==='الكل'?null:Number(match?.[1]||0);
  for(const gradeNo of [7,8,9]){
   if(wanted&&wanted!==gradeNo)continue;
   const subset=eligible.filter(x=>x.gradeNo===gradeNo);
   const subjects=SR63.reportSubjectOrder(subset.map(x=>x.row),settings);
   for(const subject of subjects){
    const items=subset.filter(x=>SR63.subjectEquivalent(x.row.subject,subject));
    makePages(items,{title:'الطلاب ضمن نسبة — '+labels[gradeNo]+' — '+SR63.reportSubjectLabel(subject,settings),
     groupTitle:'الصف '+labels[gradeNo]+' — مادة '+SR63.reportSubjectLabel(subject,settings),
     groupCode:gradeNo+'-'+SR63.subjectAliasKey(subject),entity:labels[gradeNo],
     grade:labels[gradeNo],subject,groupType:'grade',groupTeacher:''});
   }
  }
 }else if(dimension==='teacherGroup'){
  const names=[...new Set(eligible.map(x=>x.teacher))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
  for(const teacher of names){
   if(selectedEntity!=='الكل'&&ij(teacher)!==ij(selectedEntity))continue;
   makePages(eligible.filter(x=>ij(x.teacher)===ij(teacher)),{
    title:'الطلاب ضمن نسبة — المعلم '+teacher,groupTitle:'المعلم: '+teacher,
    groupCode:ij(teacher),entity:teacher,grade:'',subject:'كل المواد',
    groupType:'teacher',groupTeacher:teacher
   });
  }
 }
 return pages;
};
SR63.GroupedRangeReport=function({page,exam,workspace}){
 const h=v.createElement,settings=workspace.settings,rows=page.rows||[],all=page.allRows||rows;
 const stats=bj(all,exam,settings),gradePage=page.groupType==='grade';
 const maxRaw=SR63.reportScoreHeaderMax(all,exam,settings),maxCert=SR63.reportScoreHeaderMax(all,exam,settings,'certificate');
 const thead=['م','اسم الطالب',gradePage?'الشعبة':'الصف / الشعبة',gradePage?'المعلم':'المادة',
  'درجة الاختبار','درجة الشهادة','النسبة الأصلية','النتيجة'];
 const cell=(text,cls='')=>h('td',{className:cls},text);
 const tableRows=rows.map((row,index)=>{
  const cert=SR63.certificateScore(row,exam,settings),name=row.studentName||'—';
  return h('tr',{key:row.id||index},[
   cell(page.rowOffset+index+1),
   cell(h('strong',{className:'sr685-name'},name),'sr685-name-cell'),
   cell(SR63.displayClass(hj(row,exam)||row.className)),
   cell(gradePage?(mj(row,exam)||row.teacher||'غير محدد'):SR63.reportSubjectLabel(row.subject,settings)),
   cell(cert?.rawScore??'—','sr685-num'),
   cell(cert?.certificateScore??'—','sr685-num'),
   cell(cert?SR63.reportWestern(cert.originalPercent.toFixed(1))+'%':'—','sr685-num'),
   cell(cert?(cert.passed?'ناجح':'راسب'):'غير مرصود')
  ]);
 });
 return h(q.Fragment,{},[
  h('div',{className:'sr685-group-heading'},[
   h('h2',{},page.groupTitle),
   h('p',{},'النطاق من '+page.range.min+'% إلى أقل من '+page.range.max+'% من النسبة الأصلية · '+tj(settings,exam).name
    +(page.totalParts>1?' · الجزء '+page.part+' من '+page.totalParts:'')),
   h('div',{className:'sr685-metrics'},[
    ['عدد النتائج',all.length],['حاضر',stats.evaluated],['ناجح',stats.passed],['راسب',stats.failed],
    ['نسبة النجاح',stats.success===null?'—':wj(stats.success,1)],
    ['نسبة التحصيل',stats.achievement===null?'—':wj(stats.achievement,1)]
   ].map(([label,value])=>h('span',{key:label},h('b',{},label),h('strong',{},value))))
  ]),
  h('table',{className:'report-table sr685-group-table'},[
   h('colgroup',{},...[4,25,14,23,9,9,9,7].map((width,i)=>h('col',{key:i,style:{width:width+'%'}}))),
   h('thead',{},h('tr',{},thead.map((label,i)=>h('th',{key:label},label,
    i===4?h('small',{className:'sr685-maximum'},'الدرجة العظمى '+maxRaw):null,
    i===5?h('small',{className:'sr685-maximum'},'الدرجة العظمى '+maxCert):null)))),
   h('tbody',{},...tableRows)
  ]),
  h('p',{className:'sr685-method'},'اختيار الطلاب حسب النسبة الأصلية المحددة؛ قد يكون بعض الطلاب ناجحين بعد جبر درجة الشهادة. نسب النجاح والتحصيل تعتمد درجة الشهادة عند تفعيل التحويل. عند اختلاف الدرجة العظمى بين السجلات يظهر وصف «متعددة» برأس العمود. لا تظهر أرقام الطلاب الشخصية في الكشف.')
 ]);
};
