/* Lower bound inclusive. Upper bound exclusive, except 100% is always inclusive. Empty input invalid. */
SR63.studentPercentRange=function(value){
 const raw=typeof value==='object'&&value!==null?value:{min:0,max:value};
 const min=SR63.number(raw.min),max=SR63.number(raw.max);
 const error=min===null||max===null?'أدخل الحد الأدنى والحد الأعلى للنسبة.':
  min<0||max>100||max<0||min>100?'يجب أن تكون النسب بين 0 و100.':
  min>=max?'يجب أن يكون الحد الأدنى أقل من الحد الأعلى.':'';
 return {min,max,error};
};
SR63.percentInRange=(value,range)=>!!range&&!range.error&&typeof value==='number'&&Number.isFinite(value)&&value>=range.min&&(value<range.max||(range.max===100&&value===100));
// Keep displayed percentages inside the selected interval, even just below its upper bound.
SR63.rangePercentLabel=function(value,range){
 if(typeof value!=='number'||!Number.isFinite(value))return '—';
 for(let digits=2;digits<=12;digits++){
  const rounded=Number(value.toFixed(digits));
  // Displaying 99.999% as 100% would hide the difference between near-full and full marks.
  if(rounded===100&&value<100)continue;
  if(SR63.percentInRange(rounded,range))return `${rounded}%`;
 }
 return `${value}%`;
};
/* 6.9.14 — every ordinary report page owns one subject; subjects comparison is the only all-subject page. */
SR63.reportSubjectOrder=function(rows,settings){
  return [...new Set((rows||[]).map(row=>row.subject||'').filter(Boolean))].sort((a,b)=>SR63.reportSubjectCompare(a,b,settings));
};
SR63.reportTeacherOrder=function(rows,exam){
  return [...new Set((rows||[]).map(row=>mj(row,exam)).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ar',{numeric:true}));
};
SR63.reportClassOrder=function(rows,exam){
  return [...new Set((rows||[]).map(row=>hj(row,exam)).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ar',{numeric:true}));
};
/* 6.10.86 — printed special education is not limited to ESE class codes.
   User-created academic department «التربية الخاصة» is also supported.
   Work only on the workspace rows already authorized for this account. */
SR63.specialEducationRows=function(rows,exam){
 const canon=value=>String(value??'').normalize('NFKC')
  .replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا')
  .replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,'').toLowerCase();
 const aliases=new Set(['التربيهالخاصه','الدعمالاضافي']);
 return (Array.isArray(rows)?rows:[]).filter(row=>
  SR63.isSupportRow(row,exam)||aliases.has(canon(row?.department)));
};
SR63.specialEducationGradeNo=function(row,exam){
 const klass=String(hj(row,exam)||row?.className||'').trim(),
       info=SR63.supportClassInfo(klass);
 if(info)return info.gradeNo;
 const m=/^0?([789])(?=\s*[/\-–]|\s*$)/.exec(klass);
 if(m)return Number(m[1]);
 const grade=ij(gj(row,exam)||row?.grade||'');
 if(grade.includes('السابع'))return 7;
 if(grade.includes('الثامن'))return 8;
 if(grade.includes('التاسع'))return 9;
 return null;
};
SR63.specialEducationGradeTitle=function(grade,rows=[],exam){
 const info=SR63.supportClassInfo(String(grade)+'/ESE'),
       onlyEse=rows.length>0&&rows.every(row=>SR63.isSupportRow(row,exam));
 return onlyEse?info.label:'التربية الخاصة — الصف '+info.grade;
};
/* Support-specific metrics count ESE and structure-defined special education
   together on this already-scoped page. General school metrics stay unchanged. */
SR63.specialEducationMetric=function(rows,exam,settings){
 const list=Array.isArray(rows)?rows:[],students=new Set();let evaluated=0,passed=0,failed=0,earned=0,possible=0;
 for(const row of list){
  const identity=SR63.studentEntityKey(row,exam)||String(row.studentId||'').trim()||ij(row.studentName||'');
  if(identity)students.add(identity);
  const cert=SR63.certificateScore(row,exam,settings);
  if(!cert)continue;
  evaluated++;earned+=cert.certificateScore;possible+=cert.certificateTotal;
  if(cert.passed)passed++;else failed++;
 }
 return {students:students.size,evaluated,passed,failed,
  success:evaluated?100*passed/evaluated:null,
  achievement:possible?100*earned/possible:null};
};
SR63.supportLevelGradeChoices=function(rows,exam){
 const source=SR63.specialEducationRows(rows,exam),
       grades=new Set(source.map(row=>SR63.specialEducationGradeNo(row,exam)).filter(Boolean));
 return [7,8,9].filter(n=>grades.has(n)).map(n=>n+'/ESE');
};
SR63.supportLevelSubjectChoices=function(rows,exam,settings=SR63.currentWorkspace?.settings){
 const names=new Map();
 for(const row of SR63.specialEducationRows(rows,exam)){
  const subject=String(row.subject||'').trim(),key=SR63.subjectAliasKey(subject);
  if(key&&!names.has(key))names.set(key,subject);
 }
 return [...names.values()].sort((a,b)=>SR63.reportSubjectCompare(a,b,settings));
};
SR63.supportLevelReportPages=function(rows,exam,selectedGrade='الكل',selectedSubject='الكل',settings=SR63.currentWorkspace?.settings){
 const source=SR63.specialEducationRows(rows,exam),pages=[],
       subjectFilter=SR63.subjectAliasKey(selectedSubject),
       allSubjects=!selectedSubject||selectedSubject==='الكل'||selectedSubject==='كل المواد';
 const selectedInfo=SR63.supportClassInfo(selectedGrade);
 const selectedNumber=selectedInfo?.gradeNo||({'7':7,'8':8,'9':9,'السابع':7,'الثامن':8,'التاسع':9}[String(selectedGrade).trim()]);
 const eligibleGrades=[7,8,9].filter(grade=>selectedGrade==='الكل'||selectedNumber===grade);
 for(const gradeNo of eligibleGrades){
  const info=SR63.supportClassInfo(gradeNo+'/ESE');
  const gradeRows=source.filter(row=>SR63.specialEducationGradeNo(row,exam)===gradeNo);
  const title=SR63.specialEducationGradeTitle(gradeNo,gradeRows,exam);
  const subjects=new Map();
  for(const row of gradeRows){
   const key=SR63.subjectAliasKey(row.subject);
   if(key&&(allSubjects||key===subjectFilter)&&!subjects.has(key))
     subjects.set(key,String(row.subject).trim());
  }
  for(const [subjectKey,subject] of [...subjects].sort((a,b)=>SR63.reportSubjectCompare(a[1],b[1],settings))){
   const matches=gradeRows.filter(row=>SR63.subjectAliasKey(row.subject)===subjectKey);
   const students=new Map();
   for(const row of matches){
    const name=String(row.studentName||'').trim();
    if(!name)continue;
    const key=SR63.studentEntityKey(row,exam)||String(row.studentId||'').trim()||ij(name);
    const current=students.get(key),evaluated=r=>SR63.validResult(r,exam,settings)&&r.statuses?.[exam]==='present';
    if(!current||!evaluated(current)&&evaluated(row))students.set(key,row);
   }
   const onlyEse=matches.every(row=>SR63.isSupportRow(row,exam));
   const allRows=[...students.values()].map(row=>({
     ...row,subject,
     ...(onlyEse?{examClasses:{...row.examClasses,[exam]:info.className}}:{})
    })).sort((a,b)=>
     String(hj(a,exam)||a.className).localeCompare(String(hj(b,exam)||b.className),'ar',{numeric:true})||
     String(a.studentName).localeCompare(String(b.studentName),'ar')||
     String(a.studentId||'').localeCompare(String(b.studentId||'')));
   if(!allRows.length)continue;
   const pageSize=22,parts=Math.ceil(allRows.length/pageSize);
   for(let part=0;part<parts;part++)pages.push({
    key:'special-education-'+gradeNo+'-'+subjectKey+'-'+part,
    title:onlyEse?info.label:title+' — '+SR63.reportSubjectLabel(subject,settings),
    entity:onlyEse?info.className:subject,
    scope:onlyEse?'className':'subject',
    className:onlyEse?info.className:'',
    teacher:'',department:onlyEse?SR63.SUPPORT_DEPARTMENT:'',subject,
    supportLevel:true,supportInfo:{...info,label:title},
    educationDepartment:'التربية الخاصة',gradeNo,
    rows:allRows.slice(part*pageSize,(part+1)*pageSize),allRows,
    rowOffset:part*pageSize,part:part+1,totalParts:parts
   });
  }
 }
 return pages;
};
SR63.buildReportPages=function(rows,dimension,selectedEntity,selectedSubject,mode,exam,threshold,settings){
  const sourceRows=Array.isArray(rows)?rows:[],range=mode==='struggling'?SR63.studentPercentRange(threshold):null;
  if(range?.error)throw Error(range.error);
   if(mode==='struggling'&&['gradeGroup','teacherGroup'].includes(dimension))return SR63.groupedRangePages(sourceRows,exam,settings,range,dimension,selectedEntity,selectedSubject);
  if(mode==='strugglingStats')return SR63.strugglingStatsPages(sourceRows,exam,settings);
  if(mode==='support')return SR63.supportReportPages(sourceRows,exam,selectedEntity||'الكل',settings);
   if(mode==='levels'&&dimension==='support')return SR63.supportLevelReportPages(sourceRows,exam,selectedEntity,selectedSubject,settings);
  const allRows=SR63.generalRows(sourceRows,exam);
  if(mode==='executive')return [{key:`executive-${exam}`,title:'الملخص التنفيذي',entity:'المدرسة',scope:'school',grade:'',className:'',teacher:'',subject:'كل المواد',rows:allRows,allRows,rowOffset:0,part:1,totalParts:1}];
  if(mode==='subjects')return SR63.gradeSubjectPages(allRows,exam,selectedEntity,settings);
  if(mode==='departmentStats')return SR63.departmentStatsPages(allRows,exam,selectedEntity||'الكل',settings);
  const subjectSelected=selectedSubject&&![`الكل`,`كل المواد`].includes(selectedSubject);
  const subjectFilter=subjectSelected?allRows.filter(row=>ij(row.subject||'')===ij(selectedSubject)):allRows;
  const detail=['levels','struggling','comparison'].includes(mode);
  const pages=[];
  const chunk=(items,size)=>items.length?Array.from({length:Math.ceil(items.length/size)},(_,i)=>items.slice(i*size,(i+1)*size)):[[]];
  const addDetail=(entity,scope,className,teacher,subject,subjectRows)=>{
    let visible=subjectRows;
    if(mode==='struggling')visible=subjectRows.filter(row=>{const value=vj(row,exam,settings);return SR63.percentInRange(value,range)}).sort((a,b)=>(vj(a,exam,settings)??0)-(vj(b,exam,settings)??0));
    else if(mode==='levels')visible=[...subjectRows].sort((a,b)=>(vj(b,exam,settings)??-1)-(vj(a,exam,settings)??-1));
    if(mode==='struggling'&&!visible.length)return;
    // Ordinary class lists stay together; the shared preview/print fitter scales the whole sheet.
    // Very large classes retain continuation pages rather than losing any student.
    const pageSize=40;
    chunk(visible,pageSize).forEach((part,index)=>pages.push({key:`${mode}-${scope}-${entity}-${className}-${subject}-${index}`,title:`${className} — ${subject}`,entity,scope,className,teacher,subject,rows:part,allRows:mode==='struggling'?visible:subjectRows,rowOffset:index*pageSize,part:index+1,totalParts:Math.max(1,Math.ceil(Math.max(1,visible.length)/pageSize))}));
  };
  if(dimension==='teacher'){
    const subjects=subjectSelected?[selectedSubject]:SR63.reportSubjectOrder(subjectFilter,settings);
    for(const subject of subjects){
      const bySubject=subjectFilter.filter(row=>ij(row.subject||'')===ij(subject));
      const teachers=selectedEntity==='الكل'?SR63.reportTeacherOrder(bySubject,exam):SR63.reportTeacherOrder(bySubject,exam).filter(name=>ij(name)===ij(selectedEntity));
      for(const teacher of teachers){
        const teacherRows=bySubject.filter(row=>ij(mj(row,exam)||'')===ij(teacher));
        if(!teacherRows.length)continue;
        if(detail){
          for(const className of SR63.reportClassOrder(teacherRows,exam))addDetail(teacher,'teacher',className,teacher,subject,teacherRows.filter(row=>ij(hj(row,exam)||'')===ij(className)));
        }else{
          const classes=SR63.reportClassOrder(teacherRows,exam),pageSize=mode==='teachers'?18:16;
          chunk(classes,pageSize).forEach((classChunk,index)=>pages.push({key:`${mode}-teacher-${subject}-${teacher}-${index}`,title:teacher,entity:teacher,scope:'teacher',className:'',teacher,subject,rows:teacherRows.filter(row=>classChunk.includes(hj(row,exam))),allRows:teacherRows,rowOffset:index*pageSize,part:index+1,totalParts:Math.max(1,Math.ceil(Math.max(1,classes.length)/pageSize))}));
        }
      }
    }
    return pages;
  }
  const classes=selectedEntity==='الكل'?SR63.reportClassOrder(subjectFilter,exam):SR63.reportClassOrder(subjectFilter,exam).filter(name=>ij(name)===ij(selectedEntity));
  for(const className of classes){
    const classRows=subjectFilter.filter(row=>ij(hj(row,exam)||'')===ij(className));
    const subjects=subjectSelected?[selectedSubject]:SR63.reportSubjectOrder(classRows,settings);
    for(const subject of subjects){
      const subjectRows=classRows.filter(row=>ij(row.subject||'')===ij(subject));
      if(!subjectRows.length)continue;
      const teacherNames=SR63.reportTeacherOrder(subjectRows,exam),teacher=teacherNames.join('، ');
      if(detail)addDetail(className,'className',className,teacher,subject,subjectRows);
      else{
        const secondary=teacherNames,pageSize=16;
        chunk(secondary,pageSize).forEach((teacherChunk,index)=>pages.push({key:`${mode}-class-${className}-${subject}-${index}`,title:`${className} — ${subject}`,entity:className,scope:'className',className,teacher,subject,rows:teacherChunk.length?subjectRows.filter(row=>teacherChunk.includes(mj(row,exam))):subjectRows,allRows:subjectRows,rowOffset:index*pageSize,part:index+1,totalParts:Math.max(1,Math.ceil(Math.max(1,secondary.length)/pageSize))}));
      }
    }
  }
  return pages;
};
