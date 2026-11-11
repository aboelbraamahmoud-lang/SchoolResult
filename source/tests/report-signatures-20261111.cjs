'use strict';
const assert=require('node:assert/strict');
const {ctx}=require('./harness.cjs').loadApp(),S=ctx.SR63,ws=ctx.zj();
ws.settings.reportDesign.showSignatures=true;
ws.settings.reportDesign.signatureLabels={teacher:'TEACHER',coordinator:'COORDINATOR',vice:'VICE',principal:'PRINCIPAL'};
const roles=(subject,teacher,options)=>Array.from(S.reportSignatureItems(ws,subject,teacher,options),x=>x[0]);
for(const type of ['subjects','executive','strugglingStats'])assert.deepEqual(roles('رياضيات','أحمد',{scope:'grade',reportType:type}),['VICE','PRINCIPAL']);
for(const scope of ['school','executive'])assert.deepEqual(roles('رياضيات','أحمد',{scope}),['VICE','PRINCIPAL']);
for(const scope of ['department','subject'])assert.deepEqual(roles('رياضيات','أحمد',{scope}),['COORDINATOR','VICE','PRINCIPAL']);
assert.deepEqual(roles('رياضيات','أحمد',{scope:'grade',reportType:'departmentStats'}),['COORDINATOR','VICE','PRINCIPAL']);
for(const scope of ['teacher','className','grade'])assert.deepEqual(roles('رياضيات','أحمد',{scope}),['TEACHER','COORDINATOR','VICE','PRINCIPAL']);
assert.deepEqual(roles('','',{}),['VICE','PRINCIPAL']);
assert.deepEqual(roles('كل المواد','',{}),['VICE','PRINCIPAL']);
assert.deepEqual(roles('رياضيات','',{}),['COORDINATOR','VICE','PRINCIPAL']);
assert.deepEqual(roles('رياضيات','أحمد',{}),['TEACHER','COORDINATOR','VICE','PRINCIPAL']);
assert.deepEqual(roles('رياضيات','أحمد',{supportLevel:true}),['منسق التربية الخاصة','VICE','PRINCIPAL']);
const strings=n=>typeof n==='string'?[n]:Array.isArray(n)?n.flatMap(strings):n?.props?strings(n.props.children):[];
for(const scope of ['school','department','teacher','className','grade']){
 const expected=roles('رياضيات','أحمد',{scope}),text=strings(ctx.N9({workspace:ws,subject:'رياضيات',teacher:'أحمد',scope}));
 const html=S.reportFooterHTML(ws,'رياضيات','أحمد','',{scope});
 for(const label of ['TEACHER','COORDINATOR','VICE','PRINCIPAL']){
  assert.equal(text.includes(label),expected.includes(label),'React '+scope+' '+label);
  assert.equal(html.includes(label),expected.includes(label),'HTML '+scope+' '+label);
 }
 assert.ok(html.includes('repeat('+expected.length+',minmax(0,1fr))'));
}
console.log('PASS scope-owned signatures across school/department/subject/class/grade/teacher/support and React/HTML exports');
