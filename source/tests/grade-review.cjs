const assert=require('node:assert/strict');
const {loadApp}=require('./harness.cjs');
const c=loadApp().ctx,SR=c.SR63;
const tests=[];function test(label,fn){try{fn();tests.push([label,true]);console.log('PASS '+label);}catch(error){tests.push([label,false]);console.error('FAIL '+label+' '+error.stack);}}
const make=(id,name,cls,sub,score,status='present')=>({
  id:`r-${id}-${sub}`,studentId:id,studentName:name,className:cls,grade:c.uj(cls),subject:sub,department:sub,teacher:'أ. معلم',
  scores:{exam1:score,exam2:24,exam3:null,exam4:null},statuses:{exam1:status,exam2:'present',exam3:'unentered',exam4:'unentered'},
  totals:{exam1:20,exam2:30,exam3:30,exam4:40},examTeachers:{exam1:'أ. معلم',exam2:'أ. معلم',exam3:'',exam4:''},
  examClasses:{exam1:cls,exam2:cls,exam3:'',exam4:''},importBatches:{exam1:'B',exam2:'B2',exam3:null,exam4:null}
});
const workspace=()=>{const w=c.Aj();w.rows=[make('A1','أحمد','7/1','علوم',16),make('A1','أحمد','7/1','عربي',null,'excused'),make('B2','بدر','7/2','علوم',0),make('E1','طالب دعم','7/ESE','علوم',null,'deprived')];w.subjects=[{id:'S-science',name:'علوم',department:'علوم',active:true},{id:'S-arabic',name:'عربي',department:'عربي',active:true}];return w;};
const request=(row,change)=>({rowId:row.id,subject:row.subject,className:row.className,studentId:row.studentId,studentName:row.studentName,status:row.statuses.exam1,score:row.scores.exam1,...change});
test('student appears once across multiple subjects and selectable exam',()=>{const w=workspace(),pages=SR.gradeReviewPages(w,'exam1');assert.equal(pages.length,3);const p=pages.find(p=>p.studentId==='A1');assert.ok(p);assert.ok(p.results.find(x=>x.rawSubject==='علوم')?.rowId);assert.ok(p.results.find(x=>x.rawSubject==='عربي')?.rowId);});
test('missing grade and absence reasons exclude a real zero',()=>{const w=workspace(),pages=SR.gradeReviewPages(w,'exam1');const general=SR.gradeReviewExceptions(pages,{cohort:'general'});assert.ok(general.some(r=>r.studentId==='A1'&&r.reason==='excused'));assert.ok(!general.some(r=>r.studentId==='B2'&&r.reason==='unentered'&&r.rawSubject==='علوم'));assert.ok(!general.some(r=>r.studentId==='E1'));const support=SR.gradeReviewExceptions(pages,{cohort:'support'});assert.ok(support.some(r=>r.reason==='deprived'));assert.ok(!support.some(r=>r.studentId==='A1'));});
test('partial grades separate from incomplete grades',()=>{const w=workspace(),pages=SR.gradeReviewPages(w,'exam1'),filtered=SR.gradeReviewExceptions(pages,{cohort:'general',reason:'partial'});assert.ok(filtered.some(r=>r.studentId==='A1'&&r.rawSubject==='علوم'));assert.ok(filtered.some(r=>r.studentId==='B2'&&r.rawSubject==='علوم'));assert.ok(SR.gradeReviewExceptions(pages,{cohort:'general'}).every(r=>r.reason!=='partial'));});
test('editing one exam preserves other exams and historical teacher',()=>{const w=workspace(),row=w.rows[0],out=SR.gradeReviewApply(w,'exam1',request(row,{status:'present',score:'18.5'})),next=out.rows[0];assert.equal(next.scores.exam1,18.5);assert.equal(next.scores.exam2,24);assert.equal(next.statuses.exam2,'present');assert.equal(next.teacher,'أ. معلم');assert.equal(next.importBatches.exam1,null);assert.equal(next.importBatches.exam2,'B2');assert.equal(w.rows[0].scores.exam1,16);});
test('status change clears score instead of turning empty into zero',()=>{const w=workspace(),row=w.rows[0],out=SR.gradeReviewApply(w,'exam1',request(row,{status:'absent',score:''})),next=out.rows[0];assert.equal(next.statuses.exam1,'absent');assert.equal(next.scores.exam1,null);});
test('present empty, negative, above total, and nonnumeric values rejected',()=>{const w=workspace(),r=w.rows[0];for(const value of ['',null,'21','-2','bad','Infinity'])assert.throws(()=>SR.gradeReviewApply(w,'exam1',request(r,{status:'present',score:value})));});
test('zero score is valid, unchanged zero is not a missing grade',()=>{const w=workspace(),r=w.rows[2],out=SR.gradeReviewApply(w,'exam1',request(r,{status:'present',score:'0'}));assert.strictEqual(out,w);});
test('invalid exam or unknown student rejected',()=>{const w=workspace(),r=w.rows[0];assert.throws(()=>SR.gradeReviewApply(w,'bad',request(r,{score:12})));assert.throws(()=>SR.gradeReviewApply(w,'exam1',request(r,{studentId:'other',score:12})));});
test('old duplicate subject blocks manual edits',()=>{const w=workspace(),r=w.rows[0];w.rows.push({...r,id:'duplicate'});assert.throws(()=>SR.gradeReviewApply(w,'exam1',request(r,{score:10})),/مكررة/);});
test('ESE status editing keeps support department and separate class',()=>{const w=workspace(),r=w.rows[3],out=SR.gradeReviewApply(w,'exam1',request(r,{status:'present',score:'12'}));assert.equal(out.rows[3].department,'علوم');assert.equal(out.rows[3].className,'7/ESE');assert.equal(out.rows[3].scores.exam1,12);assert.ok(SR.gradeReviewExceptions(SR.gradeReviewPages(out,'exam1'),{cohort:'general'}).every(x=>x.studentId!=='E1'));});
test('creating previously unrecorded expected subject requires a single teacher assignment',()=>{const w=workspace(),r=w.rows[2];assert.throws(()=>SR.gradeReviewApply(w,'exam1',request(r,{rowId:null,subject:'عربي',status:'present',score:'15'})),/إسناد/);});
test('add new missing subject score with a unique teacher assignment, without duplicating student',()=>{
 const w=workspace(),seed=w.rows.find(r=>r.studentId==='B2');
 w.teachers=[{id:'T-AR',teacher:'أ. اللغة العربية',subject:'عربي',classes:['7/2'],subjects:['عربي'],active:true}];
 w.teacherAssignments=[{id:'A-AR',profileId:'T-AR',teacher:'أ. اللغة العربية',subject:'عربي',department:'عربي',className:'7/2',grade:c.uj('7/2'),active:true}];
 const ready=SR.withCatalog(w);
 const next=SR.gradeReviewApply(ready,'exam1',{studentId:'B2',studentName:seed.studentName,className:'7/2',subject:'عربي',rowId:null,status:'present',score:'13'});
 assert.equal(next.rows.length,ready.rows.length+1);
 const row=next.rows.at(-1);assert.equal(row.studentId,'B2');assert.equal(row.subject,'عربي');assert.equal(row.teacher,'أ. اللغة العربية');
 assert.equal(row.scores.exam1,13);assert.equal(row.scores.exam2,null);
 assert.equal(new Set(next.rows.map(x=>x.studentId)).size,3);
 assert.throws(()=>SR.gradeReviewApply(next,'exam1',{studentId:'B2',studentName:seed.studentName,className:'7/2',subject:'عربي',rowId:null,status:'present',score:16}),/أضيفت المادة بالفعل/);
});
test('display label settings do not change persisted subject identity',()=>{const w=workspace(),r=w.rows[0];w.settings.subjectReportOrder=[{key:SR.subjectAliasKey('علوم'),label:'العلوم التجريبية'}];const pages=SR.gradeReviewPages(w,'exam1');assert.ok(pages.some(p=>p.results.some(x=>x.subject==='العلوم التجريبية'&&x.rawSubject==='علوم')));const next=SR.gradeReviewApply(w,'exam1',request(r,{score:'17'}));assert.equal(next.rows[0].subject,'علوم');});
const failed=tests.filter(x=>!x[1]);console.log(`Grade review tests passed: ${tests.length-failed.length}/${tests.length}`);if(failed.length)process.exitCode=1;
