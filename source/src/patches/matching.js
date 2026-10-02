/* PATCH lde */
function lde(items,profiles,assignments,manual={}){
  const groups=new Map(),byKey=new Map(),byClass=new Map(),byTeacher=new Map(),byProfileSubject=new Map(),activeProfiles=profiles.filter(p=>p.active!==false),ids=new Set(activeProfiles.map(p=>p.id));
  for(const item of items){const key=SR63.linkKey(item);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
  for(const profile of activeProfiles){for(const subject of new Set([profile.subject,...(profile.subjects??[])])){if(!subject)continue;const key=`${ij(profile.teacher)}|${w9(subject)}`;if(!byProfileSubject.has(key))byProfileSubject.set(key,[]);byProfileSubject.get(key).push(profile.id);}}
  for(const assignment of assignments.filter(a=>a.active!==false)){for(const [map,key] of [[byKey,dj(assignment.subject,assignment.className)],[byClass,lj(assignment.className)]]){if(!map.has(key))map.set(key,[]);map.get(key).push(assignment);}const tkey=ij(assignment.teacher);if(!byTeacher.has(tkey))byTeacher.set(tkey,[]);byTeacher.get(tkey).push(assignment);}
  return [...groups].map(([key,rows])=>{const first=rows[0],exactAssignments=(byKey.get(dj(first.subject,first.className))??[]).filter(a=>ids.has(a.profileId)),exact=[...new Set(exactAssignments.map(a=>a.profileId))],named=first.teacher?[...new Set([...(byProfileSubject.get(`${ij(first.teacher)}|${w9(first.subject)}`)??[]),...(byTeacher.get(ij(first.teacher))??[]).filter(a=>ij(a.subject)===ij(first.subject)&&ids.has(a.profileId)).map(a=>a.profileId)])]:[],candidates=first.teacher?named:exact;
    const result={key,exam:first.exam,inputTeacher:first.teacher,subject:first.subject,grade:first.grade,className:first.className,rows:rows.length,candidateProfileIds:candidates,selectedProfileId:'',status:'missing'};
    if(manual[key]&&ids.has(manual[key]))return {...result,status:'manual',selectedProfileId:manual[key]};
    if(candidates.length===1)return {...result,status:'matched',selectedProfileId:candidates[0]};
    if(candidates.length>1)return {...result,status:'ambiguous'};
    const similar=(byClass.get(lj(first.className))??[]).filter(a=>cde(w9(first.subject),w9(a.subject))>=.72&&ids.has(a.profileId)).map(a=>a.profileId);
    return {...result,status:similar.length?'mismatch':'missing',candidateProfileIds:[...new Set([...named,...similar,...exact]) ]};
  }).sort((a,b)=>a.className.localeCompare(b.className,'ar',{numeric:true})||a.subject.localeCompare(b.subject,'ar')||String(a.exam??'').localeCompare(String(b.exam??'')));
}
