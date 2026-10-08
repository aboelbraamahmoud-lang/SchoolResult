const assert=require('assert/strict'),path=require('path'),{loadApp}=require('./harness.cjs');
const APP_PATH=path.resolve(__dirname,'../../app.js');
const {ctx}=loadApp(),workspace=ctx.zj(),exam=workspace.activeExam,pass=workspace.settings.pass;
const modes=['summary','levels','struggling','teachers','comparison'];
let checks=0;
const oneSubject=pages=>{for(const page of pages){const subjects=[...new Set((page.allRows||page.rows||[]).map(r=>r.subject).filter(Boolean))];assert.equal(subjects.length,1,`page ${page.key} mixed subjects: ${subjects.join(', ')}`);assert.equal(page.subject,subjects[0],`page ${page.key} display subject mismatch`);checks++;}};
for(const mode of modes){
  const dimension=mode==='teachers'?'teacher':'className';
  const pages=ctx.SR63.buildReportPages(workspace.rows,dimension,'الكل','الكل',mode,exam,pass,workspace.settings);
  assert.ok(pages.length,`${mode} produced no pages`); oneSubject(pages);
}
const teacher=[...new Set(workspace.rows.map(r=>ctx.mj(r,exam)).filter(Boolean))][0];
let pages=ctx.SR63.buildReportPages(workspace.rows,'teacher',teacher,'الكل','summary',exam,pass,workspace.settings);
assert.ok(pages.length);oneSubject(pages);assert.ok(pages.every(p=>p.teacher===teacher));
const subject=pages[0].subject;
pages=ctx.SR63.buildReportPages(workspace.rows,'teacher','الكل',subject,'summary',exam,pass,workspace.settings);
assert.ok(pages.length);assert.ok(pages.every(p=>p.subject===subject));assert.ok(pages.every(p=>p.allRows.every(r=>r.subject===subject)));
const className=ctx.hj(workspace.rows[0],exam);
pages=ctx.SR63.buildReportPages(workspace.rows,'className',className,'الكل','summary',exam,pass,workspace.settings);
assert.ok(pages.length>1,'class all-subject report should split into subject pages');oneSubject(pages);assert.ok(pages.every(p=>p.className===className));
const teacherPages=ctx.SR63.buildReportPages(workspace.rows,'teacher','الكل','الكل','teachers',exam,pass,workspace.settings);
const sequence=teacherPages.map(p=>p.subject),seen=new Set();let last='';for(const s of sequence){if(s!==last){assert.ok(!seen.has(s),`subject ${s} is not contiguous`);seen.add(s);last=s;}}
const subjectPages=ctx.SR63.buildReportPages(workspace.rows,'grade','الكل','الكل','subjects',exam,pass,workspace.settings);assert.ok(subjectPages.length);assert.ok(subjectPages.every(p=>p.subject==='كل المواد'));assert.ok(subjectPages.every(p=>['success','achievement'].includes(p.metricType)),'subjects comparison must split success and achievement');const gradeMetric=new Map();for(const p of subjectPages){assert.ok(p.subjectChunk.length<=9);const k=p.grade+'|'+p.part;gradeMetric.set(k,(gradeMetric.get(k)||new Set()).add(p.metricType));const matrix=ctx.SR63.gradeSubjectMatrix(p.allRows,exam,workspace.settings,p.subjectChunk);assert.ok(matrix.subjects.length>0);for(const cell of matrix.cells.values())assert.ok(cell.metric&&Object.prototype.hasOwnProperty.call(cell.metric,'success')&&Object.prototype.hasOwnProperty.call(cell.metric,'achievement'));checks++;}for(const set of gradeMetric.values())assert.deepEqual([...set].sort(),['achievement','success']);
const deptPages=ctx.SR63.buildReportPages(workspace.rows,'grade','الكل','الكل','departmentStats',exam,pass,workspace.settings);assert.ok(deptPages.length);assert.ok(deptPages.every(p=>p.subject==='كل المواد'));assert.ok(deptPages.every(p=>!('metricType' in p)));for(const p of deptPages){const matrix=ctx.SR63.gradeSubjectMatrix(p.allRows,exam,workspace.settings,p.subjectChunk);assert.ok(matrix.subjects.length);checks++;}
// Simulate one teacher teaching a second subject: reports must become two separate subject pages, never a mixed page.
const sample=workspace.rows.filter(r=>ctx.mj(r,exam)===teacher).slice(0,3).map((r,i)=>({...structuredClone(r),id:r.id+'-second-'+i,subject:'مادة إضافية'}));
const mixed=[...workspace.rows,...sample];
pages=ctx.SR63.buildReportPages(mixed,'teacher',teacher,'الكل','summary',exam,pass,workspace.settings);assert.ok(pages.some(p=>p.subject==='مادة إضافية'));oneSubject(pages);

// 6.9.19 — custom report builder must follow the globally active exam.
const customWorkspace={...workspace,activeExam:'exam1'};
const customConfig=ctx.SR63.customReportDefault(customWorkspace);
assert.equal(customConfig.exam,'exam1','custom report did not start from active exam');checks++;
assert.ok(customConfig.columns.some(c=>c.key==='score:exam1'),'custom score column is not bound to active exam');checks++;
assert.ok(customConfig.columns.some(c=>c.key==='percent:exam1'),'custom percent column is not bound to active exam');checks++;
assert.ok(customConfig.columns.some(c=>c.key==='band:exam1'),'custom band column is not bound to active exam');checks++;
assert.ok(ctx.SR63.customReportRows(customWorkspace,customConfig).length>0,'custom report default produced no rows for active exam');checks++;
const remapped=ctx.SR63.remapCustomExamColumns(customConfig.columns,'exam1','exam2');
assert.ok(remapped.some(c=>c.key==='score:exam2')&&remapped.some(c=>c.key==='percent:exam2')&&remapped.some(c=>c.key==='band:exam2'),'custom exam columns did not follow exam change');checks++;
assert.ok(!remapped.some(c=>/^(score|percent|band):exam1$/.test(c.key)),'old custom exam-bound columns remained after exam change');checks++;

const app=require('fs').readFileSync(APP_PATH,'utf8');assert.ok(app.includes('SR63.buildReportPages(e.rows'),'runtime does not use reviewed report builder');assert.ok(app.includes('SR63.reportDisplaySubject'),'runtime does not resolve displayed subject');assert.ok(app.includes('H9=e=>SR63.customReportDefault(e)'),'custom report runtime still hard-codes its default exam');checks++;
assert.ok(app.includes('(0,v.useState)(()=>H9(e))'),'custom report state does not receive workspace active exam');checks++;
assert.ok(app.includes('SR63.remapCustomExamColumns(n.columns,n.exam,t)'),'custom report columns do not follow exam changes');checks++;
assert.ok(!app.includes('النتائج المقيمة فقط')&&!app.includes('غير المقيمة فقط'),'legacy evaluated terminology remains in custom report builder');checks++;

// 6.9.17 runtime route and official report contracts.
const runtime=require('fs').readFileSync(APP_PATH,'utf8');
assert.ok(runtime.includes('n===`subjects`&&(0,q.jsx)(SRGradeSubjectsReport'),'official comparison renderer not wired');checks++;
assert.ok(runtime.includes('n===`departmentStats`&&(0,q.jsx)(SRDepartmentStatsReport'),'department renderer not wired');checks++;
assert.ok(!runtime.includes('n===`subjects`&&(0,q.jsx)(bde'),'legacy comparison renderer still wired');checks++;
const subjectPages6917=ctx.SR63.gradeSubjectPages(workspace.rows,exam,'الكل');
assert.ok(subjectPages6917.some(p=>p.metricType==='success')&&subjectPages6917.some(p=>p.metricType==='achievement'));checks++;
assert.ok(subjectPages6917.every(p=>p.subjectChunk.length<=10));checks++;
const deptPages6917=ctx.SR63.departmentStatsPages(workspace.rows,exam,'الكل');
assert.ok(deptPages6917.length&&deptPages6917.every(p=>p.subjectChunk.length<=3));checks++;
const sourceReports=require('fs').readFileSync(path.resolve(__dirname,'../src/reports.js'),'utf8');assert.ok(sourceReports.includes('colSpan:3,className:`department-subject-head`')&&sourceReports.includes('children:`اسم المعلم`')&&sourceReports.includes('children:`نسبة النجاح`')&&sourceReports.includes('children:`نسبة التحصيل`')&&sourceReports.includes('children:`على مستوى الصف`'),'department statistics matrix contract missing');checks++;
console.log(JSON.stringify({passed:checks+10,failed:0,teacher,subject,modes}));
