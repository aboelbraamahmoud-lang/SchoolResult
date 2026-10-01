const fs=require('fs'),path=require('path');
const acorn=require('internal/deps/acorn/acorn/dist/acorn');
const base=fs.readFileSync('base/app.js','utf8');
const ast=acorn.parse(base,{ecmaVersion:'latest'}),nodes=new Map();
function index(body,prefix=''){
 for(const node of body){
  if(node.type==='FunctionDeclaration'){const key=prefix+node.id.name;nodes.set(key,node);index(node.body.body,key+'.');}
  if(node.type==='VariableDeclaration')for(const d of node.declarations)if(d.id.type==='Identifier')nodes.set(prefix+d.id.name,d);
 }
}
index(ast.body);
const changes=[];
for(const filename of fs.readdirSync('src/patches').filter(f=>f.endsWith('.js'))){
 const text=fs.readFileSync(path.join('src/patches',filename),'utf8'),pattern=/\/\* PATCH ([\w$.]+) \*\//g;
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
const importOld=fs.readFileSync('base/ode.js','utf8').replace('function ode(','function srLegacyImport(').replace('hv(e,{type:`array`})','e');
const qualityOld=fs.readFileSync('base/zN.js','utf8').replace('function zN(','function srLegacyQualityRows(');
// State metadata and compatibility with older scores-only backups.
replace('return{version:6,settings:{...ej,...n','return{version:6,__storage:t?.__storage??null,settings:{...ej,...n');
replace('e.statuses?.[t]??`unentered`','e.statuses?.[t]??(typeof e.scores?.[t]===`number`?`present`:`unentered`)');
// Imported virtual sheets carry their own exam and, where present, per-row totals.
replace('P=(0,v.useCallback)(e=>g[A9(e.sourceFile,e.sourceSheet)]??m,[g,m])','P=(0,v.useCallback)(e=>e.totalOverride??g[A9(e.sourceFile,e.sourceSheet)]??m,[g,m])');
replace('let r=k9(n);e.has(r)?t.add(r):e.add(r)','let r=k9(n)+`|`+(n.exam??f);e.has(r)?t.add(r):e.add(r)');
replace('let s=o.scores[f],c=o.statuses[f],l=o.totals[f],u=P(e)','let key=e.exam??f,s=o.scores[key],c=o.statuses[key],l=o.totals[key],u=P(e)');
replace('!e.recognized||!Number.isFinite(t)||t<=0||e.score!==null&&(e.score<0||e.score>t)||!e.subject','!e.recognized||!Number.isFinite(t)||t<=0||e.status===`present`&&e.score===null||e.score!==null&&(e.score<0||e.score>t)||!e.subject');
replace('className:e.className,subject:e.subject,department:e.department,teacher:mj(e,r)','className:hj(e,r),subject:e.subject,department:e.department,teacher:mj(e,r)');
replace('onChange:t=>_(n=>({...n,[A9(e.fileName,e.sheet)]:Number(t.target.value)}))','onChange:t=>{_(n=>({...n,[A9(e.fileName,e.sheet)]:Number(t.target.value)}));w(!1)}');
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
code=code.slice(0,loadStart)+`(0,v.useEffect)(()=>{(async()=>{try{const saved=await Yj();ue(await qj());if(saved){const migrated=SR63.migrateLocal(saved),checked=LN(migrated.workspace);if(migrated.repaired){if(!await Kj(saved,'قبل إصلاح مراجع إسناد قديمة'))throw new Error('تعذر إنشاء نقطة حماية قبل ترحيل الإسنادات.');checked.workspace=jj(checked.workspace,'إصلاح إسنادات قديمة','إصلاح '+migrated.repaired+' مرجع بمعلم مطابق للاسم والمادة');SR63.storage.touch();ue(await qj());}srRawSet(checked.workspace);r(structuredClone(checked.workspace.settings));l('تم تحميل بياناتك من السحابة');}else{h(!0);l('اختر طريقة البدء');}}catch(error){SR63.storage.block('تعذر التحقق من البيانات المحفوظة: '+error.message);h(!0);l('تعذر تحميل بيانات السحابة؛ تحقق من الاتصال وأعد تحميل الصفحة');eb.error(error.message);}finally{p(!0);}})()},[]);`+code.slice(loadEnd);
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
replace('الإصدار 6.2 الاحترافي','الإصدار 6.7.2 — مقارنة الشعب داخل المواد');
replace('le.length,`/10`','le.filter(point=>!point.pinned).length,` نقطة · `,le.filter(point=>point.pinned).length,` أرشيف دائم`');
// Null-safe workbook exports and precise labels for student-subject records.
for(const [a,b] of [['children:`ناجح`','children:`نتائج ناجحة`'],['children:`راسب`','children:`نتائج راسبة`'],['children:`المقيمون`','children:`نتائج مقيمة`'],['`حاضر/مقيم`','`نتائج مقيمة`']])code=code.split(a).join(b);
replace('(0,q.jsx)(`th`,{children:`الطلاب`})','(0,q.jsx)(`th`,{children:`نتائج مقيمة`})');
replace('(0,q.jsx)(`th`,{children:`عدد الطلاب`})','(0,q.jsx)(`th`,{children:`طلاب فريدون`})');
code=code.replace(/\[`عدد الطلاب`,/g,'[`طلاب فريدون`,').replace(/\[`حاضر`,/g,'[`نتائج مقيمة`,').replace(/\[`ناجح`,/g,'[`نتائج ناجحة`,').replace(/\[`راسب`,/g,'[`نتائج راسبة`,');
// 6.7 grade-wide subject comparison: one grade per landscape page.
replace('مواد الصف ومعلموها ونسب النجاح والتحصيل','كل شعب الصف في ورقة أفقية واحدة، مع معلمي المواد ونسب النجاح والتحصيل');
replace('if(i===`subjects`){let t=e;return(n===`الكل`?P9(t.map(e=>hj(e,a))):[n]).forEach(e=>{let n=t.filter(t=>hj(t,a)===e),r=P9(n.map(e=>`${e.subject}\\u0000${mj(e,a)}`)),i=r.length?Array.from({length:Math.ceil(r.length/18)},(e,t)=>r.slice(t*18,(t+1)*18)):[[]];i.forEach((t,r)=>f.push({key:`subjects-${e}-${r}`,title:e,entity:e,scope:`className`,className:e,teacher:``,subject:`كل المواد`,rows:n.filter(e=>t.includes(`${e.subject}\\u0000${mj(e,a)}`)),allRows:n,rowOffset:r*18,part:r+1,totalParts:i.length}))}),f}','if(i===`subjects`)return SR63.gradeSubjectPages(e,a,n);');
// Print calls are guarded by data quality. Native pagination is allowed to flow.
const reportStart=code.indexOf('function xde('),reportEnd=code.indexOf('function ',reportStart+10);
let reportCode=code.slice(reportStart,reportEnd);
reportCode=reportCode.split('t.id===`subjects`&&(a(`className`),l(`الكل`),s(`الكل`))').join('t.id===`subjects`&&(a(`grade`),l(`الكل`),s(`الكل`))');
reportCode=reportCode.split('x?(0,q.jsx)(`div`,{className:`mt-2 rounded-md border bg-slate-50 px-3 py-2 text-sm font-bold`,children:`صف / شعبة`})').join('x?(0,q.jsx)(`div`,{className:`mt-2 rounded-md border bg-slate-50 px-3 py-2 text-sm font-bold`,children:`صف دراسي`})');
reportCode=reportCode.split('(0,q.jsx)(J,{children:i===`teacher`?`المعلم`:`الصف / الشعبة`})').join('(0,q.jsx)(J,{children:x?`الصف الدراسي`:i===`teacher`?`المعلم`:`الصف / الشعبة`})');
reportCode=reportCode.split('items:[{value:`الكل`,label:i===`teacher`?`كل المعلمين — صفحة لكل معلم`:`كل الصفوف — صفحة لكل صف`},...E.map').join('items:[{value:`الكل`,label:x?`كل الصفوف الدراسية — صفحة لكل صف دراسي`:i===`teacher`?`كل المعلمين — صفحة لكل معلم`:`كل الصفوف — صفحة لكل صف`},...E.map');
reportCode=reportCode.split('className:`school-report-page`,style:j9(e)').join('className:`school-report-page ${x?`grade-subjects-landscape`:``}`,style:j9(e)');
reportCode=reportCode.split('title:`${e.settings.reportDesign.reportNames[n]}: ${i}${a}`,subject:t.subject,assessment:i').join('title:x?`مقارنة ${t.grade||t.entity}: ${i}`:`${e.settings.reportDesign.reportNames[n]}: ${i}${a}`,subject:t.subject,assessment:i');
reportCode=reportCode.split('n===`subjects`&&(0,q.jsx)(bde,{page:t,exam:u,workspace:e})').join('n===`subjects`&&(0,q.jsx)(SRGradeSubjectsReport,{page:t,exam:u,workspace:e})');
reportCode=reportCode.split('desc:`اختر شكل التقرير، ثم المعلم أو الصف، والاختبار أو الاختبارين. خيار «الكل» ينشئ صفحة A4 مستقلة لكل معلم أو صف.`').join('desc:`اختر شكل التقرير والاختبار. في مقارنة المواد ينشئ خيار «الكل» ورقة A4 أفقية مستقلة لكل صف دراسي، وتظهر الشعب والمعلمون والنسب في الورقة نفسها.`');
reportCode=reportCode.split('window.print()').join('SR63.print(e,w?[f,m]:[u])');
reportCode=reportCode.split('فحص الطباعة: جاهز').join('المعاينة جاهزة — راجع معاينة PDF');
reportCode=reportCode.split('`صفحة `').join('`جزء `');
code=code.slice(0,reportStart)+reportCode+code.slice(reportEnd);
const customStart=code.indexOf('function Dde('),customEnd=code.indexOf('function ',customStart+10);
let customCode=code.slice(customStart,customEnd).split('window.print()').join('SR63.print(e,SR63.reportExamKeys(n))');
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
// Cloud edition: replace remaining local-only labels and wrap the app with account login.
code=code.split('تحميل أحدث نسخة محلية').join('تحميل أحدث نسخة سحابية').split('تم تحميل أحدث نسخة محلية.').join('تم تحميل أحدث نسخة سحابية.').split('الحفظ المحلي').join('الحفظ السحابي');
replace('children:(0,q.jsx)(Nde,{})','children:(0,q.jsx)(SR63.CloudApp,{})');
replace('SR63.currentWorkspace=e},[e])','SR63.currentWorkspace=e},[e]);(0,v.useEffect)(()=>{SR63.settingsDirty=i},[i])');
replace('function Nde(){let[e,t]=(0,v.useState)(()=>zj()),[n,r]=(0,v.useState)(()=>structuredClone(zj().settings))','function Nde(){let[e,t]=(0,v.useState)(()=>Aj()),[n,r]=(0,v.useState)(()=>structuredClone(Aj().settings))');
const services=['engine.js','cloud.js','backups.js','imports.js','reports.js','ui.js','cloud-ui.js'].filter(f=>fs.existsSync('src/'+f)).map(f=>fs.readFileSync('src/'+f,'utf8')).join('\n');
code=services+'\n'+importOld+'\n'+qualityOld+'\n'+code;
acorn.parse(code,{ecmaVersion:'latest'});
fs.writeFileSync('../app.js',code);
fs.writeFileSync('../style.css',fs.readFileSync('base/style.css','utf8')+'\n'+fs.readFileSync('src/repair.css','utf8'));
fs.writeFileSync('build-targets.json',JSON.stringify(changes.map(c=>c.key),null,2));
console.log(`Built ${changes.length} replacements; ${Buffer.byteLength(code)} bytes; JavaScript syntax valid.`);
