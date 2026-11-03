'use strict';
/* 6.10.88: certificate grade has same color-coded bar as exam grade. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ctx}=require('./harness.cjs').loadApp(),S=ctx.SR63;
const settings=JSON.parse(JSON.stringify(ctx.zj().settings)),exam='exam1';
settings.pass=50;settings.exams=settings.exams.map((e,i)=>i===0?{...e,total:30,certificateTotal:15}:e);
const row=(id,name,score)=>({
 id,studentId:id,studentName:name,className:'7/1',grade:'السابع',subject:'الرياضيات',
 teacher:'معلم الرياضيات',department:'الرياضيات',examClasses:{exam1:'7/1'},
 examTeachers:{exam1:'معلم الرياضيات'},scores:{exam1:score},
 statuses:{exam1:'present'},totals:{exam1:30}
});
const rows=[row('R1','طالب كامل الدرجة',30),row('R2','طالب درجة نصفية',14.5),row('R3','طالب درجة منخفضة',7)];
const page={className:'7/1',teacher:'معلم الرياضيات',subject:'الرياضيات',rows,allRows:rows,rowOffset:0};
const renderer=ctx.SRLevelAnalysisReport;
assert.equal(typeof renderer,'function','real level report renderer available');
const tree=renderer({page,exam,workspace:{settings,rows,activeExam:exam}});
const nodes=[];const visit=x=>{
 if(Array.isArray(x)){x.forEach(visit);return;}
 if(!x||typeof x!=='object')return;
 if(x.props){nodes.push(x);visit(x.props.children);}
};
visit(tree);
const has=(node,name)=>String(node.props?.className||'').split(/\s+/).includes(name);
const maximums=nodes.filter(node=>has(node,'sr685-maximum')).map(x=>String(x.props.children));
assert.deepEqual(maximums,['الدرجة العظمى 30','الدرجة العظمى 15'],'each maximum appears once below its header');
const rawCells=nodes.filter(n=>has(n,'level-score-visual')),certCells=nodes.filter(n=>has(n,'level-certificate-visual'));
assert.equal(rawCells.length,3,'all original scores shown');assert.equal(certCells.length,3,'all certificate grades get colored meters');
for(let i=0;i<certCells.length;i++){
 const meter=certCells[i].props.children,rawMeter=rawCells[i].props.children;
 assert.ok(has(meter,'report-meter')&&has(meter,'score')&&has(meter,'sr-band-linked'),'certificate meter has same classes');
 assert.equal(meter.props.className,rawMeter.props.className,'same color/tone for both score cells');
 const parts=meter.props.children;
 assert.equal(parts.length,2,'meter has fill plus earned grade');
 const expected=S.certificateScore(rows[i],exam,settings),pct=S.certificatePercentage(rows[i],exam,settings);
 assert.equal(parts[1].props.children,expected.certificateScore,'grade only, no denominator');
 assert.equal(parts[0].props.style.width,String(S.clampPercent(pct))+'%','fill based on certificate percentage');
 assert.deepEqual(meter.props.style,rawMeter.props.style,'same grading-band style');
}
assert.equal(S.certificateScore(rows[1],exam,settings).certificateScore,7.5);
assert.equal(certCells[1].props.children.props.children[0].props.style.width,'50%','7.5 from 15 fills half bar');
assert.notEqual(rawCells[1].props.children.props.children[0].props.style.width,'50%','raw 14.5 of 30 remains 48.3%');
const css=fs.readFileSync(path.resolve(__dirname,'../src/repair.css'),'utf8');
assert.ok(css.includes('.level-analysis-table thead th .sr685-maximum'));
assert.ok(css.includes('background:#123f50!important'),'contrast background in headings');
assert.ok(css.includes('color:#fff!important'),'white maxima for dark headers');
assert.ok(css.includes('.level-certificate-visual .report-meter>b'));
assert.ok(css.includes('print-color-adjust:exact!important'),'print preserves bar colors');
console.log('PASS 6.10.88: certificate grade colored bars, rounded scores, 30/15 heading contrast and print-safe A4.');
