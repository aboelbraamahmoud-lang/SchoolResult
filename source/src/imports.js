SR63.linkKey=item=>dj(item.subject,item.className)+(item.exam?'|'+item.exam+'|'+ij(item.teacher??''):'');
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
      if(candidate.studentId>=0&&candidate.studentName>=0&&candidate.className>=0&&candidate.subject>=0&&exams.length){headerIndex=i;map=candidate;examColumns=exams;break;}
    }
    if(headerIndex<0)continue;
    const groups=new Map();
    for(let index=headerIndex+1;index<matrix.length;index++){
      const source=matrix[index],id=C9(source[map.studentId]),name=C9(source[map.studentName]),subject=C9(source[map.subject]);
      if(!id&&!name&&!subject)continue;
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
        if(!id||!name||!D9(examClass)||!subject)recognized=false;
        const rawTotal=exam.total>=0?source[exam.total]:null,total=C9(rawTotal)?T9(rawTotal):null;
        if(C9(rawTotal)&&(total===null||total<=0))recognized=false;
        if(!recognized)group.issues.push({severity:'error',row:index+1,sheet:sheetName,message:`راجع الرقم والاسم والمادة والشعبة واتساق الدرجة والحالة في ${group.period}.`});
        const scoreKey=String(exam.score);group.rows.push({id:`${fileName}-${sheetName}-${index+1}-${exam.key}`,studentId:id,studentName:name,grade:uj(examClass),className:examClass,sourceRow:index+1,teacher:C9(source[exam.teacher>=0?exam.teacher:map.teacher]),department:C9(source[map.department]),values:{[scoreKey]:{score,status:statusInfo.status,raw:C9(rawScore),recognized,total}}});
        if(score!==null)group.scoreColumns[0].numericCount++;else if(statusInfo.status!=='unentered')group.scoreColumns[0].statusCount++;
      }
    }
    result.push(...groups.values());
  }
  return {sheets:result,meta};
};
SR63.mergeTeachers=function(workspace,preview,policy){
  const key=profile=>`${ij(profile.teacher)}|${ij(profile.subject)}`,existing=new Map(workspace.teachers.map(p=>[key(p),p])),idMap=new Map();
  const grouped=new Map();for(const profile of preview.profiles){const identity=key(profile);if(policy==='update'&&!existing.has(identity))continue;const old=grouped.get(identity)??existing.get(identity),id=old?.id??`profile-${crypto.randomUUID()}`;idMap.set(profile.id,id);grouped.set(identity,{...profile,id});}const incoming=[...grouped.values()];
  const profiles=policy==='replace'?incoming:[...new Map([...workspace.teachers,...incoming].map(p=>[key(p),p])).values()];
  const profileIds=new Set(profiles.map(p=>p.id));
  const assignments=[...new Map(preview.assignments.filter(a=>idMap.has(a.profileId)).map(a=>{const id=`assignment-${idMap.get(a.profileId)}-${dj(a.subject,a.className)}`;return [id,{...a,profileId:idMap.get(a.profileId),id}];})).values()];
  const replacedKeys=new Set(assignments.map(a=>dj(a.subject,a.className)));
  const merged=policy==='replace'?assignments:[...workspace.teacherAssignments.filter(a=>!replacedKeys.has(dj(a.subject,a.className))&&profileIds.has(a.profileId)),...assignments];
  const finalProfiles=profiles.map(profile=>({...profile,classes:[...new Set(merged.filter(a=>a.profileId===profile.id).map(a=>lj(a.className)))]}));
  const result={...workspace,teachers:finalProfiles,teacherAssignments:merged,imports:[{id:crypto.randomUUID(),name:preview.fileName,at:new Date().toISOString(),rows:assignments.length,warnings:preview.issues.filter(i=>i.severity==='warning').length,kind:'teachers'},...workspace.imports]};
  return jj(result,'استيراد المعلمين',`${preview.fileName} — ${policy}؛ حُفظت معرفات المعلمين ونتائجهم التاريخية`);
};
SR63.commitImport=function(workspace,items,matches,files,exam,defaultTotal,getTotal,policy){
  const batchId=crypto.randomUUID(),profiles=new Map(workspace.teachers.map(p=>[p.id,p])),links=new Map(matches.map(m=>[m.key,m])),rows=new Map(workspace.rows.map(row=>[_j(row),row])),changes=[];let skipped=0,created=0,updated=0;
  const usedExams=new Set(),originalKeys=new Set(rows.keys()),seen=new Set();
  for(const item of items){
    const target=item.exam??exam,link=links.get(SR63.linkKey(item))??links.get(dj(item.subject,item.className)),profile=profiles.get(link?.selectedProfileId),total=getTotal(item);
    if(!profile)SR63.fail('يوجد إسناد غير مكتمل.');
    const itemKey=_j(item)+'|'+target;if(seen.has(itemKey))SR63.fail('توجد نتيجة مكررة للطالب والمادة والاختبار.');seen.add(itemKey);
    if(!['present','absent','excused','unexcused','deprived','not_enrolled','unentered'].includes(item.status)||!XA.includes(target)||!item.recognized||!Number.isFinite(total)||total<=0||item.status==='present'&&(!Number.isFinite(item.score)||item.score<0||item.score>total)||item.status!=='present'&&item.score!==null)SR63.fail('توجد درجة أو حالة غير صالحة في الملف.');
    usedExams.add(target);const key=_j(item),previous=rows.get(key),hasScore=previous&&(previous.scores[target]!==null||previous.statuses[target]!=='unentered');
    if(policy==='skip'&&originalKeys.has(key)||policy==='empty'&&hasScore){skipped++;continue;}
    const row=previous??{id:`row-${crypto.randomUUID()}`,studentId:item.studentId,studentName:item.studentName,className:item.className,grade:uj(item.className),subject:item.subject,department:profile.department||item.subject,teacher:profile.teacher,scores:Object.fromEntries(XA.map(k=>[k,null])),statuses:Object.fromEntries(XA.map(k=>[k,'unentered'])),totals:Object.fromEntries(XA.map(k=>[k,null])),examTeachers:Object.fromEntries(XA.map(k=>[k,''])),examClasses:Object.fromEntries(XA.map(k=>[k,''])),importBatches:Object.fromEntries(XA.map(k=>[k,null]))};
    const next={...row,studentName:item.studentName,className:lj(item.className),grade:uj(item.className),subject:item.subject,department:profile.department||item.department||item.subject,teacher:profile.teacher,scores:{...row.scores,[target]:item.score},statuses:{...row.statuses,[target]:item.status},totals:{...row.totals,[target]:total},examTeachers:{...row.examTeachers,[target]:profile.teacher},examClasses:{...row.examClasses,[target]:lj(item.className)}};
    if(previous&&SR63.equal(previous,next)){skipped++;continue;}
    next.importBatches={...row.importBatches,[target]:batchId};rows.set(key,next);
    changes.push({key,rowId:next.id,exam:target,before:previous?{score:previous.scores[target],status:previous.statuses[target],total:previous.totals[target],teacher:previous.examTeachers[target],className:previous.examClasses[target],batch:previous.importBatches[target]}:null});
    if(previous)updated++;else created++;
  }
  if(rows.size>100000)SR63.fail('سيزيد إجمالي القاعدة عن 100 ألف سجل؛ لم يُعتمد الاستيراد.');
  const manual=[...new Map(matches.filter(m=>m.status==='manual'&&!m.exam).map(m=>{const p=profiles.get(m.selectedProfileId);return [dj(m.subject,m.className),{id:`assignment-${p.id}-${dj(m.subject,m.className)}`,profileId:p.id,teacher:p.teacher,subject:m.subject,department:p.department||m.subject,className:lj(m.className),grade:uj(m.className)}];})).values()];
  const assignments=[...workspace.teacherAssignments.filter(a=>!manual.some(m=>dj(m.subject,m.className)===dj(a.subject,a.className))),...manual];
  const definitions=new Map(files.flatMap(file=>file.sheets.filter(s=>s.selected&&s.wide&&s.examDefinition).map(s=>[s.exam,s.examDefinition])));
  const wide=definitions.size>0,exams=workspace.settings.exams.map(def=>definitions.has(def.key)?{...def,...definitions.get(def.key)}:!wide&&def.key===exam?{...def,total:defaultTotal}:def);
  const imported={id:batchId,name:[...new Set(files.map(f=>f.fileName))].join('، '),at:new Date().toISOString(),rows:changes.length,warnings:files.flatMap(f=>[...f.issues,...f.sheets.flatMap(s=>s.issues)]).filter(i=>i.severity==='warning').length,kind:'results',exam:usedExams.size>1?'multi':[...usedExams][0]??exam,changes,skipped,updated,created};
  return jj({...workspace,rows:[...rows.values()],activeExam:usedExams.size===1?[...usedExams][0]:workspace.activeExam,settings:{...workspace.settings,exams},teacherAssignments:assignments,teachers:workspace.teachers.map(p=>({...p,classes:[...new Set(assignments.filter(a=>a.profileId===p.id).map(a=>a.className))]})),imports:[imported,...workspace.imports]},'استيراد النتائج',`${imported.name} — ${changes.length} نتيجة، ${usedExams.size} اختبار`);
};
