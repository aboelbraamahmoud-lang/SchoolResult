'use strict';
/* 6.10.94: independent Qatari/resident exports and page boundaries. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ctx}=require('./harness.cjs').loadApp(),S=ctx.SR63;
const ranked=(id,position,group)=>({studentId:id,studentName:'اسم '+group+' '+id,className:'7/1',position,score:90,total:100,
 percentage:90,recordedCount:1,expectedCount:1,complete:true,nationalityGroup:group});
const q=Array.from({length:14},(_,i)=>ranked('Q'+i,i<2?'الأول مكرر':'العاشر','qatari'));
const r=Array.from({length:4},(_,i)=>ranked('R'+i,['الأول','الثاني','الثالث','الرابع'][i],'resident'));
const groups=[
 {title:'الصف السابع — الطلاب القطريون',nationalityGroup:'qatari',rows:q,eligible:14,incompleteCount:0,subject:'الرياضيات'},
 {title:'الصف السابع — الطلاب المقيمون',nationalityGroup:'resident',rows:r,eligible:4,incompleteCount:0,subject:'الرياضيات'}
];
const pages=S.topRanksExportPages(groups,{scope:'both'});
assert.equal(pages.length,3);
assert.deepEqual(Array.from(pages.map(p=>p.group.nationalityGroup)),['qatari','qatari','resident']);
assert.equal(pages[0].rows.length,10);assert.equal(pages[1].rows.length,4);assert.equal(pages[2].rows.length,4);
assert.equal(pages[0].rows[0].position,'الأول مكرر');
assert.equal(pages[1].rows[3].position,'العاشر');
assert.equal(S.topRanksExportPages(groups,{scope:'qatari'}).length,2);
assert.equal(S.topRanksExportPages(groups,{scope:'resident'}).length,1);
assert.equal(S.topRanksExportPages(groups,{scope:'none'}).length,3);
assert.equal(S.topRanksExportPages([{...groups[0],rows:[]}],{scope:'both'}).length,0);
assert.match(S.topRanksExportName('qatari','grade','docx'),/القطريون.*docx$/);
assert.match(S.topRanksExportName('resident','subject','pdf'),/المقيمون.*pdf$/);
for(const group of groups)for(const person of group.rows)assert.ok(!Object.keys(person).includes('personalNumber'));
const ui=fs.readFileSync(path.join(__dirname,'../src/student-top-ranks.js'),'utf8');
assert.match(ui,/تحميل Word/);
assert.match(ui,/تحميل PDF/);
assert.match(ui,/القطريون فقط/);
assert.match(ui,/المقيمون فقط/);
assert.match(ui,/scope:nationalityMode==='split'\?exportScope:'both'/);
const exp=fs.readFileSync(path.join(__dirname,'../src/top-ranks-export.js'),'utf8');
assert.match(exp,/SR63\.reportPdfFromJpegs/);
assert.match(exp,/SR63\.reportZipFromPdfs\(parts,true\)/);
assert.match(exp,/documentXml/);
assert.match(exp,/w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/);
assert.doesNotMatch(exp,/person\.studentId|r\.studentId/);
console.log('PASS 6.10.94: independent group ordering, ties, long group pagination, class/subject names and Word/PDF export isolation');
