/* PATCH RN */
function RN(workspace,exam){
  const issues=[],add=(id,severity,category,title,details,count)=>{if(count)issues.push({id,severity,category,title,details,count});};
  const catalogHealth=SR63.catalogHealth(workspace),names=new Map(),duplicates=new Map(),identityRefs=new Map();
  add('teachers-incomplete','warning','المعلمون','سجلات معلمين غير مكتملة','راجع الاسم والمادة والقسم والصفوف.',workspace.teachers.filter(p=>!String(p.teacher??'').trim()||!String(p.subject??'').trim()||!String(p.department??'').trim()||!(p.classes??[]).length).length);
  add('missing-assignments','critical','الإسناد','تكليفات أكاديمية ناقصة',`هناك ${catalogHealth.coverage.missing} خلية مادة × شعبة بلا معلم. أكمل خريطة التكليفات قبل اعتماد النتائج أو التقارير.`,catalogHealth.coverage.missing);
  add('orphan-assignments','critical','الإسناد','إسنادات تشير إلى معلم غير موجود','أعد ربط الإسنادات بمعرف معلم ثابت.',catalogHealth.orphanAssignments);
  add('assignment-conflicts','critical','الإسناد','إسنادات لها أكثر من معلم','احسم معلمًا واحدًا فقط لكل مادة وشعبة.',catalogHealth.assignmentConflicts);
  add('empty-classes','warning','الإسناد','شعب بلا أي تكليفات','أكمل تكليفات المواد للشعب قبل استيراد نتائجها.',catalogHealth.classesWithoutAssignments);
  add('duplicate-teachers','warning','المعلمون','أسماء معلمين مكررة','راجع المعرف الثابت للمعلم حتى لا تتكرر التكليفات لنفس الشخص.',catalogHealth.duplicateTeacherNames);
  add('coordinators','info','المعلمون','مواد بلا منسق','لا يمنع الحسابات، لكنه يؤثر في اكتمال بيانات التقارير والتوقيعات.',catalogHealth.subjectsWithoutCoordinator);
  add('unlinked','critical','الإسناد','نتائج غير مرتبطة بمعلم','أكمل ربط المعلم قبل اعتماد التقرير.',workspace.rows.filter(row=>row.statuses[exam]!=='not_enrolled'&&(mj(row,exam)==='غير محدد'||!mj(row,exam).trim())).length);
  add('unentered','warning','النتائج','درجات لم تُرصد','لا تدخل في النسب؛ تظهر التقارير بوصفها مسودة.',workspace.rows.filter(row=>row.statuses[exam]==='unentered').length);
  add('invalid-scores','critical','النتائج','درجة أو حالة نتيجة غير متسقة','الحاضر يحتاج درجة صحيحة؛ حالات الغياب تحتاج درجة فارغة وإجماليًا صحيحًا.',workspace.rows.filter(row=>!SR63.validResult(row,exam,workspace.settings)).length);
  for(const row of workspace.rows){const id=ij(row.studentId);if(!names.has(id))names.set(id,new Set());names.get(id).add(ij(row.studentName));const fallback=SR63.studentIdentityFromRow(row,exam),official=SR63.studentOfficialId(row);if(fallback&&official){if(!identityRefs.has(fallback))identityRefs.set(fallback,new Set());identityRefs.get(fallback).add(ij(official));}duplicates.set(_j(row),(duplicates.get(_j(row))??0)+1);}
  add('identity','critical','الطلاب','رقم طالب مرتبط بأكثر من اسم','راجع الرقم الأكاديمي وتهجئة الاسم.',[...names.values()].filter(set=>set.size>1).length);
  add('identity-collision','critical','الطلاب','اسم وشعبة مرتبطان بأكثر من رقم طالب','لم يتم الدمج تلقائيًا حمايةً للبيانات. راجع الأرقام الأكاديمية أو أضف رقم الطالب لملفات النتائج.',[...identityRefs.values()].filter(set=>set.size>1).length);
  add('duplicates','critical','الطلاب','طالب ومادة مكرران','يوجد أكثر من سجل للطالب والمادة نفسها.',[...duplicates.values()].filter(count=>count>1).length);
  const count=workspace.rows.length,complete=key=>workspace.rows.filter(row=>row.statuses[key]!=='unentered'&&SR63.validResult(row,key,workspace.settings)).length;
  const coverage=Object.fromEntries(XA.map(key=>[key,count?complete(key)/count*100:0])),critical=issues.filter(i=>i.severity==='critical').reduce((n,i)=>n+i.count,0),criticalGroups=issues.filter(i=>i.severity==='critical').length;
  return {issues,critical,criticalGroups,completion:coverage[exam],evaluated:workspace.rows.filter(row=>vj(row,exam,workspace.settings)!==null).length,examCoverage:coverage,structure:catalogHealth,ready:count>0&&critical===0&&complete(exam)===count};
}
/* PATCH zN */
function zN(workspace,exam,issue){
  if(issue==='invalid-scores')return workspace.rows.filter(row=>!SR63.validResult(row,exam,workspace.settings));
  if(issue==='orphan-assignments'){const ids=new Set(workspace.teachers.map(p=>p.id)),keys=new Set(workspace.teacherAssignments.filter(a=>!ids.has(a.profileId)).map(a=>dj(a.subject,a.className)));return workspace.rows.filter(row=>keys.has(dj(row.subject,hj(row,exam))));}
  if(issue==='identity-collision'){const conflicts=SR63.studentIdentityConflicts(workspace,exam);return workspace.rows.filter(row=>conflicts.has(SR63.studentIdentityFromRow(row,exam)));}
  return srLegacyQualityRows(workspace,exam,issue);
}
/* PATCH Nde.Ne */
async function Ne(){
  if(!await Kj(e,'قبل تحميل أحدث نسخة محلية'))return eb.error('تعذر إنشاء نقطة استعادة لنسختك الحالية.');
  try{const latest=await Yj();if(!latest)throw new Error('لا توجد نسخة محفوظة.');const checked=LN(latest);srRawSet(checked.workspace);r(structuredClone(checked.workspace.settings));a(false);_(false);ue(await qj());eb.success('تم تحميل أحدث نسخة محلية.');}catch(error){SR63.storage.block(error.message);eb.error(error.message);}
}
/* PATCH Nde.Pe */
async function Pe(){
  if(!window.confirm('اعتماد نسخة هذه النافذة بدل النسخة الأحدث؟ ستُحفظ النسختان كنقطتي استعادة أولًا.'))return;
  try{const latest=await Yj();if(!await Kj(e,'قبل اعتماد نسخة النافذة الحالية')||latest&&!await Kj(latest,'قبل استبدال النسخة المحفوظة عند تعارض النوافذ'))throw new Error('تعذر حماية النسختين؛ أُلغي الاستبدال.');ue(await qj());if(await _e(e)){_(false);eb.success('حُفظت النسختان ثم اعتُمدت نسخة هذه النافذة.');}}catch(error){SR63.storage.block(error.message);eb.error(error.message);}
}
/* PATCH Nde.Ie */
async function Ie(){
  const value=window.prompt('العام الأكاديمي الجديد، مثل 2027/2028',e.settings.academicYear);if(!value||value.trim()===e.settings.academicYear)return;
  if(!window.confirm(`إنشاء أرشيف دائم للعام ${e.settings.academicYear} وبدء العام ${value.trim()} بقاعدة نتائج فارغة؟`))return;
  if(!await Kj(e,`أرشيف نهاية العام ${e.settings.academicYear}`))return eb.error('تعذر إنشاء الأرشيف الدائم؛ لم يبدأ عام جديد.');
  let next=Aj(e);next.settings.academicYear=value.trim();next=jj(next,'عام أكاديمي جديد',`أُرشف ${e.settings.academicYear} وبدأ ${value.trim()}`);ue(await qj());if(!await _e(next))return;srRawSet(next);r(structuredClone(next.settings));s('import');eb.success('أُنشئ أرشيف دائم للعام السابق.');
}
