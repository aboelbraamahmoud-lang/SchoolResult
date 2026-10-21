/* Skill analysis extension for Arabic and English; runtime-only student data. */
SR63.skillSubjects.english={label:'اللغة الإنجليزية',keys:[
 ['listening','الاستماع'],['speaking','التحدث'],['reading','القراءة'],['grammar','القواعد'],['writing','الكتابة']
]};
SR63.skillKind=value=>{
 const x=String(value??'').normalize('NFKC').replace(/[\s\u0640]+/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').toLowerCase().replace(/^قسم(?=(?:اللغة|العربية|الانجليزية|عربي|انجليزي))/,'');
 return ['عربي','العربية','لغةعربية','اللغةالعربية','arabic'].includes(x)?'arabic':
  ['انجليزي','الانجليزي','الانجليزية','لغةانجليزية','اللغةالانجليزية','english','englishlanguage'].includes(x)?'english':null;
};
SR63.skillClass=x=>String(x??'').trim().replace(/^0([789])\//,'$1/').toUpperCase();
SR63.skillScoped=function(items,departments=null){
 const list=Array.isArray(items)?items:[];
 if(!Array.isArray(departments))return list;
 const keys=new Set(departments.map(SR63.skillKind).filter(Boolean));
 return list.filter(a=>keys.has(SR63.skillKind(a.subject)));
};
SR63.skillRoster=(workspace,kind,exam='exam1',departments=null)=>{
 if(!SR63.skillSubjects[kind]||Array.isArray(departments)&&!departments.some(d=>SR63.skillKind(d)===kind))return [];
 const result=new Map();
 for(const row of workspace?.rows||[]){
  if(SR63.skillKind(row.subject)!==kind)continue;
  const id=String(row.studentId??'').trim(),name=String(row.studentName??'').trim(),
    className=SR63.skillClass(row.examClasses?.[exam]||row.className);
  if(!id||!name||!className)continue;
  const k=id+'|'+className;
  if(!result.has(k))result.set(k,{id,name,className,grade:className.split('/')[0],row});
 }
 return [...result.values()].sort((a,b)=>a.className.localeCompare(b.className,'ar',{numeric:true})||a.name.localeCompare(b.name,'ar'));
};
SR63.skillCreate=(workspace,kind,exam,departments=null)=>{
 const schema=SR63.skillSubjects[kind],roster=SR63.skillRoster(workspace,kind,exam,departments);
 if(!schema||!roster.length)throw Error('لم أجد طلابًا مرتبطين بهذه المادة في نتائج المدرسة المعتمدة.');
 const academicYear=String(workspace.settings?.academicYear||'').slice(0,40);
 const safeYear=academicYear.replace(/[^a-z0-9-]/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'current';
 return {version:1,id:'skills-'+kind+'-'+exam+'-'+safeYear,subject:schema.label,subjectKey:kind,
  exam,academicYear,fileName:'إنشاء من قائمة الطلاب',importedAt:new Date().toISOString(),passThreshold:50,
  skills:schema.keys.map(([key,label])=>({key,label,max:null})),records:roster.map(({id,name,className,grade})=>({id,name,className,grade,
   marks:Object.fromEntries(schema.keys.map(([key])=>[key,null]))})),issues:[],classCount:new Set(roster.map(x=>x.className)).size,
  gradeCount:new Set(roster.map(x=>x.grade)).size};
};
SR63.skillSafeAssessment=(assessment,workspace,departments=null)=>{
 const kind=SR63.skillKind(assessment?.subject),roster=SR63.skillRoster(workspace,kind,assessment?.exam,departments),
  map=new Map(roster.map(x=>[x.id+'|'+x.className,x]));
 if(!kind||!roster.length||!['exam1','exam2','exam3','exam4'].includes(assessment?.exam))throw Error('المادة أو الاختبار غير متاح لهذه الصلاحية.');
 if(!Array.isArray(assessment.skills)||assessment.skills.length<1||assessment.skills.length>12)throw Error('يجب تحديد مهارة واحدة على الأقل وبحد أقصى 12 مهارة.');
 const keys=new Set(),labels=new Set();
 const skills=assessment.skills.map(s=>{
  if(!/^[-_a-zA-Z0-9]{1,50}$/.test(s.key)||keys.has(s.key))throw Error('معرف مهارة غير صالح أو مكرر.');
  const label=String(s.label||'').trim();if(!label||label.length>85||labels.has(label))throw Error('اسم مهارة فارغ أو مكرر.');
  keys.add(s.key);labels.add(label);
  const max=SR63.skillSafeNumber(s.max);if(max!==null&&max<=0)throw Error('الدرجة العظمى يجب أن تكون أكبر من صفر.');
  return {key:s.key,label,max};
 });
 const input=new Map();
 for(const item of assessment.records||[]){
  const k=String(item.id)+'|'+SR63.skillClass(item.className);
  if(!map.has(k)||input.has(k))throw Error('يتضمن التحليل طالبًا غير مطابق لطلاب المادة أو طالبًا مكررًا.');
  input.set(k,item.marks||{});
 }
 const records=roster.map(({id,name,className,grade})=>{
  const marksIn=input.get(id+'|'+className)||{};
  const marks={};for(const s of skills){
   const n=SR63.skillSafeNumber(marksIn[s.key]);
   if(n!==null&&s.max!==null&&n>s.max)throw Error('درجة '+name+' في '+s.label+' تتجاوز الدرجة العظمى.');
   marks[s.key]=n;
  }
  return {id,name,className,grade,marks};
 });
 const pass=Number(assessment.passThreshold??50);
 if(!Number.isFinite(pass)||pass<0||pass>100)throw Error('نسبة التعثر يجب أن تكون بين صفر و100.');
 return {...assessment,version:1,subject:SR63.skillSubjects[kind].label,subjectKey:kind,skills,records,passThreshold:pass,
  classCount:new Set(records.map(x=>x.className)).size,gradeCount:new Set(records.map(x=>x.grade)).size};
};
SR63.skillAudit=(assessment,workspace,departments=null)=>{
 if(!assessment)return [];
 const official=new Map(SR63.skillRoster(workspace,SR63.skillKind(assessment.subject),assessment.exam,departments).map(x=>[x.id+'|'+x.className,x.row]));
 const maxima=assessment.skills.every(s=>Number.isFinite(s.max)&&s.max>0)?assessment.skills.reduce((n,s)=>n+s.max,0):null;
 const exam=workspace?.settings?.exams?.find(x=>x.key===assessment.exam);
 return (assessment.records||[]).map(r=>{
  const row=official.get(r.id+'|'+SR63.skillClass(r.className));
  const complete=assessment.skills.every(s=>Number.isFinite(r.marks?.[s.key]));
  const total=complete?assessment.skills.reduce((n,s)=>n+r.marks[s.key],0):null;
  const officialScore=row?.statuses?.[assessment.exam]==='present'&&Number.isFinite(row?.scores?.[assessment.exam])?row.scores[assessment.exam]:null;
  const officialMax=row?.totals?.[assessment.exam]??exam?.total??null;
  const difference=total===null||officialScore===null?null:Math.round((total-officialScore)*100)/100;
  const maxDifference=maxima===null||!Number.isFinite(officialMax)?null:Math.round((maxima-officialMax)*100)/100;
  const status=!row?'unlinked':!complete?'incomplete':officialScore===null?'noOfficial':
   Math.abs(difference)>0.00001?'mismatch':maxDifference!==null&&Math.abs(maxDifference)>0.00001?'maxMismatch':'matched';
  return {id:r.id,name:r.name,className:r.className,grade:r.grade,total,officialScore,officialMax,difference,maxDifference,status};
 });
};
SR63.skillWeak=(assessment,skillKey,threshold=50,grade='الكل',className='الكل')=>{
 const skill=assessment?.skills.find(s=>s.key===skillKey);
 if(!skill||!Number.isFinite(skill.max)||skill.max<=0)return [];
 return assessment.records.filter(r=>(grade==='الكل'||r.grade===grade)&&(className==='الكل'||r.className===className))
  .flatMap(r=>{const percent=SR63.skillPercent(r.marks?.[skill.key],skill.max);return percent!==null&&percent<threshold?[{...r,percent,score:r.marks[skill.key]}]:[];})
  .sort((a,b)=>a.percent-b.percent||a.name.localeCompare(b.name,'ar'));
};
SR63.skillParseGeneric=function(buffer,name,assessment){
 const book=hv(buffer,{type:'array'}),got=new Map(),normalize=t=>String(t??'').normalize('NFKC').trim().toLowerCase();
 for(const sheet of book.SheetNames){
  const rows=Gv.sheet_to_json(book.Sheets[sheet],{header:1,raw:true,defval:null});
  let headerIndex=rows.findIndex(r=>normalize(r?.[0])==='الرقم الأكاديمي'&&normalize(r?.[2])==='الشعبة');
  if(headerIndex<0)continue;
  const headers=(rows[headerIndex]||[]).map(normalize);
  const positions=assessment.skills.map(s=>headers.findIndex(t=>t===normalize(s.label)||t===normalize(s.key)));
  if(positions.some(x=>x<0))throw Error('أعمدة المهارات في الملف لا تطابق إعدادات هذا الاختبار.');
  for(let i=headerIndex+1;i<rows.length;i++){
   const cells=rows[i]||[],id=String(cells[0]??'').trim().replace(/\.0$/,''),className=SR63.skillClass(cells[2]);
   if(!id||!className)continue;
   const key=id+'|'+className;if(got.has(key))throw Error('طالب مكرر في ورقة Excel: الصف '+(i+1));
   const marks={};assessment.skills.forEach((s,j)=>{try{marks[s.key]=SR63.skillSafeNumber(cells[positions[j]]);}catch(e){throw Error('خطأ بالصف '+(i+1)+' في '+s.label+': '+e.message);}});
   got.set(key,marks);
  }
 }
 if(!got.size)throw Error('لم أجد أعمدة الرقم الأكاديمي والشعبة ومهارات الاختبار في ملف Excel.');
 const known=new Set(assessment.records.map(r=>r.id+'|'+SR63.skillClass(r.className)));
 for(const key of got.keys())if(!known.has(key))throw Error('الملف يتضمن طالبًا خارج قائمة المادة: '+key);
 return {...assessment,fileName:name,importedAt:new Date().toISOString(),records:assessment.records.map(r=>({...r,marks:{...r.marks,...(got.get(r.id+'|'+SR63.skillClass(r.className))||{})}}))};
};
SR63.skillCsv=(rows,name)=>{
 const cell=x=>{
  let s=String(x??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 };
 const blob=new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 SR63.downloadReportFile(blob,SR63.safeReportFilename(name)+'.csv');
};
SR63.skillReports=function(assessment,workspace,{type='school',grade='الكل',className='الكل',skillKey='',threshold=50,older=null,departments=null}={}){
 if(!assessment)return {pages:[],rows:[],columns:[]};
 const settings=workspace.settings||{},fmt=n=>Number.isFinite(n)?String(Math.round(n*10)/10):'—',
  filtered=assessment.records.filter(r=>(grade==='الكل'||r.grade===grade)&&(className==='الكل'||r.className===className));
 let title='',columns=[],rows=[];
 const skill=assessment.skills.find(s=>s.key===skillKey)||assessment.skills[0];
 if(type==='students'||type==='summary'){
  const pages=SR63.skillPages(assessment,{grade,className,pass:threshold}).filter(p=>p.kind===(type==='students'?'students':'summary'));
  return {pages:pages.map((p,index)=>SR63.skillFullHTML({...p,number:index+1,total:pages.length},assessment,settings)),rows:[],columns:[]};
 }
 if(type==='school'){
  title='التحليل العام للمهارات';columns=['المهارة','الدرجة العظمى','متوسط التحصيل %','نسبة الإتقان %','الطلاب المرصودون','المتعثرون'];
  rows=SR63.skillAggregate(assessment,filtered,threshold).skills.map(s=>[s.label,s.max??'—',fmt(s.rate),fmt(s.masteryRate),s.observed,s.mastered===null?'—':s.observed-s.mastered]);
 }
 if(type==='weak'){
  title='الطلاب المتعثرون في مهارة '+skill.label;
  columns=['الرقم الأكاديمي','اسم الطالب','الشعبة','المهارة','درجة المهارة','الدرجة العظمى','نسبة الإتقان %'];
  rows=SR63.skillWeak(assessment,skill.key,threshold,grade,className).map(r=>[r.id,r.name,r.className,skill.label,r.score,skill.max,fmt(r.percent)]);
 }
 if(type==='audit'){
  title='تقرير مطابقة المهارات مع النتيجة الرسمية';columns=['الرقم الأكاديمي','اسم الطالب','الشعبة','مجموع المهارات','الدرجة الرسمية','فرق الدرجات','الحالة'];
  const labels={unlinked:'غير مرتبط',incomplete:'درجات غير مكتملة',noOfficial:'نتيجة رسمية غير مرصودة',mismatch:'درجات مختلفة',maxMismatch:'الدرجة العظمى مختلفة',matched:'متطابق'};
  rows=SR63.skillAudit(assessment,workspace,departments).filter(r=>r.status!=='matched'&&
   (grade==='الكل'||r.grade===grade)&&(className==='الكل'||r.className===className))
   .map(r=>[r.id,r.name,r.className,fmt(r.total),fmt(r.officialScore),fmt(r.difference),labels[r.status]]);
 }
 if(type==='comparison'){
  title='مقارنة مهارة '+skill.label+' بين اختبارين';columns=['الرقم الأكاديمي','اسم الطالب','الشعبة','السابق %','الحالي %','التغير (نقطة مئوية)'];
  rows=older?SR63.skillComparison(older,assessment).filter(r=>(grade==='الكل'||r.className.split('/')[0]===grade)&&(className==='الكل'||r.className===className))
   .flatMap(r=>r.skills.filter(s=>s.key===skill.key).map(s=>[r.id,r.name,r.className,fmt(s.previous),fmt(s.current),fmt(s.change)])):[];
 }
 if(type==='ranking'){
  title='ترتيب مهارات المادة حسب التحصيل';columns=['الترتيب','المهارة','نسبة التحصيل %','نسبة الإتقان %','المرصود'];
  rows=SR63.skillAggregate(assessment,filtered,threshold).skills.sort((a,b)=>(a.rate??-1)-(b.rate??-1)).map((s,i)=>[i+1,s.label,fmt(s.rate),fmt(s.masteryRate),s.observed]);
 }
 if(!rows.length)rows=[['لا توجد نتائج ضمن التصفية',...Array(Math.max(0,columns.length-1)).fill('')]];
 const esc=SR63.escape, pages=[];for(let offset=0;offset<rows.length;offset+=20){const chunk=rows.slice(offset,offset+20),p=1+Math.floor(offset/20),count=Math.ceil(rows.length/20);
  pages.push('<section class="school-report-page skill-report-page report-landscape" data-orientation="landscape">'+
   '<header class="srskill-header"><img src="./moehe.png" alt="شعار الوزارة"><div><strong>'+esc(settings.schoolName||'المدرسة')+'</strong><h2>'+esc(title)+'</h2><p>'+esc(assessment.subject)+' · '+esc(settings.exams?.find(e=>e.key===assessment.exam)?.name||assessment.exam)+' · '+esc(assessment.academicYear||'')+'</p></div></header>'+
   '<div class="srskill-body"><h3>'+esc(title)+'</h3><table class="srskill-table"><thead><tr>'+columns.map(s=>'<th>'+esc(s)+'</th>').join('')+
   '</tr></thead><tbody>'+chunk.map(row=>'<tr>'+row.map(x=>'<td>'+esc(x??'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+
   '<footer class="report-footer srskill-footer"><div>منسق المادة: '+esc(settings.coordinatorName||'........')+'</div><div>النائب الأكاديمي: '+esc(settings.academicViceName||'........')+'</div><div>مدير المدرسة: '+esc(settings.principalName||'........')+'</div></footer>'+
   '<div class="srskill-page-number">صفحة '+p+' من '+count+'</div></section>');
 }
 return {pages,rows,columns,title};
};
