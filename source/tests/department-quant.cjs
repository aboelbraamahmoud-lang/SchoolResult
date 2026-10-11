const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{loadApp}=require('./harness.cjs');
const {ctx:c}=loadApp(),S=c.SR63;let passed=0;
const check=(name,fn)=>{try{fn();passed++;console.log('PASS',name);}catch(error){console.error('FAIL',name,error.stack);process.exitCode=1;}};
const fixture=()=>{
 const w=c.Aj();w.rows=[];w.settings.schoolName='مدرسة المرحلة الإعدادية التجريبية';w.settings.academicYear='2026/2027';w.settings.academicViceName='أ. نائب المدير';
 const insert=(name,grade,klass,teacher,subject,exam1,exam2,status='present',id=null)=>{
  const sn=String(name);w.rows.push({id:'r'+w.rows.length,studentId:id||'sid_'+(w.rows.length+1),studentName:sn,grade,className:klass,subject,teacher,
   examTeachers:{exam1:teacher,exam2:teacher},examClasses:{exam1:klass,exam2:klass},
   examGrades:{exam1:grade,exam2:grade},scores:{exam1,exam2},totals:{exam1:20,exam2:30},statuses:{exam1:'present',exam2:status}});
 };
 insert('طالب سابع أ','السابع','7/1','المعلم أ','الرياضيات',10,24); // 50% -> 80%
 insert('طالب سابع ب','السابع','7/2','المعلم ب','الرياضيات',20,30); // 100% -> 100%
 insert('طالب ثامن أ','الثامن','8/1','المعلم ج','الرياضيات',10,15); // 50% -> 50%
 insert('طالب تاسع أ','التاسع','9/1','المعلم د','الرياضيات',14,27); // 70% -> 90%
 insert('طالب تاسع غائب','التاسع','9/2','المعلم د','الرياضيات',10,null,'absent');
 insert('طالب مادة أخرى','الثامن','8/1','المعلم د','اللغة العربية',10,30);
 insert('طالب دمج','السابع','07/ESE','المعلم أ','الرياضيات',5,12);
 return w;
};
const an=(w=fixture(),opts={})=>S.departmentPerformanceAnalyze(w,{exam:'exam2',subject:'الرياضيات',...opts});
const zipParts=doc=>{const b=Buffer.from(doc.bytes);let offset=0;const files={};while(offset+30<b.length&&b.readUInt32LE(offset)===0x04034b50){
 const length=b.readUInt32LE(offset+18),n=b.readUInt16LE(offset+26),e=b.readUInt16LE(offset+28),start=offset+30+n+e;
 const name=b.subarray(offset+30,offset+30+n).toString('utf8');files[name]=b.subarray(start,start+length);
 offset=start+length;
 }return files;};
check('subject and department combine all teachers and three secondary grades',()=>{
 const a=an();assert.equal(a.studentCount,5);assert.equal(a.grades['7'].studentCount,2);assert.equal(a.grades['8'].studentCount,1);assert.equal(a.grades['9'].studentCount,2);
 assert.equal(a.grades['7'].classes.length,2);assert.ok(a.departmentName);
});
check('aggregate success and achievement count the pupil only once',()=>{
 const a=an();assert.equal(a.evaluated,4);assert.equal(a.ungraded,1);assert.equal(a.success,100);
 assert.equal(a.achievement,80);assert.equal(a.high90,50);assert.equal(a.compared,4);assert.equal(a.valueAdded,12.5);
});
check('genuine absence is excluded, never entered as zero',()=>{const a=an();assert.equal(a.grades['9'].evaluated,1);assert.equal(a.grades['9'].achievement,90);});
check('disabled support mixing and can separately select merged ESE',()=>{const a=an(fixture(),{cohort:'support'});assert.equal(a.studentCount,1);assert.equal(a.evaluated,1);});
check('duplicate teacher result rows do not duplicate a student',()=>{const w=fixture();w.rows.push({...w.rows[0],id:'duplicate',teacher:'المعلم الآخر'});assert.equal(an(w).studentCount,5);});
check('first exam cannot invent a previous value added',()=>{const a=an(fixture(),{exam:'exam1'});assert.equal(a.valueAdded,null);assert.equal(a.compared,0);});
check('correctly derives grade from grade field or class label',()=>{assert.equal(S.departmentGradeKey({grade:'',className:'09/4'},'exam2'),'9');assert.equal(S.departmentGradeKey({grade:'الثامن',className:'8/1'},'exam2'),'8');});
check('subject selector lists distinct departments, not teacher repetitions',()=>{const names=S.departmentPerformanceChoices(fixture(),'exam2');assert.equal(names.length,2);});
check('Word retains exact model sections, original ornament, ministry picture and RTL',()=>{
 const parts=zipParts(S.departmentQuantWordBuild(an())),doc=parts['word/document.xml'].toString('utf8');
 for(const marker of ['السابع','الثامن','التاسع','نسبة النجاح في الاختبار','نسبة التحصيل الأكاديمي','القيمة المضافة','تفسير النتائج','التغذية الراجعة','توجيهات مهمة','المنسق','w:bidiVisual'])assert.ok(doc.includes(marker),marker);
 for(const filepath of ['word/header1.xml','word/header2.xml','word/footer1.xml','word/footer2.xml','word/media/image1.png','word/media/image2.png'])assert.ok(parts[filepath],filepath);
 assert.ok(!doc.includes('Choose an item'),'the form dropdown cannot remain');
 assert.ok(!doc.includes('{{'),'all template tokens filled');
});
check('Word injects school, name of assessment, targets and department feedback safely',()=>{
 const parts=zipParts(S.departmentQuantWordBuild(an(),{targets:{success:90,achievement:90,valueAdded:15,high90:30},interpretation:'تفسير & تعقيب',feedback:'توقيع النائب <اعتماد>'})),x=parts['word/document.xml'].toString('utf8');
 for(const t of ['مدرسة المرحلة الإعدادية التجريبية','أ. نائب المدير','إجمالي القسم','تفسير &amp; تعقيب','توقيع النائب &lt;اعتماد&gt;','غير متحقق','متحقق'])assert.ok(x.includes(t),t);
});
check('unprovided operational targets are not fabricated',()=>{const x=zipParts(S.departmentQuantWordBuild(an()))['word/document.xml'].toString('utf8');assert.equal((x.match(/غير محدد/g)||[]).length,4);});
check('Word export leaves student names out of department aggregation',()=>{const x=zipParts(S.departmentQuantWordBuild(an()))['word/document.xml'].toString('utf8');assert.ok(!x.includes('طالب سابع أ'));});
check('UI and Word export remain local; no secret or network access',()=>{const root=path.resolve(__dirname,'..'),code=fs.readFileSync(path.join(root,'src/teacher-department-template.js'),'utf8'),app=fs.readFileSync(path.join(root,'../app.js'),'utf8');for(const bad of ['GEMINI_API_KEY','service_role','fetch('])assert.ok(!code.includes(bad),bad);assert.ok(app.includes('departmentQuant'));});
console.log('Department quantitative',passed,'/13');

if(process.env.SR_SAMPLE){const a=an();const output=S.departmentQuantWordBuild(a,{targets:{success:90,achievement:75,valueAdded:3,high90:30},feedback:'تُراجع النتائج من نائب المدير للشؤون الأكاديمية وتُعتمد الإجراءات المناسبة.'});fs.writeFileSync('/mnt/data/SchoolResult_v6.10.21_Department_Quantitative_Sample.docx',Buffer.from(output.bytes));console.log('SAMPLE_WRITTEN');}
