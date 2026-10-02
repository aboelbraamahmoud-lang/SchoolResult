const fs=require('fs'),assert=require('assert/strict'),{loadApp}=require('./harness.cjs');
const {ctx}=loadApp(),results=[];
const pages=['dashboard','import','masterData','studentProfile','teacherData','data','quality','classes','teachers','departments','school','comparison','value','levels','struggling','reports','customReports','reportDesign','backups','settings'];
for(const mode of ['empty','demo'])for(const page of pages){let index=0;const workspace=mode==='demo'?ctx.zj():ctx.Aj();
 ctx.v={...ctx.v,useState:arg=>{const n=index++,value=n===0?workspace:n===1?structuredClone(workspace.settings):n===3?page:n===6?true:typeof arg==='function'?arg():arg;return [value,()=>{}];},useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:value=>({current:value}),useId:()=>':test:'};
 try{assert.ok(ctx.Nde());results.push({mode,page,status:'pass'});}catch(error){results.push({mode,page,status:'fail',error:error.stack});}
}
// The new archive and report header components are evaluated directly as element trees.
ctx.v={...ctx.v,useState:arg=>[typeof arg==='function'?arg():arg,()=>{}]};
for(const name of ['archive','reportHeader','cloudLogin'])try{const workspace=ctx.zj();assert.ok(name==='cloudLogin'?ctx.SR63.CloudApp():name==='archive'?ctx.SR63.Archives({workspace,snapshots:[],status:'اختبار',bytes:0}):ctx.M9({workspace,title:'ملخص النتائج',subject:'كل المواد',assessment:workspace.settings.exams[0].name}));results.push({name,status:'pass'});}catch(error){results.push({name,status:'fail',error:error.stack});}
try{const workspace=ctx.zj(),page=ctx.SR63.gradeSubjectPages(workspace.rows,workspace.activeExam,'الكل')[0];assert.ok(page);assert.ok(ctx.SRGradeSubjectsReport({page,exam:workspace.activeExam,workspace}));results.push({name:'gradeSubjectsReport',status:'pass'});}catch(error){results.push({name:'gradeSubjectsReport',status:'fail',error:error.stack});}

try{const workspace=ctx.zj();ctx.v={...ctx.v,useState:arg=>[typeof arg==='function'?arg():arg,()=>{}],useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:value=>({current:value})};assert.ok(ctx.SR63.Dashboard({workspace,onNavigate:()=>{}}));results.push({name:'dashboard68',status:'pass'});}catch(error){results.push({name:'dashboard68',status:'fail',error:error.stack});}
try{const workspace=ctx.zj();ctx.v={...ctx.v,useState:arg=>[typeof arg==='function'?arg():arg,()=>{}],useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:value=>({current:value})};assert.ok(ctx.SR63.MasterData({workspace,setWorkspace:()=>{},onNavigate:()=>{}}));results.push({name:'masterData68',status:'pass'});}catch(error){results.push({name:'masterData68',status:'fail',error:error.stack});}
try{const workspace=ctx.zj();ctx.v={...ctx.v,useState:arg=>[typeof arg==='function'?arg():arg,()=>{}],useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:value=>({current:value})};assert.ok(ctx.SR63.StudentProfile({workspace,onNavigate:()=>{}}));results.push({name:'studentProfile68',status:'pass'});}catch(error){results.push({name:'studentProfile68',status:'fail',error:error.stack});}

const report={method:'Element-tree structural checks with inert hooks. No DOM, browser, layout or interaction test.',passed:results.filter(r=>r.status==='pass').length,failed:results.filter(r=>r.status==='fail').length,results};
fs.writeFileSync('tests/output/structure-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
