/* Fetch only the authorized school payload; do not run unused coordinator analytics. */
SR63.LeadershipLoader=function({profile}){
 const [payload,setPayload]=(0,v.useState)(null),[loading,setLoading]=(0,v.useState)(true),[error,setError]=(0,v.useState)(''),request=(0,v.useRef)(0);
 const reload=async(exam='')=>{const id=++request.current;setLoading(true);setError('');try{
  const next=await SR63.staff.coordinatorLoad(exam);if(id===request.current)setPayload(next);
 }catch(e){if(id===request.current)setError(e.message||'تعذر تحميل بيانات المدرسة.');}
 finally{if(id===request.current)setLoading(false);}};
 (0,v.useEffect)(()=>{setPayload(null);void reload();return()=>{request.current++;};},[profile.ownerId,profile.username]);
 return (0,q.jsx)(SR63.LeadershipPortal,{profile,payload,loading,error,reload});
};
/* School leadership uses the original admin dashboard, analysis renderers and sidebar components. */
SR63.leadershipNavigation=function(profile){
 const p=profile.permissions||{},allowed=new Set(['dashboard']);
 if(p.reports){for(const id of ['classes','departments','school'])allowed.add(id);}
 if(p.teacherAnalysis)allowed.add('teachers');
 if(p.compare){allowed.add('comparison');allowed.add('value');}
 if(p.studentLevels)allowed.add('levels');
 if(p.failedStudents)allowed.add('struggling');
 const items=Q9.filter(x=>allowed.has(x.id));
 if(p.reports)items.push({id:'reportCenter',label:'مركز التقارير والطباعة',group:'الإدارة',icon:xy},{id:'schoolQuantitative',label:'التقرير الكمي والوصفي',group:'الإدارة',icon:cy});
 return items;
};
SR63.LeadershipPortal=function({profile,payload,loading,error,reload}){
 const [page,setPage]=(0,v.useState)('dashboard'),[query,setQuery]=(0,v.useState)(''),[overrides,setOverrides]=(0,v.useState)({});
 const raw=payload?.workspace,perms=profile.permissions||{},items=SR63.leadershipNavigation(profile);
 const workspace=(0,v.useMemo)(()=>raw?SR63.staffReportWorkspace({...raw,activeExam:overrides.activeExam||raw.activeExam,settings:{...raw.settings,...overrides.settings}},overrides.activeExam||raw.activeExam,profile):null,[raw,overrides,profile]);
 (0,v.useEffect)(()=>{setOverrides(previous=>Object.keys(previous).length?{}:previous);},[profile.ownerId,profile.username,payload?.revision]);
 (0,v.useEffect)(()=>{if(!workspace)return;SR63.currentWorkspace=workspace;return()=>{if(SR63.currentWorkspace===workspace)SR63.currentWorkspace=null;};},[workspace]);
 const navigate=id=>{const target=id==='reports'?'reportCenter':id;if(items.some(x=>x.id===target)||target==='studentProfile'){setPage(target);return;}eb.info('هذه الوظيفة تتطلب صلاحية إدارة بيانات المدرسة من حساب الأدمن.');};
 const setViewWorkspace=change=>{const next=typeof change==='function'?change(workspace):change;setOverrides({activeExam:next.activeExam,settings:{dashboardSubjects:next.settings.dashboardSubjects}});};
 const h=(tag,props,...children)=>(0,v.createElement)(tag,props,...children);
 if(!workspace)return h('section',{className:'srstaff-panel',dir:'rtl','aria-busy':loading},h('p',{role:error?'alert':'status'},error||'جارٍ تحميل بيانات المدرسة…'),error?h('button',{disabled:loading,onClick:()=>reload()},'إعادة المحاولة'):null);
 const cloudStatus={revision:payload.revision,savedAt:payload.savedAt,blocked:false,pending:false,error:''};
 const visiblePage=items.some(x=>x.id===page)||page==='studentProfile'?page:'dashboard';
 const content=visiblePage==='dashboard'?h(SR63.Dashboard,{workspace,setWorkspace:setViewWorkspace,onNavigate:navigate,cloudStatus}):
 visiblePage==='studentProfile'?h(SR63.StudentProfile,{workspace,onNavigate:navigate}):
 visiblePage==='schoolQuantitative'?h(SR63.SchoolQuantitativePage,{workspace,canExport:!!perms.export}):
 visiblePage==='reportCenter'?h(SR63.getReportCenterSafeBoundary(),{onReset:()=>setPage('dashboard')},h(xde,{workspace,readOnly:true,canPrint:!!perms.export,onSchoolSummary:()=>setPage('schoolQuantitative'),reportScope:'school'})):
 h(SR63.OriginalAnalytics,{workspace,page:visiblePage,onNavigate:navigate});
 return h(LA,{style:{'--sidebar-width':'19rem'},dir:'rtl'},
  h(RA,{side:'right',collapsible:'icon',className:'results-sidebar border-l-0 text-white'},
   h(VA,{className:'relative border-b border-white/10 px-4 pb-5 pt-6'},
    h('div',{className:'flex items-center gap-3'},h(cy,{className:'size-6 text-[#f6cf69]'}),h('b',{},'مرصد النتائج المدرسية')),
    h('div',{className:'mt-4 rounded-2xl border border-white/10 bg-white/[.065] p-3 group-data-[collapsible=icon]:hidden'},h('b',{className:'block'},workspace.settings.schoolName),h('small',{},workspace.settings.academicYear),h('p',{className:'mt-2 text-sm text-white/70'},(profile.role==='principal'?'مدير المدرسة':'النائب الأكاديمي')+' · '+(profile.displayName||profile.username))),
    h(fA,{value:query,onChange:e=>setQuery(e.target.value),placeholder:'بحث في وظائف البرنامج',className:'mt-3 border-white/10 bg-white/[.07] text-white group-data-[collapsible=icon]:hidden'})),
   h(UA,{className:'min-h-0 overflow-y-auto overscroll-contain px-3 py-4'},['الرئيسية','التحليلات','القياس','الإدارة'].map(group=>{const visible=items.filter(x=>x.group===group&&(!query||ij(x.label).includes(ij(query))));return visible.length?h(Mde,{key:group,group,items:visible,page,critical:0,forceOpen:!!query,onSelect:navigate}):null;})),
   h(HA,{className:'border-t border-white/10 p-3'},h('button',{className:'w-full rounded-xl bg-white/10 p-3',disabled:loading,onClick:()=>reload(workspace.activeExam)},loading?'جارٍ التحديث…':'تحديث بيانات المدرسة'),h('small',{className:'mt-2 block text-center text-white/60'},'الإصدار '+SR63.version))),
  h(BA,{className:'min-w-0 bg-[#f6f8f7]'},h('header',{className:'sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6'},h(zA,{}),h('span',{className:'hidden sm:inline'},items.find(x=>x.id===page)?.label||'الملف الأكاديمي للطالب'),h('div',{className:'mr-auto flex min-w-0 items-center gap-2'},h(g9,{className:'max-w-40 sm:max-w-none',value:workspace.activeExam,onChange:exam=>setOverrides(x=>({...x,activeExam:exam})),items:workspace.settings.exams.map(x=>({value:x.key,label:x.name}))}),h(dA,{variant:'ghost',size:'icon',title:'ملء الشاشة',onClick:()=>SR63.fullscreen()},h(Sy,{})))),
   h('main',{className:'mx-auto w-full max-w-[1700px] flex-1 p-4 sm:p-6 lg:p-8','data-leadership-page':page},error?h('p',{role:'alert',className:'srstaff-alert'},error):null,content)),h(ab,{position:'top-center',richColors:true}));
};
