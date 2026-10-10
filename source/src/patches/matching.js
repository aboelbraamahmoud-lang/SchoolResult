/* PATCH lde */
function lde(items,profiles,assignments,manual={}){
  const groups=new Map(),activeProfiles=profiles.filter(p=>p.active!==false),ids=new Set(activeProfiles.map(p=>p.id)),activeAssignments=assignments.filter(a=>a.active!==false&&ids.has(a.profileId));
  for(const item of items){const key=SR63.linkKey(item);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
  return [...groups].map(([key,rows])=>{
    const first=rows[0],support=SR63.supportClassInfo(first.className);
    if(support)return {key,exam:first.exam,inputTeacher:first.teacher,sourceSubject:first.subject,subject:first.subject,grade:support.grade,className:support.className,department:SR63.SUPPORT_DEPARTMENT,rows:rows.length,candidateProfileIds:[],selectedProfileId:'__support__',status:'support'};
    const resolution=SR63.resolveSubjectAssignment(first.subject,first.className,activeAssignments),resolvedSubject=resolution.subject||first.subject;
    // The academic subject+class assignment is authoritative.  A teacher cell in
    // a result workbook is informative only and must never hide a valid assignment.
    const assigned=[...new Set(resolution.assignments.filter(a=>ids.has(a.profileId)).map(a=>a.profileId))];
    let candidates=assigned;
    if(first.teacher&&first.exam){
      // Keep explicit per-assessment historical teachers where a verified
      // profile exists; ordinary result files need no teacher column.
      const teacherKey=ij(first.teacher),subjectKey=SR63.subjectAliasKey(resolvedSubject||first.subject);
      const explicit=activeProfiles.filter(p=>ij(p.teacher)===teacherKey&&[p.subject,...(p.subjects??[])].some(s=>SR63.subjectAliasKey(s)===subjectKey)).map(p=>p.id);
      if(explicit.length===1)candidates=explicit;
    }
    if(!candidates.length&&first.teacher){
      const teacherKey=ij(first.teacher),subjectKey=SR63.subjectAliasKey(resolvedSubject||first.subject);
      const namedAssignments=activeAssignments.filter(a=>ij(a.teacher)===teacherKey&&lj(a.className)===lj(first.className)&&SR63.subjectAliasKey(a.subject)===subjectKey).map(a=>a.profileId);
      candidates=[...new Set(namedAssignments)];
    }
    const result={key,exam:first.exam,inputTeacher:first.teacher,sourceSubject:first.subject,subject:resolvedSubject,grade:first.grade,className:first.className,rows:rows.length,candidateProfileIds:candidates,selectedProfileId:'',status:'missing'};
    if(manual[key]&&ids.has(manual[key]))return {...result,status:'manual',selectedProfileId:manual[key]};
    if(candidates.length===1)return {...result,status:'matched',selectedProfileId:candidates[0]};
    if(candidates.length>1)return {...result,status:'ambiguous'};
    const classAssignments=activeAssignments.filter(a=>lj(a.className)===lj(first.className));
    const similar=classAssignments.filter(a=>SR63.subjectMatchScore(first.subject,a.subject)>=.72).map(a=>a.profileId);
    return {...result,status:similar.length?'mismatch':'missing',candidateProfileIds:[...new Set(similar)]};
  }).sort((a,b)=>a.className.localeCompare(b.className,'ar',{numeric:true})||a.subject.localeCompare(b.subject,'ar')||String(a.exam??'').localeCompare(String(b.exam??'')));
}
