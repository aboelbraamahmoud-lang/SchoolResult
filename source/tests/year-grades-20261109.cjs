/* Annual /100 certificate: no double counting of first-semester activities. */
const assert=require('node:assert/strict');
const {ctx}=require('./harness.cjs').loadApp(),S=ctx.SR63;
const base=ctx.Aj();
const settings={...base.settings,pass:50,
 termGradeRules:{enabled:true,finalExamKey:'exam2',midtermExamKey:'exam1',rounding:'ceil-half',subjects:{}},
 yearGradeRules:{enabled:true,firstFinalExamKey:'exam2',secondMidtermExamKey:'exam3',finalExamKey:'exam4',
  rounding:'ceil-half',subjects:{
   [S.subjectAliasKey('العلوم')]:{showFirstTerm:true,showMidterm:true,showActivity:true,showPractical:true,activityLabel:'نشاط الطالب'}
  }}
};
const makeRow=(subject,exam4=50,options={})=>({
 id:'year-'+subject,studentId:'555555555555',studentName:'طالب افتراضي',className:'7/1',grade:'السابع',subject,
 department:subject,teacher:'معلمة افتراضية',examClasses:{exam1:'7/1',exam2:'7/1',exam3:'7/1',exam4:'7/1'},
 scores:{exam1:30,exam2:50,exam3:15,exam4},
 statuses:{exam1:'present',exam2:'present',exam3:'present',exam4:'present'},
 totals:{exam1:30,exam2:50,exam3:15,exam4:50},
 termComponents:{
  exam2:{source:'first_term_final',originalExamPresent:true,activityRaw:50,
   practicalRaw:subject==='العلوم'?5:null,certificateOfficial:40},
  exam4:{source:'year_end_final',originalExamPresent:true,activityRaw:50,
   practicalRaw:subject==='العلوم'?5:null,certificateOfficial:100,secondTermOfficial:45}
 },
 ...options
});
const science=makeRow('العلوم'),science40=S.termGradeBreakdown(science,'exam2',settings),science100=S.yearGradeBreakdown(science,'exam4',settings);
assert.equal(science40.certificateScore,40);
assert.equal(science100.firstTermPart,40);
assert.equal(science100.midtermPart,15);
assert.equal(science100.examPart,35);
assert.equal(science100.practicalPart,5);
assert.equal(science100.activityPart,5);
assert.equal(science100.earnedSecond,45);
assert.equal(science100.calculated,100);
assert.equal(science100.certificateScore,100);
assert.equal(science100.certificateTotal,100);
assert.equal(S.certificateScore(science,'exam4',settings).certificateScore,100);
assert.equal(S.certificatePercentage(science,'exam4',settings),100);
const normal=makeRow('التربية الإسلامية'),normal100=S.yearGradeBreakdown(normal,'exam4',settings);
assert.equal(normal100.firstTermPart,40);
assert.equal(normal100.examPart,40);
assert.equal(normal100.practicalPart,0);
assert.equal(normal100.activityPart,5);
assert.equal(normal100.calculated,100);
assert.equal(normal100.certificateTotal,100);
assert.equal(S.termGradeBreakdown(normal,'exam4',settings).certificateScore,100);
const low=makeRow('العلوم',25),low100=S.yearGradeBreakdown(low,'exam4',settings);
assert.equal(low100.examPart,17.5);
assert.equal(low100.certificateScore,82.5);
assert.equal(low100.originalPercent,50);
assert.equal(S.certificatePercentage(low,'exam4',settings),50);
const analytics=ctx.bj([low],'exam4',settings);
assert.equal(analytics.achievement,50);
assert.equal(analytics.success,100);
assert.equal(analytics.certificateEarned,82.5);
const fail=makeRow('العلوم',0);
assert.equal(S.certificatePercentage(fail,'exam4',settings),0);
assert.equal(ctx.bj([fail],'exam4',settings).passed,0);
assert.equal(S.certificateScore(fail,'exam4',settings).certificateScore,65);
const absentActivity=makeRow('العلوم');
absentActivity.termComponents.exam4.activityRaw=null;
absentActivity.termComponents.exam4.certificateOfficial=null;
absentActivity.termComponents.exam4.secondTermOfficial=null;
assert.equal(S.yearGradeBreakdown(absentActivity,'exam4',settings).calculated,null);
assert.equal(S.yearGradeBreakdown(absentActivity,'exam4',settings).certificateScore,null);
assert.equal(S.certificateScore(absentActivity,'exam4',settings),null);
assert.equal(ctx.bj([absentActivity],'exam4',settings).achievement,100);
const secondOfficial=makeRow('العلوم');
secondOfficial.termComponents.exam4.activityRaw=null;
secondOfficial.termComponents.exam4.certificateOfficial=null;
const officialYear=S.yearGradeBreakdown(secondOfficial,'exam4',settings);
assert.equal(officialYear.calculated,null);
assert.equal(officialYear.officialBuilt,100);
assert.equal(officialYear.officialUsed,true);
assert.equal(officialYear.certificateScore,100);
const discrepant=makeRow('العلوم');
discrepant.termComponents.exam4.certificateOfficial=98;
assert.equal(S.yearGradeBreakdown(discrepant,'exam4',settings).discrepancy,true);
assert.equal(S.yearGradeBreakdown(discrepant,'exam4',settings).certificateScore,100);
const noMidterm=makeRow('العلوم');
noMidterm.scores.exam3=null;noMidterm.statuses.exam3='unentered';
noMidterm.termComponents.exam4.certificateOfficial=null;
noMidterm.termComponents.exam4.secondTermOfficial=null;
assert.equal(S.yearGradeBreakdown(noMidterm,'exam4',settings).certificateScore,null);
assert.equal(S.yearGradeBreakdown(noMidterm,'exam4',settings).midtermPart,null);
const official=makeRow('المهارات الحياتية والمهنية',92);
official.totals.exam4=100;
official.termComponents.exam4={source:'year_end_final',originalExamPresent:false,activityRaw:null,practicalRaw:null,certificateOfficial:92,secondTermOfficial:null};
const officialResult=S.yearGradeBreakdown(official,'exam4',settings);
assert.equal(officialResult.originalPercent,null);
assert.equal(officialResult.certificateScore,92);
assert.equal(S.certificatePercentage(official,'exam4',settings),null);
assert.equal(ctx.bj([official],'exam4',settings).achievement,null);
const toggles=JSON.parse(JSON.stringify(S.termPrintColumns(settings,'exam4',['العلوم'])));
assert.deepEqual(toggles,{exam:true,firstFinal:true,midterm:true,activity:true,practical:true});
const cfgRule=S.yearSubjectRule(settings,'العلوم');
assert.equal(cfgRule.examRawTotal,50);assert.equal(cfgRule.examWeight,35);
assert.equal(cfgRule.firstTermWeight+cfgRule.secondMidtermWeight+cfgRule.examWeight+cfgRule.practicalWeight+cfgRule.activityWeight,100);
const customSettings={...settings,yearGradeRules:{...settings.yearGradeRules,subjects:{[S.subjectAliasKey('العلوم')]:{examWeight:34,practicalWeight:6}}}};
assert.equal(S.yearGradeBreakdown(science,'exam4',customSettings).certificateScore,100);
assert.doesNotThrow(()=>S.validate({...base,settings,rows:[science]}));
assert.equal(S.validate({...base,settings,rows:[science]}).workspace.rows[0].termComponents.exam4.activityRaw,50);
assert.throws(()=>S.validate({...base,settings:{...customSettings,yearGradeRules:{...customSettings.yearGradeRules,subjects:{[S.subjectAliasKey('العلوم')]:{examWeight:39}}}},rows:[]}),/مجموع أوزان/);
const header=['الرقم','الاسم','الشعبة الصفية','نشاط الطالب','الاختبار العملي','الاختبار النظري','نهاية الفصل الأول','نهاية الفصل الثاني','نهاية العام'];
const book={Sheets:{العلوم:ctx.Gv.aoa_to_sheet([
 ['مدرسة افتراضية'],['المادة: العلوم - الفترة: نهاية الفصل الثاني'],header,
 [555555555555,'طالب افتراضي','07/1',50,5,50,40,45,100]
 ])}};
const sheet={sheet:'العلوم',subject:'العلوم',headerRow:3,selected:true,
 scoreColumns:[{index:8,key:'8',header:'نهاية العام',numericCount:1}],selectedScoreKey:'8',
 rows:[{id:'import-year',studentId:'555555555555',studentName:'طالب افتراضي',className:'7/1',grade:'السابع',sourceRow:4,
  values:{'8':{score:100,status:'present',recognized:true}}}],issues:[]};
S.termAttachWorkbookPreview([sheet],book,'annual.xlsx',settings);
assert.equal(sheet.termFinal,undefined,'Annual sheet with first-semester column must never be imported as exam2.');
S.yearAttachWorkbookPreview([sheet],book,'annual.xlsx',settings);
assert.equal(sheet.exam,'exam4');assert.equal(sheet.selectedScoreKey,'5');
assert.equal(sheet.scoreColumns.find(c=>c.index===5).suggestedTotal,50);
assert.equal(sheet.rows[0].termComponents.activityRaw,50);
assert.equal(sheet.rows[0].termComponents.practicalRaw,5);
assert.equal(sheet.rows[0].termComponents.certificateOfficial,100);
assert.equal(sheet.rows[0].termComponents.secondTermOfficial,45);
assert.equal(sheet.issues.length,0);
const upload=ctx.O9([{fileName:'annual.xlsx',sheets:[sheet]}]);
assert.equal(upload.length,1);assert.equal(upload[0].exam,'exam4');
assert.equal(upload[0].score,50);assert.equal(upload[0].termComponents.source,'year_end_final');
assert.equal(upload[0].termComponents.certificateOfficial,100);
const direct={sheet:'التربية الإسلامية',subject:'التربية الإسلامية',headerRow:3,selected:true,scoreColumns:[{index:3,key:'3',header:'نهاية العام',numericCount:1}],
 selectedScoreKey:'3',rows:[{id:'only-official',studentId:'555555555555',studentName:'طالب افتراضي',className:'7/1',sourceRow:4,values:{'3':{score:92,status:'present',recognized:true}}}],issues:[]};
const directBook={Sheets:{'التربية الإسلامية':ctx.Gv.aoa_to_sheet([
 ['مدرسة افتراضية'],['المادة: التربية الإسلامية - الفترة: نهاية العام'],['الرقم','الاسم','الشعبة الصفية','نهاية العام'],
 [555555555555,'طالب افتراضي','07/1',92]])}};
S.yearAttachWorkbookPreview([direct],directBook,'direct.xlsx',settings);
assert.equal(direct.selectedScoreKey,'3');assert.equal(direct.scoreColumns[0].suggestedTotal,100);
assert.equal(direct.rows[0].termComponents.originalExamPresent,false);
assert.equal(direct.rows[0].termComponents.certificateOfficial,92);
const firstDisabled={...settings,termGradeRules:{...settings.termGradeRules,enabled:false}};
const fromOfficial=makeRow('العلوم');
fromOfficial.termComponents.exam2.certificateOfficial=38;
assert.equal(S.yearGradeBreakdown(fromOfficial,'exam4',firstDisabled).firstTermPart,38,
 'When prior term rules are off, use the official semester /40, not raw exam /50');
console.log('PASS annual /100: science/regular, first 40, mid 15, no double counting, original exam analytics, official fallback, Excel and admin weights');
