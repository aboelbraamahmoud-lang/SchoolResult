/* Regression: top ten ranks by grade/subject, repeat ties, missing marks and coordinator visibility. */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"../src");
const moduleCode=fs.readFileSync(path.join(root,"student-top-ranks.js"),"utf8");
const uiCode=fs.readFileSync(path.join(root,"patches/ui.js"),"utf8");
const buildCode=fs.readFileSync(path.resolve(__dirname,"../build.cjs"),"utf8");
const SR63={
 generalRows:rows=>rows.filter(row=>!row.support),
 subjectAliasKey:value=>String(value||"").trim().toLowerCase(),
 studentEntityKey:row=>"id:"+row.studentId,
 studentCanonicalId:row=>String(row.studentId),
 validResult:(row,exam)=>row.statuses[exam]==="present"&&Number.isFinite(row.scores[exam])&&row.scores[exam]>=0&&row.scores[exam]<=row.totals[exam],
 gradeOrder:value=>value==="السابع"?7:8,
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
rows.push(record(13,"اللغة العربية",100),record(13,"الرياضيات",null,"absent"));
rows.push(record(99,"اللغة العربية",80,"present","الثامن","8/1"));
const workspace={activeExam:"exam1",settings:{schoolName:"مدرسة اختبار",exams:[{key:"exam1",name:"اختبار"}]},rows};
const grades=SR63.studentTopRankings(workspace,{exam:"exam1",mode:"grade"});
assert.equal(grades.length,2,"group every grade separately");
assert.equal(grades[0].excluded,1,"exclude incomplete full-grade results");
assert.equal(grades[0].rows[0].position,"الأول مكرر");
assert.equal(grades[0].rows[1].position,"الأول مكرر");
assert.equal(grades[0].rows[2].position,"الثاني","dense ranks after tie");
assert.equal(grades[0].rows.length,11,"include all students within ten distinct ranks");
const subjects=SR63.studentTopRankings(workspace,{exam:"exam1",mode:"subject",grade:"السابع",subject:"اللغة العربية"});
assert.equal(subjects.length,1,"subject filter");
assert.equal(subjects[0].rows[0].position,"الأول مكرر");
assert.ok(subjects[0].rows.length>10,"tenth place can include extra names");
assert.equal(SR63.studentTopRankings(workspace,{exam:"exam1",mode:"grade",groupType:"class"}).length,2);
const support=record("support","اللغة العربية",100);support.support=true;
assert.equal(SR63.studentTopRankings({...workspace,rows:[...rows,support]},{mode:"grade"})[0].rows.length,11);
assert.match(uiCode,/topGradeCard=\{id:\x60topGrade\x60/);
assert.match(uiCode,/topSubjectCard=\{id:\x60topSubject\x60/);
assert.match(uiCode,/departmentMode\?\[\]:\[topGradeCard\]/,"coordinator cannot open full-grade top ranks");
assert.match(uiCode,/n===\x60topGrade\x60\|\|n===\x60topSubject\x60/);
assert.match(buildCode,/student-top-ranks\.js/,"module included in builds");
const tree=SR63.StudentTopRanksCenter({workspace,mode:"grade",canPrint:true});
assert.ok(JSON.stringify(tree).includes("المراكز العشرة الأولى"));
console.log("PASS: top-ten school/subject/class rankings, ties, missing grades, ESE isolation, lazy cards and print module.");
