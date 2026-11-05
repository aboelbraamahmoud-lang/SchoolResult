const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/imports.js'),'utf8');
const start=source.indexOf('SR63.isVerifiedAcademicId=value=>');
const end=source.indexOf('SR63.commitImport=function',start);
assert(start>=0&&end>start,'identity preflight must exist');
const SR63={
 nationalityId:value=>String(value??'').trim().replace(/\.0+$/,''),
 studentNameKey:name=>String(name??'').replace(/\s+/g,' ').trim(),
 studentIdentityKey:(name,cls)=>String(name??'').replace(/\s+/g,' ').trim()+'|'+String(cls??''),
 studentRegistry:workspace=>workspace.rows??[],
 fail:message=>{throw Error(message);}
};
let prompts=[];
const alerts=[];
const window={prompt:(message,initial)=>{prompts.push({message,initial});return response;},alert:message=>alerts.push(message)};
vm.runInNewContext(source.slice(start,end),{SR63,window});
const oldName='مسعود محمد مبارك سعد مسفر',newName='مسعود محمد مبارك مسفر';
const workspace={rows:[{studentId:'11223344',studentName:oldName,subject:'رياضيات'}]};
const items=[{studentId:'11223344',studentName:newName,className:'8/7',sourceRow:139}];
let response=newName;
let result=SR63.resolveImportIdentityConflicts(workspace,items);
assert.equal(result.get('11223344').name,newName);
assert.equal(prompts.length,1);
assert.match(prompts[0].message,/تعارض هوية/);
assert.match(prompts[0].message,/النتائج المحفوظة/);
assert.match(prompts[0].message,/139/);
prompts=[];response=null;
assert.throws(()=>SR63.resolveImportIdentityConflicts(workspace,items),/إلغاء الاستيراد/);
assert.equal(prompts.length,1);
prompts=[];response='   ';
assert.throws(()=>SR63.resolveImportIdentityConflicts(workspace,items),/غير صالح/);
prompts=[];response=newName;
assert.equal(SR63.resolveImportIdentityConflicts(workspace,[{...items[0],studentName:oldName}]).size,0);
assert.equal(prompts.length,0);
prompts=[];response='الاسم المصحح';
const changed=SR63.resolveImportIdentityConflicts({rows:[]},[...items,{...items[0],studentName:oldName,sourceRow:140}]);
assert.equal(changed.get('11223344').name,'الاسم المصحح');
assert.equal(prompts.length,1);
assert.match(source,/تعارض رقمين أكاديميين/);
const conflictWorkspace={rows:[{studentId:'99887766',studentName:'طالب موحد',className:'8/7'}]};
const conflicting=[{studentId:'11223344',studentName:'طالب موحد',className:'8/7',sourceRow:139,sourceFile:'ثامن.xlsx'}];
const findings=SR63.importIdentityReviewDetails(conflictWorkspace,conflicting);
assert.equal(findings.length,1);
assert.equal(findings[0].candidates[0].studentId,'99887766');
const report=SR63.showImportIdentityReview(conflictWorkspace,conflicting);
assert.equal(report.otherConflicts,1);
assert.match(alerts[0],/139/);
assert.match(alerts[0],/99887766/);
assert.equal(SR63.importIdentityReviewDetails(conflictWorkspace,[{...conflicting[0],studentId:'99887766'}]).length,0);
prompts=[];response=newName;
const review=SR63.showImportIdentityReview(workspace,items);
assert.equal(review.nameFixes,1);
assert.equal(prompts.length,1);
prompts=[];response=null;
const approved=SR63.resolveImportIdentityConflicts(workspace,items);
assert.equal(approved.get('11223344').name,newName);
assert.equal(prompts.length,0,'pre-reviewed name must not prompt again');
const build=fs.readFileSync(path.join(__dirname,'../build.cjs'),'utf8');
assert.match(build,/مراجعة تعارضات الطلاب وتصحيحها/);

console.log('Student identity conflict preflight: passed');
