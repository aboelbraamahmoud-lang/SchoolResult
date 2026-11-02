const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {ctx}=require('./harness.cjs').loadApp(),S=ctx.SR63;
const ws=ctx.zj();ws.activeExam='exam1';ws.settings.pass=50;S.currentWorkspace=ws;
const bands=ws.settings.bands;
for(const pct of [0,39.999,49.999,50,50.01,59.999,60,69.999,70,79.999,80,89.999,90,97,100]){
 const expected=ctx.yj(pct,bands)?.color;
 assert.equal(S.reportBandColor(pct,ws.settings),expected, 'dashboard exact band at '+pct);
 assert.equal(S.reportBandStyle(pct,ws.settings)?.['--sr-band-color'],expected);
 const element=S.renderReportValue(pct+'%','percentage');
 assert.equal(element.props.style['--sr-band-color'],expected, 'report display should follow school band at '+pct);
}
assert.equal(S.reportBandColor(null,ws.settings),null);
assert.equal(S.reportBandStyle(undefined,ws.settings),undefined);
assert.equal(S.reportBandColor(NaN,ws.settings),null);
assert.equal(S.reportBandColor(105,ws.settings),null);
const modified={...ws.settings,bands:bands.map(b=>({...b,color:'#aBc123'}))};
assert.equal(S.reportBandColor(60,modified),'#aBc123','an admin color edit is used, not a fixed range palette');
assert.equal(S.reportBandColor(60,{bands:bands.map(b=>({...b,color:'red<script>'}))}),null,'invalid style is rejected');
assert.equal(S.renderReportValue(.5,'success').props.style['--sr-band-color'],ctx.yj(50,bands).color,'fractional success is normalized to percent');
const summary=fs.readFileSync(path.join(__dirname,'../src/struggling-print.js'),'utf8');
const build=fs.readFileSync(path.join(__dirname,'../build.cjs'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../src/repair.css'),'utf8');
assert.match(summary,/SR63\.StrugglingStatsPrintButton=function/);
assert.match(summary,/SR63\.printStrugglingStatistics=async/);
assert.match(summary,/SR63\.StrugglingStatisticsPrintPage=function/);
assert.match(summary,/SR63\.strugglingStatsPages\(workspace\.rows\|\|\[\],model\.exam,workspace\.settings\)/);
assert.match(summary,/SR63\.printReportBatch\(html,[^\n]+true,preparedWindow\)/);
assert.match(build,/canPrint:props\.canPrint!==false/,'read-only users must not get the new print button');
assert.match(css,/report-meter\.sr-band-linked/);
assert.match(css,/--sr-band-color/);
const rows=Array.from({length:41},(_,i)=>({
 id:'row'+i,studentId:'stu'+i,studentName:'طالب '+i,
 subject:'الرياضيات',className:'7/'+(i+1),scores:{exam1:30},
 statuses:{exam1:'present'},totals:{exam1:100}
}));
const many={...ws,rows};
const pages=S.strugglingStatsPages(rows,'exam1',ws.settings);
assert.equal(pages.length,4,'41 classes are divided into one overview and three detail pages');
assert.deepEqual(Array.from(pages.slice(1),p=>p.classChunk.length),[16,16,9]);
assert.equal(S.strugglingStatistics(many).totalStudents,41);
const summaryPage=S.StrugglingStatisticsPrintPage({
 workspace:many,model:S.strugglingStatistics(many),page:pages[0],pageIndex:0,generatedAt:'test',pageRef:()=>{}
});
assert.equal(summaryPage.props['data-orientation'],'landscape');
assert.match(summaryPage.props.className,/sr-fitted-report/);
assert.ok(!JSON.stringify(summaryPage).includes('الرقم الشخصي'));
console.log('PASS configured dashboard band palette at all boundaries, safe custom colors, score/percent, no data leakage and multi-page combined printing');
