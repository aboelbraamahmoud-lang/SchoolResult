const assert=require('assert/strict'),{loadApp}=require('./harness.cjs');
const {ctx:c}=loadApp();
const base=c.Aj(),exam='exam1';
function row(id,teacher,cls='8/1',subject='العلوم'){return {id,studentId:id,studentName:'طالب '+id,className:cls,grade:'الثامن',subject,department:'العلوم',teacher,scores:{exam1:20,exam2:20,exam3:null,exam4:null},statuses:{exam1:'present',exam2:'present',exam3:'unentered',exam4:'unentered'},totals:{exam1:30,exam2:30,exam3:30,exam4:40},examClasses:{exam1:cls,exam2:cls,exam3:cls,exam4:cls},examTeachers:{exam1:teacher,exam2:teacher,exam3:teacher,exam4:teacher},importBatches:{exam1:null,exam2:null,exam3:null,exam4:null}}}
const rows=[row('A1','المعلم أ'),row('A2','المعلم أ'),row('B1','المعلم ب'),row('C1','المعلم ج','8/2'),row('D1','المعلم أ','8/1','الرياضيات')];
base.rows=rows;
const teacherPage={scope:'teacher',entity:'المعلم أ',teacher:'المعلم أ',subject:'العلوم',rows,allRows:rows};
const scoped=c.SR63.normalizeReportPage(teacherPage,'summary',exam,base);
assert.equal(scoped.rows.length,2,'teacher report must contain only selected teacher + subject');
assert.ok(scoped.rows.every(r=>c.mj(r,exam)==='المعلم أ'&&r.subject==='العلوم'));
assert.equal(c.SR63.reportScopeAudit(teacherPage,'summary',exam).leaks,0);
for(const mode of ['summary','levels','struggling','teachers','comparison']){
 const p=c.SR63.normalizeReportPage(teacherPage,mode,exam,base);assert.equal(p.rows.length,2,mode+' leaked rows');
}
const classPage={scope:'className',entity:'8/1',className:'8/1',subject:'العلوم',rows,allRows:rows};
const classScoped=c.SR63.normalizeReportPage(classPage,'summary',exam,base);
assert.equal(classScoped.rows.length,3,'class report should include all teachers in selected class/subject');
assert.deepEqual([...new Set(classScoped.rows.map(r=>c.mj(r,exam)))].sort(),['المعلم أ','المعلم ب']);
const gradePage={scope:'grade',entity:'الثامن',grade:'الثامن',subject:'كل المواد',rows,allRows:rows};
assert.equal(c.SR63.normalizeReportPage(gradePage,'summary',exam,base).rows.length,5);
const aggregate=c.SR63.normalizeReportPage({...teacherPage,rows},'subjects',exam,base);assert.equal(aggregate.rows.length,rows.length,'aggregate subject report must keep its dedicated matrix scope');
console.log(JSON.stringify({passed:10,failed:0,checks:['teacher isolation','subject isolation','class scope','grade scope','summary','levels','struggling','teachers','comparison','aggregate bypass']}));
