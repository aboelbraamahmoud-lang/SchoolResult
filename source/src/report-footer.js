/* Signatories follow the report owner, never the signed-in user's role. */
SR63.reportSignatureItems=function(workspace,subject='',teacher='',options={}){
 const settings=workspace?.settings||{},labels=settings.reportDesign?.signatureLabels||{};
 const clean=value=>String(value??'').trim();
 const specific=value=>!!clean(value)&&!['الكل','كل المواد','كل المعلمين','كل الصفوف','المدرسة','—'].includes(clean(value));
 const type=options.reportType||'',scope=type==='departmentStats'?'department':(options.scope||'');
 const school=['school','executive'].includes(scope)||['subjects','executive','strugglingStats'].includes(type);
 const support=options.supportLevel===true;
 const hasTeacher=!school&&(scope?['teacher','className','grade'].includes(scope):!support&&specific(teacher));
 const hasCoordinator=!school&&(support||['department','subject'].includes(scope)||specific(subject));
 const coordinator=support?clean(options.supportCoordinatorName):(SR63.subjectCoordinator?.(workspace,subject)||(typeof fj==='function'?fj({...workspace,teachers:workspace?.teachers||[],settings:{...settings,coordinatorName:clean(settings.coordinatorName)}},subject):settings.coordinatorName)||'');
 return [
  ...(hasTeacher?[[labels.teacher||'معلم المادة',teacher]]:[]),
  ...(hasCoordinator?[[support?'منسق التربية الخاصة':labels.coordinator||'منسق المادة',coordinator]]:[]),
  [labels.vice||'النائب الأكاديمي',settings.academicViceName],
  [labels.principal||'مدير المدرسة',settings.principalName]
 ];
};
/* Shared presentation-only footer for HTML reports; mirrors the admin N9 footer. */
SR63.reportFooterHTML=function(workspace,subject='',teacher='',customFooter='',options={}){
 const s=workspace?.settings||{},d=s.reportDesign||{},labels=d.signatureLabels||{},esc=SR63.escape;
 const signatures=SR63.reportSignatureItems(workspace,subject,teacher,options);
 const attribution=[s.preparedByName&&'إعداد: '+s.preparedByName,s.reviewedByName&&'مراجعة: '+s.reviewedByName,s.programmerDesignerName&&'البرمجة والتصميم: '+s.programmerDesignerName,s.reportSystemName&&'طُبع بواسطة: '+s.reportSystemName].filter(Boolean);
 return '<footer class="report-footer">'+
  (d.showSignatures?'<div class="report-signatures" style="grid-template-columns:repeat('+signatures.length+',minmax(0,1fr))">'+signatures.map(([label,name])=>'<div><b>'+esc(label)+'</b><span>'+esc(name||'')+'</span></div>').join('')+'</div>':'')+
  (customFooter||d.footerText?'<p class="report-custom-footer">'+esc(customFooter||d.footerText)+'</p>':'')+
  (d.showVision&&s.schoolVision?'<p>الرؤية: '+esc(s.schoolVision)+'</p>':'')+
  (d.showAttribution&&(attribution.length||s.showGeneratedAt)?'<div class="report-attribution">'+(attribution.length?'<span>'+esc(attribution.join(' · '))+'</span>':'')+(s.showGeneratedAt?'<span>تاريخ الإصدار: '+esc(new Date().toLocaleString('ar-EG'))+'</span>':'')+'</div>':'')+
  (d.showStamp&&/^data:image\/(png|jpeg|webp);base64,/i.test(d.stampDataUrl||'')?'<img class="report-stamp-image" alt="ختم التقرير" src="'+esc(d.stampDataUrl)+'">':'')+'</footer>';
};
