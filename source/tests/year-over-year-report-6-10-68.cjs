'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sourceRoot=path.join(__dirname,'..'),root=path.join(sourceRoot,'..');
const ts=fs.readFileSync(path.join(root,'supabase/functions/school-staff/year-over-year.ts'),'utf8');
const transpiled=require('esbuild').transformSync(ts,{loader:'ts',format:'cjs',target:'es2020'}).code;
const exported={exports:{}};new Function('module','exports',transpiled)(exported,exported.exports);
const {normalizedYear,previousAcademicYear,yearExamDataset,yearExamCompare}=exported.exports;
assert.equal(normalizedYear('2026-2027'),'2026/2027');assert.equal(normalizedYear('٢٠٢٦ / ٢٠٢٧'),'2026/2027');
assert.equal(previousAcademicYear('2026/2027'),'2025/2026');
assert.equal(previousAcademicYear('2026/2028'),'','invalid years should be rejected');
const exams=[{key:'exam1',name:'منتصف الفصل الأول',total:50},{key:'exam2',name:'نهاية الفصل الأول',total:50}];
const row=(studentId,grade,subject,score,max=50,status='present',support=false)=>({
 studentId,studentName:'اسم تجريبي',className:grade+'/1',grade,
 subject,department:subject,examClasses:{exam1:support?grade+'/ESE':grade+'/1'},
 scores:{exam1:score},totals:{exam1:max},statuses:{exam1:status}});
const previous={settings:{academicYear:'2025/2026',exams,pass:50},rows:[
 row('1','7','اللغة العربية',25),row('2','7','اللغة العربية',20),
 row('1','7','اللغة الإنجليزية',30),row('3','8','اللغة العربية',50),
 row('4','7','اللغة العربية',null,50,'unentered'),
 row('5','7','اللغة العربية',50,50,'present',true)]};
const current={settings:{academicYear:'2026/2027',schoolName:'مدرسة تجريبية',exams,pass:50},rows:[
 row('6','7','اللغة العربية',45),row('7','7','اللغة العربية',30),
 row('6','7','اللغة الإنجليزية',40),row('8','8','اللغة العربية',25),
 row('9','8','اللغة العربية',null,50,'unentered'),
 row('10','8','اللغة العربية',30,50,'present',true)]};
const result=yearExamCompare(current,previous,'exam1');
assert.equal(result.previousYear,'2025/2026');assert.equal(result.currentYear,'2026/2027');
assert.equal(result.school.previous.results,4);assert.equal(result.school.current.results,4);
assert.equal(result.school.previous.passed,3);assert.equal(result.school.current.passed,4);
assert.equal(result.school.previous.success,75);assert.equal(result.school.current.success,100);
assert.equal(result.school.successChange,25);
assert.equal(result.school.previous.students,3);assert.equal(result.school.current.students,3);
assert.equal(result.grades.length,2);
assert.equal(result.grades[0].grade,'7');assert.equal(result.grades[0].previous.results,3);
assert.equal(result.grades[0].current.results,3);
assert.equal(result.grades[1].grade,'8');assert.equal(result.grades[1].previous.results,1);
assert.equal(result.grades[1].current.results,1);
const scoped=yearExamCompare(current,previous,'exam1',['اللغة العربية']);
assert.equal(scoped.scope,'department');
assert.equal(scoped.school.previous.results,3);assert.equal(scoped.school.current.results,3);
assert.equal(scoped.school.previous.passed,2);assert.equal(scoped.school.current.passed,3);
assert.equal(scoped.school.previous.students,3);
assert.equal(yearExamDataset(current,'exam1',50,['اللغة الإنجليزية']).length,1,'English may see its own results');
assert.equal(yearExamDataset(current,'exam1',50,['اللغة العربية']).length,3,'coordinator may not see another subject');
const duplicate=structuredClone(current);duplicate.rows.push({...current.rows[0],id:'different-teacher-duplicate'});
assert.equal(yearExamCompare(duplicate,previous,'exam1').school.current.results,4,'duplicate student-subject-result counted once');
const invalid=structuredClone(previous);invalid.settings.academicYear='2024/2025';
assert.throws(()=>yearExamCompare(current,invalid,'exam1'),/ARCHIVE_YEAR_MISMATCH/);
assert.throws(()=>yearExamCompare(current,previous,'exam5'),/INVALID_EXAM/);
const missing=structuredClone(current);missing.rows=[];const empty=yearExamCompare(missing,previous,'exam1');
assert.equal(empty.school.current.success,null,'do not show missing current exams as 0%');
assert.equal(empty.noCurrentResults,true);
const ui=fs.readFileSync(path.join(sourceRoot,'src/year-over-year-ui.js'),'utf8');
const server=fs.readFileSync(path.join(root,'supabase/functions/school-staff/index.ts'),'utf8');
const build=fs.readFileSync(path.join(sourceRoot,'build.cjs'),'utf8');
const staff=fs.readFileSync(path.join(sourceRoot,'src/staff.js'),'utf8');
assert.match(server,/action==='year_comparison'/,'secure action wired');
assert.match(server,/profile\.permissions\.reports!==true/,'authorization checked');
assert.match(server,/eq\('owner_id',ownerId\)/,'year archive scoped by owner');
assert.match(server,/is\('deleted_at',null\)/,'ignore deleted archives');
assert.match(server,/yearExamCompare\(/,'same shared aggregate calculator');
assert.match(build,/year-over-year-ui\.js/,'UI source included in bundle');
assert.match(build,/SR63\.YearComparisonCenter,\{workspace:e/,'owner report center');
assert.match(staff,/h\(SR63\.YearComparisonCenter,\{workspace:active/,'school leaders and coordinator center');
assert.match(ui,/staffPrintHtml\(documentReport\(\)/,'uses audited A4 native print route');
assert.match(ui,/!r\.noCurrentResults&&!r\.noPreviousResults/,'no misleading empty-year print');
const v={createElement:(type,props,...children)=>({type,props,children}),
 useState:initial=>[initial,()=>{}],useEffect:()=>{}};
const ctx={SR63:{},v,console};vm.runInNewContext(ui,ctx,{timeout:10000});
const tree=ctx.SR63.YearComparisonCenter({workspace:{settings:{exams},activeExam:'exam1'},canPrint:true});
assert.match(JSON.stringify(tree),/مقارنة الاختبار المناظر بين العام الحالي والسابق/,'display report widget');
console.log('PASS 6.10.68: same exam across two actual academic years, school/grade success and achievement, staff scoping, archive checks, print UI');

assert.equal(result.subjects.length,2);
const arabic=result.subjects.find(x=>x.label==='اللغة العربية');
assert.equal(arabic.previous.success,66.7);assert.equal(arabic.current.success,100);
assert.equal(arabic.previous.achievement,63.3);assert.equal(arabic.current.achievement,66.7);
assert.equal(result.grades[0].subjects.length,2);
assert.equal(scoped.subjects.length,1);assert.equal(scoped.subjects[0].label,'اللغة العربية');
const oneYear=structuredClone(current);oneYear.rows.push(row('11','7','العلوم',45));
const science=yearExamCompare(oneYear,previous,'exam1').subjects.find(x=>x.label==='العلوم');
assert.equal(science.previous.success,null);assert.equal(science.successChange,null);
assert.equal(science.current.achievement,90);
assert.equal(result.school.current.achievement,70,'school total weighted by actual results, not average of subject percentages');
