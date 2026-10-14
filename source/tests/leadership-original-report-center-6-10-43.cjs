/* 6.10.43: the school leader must render the SAME original admin report center component,
   with admin's six official report views and print-only (no elevated save access). */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadApp}=require('./harness.cjs');
const {ctx}=loadApp();
const {SR63}=ctx;
const portalSrc=fs.readFileSync(path.join(__dirname,'../src/staff.js'),'utf8');
const reportSrc=fs.readFileSync(path.join(__dirname,'../src/patches/ui.js'),'utf8');

assert.ok(portalSrc.includes('SR63.currentWorkspace=reportWorkspace'),'official report audit must use authenticated leader scope');
assert.match(portalSrc,/\['reportCenter','مركز التقارير والطباعة',isLeadership&&!!perms\.reports\]/);
assert.match(portalSrc,/h\(xde,\{key:'original-report-center-'\+profile\.role\+'-'\+payload\?\.revision\+'-'\+exam,workspace:active,readOnly:true,canPrint:!!perms\.export,onSchoolSummary:/);
assert.match(reportSrc,/function xde\(\{workspace:e,onExportExcel:t,readOnly=false,canPrint=true,onSchoolSummary=null\}\)/);
assert.match(reportSrc,/!readOnly&&\(0,q\.jsxs\)\(dA,\{variant:`outline`,onClick:t/);
assert.equal((reportSrc.match(/disabled:!canPrint\|\|!prepared/g)||[]).length,2);
assert.match(reportSrc,/printBatch=\(\)=>\{if\(!canPrint\)return;/);

const makeSettings=()=>({schoolName:'مدرسة الاختبار',academicYear:'2026/2027',pass:50,
 exams:['exam1','exam2','exam3','exam4'].map((key,i)=>({key,name:'الاختبار '+(i+1),total:100})),
 bands:[{id:'weak',label:'ضعيف',min:0,max:60,color:'#c76d45'},{id:'high',label:'ممتاز',min:60,max:100,color:'#0c8d73'}],
 reportDesign:{reportNames:{summary:'ملخص النتائج',levels:'تحليل المستويات',struggling:'الطلاب المتعثرون',teachers:'متوسطات المعلمين',comparison:'مقارنة اختبارين',subjects:'مقارنة المواد'},signatureLabels:{teacher:'المعلم',coordinator:'المنسق',vice:'النائب',principal:'المدير'},primaryColor:'#123456',showLogo:false}});
const rows=[{id:'row1',studentId:'st1',studentName:'طالب تجريبي',className:'7/1',grade:'7',subject:'الرياضيات',department:'الرياضيات',teacher:'المعلم الأول',scores:{exam1:85,exam2:90,exam3:null,exam4:null},statuses:{exam1:'present',exam2:'present',exam3:'unentered',exam4:'unentered'},totals:{exam1:100,exam2:100,exam3:100,exam4:100},examClasses:{exam1:'7/1',exam2:'7/1'}}];
const workspace={version:7,activeExam:'exam2',settings:makeSettings(),rows,teachers:[],teacherAssignments:[],aiPlans:[]};
const payload={workspace,revision:25,benchmarks:[],comparisonExam:'exam2'};
const read=(element,predicate)=>{const found=[];const visit=node=>{if(Array.isArray(node)){node.forEach(visit);return;}if(!node||typeof node!=='object')return;if(predicate(node))found.push(node);visit(node.props?.children);};visit(element);return found;};
const runPortal=(role,permissions,page='reportCenter')=>{
 let i=0;
 ctx.v={...ctx.v,useState:initial=>{const j=i++;const value=j===0?payload:j===2?false:j===3?page:typeof initial==='function'?initial():initial;return [value,()=>{}]},useEffect:()=>{},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:v=>({current:v})};
 return SR63.CoordinatorPortal({profile:{role,ownerId:'owner1',username:role,displayName:role,departments:['الرياضيات'],permissions}});
};
const permissions={reports:true,export:true,studentLevels:true,teacherAnalysis:true,failedStudents:true,compare:true};
for(const role of ['vice_principal','principal']){
 const el=runPortal(role,permissions);
 const originals=read(el,node=>node.type===ctx.xde);
 assert.equal(originals.length,1,role+': original component reused once');
 const props=originals[0].props;
 assert.equal(props.workspace.rows,workspace.rows,'same school rows supplied');
 assert.equal(props.workspace.settings.reportDesign,workspace.settings.reportDesign,'same report design supplied');
 assert.equal(props.readOnly,true);
 assert.equal(props.canPrint,true);
 assert.equal(read(el,node=>node.props?.children==='مركز التقارير والطباعة').length,1);
}
assert.equal(read(runPortal('coordinator',permissions),node=>node.type===ctx.xde).length,0,'coordinator never receives all-school report center');
assert.equal(read(runPortal('vice_principal',{...permissions,reports:false}),node=>node.type===ctx.xde).length,0,'requires reports permission');
assert.equal(read(runPortal('principal',{...permissions,export:false}),node=>node.type===ctx.xde)[0].props.canPrint,false,'export permission controls print');

// Render the real existing admin center in both modes; verify the same official 6 types, with no Excel admin export in leader mode.
const renderCenter=readOnly=>{
 let index=0;ctx.v={...ctx.v,useState:initial=>{index++;return [typeof initial==='function'?initial():initial,()=>{}]},useMemo:fn=>fn(),useEffect:()=>{},useCallback:fn=>fn(),useRef:x=>({current:x})};
 return ctx.xde({workspace,onExportExcel:()=>{},readOnly,canPrint:true,onSchoolSummary:readOnly?()=>{}:null});
};
const labels=['ملخص النتائج','تحليل المستويات','الطلاب المتعثرون','متوسطات المعلمين','مقارنة اختبارين','مقارنة المواد'];
const admin=renderCenter(false),leader=renderCenter(true);
for(const label of labels)assert.ok(read(admin,n=>n.props?.children===label).length>0,'admin official model '+label);
for(const label of ['ملخص المدرسة','مستويات الطلاب','تحصيل الصفوف والشعب','تحصيل المعلمين','مقارنة الاختبارين','مقارنة جميع المواد'])assert.ok(read(leader,n=>n.props?.children===label).length>0,'leader focused report '+label);
assert.equal(read(leader,n=>n.props?.children==='الطلاب المتعثرون').length,0,'hidden from leader report-card hub; still available in original dedicated tab');

assert.equal(read(leader,n=>n.props?.children==='Excel شامل').length,0,'global admin Excel action hidden from read-only portal');
console.log('PASS 6.10.43: original xde component reused by director and vice, six report templates unchanged, access gates, no admin Excel/export privileges.');
