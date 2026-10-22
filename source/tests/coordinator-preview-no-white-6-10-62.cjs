'use strict';
// Reproduces the real production white-screen: school report footer calls
// workspace.settings.coordinatorName.trim(), omitted by older coordinator API.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadApp}=require('./harness.cjs');
const {ctx}=loadApp(),SR=ctx.SR63;
const staff=fs.readFileSync(path.join(__dirname,'../src/staff.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../src/patches/ui.js'),'utf8');
const edge=fs.readFileSync(path.join(__dirname,'../../supabase/functions/school-staff/index.ts'),'utf8');
assert.match(staff,/SR63\.staffReportWorkspace=function/);
assert.match(staff,/typeof settings\.coordinatorName==='string'\?settings\.coordinatorName:''/);
assert.match(staff,/SR63\.ReportCenterSafeBoundary=class extends v\.Component/);
assert.match(staff,/h\(SR63\.getReportCenterSafeBoundary\(\),/,'React error boundary must wrap actual report center');
assert.match(edge,/reportDesign','coordinatorName','stable'/,'server source safely projects report fields for future deploys');
const workspace=ctx.zj();
workspace.settings={...workspace.settings,coordinatorName:undefined,stable:undefined};
workspace.rows=[{
 id:'m',studentId:'s1',studentName:'طالب الرياضيات',subject:'الرياضيات',
 department:'الرياضيات',className:'7/1',teacher:'معلم الرياضيات',
 scores:{exam1:23},statuses:{exam1:'present'},totals:{exam1:30}
}];
workspace.teachers=[];
assert.throws(()=>ctx.N9({workspace,subject:'الرياضيات',teacher:'معلم الرياضيات'}),/trim/,'verify missing coordinatorName was the actual preview rendering crash');
const safe=SR.staffReportWorkspace(workspace,'exam1');
assert.equal(safe.settings.coordinatorName,'');
assert.equal(safe.settings.stable,3);
assert.doesNotThrow(()=>ctx.N9({workspace:safe,subject:'الرياضيات',teacher:'معلم الرياضيات'}),'original footer renders with safe scope defaults');
assert.equal(workspace.settings.coordinatorName,undefined,'original workspace remains unchanged');
const allowed={...safe,rows:[
 ...safe.rows,{...safe.rows[0],id:'a',studentId:'s2',studentName:'طالب لغة عربية',subject:'اللغة العربية',department:'اللغة العربية'}
]};
const originalReact=ctx.v;
let hook=0;
ctx.v={...ctx.v,useState:initial=>[hook++===10?true:typeof initial==='function'?initial():initial,()=>{}],useMemo:fn=>fn(),useEffect:()=>{}};
let output;
try{output=ctx.xde({workspace:allowed,onExportExcel:()=>{},readOnly:true,canPrint:true,reportScope:'department',onSchoolSummary:()=>{}});}
finally{ctx.v=originalReact;}
const nodes=[];
const visit=el=>{if(Array.isArray(el))return el.forEach(visit);if(!el||typeof el!=='object')return;nodes.push(el);visit(el.props?.children)};
visit(output);
const boxes=nodes.filter(n=>n.props?.['aria-label']==='المادة الثابتة لقسم المنسق');
assert.equal(boxes.length,1,'one locked subject selector');
assert.equal(boxes[0].props.children,'الرياضيات','the coordinator has one immutable subject even when server payload includes multiple');
assert.equal(boxes[0].props['aria-readonly'],true);
const pages=nodes.filter(n=>n.type==='section'&&String(n.props?.className||'').includes('school-report-page'));
assert.ok(pages.length>0,'a prepared coordinator preview renders at least one real report page');
assert.match(ui,/studentName:typeof row\.studentName==='string'\?row\.studentName:String\(row\.studentName\?\?''\)/,'coordinator names normalize only missing values safely');
assert.match(ui,/String\(row\?\.studentName\?\?''\)\.length>45/,'report preview never dereferences a missing student name');
assert.match(ui,/SchoolResult report preparation:/,'page builder failure must become a recoverable report error, not a blank portal');
assert.match(ui,/تعذر تجهيز المعاينة:.*previewError/,'display preview generation error in the original report page');
assert.ok(pages.length<=8,'only 8 page DOM elements are mounted in preview at once');
for(const page of pages){
 assert.equal(page.props?.['data-orientation'],'portrait');
 const subjects=[];
 const collect=element=>{if(Array.isArray(element))return element.forEach(collect);
  if(!element||typeof element!=='object')return;
  if(typeof element.props?.subject==='string')subjects.push(element.props.subject);
  collect(element.props?.children)};
 collect(page);
 assert.ok(subjects.includes('الرياضيات'),'official report header/footer reflect selected coordinator subject');
 assert.ok(!subjects.includes('اللغة العربية'),'no all-subject or unauthorized material in preview');
}
const savedReact=ctx.v;
ctx.v={...ctx.v,Component:class Component{constructor(props){this.props=props;this.state={}}}};
const B=SR.getReportCenterSafeBoundary();
ctx.v=savedReact;
assert.equal(typeof B,'function');
const boundary=new B({children:'original preview',onReset:()=>{}});
assert.equal(boundary.render(),'original preview');
boundary.state={failed:true};
assert.equal(boundary.render().type,'section','a template exception becomes a recoverable message, not a blank screen');
console.log('PASS 6.10.62: real footer crash reproduced and fixed; active coordinator preview, locked subject, read-only scope and recovery UI');
