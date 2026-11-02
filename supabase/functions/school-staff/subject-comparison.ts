/* Aggregate input for the existing admin subject-comparison template.
   No student row, identifier, name, score, or workspace is returned. */
const digits=(value:unknown)=>String(value??'').replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
const key=(value:unknown)=>digits(value).trim().toLowerCase().replace(/[ًٌٍَُِّْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[\s_\-–—:./\\()]+/g,'');
const gradeNames:Record<string,string>={'1':'الأول','2':'الثاني','3':'الثالث','4':'الرابع','5':'الخامس','6':'السادس','7':'السابع','8':'الثامن','9':'التاسع','10':'العاشر','11':'الحادي عشر','12':'الثاني عشر'};
const gradeAliases:Record<string,string>={اول:'1',الاول:'1',ثاني:'2',الثاني:'2',ثالث:'3',الثالث:'3',رابع:'4',الرابع:'4',خامس:'5',الخامس:'5',سادس:'6',السادس:'6',سابع:'7',السابع:'7',ثامن:'8',الثامن:'8',تاسع:'9',التاسع:'9',عاشر:'10',العاشر:'10',حاديعشر:'11',الحاديعشر:'11',ثانيعشر:'12',الثانيعشر:'12'};
const sectionAliases:Record<string,string>={'ا':'1','أ':'1','ب':'2','ج':'3','د':'4','ه':'5','هـ':'5','و':'6','ز':'7','ح':'8','ط':'9','ي':'10'};
const section=(s:string)=>sectionAliases[s.trim()]??sectionAliases[key(s)]??s.trim().toUpperCase();
const classLabel=(value:unknown)=>{
 const text=digits(value).trim().replace(/[\\|_-]+/g,'/').replace(/\s*\/\s*/g,'/').replace(/\s+/g,' ');
 if(!text)return '';
 const match=text.match(/^0?(\d{1,2})(?:\/|\s)+([\p{L}\d]+)$/u);
 if(match)return Number(match[1])+'/'+section(match[2]);
 const clean=key(text);
 for(const [label,n] of Object.entries(gradeAliases).sort((a,b)=>b[0].length-a[0].length))if(clean.startsWith(label)&&clean.slice(label.length))return n+'/'+section(clean.slice(label.length));
 return text.replace(/\s/g,'');
};
type Metric={success:number|null,achievement:number|null};
type Sum={evaluated:number,passed:number,earned:number,possible:number};
const empty=():Sum=>({evaluated:0,passed:0,earned:0,possible:0});
const result=(s:Sum):Metric=>({success:s.evaluated?s.passed/s.evaluated*100:null,achievement:s.possible?s.earned/s.possible*100:null});
export function subjectComparison(workspace:any,exam:string){
 if(!/^exam[1-4]$/.test(exam))throw Error('INVALID_EXAM');
 const settings=workspace?.settings||{},definition=(settings.exams||[]).find((e:any)=>e.key===exam);
 if(!definition)throw Error('INVALID_EXAM');
 const grades=new Map<string,any>();
 for(const row of Array.isArray(workspace?.rows)?workspace.rows:[]){
  if(!row||typeof row!=='object')continue;
  const className=classLabel(row.examClasses?.[exam]||row.className);
  if(/^[789]\/ESE$/i.test(className))continue;
  const number=className.split('/')[0],grade=gradeNames[number]||(number?'الصف '+number:'غير محدد');
  const subject=String(row.subject||'غير محدد'),teacher=String(row.examTeachers?.[exam]||'').trim()||String(row.teacher||'غير محدد');
  let g=grades.get(grade);
  if(!g){g={grade,subjects:new Set<string>(),classes:new Set<string>(),cells:new Map<string,any>(),totals:new Map<string,Sum>(),overall:empty()};grades.set(grade,g);}
  g.subjects.add(subject);if(className)g.classes.add(className);
  const cellKey=className+'\u0000'+subject;
  let cell=g.cells.get(cellKey);
  if(!cell){cell={className,subject,rowCount:0,teachers:new Set<string>(),sum:empty()};g.cells.set(cellKey,cell);}
  cell.rowCount++;if(teacher)cell.teachers.add(teacher);
  if(!g.totals.has(subject))g.totals.set(subject,empty());
  const score=row.scores?.[exam],total=row.totals?.[exam]??definition.total;
  if(row.statuses?.[exam]!=='present'||typeof score!=='number'||!Number.isFinite(score)||!Number.isFinite(total)||total<=0||score<0||score>total)continue;
  for(const sum of [cell.sum,g.totals.get(subject),g.overall]){
   sum.evaluated++;sum.earned+=score;sum.possible+=total;
   if(score/total*100>=settings.pass)sum.passed++;
  }
 }
 const sort=(values:Iterable<string>)=>[...values].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
 return {exam,grades:[...grades.values()].map(g=>({grade:g.grade,subjects:sort(g.subjects),classes:sort(g.classes),
  cells:[...g.cells.values()].map(c=>({className:c.className,subject:c.subject,rowCount:c.rowCount,teacher:sort(c.teachers).join(' / ')||'—',teacherCount:c.teachers.size,metric:result(c.sum)})),
  totals:Object.fromEntries([...g.totals.entries()].map(([subject,sum])=>[subject,result(sum as Sum)])),overall:result(g.overall)
 }))};
}
