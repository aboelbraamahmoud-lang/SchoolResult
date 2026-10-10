/* 6.10.12 — report-only subject display names and order.
   Canonical subject names remain untouched in student results, imports and teacher assignments. */
SR63.defaultReportSubjects = [
  ['شرعية','الشرعية'],['عربي','اللغة العربية'],['e','الانجليزي'],
  ['رياضيات','الرياضيات'],['علوم','العلوم'],['اجتماعية','الاجتماعيات'],
  ['حاسب','الحاسوب'],['فنية','الفنية'],['بدنية','البدنية'],
  ['مهارات','المهارات الحياتية والمهنية'],['مهارات2','المهارات 2'],['برامجداعمة','البرامج الداعمة']
];
SR63.defaultReportSubjectEntries=function(){return SR63.defaultReportSubjects.map(([subject,label])=>({key:SR63.subjectAliasKey(subject),label}));};
SR63.reportSubjectEntries=function(settings,workspace){
  const defaults=SR63.defaultReportSubjectEntries(),saved=Array.isArray(settings?.subjectReportOrder)?settings.subjectReportOrder:[];
  const entries=[],seen=new Set();
  const add=(key,label)=>{key=SR63.subjectAliasKey(key);if(!key||seen.has(key))return;seen.add(key);entries.push({key,label:String(label??'').trim()});};
  for(const entry of saved)if(entry&&typeof entry.key==='string')add(entry.key,entry.label);
  for(const entry of defaults)add(entry.key,entry.label);
  const extra=[...(workspace?.subjects??[]).map(item=>item.name),...(workspace?.rows??[]).map(item=>item.subject)].filter(Boolean);
  for(const subject of extra)add(subject,subject);
  return entries;
};
SR63.reportSubjectLabel=function(subject,settings){
  const raw=String(subject??'').trim();if(!raw||['الكل','كل المواد'].includes(raw))return raw;
  const key=SR63.subjectAliasKey(raw),entry=SR63.reportSubjectEntries(settings??SR63.currentWorkspace?.settings).find(x=>x.key===key);
  return entry?.label||raw;
};
SR63.reportSubjectCompare=function(a,b,settings){
  const entries=SR63.reportSubjectEntries(settings??SR63.currentWorkspace?.settings),order=new Map(entries.map((item,i)=>[item.key,i]));
  const ka=SR63.subjectAliasKey(a),kb=SR63.subjectAliasKey(b),ia=order.get(ka)??9999,ib=order.get(kb)??9999;
  return ia-ib||SR63.reportSubjectLabel(a,settings).localeCompare(SR63.reportSubjectLabel(b,settings),'ar',{numeric:true});
};
SR63.SubjectPresentationSettings=function({settings,onChange,workspace}){
  const entries=SR63.reportSubjectEntries(settings,workspace),update=list=>onChange({subjectReportOrder:list});
  const rename=(index,value)=>update(entries.map((entry,i)=>i===index?{...entry,label:value}:entry));
  const move=(index,step)=>{const to=index+step;if(to<0||to>=entries.length)return;const list=entries.map(item=>({...item}));[list[index],list[to]]=[list[to],list[index]];update(list);};
  const reset=()=>update(SR63.defaultReportSubjectEntries());
  return (0,q.jsxs)('section',{className:'sr611-subject-editor',children:[
    (0,q.jsxs)('header',{children:[(0,q.jsxs)('div',{children:[
      (0,q.jsx)('span',{children:'ترتيب المواد ومسمياتها'}),
      (0,q.jsx)('h2',{children:'التحكم في ظهور المواد بجميع التقارير'}),
      (0,q.jsx)('p',{children:'عدّل اسم العرض، أو حرّك المادة للأعلى والأسفل لتغيير ترتيبها. التعديل خاص بالتقارير فقط؛ لن يغيّر المادة الأصلية أو إسناد المعلمين أو درجات الطلاب. احفظ الإعدادات لتطبيق التغييرات.'})
    ]}),(0,q.jsx)('button',{type:'button',onClick:reset,children:'استعادة الترتيب والمسميات الافتراضية'})]}),
    (0,q.jsxs)('div',{className:'sr611-subject-list',children:entries.map((entry,index)=>(0,q.jsxs)('div',{className:'sr611-subject-row',children:[
      (0,q.jsx)('span',{className:'sr611-subject-number',children:String(index+1)}),
      (0,q.jsx)('span',{className:'sr611-subject-original',title:entry.key,children:(workspace?.subjects??[]).find(item=>SR63.subjectAliasKey(item.name)===entry.key)?.name||SR63.defaultReportSubjects.find(([name])=>SR63.subjectAliasKey(name)===entry.key)?.[0]||entry.key}),
      (0,q.jsx)('input',{type:'text',value:entry.label,onChange:event=>rename(index,event.target.value),maxLength:80,placeholder:'المسمى الظاهر في التقارير',dir:'rtl','aria-label':`اسم العرض للمادة ${entry.key}`}),
      (0,q.jsxs)('div',{className:'sr611-subject-move',children:[
        (0,q.jsx)('button',{type:'button',disabled:index===0,onClick:()=>move(index,-1),title:'تقديم المادة',children:'↑'}),
        (0,q.jsx)('button',{type:'button',disabled:index===entries.length-1,onClick:()=>move(index,1),title:'تأخير المادة',children:'↓'})
      ]})
    ]},entry.key))})
  ]});
};
