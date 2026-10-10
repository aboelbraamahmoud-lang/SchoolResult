/* School Results 6.6 — readable application services. Supabase cloud edition. */
var SR63 = {version:'6.10.7', release:'2026-10-10', formDirty:false};
SR63.equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
SR63.clone = value => structuredClone(value);
SR63.clearResults=function(workspace,exam='all'){
  if(exam!=='all'&&!XA.includes(exam))SR63.fail('الاختبار المحدد غير صالح.');
  if(exam==='all')return jj({...workspace,rows:[],students:[],imports:(workspace.imports??[]).filter(item=>item.kind==='teachers')},'تفريغ جميع النتائج','حذف نتائج جميع الاختبارات مع الإبقاء على قاعدة المعلمين والهيكل والإعدادات');
  const label=tj(workspace.settings,exam)?.name??exam;
  const rows=(workspace.rows??[]).map(row=>({...row,scores:{...row.scores,[exam]:null},statuses:{...row.statuses,[exam]:'unentered'},totals:{...row.totals,[exam]:null},examTeachers:{...row.examTeachers,[exam]:''},examClasses:{...row.examClasses,[exam]:''},importBatches:{...row.importBatches,[exam]:null}}));
  const imports=(workspace.imports??[]).flatMap(item=>{if(item.kind!=='results')return [item];if(item.exam===exam)return [];if(item.exam!=='multi')return [item];const changes=(item.changes??[]).filter(change=>change.exam!==exam);if(!changes.length)return [];const exams=[...new Set(changes.map(change=>change.exam).filter(Boolean))];return [{...item,changes,rows:changes.length,exam:exams.length===1?exams[0]:'multi'}];});
  return jj(SR63.withCatalog({...workspace,rows,imports}),`تفريغ نتائج ${label}`,`حذف نتائج ${label} فقط مع الحفاظ على نتائج بقية الاختبارات`);
};
SR63.fail = message => { throw new Error(message); };
SR63.escape = value => String(value??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
SR63.download = function(value,name,type='application/json') {
  const blob=new Blob([typeof value==='string'?value:JSON.stringify(value,null,value?.snapshots||Array.isArray(value?.rows)&&value.rows.length>5000?0:2)],{type});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name.replace(/[\\/:*?"<>|]/g,'-');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
SR63.number = function(value) {
  if(value===null||value===undefined)return null;
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  if(typeof value!=='string')return null;
  let text=value.replace(/[\u200e\u200f\u061c]/g,'').trim();
  if(!text)return null;
  text=text.replace(/[٠-٩]/g,x=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(x))).replace(/[۰-۹]/g,x=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(x))).replace(/٫/g,'.').replace(/٬/g,'').replace(/[،,]/g,'.').replace(/−/g,'-');
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text))return null;
  const valueNumber=Number(text);return Number.isFinite(valueNumber)?valueNumber:null;
};
SR63.validResult = function(row,exam,settings) {
  const status=row.statuses?.[exam],score=row.scores?.[exam],total=pj(row,exam,settings);
  if(!['present','absent','excused','unexcused','deprived','not_enrolled','unentered'].includes(status))return false;
  if(!Number.isFinite(total)||total<=0)return false;
  return status==='present'?typeof score==='number'&&Number.isFinite(score)&&score>=0&&score<=total:score===null;
};

/* 6.10.2 — Additional Support / ESE cohort isolation. */
SR63.SUPPORT_DEPARTMENT='الدعم الإضافي';
SR63.supportClassInfo=function(value){
  const className=lj(String(value??'')),match=/^([789])\/ESE$/i.exec(className);
  if(!match)return null;
  const gradeNo=Number(match[1]),grade={7:'السابع',8:'الثامن',9:'التاسع'}[gradeNo],label={7:'طلاب الدمج سابع',8:'طلاب الدمج ثامن',9:'طلاب الدمج تاسع'}[gradeNo];
  return {gradeNo,grade,className:`${gradeNo}/ESE`,label,department:SR63.SUPPORT_DEPARTMENT};
};
SR63.isSupportClass=value=>!!SR63.supportClassInfo(value);
SR63.isSupportRow=function(row,exam){
  const className=exam?(row?.examClasses?.[exam]||row?.className):(row?.className||'');
  return SR63.isSupportClass(className);
};
SR63.supportRows=(rows,exam)=>Array.isArray(rows)?rows.filter(row=>SR63.isSupportRow(row,exam)):[];
SR63.generalRows=(rows,exam)=>Array.isArray(rows)?rows.filter(row=>!SR63.isSupportRow(row,exam)):[];
SR63.metricRows=function(rows,exam){
  const list=Array.isArray(rows)?rows:[],general=SR63.generalRows(list,exam);
  return general.length?general:SR63.supportRows(list,exam);
};
SR63.normalizeSupportRows=function(rows){
  return (Array.isArray(rows)?rows:[]).map(row=>{
    const info=SR63.supportClassInfo(row?.className);if(!info)return row;
    const examClasses={...(row.examClasses??{})},examTeachers={...(row.examTeachers??{})};
    for(const exam of XA){if(!examClasses[exam])examClasses[exam]=info.className;if(!examTeachers[exam])examTeachers[exam]=SR63.SUPPORT_DEPARTMENT;}
    return {...row,className:info.className,grade:info.grade,department:SR63.SUPPORT_DEPARTMENT,teacher:String(row.teacher??'').trim()||SR63.SUPPORT_DEPARTMENT,examClasses,examTeachers};
  });
};
SR63.supportSummary=function(workspace,exam=workspace?.activeExam){
  const rows=SR63.supportRows(workspace?.rows??[],exam).filter(row=>row.statuses?.[exam]&&row.statuses[exam]!=='unentered'),settings=workspace?.settings;
  return [7,8,9].map(gradeNo=>{const info=SR63.supportClassInfo(`${gradeNo}/ESE`),subset=rows.filter(row=>SR63.supportClassInfo(row.examClasses?.[exam]||row.className)?.gradeNo===gradeNo);return {...info,rows:subset,metric:bj(subset,exam,settings)};}).filter(group=>group.rows.length);
};
SR63.auditChanges = function(before,after) {
  if(before===after||!before||!after||before.auditLog!==after.auditLog||before.rows===after.rows)return after;
  const old=new Map(before.rows.map(row=>[row.id,row])),changes=[];
  for(const row of after.rows){const prev=old.get(row.id);old.delete(row.id);if(!SR63.equal(prev,row)){
    const fields={};for(const key of new Set([...Object.keys(prev??{}),...Object.keys(row)]))if(!SR63.equal(prev?.[key],row[key]))fields[key]={before:SR63.clone(prev?.[key]??null),after:SR63.clone(row[key]??null)};
    changes.push({rowId:row.id,kind:prev?'update':'create',fields});
  }}
  for(const row of old.values())changes.push({rowId:row.id,kind:'delete',before:SR63.clone(row)});
  if(!changes.length)return after;
  const entry={id:crypto.randomUUID(),at:new Date().toISOString(),action:'تعديل سجلات النتائج',details:`تحديث ${changes.length} سجل — ${tj(after.settings,after.activeExam).name}`,changes};
  return {...after,auditLog:[entry,...after.auditLog].slice(0,1000)};
};
SR63.undoAudit = function(workspace,entry) {
  if(!entry?.changes?.length)SR63.fail('هذه العملية لا تحتوي تفاصيل تراجع فردي.');
  const rows=new Map(workspace.rows.map(row=>[row.id,row]));
  for(const change of entry.changes){
    const row=rows.get(change.rowId);
    if(change.kind==='delete'){if(row)SR63.fail('يوجد سجل أحدث؛ لم يتم التراجع.');rows.set(change.rowId,SR63.clone(change.before));continue;}
    if(!row)SR63.fail('أحد السجلات حُذف بعد هذه العملية؛ لم يتم التراجع.');
    for(const [key,values] of Object.entries(change.fields))if(!SR63.equal(row[key]??null,values.after))SR63.fail('توجد تعديلات لاحقة على السجل؛ لم يتم التراجع حفاظًا عليها.');
    if(change.kind==='create'){rows.delete(change.rowId);continue;}
    const restored={...row};for(const [key,values] of Object.entries(change.fields))restored[key]=SR63.clone(values.before);rows.set(change.rowId,restored);
  }
  return jj({...workspace,rows:[...rows.values()]},'تراجع عن تعديل',entry.details,entry.id);
};
SR63.rollback = function(workspace,batchId,exam) {
  const batch=workspace.imports.find(item=>item.id===batchId);
  if(!batch)SR63.fail('دفعة الاستيراد غير موجودة.');
  const rows=new Map(workspace.rows.map(row=>[row.id,row]));let restored=0,skipped=0;
  const changes=batch.changes?.length?batch.changes:workspace.rows.filter(row=>row.importBatches?.[exam]===batchId).map(row=>({rowId:row.id,exam,before:null}));
  for(const change of changes){
    const key=change.exam??exam,row=rows.get(change.rowId);
    if(!XA.includes(key)||!row||row.importBatches?.[key]!==batchId){skipped++;continue;}
    const old=change.before??{score:null,status:'unentered',total:null,teacher:'',className:'',batch:null};
    const next={...row,scores:{...row.scores,[key]:old.score},statuses:{...row.statuses,[key]:old.status},totals:{...row.totals,[key]:old.total},examTeachers:{...row.examTeachers,[key]:old.teacher},examClasses:{...row.examClasses,[key]:old.className??''},importBatches:{...row.importBatches,[key]:old.batch}};
    const otherData=XA.some(k=>next.scores[k]!==null||next.statuses[k]!=='unentered'||next.importBatches[k]);
    // A newly created row can be removed only if no later edit or other exam depends on it.
    const editedLater=workspace.auditLog.some(log=>Date.parse(log.at)>Date.parse(batch.at??0)&&log.changes?.some(c=>c.rowId===row.id));
    if(!change.before&&!otherData&&!editedLater)rows.delete(row.id);else rows.set(row.id,next);
    restored++;
  }
  for(const change of changes.filter(c=>!c.before)){const row=rows.get(change.rowId);if(row&&!XA.some(k=>row.scores[k]!==null||row.statuses[k]!=='unentered'||row.importBatches[k])&&!workspace.auditLog.some(log=>Date.parse(log.at)>Date.parse(batch.at??0)&&log.changes?.some(c=>c.rowId===row.id)))rows.delete(row.id);}
  const next=jj({...workspace,rows:[...rows.values()],imports:workspace.imports.map(item=>item.id===batchId?{...item,rolledBackAt:new Date().toISOString(),rollbackRestored:restored,rollbackSkipped:skipped}:item)},'تراجع عن دفعة',`${restored} نتيجة مستعادة، ${skipped} نتيجة بها تغييرات لاحقة حُفظت دون مساس`,batchId);
  return {workspace:next,restored,skipped};
};
SR63.validate = function(raw) {
  const must=(ok,message)=>{if(!ok)SR63.fail(message);};
  must(raw&&typeof raw==='object'&&!Array.isArray(raw),'النسخة ليست كائن بيانات صالحًا.');
  must(raw.settings&&typeof raw.settings==='object'&&!Array.isArray(raw.settings),'إعدادات النسخة غير صالحة.');
  must(Array.isArray(raw.rows)&&raw.rows.length<=100000,'عدد سجلات النسخة غير صالح أو يتجاوز 100 ألف سجل.');
  must(raw.catalogDetached===undefined||typeof raw.catalogDetached==='boolean','حالة فصل الهيكل الأكاديمي غير صالحة.');
  const settings={...ej,...raw.settings};
  must(Array.isArray(settings.exams)&&settings.exams.length===4,'يجب أن تحتوي النسخة تعريف الاختبارات الأربعة.');
  const examSet=new Set();for(const exam of settings.exams){must(exam&&XA.includes(exam.key)&&!examSet.has(exam.key),'مفاتيح الاختبارات ناقصة أو مكررة.');examSet.add(exam.key);must(typeof exam.name==='string'&&exam.name.trim()&&Number.isFinite(exam.total)&&exam.total>0,'اسم الاختبار أو درجته الكلية غير صالح.');}
  must(new Set(settings.exams.map(exam=>ij(exam.name))).size===4,'يجب أن تكون أسماء الاختبارات الأربعة مختلفة.');
  must(Number.isFinite(settings.pass)&&settings.pass>=0&&settings.pass<=100,'حد النجاح غير صالح.');
  must(Number.isFinite(settings.stable)&&settings.stable>=0,'هامش الثبات غير صالح.');
  must(Number.isInteger(settings.minSampleSize)&&settings.minSampleSize>=1,'الحد الأدنى للعينة غير صالح.');
  must(Array.isArray(settings.bands)&&settings.bands.length>0&&settings.bands.every(b=>b&&typeof b.id==='string'&&typeof b.label==='string'&&Number.isFinite(b.min)&&Number.isFinite(b.max)&&['above','average','below'].includes(b.macro)),'مستويات الأداء غير صالحة.');
  must(new Set(settings.bands.map(b=>b.id)).size===settings.bands.length&&!Ej(settings.bands).length,'حدود مستويات الأداء مكررة أو متداخلة أو بها فجوات.');
  for(const field of ['schoolName','academicYear','principalName','academicViceName','coordinatorName','schoolVision'])must(typeof settings[field]==='string',`الحقل ${field} غير صالح.`);
  for(const [field,limit] of [['students',100000],['grades',100],['classes',1000],['subjects',1000],['teachers',10000],['teacherAssignments',50000],['imports',10000],['customReports',1000],['auditLog',1000]])must(raw[field]===undefined||Array.isArray(raw[field])&&raw[field].length<=limit,`القائمة ${field} غير صالحة أو تجاوزت الحد المسموح.`);
  if(settings.reportDesign!==undefined){const design=settings.reportDesign;must(design&&typeof design==='object'&&!Array.isArray(design),'تصميم التقرير غير صالح.');for(const [key,value] of Object.entries(ZA)){if(design[key]===undefined)continue;must(typeof design[key]===typeof value,`إعداد تصميم غير صالح: ${key}`);if(typeof value==='object')must(design[key]&&!Array.isArray(design[key])&&Object.values(design[key]).every(item=>typeof item==='string'),'مسميات التقرير غير صالحة.');}}
  const ids=new Set(),keys=new Set();
  for(const [index,row] of raw.rows.entries()){
    must(row&&['id','studentId','studentName','subject','className'].every(k=>typeof row[k]==='string'&&row[k].trim()),`هوية السجل ${index+1} غير مكتملة.`);
    must(!ids.has(row.id)&&!keys.has(_j(row)),`سجل الطالب والمادة مكرر في الصف ${index+1}.`);ids.add(row.id);keys.add(_j(row));
    for(const exam of XA){const score=row.scores?.[exam]??null,status=row.statuses?.[exam]??(score!==null?'present':'unentered'),total=row.totals?.[exam]??tj(settings,exam).total;
      must(['present','absent','excused','unexcused','deprived','not_enrolled','unentered'].includes(status),`حالة غير معتمدة في السجل ${index+1}.`);
      must(Number.isFinite(total)&&total>0,`درجة كلية غير صالحة في السجل ${index+1}.`);
      must(status==='present'?Number.isFinite(score)&&score!==null&&score>=0&&score<=total:score===null,`عدم اتساق الحالة والدرجة في السجل ${index+1} — ${tj(settings,exam).name}.`);
    }
  }
  for(const grade of raw.grades??[])must(grade&&typeof grade.id==='string'&&typeof grade.name==='string'&&grade.name.trim(),'أحد الصفوف الدراسية غير صالح.');
  for(const cls of raw.classes??[])must(cls&&typeof cls.id==='string'&&typeof cls.className==='string'&&typeof cls.gradeId==='string','إحدى الشعب غير صالحة.');
  for(const subject of raw.subjects??[])must(subject&&typeof subject.id==='string'&&typeof subject.name==='string'&&subject.name.trim()&&Array.isArray(subject.gradeIds??[])&&(subject.coordinatorName===undefined||typeof subject.coordinatorName==='string')&&(subject.coordinatorId===undefined||typeof subject.coordinatorId==='string'),'إحدى المواد غير صالحة.');
  const teacherIds=new Set();for(const profile of raw.teachers??[]){must(profile&&typeof profile.id==='string'&&!teacherIds.has(profile.id)&&typeof profile.teacher==='string'&&typeof (profile.subject??'')==='string'&&typeof (profile.department??'')==='string'&&Array.isArray(profile.classes??[])&&(profile.subjects===undefined||Array.isArray(profile.subjects)),'أحد سجلات المعلمين غير صالح.');teacherIds.add(profile.id);}
  for(const assignment of raw.teacherAssignments??[])must(assignment&&typeof assignment.id==='string'&&typeof assignment.profileId==='string'&&teacherIds.has(assignment.profileId)&&['teacher','subject','className'].every(k=>typeof assignment[k]==='string'),'إسناد معلم يشير إلى سجل غير موجود.');
  for(const aliases of [settings.importAliases??QA,settings.statusAliases??$A]){must(aliases&&typeof aliases==='object'&&!Array.isArray(aliases),'مسميات الاستيراد غير صالحة.');for(const list of Object.values(aliases))must(Array.isArray(list)&&list.every(x=>typeof x==='string'),'مسميات الاستيراد أو الحالات غير صالحة.');}
  for(const item of raw.imports??[])must(item&&typeof item.id==='string'&&typeof item.name==='string'&&typeof item.at==='string'&&['results','teachers'].includes(item.kind)&&(item.changes===undefined||Array.isArray(item.changes)&&item.changes.every(change=>change&&typeof change.rowId==='string'&&(!change.exam||XA.includes(change.exam)))),'سجل دفعة استيراد غير صالح.');
  for(const entry of raw.auditLog??[])must(entry&&typeof entry.id==='string'&&typeof entry.action==='string'&&typeof entry.at==='string'&&(entry.changes===undefined||Array.isArray(entry.changes)),'سجل مراجعة غير صالح.');
  for(const report of raw.customReports??[])must(report&&typeof report.id==='string'&&typeof report.name==='string'&&Array.isArray(report.columns)&&report.columns.every(c=>typeof c.key==='string'&&typeof c.label==='string')&&XA.includes(report.exam)&&XA.includes(report.compareExam)&&['detail','summary'].includes(report.mode),'قالب تقرير مخصص غير صالح.');
  const workspace=kj(raw);return {workspace,warnings:workspace.settings.schoolName.trim()?[]:['اسم المدرسة غير موجود.']};
};
// Only a unique exact teacher/subject match can repair a legacy local reference.
// External backups still pass through the strict validator without this migration.
SR63.migrateLocal=function(raw){
  const profiles=raw?.teachers??[],assignments=raw?.teacherAssignments??[],sourceRows=Array.isArray(raw?.rows)?raw.rows:[],studentRows=SR63.reconcileStudentRows(sourceRows);let studentRepairs=0;for(let i=0;i<sourceRows.length;i++)if(sourceRows[i]?.studentId!==studentRows[i]?.studentId)studentRepairs++;
  if(!Array.isArray(profiles)||!Array.isArray(assignments)){const workspace=SR63.withCatalog({...raw,rows:studentRows});return {workspace,repaired:studentRepairs,studentRepairs,assignmentRepairs:0};}
  const ids=new Set(profiles.map(profile=>profile?.id)),byName=new Map();for(const profile of profiles){if(!profile||typeof profile.teacher!=='string')continue;const keys=new Set([profile.subject,...(profile.subjects??[])]);for(const subject of keys){if(typeof subject!=='string'||!subject.trim())continue;const key=dj(profile.teacher,subject);if(!byName.has(key))byName.set(key,[]);byName.get(key).push(profile);}}
  let assignmentRepairs=0;const next=assignments.map(assignment=>{if(!assignment||ids.has(assignment.profileId)||typeof assignment.teacher!=='string'||typeof assignment.subject!=='string')return assignment;const matches=[...new Map((byName.get(dj(assignment.teacher,assignment.subject))??[]).map(p=>[p.id,p])).values()];if(matches.length!==1)return assignment;assignmentRepairs++;return {...assignment,profileId:matches[0].id};});
  const workspace=SR63.withCatalog({...raw,rows:studentRows,students:SR63.studentRegistry({rows:studentRows}),teacherAssignments:next}),repaired=studentRepairs+assignmentRepairs;
  return {workspace,repaired,studentRepairs,assignmentRepairs};
};
