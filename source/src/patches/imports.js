/* PATCH ode */
function ode(buffer,fileName,settings){
  const config=settings??ej,book=hv(buffer,{type:'array'}),wide=SR63.readWideWorkbook(book,fileName,config);
  const wideSource=new Set(wide.sheets.map(s=>s.sourceSheet));
  const legacy=srLegacyImport(book,fileName,config);const sheets=[...wide.sheets,...legacy.sheets.filter(sheet=>!wideSource.has(sheet.sheet))];
  return {fileName,sheets,issues:sheets.length?[]:legacy.issues};
}
/* PATCH O9 */
function O9(files){return files.flatMap(file=>file.sheets.filter(sheet=>sheet.selected&&sheet.selectedScoreKey).flatMap(sheet=>sheet.rows.map(row=>{const value=row.values[sheet.selectedScoreKey]??{score:null,status:'unentered',recognized:false};return {id:row.id,studentId:row.studentId,studentName:row.studentName,grade:row.grade,className:row.className,subject:sheet.subject.trim(),score:value.score,status:value.status,recognized:value.recognized&&!(value.status==='present'&&value.score===null),sourceFile:file.fileName,sourceSheet:sheet.sheet,sourceRow:row.sourceRow,exam:sheet.exam,totalOverride:value.total??null,teacher:row.teacher??'',department:row.department??''};})));}
/* PATCH fde.re */
async function re(){
  if(!o||o.issues.some(issue=>issue.severity==='error')||!o.profiles.length)return;
  if(!await Kj(e,'قبل تحديث قاعدة المعلمين'))return eb.error('تعذر إنشاء نقطة استعادة؛ لم تُعتمد قاعدة المعلمين.');
  try{const next=SR63.mergeTeachers(e,o,D);t(next);r?.();s(null);b({});eb.success('تم تحديث المعلمين مع الحفاظ على معرفاتهم والإسنادات التاريخية.');}catch(error){eb.error(error.message);}
}
/* PATCH fde.se */
async function se(){
  if(!j.length||N.length||F.length||L||I||!C||ne.length&&!x)return;
  if(!await Kj(e,'قبل استيراد النتائج'))return eb.error('تعذر إنشاء نقطة استعادة؛ لم تُعتمد النتائج.');
  try{const next=SR63.commitImport(e,j,M,c,f,m,P,T);t(next);r?.();l([]);_({});S(false);w(false);b({});eb.success('تم اعتماد النتائج وتوثيق القيم السابقة لكل اختبار.');n();}catch(error){eb.error(error.message);}
}
/* PATCH fde.ie */
async function ie(files){
  if(!files.length)return;
  if(files.length>50||files.some(file=>file.size>25000000)||files.reduce((size,file)=>size+file.size,0)>100000000)return eb.error('الحد الأقصى 50 ملفًا، و25 ميجابايت للملف، و100 ميجابايت للدفعة.');
  d('results');A(0);
  try{const parsed=[];for(const [index,file] of files.entries()){parsed.push(ode(await file.arrayBuffer(),file.name,e.settings));A(Math.round((index+1)/files.length*100));await new Promise(resolve=>setTimeout(resolve,0));}
    if(O9(parsed).length>400000)throw new Error('تجاوزت الدفعة 400 ألف نتيجة اختبار.');
    const totals={};for(const file of parsed)for(const sheet of file.sheets){const column=sheet.scoreColumns.find(c=>c.key===sheet.selectedScoreKey);totals[A9(file.fileName,sheet.sheet)]=column?.totalKnown?column.suggestedTotal:tj(e.settings,sheet.exam??f).total;}
    l(parsed);b({});S(false);w(false);_(totals);eb.success(`تم فحص ${files.length} ملف؛ راجع المواد والاختبارات والإجماليات قبل الاعتماد.`);
  }catch(error){eb.error(`تعذر الاستيراد: ${error.message}`);}finally{d('');A(0);}
}
/* PATCH fde.B */
function B(sheetId,patch){l(files=>files.map(file=>({...file,sheets:file.sheets.map(sheet=>sheet.id===sheetId?{...sheet,...patch}:sheet)})));b({});w(false);}
