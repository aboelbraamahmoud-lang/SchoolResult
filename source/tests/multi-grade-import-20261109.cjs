/* Multi-column import and annual certificate end-to-end regression. */
const assert=require('node:assert/strict');
const {ctx}=require('./harness.cjs').loadApp(),S=ctx.SR63,G=ctx.Gv;
const base=ctx.Aj(),settings={...base.settings,pass:50,
 termGradeRules:{enabled:true,finalExamKey:'exam2',midtermExamKey:'exam1',rounding:'ceil-half',subjects:{}},
 yearGradeRules:{enabled:true,firstFinalExamKey:'exam2',secondMidtermExamKey:'exam3',finalExamKey:'exam4',rounding:'ceil-half',subjects:{}}};
const id='123456789010',name='طالب اختباري';
function load(subject,period,headers,values,options={}){
 const book={Sheets:{'نتائج المادة':G.aoa_to_sheet([headers,[id,name,'07/1',...values]])}};
 const row={id:'row-'+period,studentId:id,studentName:name,className:'7/1',grade:'السابع',
  sourceRow:2,values:{}};
 const sheet={id:'sheet-'+period,sheet:'نتائج المادة',sourceSheet:'نتائج المادة',subject,period,headerRow:1,
  selected:true,scoreColumns:options.scoreColumns||[],selectedScoreKey:options.selectedScoreKey||'',rows:[row],issues:[],
  ...options};
 S.gradeImportPrepare([sheet],book,settings);
 return {sheet,row,book,item:S.gradeImportItem(sheet,row,'marks.xlsx',settings)};
}
const mid1=load('التربية الإسلامية','منتصف الفصل الأول',['الرقم','الاسم','الشعبة الصفية','درجة الاختبار','درجة الشهادة'],[24,11]);
assert.equal(mid1.sheet.exam,'exam1');
assert.ok(mid1.sheet.gradeColumns.raw&&mid1.sheet.gradeColumns.certificate);
assert.notEqual(mid1.sheet.gradeColumns.raw,mid1.sheet.gradeColumns.certificate);
assert.equal(mid1.item.score,24);assert.equal(mid1.item.termComponents.certificateOfficial,11);
const first=load('التربية الإسلامية','نهاية الفصل الأول',['الرقم','الاسم','الشعبة الصفية','الاختبار النظري','نشاط الطالب','نهاية الفصل الأول'],[25,40,25]);
assert.equal(first.item.score,25);assert.equal(first.item.termComponents.activityRaw,40);
assert.equal(first.item.termComponents.certificateOfficial,25);
const mid2=load('التربية الإسلامية','منتصف الفصل الثاني',['الرقم','الاسم','الشعبة الصفية','درجة الاختبار','درجة الشهادة'],[27,12]);
const end=load('التربية الإسلامية','نهاية العام',['الرقم','الاسم','الشعبة الصفية','الاختبار النظري','نشاط الطالب','نهاية العام'],[30,45,66]);
function combine(subject,items){
 const rows=Object.fromEntries(items.map(x=>[x.item.exam,x.item]));
 const row={id:'combined',studentId:id,studentName:name,subject,className:'7/1',grade:'السابع',
  scores:{},totals:{},statuses:{},termComponents:{}};
 for(const exam of ['exam1','exam2','exam3','exam4']){
  const item=rows[exam];
  row.scores[exam]=item?.score??null;
  row.statuses[exam]=item?.status??'unentered';
  row.totals[exam]=item?.totalOverride??(exam==='exam1'||exam==='exam3'?30:50);
  if(item?.termComponents)row.termComponents[exam]=item.termComponents;
 }
 return row;
}
const normal=combine('التربية الإسلامية',[mid1,first,mid2,end]);
assert.equal(S.certificateScore(normal,'exam1',settings).certificateScore,11);
assert.equal(S.certificateScore(normal,'exam1',settings).originalPercent,80);
assert.equal(S.termGradeBreakdown(normal,'exam2',settings).midtermPart,11,'midterm official /15, not raw 24/30');
assert.equal(S.termGradeBreakdown(normal,'exam2',settings).activityPart,4,'activity 40/50 -> 4/5');
assert.equal(S.termGradeBreakdown(normal,'exam2',settings).certificateScore,25);
const annual=S.yearGradeBreakdown(normal,'exam4',settings);
assert.equal(annual.firstTermPart,25);assert.equal(annual.midtermPart,12);
assert.equal(annual.examPart,24);assert.equal(annual.activityPart,4.5);
assert.equal(annual.calculated,65.5);assert.equal(annual.discrepancy,true);
assert.equal(annual.officialAnnual,66);assert.equal(S.certificatePercentage(normal,'exam4',settings),60);
const scienceFirst=load('العلوم','نهاية الفصل الأول',['الرقم','الاسم','الشعبة الصفية','الاختبار النظري','نشاط الطالب','الاختبار العملي','نهاية الفصل الأول'],[35,45,5,31]);
const scienceEnd=load('العلوم','نهاية العام',['الرقم','الاسم','الشعبة الصفية','الاختبار النظري','نشاط الطالب','الاختبار العملي','نهاية العام'],[25,40,4,69]);
const science=combine('العلوم',[mid1,scienceFirst,mid2,scienceEnd]);
const science40=S.termGradeBreakdown(science,'exam2',settings),science100=S.yearGradeBreakdown(science,'exam4',settings);
assert.equal(science40.activityPart,4.5);assert.equal(science40.practicalPart,5);
assert.equal(science40.certificateScore,31);
assert.equal(science100.firstTermPart,31);assert.equal(science100.midtermPart,12);
assert.equal(science100.examPart,17.5);assert.equal(science100.activityPart,4);assert.equal(science100.practicalPart,4);
assert.equal(science100.certificateScore,68.5);
const onlyFirst=load('التربية الإسلامية','نهاية الفصل الأول',['الرقم','الاسم','الشعبة الصفية','نهاية الفصل الأول'],[38]);
assert.equal(onlyFirst.item.score,38);
assert.equal(onlyFirst.item.totalOverride,40);
assert.equal(onlyFirst.item.termComponents.originalExamPresent,false);
const onlyYear=load('العلوم','نهاية العام',['الرقم','الاسم','الشعبة الصفية','نهاية العام'],[92]);
assert.equal(onlyYear.item.score,92);assert.equal(onlyYear.item.totalOverride,100);
assert.equal(onlyYear.item.termComponents.originalExamPresent,false);
const officialYearRow=combine('العلوم',[onlyYear]);
assert.equal(ctx.bj([officialYearRow],'exam4',settings).achievement,null);
assert.equal(ctx.bj([officialYearRow],'exam4',settings).certificateEarned,92);
const officialMid=load('التربية الإسلامية','منتصف الفصل الأول',['الرقم','الاسم','الشعبة الصفية','درجة الشهادة'],[13]);
assert.equal(officialMid.item.score,13);assert.equal(officialMid.item.totalOverride,15);
const justMid=combine('التربية الإسلامية',[officialMid]);
assert.equal(S.certificateScore(justMid,'exam1',settings).certificateScore,13);
assert.equal(S.certificateScore(justMid,'exam1',settings).originalPercent,null);
assert.equal(S.certificatePercentage(justMid,'exam1',settings),null);
assert.equal(ctx.vj(justMid,'exam1',settings),null,'Official-only midterm must not be mistaken for a raw exam');
assert.equal(ctx.bj([justMid],'exam1',settings).achievement,null);
assert.equal(ctx.bj([justMid],'exam1',settings).certificateEarned,13,'Official-only certificates appear in certificate totals, never raw attainment');
assert.equal(ctx.bj([normal],'exam1',settings).achievement,80,'Midterm attainment must use 24/30 rather than official 11/15');
const invalid=load('العلوم','نهاية العام',['الرقم','الاسم','الشعبة الصفية','الاختبار النظري','نشاط الطالب','الاختبار العملي','نهاية العام'],[50,51,5,100]);
assert.equal(invalid.item.recognized,false,'Activity above 50 blocks import');
const duplicate=load('العلوم','نهاية العام',['الرقم','الاسم','الشعبة الصفية','الاختبار النظري','نشاط الطالب','نهاية العام'],[50,40,100]);
duplicate.sheet.gradeColumns.activity=duplicate.sheet.gradeColumns.raw;
assert.equal(S.gradeImportItem(duplicate.sheet,duplicate.row,'duplicate.xlsx',settings).recognized,false);
const wide=load('العلوم','منتصف الفصل الثاني',['الرقم','الاسم','الشعبة الصفية','درجة الاختبار','درجة الشهادة'],[25,13],{
 exam:'exam3',scoreColumns:[{key:'3',index:3,header:'درجة الاختبار',suggestedTotal:30,totalKnown:true}],selectedScoreKey:'3',wide:true
});
assert.equal(wide.sheet.gradeColumns.raw,'3');assert.equal(wide.sheet.gradeColumns.certificate,'4');
assert.equal(wide.item.termComponents.certificateOfficial,13);
const officialOnlyNew={...officialMid.item,termComponents:{...officialMid.item.termComponents,certificateOfficial:13}};
const keepExistingRaw=S.gradeImportMergeRow(normal,officialOnlyNew,'exam1',15);
assert.equal(keepExistingRaw.score,24,'official-only reimport cannot destroy saved raw test /30');
assert.equal(keepExistingRaw.total,30);
assert.equal(keepExistingRaw.components.originalExamPresent,true);
assert.equal(keepExistingRaw.components.certificateOfficial,13,'new official midterm mark retained');
const rawOnlyAgain={...mid1.item,termComponents:{...mid1.item.termComponents,certificateOfficial:null}};
const keepOfficial=S.gradeImportMergeRow(normal,rawOnlyAgain,'exam1',30);
assert.equal(keepOfficial.score,24);
assert.equal(keepOfficial.components.certificateOfficial,11,'raw-only reimport must retain stored official /15');
const partialActivity={...end.item,termComponents:{...end.item.termComponents,activityRaw:null}};
const keepActivity=S.gradeImportMergeRow(normal,partialActivity,'exam4',50);
assert.equal(keepActivity.components.activityRaw,45,'reimport may not silently clear activity /50');
// Exercise the actual uploaded workbook parser and item mapper, not just the helpers.
const uploaded={SheetNames:['العلوم'],Sheets:{العلوم:G.aoa_to_sheet([
 ['مدرسة افتراضية'],['المادة: العلوم - الفترة: نهاية العام'],
 ['الرقم','الاسم','الشعبة الصفية','الاختبار النظري','نشاط الطالب','الاختبار العملي','نهاية العام'],
 [id,name,'07/1',25,40,4,69]
])}};
const oldReader=ctx.hv;
let parsed;
try{ctx.hv=()=>uploaded;parsed=ctx.ode(new Uint8Array(0),'uploaded-science.xlsx',settings);}
finally{ctx.hv=oldReader;}
assert.ok(parsed.sheets.length>0,'Excel upload must produce a selectable sheet');
const readSheet=parsed.sheets.find(s=>s.exam==='exam4'&&S.subjectAliasKey(s.subject)===S.subjectAliasKey('العلوم'));
assert.ok(readSheet,'Period and subject must be detected from workbook metadata');
assert.ok(readSheet.gradeColumns.raw&&readSheet.gradeColumns.activity&&readSheet.gradeColumns.practical&&readSheet.gradeColumns.certificate);
const items=ctx.O9([parsed],settings);
assert.equal(items.length,1);
assert.equal(items[0].score,25);assert.equal(items[0].termComponents.activityRaw,40);
assert.equal(items[0].termComponents.practicalRaw,4);
assert.equal(items[0].termComponents.certificateOfficial,69);
console.log('PASS multi-column mapping: four exams, official midterms, 50-to-5 activity, science practical, official-only, wide Excel and validation');
