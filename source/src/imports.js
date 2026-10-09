SR63.linkKey=item=>dj(item.subject,item.className)+(item.exam?'|'+item.exam+'|'+ij(item.teacher??''):'');
SR63.stableStudentId=(name,className)=>SR63.stableId('auto-student',SR63.studentIdentityKey(name,className));
SR63.importReconciliation=function(items,workspace,policy,impact,matches,problems={}){
  const list=Array.isArray(items)?items:[],studentKeys=new Set(list.map(item=>{const official=SR63.studentOfficialId(item),fallback=SR63.studentIdentityKey(item.studentName,item.className);return official?`id:${ij(official)}`:(fallback?`fallback:${fallback}`:'');}).filter(Boolean)),subjects=[...new Set(list.map(item=>String(item.subject??'').trim()).filter(Boolean))],classes=[...new Set(list.map(item=>lj(item.className)).filter(Boolean))],files=[...new Set(list.map(item=>String(item.sourceFile??'').trim()).filter(Boolean))],matched=(matches??[]).filter(x=>x.selectedProfileId).length,unresolved=(matches??[]).filter(x=>!x.selectedProfileId).length;
  const aliases=[...new Set(subjects.map(name=>{const canonical=SR63.subjectAliasKey(name);return canonical&&canonical!==ij(name)?`${name} ← ${canonical}`:null;}).filter(Boolean))];
  return {students:studentKeys.size,results:list.length,subjects:subjects.length,classes:classes.length,files:files.length,matched,unresolved,aliases,created:impact?.created??0,empty:impact?.empty??0,overwritten:impact?.overwritten??0,unchanged:impact?.unchanged??0,invalid:problems.invalid??0,duplicates:problems.duplicates??0,identity:problems.identity??0,policy};
};
SR63.subjectAliasKey=function(value){
  const key=ij(value);if(!key)return '';
  if(/(الحاسب|الحاسوب|حاسب|الحوسبه|تكنولوجياالمعلومات|تقنيهالمعلومات)/.test(key))return ij('حاسب');
  if(/(التربيهالفنيه|تربيهفنيه|الفنون|فنون|فنيه|الفنبصري|الفنونالبصريه)/.test(key))return ij('فنية');
  if(/(التربيهالبدنيه|تربيهبدنيه|التربيهالرياضيه|رياضه)/.test(key))return ij('بدنية');
  const groups=[
    ['شرعية',['شرعية','التربية الاسلامية','التربية الإسلامية','تربية اسلامية','تربية إسلامية','اسلامية','إسلامية','دين','التربية الدينية']],
    ['عربي',['عربي','اللغة العربية','لغة عربية','العربية']],
    ['e',['e','english','انجليزي','إنجليزي','اللغة الانجليزية','اللغة الإنجليزية','لغة انجليزية','لغة إنجليزية']],
    ['رياضيات',['رياضيات','الرياضيات']],
    ['علوم',['علوم','العلوم']],
    ['اجتماعية',['اجتماعية','الدراسات الاجتماعية','دراسات اجتماعية','الاجتماعيات']],
    ['حاسب',['حاسب','الحاسب','الحاسب الآلي','حاسب آلي','الحاسوب','الحوسبة','تقنية المعلومات','تكنولوجيا المعلومات','الحوسبة وتكنولوجيا المعلومات','الحوسبة و تكنولوجيا المعلومات','الحاسب وتكنولوجيا المعلومات','الحاسوب وتكنولوجيا المعلومات','الحوسبة وتقنية المعلومات','الحاسب وتقنية المعلومات','الحاسوب وتقنية المعلومات','تكنولوجيا المعلومات والحوسبة','تقنية المعلومات والحوسبة']],
    ['فنية',['فنية','التربية الفنية','تربية فنية','التربية الفنية والبصرية','تربية فنية وبصرية','الفنون البصرية','فنون بصرية','الفنون','الفن البصري','الفنون والتصميم','التربية الفنية والتصميم']],
    ['بدنية',['بدنية','التربية البدنية','تربية بدنية','رياضة','التربية الرياضية']],
    ['مهارات2',['مهارات 2','مهارات2','المهارات 2','مهارات ثانية']],
    ['مهارات',['مهارات','المهارات']],
    ['برامجداعمة',['برامج داعمة','البرامج الداعمة','برنامج داعم']]
  ];
  for(const [canonical,aliases] of groups)if(aliases.some(alias=>ij(alias)===key))return ij(canonical);
  return key;
};
SR63.subjectEquivalent=(a,b)=>!!a&&!!b&&SR63.subjectAliasKey(a)===SR63.subjectAliasKey(b);
SR63.subjectMatchScore=function(a,b){
  const left=SR63.subjectAliasKey(a),right=SR63.subjectAliasKey(b);if(!left||!right)return 0;if(left===right)return 1;
  if(left.length>=4&&right.length>=4&&(left.includes(right)||right.includes(left)))return .9;
  return cde(left,right);
};
SR63.resolveSubjectAssignment=function(subject,className,assignments){
  const classKey=lj(className),active=(assignments??[]).filter(a=>a.active!==false&&lj(a.className)===classKey),raw=ij(subject);
  if(!raw)return {subject:String(subject??'').trim(),assignments:[]};
  const exact=active.filter(a=>ij(a.subject)===raw);if(exact.length)return {subject:exact[0].subject,assignments:exact};
  const alias=active.filter(a=>SR63.subjectEquivalent(a.subject,subject));if(alias.length){const names=[...new Set(alias.map(a=>a.subject))];if(names.length===1)return {subject:names[0],assignments:alias};}
  const scored=active.map(a=>({a,score:SR63.subjectMatchScore(subject,a.subject)})).filter(x=>x.score>=.72).sort((x,y)=>y.score-x.score);
  if(scored.length){const best=scored[0].score,bestRows=scored.filter(x=>Math.abs(x.score-best)<1e-9).map(x=>x.a),names=[...new Set(bestRows.map(a=>a.subject))];if(names.length===1)return {subject:names[0],assignments:bestRows};}
  return {subject:String(subject??'').trim(),assignments:[]};
};
SR63.readWideWorkbook=function(book,fileName,settings){
  const result=[],meta={exams:{}};
  for(const sheetName of book.SheetNames){if(!/إعدادات|اعدادات/.test(sheetName))continue;
    for(const row of Gv.sheet_to_json(book.Sheets[sheetName],{header:1,raw:true,defval:null,blankrows:true})){
      const key=String(row[0]??'').trim(),value=row[2];
      if(key==='school_name')meta.schoolName=String(value??'').trim();
      if(key==='academic_year')meta.academicYear=String(value??'').trim();
      const match=/^(exam[1-4])_(name|total)$/.exec(key);if(match){meta.exams[match[1]]??={key:match[1]};meta.exams[match[1]][match[2]]=match[2]==='total'?SR63.number(value):String(value??'').trim();}
    }
  }
  for(const [sheetIndex,sheetName] of book.SheetNames.entries()){
    const matrix=Gv.sheet_to_json(book.Sheets[sheetName],{header:1,raw:true,defval:null,blankrows:true});let headerIndex=-1,map,examColumns;
    for(let i=0;i<Math.min(25,matrix.length);i++){
      const headers=matrix[i].map(C9),find=(aliases)=>headers.findIndex(h=>aliases.some(a=>ij(a)===ij(h)));
      const candidate={studentId:find(settings.importAliases.studentId),studentName:find(settings.importAliases.studentName),className:find(settings.importAliases.className),subject:find(settings.importAliases.subject),teacher:find(settings.importAliases.teacher),department:find(settings.importAliases.department),grade:find(['الصف'])};
      const exams=XA.map((key,index)=>{const names=[tj(settings,key).name,meta.exams[key]?.name,ej.exams[index].name].filter(Boolean);return {key,score:find(names.map(n=>'درجة '+n)),status:find(names.map(n=>'حالة '+n)),total:find(names.map(n=>'الدرجة الكلية '+n)),teacher:find(names.map(n=>'معلم '+n)),className:find(names.map(n=>'شعبة '+n))};}).filter(exam=>exam.score>=0);
      if(candidate.studentName>=0&&candidate.className>=0&&candidate.subject>=0&&exams.length){headerIndex=i;map=candidate;examColumns=exams;break;}
    }
    if(headerIndex<0)continue;
    const groups=new Map();
    for(let index=headerIndex+1;index<matrix.length;index++){
      const source=matrix[index],name=C9(source[map.studentName]),subject=C9(source[map.subject]),rawId=map.studentId>=0?C9(source[map.studentId]):'';
      if(!rawId&&!name&&!subject)continue;
      const rawClass=C9(source[map.className]);
      const className=lj(rawClass.includes('/')||map.grade<0?rawClass:C9(source[map.grade])+'/'+rawClass);
      for(const exam of examColumns){
        const groupKey=subject+'\u0000'+exam.key;
        if(!groups.has(groupKey)){
          const label=`${sheetName} · ${subject||'مادة غير محددة'} · ${meta.exams[exam.key]?.name||tj(settings,exam.key).name}`;
          const configured=meta.exams[exam.key]?.total??tj(settings,exam.key).total;
          groups.set(groupKey,{id:`${fileName}-${sheetIndex}-${groupKey}`,fileName,sheet:label,sourceSheet:sheetName,hidden:!!book.Workbook?.Sheets?.[sheetIndex]?.Hidden,headerRow:headerIndex+1,schoolName:meta.schoolName??'',academicYear:meta.academicYear??'',subject,period:meta.exams[exam.key]?.name||tj(settings,exam.key).name,exam:exam.key,wide:true,selected:!book.Workbook?.Sheets?.[sheetIndex]?.Hidden,selectedScoreKey:String(exam.score),scoreColumns:[{key:String(exam.score),index:exam.score,header:C9(matrix[headerIndex][exam.score]),numericCount:0,statusCount:0,suggestedTotal:configured,totalKnown:true}],rows:[],issues:[],examDefinition:{key:exam.key,name:meta.exams[exam.key]?.name||tj(settings,exam.key).name,total:configured}});
        }
        const group=groups.get(groupKey),rawScore=source[exam.score],score=T9(rawScore),rawStatus=exam.status>=0?source[exam.status]:null;
        let statusInfo=C9(rawStatus)?E9(rawStatus,false,settings):E9(rawScore,score!==null,settings);
        let recognized=statusInfo.recognized;
        if(C9(rawScore)&&score===null){const fromScore=E9(rawScore,false,settings);if(!fromScore.recognized||fromScore.status!==statusInfo.status)recognized=false;}
        if(statusInfo.status==='present'&&score===null||statusInfo.status!=='present'&&score!==null)recognized=false;
        const examClass=exam.className>=0&&C9(source[exam.className])?lj(source[exam.className]):className;
        if(!name||!D9(examClass)||!subject)recognized=false;
        const rawTotal=exam.total>=0?source[exam.total]:null,total=C9(rawTotal)?T9(rawTotal):null;
        if(C9(rawTotal)&&(total===null||total<=0))recognized=false;
        if(!recognized)group.issues.push({severity:'error',row:index+1,sheet:sheetName,message:`راجع الرقم والاسم والمادة والشعبة واتساق الدرجة والحالة في ${group.period}.`});
        const studentId=rawId||SR63.stableStudentId(name,examClass);const scoreKey=String(exam.score);group.rows.push({id:`${fileName}-${sheetName}-${index+1}-${exam.key}`,studentId,studentName:name,grade:uj(examClass),className:examClass,sourceRow:index+1,teacher:C9(source[exam.teacher>=0?exam.teacher:map.teacher]),department:C9(source[map.department]),values:{[scoreKey]:{score,status:statusInfo.status,raw:C9(rawScore),recognized,total}}});
        if(score!==null)group.scoreColumns[0].numericCount++;else if(statusInfo.status!=='unentered')group.scoreColumns[0].statusCount++;
      }
    }
    result.push(...groups.values());
  }
  return {sheets:result,meta};
};
SR63.mergeTeachers=function(workspace,preview,policy){
  const base=SR63.ensureCatalog(workspace),existingByName=new Map(base.teachers.map(t=>[ij(t.teacher),t]));
  const incomingByName=new Map(),profileIdMap=new Map(),profileSubjects=new Map();
  for(const source of preview.profiles){
    const name=String(source.teacher??'').trim();if(!name)continue;const key=ij(name),existing=existingByName.get(key);
    if(policy==='update'&&!existing)continue;
    let teacher=incomingByName.get(key);
    if(!teacher){
      const id=existing?.id??SR63.stableId('teacher',key),teacherId=existing?.teacherId??`T-${String(base.teachers.length+incomingByName.size+1).padStart(3,'0')}`;
      teacher={...(existing??{}),id,teacherId,teacher:name,subject:'',department:'',coordinator:'',subjects:[],classes:[],active:true};incomingByName.set(key,teacher);profileSubjects.set(id,new Set());
    }
    profileIdMap.set(source.id,teacher.id);if(source.subject)profileSubjects.get(teacher.id).add(source.subject);
  }
  const incoming=[...incomingByName.values()].map(t=>({...t,subjects:[...profileSubjects.get(t.id)??[]]})),incomingIds=new Set(incoming.map(t=>t.id)),incomingNames=new Set(incoming.map(t=>ij(t.teacher)));
  const teachers=policy==='replace'?incoming:[...base.teachers.filter(t=>!incomingNames.has(ij(t.teacher))),...incoming];
  const teacherById=new Map(teachers.map(t=>[t.id,t])),teacherByName=new Map(teachers.map(t=>[ij(t.teacher),t]));
  const importedAssignments=[];const cellOwners=new Map();
  for(const assignment of preview.assignments){
    const profileId=profileIdMap.get(assignment.profileId);if(!profileId)continue;const teacher=teacherById.get(profileId);if(!teacher)continue;
    const subject=String(assignment.subject??'').trim(),className=lj(assignment.className);if(!subject||!D9(className))continue;
    const cell=dj(subject,className),owner=cellOwners.get(cell);if(owner&&owner!==profileId)SR63.fail(`يوجد أكثر من معلم للمادة والشعبة ${subject} — ${className}.`);cellOwners.set(cell,profileId);
    importedAssignments.push({id:SR63.stableId('assignment',`${profileId}|${ij(subject)}|${ij(className)}`),profileId,teacher:teacher.teacher,subject,department:String(assignment.department??subject).trim()||subject,className,grade:uj(className),active:true});
  }
  const importedCellKeys=new Set(importedAssignments.map(a=>dj(a.subject,a.className)));
  const assignments=policy==='replace'?importedAssignments:[...base.teacherAssignments.filter(a=>!importedCellKeys.has(dj(a.subject,a.className))),...importedAssignments];
  let catalog=SR63.ensureCatalog({...workspace,catalogDetached:false,teachers,teacherAssignments:assignments});
  const info=new Map();
  for(const profile of preview.profiles){if(!profile.subject)continue;const key=ij(profile.subject),current=info.get(key)??{name:profile.subject,department:'',coordinator:'',grades:new Set};if(!current.department&&profile.department)current.department=profile.department;if(!current.coordinator&&profile.coordinator)current.coordinator=profile.coordinator;for(const cls of profile.classes??[]){const grade=uj(cls);if(grade)current.grades.add(grade);}info.set(key,current);}
  for(const [name,coordinator] of Object.entries(preview.subjectCoordinators??{})){const key=ij(name),current=info.get(key)??{name,department:name,coordinator:'',grades:new Set};if(coordinator)current.coordinator=coordinator;info.set(key,current);}
  const gradeIdByName=new Map(catalog.grades.map(g=>[ij(g.name),g.id]));
  const subjects=catalog.subjects.map(subject=>{const data=info.get(ij(subject.name));if(!data)return subject;const coordinatorName=data.coordinator||subject.coordinatorName||'',coordinatorTeacher=teacherByName.get(ij(coordinatorName));const gradeIds=[...new Set([...subject.gradeIds,...[...data.grades].map(g=>gradeIdByName.get(ij(g))).filter(Boolean)])];return {...subject,department:data.department||subject.department||subject.name,coordinatorName,coordinatorId:coordinatorTeacher?.id??'',gradeIds,active:true};});
  catalog=SR63.ensureCatalog({...workspace,catalogDetached:false,...catalog,teachers,teacherAssignments:assignments,subjects});
  const imported={id:crypto.randomUUID(),name:preview.fileName,at:new Date().toISOString(),rows:importedAssignments.length,warnings:preview.issues.filter(i=>i.severity==='warning').length,kind:'teachers'};
  const result={...workspace,catalogDetached:false,...catalog,imports:[imported,...workspace.imports]};
  const coordinatorCount=subjects.filter(s=>info.has(ij(s.name))&&(s.coordinatorId||s.coordinatorName)).length;
  return jj(result,'استيراد الهيكل الأكاديمي',`${preview.fileName} — ${catalog.grades.length} صفوف، ${catalog.classes.length} شعب، ${catalog.subjects.length} مواد، ${catalog.teachers.length} معلمين، ${importedAssignments.length} تكليفًا، ${coordinatorCount} منسقين`);
};
SR63.commitImport=function(workspace,items,matches,files,exam,defaultTotal,getTotal,policy){
  const batchId=crypto.randomUUID(),profiles=new Map(workspace.teachers.map(p=>[p.id,p])),links=new Map(matches.map(m=>[m.key,m])),normalizedRows=SR63.reconcileStudentRows(workspace.rows),identityIds=SR63.studentIdentityIndex({...workspace,rows:normalizedRows}),rows=new Map(normalizedRows.map(row=>[_j(row),row])),aliasRows=new Map(normalizedRows.map(row=>[`${ij(row.studentId)}|${SR63.subjectAliasKey(row.subject)}`,_j(row)])),originalAliases=new Set(normalizedRows.map(row=>`${ij(row.studentId)}|${SR63.subjectAliasKey(row.subject)}`)),changes=[];let skipped=0,created=0,updated=0;
  const usedExams=new Set(),seen=new Set();
  for(const item of items){
    const target=item.exam??exam,link=links.get(SR63.linkKey(item))??links.get(dj(item.subject,item.className)),profile=profiles.get(link?.selectedProfileId),total=getTotal(item);
    if(!profile)SR63.fail('يوجد إسناد غير مكتمل. أكمل خريطة التكليفات أولًا.');
    const subject=String(link?.subject??item.subject??'').trim();if(!subject)SR63.fail('تعذر تحديد المادة في ملف النتيجة.');
    const className=lj(item.className),identityKey=SR63.studentIdentityKey(item.studentName,className),knownIds=identityIds.get(identityKey)??new Set(),sourceId=String(item.studentId??'').trim(),sourceOfficial=sourceId&&!/^auto-student-/i.test(sourceId);let canonicalStudentId;if(knownIds.size===1)canonicalStudentId=[...knownIds][0];else if(knownIds.size>1){if(sourceId&&knownIds.has(sourceId))canonicalStudentId=sourceId;else if(sourceOfficial)canonicalStudentId=sourceId;else SR63.fail(`يوجد أكثر من طالب باسم «${item.studentName}» في الشعبة ${className}. أضف رقم الطالب في ملف النتيجة لحسم الهوية دون دمج خاطئ.`);}else canonicalStudentId=sourceOfficial?sourceId:SR63.stableStudentId(item.studentName,className);if(!identityIds.has(identityKey))identityIds.set(identityKey,new Set());identityIds.get(identityKey).add(canonicalStudentId);
    const assignment=workspace.teacherAssignments.find(a=>a.active!==false&&a.profileId===profile.id&&lj(a.className)===className&&SR63.subjectEquivalent(a.subject,subject)),catalogSubject=(workspace.subjects??[]).find(s=>s.active!==false&&SR63.subjectEquivalent(s.name,subject)),department=assignment?.department||catalogSubject?.department||profile.department||subject;
    const itemKey=`${ij(canonicalStudentId)}|${SR63.subjectAliasKey(subject)}|${target}`;if(seen.has(itemKey))SR63.fail('توجد نتيجة مكررة للطالب والمادة والاختبار.');seen.add(itemKey);
    if(!['present','absent','excused','unexcused','deprived','not_enrolled','unentered'].includes(item.status)||!XA.includes(target)||!item.recognized||!Number.isFinite(total)||total<=0||item.status==='present'&&(!Number.isFinite(item.score)||item.score<0||item.score>total)||item.status!=='present'&&item.score!==null)SR63.fail('توجد درجة أو حالة غير صالحة في الملف.');
    usedExams.add(target);const key=`${ij(canonicalStudentId)}|${ij(subject)}`,aliasKey=`${ij(canonicalStudentId)}|${SR63.subjectAliasKey(subject)}`,previousKey=rows.has(key)?key:(aliasRows.get(aliasKey)??key),previous=rows.get(previousKey),hasScore=previous&&(previous.scores[target]!==null||previous.statuses[target]!=='unentered');
    if((policy==='skip'&&originalAliases.has(aliasKey))||(policy==='empty'&&hasScore)){skipped++;continue;}
    const row=previous??{id:`row-${crypto.randomUUID()}`,studentId:canonicalStudentId,studentName:item.studentName,className,grade:uj(className),subject,department,teacher:profile.teacher,scores:Object.fromEntries(XA.map(k=>[k,null])),statuses:Object.fromEntries(XA.map(k=>[k,'unentered'])),totals:Object.fromEntries(XA.map(k=>[k,null])),examTeachers:Object.fromEntries(XA.map(k=>[k,''])),examClasses:Object.fromEntries(XA.map(k=>[k,''])),importBatches:Object.fromEntries(XA.map(k=>[k,null]))};
    const next={...row,studentId:canonicalStudentId,studentName:item.studentName,className,grade:uj(className),subject,department,teacher:profile.teacher,scores:{...row.scores,[target]:item.score},statuses:{...row.statuses,[target]:item.status},totals:{...row.totals,[target]:total},examTeachers:{...row.examTeachers,[target]:profile.teacher},examClasses:{...row.examClasses,[target]:className}};
    if(previous&&SR63.equal(previous,next)){skipped++;continue;}
    next.importBatches={...row.importBatches,[target]:batchId};if(previousKey!==key)rows.delete(previousKey);rows.set(key,next);aliasRows.set(aliasKey,key);
    changes.push({key,rowId:next.id,exam:target,before:previous?{score:previous.scores[target],status:previous.statuses[target],total:previous.totals[target],teacher:previous.examTeachers[target],className:previous.examClasses[target],batch:previous.importBatches[target]}:null});
    if(previous)updated++;else created++;
  }
  if(rows.size>100000)SR63.fail('سيزيد إجمالي القاعدة عن 100 ألف سجل؛ لم يُعتمد الاستيراد.');
  const manual=[...new Map(matches.filter(m=>m.status==='manual'&&!m.exam).map(m=>{const p=profiles.get(m.selectedProfileId),subject=m.subject;return [dj(subject,m.className),{id:`assignment-${p.id}-${dj(subject,m.className)}`,profileId:p.id,teacher:p.teacher,subject,department:(workspace.subjects??[]).find(s=>SR63.subjectEquivalent(s.name,subject))?.department||p.department||subject,className:lj(m.className),grade:uj(m.className)}];})).values()];
  const assignments=[...workspace.teacherAssignments.filter(a=>!manual.some(m=>dj(m.subject,m.className)===dj(a.subject,a.className))),...manual];
  const definitions=new Map(files.flatMap(file=>file.sheets.filter(s=>s.selected&&s.wide&&s.examDefinition).map(s=>[s.exam,s.examDefinition])));
  const wide=definitions.size>0,exams=workspace.settings.exams.map(def=>definitions.has(def.key)?{...def,...definitions.get(def.key)}:!wide&&def.key===exam?{...def,total:defaultTotal}:def);
  const imported={id:batchId,name:[...new Set(files.map(f=>f.fileName))].join('، '),at:new Date().toISOString(),rows:changes.length,warnings:files.flatMap(f=>[...f.issues,...f.sheets.flatMap(s=>s.issues)]).filter(i=>i.severity==='warning').length,kind:'results',exam:usedExams.size>1?'multi':[...usedExams][0]??exam,changes,skipped,updated,created};
  return jj(SR63.withCatalog({...workspace,rows:[...rows.values()],activeExam:usedExams.size===1?[...usedExams][0]:workspace.activeExam,settings:{...workspace.settings,exams},teacherAssignments:assignments,teachers:workspace.teachers.map(p=>({...p,classes:[...new Set(assignments.filter(a=>a.profileId===p.id).map(a=>a.className))]})),imports:[imported,...workspace.imports]}),'استيراد النتائج',`${imported.name} — ${changes.length} نتيجة، ${usedExams.size} اختبار`);
};
