/* A staff role sees only the rows returned by the authenticated scoped gateway. */
SR63.staffStudentLevels=function(workspace,exam,className='الكل',subject='الكل'){
 const rows=Array.isArray(workspace?.rows)?workspace.rows:[],settings=workspace.settings||{};
 const bands=Array.isArray(settings.bands)?settings.bands.slice().sort((a,b)=>b.min-a.min):[];
 const totals=new Map();
 for(const row of rows){
  const klass=String(row.examClasses?.[exam]||row.className||'');
  if(className!=='الكل'&&klass!==className)continue;
  if(subject!=='الكل'&&row.subject!==subject)continue;
  const uid=String(row.studentId||row.studentName||'')+'|'+klass;
  if(!totals.has(uid))totals.set(uid,{key:uid,name:String(row.studentName||'طالب'),className:klass,score:0,max:0,evaluated:0,missing:0});
  const t=totals.get(uid),score=row.scores?.[exam],total=Number(row.totals?.[exam]??settings.exams?.find(x=>x.key===exam)?.total);
  if(row.statuses?.[exam]==='present'&&typeof score==='number'&&Number.isFinite(score)&&Number.isFinite(total)&&total>0){
   t.score+=score;t.max+=total;t.evaluated++;
  }else t.missing++;
 }
 const result=[...bands.map(b=>({id:b.id||b.label,label:b.label,color:/^#[a-f\d]{6}$/i.test(b.color||'')?b.color:'#426579',min:b.min,max:b.max,students:[]})),{id:'not_assessed',label:'غائب أو غير مرصود',color:'#64748b',students:[]}];
 for(const t of totals.values()){
  t.percentage=t.max>0?Math.round(t.score/t.max*1000)/10:null;
  const band=t.percentage===null?result.at(-1):result.find(b=>b.id!=='not_assessed'&&t.percentage>=b.min&&(t.percentage<b.max||b.max===100&&t.percentage===100));
  (band||result.at(-1)).students.push(t);
 }
 for(const b of result)b.students.sort((a,c)=>a.name.localeCompare(c.name,'ar'));
 return result;
};
SR63.staffExamChronology=function(settings,examA,examB){
 const keys=(settings?.exams||[]).map(x=>x.key),ia=keys.indexOf(examA),ib=keys.indexOf(examB);
 if(ia<0||ib<0||ia===ib)return null;
 const older=ia<ib?examA:examB,later=ia<ib?examB:examA;
 return {older,later,olderName:settings.exams.find(x=>x.key===older)?.name||older,laterName:settings.exams.find(x=>x.key===later)?.name||later};
};
SR63.staffExamComparison=function(workspace,from,to){
 const settings=workspace?.settings||{},order=SR63.staffExamChronology(settings,from,to);
 if(!order)return [];
 const {older,later}=order,exams=settings.exams||[],groups=new Map();
 // One assessment of a student, subject and class is counted once.  Missing,
 // absent and ESE/support results are excluded rather than treated as zeros.
 const seen=new Set();
 for(const row of workspace.rows||[]){
  for(const e of [older,later]){
   if(SR63.isSupportRow(row,e))continue;
   const klass=String(row.examClasses?.[e]||row.className||'').trim();
   if(!klass)continue;
   const id=String(row.studentId||row.studentName||'').trim(),subject=String(row.subject||'').trim();
   if(!id||!subject)continue;
   const key=e+'|'+klass+'|'+id+'|'+subject;
   const grade=row.scores?.[e],max=Number(row.totals?.[e]??exams.find(x=>x.key===e)?.total);
   if(seen.has(key)||row.statuses?.[e]!=='present'||typeof grade!=='number'||!Number.isFinite(grade)||!Number.isFinite(max)||max<=0)continue;
   seen.add(key);
   if(!groups.has(klass))groups.set(klass,{className:klass,results:{[older]:{earned:0,max:0,passed:0,count:0},[later]:{earned:0,max:0,passed:0,count:0}}});
   const bucket=groups.get(klass).results[e];bucket.count++;bucket.earned+=grade;bucket.max+=max;
   if(grade/max*100>=Number(settings.pass??50))bucket.passed++;
  }
 }
 return [...groups.values()].sort((a,b)=>a.className.localeCompare(b.className,'ar',{numeric:true})).map(entry=>{
  const a=entry.results[older],b=entry.results[later],previous=a.max?Math.round(1000*a.earned/a.max)/10:null,current=b.max?Math.round(1000*b.earned/b.max)/10:null;
  return {className:entry.className,previous,current,change:previous!==null&&current!==null?Math.round((current-previous)*10)/10:null,previousCount:a.count,currentCount:b.count};
 });
};
