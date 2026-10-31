const assert=require('node:assert/strict'),{loadApp}=require('./harness.cjs');
const c=loadApp().ctx,S=c.SR63,w=c.zj(),sample=w.rows.slice(0,9);
w.rows=[];
for(let i=0;i<100;i++)for(let j=0;j<sample.length;j++)w.rows.push({...structuredClone(sample[j]),id:`r-${i}-${j}`,studentId:String(10000+i),studentName:'طالب '+i});
let calls=0;const original=S.reportSubjectEntries;
S.reportSubjectEntries=(...args)=>{calls++;return original(...args);};
const pages=S.studentResultPages(w,w.activeExam);
assert.equal(pages.length,100);
assert.ok(calls<100,'subject presentation work must scale with distinct subjects, not students: '+calls);
const subject=pages[0].results[0],key=subject.key;
const next={...w,settings:{...w.settings,subjectReportOrder:[{key,label:'اسم مادة محدث'}]}};
const changed=S.studentResultPages(next,w.activeExam);
assert.equal(changed[0].results.find(x=>x.key===key).subject,'اسم مادة محدث','new settings must invalidate presentation data');
assert.equal(pages[0].results.find(x=>x.key===key).subject,subject.subject);
for(let i=0;i<pages.length;i++){
 assert.equal(changed[i].scoreSum,pages[i].scoreSum);
 assert.equal(changed[i].totalSum,pages[i].totalSum);
 assert.equal(changed[i].average,pages[i].average);
 assert.deepEqual(changed[i].results.map(x=>[x.rowId,x.status,x.score]).sort(),pages[i].results.map(x=>[x.rowId,x.status,x.score]).sort());
}
console.log('PASS bounded subject presentation work, fresh labels and unchanged student scores');
