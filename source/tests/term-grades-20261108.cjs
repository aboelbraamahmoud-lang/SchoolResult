/* First-term 40-mark certificate: science, core subjects, imports and raw analytics. */
const assert=require('node:assert/strict');
const {ctx}=require('./harness.cjs').loadApp(),S=ctx.SR63;
const w=ctx.Aj(),settings={...w.settings,pass:50,
 termGradeRules:{enabled:true,finalExamKey:'exam2',midtermExamKey:'exam1',rounding:'ceil-half',
 subjects:{[S.subjectAliasKey('العلوم')]:{showMidterm:true,showActivity:true,showPractical:true,activityLabel:'أعمال الفصل والأنشطة'}}}
};
const row=(subject,examScore,midScore,activity,practical,official)=>({
 id:'test-'+subject,studentId:'12345678901',studentName:'طالب تجريبي',grade:'السابع',className:'7/1',
 subject,department:subject,teacher:'معلم تجريبي',scores:{exam1:midScore,exam2:examScore,exam3:null,exam4:null},
 statuses:{exam1:midScore===null?'unentered':'present',exam2:'present',exam3:'unentered',exam4:'unentered'},
 totals:{exam1:30,exam2:50,exam3:null,exam4:null},
 examTeachers:{exam1:'معلم تجريبي',exam2:'معلم تجريبي'},
 examClasses:{exam1:'7/1',exam2:'7/1'},
 termComponents:{exam2:{source:'first_term_final',activityRaw:activity,practicalRaw:practical,certificateOfficial:official}}
});
const science=row('العلوم',35,24,50,5,32),term=S.termGradeBreakdown(science,'exam2',settings);
assert.equal(term.examPart,10.5);assert.equal(term.practicalPart,5);assert.equal(term.activityPart,5);
assert.equal(term.midtermPart,12);assert.equal(term.calculated,32.5);assert.equal(term.certificateTotal,40);
assert.equal(term.certificateScore,32.5);assert.equal(term.discrepancy,true);
assert.equal(term.originalPercent,70);assert.equal(S.certificatePercentage(science,'exam2',settings),70);
assert.equal(S.certificateScore(science,'exam2',settings).certificateScore,32.5);
const metrics=ctx.bj([science],'exam2',settings);
assert.equal(metrics.achievement,70);assert.equal(metrics.success,100);assert.equal(metrics.certificateEarned,32.5);
const flags=S.termPrintColumns(settings,'exam2',['العلوم']);
assert.deepEqual(JSON.parse(JSON.stringify(flags)),{exam:true,midterm:true,activity:true,practical:true});
assert.equal(S.termSubjectRule(settings,'العلوم').activityLabel,'أعمال الفصل والأنشطة');
const core=row('التربية الإسلامية',49,25,50,null,null),islam=S.termGradeBreakdown(core,'exam2',settings);
assert.equal(islam.examPart,20);assert.equal(islam.activityPart,5);assert.equal(islam.midtermPart,12.5);
assert.equal(islam.calculated,37.5);assert.equal(islam.certificateTotal,40);
const noMid=row('العلوم',35,null,50,5,32),fallback=S.termGradeBreakdown(noMid,'exam2',settings);
assert.equal(fallback.calculated,null);assert.equal(fallback.officialUsed,true);
assert.equal(fallback.certificateScore,32);assert.equal(S.certificatePercentage(noMid,'exam2',settings),70);
const missingOfficial=row('العلوم',35,null,50,5,null);
assert.equal(S.termGradeBreakdown(missingOfficial,'exam2',settings).certificateScore,null);
assert.equal(S.certificateScore(missingOfficial,'exam2',settings),null);
assert.equal(ctx.bj([missingOfficial],'exam2',settings).achievement,70);
const official=row('التربية البدنية',46,null,null,null,37);
assert.equal(S.termGradeBreakdown(official,'exam2',settings).certificateScore,37);
assert.equal(S.termGradeBreakdown(official,'exam2',settings).officialUsed,true);
const skills=row('المهارات الحياتية والمهنية',37,null,null,null,37);
skills.totals.exam2=40;skills.termComponents.exam2.originalExamPresent=false;
const skillsGrade=S.termGradeBreakdown(skills,'exam2',settings);
assert.equal(skillsGrade.certificateScore,37);assert.equal(skillsGrade.originalPercent,null);
assert.equal(S.certificateScore(skills,'exam2',settings).passed,true);
assert.equal(S.certificatePercentage(skills,'exam2',settings),null);
assert.equal(ctx.bj([skills],'exam2',settings).achievement,null);
const direct={sheet:'المهارات الحياتية والمهنية',headerRow:3,subject:'المهارات الحياتية والمهنية',selected:true,
 scoreColumns:[{key:'3',index:3,header:'نهاية الفصل الأول',numericCount:1}],selectedScoreKey:'3',
 rows:[{id:'direct-1',studentId:'12345678901',studentName:'طالب تجريبي',grade:'السابع',className:'7/1',sourceRow:4,
 values:{'3':{score:37,status:'present',recognized:true}}}],issues:[]};
const directBook={Sheets:{'المهارات الحياتية والمهنية':ctx.Gv.aoa_to_sheet([
 ['مدرسة تجريبية'],['المادة:المهارات الحياتية والمهنية - الفترة:نهاية الفصل الأول'],
 ['الرقم','الاسم','الشعبة الصفية','نهاية الفصل الأول'],
 [12345678901,'طالب تجريبي','07/1',37]])}};
S.termAttachWorkbookPreview([direct],directBook,'skills.xlsx',settings);
assert.equal(direct.exam,'exam2');assert.equal(direct.selectedScoreKey,'3');
assert.equal(direct.rows[0].termComponents.originalExamPresent,false);
assert.equal(direct.rows[0].termComponents.certificateOfficial,37);

const saved={...w,settings,rows:[science]};
assert.doesNotThrow(()=>S.validate(saved));
assert.equal(S.validate(saved).workspace.rows[0].termComponents.exam2.practicalRaw,5,'Saving/validating must retain practical component');
const broken={...w,settings:{...settings,termGradeRules:{...settings.termGradeRules,subjects:{[S.subjectAliasKey('العلوم')]:{examWeight:16}}}}};
assert.throws(()=>S.validate(broken),/مجموع أوزان/);
const xlsx=ctx.Gv,header=['الرقم','الاسم','الشعبة الصفية','نشاط الطالب','تقييمات قصيرة','الواجبات والتدريبات','المشاركة الصفية','مشروع','الاختبار العملي','الاختبار النظري','الملحق','نهاية الفصل الأول'];
const book={Sheets:{العلوم:xlsx.aoa_to_sheet([['مدرسة تجريبية'],['المادة:العلوم - الفترة:نهاية الفصل الأول'],header,[12345678901,'طالب تجريبي','07/1',50,20,10,5,15,5,35,null,32]])}};
const sheet={sheet:'العلوم',headerRow:3,subject:'العلوم',selected:true,scoreColumns:[{key:'11',index:11,header:'نهاية الفصل الأول',numericCount:1}],selectedScoreKey:'11',rows:[{id:'import-1',studentId:'12345678901',studentName:'طالب تجريبي',grade:'السابع',className:'7/1',sourceRow:4,values:{'11':{score:32,status:'present',recognized:true}}}],issues:[]};
S.termAttachWorkbookPreview([sheet],book,'science.xlsx',settings);
assert.equal(sheet.selectedScoreKey,'9');
assert.equal(sheet.rows[0].termComponents.practicalRaw,5);
assert.equal(sheet.rows[0].termComponents.activityRaw,50);
assert.equal(sheet.rows[0].termComponents.certificateOfficial,32);
assert.equal(sheet.exam,'exam2');assert.equal(sheet.scoreColumns.find(x=>x.index===9).suggestedTotal,50);
assert.equal(sheet.issues.length,0);
const all=ctx.O9([{fileName:'science.xlsx',sheets:[sheet]}]);
assert.equal(all.length,1);assert.equal(all[0].score,35);assert.equal(all[0].termComponents.practicalRaw,5);
assert.equal(all[0].exam,'exam2');
console.log('PASS: /40 science & core subjects, raw analytics, no invented zeros, official fallback, import, admin validation');
