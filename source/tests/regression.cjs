const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{loadApp}=require('./harness.cjs');
const app=loadApp(),c=app.ctx,results=[],noop=()=>{},clone=structuredClone;
const same=(a,b)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
async function test(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS '+name);}catch(error){results.push({name,status:'fail',error:error.stack});console.error('FAIL '+name+'\n'+error.message);}}
function row(id='S-1',subject='العلوم'){return {id:id+'-'+subject,studentId:id,studentName:'طالب '+id,className:'7/1',grade:'السابع',subject,department:subject,teacher:'معلم أ',scores:{exam1:10,exam2:24,exam3:null,exam4:null},statuses:{exam1:'present',exam2:'present',exam3:'unentered',exam4:'unentered'},totals:{exam1:20,exam2:30,exam3:30,exam4:40},examClasses:{exam1:'7/1',exam2:'7/1',exam3:'7/1',exam4:'7/1'},examTeachers:{exam1:'معلم أ',exam2:'معلم أ',exam3:'معلم أ',exam4:'معلم أ'},importBatches:{exam1:'B1',exam2:'B2',exam3:null,exam4:null}};}
function workspace(rows=[row()]){const w=c.Aj();w.rows=rows;w.teachers=[{id:'P1',teacher:'معلم أ',subject:'العلوم',department:'العلوم',coordinator:'منسق أ',classes:['7/1','7/2']}];w.teacherAssignments=[{id:'A1',profileId:'P1',teacher:'معلم أ',subject:'العلوم',department:'العلوم',grade:'السابع',className:'7/1'}];return w;}
function item(extra={}){return {studentId:'S-1',studentName:'طالب S-1',className:'7/1',grade:'السابع',subject:'العلوم',score:10,status:'present',recognized:true,sourceFile:'test.xlsx',sourceSheet:'العلوم',...extra};}
function commit(w,items,policy='replace',files=[{fileName:'test.xlsx',issues:[],sheets:[]}]){const links=c.lde(items,w.teachers,w.teacherAssignments);for(const link of links)if(!link.selectedProfileId)link.selectedProfileId='P1';return c.SR63.commitImport(w,items,links,files,'exam1',20,i=>i.totalOverride??c.tj(w.settings,i.exam??'exam1').total,policy);}
function diskAdapter(initial=null){
 const disk={workspace:clone(initial),snapshots:new Map(),failWrite:false,failRead:false,localFail:false},local=new Map();let clock=0;
 const storage={getItem:k=>local.get(k)??null,setItem:(k,v)=>{if(disk.localFail)throw Error('Quota');local.set(k,v);},removeItem:k=>local.delete(k)};
 const open=async()=>({close:noop,transaction:(name,mode)=>{
   const tx={error:null},changes=[];let scheduled=false,aborted=false;
   const finish=()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{if(aborted)return;if(disk.failWrite&&mode==='readwrite'){tx.error=Error('Disk unavailable');tx.onerror?.();return;}for(const action of changes)action();tx.oncomplete?.();});};
   const request=callback=>{const req={};queueMicrotask(()=>{if(disk.failRead){req.error=Error('Read failure');req.onerror?.();return;}req.result=clone(callback());req.onsuccess?.();});return req;};
   tx.abort=()=>{aborted=true;queueMicrotask(()=>tx.onabort?.());};
   tx.objectStore=()=>({get:()=>request(()=>disk.workspace),getAll:()=>request(()=>[...disk.snapshots.values()]),put:(value,key)=>{changes.push(()=>{if(name===c.Hj){const point=clone(value);if(!disk.snapshots.has(point.id))point.at=new Date(Date.UTC(2030,0,1,0,0,clock++)).toISOString();disk.snapshots.set(point.id,point);}else disk.workspace=clone(value);});finish();},delete:key=>{changes.push(()=>disk.snapshots.delete(key));finish();}});return tx;
 }});
 return {disk,local,attach(ctx){ctx.Gj=open;ctx.localStorage=storage;ctx.indexedDB={};}};
}
async function main(){
 await test('قبول البيانات التجريبية والقاعدة الفارغة',()=>{assert.equal(c.LN(c.zj()).workspace.rows.length,810);assert.equal(c.LN(c.Aj()).workspace.rows.length,0);});
 await test('الصفر درجة صحيحة والغياب مستبعد من النسب',()=>{const a=row(),b=row('S-2'),d=row('S-3');a.scores.exam1=0;d.scores.exam1=null;d.statuses.exam1='absent';const m=c.bj([a,b,d],'exam1',c.ej);same([m.evaluated,m.passed,m.failed,m.absent,m.success,m.achievement],[2,1,1,1,50,25]);});
 await test('مسافات فقط لا تتحول إلى صفر',()=>assert.equal(c.T9('  \u200f  '),null));
 await test('قراءة الأرقام العربية والفارسية والفاصلة العشرية',()=>same(['١٢٫٥','۱۲٫۵','12,5','٠','١٬٢٣٤٫٥'].map(c.T9),[12.5,12.5,12.5,0,1234.5]));
 await test('رفض الأرقام غير المنتهية والقيم غير الرقمية',()=>same([NaN,Infinity,'12a',false,{},'1,2,3'].map(c.T9),[null,null,null,null,null,null]));
 await test('حدود مستويات الأداء متصلة دون تداخل',()=>same([0,50,60,70,80,90,100].map(p=>c.yj(p,c.ej.bands).id),['very_weak','weak','acceptable','good','very_good','excellent','excellent']));
 await test('تطبيع أسماء الشعب العربية',()=>same(['السابع أ','٧/أ','7/1'].map(c.lj),['7/1','7/1','7/1']));
 await test('تمييز الطلاب الفريدين عن نتائج المواد',()=>{const m=c.bj([row(),row('S-1','الرياضيات')],'exam1',c.ej);same([m.students,m.rows,m.evaluated],[1,2,2]);});
 await test('هوية الطالب ثابتة رغم فروق المسافات وصيغة الشعبة',()=>{const a=c.SR63.stableStudentId('  أحمد  محمد\u200f ','07/1'),b=c.SR63.stableStudentId('أحمد محمد','7/1');assert.equal(a,b);});
 await test('إجمالي الطلاب لا يتضخم عند وجود تسع مواد لكل طالب',()=>{const subjects=['شرعية','عربي','E','رياضيات','علوم','اجتماعية','حاسب','فنية','بدنية'],rows=[];for(let i=1;i<=150;i++)for(const subject of subjects){const r=row(c.SR63.stableStudentId(`طالب رقم ${i}`,i<=17?'7/1':i<=34?'7/2':i<=51?'7/3':i<=68?'7/4':i<=85?'7/5':i<=102?'7/6':i<=119?'7/7':i<=136?'7/8':'7/9'),subject);r.studentName=`طالب رقم ${i}`;r.className=i<=17?'7/1':i<=34?'7/2':i<=51?'7/3':i<=68?'7/4':i<=85?'7/5':i<=102?'7/6':i<=119?'7/7':i<=136?'7/8':'7/9';for(const exam of c.XA)r.examClasses[exam]=r.className;rows.push(r);}const m=c.bj(rows,'exam1',c.ej);same([m.students,m.rows,m.evaluated],[150,1350,1350]);assert.equal(c.SR63.studentRegistry({rows},'exam1').length,150);});
 await test('ترحيل البيانات القديمة يوحد المعرفات التلقائية لنفس الطالب عبر المواد',()=>{const subjects=['شرعية','عربي','علوم','رياضيات'],rows=subjects.map((subject,j)=>{const r=row(`auto-student-old-${j}`,subject);r.studentName='محمد أحمد علي';r.className=j%2?'07/1':'7/1';for(const exam of c.XA)r.examClasses[exam]=r.className;return r;}),w=workspace(rows),m=c.SR63.migrateLocal(w);assert.ok(m.studentRepairs>0);assert.equal(new Set(m.workspace.rows.map(r=>r.studentId)).size,1);assert.equal(c.bj(m.workspace.rows,'exam1',m.workspace.settings).students,1);assert.equal(m.workspace.students.length,1);});
 await test('لا يدمج طالبين متطابقي الاسم والشعبة إذا اختلف الرقم الأكاديمي',()=>{const a=row('1001','العلوم'),b=row('2002','الرياضيات');a.studentName=b.studentName='محمد أحمد';a.className=b.className='7/1';for(const exam of c.XA){a.examClasses[exam]='7/1';b.examClasses[exam]='7/1';}const fixed=c.SR63.reconcileStudentRows([a,b]);assert.equal(new Set(fixed.map(r=>r.studentId)).size,2);const w=workspace(fixed),quality=c.RN(w,'exam1');assert.ok(quality.issues.some(x=>x.id==='identity-collision'&&x.severity==='critical'));});
 await test('استيراد مادة جديدة يعيد استخدام هوية الطالب الموجودة ولا ينشئ طالبا جديدا',()=>{let w=c.Aj();w.teachers=[{id:'P1',teacher:'معلم علوم',subject:'علوم',department:'علوم',classes:['7/1']},{id:'P2',teacher:'معلم رياضيات',subject:'رياضيات',department:'رياضيات',classes:['7/1']}];w.teacherAssignments=[{id:'A1',profileId:'P1',teacher:'معلم علوم',subject:'علوم',department:'علوم',className:'7/1',active:true},{id:'A2',profileId:'P2',teacher:'معلم رياضيات',subject:'رياضيات',department:'رياضيات',className:'7/1',active:true}];const first={studentId:'legacy-file-1',studentName:'طالب موحد',className:'07/1',grade:'السابع',subject:'علوم',score:15,status:'present',recognized:true,sourceFile:'علوم.xlsx',sourceSheet:'علوم'},second={studentId:'legacy-file-2',studentName:'طالب موحد',className:'7/1',grade:'السابع',subject:'رياضيات',score:18,status:'present',recognized:true,sourceFile:'رياضيات.xlsx',sourceSheet:'رياضيات'};let links=c.lde([first],w.teachers,w.teacherAssignments);w=c.SR63.commitImport(w,[first],links,[{fileName:'علوم.xlsx',issues:[],sheets:[]}],'exam1',20,()=>20,'replace');links=c.lde([second],w.teachers,w.teacherAssignments);w=c.SR63.commitImport(w,[second],links,[{fileName:'رياضيات.xlsx',issues:[],sheets:[]}],'exam1',20,()=>20,'replace');assert.equal(w.rows.length,2);assert.equal(new Set(w.rows.map(r=>r.studentId)).size,1);assert.equal(c.bj(w.rows,'exam1',w.settings).students,1);assert.equal(c.SR63.studentRegistry(w,'exam1').length,1);});
 await test('ترحيل الهيكل الأكاديمي من بيانات 6.7 تلقائيًا',()=>{const w=workspace(),m=c.kj(w);assert.equal(m.version,7);same([m.grades.length,m.classes.length,m.subjects.length],[1,2,1]);assert.ok(m.teachers[0].teacherId);assert.ok(m.teacherAssignments[0].classId&&m.teacherAssignments[0].subjectId);});
 await test('منسق المادة ينتقل إلى سجل المادة ويظهر من مرجع واحد',()=>{const w=workspace(),m=c.kj(w);assert.equal(c.SR63.subjectCoordinator(m,'العلوم'),'منسق أ');m.subjects[0].coordinatorName='منسق العلوم';m.subjects[0].coordinatorId='';assert.equal(c.SR63.subjectCoordinator(m,'العلوم'),'منسق العلوم');});
 await test('خريطة منسقي المواد تعكس قاعدة المواد السحابية',()=>{const w=c.kj(workspace());w.subjects[0].coordinatorName='منسق العلوم';const map=c.SR63.subjectCoordinatorMap(w);assert.equal(map['العلوم'],'منسق العلوم');});
 await test('ملف النتيجة بلا اسم معلم يرتبط من المادة والشعبة',()=>{const w=workspace(),i=item({teacher:''}),links=c.lde([i],w.teachers,w.teacherAssignments);same([links[0].status,links[0].selectedProfileId],['matched','P1']);const n=c.SR63.commitImport(w,[i],links,[{fileName:'no-teacher.xlsx',issues:[],sheets:[]}],'exam1',20,()=>20,'replace');assert.equal(c.mj(n.rows[0],'exam1'),'معلم أ');});
 await test('تغيير خريطة التكليف يستبدل المعلم دون تكرار الخلية',()=>{const w=c.kj(workspace()),p2={...w.teachers[0],id:'P2',teacherId:'T-002',teacher:'معلم ب'},base={...w,teachers:[...w.teachers,p2]},cls=w.classes.find(x=>x.className==='7/1'),sub=w.subjects[0],n=c.SR63.setAssignment(base,cls.id,sub.id,'P2'),matches=c.SR63.assignmentMatches(n,sub.name,cls.className);same([matches.length,matches[0].profileId,matches[0].teacher],[1,'P2','معلم ب']);});
 await test('الملف الأكاديمي يجمع مواد الطالب واختباراته',()=>{const a=row('S-1','العلوم'),b=row('S-1','الرياضيات');b.scores.exam1=16;b.examTeachers.exam1='معلم ب';const w=workspace([a,b]),profile=c.SR63.studentProfile(w,'S-1');same([profile.subjects,profile.rows.length,profile.exams.exam1.evaluated],[2,2,2]);assert.equal(profile.rows.find(x=>x.subject==='الرياضيات').exams.exam1.percent,80);});
 await test('لوحة القيادة تطبق فلاتر الصف والمادة وتبني الخريطة الحرارية',()=>{const a=row('S-1','العلوم'),b=row('S-2','الرياضيات');b.className='7/2';b.examClasses.exam1='7/2';const w=workspace([a,b]),m=c.SR63.dashboardModel(w,{subject:'العلوم'});same([m.rows.length,m.subjectGroups.length,m.heat.length],[1,1,1]);assert.equal(m.subjectGroups[0].name,'العلوم');});
 await test('تقرير مقارنة المواد يخرج بيان نجاح وبيان تحصيل منفصلين لكل صف',()=>{const rows=[row('S-1','العلوم'),row('S-2','العلوم'),row('S-1','الرياضيات'),row('S-2','الرياضيات')];rows[1].className='7/2';rows[1].examClasses.exam1='7/2';rows[1].teacher='معلم ج';rows[1].examTeachers.exam1='معلم ج';rows[3].className='7/2';rows[3].examClasses.exam1='7/2';for(const r of rows.filter(r=>r.subject==='الرياضيات')){r.teacher=r.className==='7/2'?'معلم ب2':'معلم ب1';r.examTeachers.exam1=r.teacher;r.scores.exam1=16;}const pages=c.SR63.gradeSubjectPages(rows,'exam1','الكل');assert.equal(pages.length,2);same(pages.map(p=>p.metricType),['success','achievement']);for(const page of pages){const data=c.SR63.gradeSubjectMatrix(page.allRows,'exam1',c.ej,page.subjectChunk);same(data.subjects,['الرياضيات','العلوم']);same(data.classes,['7/1','7/2']);same([data.cells.get('7/1\u0000الرياضيات').teacher,data.cells.get('7/2\u0000الرياضيات').teacher],['معلم ب1','معلم ب2']);same([data.cells.get('7/1\u0000العلوم').teacher,data.cells.get('7/2\u0000العلوم').teacher],['معلم أ','معلم ج']);assert.equal(data.overall.evaluated,4);assert.equal(typeof data.cells.get('7/1\u0000العلوم').metric[page.metricType],'number');}});
 await test('التحصيل موزون بمجموع الدرجات الممكنة',()=>{const a=row(),b=row('S-2');b.scores.exam1=80;b.totals.exam1=100;assert.equal(c.bj([a,b],'exam1',c.ej).achievement,75);});
 await test('عدم توافر نتائج يبقي النجاح والتحصيل فارغين',()=>{const m=c.bj([],'exam1',c.ej);same([m.success,m.achievement],[null,null]);});
 await test('النتيجة غير المتاحة لا تصنّف ضمن المستوى الضعيف',()=>assert.equal(c.yj(null,c.ej.bands),undefined));
 await test('القيمة المضافة تستخدم عينة مشتركة ونسبًا موحدة',()=>{const w=workspace();const m=c.xj(w.rows,'exam1','exam2',w.settings);same([m.paired,m.delta,m.coverage],[1,30,100]);});
 await test('لا عينة مشتركة لا تعني تحسنًا أو ثباتًا',()=>{const m=c.xj([],'exam1','exam2',c.ej);same([m.delta,m.median,m.fromAverage,m.toAverage],[null,null,null,null]);});
 await test('منع جاهزية حاضر بلا درجة',()=>{const w=workspace();w.rows[0].scores.exam1=null;assert.equal(c.RN(w,'exam1').ready,false);assert.ok(c.RN(w,'exam1').critical>0);});
 await test('درجة مسجلة مع غياب تُعد خطأ حرجًا',()=>{const w=workspace();w.rows[0].statuses.exam1='absent';assert.ok(c.RN(w,'exam1').critical>0);});
 await test('الجودة تكشف تكرار الطالب والمادة',()=>{const w=workspace([row(),{...row(),id:'different'}]);assert.ok(c.RN(w,'exam1').issues.some(i=>i.id==='duplicates'));});
 await test('عرض القيم غير المتاحة دون صفر',()=>same([c.wj(null),c.Ede('—','percent:exam1'),c.Ede('لا توجد عينة مشتركة','valueAdded')],['—',null,null]));
 await test('تحويل النسب العربية للتصدير الرقمي',()=>same([c.Ede('٧٥٫٠٪','percent:exam1'),c.Ede('+١٢٫٥ ن.م','valueAdded')],[.75,12.5]));
 for(const [name,mutate] of [
  ['رفض نسخة بلا تعريفات الاختبارات',w=>w.settings.exams=[]],['رفض حالة نتيجة مجهولة',w=>w.rows[0].statuses.exam1='mystery'],['رفض درجة تتجاوز الإجمالي',w=>w.rows[0].scores.exam1=99],['رفض حد نجاح غير صالح',w=>w.settings.pass=110],['رفض أسماء اختبارات مكررة',w=>w.settings.exams[1].name=w.settings.exams[0].name],['رفض نسخة ذات إسناد يتيم',w=>w.teacherAssignments[0].profileId='missing'],['رفض سجل طالب ومادة مكرر',w=>w.rows.push({...clone(w.rows[0]),id:'other'})],['رفض تصميم تقرير بنوع خاطئ',w=>w.settings.reportDesign.schoolLabel={}],['رفض قائمة مسميات استيراد تالفة',w=>w.settings.importAliases.teacher='oops']
 ])await test(name,()=>{const w=workspace();mutate(w);assert.throws(()=>c.LN(w));});
 await test('ترحيل نسخة درجات قديمة بلا حالات',()=>{const w=workspace();delete w.rows[0].statuses;assert.equal(c.LN(w).workspace.rows[0].statuses.exam1,'present');});
 await test('إصلاح مرجع محلي قديم عند تطابق المعلم والمادة وحدهما',()=>{const w=workspace();w.teacherAssignments[0].profileId='old-id';const migrated=c.SR63.migrateLocal(w);same([migrated.repaired,migrated.workspace.teacherAssignments[0].profileId],[1,'P1']);c.LN(migrated.workspace);assert.equal(w.teacherAssignments[0].profileId,'old-id');});
 await test('عدم تخمين معلم لإسناد قديم بلا تطابق واضح',()=>{const w=workspace();w.teacherAssignments[0].profileId='old-id';w.teacherAssignments[0].teacher='شخص آخر';const migrated=c.SR63.migrateLocal(w);assert.equal(migrated.repaired,0);assert.throws(()=>c.LN(migrated.workspace));});

 // 6.10.6: real binary .xlsx fixtures cover the original multi-class regression.
 async function checkMultiSectionExcel(fixture,expectedClasses,expectedRows){
   const fileName=fixture+'.xlsx',data=fs.readFileSync(path.join(__dirname,'fixtures',fileName));
   assert.equal(data.subarray(0,2).toString(),'PK','The regression fixture must be a genuine XLSX workbook');
   const parsed=c.ode(new Uint8Array(data),fileName,c.ej),items=c.O9([parsed]);
   const discovered=[...new Set(items.map(x=>x.className))].sort();
   same(discovered,expectedClasses.slice().sort());
   assert.equal(items.length,expectedRows,'all physical student rows must reach preview');
   assert.equal(new Set(items.map(x=>x.studentId)).size,expectedRows,'serial numbers must not be treated as unique academic IDs');
   assert.ok(items.every(x=>x.recognized&&x.studentName&&x.className&&x.score!==null));
   let w=c.Aj();w.teachers=expectedClasses.filter(cls=>!c.SR63.isSupportClass(cls)).map((cls,i)=>({id:'P'+i,teacher:'معلم '+cls,subject:'العلوم',department:'العلوم',classes:[cls]}));
   w.teacherAssignments=w.teachers.map((p,i)=>({id:'A'+i,profileId:p.id,teacher:p.teacher,subject:'العلوم',department:'العلوم',className:p.classes[0],active:true}));
   const matches=c.lde(items,w.teachers,w.teacherAssignments),reconciled=c.SR63.importReconciliation(items,w,'replace',{},matches);
   same([reconciled.students,reconciled.results,reconciled.classes],[expectedRows,expectedRows,expectedClasses.length]);
   assert.ok(matches.every(m=>m.selectedProfileId||c.SR63.isSupportClass(m.className)),'matching must preserve assignments per class');
   const next=c.SR63.commitImport(w,items,matches,[parsed],'exam1',20,()=>20,'replace');
   same([next.rows.length,next.imports[0].rows,new Set(next.rows.map(r=>r.className)).size],[expectedRows,expectedRows,expectedClasses.length]);
   for(const cls of expectedClasses)assert.equal(next.rows.filter(x=>x.className===cls).length,18,'class '+cls+' lost results');
   if(expectedClasses.includes('7/ESE')){
     assert.equal(next.rows.filter(x=>c.SR63.isSupportRow(x,'exam1')).length,18);
     assert.ok(next.rows.filter(x=>x.className==='7/ESE').every(x=>x.department===c.SR63.SUPPORT_DEPARTMENT));
   }
   c.LN(next);
   const repeated=c.SR63.commitImport(next,items,matches,[parsed],'exam1',20,()=>20,'replace');
   same([repeated.rows.length,repeated.imports[0].rows],[expectedRows,0]);
 }
 await test('XLSX رسمي بنطاق ورقة تالف A1:CV5 يستخرج الطلاب الـ160 وجميع الشعب',()=>{
   const file=fs.readFileSync(path.join(__dirname,'fixtures/stale-dimension-160-students.xlsx'));
   const original=c.hv(file,{type:'buffer'});
   assert.equal(original.Sheets['التربية الاسلامية']['!ref'],'A1:CV5');
   assert.equal(c.Gv.sheet_to_json(original.Sheets['التربية الاسلامية'],{header:1,raw:true}).length,5,'fixture must reproduce real workbook truncation');
   const parsed=c.ode(file,'نموذج-نطاق-تالف.xlsx',c.ej),items=c.O9([parsed]);
   const expected={'7/1':19,'7/2':17,'7/3':19,'7/4':18,'7/5':18,'7/6':16,'7/7':16,'7/8':17,'7/9':14,'7/ESE':6};
   const byClass=Object.fromEntries(Object.keys(expected).map(cls=>[cls,items.filter(i=>i.className===cls).length]));
   same([items.length,new Set(items.map(i=>i.studentId)).size,byClass],[160,160,expected]);
   assert.ok(items.every(x=>x.recognized&&/^313\d{8}$/.test(x.studentId)),'long student IDs from الرقم must be preserved');
   assert.equal(parsed.sheets[1].selected,false,'unscored subject must not be committed as zero');
   assert.ok(parsed.sheets[1].issues.some(i=>i.severity==='warning'&&/لا توجد درجات/.test(i.message)));
   assert.ok(!parsed.sheets.flatMap(s=>s.issues).some(i=>i.severity==='error'));
   let w=c.Aj();
   w.teachers=Object.keys(expected).filter(cls=>cls!=='7/ESE').map((cls,i)=>({id:'P'+i,teacher:'معلم '+cls,subject:'التربية الاسلامية',department:'التربية الاسلامية',classes:[cls]}));
   w.teacherAssignments=w.teachers.map((t,i)=>({id:'A'+i,profileId:t.id,teacher:t.teacher,subject:t.subject,department:t.department,className:t.classes[0],active:true}));
   const links=c.lde(items,w.teachers,w.teacherAssignments);
   const n=c.SR63.commitImport(w,items,links,[parsed],'exam1',20,()=>20,'replace');
   same([n.rows.length,n.imports[0].rows,new Set(n.rows.map(r=>r.className)).size,n.rows.filter(r=>c.SR63.isSupportRow(r,'exam1')).length],[160,160,10,6]);
   assert.equal(c.LN(n).workspace.rows.length,160);
   assert.equal(c.SR63.commitImport(n,items,links,[parsed],'exam1',20,()=>20,'replace').imports[0].rows,0);
 });
 await test('XLSX متعدد الشعب: 4 شعب × 18 وعمود الرقم التسلسلي المتكرر يستورد 72 نتيجة',()=>checkMultiSectionExcel('multi-class-legacy-serial',['7/1','7/2','7/3','7/4'],72));
 await test('XLSX متعدد الشعب: العناوين المتكررة والشعبة الموروثة لا تُسقط أي طالب',()=>checkMultiSectionExcel('multi-class-legacy-blocks',['7/1','7/2','7/3','7/4'],72));

 await test('XLSX متعدد الشعب: عنوان الشعبة في العمود الأول لا يورث 7/1 إلى بقية الصفوف',()=>checkMultiSectionExcel('multi-class-in-a-header',['7/1','7/2','7/3','7/4'],72));
 await test('XLSX متعدد الشعب: عنوان الشعبة في خانة الاسم لا يضاف كطالب وهمي',()=>checkMultiSectionExcel('multi-class-caption-name',['7/1','7/2','7/3','7/4'],72));
 await test('تغيير مكان عنوان الشعبة وعدم وضوح المجموعة التالية يمنع الاعتماد الصامت',async()=>{
   const workbook=c.hv(fs.readFileSync(path.join(__dirname,'fixtures/multi-class-in-a-header.xlsx')),{type:'buffer'}),sheet=workbook.Sheets[workbook.SheetNames[0]];
   const matrix=c.Gv.sheet_to_json(sheet,{header:1,raw:true,defval:null,blankrows:true});
   // The second section marker has been lost in an Excel merge/edit.
   const marker=matrix.findIndex(row=>String(row[0]??'').includes('7/2'));
   assert.ok(marker>0);matrix[marker][0]='دفعة جديدة غير محددة الشعبة';
   const modified=c.Gv.book_new();c.Gv.book_append_sheet(modified,c.Gv.aoa_to_sheet(matrix),'العلوم');
   const bytes=c.Cv(modified,{type:'array',bookType:'xlsx'}),parsed=c.ode(bytes,'unknown-sections.xlsx',c.ej);
   assert.ok(parsed.sheets.some(s=>s.issues.some(i=>i.severity==='error')),'silently inherited class from 7/1');
   let prevented=false,stopped=false;
   await app.run('fde.se',{c:[parsed],j:c.O9([parsed]),N:[],F:[],L:0,I:0,C:true,ne:[],x:false,eb:{error:()=>{stopped=true}},Kj:async()=>{prevented=true;return true;},e:workspace([])});
   assert.equal(stopped,true,'UI must report the parser error');
   assert.equal(prevented,false,'must stop before snapshot/write');
   assert.throws(()=>c.SR63.commitImport(workspace([]),c.O9([parsed]),[],[parsed],'exam1',20,()=>20,'replace'),/مشكلة مانعة/,'domain commit must refuse malformed source even if invoked directly');
 });

 await test('XLSX شامل: 07/1 إلى 7/4 مع 07/ESE، 90 نتيجة مستقلة',()=>checkMultiSectionExcel('multi-class-wide',['7/1','7/2','7/3','7/4','7/ESE'],90));
 await test('قراءة الرقم الأكاديمي الصريح لا يُستبدل بالهوية التلقائية',()=>{
   assert.equal(c.SR63.importOfficialStudentId('0012345678','الرقم الأكاديمي'),'0012345678');
   assert.equal(c.SR63.importOfficialStudentId('1','الرقم'),'');
   assert.equal(c.SR63.importOfficialStudentId('31363401505','الرقم'),'31363401505');
 });
 const template=c.ode(fs.readFileSync(path.resolve(__dirname,'../../نموذج-استيراد-نتائج-المدرسة.xlsx')),'wide.xlsx',c.ej),wide=c.O9([template]);
 await test('قراءة XLSX الفعلي بأربعة اختبارات',()=>same([template.sheets.filter(s=>s.selected).length,wide.length],[4,12]));
 await test('المادة من عمود المادة وحالة الغياب من عمود الحالة',()=>{assert.ok(wide.every(i=>i.subject==='العلوم'&&i.recognized));assert.equal(wide.find(i=>i.studentId==='S-002'&&i.exam==='exam3').status,'excused');});
 await test('الإجماليات من ورقة إعدادات النموذج',()=>same(template.sheets.map(s=>s.examDefinition.total),[20,30,30,40]));
 await test('استيراد النموذج مع سياسة الجديد يشمل الاختبارات الأربعة',()=>{const w=workspace([]),next=commit(w,wide,'skip',[template]);same([next.rows.length,next.imports[0].changes.length,next.rows[0].scores.exam4],[3,12,34]);});
 await test('استيراد متكرر مطابق لا يضاعف السجلات',()=>{const w=commit(workspace([]),wide,'replace',[template]),again=commit(w,wide,'replace',[template]);same([again.rows.length,again.imports[0].changes.length],[3,0]);});
 await test('إعادة الاستيراد تحدّث الشعبة مع بقاء الدرجة نفسها',()=>assert.equal(c.hj(commit(workspace(),[item({className:'7/2'})]).rows[0],'exam1'),'7/2'));
 await test('سياسة ملء الفارغ تحفظ النتائج المرصودة',()=>assert.equal(commit(workspace(),[item({score:1})],'empty').rows[0].scores.exam1,10));
 await test('الإسناد الصريح لكل اختبار يحفظ المعلم التاريخي',()=>{const w=workspace();w.teachers.push({...w.teachers[0],id:'P2',teacher:'معلم ب'});const items=[item({exam:'exam1',teacher:'معلم أ'}),item({exam:'exam2',teacher:'معلم ب',score:27})],links=c.lde(items,w.teachers,w.teacherAssignments);same(links.map(l=>l.selectedProfileId),['P1','P2']);const n=commit(w,items);same([c.mj(n.rows[0],'exam1'),c.mj(n.rows[0],'exam2')],['معلم أ','معلم ب']);});
 await test('ملف الهيكل الأكاديمي الواحد يكتشف الصفوف والمواد والتكليفات والمنسقين',()=>{const file=fs.readFileSync(path.resolve(__dirname,'../../نموذج-قاعدة-بيانات-المعلمين.xlsx')),preview=c.ide(file,'master.xlsx',c.ej);assert.equal(preview.issues.filter(i=>i.severity==='error').length,0);assert.equal(preview.profiles.length,95);assert.equal(preview.assignments.length,286);assert.equal(preview.subjectCoordinators['شرعية'],'هشام');assert.equal(preview.subjectCoordinators['عربي'],'حربي');assert.equal(preview.subjectCoordinators['رياضيات'],'سامر');});
 await test('اعتماد ملف الهيكل يوزع الصفوف والشعب والمواد والمنسقين والمعلمين والتكليفات تلقائيًا',()=>{const file=fs.readFileSync(path.resolve(__dirname,'../../نموذج-قاعدة-بيانات-المعلمين.xlsx')),preview=c.ide(file,'master.xlsx',c.ej),w=c.Aj(),n=c.SR63.mergeTeachers(w,preview,'replace');assert.equal(n.grades.length,3);assert.equal(n.classes.length,26);assert.equal(n.subjects.length,12);assert.equal(n.teacherAssignments.length,286);assert.equal(c.SR63.subjectCoordinator(n,'شرعية'),'هشام');assert.equal(c.SR63.subjectCoordinator(n,'عربي'),'حربي');const musa=n.teachers.find(t=>c.ij(t.teacher)===c.ij('موسى'));assert.ok(musa);const musaSubjects=[...new Set(n.teacherAssignments.filter(a=>a.profileId===musa.id).map(a=>a.subject))].sort();assert.deepEqual(musaSubjects,['E','برامج داعمة'].sort());const cell=c.SR63.assignmentMatches(n,'شرعية','7/1');assert.equal(cell.length,1);assert.equal(cell[0].teacher,'رزق');c.LN(n);});
 await test('نموذج النتيجة المعتمد يربط المادة والشعبة مباشرة بمعلم التكليف دون اسم معلم في الملف',()=>{const file=fs.readFileSync(path.resolve(__dirname,'../../نموذج-قاعدة-بيانات-المعلمين.xlsx')),preview=c.ide(file,'master.xlsx',c.ej),w=c.SR63.mergeTeachers(c.Aj(),preview,'replace'),items=[['S-1','طالب 1','07/1'],['S-2','طالب 2','07/4'],['S-3','طالب 3','07/7']].map(([studentId,studentName,className])=>({studentId,studentName,className:c.lj(className),grade:'السابع',subject:'التربية الاسلامية',teacher:'',score:15,status:'present',recognized:true,sourceFile:'شرعية سابع.xlsx',sourceSheet:'التربية الاسلامية'})),links=c.lde(items,w.teachers,w.teacherAssignments);same(links.map(x=>x.status),['matched','matched','matched']);same(links.map(x=>x.subject),['شرعية','شرعية','شرعية']);same(links.map(x=>w.teachers.find(t=>t.id===x.selectedProfileId)?.teacher),['رزق','العلي','الحوري']);const n=c.SR63.commitImport(w,items,links,[{fileName:'شرعية سابع.xlsx',issues:[],sheets:[]}],'exam1',20,()=>20,'replace');assert.ok(n.rows.every(r=>r.subject==='شرعية'));same(n.rows.map(r=>c.mj(r,'exam1')),['رزق','العلي','الحوري']);same(n.rows.map(r=>c.hj(r,'exam1')),['7/1','7/4','7/7']);});
 await test('نموذج النتيجة المدرسي المعتمد يعمل بدون عمود رقم الطالب',()=>{const book=c.Gv.book_new(),sheet=c.Gv.aoa_to_sheet([['0','0',null,null],['0','0',null,null],['الاسم','الشعبة الصفية','التقييم الرئيسي','منتصف الفصل الاول'],['طالب تجريبي','07/1',30,15]]);c.Gv.book_append_sheet(book,sheet,'التربية الاسلامية');const data=c.Cv(book,{type:'array',bookType:'xlsx'}),parsed=c.ode(data,'شرعية سابع.xlsx',c.ej);assert.equal(parsed.sheets.length,1);assert.equal(parsed.sheets[0].subject,'التربية الاسلامية');const rows=c.O9([parsed]);assert.equal(rows.length,1);assert.equal(rows[0].className,'7/1');assert.ok(String(rows[0].studentId).startsWith('auto-student-'));});
 await test('النموذج الشامل بأربعة اختبارات يعمل أيضًا بدون عمود رقم الطالب',()=>{const book=c.Gv.book_new(),sheet=c.Gv.aoa_to_sheet([['اسم الطالب','الشعبة الصفية','المادة','درجة منتصف الفصل الأول'],['طالب شامل','07/1','العلوم',15]]);c.Gv.book_append_sheet(book,sheet,'النتائج');const data=c.Cv(book,{type:'array',bookType:'xlsx'}),parsed=c.ode(data,'مجمع.xlsx',c.ej),rows=c.O9([parsed]);assert.equal(rows.length,1);assert.equal(rows[0].studentName,'طالب شامل');assert.ok(String(rows[0].studentId).startsWith('auto-student-'));});
 await test('فهرس المواد لا يكرر مسميات Excel فوق مواد الهيكل المختصرة',()=>{
   const w=workspace([row('S-1','العلوم'),row('S-2','الدراسات الاجتماعية'),row('S-3','الفنون البصرية')]);
   w.subjects=[{id:'a',name:'علوم',gradeIds:[]},{id:'b',name:'اجتماعية',gradeIds:[]},{id:'c',name:'فنية',gradeIds:[]},{id:'d',name:'العلوم',gradeIds:[]}];
   const catalog=c.SR63.ensureCatalog(w),keys=catalog.subjects.map(s=>c.SR63.subjectAliasKey(s.name));
   assert.equal(new Set(keys).size,keys.length);assert.ok(catalog.subjects.some(s=>s.name==='علوم'));assert.ok(!catalog.subjects.some(s=>s.name==='العلوم'));
 });
 await test('الاستيراد يحفظ مادة الهيكل المختصرة ولا ينشئ مادة طويلة جديدة',()=>{
   const w=workspace([]);w.teachers[0].subject='علوم';w.teacherAssignments[0].subject='علوم';
   const i=item({subject:'العلوم',teacher:'',studentId:'ID-TEST-103'}),links=c.lde([i],w.teachers,w.teacherAssignments);
   assert.equal(links[0].selectedProfileId,'P1');
   const next=c.SR63.commitImport(w,[i],links,[{fileName:'subject.xlsx',issues:[],sheets:[]}],'exam1',20,()=>20,'replace');
   assert.equal(next.rows[0].subject,'علوم');assert.equal(next.rows[0].teacher,'معلم أ');
   assert.equal(next.subjects.filter(s=>c.SR63.subjectEquivalent(s.name,'العلوم')).length,1);
 });
 await test('إصلاح مواد موجودة وتكليفات آخر دفعة يحفظ الدرجات والتاريخ',()=>{
   const r=row('S-4','العلوم');r.teacher='اسم قديم';r.examTeachers.exam1='اسم قديم';r.examTeachers.exam2='معلم تاريخي';r.importBatches.exam1='LATEST';r.importBatches.exam2='OLD';
   const w=workspace([r]);w.subjects=[{id:'canonical-science',name:'علوم',gradeIds:[]}];w.teacherAssignments[0].subject='علوم';w.teachers[0].subject='علوم';w.imports=[{id:'LATEST',kind:'results',changes:[]},{id:'OLD',kind:'results',changes:[]}];
   const plan=c.SR63.subjectLinkRepairPreview(w);assert.equal(plan.renamed,1);assert.equal(plan.teacherFixed,1);assert.equal(plan.conflicts.length,0);
   const next=c.SR63.repairSubjectLinks(w);assert.equal(next.rows.length,1);assert.equal(next.rows[0].subject,'علوم');
   assert.equal(next.rows[0].scores.exam1,10);assert.equal(next.rows[0].scores.exam2,24);
   assert.equal(next.rows[0].examTeachers.exam1,'معلم أ');assert.equal(next.rows[0].examTeachers.exam2,'معلم تاريخي');
   assert.equal(w.rows[0].subject,'العلوم');assert.equal(w.rows[0].teacher,'اسم قديم');
 });
 await test('إصلاح مسميات قديمة يرفض تصادم مادة لنفس الطالب قبل المساس بالنتائج',()=>{
   const w=workspace([row('S-4','علوم'),row('S-4','العلوم')]);
   assert.equal(c.SR63.subjectLinkRepairPreview(w).conflicts.length,1);
   assert.throws(()=>c.SR63.repairSubjectLinks(w),/متعارضة/);
   assert.equal(w.rows.length,2);
 });
 await test('تغطية التكليفات تعترف بمرادف المادة والشعبة نفسها',()=>{
   const w=workspace([]);w.subjects=[{id:'sub-can',name:'علوم',gradeIds:[]}];w.teacherAssignments[0].subject='العلوم';
   const catalog=c.SR63.ensureCatalog(w),coverage=c.SR63.catalogCoverage({...w,...catalog});
   assert.equal(c.SR63.assignmentMatches(w,'علوم','7/1').length,1);
   assert.equal(coverage.missing>=0,true);
 });
 await test('مرادفات أسماء المواد الرسمية لا تنشئ مواد مكررة عند ربط النتائج',()=>{assert.equal(c.SR63.subjectAliasKey('التربية الإسلامية'),c.SR63.subjectAliasKey('شرعية'));assert.equal(c.SR63.subjectAliasKey('اللغة العربية'),c.SR63.subjectAliasKey('عربي'));assert.equal(c.SR63.subjectAliasKey('اللغة الإنجليزية'),c.SR63.subjectAliasKey('E'));assert.equal(c.SR63.subjectAliasKey('الدراسات الاجتماعية'),c.SR63.subjectAliasKey('اجتماعية'));assert.equal(c.SR63.subjectAliasKey('الحوسبة وتكنولوجيا المعلومات'),c.SR63.subjectAliasKey('حاسب'));assert.equal(c.SR63.subjectAliasKey('الحاسوب'),c.SR63.subjectAliasKey('حاسب'));assert.equal(c.SR63.subjectAliasKey('التربية البدنية'),c.SR63.subjectAliasKey('بدنية'));});
 await test('دمج المعلمين يحافظ على معرف المعلم والإسنادات',()=>{const w=workspace();w.teacherAssignments.push({...w.teacherAssignments[0],id:'A2',className:'7/2'});const preview={fileName:'teachers.xlsx',issues:[],profiles:[{...w.teachers[0],id:'NEW'}],assignments:[{...w.teacherAssignments[0],profileId:'NEW'}]},n=c.SR63.mergeTeachers(w,preview,'merge');same([n.teachers[0].id,n.teacherAssignments.length,n.teacherAssignments.every(a=>n.teachers.some(p=>p.id===a.profileId))],['P1',2,true]);});
 await test('دمج صفوف المعلم المكررة لا ينشئ إسنادًا يتيمًا',()=>{const w=workspace([]);w.teachers=[];w.teacherAssignments=[];const p={id:'x1',teacher:'معلم',subject:'العلوم',department:'العلوم',classes:['7/1']},preview={fileName:'t.xlsx',issues:[],profiles:[p,{...p,id:'x2',classes:['7/2']}],assignments:[{id:'a1',profileId:'x1',teacher:'معلم',subject:'العلوم',department:'العلوم',className:'7/1'},{id:'a2',profileId:'x2',teacher:'معلم',subject:'العلوم',department:'العلوم',className:'7/2'}]};const n=c.SR63.mergeTeachers(w,preview,'merge');same([n.teachers.length,n.teacherAssignments.length],[1,2]);c.LN(n);});
 await test('التراجع عن الاختبار الأول يحفظ درجات الثاني',()=>{const w=workspace();w.imports=[{id:'B1',at:'2025-01-01',changes:[{rowId:w.rows[0].id,exam:'exam1',before:null}]}];const n=c.SR63.rollback(w,'B1','exam1').workspace;same([n.rows.length,n.rows[0].scores.exam1,n.rows[0].scores.exam2],[1,null,24]);});
 await test('التراجع عن دفعة كاملة يزيل الصفوف الجديدة فقط',()=>{const w=commit(workspace([]),wide,'replace',[template]),batch=w.imports[0];assert.equal(c.SR63.rollback(w,batch.id,'multi').workspace.rows.length,0);});
 await test('التراجع يحافظ على تعديل يدوي لاحق',()=>{const w=commit(workspace(),[item({score:17})]),batch=w.imports[0];w.rows[0].scores.exam1=19;w.rows[0].importBatches.exam1=null;const result=c.SR63.rollback(w,batch.id,'exam1');same([result.workspace.rows[0].scores.exam1,result.skipped],[19,1]);});
 await test('التراجع يعيد القيم القديمة للاختبار وحده',()=>{const w=commit(workspace(),[item({score:17,className:'7/2'})]);const n=c.SR63.rollback(w,w.imports[0].id,'exam1').workspace;same([n.rows[0].scores.exam1,c.hj(n.rows[0],'exam1'),n.rows[0].scores.exam2],[10,'7/1',24]);});
 await test('توثيق التعديل اليدوي وإمكانية التراجع عنه',()=>{const w=workspace(),n=clone(w);n.auditLog=w.auditLog;n.rows[0].scores.exam1=19;const audited=c.SR63.auditChanges(w,n);assert.equal(audited.auditLog[0].changes[0].fields.scores.before.exam1,10);assert.equal(c.SR63.undoAudit(audited,audited.auditLog[0]).rows[0].scores.exam1,10);});
 await test('منع التراجع اليدوي إذا تغيرت القيم لاحقًا',()=>{const w=workspace(),n=clone(w);n.auditLog=w.auditLog;n.rows[0].scores.exam1=19;const audited=c.SR63.auditChanges(w,n);audited.rows[0].scores.exam1=18;assert.throws(()=>c.SR63.undoAudit(audited,audited.auditLog[0]));});
 await test('محرر الطالب يحدّث شعبة الاختبار ويسجل العملية',async()=>{const w=workspace();let next;await app.run('jde.d',{e:w.rows[0],t:w,n:fn=>next=fn(w),c:{studentId:'S-1',studentName:'طالب S-1',className:'7/2',subject:'العلوم',department:'العلوم',teacher:'معلم أ',status:'present',score:'12.5',total:'20'},r:'exam1',o:noop,eb:{error:message=>{throw Error(message)},success:noop},Kj:async()=>({})});same([c.hj(next.rows[0],'exam1'),next.rows[0].scores.exam1,next.auditLog.length],['7/2',12.5,w.auditLog.length+1]);});
 await test('فشل نقطة الاستعادة يمنع تعديل الطالب',async()=>{const w=workspace();let changed=false;await app.run('jde.d',{e:w.rows[0],t:w,n:()=>changed=true,c:{studentId:'S-1',studentName:'طالب',className:'7/2',subject:'العلوم',department:'العلوم',teacher:'معلم أ',status:'present',score:'12',total:'20'},r:'exam1',o:noop,eb:{error:noop,success:noop},Kj:async()=>null});assert.equal(changed,false);});
 await test('التعديل الجماعي يمنع تعيين حاضر بلا درجة',async()=>{const w=workspace();w.rows[0].scores.exam1=null;let changed=false;await app.run('Nde.Be.o',{e:w,oe:new Set([w.rows[0].id]),B:'present',t:()=>changed=true,se:noop,ue:noop,qj:async()=>[],Kj:async()=>({}),eb:{error:noop,success:noop}});assert.equal(changed,false);});
 await test('فشل نقطة الاستعادة يمنع الحذف الجماعي',async()=>{const w=workspace();let changed=false;await app.run('Nde.Be.s',{e:w,oe:new Set([w.rows[0].id]),t:()=>changed=true,se:noop,ue:noop,qj:async()=>[],Kj:async()=>null,eb:{error:noop,success:noop}});assert.equal(changed,false);});
 let exported;
 await test('تصدير ملف XLSX كامل صالح للقراءة',()=>{const w=workspace([row(),row('S-2')]);w.rows[1].scores.exam1=null;w.rows[1].statuses.exam1='excused';w.rows[0].examClasses.exam2='7/2';w.rows[0].examTeachers.exam2='معلم ب';c.SR63.currentWorkspace=w;app.run('Nde.Ae',{e:w,xe:'exam1',Tv:book=>{c.SR63.formatWorkbook(book);exported=c.Cv(book,{type:'array',bookType:'xlsx'});}});fs.writeFileSync(path.join(__dirname,'output/roundtrip.xlsx'),Buffer.from(exported));const parsed=c.hv(exported,{type:'array',cellNF:true});assert.ok(parsed.SheetNames.includes('بيانات التقرير'));assert.ok(parsed.Sheets['درجات الطلاب']['!ref']);});
 await test('إعادة استيراد XLSX تحافظ على الأرقام والحالات والمعلمين والشعب',()=>{const p=c.ode(exported,'roundtrip.xlsx',c.ej),all=c.O9([p]);assert.equal(all.length,8);assert.ok(all.every(i=>i.recognized));same([all.find(i=>i.studentId==='S-2'&&i.exam==='exam1').status,all.find(i=>i.studentId==='S-1'&&i.exam==='exam2').teacher,all.find(i=>i.studentId==='S-1'&&i.exam==='exam2').className],['excused','معلم ب','7/2']);});
 await test('نسبة Excel مخزنة رقمًا وتعرض 75%',()=>{const book=c.Gv.book_new();c.Gv.book_append_sheet(book,c.Gv.aoa_to_sheet([['نسبة النجاح','القيمة المضافة'],[.75,null]]),'اختبار');c.SR63.formatWorkbook(book);const data=c.Cv(book,{type:'array',bookType:'xlsx'});fs.writeFileSync(path.join(__dirname,'output/formats.xlsx'),Buffer.from(data));const sheet=c.hv(data,{type:'array',cellNF:true}).Sheets['اختبار'];same([sheet.A2.v,sheet.A2.z,sheet.B2??null],[.75,'0.0%',null]);});
 await test('CSV يحمي النصوص التي قد تفسر كمعادلات',()=>same(['=1+1','+SUM(A1)','@X','اسم عادي',12].map(c.SR63.csvValue),["'=1+1","'+SUM(A1)","'@X",'اسم عادي',12]));
 await test('رفض استيراد حالة غير معتمدة',()=>assert.throws(()=>commit(workspace(),[item({status:'unknown',score:null})])));
 await test('رفض استيراد درجة غير منتهية',()=>assert.throws(()=>commit(workspace(),[item({score:NaN})])));
 await test('رفض تكرار الطالب والمادة والاختبار في دفعة واحدة',()=>assert.throws(()=>commit(workspace(),[item(),item()])));
 await test('تجميع 100 ألف سجل يحافظ على الإجمالي',()=>{const large=Array.from({length:100000},(_,i)=>({...row('P'+i),department:'قسم '+(i%10)})),start=performance.now(),groups=c.Sj(large,'department','exam1',c.ej,'exam2'),ms=Math.round(performance.now()-start);assert.equal(groups.reduce((n,g)=>n+g.metric.evaluated,0),100000);fs.writeFileSync(path.join(__dirname,'output/performance.json'),JSON.stringify({scope:'Isolated grouping, not browser rendering',records:100000,milliseconds:ms},null,2));console.log('Grouping 100000 records: '+ms+' ms');});

 await test('مسح الهيكل الأكاديمي يحذف القاعدة الحالية دفعة واحدة ويحافظ على النتائج',()=>{const w=workspace([{...row(),id:'R1'}]);const cleared=c.SR63.clearAcademicStructure(w);assert.equal(cleared.catalogDetached,true);assert.equal(cleared.rows.length,1);assert.equal(cleared.teachers.length,0);assert.equal(cleared.teacherAssignments.length,0);assert.equal(cleared.grades.length,0);assert.equal(cleared.classes.length,0);assert.equal(cleared.subjects.length,0);c.LN(cleared);});
 await test('النتائج التاريخية لا تعيد إنشاء الصفوف بعد مسح الهيكل',()=>{const w=workspace([{...row(),id:'R1'}]),cleared=c.SR63.clearAcademicStructure(w),normalized=c.kj(cleared);assert.equal(normalized.catalogDetached,true);assert.equal(normalized.rows.length,1);assert.equal(normalized.grades.length,0);assert.equal(normalized.classes.length,0);assert.equal(normalized.subjects.length,0);});
 await test('رفع قاعدة المعلمين بعد المسح يعيد تفعيل الهيكل الأكاديمي تلقائيًا',()=>{const w=c.SR63.clearAcademicStructure(workspace([{...row(),id:'R1'}]));const preview={fileName:'teachers.xlsx',issues:[],profiles:[{id:'p-new',teacher:'معلم جديد',subject:'العلوم',department:'العلوم',coordinator:'معلم جديد',classes:['7/1']}],assignments:[{id:'a-new',profileId:'p-new',teacher:'معلم جديد',subject:'العلوم',department:'العلوم',className:'7/1'}],subjectCoordinators:{'العلوم':'معلم جديد'}};const n=c.SR63.mergeTeachers(w,preview,'replace');assert.equal(n.catalogDetached,false);assert.equal(n.teachers.length,1);assert.ok(n.classes.some(x=>x.className==='7/1'));assert.equal(n.teacherAssignments.length,1);c.LN(n);});
 await test('مسميات الفنية المختلفة ترتبط بنفس مادة الفنية',()=>{for(const name of ['التربية الفنية','التربية الفنية والبصرية','الفنون البصرية','فنون','التربية الفنية والتصميم'])assert.equal(c.SR63.subjectAliasKey(name),c.SR63.subjectAliasKey('فنية'));});
 await test('مسميات الحوسبة المختلفة ترتبط بنفس مادة الحاسب',()=>{for(const name of ['الحوسبة وتكنولوجيا المعلومات','الحاسوب','الحاسب وتقنية المعلومات','تكنولوجيا المعلومات'])assert.equal(c.SR63.subjectAliasKey(name),c.SR63.subjectAliasKey('حاسب'));});
 await test('ترتيب ومسميات المواد في جميع التقارير مستقلة عن الهوية الأكاديمية',()=>{
   const w=workspace([row('S-1','العلوم'),row('S-1','التربية الإسلامية'),row('S-1','اللغة العربية')]);
   const baseline=c.SR63.reportSubjectOrder(w.rows,w.settings);
   same(baseline,['التربية الإسلامية','اللغة العربية','العلوم']);
   const entries=c.SR63.reportSubjectEntries(w.settings,w);
   const target=entries.findIndex(x=>x.key===c.SR63.subjectAliasKey('علوم'));
   const [science]=entries.splice(target,1);science.label='علوم المستقبل';entries.unshift(science);
   w.settings.subjectReportOrder=entries;
   const loaded=c.LN(w).workspace;
   same(c.SR63.reportSubjectOrder(loaded.rows,loaded.settings),['العلوم','التربية الإسلامية','اللغة العربية']);
   same(c.SR63.gradeSubjectPages(loaded.rows,'exam1','الكل',loaded.settings).filter(p=>p.metricType==='success').map(p=>p.subjectChunk),[['العلوم','التربية الإسلامية','اللغة العربية']]);
   assert.equal(c.SR63.reportSubjectLabel('العلوم',loaded.settings),'علوم المستقبل');
   assert.equal(c.SR63.reportSubjectLabel('علوم',loaded.settings),'علوم المستقبل');
   assert.equal(c.SR63.reportSubjectLabel('التربية الإسلامية',loaded.settings),'الشرعية');
   const page=c.SR63.studentResultPages(loaded,'exam1',{studentId:'S-1'})[0];
   same(page.results.slice(0,3).map(x=>x.subject),['علوم المستقبل','الشرعية','اللغة العربية']);
   assert.equal(loaded.rows.find(r=>r.subject==='العلوم')?.subject,'العلوم');
   assert.equal(loaded.rows.find(r=>r.subject==='التربية الإسلامية')?.subject,'التربية الإسلامية');
   assert.equal(c.SR63.subjectEquivalent('التربية الإسلامية','شرعية'),true);
 });
 await test('إعدادات مسميات التقرير ترفض الأسماء المكررة ولا تغيّر أصل المواد',()=>{
   const w=workspace();const entries=c.SR63.reportSubjectEntries(w.settings,w);
   entries[1].label=entries[0].label;w.settings.subjectReportOrder=entries;
   assert.throws(()=>c.LN(w),/تكرار المادة أو اسم العرض/);
   assert.equal(w.rows[0].subject,'العلوم');
 });
 await test('كشف نتيجة الطالب يرتب المواد ويعرض الاختبار المحدد فقط',()=>{const subjects=['التربية البدنية','التربية الفنية والبصرية','الحوسبة وتكنولوجيا المعلومات','الدراسات الاجتماعية','العلوم','الرياضيات','اللغة الإنجليزية','اللغة العربية','التربية الإسلامية'],rows=subjects.map((subject,i)=>{const r=row('S-77',subject);r.studentName='طالب التقرير';r.scores.exam1=10+i;r.totals.exam1=20;r.statuses.exam1='present';r.scores.exam2=1;r.totals.exam2=30;r.statuses.exam2='present';return r;}),w=workspace(rows);w.classes=[{id:'C1',className:'7/1',name:'7/1',grade:'السابع',gradeId:'G1',active:true}];w.grades=[{id:'G1',name:'السابع',active:true}];w.subjects=subjects.map((name,i)=>({id:'SUB'+i,name,department:name,gradeIds:['G1'],active:true}));const pages=c.SR63.studentResultPages(w,'exam1',{});assert.equal(pages.length,1);same(pages[0].results.slice(0,9).map(x=>x.subject),['الشرعية','اللغة العربية','الانجليزي','الرياضيات','العلوم','الاجتماعيات','الحاسوب','الفنية','البدنية']);assert.equal(pages[0].results[0].score,18);assert.equal(pages[0].results[0].total,20);assert.equal(pages[0].results[0].band,'ممتاز');});
 fs.writeFileSync(path.join(__dirname,'output/results.json'),JSON.stringify({version:'6.10.15',date:new Date().toISOString(),method:'Actual application logic in Node; original XLSX parser/writer; simulated storage failures and revisions; no browser visual or Windows execution.',passed:results.filter(r=>r.status==='pass').length,failed:results.filter(r=>r.status==='fail').length,results},null,2));
 console.log(JSON.stringify({passed:results.filter(r=>r.status==='pass').length,failed:results.filter(r=>r.status==='fail').length}));if(results.some(r=>r.status==='fail'))process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1});
