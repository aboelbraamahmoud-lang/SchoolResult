const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),results=[];const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function test(name,fn){try{fn();results.push({name,status:'pass'});console.log('PASS '+name);}catch(error){results.push({name,status:'fail',error:error.stack});console.error('FAIL '+name+'\n'+error.message);}}
const app=read('app.js'),css=read('source/src/repair.css'),reports=read('source/src/reports.js'),student=read('source/src/student-results-print.js'),patch=read('source/src/patches/reports.js');

test('student print includes academic ID and calculation disclosure',()=>{assert.match(student,/الرقم الأكاديمي/);assert.match(student,/النتائج المرصودة للحضور فقط/);assert.match(student,/النائب الأكاديمي/);assert.match(student,/مدير المدرسة/);});
test('import page contains reconciliation before commit',()=>{assert.match(app,/مصالحة الدفعة قبل الاعتماد/);assert.match(app,/الطالب يُحسب مرة واحدة/);assert.match(css,/\.sr610-import-reconciliation/);});
test('executive report is wired into report center',()=>{assert.match(app,/id:`executive`/);assert.match(reports,/function SRExecutiveReport/);assert.match(css,/\.executive-report-grid/);});
test('quality issues can navigate directly to academic structure',()=>{assert.match(app,/onClick:\(\)=>s\(e\.category===`المعلمون`\|\|e\.category===`الإسناد`\?`masterData`:`data`\)/);assert.match(app,/فتح موضع الإصلاح/);});
test('teacher analytics carries fairness disclaimer',()=>{assert.match(app,/قراءة وصفية لأداء المعلمين/);assert.match(reports,/لا تُستخدم منفردة للحكم على أداء المعلم/);});
test('comparison report exposes paired sample caution',()=>{assert.match(reports,/العينة المشتركة/);assert.match(reports,/minSampleSize/);assert.match(css,/comparison-sample-note/);});
test('targeted students report has follow-up workflow columns',()=>{assert.match(reports,/target-followup-owner/);assert.match(reports,/target-followup-state/);assert.match(reports,/قيد المتابعة/);});
test('official logo is external and patch payload is compact',()=>{assert.match(patch,/src:'\.\/moehe\.png'/);assert.ok(!patch.includes('data:image/png;base64,'));assert.ok(Buffer.byteLength(patch)<20000);});
test('wide report CSS keeps readable floor and pagination support',()=>{assert.match(css,/grade-subject-matrix-official/);assert.match(css,/department-subject-matrix-official/);assert.ok(!/font-size:\s*[1-4](?:\.\d+)?px!important/.test(css.slice(css.lastIndexOf('6.10.0'))));});
test('subject comparison print uses compact cells with bold black subject and grade labels',()=>{const block=css.slice(css.lastIndexOf('6.10.3'));assert.match(block,/official-subject-head[\s\S]*color:#000!important/);assert.match(block,/grade-matrix-class[\s\S]*color:#000!important/);assert.match(block,/official-comparison-caption[\s\S]*color:#050505!important/);assert.match(block,/grade-matrix-percent-head[\s\S]*width:(?:5\.15|6\.4)mm!important/);assert.match(block,/grade-matrix-value \.report-meter[\s\S]*min-height:2\.82mm!important/);});
test('all-subject landscape report uses colgroup for teacher and metric widths',()=>{assert.match(reports,/grade-subject-matrix-all/);assert.match(reports,/95\.4\*\.625\/data\.subjects\.length/);assert.match(css,/6\.10\.10 — print ten school subjects on one landscape A4 sheet/);});
test('legacy misleading terminology is absent from generated runtime',()=>{for(const term of ['طلاب فريدون','نتائج مقيمة','نتيجة مقيمة','حاضر/مقيم'])assert.ok(!app.includes(term),term);});
test('import preview lists real per-class counts and blocks erroneous Excel sheets',()=>{assert.match(app,/توزيع الشعب:/);assert.match(app,/توقف الاعتماد:/);assert.match(app,/importSectionLabel/);});
test('sidebar release label is current',()=>{assert.match(app,/الإصدار 6\.10\.15/);assert.ok(!app.includes('الإصدار 6.2 الاحترافي'));});


test('legacy subject repair requires explicit action and pre-change snapshot',()=>{assert.match(app,/إصلاح الربط الحالي بأمان/);assert.match(app,/قبل إصلاح ربط المواد والمعلمين/);assert.match(app,/subjectLinkRepairPreview/);});
test('dashboard supports persistent subject scope for main summaries',()=>{assert.match(app,/المواد المحتسبة في ملخصات ورسوم الرئيسية/);assert.match(app,/dashboardSubjects/);assert.match(css,/\.sr610-dashboard-scope/);});
test('results clearing can target one assessment',()=>{assert.match(app,/تفريغ الاختبار المحدد/);assert.match(app,/SR63\.clearResults/);assert.match(app,/جميع الاختبارات/);});
test('heavy report previews are prepared on demand',()=>{assert.match(app,/تجهيز المعاينة/);assert.match(app,/المعاينة تُنشأ عند الطلب/);assert.match(student,/المعاينة لم تُنشأ بعد/);});
test('coordinator is not rendered in report header',()=>{assert.ok(!patch.includes("className:'report-coordinator'"));assert.match(app,/منسق المادة/);});
test('comparison page contains a dedicated visual trend chart',()=>{assert.match(app,/SR63\.AssessmentComparisonChart/);assert.match(app,/الاتجاه البصري للاختبارات/);});
test('ESE support cohort is wired into dashboard and reports',()=>{assert.match(app,/قسم الدعم الإضافي/);assert.match(app,/id:`support`/);assert.match(reports,/function SRSupportDepartmentReport/);assert.match(reports,/SR63\.supportReportPages/);assert.match(css,/\.sr610-support-panel/);});
test('subject names and order are editable in settings and applied to all report views',()=>{
  assert.match(app,/SR63\.SubjectPresentationSettings/);
  assert.match(app,/subjectReportOrder/);
  assert.match(app,/SR63\.reportSubjectLabel/);
  assert.match(reports,/SR63\.reportSubjectCompare/);
  assert.match(css,/sr611-subject-editor/);
  assert.match(css,/grade-subject-matrix-all \.grade-matrix-teacher/);
});
test('teacher report displays full assessment label without clipping',()=>{
  assert.match(reports,/report-meta-grid teacher-report-meta/);
  assert.match(css,/6\.10\.15 — full-width, non-truncating assessment names/);
  const block=css.slice(css.indexOf('6.10.15 — full-width'));
  assert.match(block,/report-context-compact\{[\s\S]*width:calc\(100% - 2mm\)!important/);
  assert.match(block,/report-context-compact p b\{[\s\S]*white-space:normal!important/);
  assert.match(block,/report-context-compact p b\{[\s\S]*text-overflow:clip!important/);
  assert.match(block,/teacher-report-meta\{[\s\S]*grid-template-columns:minmax\(0,1\.1fr\)/);
  assert.match(block,/teacher-report-meta>\*\{[\s\S]*white-space:normal!important/);
});

test('single-assessment grade review and report are wired with safe snapshots',()=>{
 const code=read('source/src/grade-review.js');
 assert.match(app,/id:`studentGradeReview`/);
 assert.match(app,/SR63.StudentGradeReview/);
 assert.match(code,/SR63.gradeReviewApply/);
 assert.match(code,/Kj\(workspace,'قبل تعديل درجة أو حالة طالب من مراجعة الدرجات'\)/);
 assert.match(code,/SR63.gradeReviewExcel/);
 assert.match(code,/SR63.gradeReviewPrint/);
 assert.match(css,/\.sr613-grade-review/);
 assert.match(code,/SR63.isSupportClass/);
});

test('four analytics tables have independent RTL legibility classes',()=>{
  for(const name of ['levels','matrix','departments','results']){
    assert.ok(app.includes('sr614-'+name+'-wrap'),name+' missing runtime');
    assert.ok(css.includes('.sr614-'+name+'-wrap'),name+' missing stylesheet');
  }
  for(const size of ['755px','1180px','1280px','1450px'])assert.ok(css.includes('min-width:'+size),size);
  assert.ok(css.includes('white-space:normal!important'));
  assert.ok(css.includes('border-left:1px solid #d2e0e7!important'));
});

const report={passed:results.filter(x=>x.status==='pass').length,failed:results.filter(x=>x.status==='fail').length,results};console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
