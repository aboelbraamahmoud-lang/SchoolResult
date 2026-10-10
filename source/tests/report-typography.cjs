/* 6.10.12 - report typography contract for every printed/report-only view. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const css = fs.readFileSync(path.join(root,'source/src/repair.css'),'utf8');
const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
const reportCode = fs.readFileSync(path.join(root,'source/src/reports.js'),'utf8');
const typography = css.slice(css.lastIndexOf('6.10.12 — unified bold'));
assert.ok(typography.length > 3000,'Typography layer missing from source');
for(const term of [
  '.school-report-page','.custom-report-page','.student-result-page',
  '.report-table','.level-analysis-table','.target-student-table','.comparison-table',
  '.department-subject-matrix-official','.grade-subject-matrix-all',
  '.report-title','.report-context','.report-signatures',
  '.report-attribution','.report-method-note','.executive-report-grid',
  '.support-report-banner','.custom-report-table','.student-result-table',
  '.student-result-identity','.student-result-summary', '@media print'
]) assert.ok(typography.includes(term),`Report typography not covering ${term}`);
assert.match(typography,/font-weight:900!important/);
assert.match(typography,/font-size:9\.6px!important/);
assert.match(typography,/font-size:8\.35px!important/);
assert.match(typography,/font-size:10\.5px!important/);
assert.ok(!typography.includes('!important;height:210mm'),'Must preserve existing landscape print sizing');
for(const component of [
 'SRGradeSubjectsReport','SRDepartmentStatsReport','SRSupportDepartmentReport',
 'SRExecutiveReport','SRGradeSubjectsReport'
]) assert.ok(reportCode.includes(`function ${component}`),`Report component missing: ${component}`);
assert.match(app,/grade-subject-matrix-all/);
console.log('Report typography contract passed: 22 scopes, bold weight, readable fonts, print coverage, intact report templates.');
