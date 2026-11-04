'use strict';
/* 6.10.92 — nationality spreadsheet preview and independently ranked Qatari/resident lists. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ctx,source}=require('./harness.cjs').loadApp(),S=ctx.SR63;
let ws=ctx.Aj();
ws.settings.exams=ws.settings.exams.map(e=>e.key==='exam1'?{...e,total:100,certificateTotal:100}:e);
const row=(id,name,score,subject='الرياضيات',klass='7/1')=>({
 id:id+'-'+subject,studentId:id,studentName:name,subject,department:subject,
 className:klass,grade:'السابع',teacher:'معلم',scores:{exam1:score},
 statuses:{exam1:'present'},totals:{exam1:100}
});
const data=[];
for(let i=0;i<12;i++){
 data.push(row('Q'+i,'قطري رقم '+i,i===10?91:100-i));
 data.push(row('R'+i,'مقيم رقم '+i,100-i));
}
data.push(row('UNKNOWN','طالب بلا جنسية',100));
ws= S.withCatalog({...ws,rows:data,activeExam:'exam1',studentNationalities:{}});
const matrix=[
 ['الرقم الأكاديمي','اسم الطالب','الشعبة','الجنسية'],
 ...Array.from({length:12},(_,i)=>['Q'+i,'قطري رقم '+i,'7/1','قطري']),
 ...Array.from({length:12},(_,i)=>['R'+i,'مقيم رقم '+i,'7/1',i%2?'مصري':'مقيم'])
];
const preview=S.nationalityImportPreview(ws,matrix);
assert.equal(S.nationalityHeaderKind('الرقم'),'id');
assert.equal(S.nationalityHeaderKind('الشعبة الصفية'),'class');
assert.equal(typeof ctx.hv,'function','the legacy XLSX parser hv is available for file uploads');
const canonicalHeader=['الرقم','الاسم','الجنسية','الصف','الشعبة الصفية'];
const fullRows=matrix.slice(1).map(record=>[record[0],record[1],record[3],7,'07/1']);
const sheetOf=rows=>ctx.Gv.aoa_to_sheet([canonicalHeader,...rows]);
const originalFormat={SheetNames:['7','8','9','الجميع'],Sheets:{
 '7':sheetOf(fullRows.slice(0,12)),
 '8':sheetOf(fullRows.slice(12,24)),
 '9':sheetOf([]),
 'الجميع':sheetOf(fullRows)
}};
const originalPreview=S.nationalityWorkbookPreview(ws,originalFormat);
assert.equal(originalPreview.matched,24,'original combined enrolment sheet imports exactly once');
assert.equal(originalPreview.sourceRows,24,'no duplicate rows from grade sheets plus everyone');
assert.equal(originalPreview.sourceSheets.join(','),'الجميع','the combined sheet has priority');
assert.equal(originalPreview.counts.qatari,12);
assert.equal(originalPreview.counts.resident,12);
const alternate=S.nationalityWorkbookPreview(ws,{SheetNames:['7','8','9'],Sheets:{'7':originalFormat.Sheets['7'],'8':originalFormat.Sheets['8'],'9':originalFormat.Sheets['9']}});
assert.equal(alternate.matched,24,'grade sheets merge when combined sheet is unavailable');
assert.equal(alternate.sourceSheets.join(','),'7,8,9');
assert.equal(preview.error,'');
assert.equal(preview.matched,24);
assert.equal(preview.counts.qatari,12);
assert.equal(preview.counts.resident,12);
assert.equal(preview.counts.unknown,1);
assert.deepEqual([preview.unmatched,preview.invalid,preview.nameMismatch,preview.conflicts],[0,0,0,0]);
assert.equal(S.nationalityGroup('قطرية'),'qatari');
assert.equal(S.nationalityGroup('Qatari'),'qatari');
assert.equal(S.nationalityGroup('غير قطري'),'resident');
assert.equal(S.nationalityGroup('مقيم'),'resident');
assert.equal(S.nationalityGroup('جنسية غير محددة'),'');
assert.equal(S.nationalityGroup('غير محدد'),'');
const troubled=S.nationalityImportPreview(ws,[
 ['الرقم الأكاديمي','اسم الطالب','الجنسية'],
 ['Q0','قطري رقم 0','قطري'],['Q0','قطري رقم 0','مصري'],
 ['Q1','قطري رقم 1','قطري'],['Q1','قطري رقم 1','قطري'],
 ['R1','اسم مختلف تمامًا','مقيم'],['UNKNOWN','طالب بلا جنسية',''],
 ['NEVER-EXISTED','غير مسجل','قطري']
]);
assert.equal(troubled.conflicts,1,'conflicting nationality for the same academic ID cannot be applied');
assert.equal(troubled.duplicates,1);
assert.equal(troubled.nameMismatch,1);
assert.equal(troubled.unmatched,1);
assert.equal(troubled.invalid,1);
assert.deepEqual(Array.from(troubled.entries,x=>x.studentId),['Q1']);
const record=Object.fromEntries(preview.entries.map(s=>[s.studentId,s.group]));
ws={...ws,studentNationalities:record};
assert.equal(S.studentNationalityFor(ws,'Q0'),'qatari');
assert.equal(S.studentNationalityFor(ws,'R11'),'resident');
assert.equal(S.studentNationalityFor(ws,'UNKNOWN'),'');
const saved=ctx.LN(ws).workspace;
assert.equal(Object.keys(saved.studentNationalities).length,24,'nationalities survive the real validator and normalizer');
assert.equal(saved.studentNationalities.Q0,'qatari');
const split=S.studentTopRankings(saved,{exam:'exam1',mode:'grade',nationalityMode:'split'});
assert.equal(split.length,2,'one Qatari section then one resident section per grade');
assert.equal(split[0].nationalityGroup,'qatari');
assert.equal(split[1].nationalityGroup,'resident');
assert.match(split[0].title,/الطلاب القطريون/);
assert.match(split[1].title,/الطلاب المقيمون/);
assert.equal(split[0].eligible,12);
assert.equal(split[1].eligible,12);
assert.equal(split[0].rows.length,11,'tied tenth place is preserved instead of losing a student');
assert.equal(split[1].rows.length,10);
assert.equal(split[0].rows[0].position,'الأول');
assert.equal(split[1].rows[0].position,'الأول','resident ranking starts independently at rank 1');
assert.equal(split[0].rows.at(-1).position,'العاشر مكرر');
assert.equal(split[0].unclassifiedCount,1,'unknown nationality students are excluded and disclosed');
assert.ok(split.every(g=>g.rows.every(x=>x.nationalityGroup===g.nationalityGroup)));
assert.ok(split.every(g=>g.rows.every(x=>x.studentId!=='UNKNOWN')));
const legacy=S.studentTopRankings(saved,{exam:'exam1',mode:'grade'});
assert.equal(legacy.length,1,'old combined mode remains available');
assert.ok(legacy[0].rows.some(x=>x.studentId==='UNKNOWN'),'legacy mode is unchanged');
const subject=S.studentTopRankings(saved,{exam:'exam1',mode:'subject',nationalityMode:'split'});
assert.equal(subject.length,2,'subject ranking uses the same nationality split');
const staff=fs.readFileSync(path.resolve(__dirname,'../../supabase/functions/school-staff/index.ts'),'utf8');
assert.match(staff,/studentNationalities:scopedNationalities\(ws,rows\)/,'coordinator nationality map is limited to authorized rows');
assert.match(staff,/visible\.workspace\.studentNationalities=scopedNationalities\(ws,visible\.workspace\.rows\)/,'leadership receives only own school mapping');
assert.match(staff,/scoped\.workspace\.studentNationalities=\{\}/,'staff without reports permission sees no nationality flags');
const build=fs.readFileSync(path.resolve(__dirname,'../build.cjs'),'utf8');
assert.match(build,/StudentNationalityAdmin/);
assert.match(build,/student-nationalities\.js/);
assert.match(source,/جنسيات الطلاب/);
assert.match(source,/تحميل|استيراد|رفع ملف جنسيات الطلاب/);
console.log('PASS 6.10.92: Excel preview, name and ID matching, duplicate/conflict rejection, cloud roundtrip, Qatari then resident independent top-ten, exact ties, unknown isolation, original rankings and read-only staff scope');
