/* Regression: top ten ranks by grade/subject, repeat ties, missing marks and coordinator visibility. */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"../src");
const moduleCode=fs.readFileSync(path.join(root,"student-top-ranks.js"),"utf8");
const uiCode=fs.readFileSync(path.join(root,"patches/ui.js"),"utf8");
const buildCode=fs.readFileSync(path.resolve(__dirname,"../build.cjs"),"utf8");
const SR63={
 generalRows:rows=>rows.filter(row=>!row.support),
 reconcileStudentRows:rows=>rows,
 subjectAliasKey:value=>String(value||"").trim().toLowerCase(),
 studentEntityKey:row=>"id:"+row.studentId,
 studentCanonicalId:row=>String(row.studentId),
 validResult:(row,exam)=>row.statuses[exam]==="present"&&Number.isFinite(row.scores[exam])&&row.scores[exam]>=0&&row.scores[exam]<=row.totals[exam],
 gradeOrder:value=>/السابع|^7/.test(value)?7:/الثامن|^8/.test(value)?8:/التاسع|^9/.test(value)?9:999,
 reportSubjectLabel:value=>value,
 reportSubjectCompare:(a,b)=>String(a).localeCompare(String(b),"ar"),
 staffReportEsc:value=>String(value),
 escape:value=>String(value)
};
const v={useMemo:callback=>callback(),useState:value=>[value,()=>{}],createElement:(type,props,...children)=>({type,props,children})};
const ctx={SR63,v,gj:row=>row.grade,hj:row=>row.className,ij:value=>String(value).toLowerCase(),lj:value=>String(value).toLowerCase(),pj:(row,exam)=>row.totals[exam]};
vm.runInNewContext(moduleCode,ctx,{timeout:10000});
const record=(id,subject,score,status="present",grade="السابع",className="7/1")=>({
 studentId:String(id),studentName:"طالب "+id,grade,className,subject,scores:{exam1:score},statuses:{exam1:status},totals:{exam1:100}
});
const rows=[];
for(let id=1;id<=12;id++){const mark=id<=2?100:100-(id-2)*5;rows.push(record(id,"اللغة العربية",mark),record(id,"الرياضيات",mark));}
// A grade's missing subject must not remove a student who scored 100% in the assessed subject.
rows.push(record(13,"اللغة العربية",100),record(13,"الرياضيات",null,"absent"));
rows.push(record(80,"اللغة العربية",100,"present","الثامن","8/1"),record(80,"الرياضيات",null,"absent","الثامن","8/1"));
rows.push(record(81,"اللغة العربية",97,"present","8","8/2"),record(81,"الرياضيات",97,"present","8","8/2"));
rows.push(record(82,"اللغة العربية",96,"present","الصف الثامن","8/3"),record(82,"الرياضيات",96,"present","الصف الثامن","8/3"));
rows.push(record(84,"اللغة العربية",100,"present","الثامن","8/4"),record(84,"الرياضيات",100,"present","الثامن","8/4"));
rows.push(record(85,"اللغة العربية",null,"absent","الثامن","8/5"));
rows.push(record(86,"اللغة العربية",100,"present","الثامن","8/6"),record(86,"اللغة العربية",90,"present","الثامن","8/6"));
rows.push(record(91,"اللغة العربية",88,"present","التاسع","9/1"));
const workspace={activeExam:"exam1",settings:{schoolName:"مدرسة اختبار",exams:[{key:"exam1",name:"اختبار"}]},rows};
const grades=SR63.studentTopRankings(workspace,{exam:"exam1",mode:"grade"});
assert.equal(grades.length,3,"include grades seven, eight and nine");
assert.equal(grades[0].eligible,13,"the missing-subject student still participates in grade seven");
assert.equal(grades[0].incompleteCount,1);
assert.equal(grades[0].excluded,0,"do not discard scored students for an absent subject");
assert.equal(grades[0].rows[0].position,"الأول مكرر");
assert.equal(grades[0].rows[1].position,"الأول مكرر");
assert.equal(grades[0].rows[2].position,"الأول مكرر");
assert.equal(grades[0].rows[3].position,"الثاني","dense ranks after tie");
assert.equal(grades[0].rows.length,12,"include all students within ten distinct ranks");
const eighth=grades.find(g=>g.grade==="الثامن");
assert.ok(eighth,"there must be one grade-eight report across every class and grade alias");
assert.equal(grades.filter(g=>/الثامن|^8/.test(g.grade)).length,1,"grade aliases share the same ranking");
assert.ok(eighth.rows.some(r=>r.studentId==="80"&&r.percentage===100),"grade-eight 100% student with missing result must be visible");
assert.ok(eighth.rows.some(r=>r.studentId==="84"&&r.percentage===100),"grade-eight 100% complete student must be visible");
assert.equal(eighth.rows.find(r=>r.studentId==="80").position,"الأول مكرر","perfect students tie");
assert.equal(eighth.rows.find(r=>r.studentId==="80").complete,false,"partial result is declared");
assert.equal(eighth.rows.find(r=>r.studentId==="84").complete,true);
assert.equal(eighth.conflictCount,1,"contradictory duplicate scores must be flagged, not silently chosen");
assert.equal(eighth.unscoredCount,1,"a student with no graded subjects does not get a fake zero");
const completeOnly=SR63.studentTopRankings(workspace,{exam:"exam1",mode:"grade",onlyComplete:true});
assert.ok(!completeOnly.some(g=>g.rows.some(r=>r.studentId==="80")),"optional complete-only filter removes partial grades");
assert.ok(completeOnly.some(g=>g.rows.some(r=>r.studentId==="84")),"complete-only keeps full results");
const subjects=SR63.studentTopRankings(workspace,{exam:"exam1",mode:"subject",grade:"السابع",subject:"اللغة العربية"});
assert.equal(subjects.length,1,"subject filter");
assert.equal(subjects[0].rows[0].position,"الأول مكرر");
assert.ok(subjects[0].rows.length>10,"tenth place can include extra names");
assert.equal(SR63.studentTopRankings(workspace,{exam:"exam1",mode:"grade",groupType:"class"}).length,8,"class mode groups sections separately");
const support=record("support","اللغة العربية",100);support.support=true;
assert.equal(SR63.studentTopRankings({...workspace,rows:[...rows,support]},{mode:"grade"})[0].rows.length,12);
assert.match(uiCode,/topGradeCard=\{id:\x60topGrade\x60/);
assert.match(uiCode,/topSubjectCard=\{id:\x60topSubject\x60/);
assert.match(uiCode,/departmentMode\?\[\]:\[topGradeCard\]/,"coordinator cannot open full-grade top ranks");
assert.match(uiCode,/n===\x60topGrade\x60\|\|n===\x60topSubject\x60/);
assert.match(buildCode,/student-top-ranks\.js/,"module included in builds");
const tree=SR63.StudentTopRanksCenter({workspace,mode:"grade",canPrint:true});
assert.ok(JSON.stringify(tree).includes("المراكز العشرة الأولى"));
console.log("PASS: top-ten school/subject/class rankings, ties, missing grades, ESE isolation, lazy cards and print module.");
