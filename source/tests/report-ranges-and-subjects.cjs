/* Real report builders, original renderers, boundary values and scoped aggregate API. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {transformSync}=require('esbuild'),{loadApp}=require('./harness.cjs');
const {ctx}=loadApp(),S=ctx.SR63,root=path.resolve(__dirname,'../..');
const edgeFile=path.join(root,'supabase/functions/school-staff/subject-comparison.ts');
const edge={module:{exports:{}}};
vm.runInNewContext(transformSync(fs.readFileSync(edgeFile,'utf8'),{loader:'ts',format:'cjs'}).code,edge);
const aggregate=edge.module.exports.subjectComparison;
const ws=ctx.zj();ws.activeExam='exam1';ws.settings.exams.forEach(e=>e.total=100);ws.teachers=[];
const make=(id,score,{subject='الرياضيات',className='7/1',status='present',total=100}={})=>({id:'r'+id,studentId:'s'+id,studentName:'طالب خاص '+id,subject,department:subject,className,teacher:'معلم '+subject,scores:{exam1:score},totals:{exam1:total},statuses:{exam1:status}});
ws.rows=[0,49.999,50,59.999,60,69.999,70,79.999,80,89.999,90,99.999,100].map((n,i)=>make(i,n));
ws.rows.push(make('absent',null,{status:'absent'}),make('missing',null,{status:'unentered'}),make('invalid',101),make('support',95,{className:'7/ESE'}));
const pagesFor=(min,max)=>S.buildReportPages(ws.rows,'className','الكل','الكل','struggling','exam1',{min,max},ws.settings);
const values=pages=>Array.from(pages.flatMap(p=>p.rows.map(r=>r.scores.exam1)));
assert.deepEqual(values(pagesFor(90,100)),[90,99.999]);
assert.deepEqual(values(pagesFor(50,60)),[50,59.999]);
assert.deepEqual(values(pagesFor(0,60)),[0,49.999,50,59.999]);
assert.deepEqual(values(pagesFor(70,80)),[70,79.999]);
assert.deepEqual(values(pagesFor(99.999,100)),[99.999]);
assert.deepEqual(values(pagesFor('٩٠','١٠٠')),[90,99.999]);
for(const range of [{min:'',max:100},{min:0,max:''},{min:80,max:70},{min:50,max:50},{min:-1,max:80},{min:0,max:101},{min:NaN,max:60}]){
 assert.ok(S.studentPercentRange(range).error);assert.throws(()=>pagesFor(range.min,range.max));
}
assert.deepEqual(values(S.buildReportPages(ws.rows,'className','الكل','الكل','struggling','exam1',60,ws.settings)),values(pagesFor(0,60)),'legacy one-limit callers retain zero lower bound');
const walk=(node,out=[])=>{if(Array.isArray(node)){node.forEach(n=>walk(n,out));return out;}if(node&&typeof node==='object'){out.push(node);walk(node.props?.children,out);}return out;};
const renderText=node=>walk(node).flatMap(n=>typeof n.props?.children==='string'?[n.props.children]:Array.isArray(n.props?.children)?n.props.children.filter(x=>typeof x==='string'||typeof x==='number'):[]).join(' ');
const rangePage=pagesFor(90,100)[0];
const rendered=ctx.SRTargetRangeReport({page:rangePage,exam:'exam1',threshold:{min:90,max:100},workspace:ws});
assert.match(renderText(rendered),/من  90 % إلى أقل من  100 %/);
assert.equal(walk(rendered).filter(n=>n.type==='tr'&&String(n.props.className||'').includes('target-row')).length,2);
assert.deepEqual(walk(rendered).filter(n=>n.props?.className==='target-percent').map(n=>renderText(n)),['90%','99.999%']);
for(const [value,min,max,label] of [[59.999,50,60,'59.999%'],[79.999,70,80,'79.999%'],[70.0001,70.0001,80,'70.0001%'],[0,0,60,'0%']])assert.equal(S.rangePercentLabel(value,S.studentPercentRange({min,max})),label);
assert.equal(S.rangePercentLabel(null,{min:0,max:100}),'—');
const many={...ws,rows:Array.from({length:85},(_,i)=>make(i,75))};
const paged=S.buildReportPages(many.rows,'className','الكل','الكل','struggling','exam1',{min:70,max:80},ws.settings);
assert.deepEqual(Array.from(paged.map(p=>p.rows.length)),[40,40,5]);assert.equal(new Set(paged.flatMap(p=>p.rows.map(r=>r.id))).size,85);
ws.rows.push(make('ar1',30,{subject:'اللغة العربية',className:'السابع أ',total:40}),make('ar2',20,{subject:'اللغة العربية',className:'7/2',total:40}),make('ar3',null,{subject:'اللغة العربية',className:'7/2',status:'excused'}),make('g8',90,{subject:'اللغة العربية',className:'08/2'}));
ws.rows[0].examTeachers={exam1:'معلم الاختبار'};
const report=aggregate(ws,'exam1'),remote=S.subjectComparisonPages(report,'الكل',ws.settings);
const local=S.buildReportPages(ws.rows,'grade','الكل','الكل','subjects','exam1',50,ws.settings);
assert.equal(remote.length,local.length);
for(const p of local){
 const match=remote.find(r=>r.key===p.key);assert.ok(match,'same original grade/metric page');
 const matrix=S.gradeSubjectMatrix(p.allRows,'exam1',ws.settings,p.subjectChunk);
 assert.deepEqual(Array.from(match.matrix.classes),Array.from(matrix.classes));
 assert.deepEqual(Array.from(match.matrix.subjects),Array.from(matrix.subjects));
 for(const [key,cell] of matrix.cells){const other=match.matrix.cells.get(key);if(!cell.rows.length){assert.ok(!other);continue;}
  assert.equal(other.teacher,cell.teacher);assert.equal(other.rowCount,cell.rows.length);
  for(const metric of ['success','achievement'])assert.equal(other.metric[metric],cell.metric[metric]);
 }
 for(const metric of ['success','achievement']){
  assert.equal(match.matrix.overall[metric],matrix.overall[metric]);
  for(const subject of matrix.subjects)assert.equal(match.matrix.totals[subject][metric],matrix.totals[subject][metric]);
 }
 assert.equal(renderText(ctx.SRGradeSubjectsReport({page:match,exam:'exam1',workspace:ws})),renderText(ctx.SRGradeSubjectsReport({page:p,exam:'exam1',workspace:ws})),'exact same existing report content');
}
const serialized=JSON.stringify(report);
for(const forbidden of ['studentId','studentName','scores','statuses','totals":{"exam','طالب خاص','workspace','raw'])assert.ok(!serialized.includes(forbidden),forbidden+' must not leave aggregate API');
assert.throws(()=>aggregate(ws,'exam5'),/INVALID_EXAM/);
// Real state-driven report center: cards, inclusive/exclusive controls, invalidation and export gates.
function center(props={}){
 const state=[],memo=[];let index=0,mi=0;
 ctx.v={...ctx.v,useState:init=>{const i=index++;if(!(i in state))state[i]=typeof init==='function'?init():init;return [state[i],next=>state[i]=typeof next==='function'?next(state[i]):next];},useMemo:fn=>fn(),useEffect:()=>{}};
 const draw=()=>{index=0;mi=0;ctx.v.useMemo=(fn,deps)=>{const i=mi++;if(!memo[i]||!deps.every((d,n)=>d===memo[i].deps[n]))memo[i]={deps,value:fn()};return memo[i].value;};return walk(ctx.xde({workspace:ws,...props}));};
 return {draw,state};
}
for(const role of ['admin','principal','vice_principal','coordinator']){
 const c=center({readOnly:role!=='admin',onSchoolSummary:role==='admin'?null:()=>{},reportScope:role==='coordinator'?'department':'school',canCompareSubjects:true});
 let nodes=c.draw();const card=nodes.find(n=>n.type==='button'&&renderText(n).includes('الطلاب ضمن نسبة'));assert.ok(card,role+' range card');card.props.onClick();nodes=c.draw();
 const min=nodes.find(n=>n.props?.id==='sr-range-min'),max=nodes.find(n=>n.props?.id==='sr-range-max');assert.ok(min&&max);
 min.props.onChange({target:{value:'90'}});max.props.onChange({target:{value:'100'}});nodes=c.draw();
 const prepare=nodes.find(n=>n.props?.children?.[0]==='تجهيز المعاينة');assert.equal(!!prepare.props.disabled,false);prepare.props.onClick();assert.equal(c.state[10],true);
 nodes=c.draw();nodes.find(n=>n.props?.id==='sr-range-min').props.onChange({target:{value:'100'}});nodes=c.draw();assert.equal(c.state[10],false);
 assert.equal(!!nodes.find(n=>n.props?.children?.[0]==='تجهيز المعاينة').props.disabled,true);
 assert.ok(nodes.filter(n=>typeof n.props?.children==='string'&&n.props.children.includes('PDF')&&'disabled' in n.props).every(n=>n.props.disabled),'invalid range disables exports');
}
console.log('PASS range boundaries, decimal/Arabic inputs, validation, pagination, all roles, same admin comparison rendering and aggregate privacy');

// Exercise the actual Deno handler with a synthetic authorized school, never production data.
let handler,profile,requestedOwners=[];
const context={exports:{},Response,Request,TextEncoder,crypto:require('node:crypto').webcrypto,console,
 Deno:{serve:fn=>handler=fn,env:{get:()=> 'test-only'}},
 require:name=>name.includes('subject-comparison')?{subjectComparison:aggregate}:name.includes('year-over-year')?{}:{createClient:()=>({
  auth:{getUser:async()=>({data:{user:{id:'staff-user',email:'test@example.com'}}})},
  from:table=>{let ownerRead=false;const q={select:fields=>{ownerRead=fields==='owner_id';return q;},eq:(column,id)=>{if(table==='school_workspaces')requestedOwners.push(id);return q;},maybeSingle:async()=>({data:table==='school_staff_accounts'?profile:ownerRead?null:{workspace:ws,revision:7}})};return q;}
 })}};
vm.runInNewContext(transformSync(fs.readFileSync(path.join(root,'supabase/functions/school-staff/index.ts'),'utf8'),{loader:'ts',format:'cjs'}).code,context);
(async()=>{
 for(const [role,reports,compare,status] of [['coordinator',true,true,200],['coordinator',true,false,403],['coordinator',false,true,403],['principal',true,false,200],['vice_principal',true,false,200]]){
  profile={user_id:'staff-user',owner_id:'school-owner',role,active:true,departments:['الرياضيات'],permissions:{reports,compare}};requestedOwners=[];
  const res=await handler(new Request('https://test.invalid',{method:'POST',headers:{authorization:'Bearer synthetic-test-token'},body:JSON.stringify({action:'subject_comparison',exam:'exam1',ownerId:'other-school'})}));
  assert.equal(res.status,status);const data=await res.json();if(status===200){assert.equal(data.report.grades.length,2);assert.ok(requestedOwners.includes('school-owner'));assert.ok(!requestedOwners.includes('other-school'));assert.ok(!JSON.stringify(data).includes('طالب خاص'));}
 }
 const res=await handler(new Request('https://test.invalid',{method:'POST',body:'{}'}));assert.equal(res.status,401);
 console.log('PASS actual subject comparison handler: authenticated roles, reports/compare permissions, school ownership and aggregate-only response');
})().catch(e=>{console.error(e);process.exitCode=1;});
