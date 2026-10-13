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
SR63.staffExamComparison=function(workspace,from,to){
 const rows=workspace.rows||[],settings=workspace.settings||{},summary=new Map();
 for(const row of rows){
  // Do not blend ESE/support with general education.
  const klass=String(row.className||'');
  const name=klass||'غير محدد';
  if(!summary.has(name))summary.set(name,{className:name,results:{[from]:{sum:0,total:0,passed:0,count:0},[to]:{sum:0,total:0,passed:0,count:0}}});
  const item=summary.get(name);
  for(const e of new Set([from,to])){
   const raw=row.scores?.[e],grade=typeof raw==='number'?raw:NaN,total=Number(row.totals?.[e]??settings.exams?.find(x=>x.key===e)?.total);
   if(row.statuses?.[e]!=='present'||!Number.isFinite(grade)||!Number.isFinite(total)||total<=0)continue;
   const cell=item.results[e];cell.count++;cell.sum+=grade;cell.total+=total;if(grade/total*100>=Number(settings.pass??50))cell.passed++;
  }
 }
 return [...summary.values()].sort((a,b)=>a.className.localeCompare(b.className,'ar',{numeric:true})).map(x=>{
  const percent=e=>x.results[e]?.total?Math.round(1000*x.results[e].sum/x.results[e].total)/10:null;
  const left=percent(from),right=percent(to);
  return {className:x.className,previous:left,current:right,change:left!==null&&right!==null?Math.round((right-left)*10)/10:null,previousCount:x.results[from].count,currentCount:x.results[to].count};
 });
};
