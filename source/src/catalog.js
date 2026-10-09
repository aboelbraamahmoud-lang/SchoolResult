/* School Results 6.8 — relational academic catalog, dashboard model and student profile. */
SR63.stableId=function(prefix,value){
  let h=2166136261;for(const ch of String(value??'')){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return `${prefix}-${(h>>>0).toString(36)}`;
};
SR63.studentNameKey=function(value){
  const clean=String(value??'').normalize('NFKC').replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g,'').replace(/[^\p{L}\p{N}\s]/gu,' ');
  return ij(clean);
};
SR63.studentIdentityKey=function(name,className){return `${SR63.studentNameKey(name)}|${lj(className)}`;};
SR63.studentIdentityFromRow=function(row,exam){return SR63.studentIdentityKey(row?.studentName,exam?hj(row,exam):(row?.className??''));};
SR63.studentOfficialId=function(row){const id=String(row?.studentId??'').trim();return id&&!/^auto-student-/i.test(id)?id:'';};
SR63.studentCanonicalId=function(row,exam){const existing=String(row?.studentId??'').trim();if(existing)return existing;const key=SR63.studentIdentityFromRow(row,exam);return key?SR63.stableId('auto-student',key):'';};
SR63.studentEntityKey=function(row,exam){const id=String(row?.studentId??'').trim();return id?`id:${ij(id)}`:`fallback:${SR63.studentIdentityFromRow(row,exam)}`;};
SR63.reconcileStudentRows=function(rows){
  const list=Array.isArray(rows)?rows:[],groups=new Map();
  for(const row of list){const key=SR63.studentIdentityFromRow(row);if(!key)continue;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
  const plan=new Map();
  for(const [key,group] of groups){
    const ids=[...new Set(group.map(row=>String(row.studentId??'').trim()).filter(Boolean))],official=[...new Set(group.map(SR63.studentOfficialId).filter(Boolean))];
    if(official.length<=1)plan.set(key,{mode:'merge',id:official[0]||SR63.stableId('auto-student',key)});
    else plan.set(key,{mode:'ambiguous',official:new Set(official),fallback:SR63.stableId('auto-student',key)});
  }
  return list.map(row=>{const key=SR63.studentIdentityFromRow(row),rule=plan.get(key),current=String(row.studentId??'').trim();let studentId=current||SR63.studentCanonicalId(row);
    if(rule?.mode==='merge')studentId=rule.id;
    else if(rule?.mode==='ambiguous'&&!SR63.studentOfficialId(row))studentId=current||rule.fallback;
    return studentId===row.studentId?row:{...row,studentId};
  });
};
SR63.studentIdentityIndex=function(workspace,exam){
  const rows=SR63.reconcileStudentRows(Array.isArray(workspace?.rows)?workspace.rows:[]),index=new Map();
  for(const row of rows){const fallback=SR63.studentIdentityFromRow(row,exam),id=String(row.studentId??'').trim();if(!fallback||!id)continue;if(!index.has(fallback))index.set(fallback,new Set());index.get(fallback).add(id);}
  return index;
};
SR63.studentIdentityConflicts=function(workspace,exam){
  const rows=Array.isArray(workspace?.rows)?workspace.rows:[],groups=new Map();
  for(const row of rows){const fallback=SR63.studentIdentityFromRow(row,exam),official=SR63.studentOfficialId(row);if(!fallback||!official)continue;if(!groups.has(fallback))groups.set(fallback,new Set());groups.get(fallback).add(official);}
  return new Map([...groups].filter(([,ids])=>ids.size>1));
};
SR63.studentRegistry=function(workspace,exam){
  const rows=SR63.reconcileStudentRows(Array.isArray(workspace?.rows)?workspace.rows:[]),students=new Map();
  for(const row of rows){const key=SR63.studentEntityKey(row,exam);if(!key)continue;const className=exam?hj(row,exam):(row.className||''),studentId=SR63.studentCanonicalId(row,exam),current=students.get(key);if(!current)students.set(key,{key,identityKey:SR63.studentIdentityFromRow(row,exam),studentId,studentName:row.studentName,className,grade:exam?gj(row,exam):(row.grade||uj(className)),rows:1});else current.rows++;}
  return [...students.values()];
};
SR63.ensureCatalog=function(workspace){
  const source=workspace??{}, detached=source.catalogDetached===true, rows=Array.isArray(source.rows)?source.rows:[], oldAssignments=Array.isArray(source.teacherAssignments)?source.teacherAssignments:[], oldTeachers=Array.isArray(source.teachers)?source.teachers:[];
  const gradeMap=new Map(), classMap=new Map(), subjectMap=new Map();
  const addGrade=(value,seed={})=>{const name=String(value??'').trim();if(!name)return null;const key=ij(name);let item=gradeMap.get(key);if(!item){item={id:seed.id||SR63.stableId('grade',key),name,order:Number.isFinite(seed.order)?seed.order:gradeMap.size+1,active:seed.active!==false};gradeMap.set(key,item);}else if(seed.active===true)item.active=true;return item;};
  const addClass=(value,gradeValue,seed={})=>{const className=lj(String(value??''));if(!className)return null;const gradeName=String(gradeValue??uj(className)??'').trim()||uj(className),grade=addGrade(gradeName),key=ij(className);let item=classMap.get(key);if(!item){item={id:seed.id||SR63.stableId('class',key),name:seed.name||className,className,gradeId:seed.gradeId||grade?.id||'',grade:grade?.name||gradeName,order:Number.isFinite(seed.order)?seed.order:classMap.size+1,active:seed.active!==false};classMap.set(key,item);}else{item.gradeId=item.gradeId||grade?.id||'';item.grade=item.grade||grade?.name||gradeName;if(seed.active===true)item.active=true;}return item;};
  const addSubject=(value,department,seed={})=>{const name=String(value??'').trim();if(!name)return null;const key=ij(name);let item=subjectMap.get(key);const coordinatorName=String(seed.coordinatorName??seed.coordinator??'').trim(),coordinatorId=String(seed.coordinatorId??'').trim();if(!item){item={id:seed.id||SR63.stableId('subject',key),name,department:String(seed.department??department??name).trim()||name,coordinatorId,coordinatorName,gradeIds:Array.isArray(seed.gradeIds)?[...new Set(seed.gradeIds.filter(Boolean))]:[],order:Number.isFinite(seed.order)?seed.order:subjectMap.size+1,active:seed.active!==false};subjectMap.set(key,item);}else{item.department=item.department||String(department??name).trim()||name;if(!item.coordinatorName&&coordinatorName)item.coordinatorName=coordinatorName;if(!item.coordinatorId&&coordinatorId)item.coordinatorId=coordinatorId;if(seed.active===true)item.active=true;for(const id of seed.gradeIds??[])if(id&&!item.gradeIds.includes(id))item.gradeIds.push(id);}return item;};
  for(const g of source.grades??[])addGrade(typeof g==='string'?g:g?.name,g&&typeof g==='object'?g:{});
  for(const c of source.classes??[])addClass(typeof c==='string'?c:c?.className??c?.name,c?.grade,c&&typeof c==='object'?c:{});
  for(const s of source.subjects??[])addSubject(typeof s==='string'?s:s?.name,s?.department,s&&typeof s==='object'?s:{});
  for(const teacher of oldTeachers){const subject=addSubject(teacher.subject,teacher.department,{coordinatorName:teacher.coordinator||''});for(const className of teacher.classes??[]){const cls=addClass(className,uj(className)),grade=cls?gradeMap.get(ij(cls.grade)):null;if(subject&&grade&&!subject.gradeIds.includes(grade.id))subject.gradeIds.push(grade.id);}}
  if(!detached)for(const row of rows){const grade=addGrade(row.grade||uj(row.className)),cls=addClass(row.className,grade?.name),subject=addSubject(row.subject,row.department);if(subject&&grade&&!subject.gradeIds.includes(grade.id))subject.gradeIds.push(grade.id);if(cls&&grade){cls.gradeId=grade.id;cls.grade=grade.name;}}
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
SR63.subjectCoordinator=function(workspace,subjectName){const c=SR63.ensureCatalog(workspace),subject=c.subjects.find(s=>ij(s.name)===ij(subjectName));if(!subject)return '';if(subject.coordinatorId){const teacher=c.teachers.find(t=>t.id===subject.coordinatorId);if(teacher?.teacher)return teacher.teacher;}return String(subject.coordinatorName??'').trim();};
SR63.subjectCoordinatorMap=function(workspace){const c=SR63.ensureCatalog(workspace);return Object.fromEntries(c.subjects.map(subject=>[subject.name,SR63.subjectCoordinator({...workspace,...c},subject.name)]));};
SR63.withCatalog=function(workspace){const rows=SR63.reconcileStudentRows(workspace?.rows??[]),c=SR63.ensureCatalog({...workspace,rows});return {...workspace,version:7,catalogDetached:workspace?.catalogDetached===true,rows,students:SR63.studentRegistry({rows}),...c};};
SR63.clearAcademicStructure=function(workspace){return SR63.withCatalog({...workspace,catalogDetached:true,grades:[],classes:[],subjects:[],teachers:[],teacherAssignments:[]});};
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
SR63.catalogHealth=function(workspace){
  const c=SR63.ensureCatalog(workspace),coverage=SR63.catalogCoverage(workspace),activeTeachers=c.teachers.filter(t=>t.active!==false),activeSubjects=c.subjects.filter(s=>s.active!==false),activeClasses=c.classes.filter(x=>x.active!==false),issues=[];
  const duplicateTeacherNames=[...new Map(activeTeachers.map(t=>[ij(t.teacher),(activeTeachers.filter(x=>ij(x.teacher)===ij(t.teacher))).length])).entries()].filter(([,count])=>count>1);
  const cells=new Map();for(const a of c.teacherAssignments.filter(a=>a.active!==false)){const key=`${SR63.subjectAliasKey?SR63.subjectAliasKey(a.subject):ij(a.subject)}|${lj(a.className)}`;if(!cells.has(key))cells.set(key,new Set);cells.get(key).add(a.profileId);}
  const assignmentConflicts=[...cells.values()].filter(ids=>ids.size>1).length,orphanAssignments=c.teacherAssignments.filter(a=>a.active!==false&&!activeTeachers.some(t=>t.id===a.profileId)).length,classesWithoutAssignments=activeClasses.filter(cls=>!c.teacherAssignments.some(a=>a.active!==false&&a.classId===cls.id)).length,subjectsWithoutCoordinator=activeSubjects.filter(subject=>!SR63.subjectCoordinator({...workspace,...c},subject.name)).length,identityConflicts=SR63.studentIdentityConflicts(workspace,workspace.activeExam).size;
  if(coverage.missing)issues.push({id:'coverage',severity:'critical',label:`${coverage.missing} تكليف ناقص`});
  if(assignmentConflicts)issues.push({id:'assignment-conflicts',severity:'critical',label:`${assignmentConflicts} تعارض تكليف`});
  if(orphanAssignments)issues.push({id:'orphan-assignments',severity:'critical',label:`${orphanAssignments} تكليف بلا معلم صالح`});
  if(identityConflicts)issues.push({id:'identity-conflicts',severity:'critical',label:`${identityConflicts} تعارض هوية طالب`});
  if(duplicateTeacherNames.length)issues.push({id:'duplicate-teachers',severity:'warning',label:`${duplicateTeacherNames.length} اسم معلم مكرر`});
  if(classesWithoutAssignments)issues.push({id:'empty-classes',severity:'warning',label:`${classesWithoutAssignments} شعبة بلا تكليفات`});
  if(subjectsWithoutCoordinator)issues.push({id:'coordinators',severity:'info',label:`${subjectsWithoutCoordinator} مادة بلا منسق`});
  const critical=issues.filter(x=>x.severity==='critical').length,warning=issues.filter(x=>x.severity==='warning').length,score=Math.max(0,Math.round(100-critical*20-warning*7-(subjectsWithoutCoordinator?Math.min(10,subjectsWithoutCoordinator):0)));
  return {score,ready:critical===0,critical,warning,issues,coverage,assignmentConflicts,orphanAssignments,identityConflicts,duplicateTeacherNames:duplicateTeacherNames.length,classesWithoutAssignments,subjectsWithoutCoordinator};
};
SR63.studentProfile=function(workspace,studentId){
  const id=ij(studentId),seed=workspace.rows.find(row=>ij(row.studentId)===id||ij(SR63.studentCanonicalId(row,workspace.activeExam))===id);if(!seed)return null;const entity=SR63.studentEntityKey(seed,workspace.activeExam),rows=workspace.rows.filter(row=>SR63.studentEntityKey(row,workspace.activeExam)===entity);if(!rows.length)return null;
  const latest=rows[0],canonicalId=SR63.studentCanonicalId(latest,workspace.activeExam),exams=Object.fromEntries(XA.map(exam=>[exam,bj(rows,exam,workspace.settings)]));
  const subjectRows=rows.slice().sort((a,b)=>a.subject.localeCompare(b.subject,'ar')).map(row=>({row,subject:row.subject,className:hj(row,workspace.activeExam),teacher:mj(row,workspace.activeExam),exams:Object.fromEntries(XA.map(exam=>[exam,{score:row.scores[exam],total:pj(row,exam,workspace.settings),status:row.statuses[exam],percent:vj(row,exam,workspace.settings),teacher:mj(row,exam),className:hj(row,exam)}]))}));
  return {studentId:canonicalId,studentName:latest.studentName,grade:gj(latest,workspace.activeExam),className:hj(latest,workspace.activeExam),rows:subjectRows,exams,subjects:subjectRows.length};
};
SR63.dashboardModel=function(workspace,filters={}){
  const active=workspace.activeExam,match=row=>(!filters.grade||filters.grade==='الكل'||gj(row,active)===filters.grade)&&(!filters.className||filters.className==='الكل'||hj(row,active)===filters.className)&&(!filters.subject||filters.subject==='الكل'||row.subject===filters.subject)&&(!filters.teacher||filters.teacher==='الكل'||mj(row,active)===filters.teacher),rows=workspace.rows.filter(match),metric=bj(rows,active,workspace.settings),coverage=SR63.catalogCoverage(workspace);
  const classGroups=Sj(rows,'className',active,workspace.settings,nj(active)),subjectGroups=Sj(rows,'subject',active,workspace.settings,nj(active)),teacherGroups=Sj(rows,'teacher',active,workspace.settings,nj(active)).filter(g=>g.name!=='غير محدد');
  const students=new Map();for(const row of rows){const pct=vj(row,active,workspace.settings);if(pct===null)continue;const key=SR63.studentEntityKey(row,active),current=students.get(key)??{studentId:SR63.studentCanonicalId(row,active),studentName:row.studentName,className:hj(row,active),values:[]};current.values.push(pct);students.set(key,current);}
  const studentRank=[...students.values()].map(s=>({...s,average:s.values.reduce((a,b)=>a+b,0)/s.values.length})).sort((a,b)=>b.average-a.average);
  const issues=RN({...workspace,rows},active),heat=[];const classes=[...new Set(rows.map(r=>hj(r,active)))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true})),subjects=[...new Set(rows.map(r=>r.subject))].sort((a,b)=>a.localeCompare(b,'ar'));
  for(const className of classes)for(const subject of subjects){const subset=rows.filter(r=>hj(r,active)===className&&r.subject===subject);if(subset.length)heat.push({className,subject,metric:bj(subset,active,workspace.settings)});}
  return {rows,metric,coverage,classGroups,subjectGroups,teacherGroups,studentRank,topStudents:studentRank.slice(0,8),struggling:studentRank.filter(s=>s.average<workspace.settings.pass).slice(-8).reverse(),issues,heat,classes,subjects};
};
