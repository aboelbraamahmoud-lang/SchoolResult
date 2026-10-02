/* School Results 6.8 — relational academic catalog, dashboard model and student profile. */
SR63.stableId=function(prefix,value){
  let h=2166136261;for(const ch of String(value??'')){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return `${prefix}-${(h>>>0).toString(36)}`;
};
SR63.ensureCatalog=function(workspace){
  const source=workspace??{}, rows=Array.isArray(source.rows)?source.rows:[], oldAssignments=Array.isArray(source.teacherAssignments)?source.teacherAssignments:[], oldTeachers=Array.isArray(source.teachers)?source.teachers:[];
  const gradeMap=new Map(), classMap=new Map(), subjectMap=new Map();
  const addGrade=(value,seed={})=>{const name=String(value??'').trim();if(!name)return null;const key=ij(name);let item=gradeMap.get(key);if(!item){item={id:seed.id||SR63.stableId('grade',key),name,order:Number.isFinite(seed.order)?seed.order:gradeMap.size+1,active:seed.active!==false};gradeMap.set(key,item);}else if(seed.active===true)item.active=true;return item;};
  const addClass=(value,gradeValue,seed={})=>{const className=lj(String(value??''));if(!className)return null;const gradeName=String(gradeValue??uj(className)??'').trim()||uj(className),grade=addGrade(gradeName),key=ij(className);let item=classMap.get(key);if(!item){item={id:seed.id||SR63.stableId('class',key),name:seed.name||className,className,gradeId:seed.gradeId||grade?.id||'',grade:grade?.name||gradeName,order:Number.isFinite(seed.order)?seed.order:classMap.size+1,active:seed.active!==false};classMap.set(key,item);}else{item.gradeId=item.gradeId||grade?.id||'';item.grade=item.grade||grade?.name||gradeName;if(seed.active===true)item.active=true;}return item;};
  const addSubject=(value,department,seed={})=>{const name=String(value??'').trim();if(!name)return null;const key=ij(name);let item=subjectMap.get(key);if(!item){item={id:seed.id||SR63.stableId('subject',key),name,department:String(seed.department??department??name).trim()||name,gradeIds:Array.isArray(seed.gradeIds)?[...new Set(seed.gradeIds.filter(Boolean))]:[],order:Number.isFinite(seed.order)?seed.order:subjectMap.size+1,active:seed.active!==false};subjectMap.set(key,item);}else{item.department=item.department||String(department??name).trim()||name;if(seed.active===true)item.active=true;for(const id of seed.gradeIds??[])if(id&&!item.gradeIds.includes(id))item.gradeIds.push(id);}return item;};
  for(const g of source.grades??[])addGrade(typeof g==='string'?g:g?.name,g&&typeof g==='object'?g:{});
  for(const c of source.classes??[])addClass(typeof c==='string'?c:c?.className??c?.name,c?.grade,c&&typeof c==='object'?c:{});
  for(const s of source.subjects??[])addSubject(typeof s==='string'?s:s?.name,s?.department,s&&typeof s==='object'?s:{});
  for(const teacher of oldTeachers){const subject=addSubject(teacher.subject,teacher.department);for(const className of teacher.classes??[]){const cls=addClass(className,uj(className)),grade=cls?gradeMap.get(ij(cls.grade)):null;if(subject&&grade&&!subject.gradeIds.includes(grade.id))subject.gradeIds.push(grade.id);}}
  for(const row of rows){const grade=addGrade(row.grade||uj(row.className)),cls=addClass(row.className,grade?.name),subject=addSubject(row.subject,row.department);if(subject&&grade&&!subject.gradeIds.includes(grade.id))subject.gradeIds.push(grade.id);if(cls&&grade){cls.gradeId=grade.id;cls.grade=grade.name;}}
  for(const a of oldAssignments){const grade=addGrade(a.grade||uj(a.className)),cls=addClass(a.className,grade?.name),subject=addSubject(a.subject,a.department);if(subject&&grade&&!subject.gradeIds.includes(grade.id))subject.gradeIds.push(grade.id);if(cls&&grade){cls.gradeId=grade.id;cls.grade=grade.name;}}
  const teachers=oldTeachers.map((t,index)=>({...t,id:t.id||`profile-${crypto.randomUUID()}`,teacherId:String(t.teacherId??'').trim()||`T-${String(index+1).padStart(3,'0')}`,teacher:String(t.teacher??'').trim(),active:t.active!==false,subjects:Array.isArray(t.subjects)?[...new Set(t.subjects.filter(Boolean))]:t.subject?[t.subject]:[],classes:Array.isArray(t.classes)?[...new Set(t.classes.map(lj).filter(Boolean))]:[]}));
  const teacherById=new Map(teachers.map(t=>[t.id,t]));
  const assignments=oldAssignments.map(a=>{const cls=addClass(a.className,a.grade),subject=addSubject(a.subject,a.department),grade=cls?gradeMap.get(ij(cls.grade)):addGrade(a.grade);const teacher=teacherById.get(a.profileId);return {...a,id:a.id||SR63.stableId('assignment',`${a.profileId}|${subject?.id}|${cls?.id}`),profileId:a.profileId,teacher:teacher?.teacher||a.teacher||'',subjectId:subject?.id||'',subject:subject?.name||a.subject||'',department:subject?.department||a.department||a.subject||'',classId:cls?.id||'',className:cls?.className||lj(a.className),gradeId:grade?.id||'',grade:grade?.name||a.grade||uj(a.className),active:a.active!==false};});
  const normalizedTeachers=teachers.map(t=>{const mine=assignments.filter(a=>a.profileId===t.id&&a.active!==false),subjects=[...new Set(mine.map(a=>a.subject))],classes=[...new Set(mine.map(a=>a.className))];return {...t,subject:t.subject||subjects[0]||'',department:t.department||mine[0]?.department||t.subject||'',subjects:subjects.length?subjects:t.subjects,classes:classes.length?classes:t.classes};});
  const grades=[...gradeMap.values()].sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name,'ar',{numeric:true}));
  const classes=[...classMap.values()].sort((a,b)=>(gradeMap.get(ij(a.grade))?.order??999)-(gradeMap.get(ij(b.grade))?.order??999)||a.order-b.order||a.className.localeCompare(b.className,'ar',{numeric:true}));
  const subjects=[...subjectMap.values()].sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name,'ar'));
  return {grades,classes,subjects,teachers:normalizedTeachers,teacherAssignments:assignments};
};
SR63.withCatalog=function(workspace){const c=SR63.ensureCatalog(workspace);return {...workspace,version:7,...c};};
SR63.assignmentMatches=function(workspace,subject,className){const c=SR63.ensureCatalog(workspace),key=dj(subject,className);return c.teacherAssignments.filter(a=>a.active!==false&&dj(a.subject,a.className)===key&&c.teachers.some(t=>t.id===a.profileId&&t.active!==false));};
SR63.setAssignment=function(workspace,classId,subjectId,profileId){
  const c=SR63.ensureCatalog(workspace),cls=c.classes.find(x=>x.id===classId),subject=c.subjects.find(x=>x.id===subjectId);if(!cls||!subject)SR63.fail('الشعبة أو المادة غير موجودة.');
  const keep=c.teacherAssignments.filter(a=>!(a.classId===classId&&a.subjectId===subjectId||dj(a.subject,a.className)===dj(subject.name,cls.className)));
  if(profileId){const teacher=c.teachers.find(t=>t.id===profileId&&t.active!==false);if(!teacher)SR63.fail('المعلم غير موجود أو غير نشط.');keep.push({id:SR63.stableId('assignment',`${profileId}|${subjectId}|${classId}`),profileId,teacher:teacher.teacher,subjectId,subject:subject.name,department:subject.department||subject.name,classId,className:cls.className,gradeId:cls.gradeId,grade:cls.grade,active:true});}
  return SR63.withCatalog({...workspace,grades:c.grades,classes:c.classes,subjects:c.subjects,teachers:c.teachers,teacherAssignments:keep});
};
SR63.catalogCoverage=function(workspace){
  const c=SR63.ensureCatalog(workspace),classes=c.classes.filter(x=>x.active!==false),subjects=c.subjects.filter(x=>x.active!==false),required=[];
  for(const cls of classes)for(const subject of subjects)if(!subject.gradeIds.length||subject.gradeIds.includes(cls.gradeId))required.push([cls,subject]);
  const assigned=required.filter(([cls,subject])=>c.teacherAssignments.some(a=>a.active!==false&&a.classId===cls.id&&a.subjectId===subject.id)).length;
  return {required:required.length,assigned,missing:required.length-assigned,percent:required.length?assigned/required.length*100:100};
};
SR63.studentProfile=function(workspace,studentId){
  const id=ij(studentId),rows=workspace.rows.filter(r=>ij(r.studentId)===id);if(!rows.length)return null;
  const latest=rows[0],exams=Object.fromEntries(XA.map(exam=>[exam,bj(rows,exam,workspace.settings)]));
  const subjectRows=rows.slice().sort((a,b)=>a.subject.localeCompare(b.subject,'ar')).map(row=>({row,subject:row.subject,className:hj(row,workspace.activeExam),teacher:mj(row,workspace.activeExam),exams:Object.fromEntries(XA.map(exam=>[exam,{score:row.scores[exam],total:pj(row,exam,workspace.settings),status:row.statuses[exam],percent:vj(row,exam,workspace.settings),teacher:mj(row,exam),className:hj(row,exam)}]))}));
  return {studentId:latest.studentId,studentName:latest.studentName,grade:gj(latest,workspace.activeExam),className:hj(latest,workspace.activeExam),rows:subjectRows,exams,subjects:subjectRows.length};
};
SR63.dashboardModel=function(workspace,filters={}){
  const active=workspace.activeExam,match=row=>(!filters.grade||filters.grade==='الكل'||gj(row,active)===filters.grade)&&(!filters.className||filters.className==='الكل'||hj(row,active)===filters.className)&&(!filters.subject||filters.subject==='الكل'||row.subject===filters.subject)&&(!filters.teacher||filters.teacher==='الكل'||mj(row,active)===filters.teacher),rows=workspace.rows.filter(match),metric=bj(rows,active,workspace.settings),coverage=SR63.catalogCoverage(workspace);
  const classGroups=Sj(rows,'className',active,workspace.settings,nj(active)),subjectGroups=Sj(rows,'subject',active,workspace.settings,nj(active)),teacherGroups=Sj(rows,'teacher',active,workspace.settings,nj(active)).filter(g=>g.name!=='غير محدد');
  const students=new Map();for(const row of rows){const pct=vj(row,active,workspace.settings);if(pct===null)continue;const key=ij(row.studentId),current=students.get(key)??{studentId:row.studentId,studentName:row.studentName,className:hj(row,active),values:[]};current.values.push(pct);students.set(key,current);}
  const studentRank=[...students.values()].map(s=>({...s,average:s.values.reduce((a,b)=>a+b,0)/s.values.length})).sort((a,b)=>b.average-a.average);
  const issues=RN({...workspace,rows},active),heat=[];const classes=[...new Set(rows.map(r=>hj(r,active)))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true})),subjects=[...new Set(rows.map(r=>r.subject))].sort((a,b)=>a.localeCompare(b,'ar'));
  for(const className of classes)for(const subject of subjects){const subset=rows.filter(r=>hj(r,active)===className&&r.subject===subject);if(subset.length)heat.push({className,subject,metric:bj(subset,active,workspace.settings)});}
  return {rows,metric,coverage,classGroups,subjectGroups,teacherGroups,studentRank,topStudents:studentRank.slice(0,8),struggling:studentRank.filter(s=>s.average<workspace.settings.pass).slice(-8).reverse(),issues,heat,classes,subjects};
};
