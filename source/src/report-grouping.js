/* 6.9.13 — subject-aware report sequencing and automatic teacher subject resolution. */
SR63.reportSubjectOrder=function(rows,exam){
  return [...new Set((rows||[]).map(row=>row.subject||'غير محدد'))].sort((a,b)=>String(a).localeCompare(String(b),'ar',{numeric:true}));
};
SR63.teacherSubjects=function(rows,exam,teacher){
  const name=String(teacher??'').trim();
  if(!name||name==='الكل'||name==='كل المعلمين')return [];
  return SR63.reportSubjectOrder((rows||[]).filter(row=>ij(mj(row,exam)||'')===ij(name)),exam);
};
SR63.reportEntityPages=function(rows,exam,{scope='className',selected='الكل',subject='كل المواد'}={}){
  const allRows=Array.isArray(rows)?rows:[];
  const subjectRows=subject&&subject!=='الكل'&&subject!=='كل المواد'?allRows.filter(row=>ij(row.subject||'')===ij(subject)):allRows;
  const value=row=>SR63.reportScopeValue(row,scope,exam);
  const entities=[...new Set(subjectRows.map(value).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ar',{numeric:true}));
  const chosen=selected==='الكل'?entities:entities.filter(entity=>ij(entity)===ij(selected));
  const pages=[];
  for(const entity of chosen){
    const entityRows=subjectRows.filter(row=>ij(value(row))===ij(entity));
    if(scope==='teacher'){
      const subjects=SR63.reportSubjectOrder(entityRows,exam);
      for(const subjectName of subjects){
        const scoped=entityRows.filter(row=>ij(row.subject||'')===ij(subjectName));
        pages.push({key:`teacher-${entity}-${subjectName}`,title:entity,entity,scope:'teacher',teacher:entity,className:'',grade:'',subject:subjectName,rows:scoped,allRows:scoped,rowOffset:0,part:1,totalParts:1});
      }
    }else{
      pages.push({key:`${scope}-${entity}`,title:entity,entity,scope,teacher:'',className:scope==='className'?entity:'',grade:scope==='grade'?entity:'',subject:subject&&subject!=='الكل'?subject:'كل المواد',rows:entityRows,allRows:entityRows,rowOffset:0,part:1,totalParts:1});
    }
  }
  return pages;
};
SR63.reportTeacherSequence=function(rows,exam,selectedTeacher='الكل',selectedSubject='كل المواد'){
  const all=Array.isArray(rows)?rows:[];
  const subjectOrder=selectedSubject&&selectedSubject!=='الكل'&&selectedSubject!=='كل المواد'?[selectedSubject]:SR63.reportSubjectOrder(all,exam);
  const pages=[];
  for(const subject of subjectOrder){
    const subjectRows=all.filter(row=>ij(row.subject||'')===ij(subject));
    const teachers=[...new Set(subjectRows.map(row=>mj(row,exam)).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ar',{numeric:true}));
    const chosen=selectedTeacher==='الكل'?teachers:teachers.filter(name=>ij(name)===ij(selectedTeacher));
    for(const teacher of chosen){
      const scoped=subjectRows.filter(row=>ij(mj(row,exam)||'')===ij(teacher));
      pages.push({key:`teacher-${subject}-${teacher}`,title:teacher,entity:teacher,scope:'teacher',teacher,className:'',grade:'',subject,rows:scoped,allRows:scoped,rowOffset:0,part:1,totalParts:1});
    }
  }
  return pages;
};
