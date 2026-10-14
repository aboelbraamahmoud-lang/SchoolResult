/* Regression 6.10.44: chronological direction, non-duplication, print/Word
   shared official form, and role-scoped report center remain consistent. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadApp}=require('./harness.cjs');
const {ctx}=loadApp(),S=ctx.SR63;
const exams=['exam1','exam2','exam3','exam4'].map((key,i)=>({key,name:['منتصف الأول','نهاية الأول','منتصف الثاني','نهاية الثاني'][i],total:100}));
const row=(id,klass,subject,grades,options={})=>({studentId:id,studentName:'طالب '+id,className:klass,subject,department:subject,teacher:'معلم',examClasses:Object.fromEntries(exams.map(x=>[x.key,klass])),scores:Object.fromEntries(exams.map((x,i)=>[x.key,grades[i]??null])),statuses:Object.fromEntries(exams.map((x,i)=>[x.key,grades[i]==null?'absent':'present'])),totals:Object.fromEntries(exams.map(x=>[x.key,100])),...options});
const w={activeExam:'exam1',settings:{schoolName:'مدرسة تجريبية',academicYear:'2026/2027',principalName:'مدير تجريبي',academicViceName:'نائب تجريبي',exams,pass:50,bands:[]},rows:[
 row('a','7/1','رياضيات',[40,75,80,90]),row('a','7/1','رياضيات',[40,75,80,90]),
 row('b','7/1','علوم',[60,80,null,95]),
 row('c','8/1','رياضيات',[80,65,55,null]),
 row('d','7/ESE','رياضيات',[12,20,32,40])
]};
const reversed=S.staffExamChronology(w.settings,'exam2','exam1');
assert.equal(reversed.older,'exam1');assert.equal(reversed.later,'exam2');
assert.equal(S.staffExamChronology(w.settings,'exam3','exam3'),null);
const cmp=S.staffExamComparison(w,'exam2','exam1');
const a=cmp.find(x=>x.className==='7/1');
assert.equal(a.previousCount,2,'one student-subject once per exam');
assert.equal(a.currentCount,2);assert.equal(a.previous,50);assert.equal(a.current,77.5);assert.equal(a.change,27.5,'change always later minus earlier');
assert.ok(!cmp.some(x=>x.className.includes('ESE')),'general-education comparison excludes support');
assert.deepEqual(JSON.stringify(S.staffExamComparison(w,'exam1','exam2')),JSON.stringify(cmp));
const missing=S.staffExamComparison(w,'exam1','exam3').find(x=>x.className==='7/1');
assert.equal(missing.previousCount,2);assert.equal(missing.currentCount,1);
const report=S.schoolQuantitativeAnalyze(w,'exam2'),edits={targets:{success:'90',achievement:'75',high90:'10'},interpretation:'نص تحليل مشترك مع Word',recommendations:'توصيات موحّدة من النائب إلى المدير'};
const print=S.schoolQuantitativePrintBuild(report,edits),official=S.schoolQuantitativeOfficialRows(report,edits);
assert.equal(print.official,true);assert.ok(print.css.includes('A4 portrait'));assert.ok(!print.body.includes('<svg'),'Word-form print may not silently add charts absent in official Word');
assert.equal(official.length,5,'five current+previous official form slots');
for(const x of official){assert.ok(print.body.includes(x.label));for(const cell of [...x.grades,x.school,x.target])assert.ok(print.body.includes(cell));}
for(const t of [edits.interpretation,edits.recommendations,'اسم النائب الأكاديمي وتوقيعه','اطلاع واعتماد مدير المدرسة','نموذج تقرير كمي وصفي'])assert.ok(print.body.includes(t));
const doc=S.schoolQuantitativeWordBuild(report,edits);
let at=0,xml='';const bytes=Buffer.from(doc.bytes);
while(bytes.readUInt32LE(at)===0x04034b50){const size=bytes.readUInt32LE(at+18),len=bytes.readUInt16LE(at+26),extra=bytes.readUInt16LE(at+28),name=bytes.subarray(at+30,at+30+len).toString('utf8'),dataAt=at+30+len+extra;if(name==='word/document.xml')xml=bytes.subarray(dataAt,dataAt+size).toString('utf8');at=dataAt+size;}
const wordText=[...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m=>m[1]).join('');
assert.ok(wordText.includes('نموذج تقرير'));for(const t of [edits.interpretation,edits.recommendations,report.principalName,report.academicViceName])assert.ok(wordText.includes(t));
for(const x of official){assert.ok(wordText.includes(x.label),'same official metrics in Word: '+x.label);for(const val of [...x.grades,x.school,x.target])assert.ok(wordText.includes(val),'Word missing official output: '+val);}
const source=fs.readFileSync(path.join(__dirname,'../src/patches/ui.js'),'utf8');
for(const t of ['leaderCards=leaderMode?', 'sr644-report-thumb','onSchoolSummary','تحصيل المعلمين','مقارنة جميع المواد'])assert.ok(source.includes(t));
const css=fs.readFileSync(path.join(__dirname,'../src/repair.css'),'utf8');assert.ok(css.includes('sr644-leader-report-cards'));
if(process.env.SR644_SAMPLE){
 const out=path.resolve(__dirname,'../../qa644');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'word.docx'),doc.bytes);
 ctx.document={baseURI:'file://'+path.resolve(__dirname,'../../index.html')};fs.writeFileSync(path.join(out,'print.html'),S.staffReportDocument(print,{schoolName:report.schoolName,academicYear:report.academicYear}));
}
console.log('PASS v6.10.44: reverse order, deduplication, ESE exclusion, missing grades, identical Word/PDF model, six focused leadership choices');
