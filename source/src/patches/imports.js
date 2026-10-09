/* PATCH ide */
function ide(buffer,fileName,settings){
  const book=hv(buffer,{type:`array`}),issues=[],aliases=settings?.importAliases??QA;
  const fields={teacher:aliases.teacher,subject:aliases.subject,department:aliases.department,coordinator:aliases.coordinator,classes:aliases.classes};
  let best=null;
  for(const sheetName of book.SheetNames){
    const matrix=Gv.sheet_to_json(book.Sheets[sheetName],{header:1,raw:true,defval:null,blankrows:true});
    for(let row=0;row<Math.min(20,matrix.length);row++){
      const headers=matrix[row].map(C9),map={};
      headers.forEach((header,index)=>Object.entries(fields).forEach(([key,list])=>{if(map[key]===undefined&&list.some(alias=>w9(alias)===w9(header)))map[key]=index;}));
      const classColumns=headers.map((header,index)=>({header,index,norm:ij(header)})).filter(item=>fields.classes.some(alias=>w9(alias)===w9(item.header))||item.norm.includes('صفشعبهاضافيه')||item.norm.includes('شعبهاضافيه')||item.norm.includes('صفاضافي')).map(item=>item.index);
      if(map.classes!==undefined&&!classColumns.includes(map.classes))classColumns.unshift(map.classes);
      const score=(map.teacher!==undefined?1:0)+(map.subject!==undefined?1:0)+(classColumns.length?1:0)+(map.department!==undefined?.15:0)+(map.coordinator!==undefined?.15:0);
      if(!best||score>best.score)best={sheet:sheetName,matrix,headerRow:row,map,classColumns:[...new Set(classColumns)].sort((a,b)=>a-b),score};
    }
  }
  if(!best||best.map.teacher===undefined||best.map.subject===undefined||!best.classColumns.length)return{fileName,sheet:best?.sheet??``,headerRow:0,profiles:[],assignments:[],issues:[{severity:`error`,row:0,message:`تعذر العثور على أعمدة اسم المعلم والمادة والصفوف/الشعب.`}],headers:[]};
  const {sheet,matrix,headerRow,map,classColumns}=best;
  if(map.department===undefined)issues.push({severity:`warning`,row:headerRow+1,sheet,message:`لا يوجد عمود للقسم؛ ستُستخدم المادة كقسم تلقائيًا.`});
  const profiles=[],assignments=[],firstTeacherBySubject=new Map(),explicitCoordinatorBySubject=new Map(),subjectDisplay=new Map();
  for(let row=headerRow+1;row<matrix.length;row++){
    const source=matrix[row],teacher=C9(source[map.teacher]),subject=C9(source[map.subject]);
    if(!teacher&&!subject)continue;
    if(!teacher){issues.push({severity:`warning`,row:row+1,sheet,message:`تم تجاهل صف بلا اسم معلم.`});continue;}
    const department=map.department===undefined?subject:C9(source[map.department])||subject,rawCoordinator=map.coordinator===undefined?``:C9(source[map.coordinator]);
    const subjectKey=ij(subject);if(subject&&!subjectDisplay.has(subjectKey))subjectDisplay.set(subjectKey,subject);if(subject&&!firstTeacherBySubject.has(subjectKey))firstTeacherBySubject.set(subjectKey,teacher);if(subject&&rawCoordinator&&!explicitCoordinatorBySubject.has(subjectKey))explicitCoordinatorBySubject.set(subjectKey,rawCoordinator);
    const rawClasses=classColumns.flatMap(index=>nde(source[index])),normalized=[...new Set(rawClasses.map(lj).filter(Boolean))],valid=normalized.filter(D9),profileId=`teacher-${row+1}-${w9(teacher).slice(0,40)}`;
    profiles.push({id:profileId,teacher,subject,department,coordinator:rawCoordinator,classes:valid,sourceRow:row+1});
    if(!subject)issues.push({severity:`warning`,row:row+1,sheet,message:`المعلم «${teacher}» بلا مادة ولن يربط تلقائيًا.`});
    if(!valid.length)issues.push({severity:`warning`,row:row+1,sheet,message:`المعلم «${teacher}» بلا صفوف أو شعب مسندة.`});
    normalized.filter(value=>!D9(value)).forEach(value=>issues.push({severity:`warning`,row:row+1,sheet,message:`تجاهلت القيمة «${value}» لأنها ليست صفًا أو شعبة صالحة للمعلم «${teacher}».`}));
    for(const className of valid)assignments.push({id:`assignment-${profileId}-${w9(subject)}-${w9(className)}`,profileId,teacher,subject,department,grade:uj(className),className});
  }
  const subjectCoordinators={};
  for(const [key,display] of subjectDisplay){subjectCoordinators[display]=explicitCoordinatorBySubject.get(key)||firstTeacherBySubject.get(key)||``;}
  for(const profile of profiles)if(profile.subject&&!profile.coordinator)profile.coordinator=subjectCoordinators[subjectDisplay.get(ij(profile.subject))]||firstTeacherBySubject.get(ij(profile.subject))||``;
  const cellMap=new Map();
  for(const assignment of assignments){const key=dj(assignment.subject,assignment.className),names=cellMap.get(key)??new Set();names.add(ij(assignment.teacher));cellMap.set(key,names);}
  for(const [key,names] of cellMap)if(names.size>1)issues.push({severity:`error`,row:0,sheet,message:`يوجد أكثر من معلم لنفس المادة والشعبة: ${key.replace(`|`,` — `)}. صحح الملف قبل الاعتماد.`});
  if(!profiles.length)issues.push({severity:`error`,row:0,sheet,message:`لم يتم العثور على أسماء معلمين صالحة.`});
  if(!assignments.length)issues.push({severity:`warning`,row:0,sheet,message:`لا توجد تكليفات مكتملة للربط الآلي حتى الآن.`});
  return{fileName,sheet,headerRow:headerRow+1,profiles,assignments,subjectCoordinators,issues,headers:matrix[headerRow].map(C9)};
}
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
  try{const next=SR63.commitImport(e,j,M,c,f,m,P,T),batch=next.imports?.[0];t(next);r?.();l([]);_({});S(false);w(false);b({});if(batch?.rows>0)eb.success(`تم اعتماد ${batch.rows} نتيجة: ${batch.created??0} جديدة، ${batch.updated??0} محدثة، ${batch.skipped??0} دون تغيير.`);else eb.info(`لم تُضف نتائج جديدة؛ تم تخطي ${batch?.skipped??0} نتيجة لأنها مطابقة أو سبق رصدها.`);n();}catch(error){eb.error(error.message);}
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
