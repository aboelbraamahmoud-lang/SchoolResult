/* SchoolResult skill analysis: Arabic and English, coordinator-safe editing and reports.
   Student names/grades are runtime workspace data, never bundled into public assets. */
SR63.skillSubjects.english={label:'اللغة الإنجليزية',keys:[
 ['listening','الاستماع'],['speaking','التحدث'],['reading','القراءة'],
 ['grammar','القواعد'],['writing','الكتابة']
]};
SR63.skillSubjectKind=value=>{
 const raw=String(value??'').normalize('NFKC').replace(/[\s\u0640]+/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').toLowerCase();
 if(['عربي','العربية','لغةعربية','اللغةالعربية','arabic'].includes(raw))return 'arabic';
 if(['انجليزي','الانجليزي','الانجليزية','لغةانجليزية','اللغةالانجليزية','english','englishlanguage'].includes(raw))return 'english';
 return '';
};
SR63.skillClass=value=>String(value??'').trim().replace(/^0([789])\//,'$1/').toUpperCase();
SR63.skillScoped=function(items,departments=null){
 const records=Array.isArray(items)?items:[];
 if(!Array.isArray(departments))return records;
 const permitted=new Set(departments.map(SR63.skillSubjectKind).filter(Boolean));
 return records.filter(a=>permitted.has(SR63.skillSubjectKind(a.subject)));
};
SR63.skillRoster=function(workspace,kind,exam='exam1',allowedSubjects=null){
 if(!SR63.skillSubjects[kind])return [];
 if(Array.isArray(allowedSubjects)&&!allowedSubjects.some(x=>SR63.skillSubjectKind(x)===kind))return [];
 const rows=(workspace?.rows||[]).filter(x=>SR63.skillSubjectKind(x.subject)===kind);
 const unique=new Map();
 for(const row of rows){
  const id=String(row.studentId??'').trim(),name=String(row.studentName??'').trim();
  const className=SR63.skillClass(row.examClasses?.[exam]||row.className);
  if(!id||!name||!className||className.includes('ESE'))continue;
  const key=id+'|'+className;
  if(!unique.has(key))unique.set(key,{id,name,className,grade:className.split('/')[0],source:row});
 }
 return [...unique.values()].sort((a,b)=>a.className.localeCompare(b.className,'ar',{numeric:true})||
  a.name.localeCompare(b.name,'ar'));
};
SR63.skillNewAssessment=function(workspace,kind,exam='exam1',allowedSubjects=null){
 const schema=SR63.skillSubjects[kind],roster=SR63.skillRoster(workspace,kind,exam,allowedSubjects);
 if(!schema||!roster.length)throw Error('لا توجد قائمة طلاب معتمدة لهذه المادة. تحقق من رصد نتائج المادة وإسنادات القسم.');
 const year=String(workspace?.settings?.academicYear||'').slice(0,35);
 const id='skills-'+kind+'-'+exam+'-'+(year.replace(/[^0-9-]/g,'-')||'current');
 const records=roster.map(({id,name,className,grade})=>({id,name,className,grade,
  marks:Object.fromEntries(schema.keys.map(([key])=>[key,null]))}));
 return {version:1,id,subject:schema.label,subjectKey:kind,exam,academicYear:year,
  fileName:'إدخال يدوي',importedAt:new Date().toISOString(),
  skills:schema.keys.map(([key,label])=>({key,label,max:null})),records,issues:[],
  classCount:new Set(records.map(x=>x.className)).size,gradeCount:new Set(records.map(x=>x.grade)).size,
  passThreshold:50};
};
SR63.skillReconciliation=function(assessment,workspace,allowedSubjects=null){
 if(!assessment)return [];
 const kind=SR63.skillSubjectKind(assessment.subject);
 const roster=new Map(SR63.skillRoster(workspace,kind,assessment.exam,allowedSubjects).map(x=>[x.id+'|'+x.className,x.source]));
 const maximaReady=assessment.skills.length>0&&assessment.skills.every(s=>Number.isFinite(s.max)&&s.max>0);
 const maxTotal=maximaReady?assessment.skills.reduce((n,s)=>n+s.max,0):null;
 const examData=(workspace?.settings?.exams||[]).find(x=>x.key===assessment.exam);
 return (assessment.records||[]).map(student=>{
  const official=roster.get(student.id+'|'+SR63.skillClass(student.className));
  const complete=assessment.skills.length>0&&assessment.skills.every(s=>Number.isFinite(student.marks?.[s.key]));
  const sum=complete?assessment.skills.reduce((n,s)=>n+student.marks[s.key],0):null;
  const status=official?.statuses?.[assessment.exam];
  const score=status==='present'&&Number.isFinite(official?.scores?.[assessment.exam])?official.scores[assessment.exam]:null;
  const officialMax=official?.totals?.[assessment.exam]??examData?.total??null;
  const delta=sum===null||score===null?null:Math.round((sum-score)*100)/100;
  const maxDelta=maxTotal===null||!Number.isFinite(officialMax)?null:Math.round((maxTotal-officialMax)*100)/100;
  const state=!official?'unlinked':!complete?'incomplete':score===null?'unrecorded':
   Math.abs(delta)>0.001?'mismatch':maxDelta!==null&&Math.abs(maxDelta)>0.001?'maximum':'matched';
  return {id:student.id,name:student.name,className:student.className,grade:student.grade,
   total:sum,official:score,delta,maxTotal,officialMax,maxDelta,state};
 });
};
SR63.skillWeakStudents=function(assessment,skillKey,pass=50,grade='الكل',className='الكل'){
 const skill=assessment?.skills?.find(x=>x.key===skillKey);
 if(!skill||!Number.isFinite(skill.max)||skill.max<=0)return [];
 return (assessment.records||[]).filter(r=>(grade==='الكل'||r.grade===grade)&&(className==='الكل'||r.className===className))
  .flatMap(r=>{
   const score=r.marks?.[skillKey],percent=SR63.skillPercent(score,skill.max);
   return percent!==null&&percent<pass?[{...r,score,percent}]:[];
  }).sort((a,b)=>a.percent-b.percent||a.name.localeCompare(b.name,'ar'));
};
SR63.skillParseGenericWorkbook=function(buffer,fileName,assessment){
 const book=hv(buffer,{type:'array'}),map=new Map();
 const normalize=x=>String(x??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
 for(const sheet of book.SheetNames){
  const rows=Gv.sheet_to_json(book.Sheets[sheet],{header:1,raw:true,defval:null,blankrows:false});
  const index=rows.findIndex(row=>row&&
   ['الرقم الأكاديمي','student id','studentid'].includes(normalize(row[0]))&&
   ['اسم الطالب','student name','studentname'].includes(normalize(row[1]))&&
   ['الشعبة','الصف / الشعبة','class'].includes(normalize(row[2])));
  if(index<0)continue;
  const headers=rows[index].map(normalize);
  const indices=assessment.skills.map(skill=>headers.findIndex(x=>x===normalize(skill.label)||x===normalize(skill.key)));
  if(indices.some(x=>x<0))throw Error('مهارات غير موجودة في رؤوس أعمدة الورقة '+sheet);
  for(let n=index+1;n<rows.length;n++){
   const row=rows[n]||[],id=String(row[0]??'').replace(/\.0$/,'').trim(),className=SR63.skillClass(row[2]);
   if(!id||!className)continue;
   const key=id+'|'+className;if(map.has(key))throw Error('طالب مكرر في ملف المهارات، الصف '+(n+1));
   const marks={};
   assessment.skills.forEach((skill,i)=>{try{marks[skill.key]=SR63.skillSafeNumber(row[indices[i]]);}
    catch(error){throw Error('الصف '+(n+1)+'، '+skill.label+': '+error.message);}});
   map.set(key,marks);
  }
 }
 if(!map.size)throw Error('لم أجد أعمدة الرقم الأكاديمي واسم الطالب والشعبة والمهارات في الملف.');
 const matched=new Set();
 const records=assessment.records.map(student=>{
  const key=student.id+'|'+SR63.skillClass(student.className),marks=map.get(key);
  if(!marks)return student;
  matched.add(key);return {...student,marks:{...student.marks,...marks}};
 });
 const unmatched=[...map.keys()].filter(x=>!matched.has(x));
 if(unmatched.length)throw Error('يوجد '+unmatched.length+' طالبًا غير مطابقين لقائمة المادة؛ لم تُعتمد أي درجات. راجع الرقم الأكاديمي والشعبة.');
 return {...assessment,fileName:String(fileName||'ملف مهارات').slice(0,180),records,importedAt:new Date().toISOString()};
};
SR63.skillDownloadCsv=function(rows,filename){
 const escape=value=>{
  let text=String(value??'');
  if(/^[=+\-@\t\r]/.test(text))text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
 };
 const csv='\uFEFF'+rows.map(row=>row.map(escape).join(',')).join('\r\n');
 SR63.downloadReportFile(new Blob([csv],{type:'text/csv;charset=utf-8;'}),SR63.safeReportFilename(filename)+'.csv');
};
SR63.skillReportHTML=function(title,assessment,settings,headers,rows,page=1,pages=1){
 const esc=SR63.escape,cell=value=>value===null||value===undefined||value===''?'—':esc(value);
 const examName=(settings?.exams||[]).find(x=>x.key===assessment.exam)?.name||assessment.exam;
 const table='<table class="srskill-table"><thead><tr>'+headers.map(x=>'<th>'+cell(x)+'</th>').join('')+
  '</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+cell(x)+'</td>').join('')+'</tr>').join('')+
  '</tbody></table>';
 return '<section class="school-report-page skill-report-page report-landscape" data-orientation="landscape">'+
  '<header class="srskill-header"><img src="./moehe.png" alt="شعار وزارة التربية والتعليم">'+
  '<div><strong>'+cell(settings?.schoolName||'المدرسة')+'</strong><h2>'+cell(title)+'</h2><p>'+cell(assessment.subject)+
  ' · '+cell(examName)+' · '+cell(assessment.academicYear||settings?.academicYear)+'</p></div></header>'+
  '<div class="srskill-body"><h3>'+cell(title)+'</h3>'+table+'</div>'+
  '<footer class="report-footer srskill-footer"><div>منسق المادة: '+cell(settings?.coordinatorName)+'</div>'+
  '<div>النائب الأكاديمي: '+cell(settings?.academicViceName)+'</div>'+
  '<div>مدير المدرسة: '+cell(settings?.principalName)+'</div></footer>'+
  '<div class="srskill-page-number">صفحة '+page+' من '+pages+'</div></section>';
};
SR63.skillReportSelection=function({assessment,workspace,kind='summary',grade='الكل',className='الكل',
 skillKey='',threshold=50,older=null,allowedSubjects=null}){
 if(!assessment)return {pages:[],rows:[],headers:[]};
 const settings=workspace?.settings||{},fmt=v=>Number.isFinite(v)?String(Math.round(v*10)/10):'—';
 const filtered=(assessment.records||[]).filter(x=>(grade==='الكل'||x.grade===grade)&&(className==='الكل'||x.className===className));
 const chosen=assessment.skills.find(x=>x.key===skillKey)||assessment.skills[0],esc=SR63.escape;
 let headers=[],rows=[],title='';
 if(kind==='summary'||kind==='students'){
  const original=SR63.skillPages(assessment,{grade,className,pass:threshold});
  return {pages:original.filter(x=>kind==='summary'?x.kind==='summary':x.kind==='students')
   .map(x=>SR63.skillFullHTML(x,assessment,settings)),headers:[],rows:[]};
 }
 if(kind==='school'){
  title='تحليل المهارات على مستوى المدرسة';
  headers=['المهارة','الدرجة القصوى','متوسط التحصيل %','نسبة الإتقان %','الطلاب المرصودون','الطلاب المتعثرون'];
  rows=SR63.skillAggregate(assessment,filtered,threshold).skills.map(s=>
   [s.label,s.max??'—',fmt(s.rate),fmt(s.masteryRate),s.observed,
    s.mastered===null?'—':s.observed-s.mastered]);
 }
 if(kind==='weak'){
  title='الطلاب المتعثرون في مهارة '+(chosen?.label||'');
  headers=['الرقم الأكاديمي','اسم الطالب','الشعبة','المهارة','الدرجة','الدرجة القصوى','نسبة الإتقان %'];
  rows=SR63.skillWeakStudents(assessment,chosen?.key,threshold,grade,className)
   .map(x=>[x.id,x.name,x.className,chosen.label,x.score,chosen.max,fmt(x.percent)]);
 }
 if(kind==='reconciliation'){
  title='فحص مطابقة مجموع المهارات مع الدرجة الرسمية';
  headers=['الرقم الأكاديمي','اسم الطالب','الشعبة','مجموع المهارات','الدرجة الرسمية','الفرق','الحالة'];
  const labels={mismatch:'درجات غير متطابقة',maximum:'الدرجة العظمى مختلفة',incomplete:'رصد غير مكتمل',
   unlinked:'غير مرتبط بنتيجة رسمية',unrecorded:'نتيجة رسمية غير مرصودة',matched:'متطابق'};
  rows=SR63.skillReconciliation(assessment,workspace,allowedSubjects)
   .filter(x=>x.state!=='matched'&&(grade==='الكل'||x.grade===grade)&&(className==='الكل'||x.className===className))
   .map(x=>[x.id,x.name,x.className,fmt(x.total),fmt(x.official),fmt(x.delta),labels[x.state]||x.state]);
 }
 if(kind==='comparison'){
  title='مقارنة مهارة '+(chosen?.label||'')+' بين اختبارين';
  headers=['الرقم الأكاديمي','اسم الطالب','الشعبة','الاختبار السابق %','الاختبار الحالي %','فرق النسبة'];
  rows=SR63.skillComparison(older,assessment)
   .filter(x=>grade==='الكل'||x.className.split('/')[0]===grade)
   .filter(x=>className==='الكل'||x.className===className)
   .flatMap(x=>x.skills.filter(s=>s.key===chosen?.key).map(s=>[x.id,x.name,x.className,
    fmt(s.previous),fmt(s.current),(s.change>0?'+':'')+fmt(s.change)]));
 }
 if(kind==='ranking'){
  title='ترتيب المهارات حسب مستوى الإتقان';
  headers=['الترتيب','المهارة','نسبة التحصيل %','نسبة الإتقان %','حالات مرصودة'];
  rows=SR63.skillAggregate(assessment,filtered,threshold).skills.sort((a,b)=>(a.rate??-1)-(b.rate??-1))
   .map((s,i)=>[i+1,s.label,fmt(s.rate),fmt(s.masteryRate),s.observed]);
 }
 if(!rows.length)rows=[['لا توجد بيانات مطابقة للتصفية',...Array(Math.max(0,headers.length-1)).fill('')]];
 const chunks=[];for(let i=0;i<rows.length;i+=22)chunks.push(rows.slice(i,i+22));
 return {headers,rows,pages:chunks.map((items,i)=>SR63.skillReportHTML(title,assessment,settings,headers,items,i+1,chunks.length)),title};
};
