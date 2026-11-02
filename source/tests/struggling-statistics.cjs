const assert=require('node:assert/strict');
const {ctx}=require('./harness.cjs').loadApp(),S=ctx.SR63;
const ws=ctx.zj();ws.activeExam='exam1';ws.settings.pass=50;
const row=(id,subject,p,className='7/1',extra={})=>({
 id:id+subject,studentId:id,studentName:'طالب تجريبي '+id,className,subject,teacher:'معلم',
 scores:{exam1:p,exam2:90},totals:{exam1:100,exam2:100},
 statuses:{exam1:p===null?'absent':'present',exam2:'present'},...extra
});
ws.rows=[
 row('A','التربية الإسلامية',40),row('A','اللغة العربية',30),
 row('A','اللغة العربية',30,'7/1',{id:'repeated-different-import'}),
 row('B','الرياضيات',49,'7/2'),row('C','اللغة العربية',20,'8/1'),
 row('C','اللغة الإنجليزية',30,'8/1'),
 row('D','الرياضيات',49,'9/1'),row('D','اللغة الإنجليزية',48,'9/1'),
 row('E','العلوم',90,'9/2'),row('F','الرياضيات',null,'8/2'),
 row('G','التربية الإسلامية',0,'7/ESE')
];
const m=S.strugglingStatistics(ws);
const subject=name=>m.subjectRows.find(x=>x.subject===name)?.count;
const grade=n=>m.gradeRows.find(x=>x.grade===n)?.count;
const cls=name=>m.classRows.find(x=>x.className===name)?.count;
assert.equal(m.totalStudents,5,'school total counts each failed student once');
assert.equal(m.failedSubjectRecords,8,'subject total counts distinct student + subject failures');
assert.equal(subject('التربية الإسلامية'),2);
assert.equal(subject('اللغة العربية'),2);
assert.equal(subject('الرياضيات'),2);
assert.equal(subject('اللغة الإنجليزية'),2);
assert.equal(subject('العلوم'),0,'subjects with recorded passing grades remain listed as zero');
assert.deepEqual([grade(7),grade(8),grade(9)],[3,1,1]);
assert.equal(m.gradeRows.reduce((n,r)=>n+r.count,0),m.totalStudents);
assert.equal(cls('7/1'),1);assert.equal(cls('7/2'),1);assert.equal(cls('7/ESE'),1);
assert.equal(cls('8/1'),1);assert.equal(cls('9/1'),1);assert.equal(cls('9/2'),0);
assert.equal(m.classRows.reduce((n,r)=>n+r.count,0),m.totalStudents);
assert.equal(S.strugglingStatistics(ws,'exam2').totalStudents,0,'explicit selected exam controls the figures');
assert.equal(S.strugglingStatistics({...ws,rows:ws.rows.filter(r=>r.studentId==='A')}).totalStudents,1,'no data outside authorized workspace');
assert.equal(S.strugglingStatistics({...ws,rows:ws.rows.filter(r=>r.subject==='اللغة العربية')}).totalStudents,2,'school totals respect subject-restricted permissions');
const pages=S.buildReportPages(ws.rows,'className','الكل','الكل','strugglingStats','exam1',50,ws.settings);
assert.equal(pages[0].statsPart,'overview');
assert.equal(pages[1].statsPart,'classes');
assert.equal(pages[0].rows.length,ws.rows.length);
assert.equal(pages[0].part,1);assert.equal(pages[1].totalParts,pages.length);
const long={...ws,rows:Array.from({length:39},(_,i)=>row('Q'+i,'الرياضيات',20,'7/'+(i+1)))};
const many=S.strugglingStatsPages(long.rows,'exam1',ws.settings);
assert.equal(many.length,4,'one overview + three 16-class continuation pages');
assert.deepEqual(Array.from(many.slice(1),p=>p.classChunk.length),[16,16,7]);
const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../build.cjs'),'utf8');
assert.ok(source.includes("id:\`strugglingStats\`"),'new report center card is wired');
assert.ok(source.includes("SR63.StrugglingStatsPanel"),'struggling page overview is wired');
assert.ok(source.includes("SR63.StrugglingStatsReport"),'report preview and print rendering is wired');
console.log('PASS statistics: unique school/grade/class counts, per-subject totals, zero failures, ESE, selected exam, scoped permissions and printable pagination');
