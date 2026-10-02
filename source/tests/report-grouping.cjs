const assert=require('assert/strict'),{loadApp}=require('./harness.cjs');
const {ctx:c}=loadApp();
const w=c.zj(),exam=w.activeExam,rows=w.rows;
const pages=c.SR63.reportTeacherSequence(rows,exam,'الكل','كل المواد');
assert.ok(pages.length>0,'teacher pages missing');
for(const page of pages){
  assert.ok(page.teacher,'teacher missing');
  assert.ok(page.subject&&page.subject!=='كل المواد','teacher page must have one subject');
  assert.ok(page.rows.length>0,'teacher page empty');
  assert.ok(page.rows.every(row=>c.ij(c.mj(row,exam))===c.ij(page.teacher)),'teacher leak');
  assert.ok(page.rows.every(row=>c.ij(row.subject)===c.ij(page.subject)),'subject leak');
}
const subjects=c.SR63.reportSubjectOrder(rows,exam);
let last=-1;
for(const page of pages){const i=subjects.findIndex(s=>c.ij(s)===c.ij(page.subject));assert.ok(i>=last,'pages are not grouped by subject');last=i;}
const chosenSubject=subjects[0],subjectPages=c.SR63.reportTeacherSequence(rows,exam,'الكل',chosenSubject);
assert.ok(subjectPages.length>0&&subjectPages.every(page=>c.ij(page.subject)===c.ij(chosenSubject)),'subject filter failed');
const chosen=pages[0],normalized=c.SR63.normalizeReportPage({...chosen,subject:'كل المواد'},'summary',exam,w);
assert.equal(c.ij(normalized.subject),c.ij(chosen.subject),'teacher subject was not resolved into report page');
const comparisonPage={...chosen,subject:'كل المواد'};
assert.equal(c.SR63.reportDisplaySubject(comparisonPage,exam),chosen.subject,'header subject resolution failed');
console.log(JSON.stringify({passed:true,pages:pages.length,subjects:subjects.length}));
