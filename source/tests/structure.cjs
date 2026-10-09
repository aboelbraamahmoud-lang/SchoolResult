const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{loadApp}=require('./harness.cjs');
const {ctx}=loadApp(),results=[];
const pages=['dashboard','import','masterData','studentProfile','studentResultsPrint','teacherData','data','quality','classes','teachers','departments','school','comparison','value','levels','struggling','reports','customReports','reportDesign','backups','settings'];
for(const mode of ['empty','demo'])for(const page of pages){let index=0;const workspace=mode==='demo'?ctx.zj():ctx.Aj();
 ctx.v={...ctx.v,useState:arg=>{const n=index++,value=n===0?workspace:n===1?structuredClone(workspace.settings):n===3?page:n===6?true:typeof arg==='function'?arg():arg;return [value,()=>{}];},useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:value=>({current:value}),useId:()=>':test:'};
 try{assert.ok(ctx.Nde());results.push({mode,page,status:'pass'});}catch(error){results.push({mode,page,status:'fail',error:error.stack});}
}
// The new archive and report header components are evaluated directly as element trees.
ctx.v={...ctx.v,useState:arg=>[typeof arg==='function'?arg():arg,()=>{}]};
for(const name of ['archive','reportHeader','cloudLogin'])try{const workspace=ctx.zj();assert.ok(name==='cloudLogin'?ctx.SR63.CloudApp():name==='archive'?ctx.SR63.Archives({workspace,snapshots:[],status:'اختبار',bytes:0}):ctx.M9({workspace,title:'ملخص النتائج',subject:'كل المواد',assessment:workspace.settings.exams[0].name}));results.push({name,status:'pass'});}catch(error){results.push({name,status:'fail',error:error.stack});}
try{const workspace=ctx.zj(),page=ctx.SR63.gradeSubjectPages(workspace.rows,workspace.activeExam,'الكل')[0];assert.ok(page);assert.ok(['success','achievement'].includes(page.metricType));assert.ok(ctx.SRGradeSubjectsReport({page,exam:workspace.activeExam,workspace}));results.push({name:'gradeSubjectsReport',status:'pass'});}catch(error){results.push({name:'gradeSubjectsReport',status:'fail',error:error.stack});}
try{const workspace=ctx.zj(),page=ctx.SR63.departmentStatsPages(workspace.rows,workspace.activeExam,'الكل')[0];assert.ok(page);assert.ok(ctx.SRDepartmentStatsReport({page,exam:workspace.activeExam,workspace}));results.push({name:'departmentStatsReport',status:'pass'});}catch(error){results.push({name:'departmentStatsReport',status:'fail',error:error.stack});}
try{const workspace=ctx.zj(),pages=ctx.SR63.gradeSubjectPages(workspace.rows,workspace.activeExam,'الكل');assert.ok(pages.length);assert.ok(pages.every(p=>['success','achievement'].includes(p.metricType)));assert.ok(pages.every(p=>p.subject==='كل المواد'));results.push({name:'gradeComparisonSplitMetricPages',status:'pass'});}catch(error){results.push({name:'gradeComparisonSplitMetricPages',status:'fail',error:error.stack});}

try{const workspace=ctx.zj();ctx.v={...ctx.v,useState:arg=>[typeof arg==='function'?arg():arg,()=>{}],useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:value=>({current:value})};assert.ok(ctx.SR63.Dashboard({workspace,onNavigate:()=>{}}));assert.ok(ctx.SR63.DashboardTrendChart({items:ctx.XA.map(exam=>({exam,metric:ctx.bj(workspace.rows,exam,workspace.settings)})),settings:workspace.settings}));results.push({name:'dashboard69',status:'pass'});}catch(error){results.push({name:'dashboard69',status:'fail',error:error.stack});}
try{const workspace=ctx.zj();ctx.v={...ctx.v,useState:arg=>[typeof arg==='function'?arg():arg,()=>{}],useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:value=>({current:value})};assert.ok(ctx.SR63.MasterData({workspace,setWorkspace:()=>{},onNavigate:()=>{}}));results.push({name:'masterData68',status:'pass'});}catch(error){results.push({name:'masterData68',status:'fail',error:error.stack});}
try{const workspace=ctx.zj();ctx.v={...ctx.v,useState:arg=>[typeof arg==='function'?arg():arg,()=>{}],useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:value=>({current:value})};assert.ok(ctx.SR63.StudentProfile({workspace,onNavigate:()=>{}}));results.push({name:'studentProfile68',status:'pass'});}catch(error){results.push({name:'studentProfile68',status:'fail',error:error.stack});}
try{const workspace=ctx.zj();ctx.v={...ctx.v,useState:arg=>[typeof arg==='function'?arg():arg,()=>{}],useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:value=>({current:value})};assert.ok(ctx.SR63.StudentResultsPrint({workspace}));const pages=ctx.SR63.studentResultPages(workspace,workspace.activeExam,{});assert.ok(pages.length>0);results.push({name:'studentResultsPrint6926',status:'pass'});}catch(error){results.push({name:'studentResultsPrint6926',status:'fail',error:error.stack});}

try{const reports=fs.readFileSync(path.join(__dirname,'../src/reports.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../src/repair.css'),'utf8');assert.ok(reports.includes('level-overview')&&reports.includes('report-meter')&&reports.includes('فوق المتوسط')&&reports.includes('في المتوسط')&&reports.includes('دون المتوسط'));assert.ok(css.includes('.report-meter')&&css.includes('.level-overview')&&css.includes('.level-macro-badge'));results.push({name:'premiumReportVisuals',status:'pass'});}catch(error){results.push({name:'premiumReportVisuals',status:'fail',error:error.stack});}
try{const reports=fs.readFileSync(path.join(__dirname,'../src/reports.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../src/repair.css'),'utf8'),dash=fs.readFileSync(path.join(__dirname,'../src/dashboard-pro.js'),'utf8');assert.ok(reports.includes('renderReportValue'));assert.ok(css.includes('unified premium reports')&&css.includes('.sr694-insights')&&css.includes('.sr694-donut')&&css.includes('.results-sidebar .sidebar-nav-group:after'));assert.ok(dash.includes('DashboardDonut')&&dash.includes('sr694-insights'));results.push({name:'premiumUnified694',status:'pass'});}catch(error){results.push({name:'premiumUnified694',status:'fail',error:error.stack});}

try{const reports=fs.readFileSync(path.join(__dirname,'../src/patches/reports.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../src/repair.css'),'utf8');assert.ok(reports.includes("src:'./moehe.png'")&&reports.includes('report-ministry-lockup')&&reports.includes('report-head-compact'));assert.ok(!reports.includes('data:image/png;base64,'));assert.ok(css.includes('.report-ministry-emblem')&&css.includes('.report-context-compact')&&css.includes('6.9.5 — compact, balanced report header'));results.push({name:'compactOfficialReportHeader695',status:'pass'});}catch(error){results.push({name:'compactOfficialReportHeader695',status:'fail',error:error.stack});}


try{const reports=fs.readFileSync(path.join(__dirname,'../src/reports.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../src/repair.css'),'utf8');assert.ok(reports.includes('report-delta-chip')&&reports.includes('isDelta=')&&reports.includes("tone=n>0?'positive':n<0?'negative':'neutral'"));assert.ok(css.includes('.report-delta-chip.delta-positive')&&css.includes('.report-delta-chip.delta-negative')&&css.includes('.report-delta-chip.delta-neutral')&&css.includes('6.9.6 — visual value-added'));results.push({name:'comparisonDeltaVisual696',status:'pass'});}catch(error){results.push({name:'comparisonDeltaVisual696',status:'fail',error:error.stack});}


try{
 const reports=fs.readFileSync(path.join(__dirname,'../src/reports.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../src/repair.css'),'utf8'),workspace=ctx.zj();
 assert.ok(reports.includes('function SRTargetRangeReport')&&reports.includes('function SRComparisonReport'));
 assert.ok(css.includes('.target-range-hero')&&css.includes('.comparison-trend.trend-positive')&&css.includes('.comparison-trend.trend-negative'));
 const cls=ctx.hj(workspace.rows[0],workspace.activeExam),rows=workspace.rows.filter(row=>ctx.hj(row,workspace.activeExam)===cls),page={rows,allRows:rows,rowOffset:0,className:cls,teacher:'',subject:rows[0]?.subject||'كل المواد'};
 assert.ok(ctx.SRTargetRangeReport({page,exam:workspace.activeExam,threshold:workspace.settings.pass,workspace}));
 assert.ok(ctx.SRComparisonReport({page,from:'exam1',to:workspace.activeExam,workspace}));
 results.push({name:'targetAndComparisonVisuals697',status:'pass'});
}catch(error){results.push({name:'targetAndComparisonVisuals697',status:'fail',error:error.stack});}


try{
 const reports=fs.readFileSync(path.join(__dirname,'../src/reports.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../src/repair.css'),'utf8');
 assert.ok(!css.includes('\\n'),'repair.css must not contain literal escaped newlines');
 assert.ok(css.includes('6.9.9 — compact executive targeted-range report')&&css.includes('.target-range-kpis article{display:flex!important')&&css.includes('.target-student-table{table-layout:fixed!important'));
 assert.ok(reports.includes('نتائج ضمن النطاق')&&reports.includes('متوسط المستهدفين')&&reports.includes('خطة فردية + متابعة مكثفة'));
 results.push({name:'compactTargetRange698',status:'pass'});
}catch(error){results.push({name:'compactTargetRange698',status:'fail',error:error.stack});}


try{
 const reports=fs.readFileSync(path.join(__dirname,'../src/patches/reports.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../src/repair.css'),'utf8'),logo=path.join(__dirname,'../../moehe.png');
 assert.ok(reports.includes('report-ministry-lockup-official')&&reports.includes('report-ministry-emblem-official'));
 assert.ok(css.includes('6.9.9 — official Ministry logo lockup')&&css.includes('width:54mm!important')&&css.includes('border-radius:0!important'));
 assert.ok(fs.existsSync(logo)&&fs.statSync(logo).size>5000,'official Ministry logo asset missing or empty');
 results.push({name:'officialMinistryLogo699',status:'pass'});
}catch(error){results.push({name:'officialMinistryLogo699',status:'fail',error:error.stack});}


try{
 const reports=fs.readFileSync(path.join(__dirname,'../src/patches/reports.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../src/repair.css'),'utf8');
 assert.ok(reports.includes("src:'./moehe.png'"),'Ministry logo must use the external official asset');assert.ok(!reports.includes('data:image/png;base64,'),'Ministry logo must not be embedded as a base64 payload');
 assert.ok(css.includes('6.9.10 — definitive report-header cleanup')&&css.includes('.school-report-page:after{content:none!important;display:none!important}'));
 assert.ok(css.includes('.report-school-logo,.report-school-mark,.report-brand-mark')&&css.includes('border-radius:1.4mm!important'));
 results.push({name:'embeddedMinistryLogoNoHeaderCircles6910',status:'pass'});
}catch(error){results.push({name:'embeddedMinistryLogoNoHeaderCircles6910',status:'fail',error:error.stack});}

try{
 const reports=fs.readFileSync(path.join(__dirname,'../src/reports.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../src/repair.css'),'utf8'),app=fs.readFileSync(path.join(__dirname,'../../app.js'),'utf8');
 assert.ok(reports.includes('بيان ${metricLabel}')&&reports.includes('grade-subject-matrix-official'),'official two-metric comparison renderer missing');
 assert.ok(reports.includes('إحصائية نتائج القسم — ${tj(n.settings,t).name}')&&reports.includes('department-subject-matrix-official'),'department matrix renderer missing');
 assert.ok(css.includes('6.9.18 — official department matrix')&&css.includes('.report-context p{justify-content:flex-start!important'),'6.9.18 report CSS missing');
 assert.ok(app.includes('n===`subjects`&&(0,q.jsx)(SRGradeSubjectsReport'),'runtime does not render official subject comparison');
 assert.ok(app.includes('n===`departmentStats`&&(0,q.jsx)(SRDepartmentStatsReport'),'runtime does not render department statistics');
 assert.ok(!app.includes('n===`subjects`&&(0,q.jsx)(bde'),'legacy subjects renderer still active');
 results.push({name:'officialComparisonAndDepartmentStats6917',status:'pass'});
}catch(error){results.push({name:'officialComparisonAndDepartmentStats6917',status:'fail',error:error.stack});}

const report={method:'Element-tree structural checks with inert hooks. No DOM, browser, layout or interaction test.',passed:results.filter(r=>r.status==='pass').length,failed:results.filter(r=>r.status==='fail').length,results};
fs.writeFileSync(path.join(__dirname,'output/structure-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
