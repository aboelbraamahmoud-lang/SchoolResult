const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),results=[];const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function test(name,fn){try{fn();results.push({name,status:'pass'});console.log('PASS '+name);}catch(error){results.push({name,status:'fail',error:error.stack});console.error('FAIL '+name+'\n'+error.message);}}
const app=read('app.js'),css=read('source/src/repair.css'),reports=read('source/src/reports.js'),student=read('source/src/student-results-print.js'),patch=read('source/src/patches/reports.js');

test('student print includes academic ID and calculation disclosure',()=>{assert.match(student,/الرقم الأكاديمي/);assert.match(student,/النتائج المرصودة للحضور فقط/);assert.match(student,/النائب الأكاديمي/);assert.match(student,/مدير المدرسة/);});
test('import page contains reconciliation before commit',()=>{assert.match(app,/مصالحة الدفعة قبل الاعتماد/);assert.match(app,/الطالب يُحسب مرة واحدة/);assert.match(app,/توزيع النتائج على الشعب/);assert.match(css,/\.sr610-import-reconciliation/);});
test('executive report is wired into report center',()=>{assert.match(app,/id:`executive`/);assert.match(reports,/function SRExecutiveReport/);assert.match(css,/\.executive-report-grid/);});
test('quality issues can navigate directly to academic structure',()=>{assert.match(app,/onClick:\(\)=>s\(e\.category===`المعلمون`\|\|e\.category===`الإسناد`\?`masterData`:`data`\)/);assert.match(app,/فتح موضع الإصلاح/);});
test('teacher analytics carries fairness disclaimer',()=>{assert.match(app,/قراءة وصفية لأداء المعلمين/);assert.match(reports,/لا تُستخدم منفردة للحكم على أداء المعلم/);});
test('comparison report exposes paired sample caution',()=>{assert.match(reports,/العينة المشتركة/);assert.match(reports,/minSampleSize/);assert.match(css,/comparison-sample-note/);});
test('targeted students report has follow-up workflow columns',()=>{assert.match(reports,/target-followup-owner/);assert.match(reports,/target-followup-state/);assert.match(reports,/قيد المتابعة/);});
test('official logo is external and patch payload is compact',()=>{assert.match(patch,/src:'\.\/moehe\.png'/);assert.ok(!patch.includes('data:image/png;base64,'));assert.ok(Buffer.byteLength(patch)<20000);});
test('wide report CSS keeps readable floor and pagination support',()=>{assert.match(css,/grade-subject-matrix-official/);assert.match(css,/department-subject-matrix-official/);assert.ok(!/font-size:\s*[1-4](?:\.\d+)?px!important/.test(css.slice(css.lastIndexOf('6.10.0'))));});
test('subject comparison print uses compact cells with bold black subject and grade labels',()=>{const block=css.slice(css.lastIndexOf('6.10.3'));assert.match(block,/official-subject-head[\s\S]*color:#000!important/);assert.match(block,/grade-matrix-class[\s\S]*color:#000!important/);assert.match(block,/official-comparison-caption[\s\S]*color:#050505!important/);assert.match(block,/grade-matrix-percent-head[\s\S]*width:6\.4mm!important/);});
test('legacy misleading terminology is absent from generated runtime',()=>{for(const term of ['طلاب فريدون','نتائج مقيمة','نتيجة مقيمة','حاضر/مقيم'])assert.ok(!app.includes(term),term);});
test('sidebar release label is current',()=>{assert.match(app,/الإصدار 6\.10\.5/);assert.ok(!app.includes('الإصدار 6.2 الاحترافي'));});


test('dashboard supports persistent subject scope for main summaries',()=>{assert.match(app,/المواد المحتسبة في ملخصات ورسوم الرئيسية/);assert.match(app,/dashboardSubjects/);assert.match(css,/\.sr610-dashboard-scope/);});
test('results clearing can target one assessment',()=>{assert.match(app,/تفريغ الاختبار المحدد/);assert.match(app,/SR63\.clearResults/);assert.match(app,/جميع الاختبارات/);});
test('heavy report previews are prepared on demand',()=>{assert.match(app,/تجهيز المعاينة/);assert.match(app,/المعاينة تُنشأ عند الطلب/);assert.match(student,/المعاينة لم تُنشأ بعد/);});
test('coordinator is not rendered in report header',()=>{assert.ok(!patch.includes("className:'report-coordinator'"));assert.match(app,/منسق المادة/);});
test('comparison page contains a dedicated visual trend chart',()=>{assert.match(app,/SR63\.AssessmentComparisonChart/);assert.match(app,/الاتجاه البصري للاختبارات/);});
test('ESE support cohort is wired into dashboard and reports',()=>{assert.match(app,/قسم الدعم الإضافي/);assert.match(app,/id:`support`/);assert.match(reports,/function SRSupportDepartmentReport/);assert.match(reports,/SR63\.supportReportPages/);assert.match(css,/\.sr610-support-panel/);});
const report={passed:results.filter(x=>x.status==='pass').length,failed:results.filter(x=>x.status==='fail').length,results};console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
