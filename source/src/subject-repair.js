/* 6.10.8: Non-destructive, snapshot-gated repair of legacy subject aliases. */
SR63.subjectLinkRepairPreview=function(workspace){
  const catalog=SR63.ensureCatalog(workspace),canonical=new Map(catalog.subjects.map(s=>[SR63.subjectAliasKey(s.name),s]));
  const profiles=new Map(catalog.teachers.filter(t=>t.active!==false).map(t=>[t.id,t]));
  const assignments=new Map();
  for(const a of catalog.teacherAssignments.filter(a=>a.active!==false&&profiles.has(a.profileId))){
    const key=SR63.subjectAliasKey(a.subject)+'|'+lj(a.className);if(!assignments.has(key))assignments.set(key,new Set());assignments.get(key).add(a.profileId);
  }
  const latestBatch=(workspace.imports??[]).find(b=>b.kind==='results')?.id||'';
  const seen=new Map(),conflicts=[],plan=[];let renamed=0,teacherFixed=0,unassigned=0;
  for(const row of workspace.rows??[]){
    const key=SR63.subjectAliasKey(row.subject),entry=canonical.get(key),subject=entry?.name||row.subject;
    const rowKey=ij(row.studentId)+'|'+key;
    if(seen.has(rowKey))conflicts.push({id:row.id,otherId:seen.get(rowKey)});else seen.set(rowKey,row.id);
    const owners=[...(assignments.get(key+'|'+lj(row.className))??[])];
    const owner=owners.length===1?profiles.get(owners[0]):null;
    if(owners.length!==1)unassigned++;
    const newExamTeachers={...row.examTeachers};
    let teacher=row.teacher,changedTeacher=false;
    for(const exam of XA){
      const className=lj(row.examClasses?.[exam]||row.className);
      const examOwners=[...(assignments.get(key+'|'+className)??[])];
      const examOwner=examOwners.length===1?profiles.get(examOwners[0]):null;
      const recent=!!latestBatch&&row.importBatches?.[exam]===latestBatch;
      const hasOutcome=(row.statuses?.[exam]&&row.statuses[exam]!=='unentered')||row.scores?.[exam]!==null&&row.scores?.[exam]!==undefined;
      if(examOwner&&hasOutcome&&(recent||!newExamTeachers[exam])){
        if(newExamTeachers[exam]!==examOwner.teacher){newExamTeachers[exam]=examOwner.teacher;changedTeacher=true;}
      }
    }
    // Repair the current teacher only for last-batch records or genuinely empty values.
    const recentAny=!!latestBatch&&XA.some(exam=>row.importBatches?.[exam]===latestBatch);
    if(owner&&(recentAny||!teacher)&&teacher!==owner.teacher){teacher=owner.teacher;changedTeacher=true;}
    if(subject!==row.subject)renamed++;
    if(changedTeacher)teacherFixed++;
    plan.push({row,subject,department:subject!==row.subject&&(row.department===row.subject||!row.department)?entry?.department||row.department:row.department,teacher,examTeachers:newExamTeachers});
  }
  return {renamed,teacherFixed,unassigned,conflicts,plan};
};
SR63.repairSubjectLinks=function(workspace){
  const preview=SR63.subjectLinkRepairPreview(workspace);
  if(preview.conflicts.length)SR63.fail(`توجد ${preview.conflicts.length} نتيجة ذات هوية مادة متعارضة. لم يُعدَّل شيء.`);
  const rows=preview.plan.map(({row,subject,department,teacher,examTeachers})=>({...row,subject,department,teacher,examTeachers}));
  return SR63.withCatalog({...workspace,rows});
};
