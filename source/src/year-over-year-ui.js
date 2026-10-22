/* SchoolResult annual report — aggregated historical exam comparison, visible to authorized report users. */
SR63.YearComparisonCenter=function({workspace,canPrint=true}){
 const h=(tag,props,...children)=>(0,v.createElement)(tag,props,...children);
 const exams=Array.isArray(workspace?.settings?.exams)?workspace.settings.exams:[],
  [exam,setExam]=(0,v.useState)(workspace?.activeExam||exams[0]?.key||'exam1'),
  [grade,setGrade]=(0,v.useState)('الكل'),
  [state,setState]=(0,v.useState)({loading:true,report:null,error:''}),
  [refresh,setRefresh]=(0,v.useState)(0);
 (0,v.useEffect)(()=>{
  let active=true;setState({loading:true,report:null,error:''});
  SR63.staff.call({action:'year_comparison',exam}).then(data=>{
   if(active)setState({loading:false,report:data.report||null,error:data.report?'':'تعذّر إعداد المقارنة.'});
  }).catch(error=>{
   if(!active)return;
   const code=error?.code||error?.message;
   const messages={
    YEAR_ARCHIVE_NOT_FOUND:'لم يُعثر على أرشيف نتائج العام السابق في قاعدة المدرسة. احفظ أرشيف نهاية العام أولًا.',
    EXAM_NOT_AVAILABLE_IN_BOTH_YEARS:'الاختبار المختار غير مُعرّف في العامين؛ راجع إعدادات الاختبارات والأرشيف.',
    INVALID_YEAR:'راجع صيغة العام الأكاديمي في إعدادات المدرسة (مثال: 2026/2027).',
    ARCHIVE_YEAR_MISMATCH:'السنة المسجلة داخل الأرشيف لا تطابق السنة السابقة.',
    PERMISSION_DENIED:'صلاحية عرض تقارير السنوات غير مفعّلة لهذا الحساب.',
    YEAR_ARCHIVE_READ_FAILED:'تعذرت قراءة الأرشيف من قاعدة البيانات، أعد المحاولة.'
   };
   setState({loading:false,report:null,error:messages[code]||'تعذر تحميل بيانات المقارنة: '+String(error.message||error)});
  });
  return ()=>{active=false;};
 },[exam,refresh,workspace?.settings?.academicYear]);
 const r=state.report,grades=r?.grades||[],selected=grade==='الكل'?r?.school:grades.find(x=>x.grade===grade),
 selectedTitle=grade==='الكل'?'المدرسة بالكامل':grades.find(x=>x.grade===grade)?.label||grade;
 const canReport=!!r&&!r.noCurrentResults&&!r.noPreviousResults&&
  selected?.previous?.results>0&&selected?.current?.results>0;
 const number=x=>typeof x==='number'&&Number.isFinite(x)?x.toFixed(1)+'%':'—';
 const change=x=>typeof x==='number'&&Number.isFinite(x)?(x>0?'+':'')+x.toFixed(1)+' نقطة':'—';
 const esc=SR63.staffReportEsc||SR63.escape;
 const metric=(name,previous,current,delta)=>h('div',{className:'sr67-metric',key:name},
  h('span',{},name),h('strong',{},number(current)),
  h('small',{},'السابق: '+number(previous)+' · '+change(delta)));
 const rowData=x=>[x.label||'المدرسة بالكامل',x.previous?.results??0,number(x.previous?.success),
  number(x.previous?.achievement),x.current?.results??0,number(x.current?.success),
  number(x.current?.achievement),change(x.successChange),change(x.achievementChange)];
 const comparisonRows=()=>[...(grade==='الكل'?r?.subjects:selected?.subjects)||[],{...selected,label:grade==='الكل'?(r.scope==='department'?'إجمالي القسم':'إجمالي المدرسة'):'إجمالي '+selectedTitle}];
 const tableHead=['المادة / الإجمالي','نتائج العام السابق','نجاح السابق','تحصيل السابق','نتائج العام الحالي','نجاح الحالي','تحصيل الحالي','فرق النجاح','فرق التحصيل'];
 function documentReport(){
  const rows=comparisonRows();
  const table='<table class="sr640-table" dir="rtl"><thead><tr>'+
   tableHead.map(k=>'<th>'+esc(k)+'</th>').join('')+'</tr></thead><tbody>'+
   rows.map(x=>'<tr>'+rowData(x).map((v,i)=>'<'+(i===0?'th scope="row"':'td')+'>'+esc(v)+'</'+(i===0?'th':'td')+'>').join('')+'</tr>').join('')+
   '</tbody></table>';
  const kpi='<div class="sr640-stats">'+[
   ['النتائج السابقة',selected.previous.results],['النتائج الحالية',selected.current.results],
   ['تغير النجاح',change(selected.successChange)],['تغير التحصيل',change(selected.achievementChange)],
   ['نجاح العام السابق',number(selected.previous.success)],['نجاح العام الحالي',number(selected.current.success)]
  ].map(([k,v])=>'<div><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>').join('')+'</div>';
  const chart=SR63.staffReportBarChart('مقارنة نسب النجاح والتحصيل حسب المادة',
   comparisonRows().flatMap(x=>[
    {name:x.label+' — النجاح',value:x.previous.success,second:x.current.success},
    {name:x.label+' — التحصيل',value:x.previous.achievement,second:x.current.achievement}
   ]),{two:true,firstLabel:'العام السابق '+r.previousYear,secondLabel:'العام الحالي '+r.currentYear,
     color:'#64748b',secondColor:'#0e887f'});
  const description='يُقارن الاختبار المناظر بين عامين دراسيين مختلفين؛ ولا تفترض المقارنة أن الطلاب أنفسهم في الصفين. '+
   'النجاح = عدد النتائج الناجحة ÷ النتائج المرصودة، والتحصيل = مجموع الدرجات المحصلة ÷ مجموع الدرجات القصوى. '+
   'الغائبون وغير المرصودة نتائجهم وطلاب الدعم الإضافي لا يدخلون في المؤشرات العامة، وتُستخدم نسبة نجاح موحدة '+r.threshold+'%. '+
   'فروق النسب محسوبة بالنقاط المئوية، وقد تختلف أعداد النتائج بين العامين.';
  return {title:'تقرير مقارنة الاختبار المناظر بين عامين دراسيين',
   subtitle:r.previousYear+' مقابل '+r.currentYear+' · '+r.previousExamName+' مقابل '+r.currentExamName+' · '+selectedTitle,
   body:kpi+'<section class="sr640-section"><h3>التحليل المقارن — '+esc(selectedTitle)+'</h3>'+table+'</section>'+
    chart+'<p class="sr640-note">'+esc(description)+'</p>'+
    '<p class="sr640-note">المصدر: بيانات العام الحالي في النظام والأرشيف السنوي للعام السابق. آخر حفظ للأرشيف: '+
     esc(r.archiveAt?new Date(r.archiveAt).toLocaleDateString('ar-EG'):'—')+'.</p>'};
 }
 const doPrint=()=>{
  if(!canPrint||!canReport)return;
  try{SR63.staffPrintHtml(documentReport(),{schoolName:r.schoolName,academicYear:r.previousYear+' / '+r.currentYear,
    principalName:r.principalName,workspace});}
  catch(error){setState(x=>({...x,error:String(error.message||error)}));}
 };
 const warning=!r?'':r.noPreviousResults?'لا توجد نتائج مرصودة للاختبار المناظر في أرشيف العام السابق.':
  r.noCurrentResults?'لا توجد نتائج مرصودة للاختبار المحدد في العام الحالي.':'';
 return h('section',{className:'sr67-year-center',dir:'rtl','aria-label':'مقارنة السنوات الدراسية'},
  h('header',{className:'sr67-year-header'},
   h('div',{},h('span',{className:'sr67-eyebrow'},'تقرير جديد في مركز التقارير'),
    h('h2',{},'مقارنة الاختبار المناظر بين العام الحالي والسابق'),
    h('p',{},'مقارنة تفصيلية لكل مادة: النجاح والتحصيل في العام الحالي والسابق، ثم الإجمالي في النهاية.'))),
  h('div',{className:'sr67-year-controls'},
   h('label',{},h('span',{},'الاختبار المناظر'),
    h('select',{value:exam,onChange:e=>{setExam(e.target.value);setGrade('الكل');}},
     exams.map(x=>h('option',{key:x.key,value:x.key},x.name)))),
   h('label',{},h('span',{},'نطاق التقرير'),
    h('select',{value:grade,onChange:e=>setGrade(e.target.value)},
     h('option',{value:'الكل'},'المدرسة بالكامل'),
     grades.map(x=>h('option',{key:x.grade,value:x.grade},x.label)))),
   h('button',{type:'button',disabled:state.loading,onClick:()=>setRefresh(n=>n+1)},'تحديث المقارنة'),
   h('button',{type:'button',disabled:!canPrint||!canReport,onClick:doPrint},'معاينة الطباعة / حفظ PDF')),
  state.loading?h('p',{className:'sr67-year-status',role:'status'},'جارٍ قراءة بيانات العام الحالي والأرشيف السنوي السابق…'):null,
  state.error?h('p',{className:'sr67-year-alert',role:'alert'},state.error):null,
  warning?h('p',{className:'sr67-year-alert',role:'alert'},warning):null,
  r?h('p',{className:'sr67-year-note'},'العام السابق: '+r.previousYear+' ('+r.previousExamName+') · العام الحالي: '+
    r.currentYear+' ('+r.currentExamName+') · مصدر السابق: '+r.archiveLabel+' · نطاق العرض: '+
    (r.scope==='department'?'القسم المصرح به فقط':'المدرسة')+'.'):null,
  canReport?h('div',{className:'sr67-year-metrics'},
   metric('نسبة النجاح',selected.previous.success,selected.current.success,selected.successChange),
   metric('نسبة التحصيل',selected.previous.achievement,selected.current.achievement,selected.achievementChange),
   h('div',{className:'sr67-metric'},h('span',{},'النتائج المرصودة'),h('strong',{},
    selected.current.results.toLocaleString('en-US')),h('small',{},'العام السابق: '+selected.previous.results.toLocaleString('en-US')))):null,
  r&&grades.length?h('div',{className:'sr67-year-scroll'},
   h('table',{className:'sr67-year-table'},
    h('thead',{},h('tr',{},tableHead.map(x=>h('th',{key:x},x)))),
    h('tbody',{},comparisonRows()
     .map((row,i)=>h('tr',{key:row.subject||'total'},rowData(row).map((x,j)=>h(j===0?'th':'td',{key:j},String(x)))))))):null,
  r?h('p',{className:'sr67-year-method'},'المقارنة بين دفعتين دراسيتين، وليست مقارنة فردية للطلاب. '+
   'تُحسب نسب النجاح والتحصيل من النتائج الحاضرة ذات الدرجة الصحيحة، ويفصل التقرير بين عدد النتائج وعدد الطلاب. '+
   'إذا لم تتوافر نتائج في أحد العامين لا تُعرض فروق مضللة ولا تُتاح الطباعة.'):null
 );
};
