/* PATCH lde */
function lde(items,profiles,assignments,manual={}){
  const groups=new Map(),activeProfiles=profiles.filter(p=>p.active!==false),ids=new Set(activeProfiles.map(p=>p.id)),activeAssignments=assignments.filter(a=>a.active!==false&&ids.has(a.profileId));
  for(const item of items){const key=SR63.linkKey(item);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
  return [...groups].map(([key,rows])=>{
    const first=rows[0],resolution=SR63.resolveSubjectAssignment(first.subject,first.className,activeAssignments),resolvedSubject=resolution.subject||first.subject;
    let candidates;
    if(first.teacher){
      const teacherKey=ij(first.teacher),subjectKey=SR63.subjectAliasKey(resolvedSubject||first.subject);
      const namedProfiles=activeProfiles.filter(profile=>{
        if(ij(profile.teacher)!==teacherKey)return false;
        const subjects=[profile.subject,...(profile.subjects??[])].filter(Boolean);
        return subjects.some(subject=>SR63.subjectAliasKey(subject)===subjectKey);
      }).map(profile=>profile.id);
      const namedAssignments=activeAssignments.filter(assignment=>ij(assignment.teacher)===teacherKey&&lj(assignment.className)===lj(first.className)&&SR63.subjectEquivalent(assignment.subject,resolvedSubject||first.subject)).map(assignment=>assignment.profileId);
      candidates=[...new Set([...namedProfiles,...namedAssignments])];
    }else candidates=[...new Set(resolution.assignments.map(assignment=>assignment.profileId))];
    const result={key,exam:first.exam,inputTeacher:first.teacher,sourceSubject:first.subject,subject:resolvedSubject,grade:first.grade,className:first.className,rows:rows.length,candidateProfileIds:candidates,selectedProfileId:'',status:'missing'};
    if(manual[key]&&ids.has(manual[key]))return {...result,status:'manual',selectedProfileId:manual[key]};
    if(candidates.length===1)return {...result,status:'matched',selectedProfileId:candidates[0]};
    if(candidates.length>1)return {...result,status:'ambiguous'};
    const classAssignments=activeAssignments.filter(a=>lj(a.className)===lj(first.className));
    const similar=classAssignments.filter(a=>SR63.subjectMatchScore(first.subject,a.subject)>=.72).map(a=>a.profileId);
    return {...result,status:similar.length?'mismatch':'missing',candidateProfileIds:[...new Set(similar)]};
  }).sort((a,b)=>a.className.localeCompare(b.className,'ar',{numeric:true})||a.subject.localeCompare(b.subject,'ar')||String(a.exam??'').localeCompare(String(b.exam??'')));
}
