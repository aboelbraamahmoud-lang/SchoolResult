/* 6.9.14 — every ordinary report page owns one subject; subjects comparison is the only all-subject page. */
SR63.reportSubjectOrder=function(rows){
  return [...new Set((rows||[]).map(row=>row.subject||'').filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ar',{numeric:true}));
};
SR63.reportTeacherOrder=function(rows,exam){
  return [...new Set((rows||[]).map(row=>mj(row,exam)).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ar',{numeric:true}));
};
SR63.reportClassOrder=function(rows,exam){
  return [...new Set((rows||[]).map(row=>hj(row,exam)).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ar',{numeric:true}));
};
SR63.buildReportPages=function(rows,dimension,selectedEntity,selectedSubject,mode,exam,threshold,settings){
  const allRows=Array.isArray(rows)?rows:[];
  if(mode==='executive')return [{key:`executive-${exam}`,title:'الملخص التنفيذي',entity:'المدرسة',scope:'school',grade:'',className:'',teacher:'',subject:'كل المواد',rows:allRows,allRows,rowOffset:0,part:1,totalParts:1}];
  if(mode==='subjects')return SR63.gradeSubjectPages(allRows,exam,selectedEntity);
  if(mode==='departmentStats')return SR63.departmentStatsPages(allRows,exam,selectedEntity||'الكل');
  const subjectSelected=selectedSubject&&![`الكل`,`كل المواد`].includes(selectedSubject);
  const subjectFilter=subjectSelected?allRows.filter(row=>ij(row.subject||'')===ij(selectedSubject)):allRows;
  const detail=['levels','struggling','comparison'].includes(mode);
  const pages=[];
  const chunk=(items,size)=>items.length?Array.from({length:Math.ceil(items.length/size)},(_,i)=>items.slice(i*size,(i+1)*size)):[[]];
  const addDetail=(entity,scope,className,teacher,subject,subjectRows)=>{
    let visible=subjectRows;
    if(mode==='struggling')visible=subjectRows.filter(row=>{const value=vj(row,exam,settings);return value!==null&&value<threshold}).sort((a,b)=>(vj(a,exam,settings)??0)-(vj(b,exam,settings)??0));
    else if(mode==='levels')visible=[...subjectRows].sort((a,b)=>(vj(b,exam,settings)??-1)-(vj(a,exam,settings)??-1));
    if(mode==='struggling'&&!visible.length)return;
    const pageSize=mode==='comparison'?28:mode==='levels'?34:36;
    chunk(visible,pageSize).forEach((part,index)=>pages.push({key:`${mode}-${scope}-${entity}-${className}-${subject}-${index}`,title:`${className} — ${subject}`,entity,scope,className,teacher,subject,rows:part,allRows:mode==='struggling'?visible:subjectRows,rowOffset:index*pageSize,part:index+1,totalParts:Math.max(1,Math.ceil(Math.max(1,visible.length)/pageSize))}));
  };
  if(dimension==='teacher'){
    const subjects=subjectSelected?[selectedSubject]:SR63.reportSubjectOrder(subjectFilter);
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
    const subjects=subjectSelected?[selectedSubject]:SR63.reportSubjectOrder(classRows);
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
