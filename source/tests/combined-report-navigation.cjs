const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const code=read('source/src/teacher-performance-ui.js'),sidebar=read('source/build.cjs'),staff=read('source/src/staff.js'),app=read('app.js');
for(const tab of ['خطة تحسين الأداء الشاملة','التقرير الكمي والوصفي للمعلم','التقرير الكمي والوصفي للقسم']){
 assert.ok(code.includes("children:'"+tab+"'"),'Missing combined tab: '+tab);
 assert.ok(app.includes("children:'"+tab+"'"),'Missing runtime tab: '+tab);
}
assert.match(code,/if\(view==='department'\)return/);
assert.match(code,/SR63\.DepartmentQuantitativePage,\{workspace,canExport\}/);
assert.ok(!sidebar.includes('id:`departmentQuant`,label:`التقرير الكمي والوصفي للقسم`'),'Duplicate administrative sidebar item remains');
assert.ok(sidebar.includes("initialView:`department`"),'Legacy department navigation does not resolve to combined center');
assert.ok(!staff.includes("['department','التقرير الكمي والوصفي للقسم'"),'Duplicate coordinator menu item remains');
assert.ok(!staff.includes("page==='department'&&perms.reports"),'Coordinator duplicate page branch remains');
assert.match(staff,/page==='reports'&&perms.reports\?h\(SR63\.TeacherPerformanceCenter/);
assert.match(app,/id:`teacherPerformance`,label:`خطط تحسين الأداء والتقارير الكمية والوصفية`/);
assert.ok(!app.includes('id:`departmentQuant`,label:`التقرير الكمي والوصفي للقسم`'));
assert.match(app,/SR63\.departmentQuantWordBuild/);
assert.match(app,/SR63\.teacherQuantitativeWordBuild/);
assert.match(app,/SR63\.teacherImprovementWordBuild/);
console.log('Combined report tabs, roles, original Word exports and sidebar: PASS');
