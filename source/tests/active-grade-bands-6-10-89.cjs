/* 6.10.89 — active selection and persistence across every valid subset of six bands. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {ctx,source}=require('./harness.cjs').loadApp();
const SR63=ctx.SR63,workspace=ctx.zj(),defaults=workspace.settings.bands;
assert.equal(defaults.length,6,'default six bands remain editable');
let tested=0;
for(let mask=0;mask<64;mask++){
 const count=Array.from({length:6},(_,i)=>Boolean(mask&(1<<i))).filter(Boolean).length;
 if(count<3)continue;
 const bands=defaults.map((band,i)=>({...band,enabled:Boolean(mask&(1<<i))}));
 const active=SR63.activeBands(bands);
 assert.equal(active.length,count,'selected count should be exact');
 assert.equal(active[0].min,0);assert.equal(active[active.length-1].max,100);
 for(let i=1;i<active.length;i++)assert.equal(active[i-1].max,active[i].min,'continuous coverage');
 for(let value=0;value<=100;value+=.5){
  const band=ctx.yj(value,bands);assert.ok(band,'all percentages must have a band: '+value);
  assert.ok(bands.find(b=>b.id===band.id)?.enabled,'disabled band cannot classify a percentage');
  assert.equal(SR63.reportBandColor(value,{bands}),band.color,'all reports share the same selected band color');
 }
 const saved=ctx.LN({...workspace,settings:{...workspace.settings,bands}}).workspace.settings.bands;
 assert.equal(JSON.stringify([...saved].map(b=>b.enabled)),JSON.stringify(bands.map(b=>b.enabled)),'settings must retain enabled flags');
 const groups=SR63.staffStudentLevels({...workspace,settings:{...workspace.settings,bands}},workspace.activeExam);
 assert.equal(groups.length,count+1,'staff report has enabled grades plus missing data');
 assert.equal(groups[groups.length-1].id,'not_assessed');
 tested++;
}
assert.equal(tested,42);
assert.match(source,/type:`checkbox`,checked:e.enabled!==false/,'settings UI must have real checkboxes');
const report=fs.readFileSync(path.join(__dirname,'../src/reports.js'),'utf8');
assert.match(report,/SR63.activeBands\(n.settings.bands\).slice\(\).reverse\(\)/,'comparison legend must use enabled bands');
assert.doesNotMatch(report,/children:`21% - 49.9%`/,'outdated independent legend forbidden');
console.log('PASS 42 selected band subsets, persistence, exact coloring, coverage, staff grouping and unified comparison legend');
