'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {loadApp}=require('./harness.cjs');
const {ctx}=loadApp();
const staff=fs.readFileSync(path.join(__dirname,'../src/staff.js'),'utf8');
const adminBuild=fs.readFileSync(path.join(__dirname,'../build.cjs'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../src/patches/ui.js'),'utf8');
assert.doesNotMatch(staff,/['"]الخطط العلاجية الذكية['"]/,'AI plans absent from all staff navigation');
assert.doesNotMatch(staff,/SR63\.AIPlans/,'no role can render AI plan editor');
assert.doesNotMatch(staff,/school_staff_coordinator_plan_save/,'no smart-plan save entry in staff UI');
assert.match(staff,/plans:false,savePlans:false/,'default coordinator plan permissions off');
assert.match(staff,/permissions:form\.role==='admin'\?form\.permissions:\{[^}]*plans:false,savePlans:false,generateAI:false/,'new staff cannot receive smart-plan permissions');
assert.match(staff,/targetRole==='admin'\?\{\}:\{permissions:\{[^}]*plans:false,savePlans:false,generateAI:false/,'legacy permission flags cleared when staff accounts edited');
assert.match(staff,/SR63\.TeacherPerformanceCenter/,'ordinary improvement reports preserved');
assert.ok(staff.includes("h(xde,{key:'original-report-center-"),'original print center preserved');
assert.match(ui,/fixedSubject=departmentSubjects\[0\]\|\|''/,'coordinator subject remains fixed');
assert.match(adminBuild,/id:\x60aiPlans\x60/,'full admin AI planning module preserved');
const walk=(node,fn)=>{if(Array.isArray(node))return node.forEach(x=>walk(x,fn));if(!node||typeof node!=='object')return;fn(node);walk(node.props?.children,fn)};
const original=ctx.v;
ctx.v={...ctx.v,useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:value=>({current:value})};
try{
 for(const role of ['coordinator','principal','vice_principal']){
  const el=ctx.SR63.CoordinatorPortal({profile:{role,ownerId:'test-owner',username:role,departments:['الرياضيات'],permissions:{reports:true,export:true,plans:true,savePlans:true,generateAI:true}}});
  const labels=[];
  walk(el,node=>{if(typeof node.props?.children==='string')labels.push(node.props.children)});
  assert.ok(labels.some(text=>text.includes('مركز التقارير والطباعة')),role+' keeps report center');
  assert.ok(!labels.some(text=>text.includes('الخطط العلاجية الذكية')),role+' hides smart plans even with stale grants');
 }
 const admin=ctx.SR63.StaffAdminPage(),labels=[];
 walk(admin,node=>{if(typeof node.props?.children==='string')labels.push(node.props.children)});
 for(const text of ['عرض الخطط العلاجية وخطط التحسين','حفظ وتحديث الخطط العلاجية','توليد مسودات باستخدام Gemini'])assert.ok(!labels.includes(text),'staff permission option hidden: '+text);
}finally{ctx.v=original}
console.log('PASS 6.10.63 staff smart-plan entry and creation removed for coordinator, principal, vice; admin module and all report routes preserved');
