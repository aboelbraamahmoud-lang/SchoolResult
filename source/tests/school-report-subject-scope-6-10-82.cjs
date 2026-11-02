/* School-wide subject selection must match the approved quantitative formulas. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ctx}=require('./harness.cjs').loadApp(),S=ctx.SR63;
const settings={schoolName:'مدرسة تجريبية',academicYear:'2026-2027',academicViceName:'نائب أكاديمي',principalName:'مدير المدرسة',
 pass:50,exams:[{key:'exam1',name:'السابق',total:100},{key:'exam2',name:'الحالي',total:100}],
 dashboardSubjects:['الرياضيات','اللغة العربية']};
const row=(id,subject,klass,oldGrade,current,total=100,status='present')=>({
 studentId:id,studentName:'طالب '+id,subject,department:subject,className:klass,
 examClasses:{exam1:klass,exam2:klass},
 scores:{exam1:oldGrade,exam2:current},statuses:{exam1:'present',exam2:status},
 totals:{exam1:total,exam2:total}
});
const ws={settings,activeExam:'exam2',rows:[
 row('A','الرياضيات','7/1',70,80),row('A','اللغة العربية','7/1',60,20),
 row('B','الرياضيات','7/2',50,60),row('B','اللغة العربية','7/2',80,100),
 row('C','العلوم','8/1',0,10,20),row('D','الرياضيات','9/1',40,null,100,'absent'),
 row('E','الرياضيات','07/ESE',90,100)
]};
function choices(){return S.schoolQuantitativeSubjectChoices(ws,'exam2');}
const names=Array.from(choices(),x=>x.name),math=choices().find(x=>x.name==='الرياضيات').key,arabic=choices().find(x=>x.name==='اللغة العربية').key,science=choices().find(x=>x.name==='العلوم').key;
assert.equal(names.length,3);
const all=S.schoolQuantitativeAnalyze(ws,'exam2'),explicitAll=S.schoolQuantitativeAnalyze(ws,'exam2',[math,arabic,science]);
assert.equal(all.scopeMode,'all');assert.equal(all.evaluated,5);assert.equal(all.studentCount,4);
assert.equal(all.success,80);assert.equal(all.achievement,64.3);assert.equal(all.grades['7'].success,75);
assert.equal(all.grades['7'].achievement,65);
assert.equal(all.evaluated,explicitAll.evaluated);assert.equal(all.success,explicitAll.success);
assert.equal(all.achievement,explicitAll.achievement);
const selected=S.schoolQuantitativeAnalyze(ws,'exam2',[math,arabic]);
assert.equal(selected.scopeMode,'selected');
assert.equal(selected.evaluated,4);assert.equal(selected.studentCount,3);
assert.equal(selected.success,75);assert.equal(selected.achievement,65);
assert.equal(selected.grades['7'].success,75);assert.equal(selected.grades['8'].success,null);
assert.equal(selected.subjectCount,2);assert.equal(selected.excludedCount,1);
assert.ok(selected.subjectScopeLabel.includes('الرياضيات')&&selected.subjectScopeLabel.includes('اللغة العربية'));
assert.ok(!selected.subjectScopeLabel.includes('العلوم'));
const onlyMath=S.schoolQuantitativeAnalyze(ws,'exam2',[math]);
assert.equal(onlyMath.evaluated,2);assert.equal(onlyMath.studentCount,3);
assert.equal(onlyMath.success,100);assert.equal(onlyMath.achievement,70);assert.equal(onlyMath.ungraded,1);
const none=S.schoolQuantitativeAnalyze(ws,'exam2',[]);
assert.equal(none.evaluated,0);assert.equal(none.studentCount,0);assert.equal(none.success,null);assert.equal(none.achievement,null);
assert.equal(none.subjectCount,0);
const preset=Array.from(S.schoolQuantitativeDashboardSubjects(ws,'exam2'));
assert.deepEqual(preset.slice().sort(),[math,arabic].sort(),'dashboard preset uses saved admin subject selection');
assert.equal(S.schoolQuantitativeAnalyze(ws,'exam2',preset).achievement,65);
const print=S.schoolQuantitativePrintBuild(selected);
assert.ok(print.body.includes('الرياضيات')&&print.body.includes('اللغة العربية'),'PDF includes selected subjects');
assert.ok(print.body.includes('المواد المستبعدة: العلوم'),'PDF identifies excluded subject');
assert.ok(print.body.includes('65.0%')||print.body.includes('>65<'),'PDF uses scoped totals');
assert.ok(!print.body.includes('طالب A'),'PDF contains no personal student data');
function zipParts(doc){const b=Buffer.from(doc.bytes),out={};let at=0;while(at+30<=b.length&&b.readUInt32LE(at)===0x04034b50){const size=b.readUInt32LE(at+18),n=b.readUInt16LE(at+26),e=b.readUInt16LE(at+28),name=b.subarray(at+30,at+30+n).toString('utf8'),start=at+30+n+e;out[name]=b.subarray(start,start+size);at=start+size;}return out;}
const word=S.schoolQuantitativeWordBuild(selected),xml=zipParts(word)['word/document.xml'].toString('utf8');
assert.ok(xml.includes('الرياضيات')&&xml.includes('اللغة العربية'),'Word identifies included subjects');
assert.ok(xml.includes('65.0%'),'Word uses scoped school achievement');
const originalWord=zipParts(S.schoolQuantitativeWordBuild(all))['word/document.xml'].toString('utf8');
assert.ok(originalWord.includes('جميع مواد المدرسة'),'all-subjects Word label remains compatible');
const source=fs.readFileSync(path.join(__dirname,'../src/school-quantitative.js'),'utf8');
for(const label of ['كل المواد','مواد لوحة التحكم','إلغاء تحديد الكل','اختر مادة واحدة على الأقل','disabled:!canExport||!report.subjectCount','SR63.schoolQuantitativeDashboardSubjects'])assert.ok(source.includes(label),'Missing report selector or print guard '+label);
assert.ok(!JSON.stringify(selected).includes('طالب A'),'aggregate model contains no student names');
console.log('PASS 6.10.82: all-vs-core subjects, weighted success/achievement, absent/ESE exclusion, grade/school totals, dashboard preset, PDF and Word scope');
