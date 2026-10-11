const fs=require('fs'),path=require('path');
const acorn=require('internal/deps/acorn/acorn/dist/acorn');
const sourceRoot=__dirname,projectRoot=path.resolve(sourceRoot,'..'),webRoot=projectRoot;
const readSource=rel=>fs.readFileSync(path.join(sourceRoot,rel),'utf8');
const version=JSON.parse(fs.readFileSync(path.join(webRoot,'version.json'),'utf8'));
const projectPackage=JSON.parse(fs.readFileSync(path.join(projectRoot,'package.json'),'utf8'));
if(projectPackage.version!==version.version)throw new Error(`Version mismatch: package ${projectPackage.version} / web ${version.version}`);
const base=readSource('base/app.js');
const ast=acorn.parse(base,{ecmaVersion:'latest'}),nodes=new Map();
function index(body,prefix=''){
 for(const node of body){
  if(node.type==='FunctionDeclaration'){const key=prefix+node.id.name;nodes.set(key,node);index(node.body.body,key+'.');}
  if(node.type==='VariableDeclaration')for(const d of node.declarations)if(d.id.type==='Identifier')nodes.set(prefix+d.id.name,d);
 }
}
index(ast.body);
const changes=[];
for(const filename of fs.readdirSync(path.join(sourceRoot,'src/patches')).filter(f=>f.endsWith('.js'))){
 const text=readSource(path.join('src/patches',filename)),pattern=/\/\* PATCH ([\w$.]+) \*\//g;
 const markers=[...text.matchAll(pattern)];
 for(let i=0;i<markers.length;i++){
  const key=markers[i][1],code=text.slice(markers[i].index+markers[i][0].length,markers[i+1]?.index??text.length).trim(),node=nodes.get(key);
  if(!node)throw new Error('Missing patch target '+key);
  if(changes.some(c=>c.key===key))throw new Error('Duplicate target '+key);
  changes.push({key,start:node.start,end:node.end,code});
 }
}
let code=base;
for(const edit of changes.sort((a,b)=>b.start-a.start))code=code.slice(0,edit.start)+edit.code+code.slice(edit.end);
function replace(oldText,newText,expected=1){
 const count=code.split(oldText).length-1;
 if(count!==expected)throw new Error(`Text patch expected ${expected}, found ${count}: ${oldText.slice(0,100)}`);
 code=code.split(oldText).join(newText);
}
// Preserve unmodified parsing paths for ordinary single-subject sheets.
const importOld=readSource('base/ode.js')
 .replace('function ode(','function srLegacyImport(')
 .replace('hv(e,{type:`array`})','e')
 .replace('[`studentId`,`studentName`,`className`].every(e=>t[e]!==void 0)','[`studentName`,`className`].every(e=>t[e]!==void 0)')
 .replace('if(!a||!o||!c){u.push({severity:`warning`,row:e+1,sheet:i,message:`تم تجاهل صف ناقص الرقم أو الاسم أو الشعبة.`});continue}','if(!o||!c){u.push({severity:`warning`,row:e+1,sheet:i,message:`تم تجاهل صف ناقص الاسم أو الشعبة.`});continue}')
 .replace('studentId:a,studentName:o,grade:uj(d),className:d','studentId:a||SR63.stableStudentId(o,d),studentName:o,grade:uj(d),className:d')
 .replace('لم أجد أي ورقة تحتوي الأعمدة: الرقم، الاسم، الشعبة الصفية.','لم أجد أي ورقة تحتوي عمودي الاسم والشعبة الصفية.');
const qualityOld=readSource('base/zN.js').replace('function zN(','function srLegacyQualityRows(');
// State metadata and compatibility with older scores-only backups.
// Imported virtual sheets carry their own exam and, where present, per-row totals.
replace('P=(0,v.useCallback)(e=>g[A9(e.sourceFile,e.sourceSheet)]??m,[g,m])','P=(0,v.useCallback)(e=>e.totalOverride??g[A9(e.sourceFile,e.sourceSheet)]??m,[g,m])');
replace('let r=k9(n);e.has(r)?t.add(r):e.add(r)','let r=k9(n)+`|`+(n.exam??f);e.has(r)?t.add(r):e.add(r)');
replace('let s=o.scores[f],c=o.statuses[f],l=o.totals[f],u=P(e)','let key=e.exam??f,s=o.scores[key],c=o.statuses[key],l=o.totals[key],u=P(e)');
replace('!e.recognized||!Number.isFinite(t)||t<=0||e.score!==null&&(e.score<0||e.score>t)||!e.subject','!e.recognized||!Number.isFinite(t)||t<=0||e.status===`present`&&e.score===null||e.score!==null&&(e.score<0||e.score>t)||!e.subject');
replace('className:e.className,subject:e.subject,department:e.department,teacher:mj(e,r)','className:hj(e,r),subject:e.subject,department:e.department,teacher:mj(e,r)');
replace('onChange:t=>_(n=>({...n,[A9(e.fileName,e.sheet)]:Number(t.target.value)}))','onChange:t=>{_(n=>({...n,[A9(e.fileName,e.sheet)]:Number(t.target.value)}));w(!1)}');
// Make the preview show the class breakdown, not just a misleading grand total.
replace('`ورقة: `,e.sheet,` · `,Q(e.rows.length),` طالب`','`ورقة: `,e.sheet,` · `,Q(e.rows.length),` نتيجة · توزيع الشعب: `,[...new Set(e.rows.map(r=>r.className))].sort((a,b)=>a.localeCompare(b,`ar`)).map(c=>`${c}: ${e.rows.filter(r=>r.className===c).length}`).join(` | `)||`غير محدد`');
replace('e.headerRow]})]},e.id))','e.headerRow,` · أخطاء القراءة: `,e.issues.filter(i=>i.severity===`error`).length,` · صفوف تحتاج مراجعة: `,e.issues.filter(i=>i.severity===`error`).slice(0,5).map(i=>i.row).join(`، `)||`لا توجد`]})]},e.id))');
replace('الاختبار المستهدف','اختبار أوراق المادة المفردة');
replace('الدرجة المقترحة مبنية على أعلى درجة موجودة، لذلك راجعها واكتب الدرجة الأصلية للاختبار قبل الاعتماد.','القالب الشامل يستورد اختباراته الأربعة وحالاتها؛ لكل بطاقة اختبار محدد. الإجمالي من ورقة الإعدادات أو إعدادات البرنامج، ويجب مراجعته قبل الاعتماد.');
replace('حتى 50 ملفًا · 25MB للملف · 100 ألف سجل للدفعة','حتى 50 ملفًا · 25MB للملف · 100 ألف سجل طالب/مادة · 400 ألف نتيجة اختبار');
replace('children:t.grade})','children:t.grade+(t.exam?` · `+tj(e.settings,t.exam).name:``)+(t.inputTeacher?` · المعلم بالملف: `+t.inputTeacher:``)})');
replace('`نموذج النتيجة`]})})]','`نموذج النتيجة`]})}),(0,q.jsx)(dA,{variant:`outline`,asChild:true,children:(0,q.jsx)(`a`,{href:`./نموذج-استيراد-نتائج-المدرسة.xlsx`,download:true,children:`نموذج الاختبارات الأربعة`})})]');
// All local edits participate in the same dirty/save and audit mechanism.
replace('ge=(0,v.useRef)(Promise.resolve(!0));','ge=(0,v.useRef)(Promise.resolve(!0));const srRawSet=t;t=(0,v.useCallback)(change=>{SR63.storage.touch();srRawSet(previous=>SR63.auditChanges(previous,typeof change===`function`?change(previous):change));},[srRawSet]);(0,v.useEffect)(()=>{const handler=()=>{if(SR63.storage.blocked){_(!0);l(SR63.storage.error)}};window.addEventListener(`sr63-storage`,handler);return()=>window.removeEventListener(`sr63-storage`,handler)},[]);');
const loading='(0,v.useEffect)(()=>{(async()=>{let e=await Yj();';
const loadStart=code.indexOf(loading),loadEnd=code.indexOf('let _e=',loadStart);
if(loadStart<0||loadEnd<0)throw new Error('Load hook not found');
code=code.slice(0,loadStart)+`(0,v.useEffect)(()=>{(async()=>{try{const saved=await Yj();ue(await qj());if(saved){const migrated=SR63.migrateLocal(saved),checked=LN(migrated.workspace);if(migrated.repaired){if(!await Kj(saved,'قبل إصلاح هويات ومراجع قديمة'))throw new Error('تعذر إنشاء نقطة حماية قبل ترحيل البيانات القديمة.');checked.workspace=jj(checked.workspace,'إصلاح هويات ومراجع قديمة','توحيد '+(migrated.studentRepairs??0)+' سجل طالب وإصلاح '+(migrated.assignmentRepairs??0)+' مرجع تكليف');SR63.storage.touch();ue(await qj());}srRawSet(checked.workspace);r(structuredClone(checked.workspace.settings));l('تم تحميل بياناتك من السحابة');}else{h(!0);l('اختر طريقة البدء');}}catch(error){SR63.storage.block('تعذر التحقق من البيانات المحفوظة: '+error.message);h(!0);l('تعذر تحميل بيانات السحابة؛ تحقق من الاتصال وأعد تحميل الصفحة');eb.error(error.message);}finally{p(!0);}})()},[]);`+code.slice(loadEnd);
const saveStart=code.indexOf('let _e='),saveEnd=code.indexOf(',ve=(0,v.useCallback)',saveStart);
if(saveStart<0||saveEnd<0)throw new Error('Save callback not found');
code=code.slice(0,saveStart)+`let _e=(0,v.useCallback)(async(workspace=e,options={})=>{l('جارٍ الحفظ…');try{const result=await Xj(workspace,options);d(result.bytes);l('محفوظ سحابيًا — الإصدار '+result.revision);_(!1);return true;}catch(error){if(error.code==='LOCAL_CONFLICT')_(!0);l(error.message||'فشل الحفظ — نزّل نسخة احتياطية');eb.error(error.message);return false;}},[e])`+code.slice(saveEnd);
replace('if(Ej(n.bands).length){eb.error(`صحح حدود مستويات الأداء قبل الحفظ`);return}','try{LN({...e,settings:n})}catch(error){eb.error(error.message);return}');
replace('(0,v.useEffect)(()=>{if(!f||m)return;let t=setTimeout(()=>void _e(e),900);return()=>clearTimeout(t)},[e,f,m,_e])','(0,v.useEffect)(()=>{if(!f||m||!SR63.storage.pending)return;let timer=setTimeout(()=>void _e(e),750);return()=>clearTimeout(timer)},[e,f,m,_e])');
replace('i&&(e.preventDefault(),e.returnValue=``)','(i||SR63.storage.pending||SR63.formDirty)&&(e.preventDefault(),e.returnValue=``)');
replace('(0,v.useEffect)(()=>{o!==`backups`||window.location.protocol===`file:`||fetch(`/api/workspace/snapshots`).then(e=>e.json()).then(e=>fe(e.snapshots??[])).catch(()=>fe([]))},[o,e])','(0,v.useEffect)(()=>{},[])');
replace('تعذر الحفظ السحابي؛ النسخة المحلية محفوظة','تعذر إكمال الحفظ؛ راجع الحالة ونزّل نسخة احتياطية');
replace('يوجد تعارض بين نسخة هذا الجهاز والنسخة السحابية.','يوجد تعارض في الحفظ بين النوافذ.');
replace('تم إيقاف الحفظ السحابي حتى تختار.','حُميت النسخة المحفوظة. نزّل نسختك الحالية قبل اختيار النسخة الصحيحة.');
replace('تحميل النسخة السحابية','تحميل أحدث نسخة محلية');
replace('اعتماد نسخة هذا الجهاز','اعتماد نسخة هذه النافذة');
replace('الإصدار 6.2 الاحترافي',`الإصدار ${version.version} — نسخة مستقرة`);
replace('le.length,`/10`','le.filter(point=>!point.pinned).length,` نقطة · `,le.filter(point=>point.pinned).length,` أرشيف دائم`');
// 6.9.17 — reports use Western digits; value-added cells do not repeat the Arabic abbreviation.
// Official report terminology: clear administrative labels.
code=code.split('طلاب فريدون').join('عدد الطلاب').split('نتائج ناجحة').join('ناجح').split('نتائج راسبة').join('راسب').split('النتائج المقيمة فقط').join('حاضر فقط').split('غير المقيمة فقط').join('دون نسبة محتسبة').split('نتائج مقيمة').join('حاضر').split('نتيجة مقيمة').join('حاضر').split('حاضر/مقيم').join('حاضر').split('الحضور المقيم').join('الحضور').split('المقيمون').join('الحاضرون');
replace('var pde=[{id:`summary`,title:`ملخص النتائج`,text:`حضور ونجاح وتحصيل وتوزيع المستويات`,icon:xy},{id:`levels`,title:`تحليل المستويات`,text:`كشف تفصيلي للطلاب مجمّع حسب مستوى الأداء`,icon:Ay},{id:`struggling`,title:`الطلاب ضمن نسبة`,text:`قائمة علاجية حسب حد مئوي تختاره`,icon:Wy},{id:`teachers`,title:`متوسطات المعلمين`,text:`صفوف المعلم ومتوسط النجاح والتحصيل`,icon:Cy},{id:`comparison`,title:`مقارنة اختبارين`,text:`درجة ونسبة وفارق ومستوى لكل طالب`,icon:iy},{id:`subjects`,title:`مقارنة المواد`,text:`مواد الصف ومعلموها ونسب النجاح والتحصيل`,icon:oy}]','var pde=[{id:`executive`,title:`الملخص التنفيذي`,text:`صفحة قيادة واحدة للمدير: الأداء والجودة وأولويات التحسين`,icon:Gy},{id:`summary`,title:`ملخص النتائج`,text:`طلاب ونتائج مرصودة ونجاح وتحصيل وتوزيع المستويات`,icon:xy},{id:`levels`,title:`تحليل المستويات`,text:`مجموعات فوق المتوسط وفي المتوسط وتحت المتوسط`,icon:Ay},{id:`struggling`,title:`الطلاب ضمن نسبة`,text:`قائمة تدخل ومتابعة حسب حد مئوي تختاره`,icon:Wy},{id:`teachers`,title:`متوسطات المعلمين`,text:`قراءة وصفية لصفوف المعلم والنجاح والتحصيل`,icon:Cy},{id:`comparison`,title:`مقارنة اختبارين`,text:`درجة ونسبة وفارق وعينة مشتركة لكل طالب`,icon:iy},{id:`subjects`,title:`مقارنة المواد`,text:`بيان رسمي منفصل لنسب النجاح والتحصيل: الشعبة × المادة × المعلم`,icon:oy},{id:`departmentStats`,title:`إحصائية نتائج القسم`,text:`الشعبة × المواد: المعلم ونسبة النجاح والتحصيل في صفحة عرضية`,icon:xy},{id:`support`,title:`قسم الدعم الإضافي`,text:`طلاب الدمج سابع وثامن وتاسع بتقارير ونسب مستقلة عن النتائج العامة`,icon:gy}]');
// 6.7 grade-wide subject comparison: one grade per landscape page.
replace('if(i===`subjects`){let t=e;return(n===`الكل`?P9(t.map(e=>hj(e,a))):[n]).forEach(e=>{let n=t.filter(t=>hj(t,a)===e),r=P9(n.map(e=>`${e.subject}\\u0000${mj(e,a)}`)),i=r.length?Array.from({length:Math.ceil(r.length/18)},(e,t)=>r.slice(t*18,(t+1)*18)):[[]];i.forEach((t,r)=>f.push({key:`subjects-${e}-${r}`,title:e,entity:e,scope:`className`,className:e,teacher:``,subject:`كل المواد`,rows:n.filter(e=>t.includes(`${e.subject}\\u0000${mj(e,a)}`)),allRows:n,rowOffset:r*18,part:r+1,totalParts:i.length}))}),f}','if(i===`subjects`)return SR63.gradeSubjectPages(e,a,n);');
replace('if(i===`subjects`)return SR63.gradeSubjectPages(e,a,n);','if(i===`departmentStats`)return SR63.departmentStatsPages(e,a,r);if(i===`subjects`)return SR63.gradeSubjectPages(e,a,n);');
// 6.9.14: all ordinary reports are built as single-subject pages; teacher reports are ordered subject -> teacher.
replace('mde(e.rows,i,o,S,n,T,g,e.settings)','SR63.buildReportPages(e.rows,i,o,S,n,T,g,e.settings)');
// Print calls are guarded by data quality. Native pagination is allowed to flow.
const reportStart=code.indexOf('function xde('),reportEnd=code.indexOf('function ',reportStart+10);
let reportCode=code.slice(reportStart,reportEnd);
// 6.9.14: defensive re-scope before rendering and always resolve the displayed subject from the page data.
reportCode=reportCode.split('page:t,').join('page:SR63.normalizeReportPage(t,n,n===`comparison`?m:u,e),');
reportCode=reportCode.split('subject:t.subject,assessment:i').join('subject:(n===`subjects`||n===`departmentStats`||n===`support`)?`كل المواد`:SR63.reportDisplaySubject(SR63.normalizeReportPage(t,n,n===`comparison`?m:u,e),n===`comparison`?m:u),assessment:i');
reportCode=reportCode.split('t.id===`subjects`&&(a(`className`),l(`الكل`),s(`الكل`))').join('(t.id===`subjects`||t.id===`departmentStats`||t.id===`support`)&&(a(`grade`),l(`الكل`),s(`الكل`))');
reportCode=reportCode.split('x=n===`subjects`').join('x=n===`subjects`||n===`departmentStats`||n===`support`');
reportCode=reportCode.split('className:`grid gap-3 md:grid-cols-2 xl:grid-cols-6`').join('className:`grid gap-3 md:grid-cols-2 xl:grid-cols-4`');
reportCode=reportCode.split('x?(0,q.jsx)(`div`,{className:`mt-2 rounded-md border bg-slate-50 px-3 py-2 text-sm font-bold`,children:`صف / شعبة`})').join('x?(0,q.jsx)(`div`,{className:`mt-2 rounded-md border bg-slate-50 px-3 py-2 text-sm font-bold`,children:`صف دراسي`})');
reportCode=reportCode.split('(0,q.jsx)(J,{children:i===`teacher`?`المعلم`:`الصف / الشعبة`})').join('(0,q.jsx)(J,{children:x?`الصف الدراسي`:i===`teacher`?`المعلم`:`الصف / الشعبة`})');
reportCode=reportCode.split('items:[{value:`الكل`,label:i===`teacher`?`كل المعلمين — صفحة لكل معلم`:`كل الصفوف — صفحة لكل صف`},...E.map').join('items:[{value:`الكل`,label:x?`كل الصفوف الدراسية — صفحة لكل صف دراسي`:i===`teacher`?`كل المعلمين — صفحة لكل معلم`:`كل الصفوف — صفحة لكل صف`},...E.map');
reportCode=reportCode.split('className:`school-report-page`,style:j9(e)').join('className:`school-report-page ${(n===`subjects`||n===`departmentStats`)?`grade-subjects-landscape`:``}`,style:j9(e)');
reportCode=reportCode.split('title:`${e.settings.reportDesign.reportNames[n]}: ${i}${a}`').join('title:n===`executive`?`الملخص التنفيذي — ${tj(e.settings,u).name}`:n===`subjects`?`${t.metricType===`achievement`?`بيان نسب التحصيل الأكاديمي`:`بيان نسب النجاح`} — ${t.grade||t.entity}`:n===`departmentStats`?`إحصائية نتائج القسم — ${t.grade||t.entity}`:n===`support`?`قسم الدعم الإضافي — ${t.title||t.entity}`:`${e.settings.reportDesign.reportNames[n]||pde.find(z=>z.id===n)?.title||`تقرير`}: ${i}${a}`');
reportCode=reportCode.split('n===`summary`&&(0,q.jsx)(hde,{page:SR63.normalizeReportPage(t,n,n===`comparison`?m:u,e),exam:u,workspace:e})').join('n===`summary`&&(0,q.jsx)(SRSummaryReport,{page:SR63.normalizeReportPage(t,n,u,e),exam:u,workspace:e})');
reportCode=reportCode.split('n===`levels`&&(0,q.jsx)(gde,{page:SR63.normalizeReportPage(t,n,n===`comparison`?m:u,e),exam:u,workspace:e})').join('n===`levels`&&(0,q.jsx)(SRLevelAnalysisReport,{page:SR63.normalizeReportPage(t,n,u,e),exam:u,workspace:e})');
reportCode=reportCode.split('n===`struggling`&&(0,q.jsx)(vde,{page:SR63.normalizeReportPage(t,n,n===`comparison`?m:u,e),exam:u,threshold:g,workspace:e})').join('n===`struggling`&&(0,q.jsx)(SRTargetRangeReport,{page:SR63.normalizeReportPage(t,n,u,e),exam:u,threshold:g,workspace:e})');
reportCode=reportCode.split('n===`comparison`&&(0,q.jsx)(_de,{page:SR63.normalizeReportPage(t,n,n===`comparison`?m:u,e),from:f,to:m,workspace:e})').join('n===`comparison`&&(0,q.jsx)(SRComparisonReport,{page:SR63.normalizeReportPage(t,n,m,e),from:f,to:m,workspace:e})');
reportCode=reportCode.split('n===`subjects`&&(0,q.jsx)(bde,{page:SR63.normalizeReportPage(t,n,n===`comparison`?m:u,e),exam:u,workspace:e})').join('n===`executive`&&(0,q.jsx)(SRExecutiveReport,{page:t,exam:u,workspace:e}),n===`subjects`&&(0,q.jsx)(SRGradeSubjectsReport,{page:t,exam:u,workspace:e}),n===`departmentStats`&&(0,q.jsx)(SRDepartmentStatsReport,{page:t,exam:u,workspace:e}),n===`support`&&(0,q.jsx)(SRSupportDepartmentReport,{page:t,exam:u,workspace:e})');
reportCode=reportCode.split('desc:`اختر شكل التقرير، ثم المعلم أو الصف، والاختبار أو الاختبارين. خيار «الكل» ينشئ صفحة A4 مستقلة لكل معلم أو صف.`').join('desc:`اختر التقرير والتقييم. الملخص التنفيذي مناسب للقيادة المدرسية، وتقارير المواد والقسم تُقسَّم تلقائيًا إلى أجزاء واضحة بدل ضغط الخطوط عند الطباعة.`');
reportCode=reportCode.split('children:e.settings.reportDesign.reportNames[t.id]').join('children:e.settings.reportDesign.reportNames[t.id]||t.title');
reportCode=reportCode.split('window.print()').join('SR63.print(e,w?[f,m]:[u])');
reportCode=reportCode.split('فحص الطباعة: جاهز').join('المعاينة جاهزة — راجع معاينة PDF');
reportCode=reportCode.split('`صفحة `').join('`جزء `');
code=code.slice(0,reportStart)+reportCode+code.slice(reportEnd);
// 6.9.20 — one-file academic master import: grades, classes, subjects, coordinators, teachers and assignments.
replace('title:`١ — قاعدة بيانات المعلمين`,desc:`يقبل النموذج المرفق: اسم المعلم، المادة، القسم، منسق المادة، ثم الصفوف. يستخدم منسق المادة تلقائيًا في توقيع تقاريرها.`','title:`١ — قاعدة الهيكل الأكاديمي والمعلمين`,desc:`ارفع ملفًا واحدًا فقط. ينشئ البرنامج الصفوف والشعب والمواد والأقسام والمنسقين والمعلمين وخريطة التكليفات تلقائيًا. إذا تُرك المنسق فارغًا يُعتمد أول معلم ظاهر في المادة منسقًا لها.`');
replace('`اختيار ملف المعلمين`','`اختيار ملف الهيكل الأكاديمي`');
replace('`اعتماد قاعدة المعلمين`','`اعتماد الهيكل والتكليفات`');
replace('[D,O]=(0,v.useState)(`merge`)','[D,O]=(0,v.useState)(`replace`)');
replace('label:`استبدال القاعدة كاملة`','label:`اعتماد الملف كهيكل رئيسي (موصى به)`');
replace("eb.success('تم تحديث المعلمين مع الحفاظ على معرفاتهم والإسنادات التاريخية.')","eb.success('تم توزيع الهيكل الأكاديمي والمعلمين والتكليفات والمنسقين تلقائيًا.')");
replace('kicker:`بوابة الاستيراد الذكية`,title:`من ملف المدرسة إلى تحليل موثوق`,desc:`استورد قاعدة المعلمين مرة واحدة، ثم ارفع ملفات النتائج كما تصدر من المدرسة. لن تُعتمد أي نتيجة قبل مراجعة المادة والشعبة والمعلم والدرجة الكلية.`','kicker:`بوابة الاستيراد الذكية`,title:`ملف واحد يبني الهيكل الأكاديمي كاملًا`,desc:`ابدأ بملف الهيكل الأكاديمي والمعلمين: الصفوف والشعب والمواد والأقسام والمنسقون والمعلمون والتكليفات تُوزع تلقائيًا، ثم ارفع ملفات النتائج.`');
// 6.10.0 — import reconciliation, actionable quality links and clearer analytical semantics.
replace('},[j,f,P,e.rows]),ne=','},[j,f,P,e.rows]),reconciliation=(0,v.useMemo)(()=>SR63.importReconciliation(j,e,T,te,M,{invalid:F.length,duplicates:L,identity:I}),[j,e,T,te,M,F.length,L,I]),ne=');
replace('(0,q.jsxs)(`div`,{className:`mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4`,children:[','(0,q.jsxs)(`section`,{className:`sr610-import-reconciliation`,children:[(0,q.jsxs)(`div`,{className:`sr610-reconcile-head`,children:[(0,q.jsxs)(`div`,{children:[(0,q.jsx)(`span`,{children:`مصالحة الدفعة قبل الاعتماد`}),(0,q.jsx)(`b`,{children:`اعرف بالضبط ماذا سيضاف قبل أن تكتب أي نتيجة في القاعدة`}),(0,q.jsx)(`small`,{children:`الطالب يُحسب مرة واحدة مهما تعددت مواده، والنتائج تُحسب كسجلات طالب × مادة.`})]}),(0,q.jsx)(`em`,{className:reconciliation.invalid||reconciliation.duplicates||reconciliation.identity||reconciliation.unresolved?`has-risk`:`is-ready`,children:reconciliation.invalid||reconciliation.duplicates||reconciliation.identity||reconciliation.unresolved?`تحتاج مراجعة`:`جاهزة للاعتماد`})]}),(0,q.jsx)(`div`,{className:`sr610-reconcile-grid`,children:[[`عدد الطلاب`,reconciliation.students],[`نتائج ستُعالج`,reconciliation.results],[`مواد`,reconciliation.subjects],[`شعب`,reconciliation.classes],[`ربط مكتمل`,reconciliation.matched],[`ربط ناقص`,reconciliation.unresolved]].map(([label,value])=>(0,q.jsxs)(`article`,{children:[(0,q.jsx)(`span`,{children:label}),(0,q.jsx)(`b`,{children:Q(value)})]},label))}),(0,q.jsxs)(`div`,{className:`sr610-reconcile-impact`,children:[(0,q.jsxs)(`span`,{children:[`جديد `,(0,q.jsx)(`b`,{children:Q(reconciliation.created)})]}),(0,q.jsxs)(`span`,{children:[`استكمال فارغ `,(0,q.jsx)(`b`,{children:Q(reconciliation.empty)})]}),(0,q.jsxs)(`span`,{children:[`سيُستبدل `,(0,q.jsx)(`b`,{children:Q(reconciliation.overwritten)})]}),(0,q.jsxs)(`span`,{children:[`بلا تغيير `,(0,q.jsx)(`b`,{children:Q(reconciliation.unchanged)})]}),(0,q.jsxs)(`span`,{className:reconciliation.invalid?`danger`:``,children:[`صفوف غير صالحة `,(0,q.jsx)(`b`,{children:Q(reconciliation.invalid)})]}),(0,q.jsxs)(`span`,{className:reconciliation.identity?`danger`:``,children:[`تعارض هوية `,(0,q.jsx)(`b`,{children:Q(reconciliation.identity)})]})]}),reconciliation.aliases.length?(0,q.jsxs)(`details`,{className:`sr610-alias-details`,children:[(0,q.jsxs)(`summary`,{children:[`توحيد مسميات المواد تلقائيًا (`,reconciliation.aliases.length,`)`]}),(0,q.jsx)(`p`,{children:reconciliation.aliases.join(` · `)})]}):null]}),(0,q.jsxs)(`div`,{className:`mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4`,children:[');
replace('انتقل إلى قاعدة المعلمين أو البيانات الأساسية لمعالجة السبب.','كل ملاحظة مرتبطة بموضع إصلاح مباشر؛ عالج السبب ثم أعد فحص الجودة قبل الطباعة أو الاعتماد.');
replace('onClick:()=>s(e.category===`المعلمون`||e.category===`الإسناد`?`teacherData`:`data`)','onClick:()=>s(e.category===`المعلمون`||e.category===`الإسناد`?`masterData`:`data`)');
replace('children:t[e.severity]','children:`${t[e.severity]} · فتح موضع الإصلاح`');
replace('o===`teachers`?He(`teacher`,`مقارنة عادلة بين المعلمين`,`داخل المدرسة أو القسم أو المادة، بمتوسط موزون وقيمة مضافة لكل اختبار.`)','o===`teachers`?He(`teacher`,`قراءة وصفية لأداء المعلمين`,`تُعرض النتائج لدعم القرار داخل سياق المادة والصف وحجم العينة؛ لا تُستخدم منفردة للحكم على أداء المعلم.`)');
replace('children:[Q(ye.evaluated),` حاضر`]','children:[Q(ye.evaluated),` نتيجة مرصودة`]');
replace('children:[Q(ye.passed),` ناجح · `,Q(ye.failed),` راسب`]','children:[Q(ye.passed),` نتيجة ناجحة · `,Q(ye.failed),` نتيجة راسبة`]');
replace('children:`الحاضرون`','children:`النتائج المرصودة`',2);
// 6.9.19 — custom report builder defaults to the globally active exam and keeps exam-bound columns aligned.
replace('H9=()=>({id:``,name:`تقرير مخصص جديد`,title:`تقرير مخصص`,subtitle:``,mode:`detail`,groupBy:`className`,secondaryGroupBy:`none`,subject:`الكل`,entityDimension:`className`,entity:`الكل`,exam:`exam4`,compareExam:`exam3`,minPercent:0,maxPercent:100,resultScope:`evaluated`,sortBy:`studentName`,sortDirection:`asc`,columns:V9,orientation:`portrait`,footerText:``})','H9=e=>SR63.customReportDefault(e)');
const customStart=code.indexOf('function Dde('),customEnd=code.indexOf('function ',customStart+10);
let customCode=code.slice(customStart,customEnd).split('window.print()').join('SR63.print(e,SR63.reportExamKeys(n))');
customCode=customCode
  .split('(0,v.useState)(H9)').join('(0,v.useState)(()=>H9(e))')
  .split('m=()=>{r(H9()),a(`studentName`)}').join('m=()=>{r(H9(e)),a(`studentName`)}')
  .split('onChange:t=>p({mode:t,columns:t===`summary`?U9(e,`summary`).slice(0,8):V9})').join('onChange:t=>p({mode:t,columns:t===`summary`?U9(e,`summary`).slice(0,8):SR63.customDetailColumns(n.exam)})')
  .split('value:n.exam,onChange:e=>p({exam:e}),items:e.settings.exams.map').join('value:n.exam,onChange:t=>p({exam:t,columns:n.mode===`detail`?SR63.remapCustomExamColumns(n.columns,n.exam,t):n.columns,compareExam:n.compareExam===n.exam?SR63.previousExamKey(t):n.compareExam}),items:e.settings.exams.map')
  .split('children:`غيّر نطاق النتائج أو المادة أو الاختبار.`').join('children:SR63.customReportEmptyHint(e,n)');
code=code.slice(0,customStart)+customCode+code.slice(customEnd);
// Inform users that report design changes are pending before navigating away.
replace('a(t=>({...t,reportDesign:{...t.reportDesign,...e}})),s(!0)','a(t=>({...t,reportDesign:{...t.reportDesign,...e}})),SR63.formDirty=true,s(!0)');
replace('a(t=>({...t,...e})),s(!0)','a(t=>({...t,...e})),SR63.formDirty=true,s(!0)');
replace('s(!1),eb.success(`تم حفظ التصميم وتطبيقه على جميع التقارير`)','SR63.formDirty=false,s(!1),eb.success(`تم حفظ التصميم وتطبيقه على جميع التقارير`)');
replace('me.current=e','me.current=e;SR63.currentWorkspace=e');
replace('onSelect:e=>{s(e),E(`الكل`)}','onSelect:e=>{if((i||SR63.formDirty)&&!window.confirm(`توجد تعديلات لم تعتمدها. مغادرة الصفحة وإلغاء هذه التعديلات؟`))return;a(false);SR63.formDirty=false;s(e);E(`الكل`)}');
replace('()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()','()=>void SR63.fullscreen()');
replace('a(structuredClone(e.settings)),s(!1)','a(structuredClone(e.settings)),SR63.formDirty=false,s(!1)');
replace('t.paired<10','t.paired<e.settings.minSampleSize');
replace('أقل من 10 سجلات','أقل من ${e.settings.minSampleSize} سجلات');

// 6.8 academic master data, student profile and executive dashboard.
replace('{id:`teacherData`,label:`قاعدة المعلمين`,icon:Cy,group:`الرئيسية`},{id:`data`,label:`البيانات الأساسية`,icon:gy,group:`الرئيسية`}', '{id:`masterData`,label:`الهيكل الأكاديمي`,icon:Cy,group:`الرئيسية`},{id:`studentProfile`,label:`الملف الأكاديمي للطالب`,icon:gy,group:`الرئيسية`},{id:`data`,label:`البيانات الأساسية`,icon:gy,group:`الرئيسية`}');
replace('{id:`reports`,label:`مركز التقارير والطباعة`,icon:xy,group:`الإدارة`}', '{id:`studentGradeReview`,label:`مراجعة درجات الطلاب`,icon:gy,group:`الإدارة`},{id:`studentResultsPrint`,label:`طباعة نتائج الطلاب`,icon:gy,group:`الإدارة`},{id:`reports`,label:`مركز التقارير والطباعة`,icon:xy,group:`الإدارة`}');
replace('{id:`studentGradeReview`,label:`مراجعة درجات الطلاب`,icon:gy,group:`الإدارة`}', '{id:`aiPlans`,label:`الخطط العلاجية الذكية`,icon:gy,group:`الإدارة`},{id:`studentGradeReview`,label:`مراجعة درجات الطلاب`,icon:gy,group:`الإدارة`}');
replace('o===`dashboard`?Le():o===`import`?Re():o===`teacherData`?ze():o===`data`?Be():', 'o===`dashboard`?(0,q.jsx)(SR63.Dashboard,{workspace:e,setWorkspace:t,onNavigate:s}):o===`import`?Re():o===`masterData`?(0,q.jsx)(SR63.MasterData,{workspace:e,setWorkspace:t,onNavigate:s}):o===`studentProfile`?(0,q.jsx)(SR63.StudentProfile,{workspace:e,onNavigate:s}):o===`teacherData`?ze():o===`data`?Be():');
replace('o===`studentProfile`?(0,q.jsx)(SR63.StudentProfile,{workspace:e,onNavigate:s}):o===`teacherData`?', 'o===`studentProfile`?(0,q.jsx)(SR63.StudentProfile,{workspace:e,onNavigate:s}):o===`studentGradeReview`?(0,q.jsx)(SR63.StudentGradeReview,{workspace:e,setWorkspace:t}):o===`studentResultsPrint`?(0,q.jsx)(SR63.StudentResultsPrint,{workspace:e}):o===`teacherData`?');
replace('o===`studentGradeReview`?(0,q.jsx)(SR63.StudentGradeReview,{workspace:e,setWorkspace:t}):', 'o===`aiPlans`?(0,q.jsx)(SR63.AIPlans,{workspace:e,setWorkspace:t}):o===`studentGradeReview`?(0,q.jsx)(SR63.StudentGradeReview,{workspace:e,setWorkspace:t}):');
replace('الربط الدقيق يعتمد على المادة + الشعبة. تستطيع حسم أي حالة ناقصة باختيار المعلم الصحيح؛ وسيُحفظ هذا الإسناد للمرة التالية.','الربط التلقائي يعتمد على المادة + الشعبة من الهيكل الأكاديمي. لا يلزم وجود اسم المعلم في ملف النتيجة؛ إذا غاب التكليف أو كان متعارضًا يتوقف الاعتماد حتى تصحيحه.');
replace('استورد قاعدة المعلمين واعتمدها أولًا حتى تظهر اختيارات الربط.','أكمل الهيكل الأكاديمي وخريطة التكليفات أولًا؛ ملف النتيجة لا يحتاج اسم المعلم.');
// 6.9 premium sidebar: quick actions under search without duplicating navigation.
replace('placeholder:`بحث في وظائف البرنامج`,className:`h-10 border-white/10 bg-white/[.07] pr-9 text-sm text-white placeholder:text-white/40 focus-visible:ring-[#f1c75b]`})]})]}),','placeholder:`بحث في وظائف البرنامج`,className:`h-10 border-white/10 bg-white/[.07] pr-9 text-sm text-white placeholder:text-white/40 focus-visible:ring-[#f1c75b]`})]}),(0,q.jsxs)(`div`,{className:`sr69-sidebar-actions group-data-[collapsible=icon]:hidden`,children:[(0,q.jsx)(`button`,{onClick:()=>s(`import`),children:`+ رفع نتائج`}),(0,q.jsx)(`button`,{onClick:()=>s(`masterData`),children:`الهيكل الأكاديمي`})]})]}),');

// Subject selector values stay canonical while all user-facing choices show configured labels.
replace('...Cj(e.rows,`subject`).map(e=>({value:e,label:e}))',
        '...Cj(e.rows,`subject`).map(name=>({value:name,label:SR63.reportSubjectLabel(name,e.settings)}))',3);
// Grouped custom reports also honor subject display labels (grouping stays by canonical subject).
replace('group:e.name,students:e.metric.students',
        'group:n.groupBy===`subject`?SR63.reportSubjectLabel(e.name,SR63.currentWorkspace?.settings):e.name,students:e.metric.students');
// Do not alter raw subject values in filters/exports: display the configured label in custom report cells.
replace('if(t===`teacher`)return mj(e,r);if(t===`className`)',
        'if(t===`subject`)return SR63.reportSubjectLabel(e.subject,n.settings);if(t===`teacher`)return mj(e,r);if(t===`className`)');
// 6.10.12 — editable report-only names/order, inside the normal settings save workflow.
replace('(0,q.jsx)(m9,{title:`التحكم في مسميات حالات النتيجة`',
        '(0,q.jsx)(SR63.SubjectPresentationSettings,{settings:n,onChange:o,workspace:e}),(0,q.jsx)(m9,{title:`التحكم في مسميات حالات النتيجة`');
// Cloud edition: replace remaining local-only labels and wrap the app with account login.
code=code.split('تحميل أحدث نسخة محلية').join('تحميل أحدث نسخة سحابية').split('تم تحميل أحدث نسخة محلية.').join('تم تحميل أحدث نسخة سحابية.').split('الحفظ المحلي').join('الحفظ السحابي');
replace('children:e[t.key]','children:SR63.renderReportValue(e[t.key],t.key)');
replace('children:(0,q.jsx)(Nde,{})','children:(0,q.jsx)(SR63.CloudApp,{})');
replace('SR63.currentWorkspace=e},[e])','SR63.currentWorkspace=e},[e]);(0,v.useEffect)(()=>{SR63.settingsDirty=i},[i])');
replace('function Nde(){let[e,t]=(0,v.useState)(()=>zj()),[n,r]=(0,v.useState)(()=>structuredClone(zj().settings))','function Nde(){let[e,t]=(0,v.useState)(()=>Aj()),[n,r]=(0,v.useState)(()=>structuredClone(Aj().settings))');
// 6.10.4 — quality center uses the same academic-structure readiness rules as the structure page.
replace('desc:`يكشف الأخطاء التي تؤثر في التحليل أو ربط المعلمين أو اكتمال الاختبار.`','desc:`فحص موحد لجودة النتائج وسلامة الهيكل الأكاديمي والتكليفات واكتمال الاختبار؛ لا تظهر حالة «جاهز» إذا كان أي تكليف أساسي ناقصًا.`');
replace('children:be.ready?`البيانات جاهزة`:`تحتاج معالجة`','children:be.ready?`البيانات والهيكل جاهزان`:`تحتاج معالجة`');
replace('label:`المشكلات الحرجة`,value:Q(be.critical),hint:`يجب حلها قبل الاعتماد`','label:`العناصر الحرجة`,value:Q(be.critical),hint:`${be.criticalGroups||0} نوع مشكلة · يجب حلها قبل الاعتماد`');
// 6.10.0 — final terminology cleanup after legacy transforms.
code=code.split('`نتيجة مقيمة`').join('`نتيجة مرصودة`').split('`نتائج مقيمة`').join('`نتائج مرصودة`');
// 6.9.10 coordinator names in report signatures come from the academic catalog.
code=code.split('i.signatureLabels.coordinator,fj(e,n)').join('i.signatureLabels.coordinator,SR63.subjectCoordinator(e,n)||fj(e,n)');
// 6.10.14 — each on-screen analytical table gets its own responsive layout.
// Keep the original rows, numeric calculations, grade bands and result fields intact.
replace('title:`التوزيع حسب الصف`,children:(0,q.jsx)(`div`,{className:`overflow-auto rounded-xl border`',
        'title:`التوزيع حسب الصف`,children:(0,q.jsx)(`div`,{className:`sr614-levels-wrap overflow-auto rounded-xl border`');
replace('title:`مصفوفة الصفوف`,children:(0,q.jsx)(`div`,{className:`max-h-[620px] overflow-auto rounded-xl border`',
        'title:`مصفوفة الصفوف`,children:(0,q.jsx)(`div`,{className:`sr614-matrix-wrap max-h-[620px] overflow-auto rounded-xl border`');
replace('title:`تفصيل القسم: المعلم والمادة والشعبة`,desc:`قراءة تنفيذية لكل إسناد داخل القسم، مع القيمة المضافة عن الاختبار السابق.`,children:(0,q.jsx)(`div`,{className:`max-h-[650px] overflow-auto rounded-xl border`',
        'title:`تفصيل القسم: المعلم والمادة والشعبة`,desc:`قراءة تنفيذية لكل إسناد داخل القسم، مع القيمة المضافة عن الاختبار السابق.`,children:(0,q.jsx)(`div`,{className:`sr614-departments-wrap max-h-[650px] overflow-auto rounded-xl border`');
replace('title:`سجلات النتائج`,desc:`${Q(H.length)} سجل · الصفحة ${r} من ${n}.`,children:[(0,q.jsx)(`div`,{className:`max-h-[650px] overflow-auto rounded-xl border`',
        'title:`سجلات النتائج`,desc:`${Q(H.length)} سجل · الصفحة ${r} من ${n}.`,children:[(0,q.jsx)(`div`,{className:`sr614-results-wrap max-h-[650px] overflow-auto rounded-xl border`');
const services=['engine.js','legacy-multiclass.js','catalog.js','subject-repair.js','master-ui.js','student-results-print.js','grade-review.js','ai-plan-core.js','ai-plans-ui.js','dashboard-pro.js','cloud.js','backups.js','imports.js','subject-presentation.js','report-scope.js','report-grouping.js','reports.js','ui.js','cloud-ui.js'].filter(f=>fs.existsSync(path.join(sourceRoot,'src',f))).map(f=>readSource(path.join('src',f))).join('\n');
code=services+'\n'+importOld+'\n'+qualityOld+'\n'+code;
acorn.parse(code,{ecmaVersion:'latest'});
fs.writeFileSync(path.join(webRoot,'app.js'),code);
fs.writeFileSync(path.join(webRoot,'style.css'),readSource('base/style.css')+'\n'+readSource('src/repair.css'));
console.log(`Built ${changes.length} replacements; ${Buffer.byteLength(code)} bytes; JavaScript syntax valid.`);
