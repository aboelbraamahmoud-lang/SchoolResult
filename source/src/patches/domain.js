/* PATCH T9 */
function T9(value){return SR63.number(value);}
/* PATCH E9 */
function E9(value,isNumber,settings){
  const text=w9(value);if(!text)return {status:'unentered',recognized:true};
  if(isNumber)return {status:'present',recognized:true};
  if(['حاضر','present'].map(w9).includes(text))return {status:'present',recognized:true};
  const aliases=settings?.statusAliases??$A;
  for(const key of ['absent','excused','unexcused','deprived','not_enrolled','unentered'])if((aliases[key]??[]).some(alias=>w9(alias)===text)||key===String(value).trim())return {status:key,recognized:true};
  return {status:'unentered',recognized:false};
}
/* PATCH vj */
vj=(row,exam,settings)=>SR63.validResult(row,exam,settings)&&row.statuses[exam]==='present'?row.scores[exam]/pj(row,exam,settings)*100:null
/* PATCH yj */
yj=(value,bands)=>typeof value==='number'&&Number.isFinite(value)?[...bands].sort((a,b)=>b.min-a.min).find(band=>value>=band.min&&(value<band.max||band.max===100&&value<=100)):undefined
/* PATCH wj */
wj=(value,digits=1)=>value===null||value===undefined||!Number.isFinite(value)?'—':`${value.toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits,useGrouping:false})}%`
/* PATCH Tj */
Tj=value=>value===null||value===undefined||!Number.isFinite(value)?'لا توجد عينة مشتركة':`${value>0?'+':''}${value.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false})}`
/* PATCH Ede */
function Ede(value,key){
  if(typeof value!=='string')return value;
  if(!key.startsWith('percent:')&&!key.startsWith('delta:')&&!['success','achievement','valueAdded'].includes(key))return value;
  if(!/[0-9٠-٩۰-۹]/.test(value))return null;
  const number=SR63.number(value.replace(/\s*ن\.م\s*$/,'').replace(/[%٪]/g,'').trim());
  return number===null?null:key.startsWith('percent:')||['success','achievement'].includes(key)?number/100:number;
}
/* PATCH bj */
function bj(rows,exam,settings){
  const bandCounts=Object.fromEntries(settings.bands.map(b=>[b.id,0])),macro={above:0,average:0,below:0},students=new Set();
  const metric={rows:rows.length,students:0,evaluated:0,passed:0,failed:0,absent:0,excused:0,unexcused:0,deprived:0,notEnrolled:0,unentered:0,success:null,achievement:null,raw:0,bandCounts,macro};
  const statusFields={absent:'absent',excused:'excused',unexcused:'unexcused',deprived:'deprived',not_enrolled:'notEnrolled',unentered:'unentered'};let possible=0;
  for(const row of rows){students.add(SR63.studentEntityKey(row,exam)||ij(row.studentId));const field=statusFields[row.statuses[exam]];if(field)metric[field]++;const pct=vj(row,exam,settings);if(pct===null)continue;
    metric.evaluated++;metric.raw+=row.scores[exam];possible+=pj(row,exam,settings);if(pct>=settings.pass)metric.passed++;
    const band=yj(pct,settings.bands);if(band){bandCounts[band.id]++;macro[band.macro]++;}
  }
  metric.students=students.size;metric.failed=metric.evaluated-metric.passed;metric.success=metric.evaluated?metric.passed/metric.evaluated*100:null;metric.achievement=possible?metric.raw/possible*100:null;return metric;
}
/* PATCH xj */
function xj(rows,from,to,settings){
  const pairs=[];for(const row of rows){const a=vj(row,from,settings),b=vj(row,to,settings);if(a!==null&&b!==null)pairs.push({a,b,delta:b-a});}
  const deltas=pairs.map(p=>p.delta),sorted=[...deltas].sort((a,b)=>a-b),half=Math.floor(sorted.length/2),improved=deltas.filter(d=>d>settings.stable).length,declined=deltas.filter(d=>d<-settings.stable).length;
  return {paired:pairs.length,eligible:rows.length,coverage:rows.length?pairs.length/rows.length*100:0,fromAverage:pairs.length?pairs.reduce((sum,p)=>sum+p.a,0)/pairs.length:null,toAverage:pairs.length?pairs.reduce((sum,p)=>sum+p.b,0)/pairs.length:null,delta:pairs.length?deltas.reduce((sum,d)=>sum+d,0)/pairs.length:null,median:sorted.length?(sorted.length%2?sorted[half]:(sorted[half-1]+sorted[half])/2):null,improved,declined,stable:pairs.length-improved-declined};
}
/* PATCH Sj */
function Sj(rows,dimension,exam,settings,previous){
  const groups=new Map();for(const row of rows){const key=dimension==='teacher'?mj(row,exam):dimension==='className'?hj(row,exam):dimension==='grade'?gj(row,exam):row[dimension]||'غير محدد';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
  return [...groups].map(([name,subset])=>({name,subset,metric:bj(subset,exam,settings),va:previous?xj(subset,previous,exam,settings):null})).sort((a,b)=>(b.metric.achievement??-Infinity)-(a.metric.achievement??-Infinity));
}
/* PATCH LN */
function LN(value){return SR63.validate(value);}
/* PATCH Yj */
async function Yj(){return SR63.storage.load();}
/* PATCH Xj */
async function Xj(workspace,options){return SR63.storage.save(workspace,options);}
/* PATCH Kj */
async function Kj(workspace,reason){try{const point={id:crypto.randomUUID(),at:new Date().toISOString(),reason,workspace:structuredClone(workspace),bytes:new Blob([JSON.stringify(workspace)]).size,pinned:reason.startsWith('أرشيف نهاية العام'),year:workspace.settings.academicYear};return await SR63.cloud.rpc('school_snapshot',{p_point:point});}catch(error){eb.error(error.message);return null;}}
/* PATCH qj */
async function qj(){return SR63.cloud.list();}
/* PATCH Jj */
async function Jj(id){if(!window.confirm('حذف هذه النسخة من الأرشيف السحابي؟ نزّلها أولًا إذا كنت تحتاج إليها.'))return;await SR63.cloud.remove(id);}
/* PATCH Nde.Qe */
async function Qe(batchId,exam){
  if(!exam)return;if(!await Kj(e,'قبل التراجع عن دفعة استيراد')){eb.error('تعذر إنشاء نقطة استعادة؛ لم يتغير شيء.');return;}
  try{const result=SR63.rollback(e,batchId,exam);ue(await qj());if(!await _e(result.workspace))return;srRawSet(result.workspace);eb.success(`تم التراجع عن ${result.restored} نتيجة؛ حُفظت ${result.skipped} نتيجة معدّلة لاحقًا.`);}catch(error){eb.error(error.message);}
}
/* PATCH Nde.ke */
async function ke(file){
  try{if(file.size>250000000)throw new Error('الملف يتجاوز 250 ميجابايت.');const checked=SR63.parseBackup(JSON.parse(await file.text())),next=checked.workspace;
    if(!window.confirm(`استعادة نسخة مدرسة «${next.settings.schoolName}» للعام ${next.settings.academicYear}، وبها ${next.rows.length} سجل و${checked.snapshots.length} نسخة أرشيفية؟ ستُحفظ نقطة استعادة لبياناتك الحالية.`))return;
    const previous=m?await Yj():e;
    if(previous&&!await Kj(previous,'قبل استعادة نسخة خارجية'))throw new Error('تعذر إنشاء نقطة استعادة؛ لم تُستبدل البيانات.');
    const restored=jj(next,'استعادة نسخة خارجية',file.name),snapshots=SR63.mergeSnapshots(checked.snapshots,await SR63.listFullSnapshots());if(await _e(restored,{snapshots})){srRawSet(restored);r(structuredClone(restored.settings));a(false);ue(await qj());h(false);s('dashboard');eb.success('تم التحقق من النسخة واستعادتها وحفظها.');}
  }catch(error){eb.error(`لم تُستعد النسخة: ${error.message||'الملف غير صالح.'}`);}
}
/* PATCH Nde.$e */
async function $e(snapshot){
  try{const full=await SR63.getSnapshot(snapshot),checked=LN(full.workspace);if(!window.confirm(`استعادة «${full.reason}»؟ ستُحفظ نقطة لبياناتك الحالية.`))return;if(!await Kj(e,'قبل استعادة نقطة محفوظة'))throw new Error('تعذر إنشاء نقطة حماية.');const next=jj(checked.workspace,'استعادة نقطة',full.reason);ue(await qj());if(!await _e(next))return;srRawSet(next);r(structuredClone(next.settings));a(false);eb.success('تمت استعادة النقطة وحفظها.');}catch(error){eb.error(error.message);}
}
/* PATCH jde.d */
async function d(){
  const className=lj(c.className),total=SR63.number(c.total),score=SR63.number(c.score);
  if(!c.studentId.trim()||!c.studentName.trim()||!D9(className)||!c.subject.trim())return eb.error('أكمل رقم الطالب واسمه والمادة وشعبة صحيحة.');
  if(total===null||total<=0)return eb.error('الدرجة الكلية غير صحيحة.');
  if(c.status==='present'&&(score===null||score<0||score>total))return eb.error(`أدخل درجة صحيحة من 0 إلى ${total}.`);
  if(t.rows.some(row=>row.id!==e.id&&_j(row)===_j({studentId:c.studentId,subject:c.subject})))return eb.error('يوجد سجل آخر لنفس الطالب والمادة؛ عدّل السجل الموجود.');
  if(!await Kj(t,'قبل تعديل نتيجة طالب'))return eb.error('تعذر إنشاء نقطة استعادة؛ لم يُحفظ التعديل.');
  n(previous=>SR63.auditChanges(previous,{...previous,rows:previous.rows.map(row=>row.id===e.id?{...row,studentId:c.studentId.trim(),studentName:c.studentName.trim(),className,grade:uj(className),subject:c.subject.trim(),department:c.department.trim()||c.subject.trim(),teacher:c.teacher.trim(),scores:{...row.scores,[r]:c.status==='present'?score:null},statuses:{...row.statuses,[r]:c.status},totals:{...row.totals,[r]:total},examTeachers:{...row.examTeachers,[r]:c.teacher.trim()},examClasses:{...row.examClasses,[r]:className},importBatches:{...row.importBatches,[r]:null}}:row)}));
  o(false);eb.success('تم تحديث نتيجة الطالب وشعبته وتسجيل التعديل.');
}
/* PATCH Nde.Oe */
function Oe(){SR63.download(e,`نسخة-نتائج-${e.settings.academicYear}.json`);}
/* PATCH Nde.Fe */
async function Fe(){throw new Error('مسار الاستعادة المحلي القديم غير مستخدم في الإصدار السحابي. استخدم الأرشيف السحابي من صفحة النسخ والأرشيف.');}
/* PATCH kj */
function kj(e){
  let t=e,n=t?.settings??{},r=n.exams??ej.exams.map(e=>({...e})),i=SR63.reconcileStudentRows((Array.isArray(t?.rows)?t.rows:[]).map(e=>{let t=lj(e.className),n=Object.fromEntries(XA.map((t,n)=>[t,e.totals?.[t]??r[n]?.total??ej.exams[n].total])),i=Object.fromEntries(XA.map(t=>[t,e.examTeachers?.[t]??e.teacher??``])),a=Object.fromEntries(XA.map(t=>[t,lj(e.examClasses?.[t]??e.className)])),o=Object.fromEntries(XA.map(t=>[t,e.importBatches?.[t]??null])),s=Object.fromEntries(XA.map(t=>[t,e.statuses?.[t]??(typeof e.scores?.[t]===`number`?`present`:`unentered`)])),c=Object.fromEntries(XA.map(t=>[t,e.scores?.[t]??null]));return{...e,className:t,grade:uj(t),scores:c,statuses:s,totals:n,examTeachers:i,examClasses:a,importBatches:o}})),a=Oj(i),o={...ZA,...n.reportDesign??{},reportNames:{...ZA.reportNames,...n.reportDesign?.reportNames??{}},signatureLabels:{...ZA.signatureLabels,...n.reportDesign?.signatureLabels??{}}},s={...QA,...n.importAliases??{}},c={...$A,...n.statusAliases??{}},l=(Array.isArray(t?.teachers)?t.teachers:a.teachers).map(e=>({...e,coordinator:e.coordinator??``,classes:(e.classes??[]).map(lj)})),u=(Array.isArray(t?.teacherAssignments)?t.teacherAssignments:a.teacherAssignments).map(e=>{let t=lj(e.className);return{...e,className:t,grade:uj(t)}}),catalog=SR63.ensureCatalog({rows:i,teachers:l,teacherAssignments:u,grades:t?.grades,classes:t?.classes,subjects:t?.subjects,catalogDetached:t?.catalogDetached===true}),students=SR63.studentRegistry({rows:i});
  return{version:7,__storage:t?.__storage??null,catalogDetached:t?.catalogDetached===true,settings:{...ej,...n,exams:n.exams??ej.exams.map(e=>({...e})),bands:n.bands??ej.bands.map(e=>({...e})),reportDesign:o,importAliases:s,statusAliases:c},rows:i,students,grades:catalog.grades,classes:catalog.classes,subjects:catalog.subjects,teachers:catalog.teachers,teacherAssignments:catalog.teacherAssignments,activeExam:XA.includes(t?.activeExam)?t.activeExam:`exam1`,imports:Array.isArray(t?.imports)?t.imports:[],customReports:Array.isArray(t?.customReports)?t.customReports:[],auditLog:Array.isArray(t?.auditLog)?t.auditLog:[]}
}
/* PATCH Aj */
function Aj(e){
  const base={version:7,catalogDetached:e?.catalogDetached===true,settings:structuredClone(e?.settings??ej),rows:[],students:[],grades:e?structuredClone(e.grades??[]):[],classes:e?structuredClone(e.classes??[]):[],subjects:e?structuredClone(e.subjects??[]):[],teachers:e?structuredClone(e.teachers??[]):[],teacherAssignments:e?structuredClone(e.teacherAssignments??[]):[],activeExam:`exam1`,imports:[],customReports:e?structuredClone(e.customReports):[],auditLog:[{id:crypto.randomUUID(),at:new Date().toISOString(),action:`تهيئة`,details:`إنشاء قاعدة بيانات فارغة`}]};return SR63.withCatalog(base)
}
/* PATCH zj */
function zj(){let e=Rj(),t=Oj(e),catalog=SR63.ensureCatalog({rows:e,...t});return{version:7,catalogDetached:false,settings:{...ej,exams:ej.exams.map(e=>({...e})),bands:ej.bands.map(e=>({...e})),reportDesign:{...ej.reportDesign,reportNames:{...ej.reportDesign.reportNames},signatureLabels:{...ej.reportDesign.signatureLabels}},importAliases:{...ej.importAliases},statusAliases:{...ej.statusAliases}},rows:e,grades:catalog.grades,classes:catalog.classes,subjects:catalog.subjects,teachers:catalog.teachers,teacherAssignments:catalog.teacherAssignments,activeExam:`exam4`,imports:[{id:`demo`,name:`بيانات-تجريبية.xlsx`,at:`2026-09-10T08:00:00.000Z`,rows:810,warnings:0,kind:`results`,exam:`exam4`}],customReports:[],auditLog:[]}}
