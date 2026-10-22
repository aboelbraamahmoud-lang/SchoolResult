/* Shared presentation-only footer for HTML reports; mirrors the admin N9 footer. */
SR63.reportFooterHTML=function(workspace,subject='',teacher='',customFooter=''){
 const s=workspace?.settings||{},d=s.reportDesign||{},labels=d.signatureLabels||{},esc=SR63.escape;
 const coordinator=(SR63.subjectCoordinator?.(workspace,subject)||
  (typeof fj==='function'?fj({...workspace,teachers:workspace?.teachers||[],settings:{...s,coordinatorName:String(s.coordinatorName||'')}},subject):s.coordinatorName)||'');
 const signatures=[[labels.teacher||'معلم المادة',teacher],[labels.coordinator||'منسق المادة',coordinator],[labels.vice||'النائب الأكاديمي',s.academicViceName],[labels.principal||'مدير المدرسة',s.principalName]];
 const attribution=[s.preparedByName&&'إعداد: '+s.preparedByName,s.reviewedByName&&'مراجعة: '+s.reviewedByName,s.programmerDesignerName&&'البرمجة والتصميم: '+s.programmerDesignerName,s.reportSystemName&&'طُبع بواسطة: '+s.reportSystemName].filter(Boolean);
 return '<footer class="report-footer">'+
  (d.showSignatures?'<div class="report-signatures">'+signatures.map(([label,name])=>'<div><b>'+esc(label)+'</b><span>'+esc(name||'')+'</span></div>').join('')+'</div>':'')+
  (customFooter||d.footerText?'<p class="report-custom-footer">'+esc(customFooter||d.footerText)+'</p>':'')+
  (d.showVision&&s.schoolVision?'<p>الرؤية: '+esc(s.schoolVision)+'</p>':'')+
  (d.showAttribution&&(attribution.length||s.showGeneratedAt)?'<div class="report-attribution">'+(attribution.length?'<span>'+esc(attribution.join(' · '))+'</span>':'')+(s.showGeneratedAt?'<span>تاريخ الإصدار: '+esc(new Date().toLocaleString('ar-EG'))+'</span>':'')+'</div>':'')+
  (d.showStamp&&/^data:image\/(png|jpeg|webp);base64,/i.test(d.stampDataUrl||'')?'<img class="report-stamp-image" alt="ختم التقرير" src="'+esc(d.stampDataUrl)+'">':'')+'</footer>';
};
