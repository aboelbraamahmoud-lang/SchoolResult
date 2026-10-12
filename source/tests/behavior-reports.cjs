const assert=require('node:assert/strict');
const fs=require('fs');const path=require('path');const vm=require('vm');
const root=path.resolve(__dirname,'..');
const context={SR63:{},TextEncoder,Uint8Array,DataView,Date,Set,Map,Object,Number,Array,RegExp};
context.Gv={sheet_to_json:(sheet)=>sheet};vm.createContext(context);
for(const file of ['behavior-template.js','behavior-reports.js'])vm.runInContext(fs.readFileSync(path.join(root,'src',file),'utf8'),context,{filename:file});
const subjects=context.SR63.behaviorReportSubjects;
assert.equal(subjects.length,9);
const fakeNames=['طالب تجريبي','طالب آخر','طالب دعم إضافي'];
const fakeClasses=['07/1','07/1','07/ESE'];
const fakeSubjects=subjects.map(s=>s.sheet);
const fixture=Object.fromEntries(fakeSubjects.map((sheet,i)=>[sheet,[
 ['الرقم','الاسم','الصف','المستوى الأكاديمي','التفاعل والمشاركة','احضار الكتب والادوات','الواجبات','السلوك',sheet],
 ...fakeNames.map((name,j)=>[j+1,name,fakeClasses[j],i===0&&j===2?'':'ممتاز','فعال','دائما','مكتمل','ممتاز',''])
]]));
const book={SheetNames:Object.keys(fixture),Sheets:fixture};
const model=context.SR63.behaviorReportParse(book,'example.xlsx',{rows:[]});
assert.equal(model.sheets.length,9);
assert.equal(model.students.length,3);
assert(model.students.every(s=>typeof s.name==='string'&&s.name.length>3&&s.className.includes('/')));
assert(new Set(model.students.map(s=>s.id)).size===model.students.length);
assert.equal(model.missing,1);
assert.equal(model.students.find(x=>x.name==='طالب دعم إضافي').subjects.islamic[0],'');
assert(model.students.some(s=>/ESE/i.test(s.className)));
const present=model.students.find(s=>Object.keys(s.subjects).length===9);
assert(present);assert(present.subjects.islamic.length===5);
const sanitized={...present,name:'طالب تجريبي',className:'07/1'};
assert(context.SR63.behaviorCertificateHtml(sanitized,{principalName:'مدير تجريبي'}).includes('مدير تجريبي'));
const one=context.SR63.behaviorBuildWord([sanitized],{schoolName:'مدرسة تجريبية للبنين',month:'أكتوبر 2026',academicYear:'2026/2027',principalName:'مدير تجريبي'});
fs.writeFileSync(path.join(__dirname,'output/behavior-individual.docx'),Buffer.from(one.bytes));
const two=context.SR63.behaviorBuildWord([sanitized,{...sanitized,id:'other',name:'طالب آخر'}],{schoolName:'مدرسة تجريبية للبنين',month:'أكتوبر 2026',academicYear:'2026/2027',principalName:'مدير تجريبي'});
fs.writeFileSync(path.join(__dirname,'output/behavior-batch.docx'),Buffer.from(two.bytes));
console.log('Behavior reports tests passed: subjects',model.sheets.length,'students',model.students.length,'classes',new Set(model.students.map(s=>s.className)).size,'missing',model.missing,'warnings',model.issues.length);
