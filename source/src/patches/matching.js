/* PATCH lde */
function lde(items,profiles,assignments,manual={}){
  const groups=new Map(),byKey=new Map(),byClass=new Map(),bySubject=new Map(),ids=new Set(profiles.map(p=>p.id));
  for(const item of items){const key=SR63.linkKey(item);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
  for(const assignment of assignments){for(const [map,key] of [[byKey,dj(assignment.subject,assignment.className)],[byClass,lj(assignment.className)]]){if(!map.has(key))map.set(key,[]);map.get(key).push(assignment);}}
  for(const profile of profiles){const key=w9(profile.subject);if(!bySubject.has(key))bySubject.set(key,[]);bySubject.get(key).push(profile);}
  return [...groups].map(([key,rows])=>{const first=rows[0],exact=[...new Set((byKey.get(dj(first.subject,first.className))??[]).map(a=>a.profileId))].filter(id=>ids.has(id)),named=first.teacher?(bySubject.get(w9(first.subject))??[]).filter(p=>ij(p.teacher)===ij(first.teacher)).map(p=>p.id):[],candidates=first.teacher?named:exact;
    const result={key,exam:first.exam,inputTeacher:first.teacher,subject:first.subject,grade:first.grade,className:first.className,rows:rows.length,candidateProfileIds:candidates,selectedProfileId:'',status:'missing'};
    if(manual[key]&&ids.has(manual[key]))return {...result,status:'manual',selectedProfileId:manual[key]};
    if(candidates.length===1)return {...result,status:'matched',selectedProfileId:candidates[0]};
    if(candidates.length>1)return {...result,status:'ambiguous'};
    const similar=(byClass.get(lj(first.className))??[]).filter(a=>cde(w9(first.subject),w9(a.subject))>=.72&&ids.has(a.profileId)).map(a=>a.profileId);
    return {...result,status:similar.length?'mismatch':'missing',candidateProfileIds:[...new Set([...named,...similar,...(bySubject.get(w9(first.subject))??[]).map(p=>p.id)])]};
  }).sort((a,b)=>a.className.localeCompare(b.className,'ar',{numeric:true})||a.subject.localeCompare(b.subject,'ar')||String(a.exam??'').localeCompare(String(b.exam??'')));
}
