/* SchoolResult — privacy-preserving previous/current academic-year report metrics.
   Never return individual students from the Edge Function. */
export const normalizedYear=(value:unknown)=>{
 const text=String(value??'').replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
 const match=text.match(/(\d{4})\s*[/–-]\s*(\d{4})/);
 return match?match[1]+'/'+match[2]:'';
};
export const previousAcademicYear=(value:unknown)=>{
 const year=normalizedYear(value);if(!year)return '';
 const [from,to]=year.split('/').map(Number);
 return from>=2000&&to===from+1?(from-1)+'/'+from:'';
};
const norm=(value:unknown)=>String(value??'').normalize('NFKC').replace(/[\s\u0640]+/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').toLowerCase().replace(/^قسم(?=(اللغة|عربي|انجليزي|انجليزية|العربية|الانجليزية))/,'');
const labelGrade=(value:unknown)=>{
 const text=String(value??'').replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
 if(/السابع|سابع/.test(text))return '7';
 if(/الثامن|ثامن/.test(text))return '8';
 if(/التاسع|تاسع/.test(text))return '9';
 const m=text.match(/(?:^|[^\d])(1[0-2]|[1-9])(?=\s*(?:\/|-)|\s|$)/);
 return m?String(Number(m[1])):'';
};
const support=(r:any,exam:string)=>/^[789]\/ESE$/i.test(String(r.examClasses?.[exam]||r.className||'').trim().replace(/^0([789])\//,'$1/'));
const rounded=(n:number)=>Math.round(n*10)/10;
const percent=(v:number,n:number)=>n>0?rounded(v/n*100):null;
export function yearExamDataset(workspace:any,exam:string,threshold:number,allowedDepartments:string[]|null=null){
 const rows=Array.isArray(workspace?.rows)?workspace.rows:[],defs=workspace?.settings?.exams||[];
 const maxDefault=Number(defs.find((e:any)=>e.key===exam)?.total??0);
 const allowed=Array.isArray(allowedDepartments)?new Set(allowedDepartments.map(norm).filter(Boolean)):null;
 const unique=new Map<string,{grade:string,subject:string,label:string,id:string,score:number,total:number,success:boolean}>();
 for(const r of rows){
  if(!r||support(r,exam)||r.statuses?.[exam]!=='present')continue;
  if(allowed&&!allowed.has(norm(r.subject))&&!allowed.has(norm(r.department)))continue;
  const grade=labelGrade(r.examClasses?.[exam]||r.className||r.grade)||labelGrade(r.grade);
  const subject=norm(r.subject),id=String(r.studentId||'').trim();
  if(!grade||!subject||!id)continue;
  const score=r.scores?.[exam],total=Number(r.totals?.[exam]??maxDefault);
  if(typeof score!=='number'||!Number.isFinite(score)||!Number.isFinite(total)||total<=0||score<0||score>total)continue;
  const key=grade+'|'+id+'|'+subject;
  if(!unique.has(key))unique.set(key,{grade,subject,label:String(r.subject).trim(),id,score,total,success:100*score/total>=threshold});
 }
 return [...unique.values()];
}
export function yearExamCompare(current:any,previous:any,exam:string,allowedDepartments:string[]|null=null){
 if(!/^exam[1-4]$/.test(exam))throw Error('INVALID_EXAM');
 const currentYear=normalizedYear(current?.settings?.academicYear),prevYear=previousAcademicYear(currentYear);
 if(!prevYear)throw Error('INVALID_YEAR');
 if(normalizedYear(previous?.settings?.academicYear)!==prevYear)throw Error('ARCHIVE_YEAR_MISMATCH');
 if(!(current.settings?.exams||[]).some((e:any)=>e.key===exam)||(previous.settings?.exams||[]).every((e:any)=>e.key!==exam))throw Error('EXAM_NOT_AVAILABLE_IN_BOTH_YEARS');
 const rawThreshold=Number(current.settings?.pass??50);
 const threshold=Number.isFinite(rawThreshold)&&rawThreshold>=0&&rawThreshold<=100?rawThreshold:50;
 const curr=yearExamDataset(current,exam,threshold,allowedDepartments);
 const prev=yearExamDataset(previous,exam,threshold,allowedDepartments);
 const aggregate=(rows:ReturnType<typeof yearExamDataset>)=>{
  let earned=0,total=0,passed=0;const students=new Set<string>();
  for(const r of rows){earned+=r.score;total+=r.total;passed+=Number(r.success);students.add(r.grade+'|'+r.id);}
  return {results:rows.length,students:students.size,passed,success:percent(passed,rows.length),achievement:percent(earned,total)};
 };
 const pair=(a:ReturnType<typeof aggregate>,b:ReturnType<typeof aggregate>)=>({
  previous:a,current:b,successChange:a.success===null||b.success===null?null:rounded(b.success-a.success),
  achievementChange:a.achievement===null||b.achievement===null?null:rounded(b.achievement-a.achievement)
 });
 const subjectPairs=(a:typeof prev,b:typeof curr)=>[...new Set([...b,...a].map(x=>x.subject))]
  .sort((a,b)=>a.localeCompare(b,'ar')).map(subject=>({subject,label:[...b,...a].find(x=>x.subject===subject)!.label,
   ...pair(aggregate(a.filter(x=>x.subject===subject)),aggregate(b.filter(x=>x.subject===subject)))}));
 const grades=[...new Set([...curr,...prev].map(x=>x.grade))].sort((a,b)=>Number(a)-Number(b));
 const gradeNames:{[key:string]:string}={'1':'الأول','2':'الثاني','3':'الثالث','4':'الرابع','5':'الخامس','6':'السادس','7':'السابع','8':'الثامن','9':'التاسع','10':'العاشر','11':'الحادي عشر','12':'الثاني عشر'};
 return {currentYear,previousYear:prevYear,exam,currentExamName:current.settings.exams.find((x:any)=>x.key===exam)?.name||exam,
  previousExamName:previous.settings.exams.find((x:any)=>x.key===exam)?.name||exam,
  schoolName:String(current.settings?.schoolName||'').slice(0,180),principalName:String(current.settings?.principalName||'').slice(0,180),
  threshold,scope:allowedDepartments===null?'school':'department',
  school:pair(aggregate(prev),aggregate(curr)),
  subjects:subjectPairs(prev,curr),
  grades:grades.map(g=>({grade:g,label:'الصف '+(gradeNames[g]||g),subjects:subjectPairs(prev.filter(x=>x.grade===g),curr.filter(x=>x.grade===g)),...pair(aggregate(prev.filter(x=>x.grade===g)),aggregate(curr.filter(x=>x.grade===g)))})),
  noCurrentResults:curr.length===0,noPreviousResults:prev.length===0};
}
