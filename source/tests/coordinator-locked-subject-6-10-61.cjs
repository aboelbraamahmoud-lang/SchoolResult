'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadApp}=require('./harness.cjs');
const {ctx}=loadApp();
const ui=fs.readFileSync(path.join(__dirname,'../src/patches/ui.js'),'utf8');
const staff=fs.readFileSync(path.join(__dirname,'../src/staff.js'),'utf8');
assert.match(ui,/departmentMode=reportScope==='department'/);
assert.match(ui,/fixedSubject=departmentSubjects\.length===1\?departmentSubjects\[0\]:''/);
assert.match(ui,/S=departmentMode\?\(fixedSubject\|\|\x60الكل\x60\)/);
assert.match(ui,/mde\(reportRows,i,o,S,n,T,g,e\.settings\)/);
assert.equal((ui.match(/SR63\.buildReportPages\(reportRows,i,o,S,n,T,g,e\.settings\)/g)||[]).length,2,'PDF and ZIP always use coordinator-scoped rows');
assert.match(ui,/'aria-readonly':true/);
assert.match(staff,/reportScope:isLeadership\?'school':'department'/);
const workspace=ctx.zj();
workspace.rows=[
 {id:'math',studentId:'s1',studentName:'طالب رياضيات',className:'7/1',grade:'7',subject:'الرياضيات',department:'الرياضيات',teacher:'معلم رياضيات',scores:{exam1:27},statuses:{exam1:'present'},totals:{exam1:30}},
 {id:'arab',studentId:'s2',studentName:'طالب لغة عربية',className:'7/1',grade:'7',subject:'اللغة العربية',department:'اللغة العربية',teacher:'معلم لغة عربية',scores:{exam1:25},statuses:{exam1:'present'},totals:{exam1:30}}
];
function render(workspace,scope){
 const used=[];
 ctx.v={...ctx.v,useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],
  useMemo:fn=>fn(),useEffect:()=>{},useCallback:fn=>fn,useRef:x=>({current:x})};
 const element=ctx.xde({workspace,onExportExcel:()=>{},readOnly:scope==='department',canPrint:true,onSchoolSummary:()=>{},reportScope:scope});
 const walk=x=>{if(Array.isArray(x))return x.forEach(walk);if(!x||typeof x!=='object')return;used.push(x);walk(x.props?.children)};
 walk(element);return used;
}
const coordinator=render({...workspace,rows:workspace.rows.filter(row=>row.subject==='الرياضيات')},'department');
const fixed=coordinator.filter(x=>x.props?.['aria-label']==='المادة الثابتة لقسم المنسق');
assert.equal(fixed.length,1,'one fixed coordinator subject box');
assert.equal(fixed[0].props['aria-readonly'],true);
assert.equal(fixed[0].props.children,'الرياضيات');
assert.ok(!coordinator.some(x=>x.props?.items?.some?.(y=>y.label==='كل المواد')),'no all-materials choice');
assert.ok(!coordinator.some(x=>x.props?.items?.some?.(y=>y.value==='اللغة العربية')),'no unauthorized subject');
const admin=render(workspace,'school');
assert.ok(admin.some(x=>x.props?.items?.some?.(y=>y.label==='كل المواد')),'admin retains all-subject selection');
assert.ok(admin.some(x=>x.props?.items?.some?.(y=>y.value==='اللغة العربية')),'admin retains other subjects');
const empty=render({...workspace,rows:[]},'department');
assert.ok(empty.some(x=>x.props?.['aria-label']==='المادة الثابتة لقسم المنسق'&&String(x.props.children).includes('لا توجد مادة')),'empty dataset must be explained');
console.log('PASS 6.10.61: single fixed coordinator subject, empty-dataset guard, full admin choice and scoped export paths');
