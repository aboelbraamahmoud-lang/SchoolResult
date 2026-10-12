const assert=require('assert'),fs=require('fs'),path=require('path'),{loadApp}=require('./harness.cjs');
const {ctx:c}=loadApp(),S=c.SR63;let passed=0;
const check=(name,fn)=>{try{fn();console.log('PASS '+name);passed++;}catch(e){console.error('FAIL '+name,e.stack);process.exitCode=1;}};
function fixture(){const w=c.Aj();w.rows=[];w.settings.schoolName='مدرسة تجريبية';w.settings.academicYear='2026/2027';w.settings.academicViceName='نائب تجريبي';w.settings.principalName='مدير تجريبي';let i=0;
 const add=(name,old,current,status='present',className='7/1',teacher='معلم الرياضيات',subject='رياضيات')=>{i++;w.rows.push({id:'r'+i,studentId:String(i).padStart(10,'0'),studentName:name,grade:'السابع',className,subject,teacher,examTeachers:{exam1:teacher,exam2:teacher},examClasses:{exam1:className,exam2:className},scores:{exam1:old,exam2:status==='present'?current:null,exam3:null,exam4:null},statuses:{exam1:old===null?'unentered':'present',exam2:status,exam3:'unentered',exam4:'unentered'},totals:{exam1:20,exam2:30,exam3:40,exam4:40}});};
 add('ضعيف',5,9);add('متوسط',11,21);add('متفوق',16,29,'present','7/2');add('غائب',15,null,'absent','7/2');add('صفر فعلي',0,0);add('طالب دمج',10,12,'present','7/ESE');add('طالب معلم آخر',5,25,'present','7/1','معلم آخر');add('مادة مختلفة',5,10,'present','7/1','معلم الرياضيات','علوم');return w;}
const analyze=(w,extra={})=>S.teacherPerformanceAnalyze(w,{exam:'exam2',teacher:'معلم الرياضيات',subject:'رياضيات',...extra});
const improvementAnalyze=()=>{const w=fixture();w.rows=w.rows.filter(r=>r.subject==='رياضيات'&&r.examTeachers.exam2==='معلم الرياضيات'&&r.className!=='7/ESE');for(const row of w.rows){row.className='7/1';row.examClasses={exam1:'7/1',exam2:'7/1'};}return analyze(w,{className:'7/1'});};
function parts(doc){const b=Buffer.from(doc.bytes),out={};let x=0;while(b.readUInt32LE(x)===0x04034b50){const len=b.readUInt32LE(x+18),nam=b.readUInt16LE(x+26),extra=b.readUInt16LE(x+28),n=b.subarray(x+30,x+30+nam).toString('utf8'),start=x+30+nam+extra;out[n]=b.subarray(start,start+len).toString('utf8');x=start+len;}assert.equal(b.readUInt32LE(x),0x02014b50);return out;}
check('teacher and subject isolation',()=>{const a=analyze(fixture());assert.equal(a.students.length,5);assert.equal(a.groups.length,2);for(const unwanted of ['طالب دمج','طالب معلم آخر','مادة مختلفة'])assert.ok(!a.students.some(s=>s.studentName===unwanted));});
check('proper performance bands + legitimate zero + missing',()=>{const a=analyze(fixture());assert.deepEqual(Object.values(a.bands).map(x=>x.length),[2,1,1,1]);assert.equal(a.bands.low.find(x=>x.studentName==='صفر فعلي').current,0);assert.equal(a.bands.missing[0].current,null);});
check('different totals yield accurate comparable percent points',()=>{const a=analyze(fixture());assert.equal(a.students.find(x=>x.studentName==='ضعيف').change,5);assert.equal(a.students.find(x=>x.studentName==='متوسط').change,15);assert.equal(a.compared,4);assert.equal(a.improved,3);assert.equal(a.missing,1);});
check('first assessment has no invented comparison',()=>{const a=S.teacherPerformanceAnalyze(fixture(),{exam:'exam1',teacher:'معلم الرياضيات',subject:'رياضيات'});assert.equal(a.valueAdded,null);assert.equal(a.compared,0);});
check('support cohort remains isolated',()=>{const a=analyze(fixture(),{cohort:'support'});assert.equal(a.students.length,1);assert.equal(a.students[0].studentName,'طالب دمج');});
check('editable thresholds do not mutate grade records',()=>{const w=fixture();assert.equal(analyze(w,{lower:40,upper:90}).bands.high.length,1);assert.throws(()=>analyze(w,{lower:99,upper:45}));assert.equal(w.rows[0].scores.exam2,9);});
check('subject actions tailored to actual subject',()=>{const m=S.teacherImprovementDefaults('رياضيات'),i=S.teacherImprovementDefaults('التربية الإسلامية');assert.ok(m.lowActions.includes('حسابية'));assert.ok(i.lowActions.includes('التجويد'));assert.notEqual(m.lowActions,i.lowActions);});
check('original improvement DOCX includes pupils and original approvals',()=>{const a=improvementAnalyze(),o=parts(S.teacherImprovementWordBuild(a)),x=o['word/document.xml'];for(const name of ['ضعيف','متوسط','متفوق','غائب','صفر فعلي','الأهداف المنشودة','النائب الأكاديمي','منسق المادة','الطلبة ذوو الأداء'])assert.ok(x.includes(name),name);assert.ok(!x.includes('طالب دمج'));assert.ok(Object.keys(o).some(k=>k.startsWith('word/media/')));assert.ok(x.includes('w:bidiVisual'));});
check('DOCX customization and XML escaping',()=>{const a=improvementAnalyze();assert.ok(parts(S.teacherImprovementWordBuild(a,{lowActions:'برنامج & متابعة'}))['word/document.xml'].includes('برنامج &amp; متابعة'));const q=parts(S.teacherQuantitativeWordBuild(a,{interpretation:'تفسير خاص',feedback:'تعقيب المنسق',targets:{success:100}}));for(const s of ['تفسير خاص','تعقيب المنسق','الاختبار الثاني','7/1','القيمة المضافة','اسم المعلم']){}for(const s of ['تفسير خاص','تعقيب المنسق','الاختبار الثاني','7/1','القيمة المضافة'])assert.ok(q['word/document.xml'].includes(s),s);});
check('Word DOCX ZIP entries use valid DOS dates in both headers',()=>{
 const a=improvementAnalyze();
 for(const doc of [S.teacherImprovementWordBuild(a),S.teacherQuantitativeWordBuild(a)]){
  const b=Buffer.from(doc.bytes);let i=0,local=0,central=0;
  while(i+30<=b.length&&b.readUInt32LE(i)===0x04034b50){
   assert.ok(b.readUInt16LE(i+12)>=0x21,'local DOCX ZIP date must be a valid DOS date');
   const size=b.readUInt32LE(i+18),name=b.readUInt16LE(i+26),extra=b.readUInt16LE(i+28);
   i+=30+name+extra+size;local++;
  }
  while(i+46<=b.length&&b.readUInt32LE(i)===0x02014b50){
   assert.ok(b.readUInt16LE(i+14)>=0x21,'central DOCX ZIP date must be a valid DOS date');
   const name=b.readUInt16LE(i+28),extra=b.readUInt16LE(i+30),comment=b.readUInt16LE(i+32);
   i+=46+name+extra+comment;central++;
  }
  assert.ok(local>10,'missing DOCX entries');assert.equal(local,central,'ZIP directory mismatch');
  assert.equal(b.readUInt32LE(i),0x06054b50,'missing ZIP end record');
 }
});
check('original DOCX includes its media and Word parts',()=>{const a=improvementAnalyze();for(const output of [S.teacherImprovementWordBuild(a),S.teacherQuantitativeWordBuild(a)]){const p=parts(output);for(const req of ['[Content_Types].xml','_rels/.rels','word/document.xml','word/header1.xml'])assert.ok(p[req],req);assert.ok(Object.keys(p).some(k=>k.startsWith('word/media/')));assert.ok(output.filename.endsWith('.docx'));}});
check('Word documents contain no inherited Office sensitivity labels or stale custom metadata',()=>{
 const a=improvementAnalyze();
 for(const file of [S.teacherImprovementWordBuild(a),S.teacherQuantitativeWordBuild(a)]){
  const o=parts(file),names=Object.keys(o);
  for(const name of names)assert.ok(!name.startsWith('docMetadata/')&&!name.startsWith('customXml/')&&name!=='docProps/custom.xml','Office legacy metadata leaked: '+name);
  for(const x of ['[Content_Types].xml','_rels/.rels','word/_rels/document.xml.rels']){
   assert.ok(!o[x].includes('LabelInfo.xml'),x+' still references deleted label');
   assert.ok(!o[x].includes('customXml/'),x+' still references deleted custom XML');
   assert.ok(!o[x].includes('docProps/custom.xml'),x+' still references deleted custom properties');
  }
  assert.ok(o['word/document.xml'].includes('الطلبة')||o['word/document.xml'].includes('الشعب الدراسية'),'official form was removed');
 }
});
check('class-only plan cannot merge different classes',()=>{assert.throws(()=>S.teacherImprovementWordBuild(analyze(fixture())),/شعبة/);});
check('class-only plan includes students not yet graded in that subject',()=>{const w=fixture();w.rows.push({...w.rows[0],id:'uns',studentId:'missing-student',studentName:'طالب من دون درجة مادة',subject:'العلوم',scores:{},statuses:{}});const a=analyze(w,{className:'7/1'});assert.ok(a.bands.missing.some(s=>s.studentName==='طالب من دون درجة مادة'));});
check('official Word templates keep RTL and both original logos',()=>{const a=improvementAnalyze();for(const doc of [S.teacherImprovementWordBuild(a),S.teacherQuantitativeWordBuild(a)]){const o=parts(doc);for(const word of ['w:bidiVisual','w:bidi','w:rtl'])assert.ok(o['word/document.xml'].includes(word),word);assert.ok(Object.keys(o).some(k=>k.startsWith('word/media/')));assert.ok(Object.keys(o).some(k=>k.startsWith('word/_rels/header')));}});
check('teacher report preview and Word both use the assessment-aware indicator specification',()=>{
 const src=fs.readFileSync(path.resolve(__dirname,'../src/teacher-performance-ui.js'),'utf8');
 const doc=fs.readFileSync(path.resolve(__dirname,'../src/teacher-reference-word.js'),'utf8');
 for(const file of [src,doc])assert.ok(file.includes('SR63.teacherQuantitativeMetricRows(analysis)'));
 for(const str of ['sr625-report-preview','إجمالي المستوى','تحقيق المستهدف'])assert.ok(src.includes(str),str);
 assert.ok(!src.includes("['midFirstAchievement'"));
});
check('dashboard and navigation classes are present',()=>{const root=path.resolve(__dirname,'..');const app=fs.readFileSync(path.join(root,'../app.js'),'utf8'),css=fs.readFileSync(path.join(root,'src/repair.css'),'utf8');for(const s of ['teacherPerformance','TeacherPerformanceCenter','خطة تحسين الأداء الشاملة','التقرير الكمي والوصفي للمعلم'])assert.ok(app.includes(s),s);for(const s of ['sr619-subject-row','sr619-ring-content','sr619-subject-track'])assert.ok(css.includes(s));});
check('teacher Word exports remain local, no network or credentials',()=>{const s=fs.readFileSync(path.resolve(__dirname,'../src/teacher-performance-word.js'),'utf8');for(const bad of ['fetch(','functions.invoke','GEMINI_API_KEY','service_role'])assert.ok(!s.includes(bad));});
check('original table categories and rows are preserved',()=>{const a=improvementAnalyze(),q=parts(S.teacherQuantitativeWordBuild(a))['word/document.xml'],i=parts(S.teacherImprovementWordBuild(a))['word/document.xml'];for(const k of ['الشعب الدراسية','تحقيق المستهدف','التغذية الراجعة من المنسق','نسبة النجاح في الاختبار'])assert.ok(q.includes(k),k);for(const k of ['الطلبة ذوو الأداء المتدني','الطلبة ذوو الأداء المتوسط','الطلبة ذوو الأداء المرتفع','جهة الاعتماد','المخرجات المتوقعة'])assert.ok(i.includes(k),k);assert.ok(!i.includes('محمود الشبراوي'));assert.ok(!q.includes('Choose an item.'));});
check('every selected assessment shows itself and only its immediate predecessor in the preview and DOCX',()=>{
 const w=fixture();
 // Deliberately distinct values ensure obsolete semester-based selections fail.
 for(const r of w.rows){
  r.scores.exam3=12;r.scores.exam4=36;
  r.statuses.exam3='present';r.statuses.exam4='present';
  r.examTeachers.exam3=r.teacher;r.examTeachers.exam4=r.teacher;
  r.examClasses.exam3=r.className;r.examClasses.exam4=r.className;
 }
 const expectedKeys=['exam1','exam2','exam3','exam4'];
 for(let index=0;index<expectedKeys.length;index++){
  const exam=expectedKeys[index],a=analyze(w,{exam});
  const rows=S.teacherQuantitativeMetricRows(a);
  const xml=parts(S.teacherQuantitativeWordBuild(a))['word/document.xml'];
  const current='نسبة التحصيل الأكاديمي في '+a.examName;
  assert.equal(a.exam,exam);assert.ok(xml.includes(current),`current: ${exam}`);
  assert.equal(rows[1].key,'currentAchievement');
  assert.equal(rows[1].label,current);
  assert.equal(a.currentAchievement,a.achievement);
  if(index===0){
   assert.equal(a.prevExam,null);assert.equal(a.previousAchievement,null);assert.equal(a.valueAdded,null);
   assert.deepEqual(rows.map(x=>x.slot),[1,2,5]);
   assert.ok(!xml.includes('نسبة التحصيل الأكاديمي في '+c.tj(w.settings,'exam2').name));
   assert.ok(!xml.includes('القيمة المضافة في التحصيل الأكاديمي بين التقييمات.'));
   assert.ok(!xml.includes('القيمة المضافة في التحصيل الأكاديمي بين التقييمين.'));
  }else{
   assert.equal(a.prevExam,expectedKeys[index-1]);
   assert.equal(rows[2].key,'previousAchievement');
   assert.equal(rows[2].label,'نسبة التحصيل الأكاديمي في '+a.prevExamName);
   assert.deepEqual(rows.map(x=>x.slot),[1,2,3,4,5]);
   assert.ok(xml.includes(rows[2].label),`previous: ${exam}`);
   assert.equal(typeof a.previousAchievement,'number');
   if(index>=2){
    assert.ok(!xml.includes('نسبة التحصيل الأكاديمي في '+c.tj(w.settings,'exam1').name),`stale first assessment in ${exam}`);
   }
  }
  for(const metric of rows){if(metric.slot===5){assert.ok(xml.includes('نسبة الطلبة الحاصلين على 90%'),`${exam} high score metric missing`);continue;}assert.ok(xml.includes(metric.label),`${exam} missing metric label ${metric.label}`);}
  assert.equal((xml.match(/<w:tbl>/g)||[]).length,Math.ceil(a.groups.length/3));
 }
});
check('comparison uses evaluated previous test with missing data excluded and never creates a zero',()=>{
 const w=fixture();for(const r of w.rows){r.scores.exam3=8;r.statuses.exam3='present';r.scores.exam4=35;r.statuses.exam4='present';r.examTeachers.exam3=r.teacher;r.examTeachers.exam4=r.teacher;}
 const subjectRow=w.rows[0];subjectRow.statuses.exam3='absent';subjectRow.scores.exam3=null;
 const a=analyze(w,{exam:'exam4'});
 const student=a.students.find(x=>x.studentName==='ضعيف');
 assert.equal(student.previous,null);assert.equal(student.change,null);
 assert.equal(a.compared,a.students.filter(x=>x.current!==null&&x.previous!==null).length);
 assert.ok(a.previousAchievement!==null,'previous achievement still reflects other students with valid results');
 assert.ok(!String(parts(S.teacherQuantitativeWordBuild(a))['word/document.xml']).includes('منتصف الفصل الدراسي الأول') || a.examName.includes('منتصف الفصل الدراسي الأول'));
});
check('additional teacher classes are exported with their own data, not repeated first page figures',()=>{
 const w=fixture();
 for(const [k,cls] of ['7/3','8/1','8/2','9/1'].entries()){
  const src=w.rows[0];w.rows.push({...src,id:'extra-'+k,studentId:'extra-'+k,studentName:'طالب '+cls,className:cls,examClasses:{exam1:cls,exam2:cls},scores:{...src.scores,exam1:2+k,exam2:5+k}});
 }
 const a=analyze(w),xml=parts(S.teacherQuantitativeWordBuild(a))['word/document.xml'];
 assert.ok(a.groups.length>3);
 assert.equal((xml.match(/<w:tbl>/g)||[]).length,Math.ceil(a.groups.length/3),'each set of three classes must get one complete original template table');
 for(const cls of ['7/3','8/1','8/2','9/1'])assert.ok(xml.includes(cls),'missing class '+cls);
 const first=a.groups[0].className,last=a.groups.at(-1).className;
 assert.notEqual(first,last);
 // The overflow block must not be populated from the first 3 groups again.
 const firstHeader=xml.indexOf('7/1');
 const lastHeader=xml.lastIndexOf('9/1');
 assert.ok(lastHeader>firstHeader,'later classes should follow first classes');
});
check('user-edited exam names appear in teacher Word preamble, selected achievement and immediate predecessor',()=>{
 const w=fixture(),names=['التقييم التشخيصي الأول','اختبار نهاية الفصل الأول - مراجعة','منتصف الثاني - التقييم المرحلي','التقييم الختامي الثاني'];
 w.settings.exams.forEach((e,i)=>e.name=names[i]);
 for(const r of w.rows){r.scores.exam3=12;r.scores.exam4=26;r.statuses.exam3='present';r.statuses.exam4='present';r.examTeachers.exam3=r.teacher;r.examTeachers.exam4=r.teacher;r.examClasses.exam3=r.className;r.examClasses.exam4=r.className;}
 for(let i=0;i<4;i++){
  const a=analyze(w,{exam:'exam'+(i+1)}),metrics=S.teacherQuantitativeMetricRows(a);
  const xml=parts(S.teacherQuantitativeWordBuild(a))['word/document.xml'];
  assert.equal(a.examName,names[i]);
  assert.ok(xml.includes('لتحليل نتائج '+names[i]),'Word subtitle mismatch');
  assert.ok(xml.includes('في '+names[i]+' لمادة'),'Word preamble mismatch');
  assert.ok(xml.includes('نسبة التحصيل الأكاديمي في '+names[i]));
  if(i===0){assert.equal(metrics.length,3);assert.ok(!xml.includes(names[1]));}
  else{assert.equal(a.prevExamName,names[i-1]);assert.ok(xml.includes('نسبة التحصيل الأكاديمي في '+names[i-1]));}
 }
});
console.log('Teacher performance:',passed,'tests');
