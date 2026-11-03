/* SchoolResult 6.10.83 — certificate-score conversion and upward half-mark rounding.
   Raw exam scores and original percentages are never overwritten. */
SR63.certificateExamRule=function(settings,exam){
 const entry=(settings?.exams||[]).find(item=>item.key===exam);
 const requested=entry?.certificateTotal;
 const enabled=typeof requested==='number'&&Number.isFinite(requested)&&requested>0;
 return {exam,rawTotal:Number(entry?.total),certificateTotal:enabled?requested:Number(entry?.total),enabled,roundingStep:enabled?0.5:0};
};
SR63.certificateScore=function(row,exam,settings){
 if(!row||row.statuses?.[exam]!=='present'||!SR63.validResult(row,exam,settings))return null;
 const score=row.scores?.[exam],rawTotal=pj(row,exam,settings),rule=SR63.certificateExamRule(settings,exam);
 if(typeof score!=='number'||!Number.isFinite(score)||!Number.isFinite(rawTotal)||rawTotal<=0)return null;
 const certificateTotal=rule.enabled?rule.certificateTotal:rawTotal;
 if(!(certificateTotal>0))return null;
 const exact=score/rawTotal*certificateTotal;
 // Round genuinely fractional marks upward, rather than ordinary nearest
 // rounding: 7.25 -> 7.5 and 14.75 -> 15.0. A small epsilon avoids
 // accidental rounding of exact half marks due to binary arithmetic.
 const converted=rule.enabled?Math.min(certificateTotal,Math.ceil((exact-1e-10)/0.5)*0.5):score;
 const certificateScore=Math.max(0,Number(converted.toFixed(8)));
 const originalPercent=100*score/rawTotal,certificatePercent=100*certificateScore/certificateTotal;
 return {rawScore:score,rawTotal,certificateScore,certificateTotal,originalPercent,certificatePercent,
  enabled:rule.enabled,passed:certificatePercent>=Number(settings?.pass??50)};
};
SR63.certificatePercentage=function(row,exam,settings){
 return SR63.certificateScore(row,exam,settings)?.certificatePercent??null;
};
SR63.certificatePassed=function(row,exam,settings){
 return SR63.certificateScore(row,exam,settings)?.passed===true;
};
SR63.certificateDisplay=function(row,exam,settings){
 const value=SR63.certificateScore(row,exam,settings);
 return value?SR63.reportWestern(String(value.certificateScore)+' / '+String(value.certificateTotal)):'—';
};
SR63.CertificateExamSettings=function({settings,onChange}){
 const h=v.createElement;
 const update=(key,patch)=>onChange({exams:settings.exams.map(exam=>exam.key===key?{...exam,...patch}:exam)});
 const rows=(settings.exams||[]).map(exam=>{
  const rawTotal=Number(exam.total),certificate=exam.certificateTotal;
  const configured=typeof certificate==='number'&&Number.isFinite(certificate)&&certificate>0;
  const example=configured?Math.min(certificate,Math.ceil(((rawTotal/2-.5)/rawTotal*certificate-1e-10)*2)/2):null;
  return h('div',{key:exam.key,className:'sr683-certificate-row'},
   h('strong',{},exam.name),
   h('label',{},h('span',{},'درجة الاختبار الأصلية'),h('input',{type:'number',min:'0.5',step:'0.5',value:String(exam.total),
    onChange:event=>{const value=Number(event.target.value);if(Number.isFinite(value)&&value>0)update(exam.key,{total:value});},'aria-label':'درجة الاختبار الأصلية — '+exam.name})),
   h('label',{},h('span',{},'الدرجة العظمى في الشهادة'),h('input',{type:'number',min:'0.5',step:'0.5',placeholder:'بدون تحويل (مثل '+rawTotal+')',
    value:configured?String(certificate):'',onChange:event=>{const raw=event.target.value.trim();update(exam.key,{certificateTotal:raw===''?null:Number(raw)});},
    'aria-label':'الدرجة العظمى في الشهادة — '+exam.name})),
   h('div',{className:'sr683-rule-note'},configured
    ?'يحوَّل من '+rawTotal+' إلى '+certificate+'؛ ويُجبر الكسر لأعلى إلى أقرب نصف درجة (0.5).'
    :'غير مفعّل: تُعتمد الدرجة الأصلية دون تحويل أو جبر.'),
   configured?h('small',{className:'sr683-example'},'مثال قرب حد النجاح: '+String(rawTotal/2-.5)+' / '+rawTotal+' ← '+String(example)+' / '+certificate):null);
 });
 return h('section',{className:'sr683-certificate-settings'},
  h('div',{className:'sr683-settings-title'},h('h2',{},'تحويل درجات الاختبارات إلى درجات الشهادة'),
   h('p',{},'حدد لكل اختبار الدرجة الأصلية والدرجة العظمى في الشهادة. عند إدخال درجة الشهادة، يُجبر كل كسر لأعلى إلى أقرب نصف درجة، ويُحدد النجاح والرسوب ومستوى الطالب من درجة الشهادة بعد الجبر. تبقى الدرجة والنسبة الأصليتان دون تغيير.')),
  h('div',{className:'sr683-certificate-grid'},...rows),
  h('p',{className:'sr683-settings-note'},'احفظ الإعدادات لتطبيق التغييرات على التحليلات والتقارير؛ لا تُعدّل درجات الطلاب المخزنة. ترك درجة الشهادة فارغة يحافظ على طريقة الحساب القديمة لذلك الاختبار.'));
};
