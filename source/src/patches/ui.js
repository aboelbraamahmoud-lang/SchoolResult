/* PATCH Nde.Be.o */
o=async()=>{
  if(!oe.size)return;
  if(B==='present'&&e.rows.some(row=>oe.has(row.id)&&(row.scores[e.activeExam]===null||!Number.isFinite(row.scores[e.activeExam]))))return eb.error('لا يمكن تعيين حاضر لسجل بلا درجة؛ أدخل الدرجات أولًا.');
  if(!await Kj(e,'قبل تعديل حالة نتائج جماعي'))return eb.error('تعذر إنشاء نقطة استعادة؛ لم يتغير شيء.');
  ue(await qj());t(previous=>({...previous,rows:previous.rows.map(row=>oe.has(row.id)?{...row,scores:{...row.scores,[previous.activeExam]:B==='present'?row.scores[previous.activeExam]:null},statuses:{...row.statuses,[previous.activeExam]:B},importBatches:{...row.importBatches,[previous.activeExam]:null}}:row)}));se(new Set());eb.success('تم تطبيق الحالة وتوثيق التعديلات.');
}
/* PATCH Nde.Be.s */
s=async()=>{if(!oe.size)return;if(!await Kj(e,'قبل حذف سجلات نتائج'))return eb.error('تعذر إنشاء نقطة استعادة؛ لم يُحذف شيء.');ue(await qj());t(previous=>({...previous,rows:previous.rows.filter(row=>!oe.has(row.id))}));se(new Set());eb.success('تم حذف السجلات مع حفظ نقطة استعادة وسجل مراجعة.');}
/* PATCH Dde.y */
y=()=>SR63.exportCustom(n,c)
/* PATCH Dde.b */
b=()=>{const rows=[n.columns.map(column=>SR63.csvValue(column.label)),...c.map(row=>n.columns.map(column=>SR63.csvValue(row[column.key]??'')))];SR63.download('\ufeff'+Gv.sheet_to_csv(Gv.aoa_to_sheet(rows)),`${n.name||'تقرير-مخصص'}.csv`,'text/csv;charset=utf-8');}
/* PATCH Z9.c */
async function c(){
  const name=a.teacher.trim(),subject=a.subject.trim(),department=a.department.trim()||subject,classes=[...new Set(a.classes.map(lj).filter(Boolean))];
  if(!name||!subject||!classes.length||classes.some(value=>!D9(value)))return eb.error('أدخل اسم المعلم والمادة وشعبًا صحيحة مثل 7/1.');
  if(e.teachers.some(profile=>profile.id!==n?.id&&ij(profile.teacher)===ij(name)&&ij(profile.subject)===ij(subject)))return eb.error('المعلم والمادة مسجلان بالفعل.');
  if(!await Kj(e,n?'قبل تعديل بيانات معلم':'قبل إضافة معلم'))return eb.error('تعذر إنشاء نقطة استعادة؛ لم يتغير شيء.');
  const id=n?.id||'profile-'+crypto.randomUUID(),profile={...a,id,teacher:name,subject,department,classes};
  const assignments=classes.map(className=>({id:`assignment-${id}-${dj(subject,className)}`,profileId:id,teacher:name,subject,department,className,grade:uj(className)}));
  t(previous=>jj({...previous,teachers:n?previous.teachers.map(p=>p.id===id?profile:p):[...previous.teachers,profile],teacherAssignments:[...previous.teacherAssignments.filter(p=>p.profileId!==id),...assignments]},n?'تعديل بيانات معلم':'إضافة معلم',`${name} — ${subject}؛ الإسنادات الحالية، مع الاحتفاظ بأسماء المعلمين في النتائج التاريخية`,id));i(false);eb.success('تم حفظ بيانات المعلم.');
}
/* PATCH Z9.l */
async function l(){if(!n)return;if(!await Kj(e,'قبل حذف معلم'))return eb.error('تعذر إنشاء نقطة استعادة؛ لم يُحذف شيء.');t(previous=>jj({...previous,teachers:previous.teachers.filter(p=>p.id!==n.id),teacherAssignments:previous.teacherAssignments.filter(p=>p.profileId!==n.id)},'حذف معلم',n.teacher+' — حُفظت النتائج التاريخية',n.id));eb.success('تم حذف المعلم مع الاحتفاظ بنتائجه التاريخية.');}
/* PATCH Nde.et */
function et(){return (0,q.jsx)(SR63.Archives,{workspace:e,snapshots:le,status:c,bytes:u,onSave:()=>_e(),onBackup:Oe,onRestore:ke,onSnapshot:$e,onRollback:Qe,onNewYear:Ie,onClear:Ze,onRefresh:async()=>ue(await qj()),onChange:t});}
/* PATCH Nde.nt */
function nt(){return (0,q.jsxs)('section',{className:'executive-hero sr63-start',children:[(0,q.jsx)('span',{className:'sr63-kicker',children:'برنامج نتائج المدرسة · الإصدار السحابي 6.7.0'}),(0,q.jsx)('h1',{children:SR63.storage.blocked?'استعادة بياناتك المحفوظة':'جهّز قاعدة حسابك السحابية'}),(0,q.jsx)('p',{children:SR63.storage.blocked?'تعذّر الاتصال أو التحقق من بيانات حسابك. أعد الاتصال ثم أعد تحميل الصفحة؛ لن نستبدل البيانات السحابية بقاعدة فارغة.':'اختر قاعدة فارغة لإدخال نتائج مدرستك، أو استعد نسخة احتياطية، أو افتح البيانات التجريبية.'}),SR63.storage.blocked&&(0,q.jsx)('p',{role:'alert',children:SR63.storage.error}),(0,q.jsxs)('div',{className:'sr63-actions',children:[!SR63.storage.blocked&&(0,q.jsx)('button',{className:'sr63-button',onClick:()=>Me('empty'),children:'قاعدة فارغة'}),!SR63.storage.blocked&&(0,q.jsx)('button',{className:'sr63-button',onClick:()=>Me('demo'),children:'جولة تجريبية'}),(0,q.jsxs)('label',{className:'sr63-button',children:['استعادة نسخة JSON',(0,q.jsx)('input',{type:'file',accept:'.json',className:'sr63-file',onChange:event=>{const file=event.target.files?.[0];if(file)ke(file);event.target.value='';}})]}),SR63.storage.blocked&&(0,q.jsx)('button',{className:'sr63-button',onClick:async()=>{const raw=await Yj();SR63.storage.block('لم يتم اعتماد البيانات بعد.');if(raw)SR63.download(raw,'بيانات-للفحص.json');},children:'تنزيل البيانات للفحص'})]})]});}
/* PATCH Nde.Me */
async function Me(mode){if(SR63.storage.blocked)return eb.error('استعد نسخة صالحة قبل بدء العمل.');const next=mode==='demo'?zj():Aj();if(await _e(next)){srRawSet(next);r(structuredClone(next.settings));h(false);s(mode==='demo'?'dashboard':'import');eb.success(mode==='demo'?'تم تحميل الجولة التعريفية.':'تم إنشاء قاعدة سحابية فارغة.');}}
/* PATCH Nde.Ze */
async function Ze(){if(!await Kj(e,'قبل تفريغ نتائج الطلاب'))return eb.error('تعذر إنشاء نقطة استعادة؛ لم تُفرّغ النتائج.');ue(await qj());const next=jj({...e,rows:[],imports:e.imports.filter(item=>item.kind==='teachers')},'تفريغ النتائج','حذف درجات الطلاب مع الإبقاء على قاعدة المعلمين والإعدادات');if(!await _e(next))return;srRawSet(next);s('import');eb.success('تم تفريغ النتائج وحفظها مع نقطة استعادة.');}
