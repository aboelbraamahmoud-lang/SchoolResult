/* 6.9.14 — central report scoping and display subject resolution. */
SR63.reportScopeValue=function(row,scope,exam){
  if(scope==='teacher')return mj(row,exam)||'';
  if(scope==='className')return hj(row,exam)||'';
  if(scope==='grade')return gj(row,exam)||'';
  if(scope==='subject')return row.subject||'';
  if(scope==='department')return row.department||row.subject||'';
  return '';
};
SR63.reportScopeRows=function(rows,{scope='',entity='',teacher='',className='',grade='',subject='',department='',exam}={}){
  let result=Array.isArray(rows)?rows:[];
  const clean=value=>String(value??'').trim();
  const all=value=>!clean(value)||['الكل','كل المواد','كل المعلمين','كل الصفوف','كل الصفوف الدراسية'].includes(clean(value));
  const exact=(a,b)=>ij(clean(a))===ij(clean(b));
  const filters=[];
  if(scope==='teacher'&&!all(teacher||entity))filters.push(['teacher',teacher||entity]);
  else if(scope==='className'&&!all(className||entity))filters.push(['className',className||entity]);
  else if(scope==='grade'&&!all(grade||entity))filters.push(['grade',grade||entity]);
  else if(scope==='subject'&&!all(subject||entity))filters.push(['subject',subject||entity]);
  else if(scope==='department'&&!all(department||entity))filters.push(['department',department||entity]);
  if(!all(subject)&&scope!=='subject')filters.push(['subject',subject]);
  if(!all(className)&&scope!=='className')filters.push(['className',className]);
  if(!all(grade)&&scope!=='grade')filters.push(['grade',grade]);
  if(!all(teacher)&&scope!=='teacher')filters.push(['teacher',teacher]);
  if(!all(department)&&scope!=='department')filters.push(['department',department]);
  for(const [key,value] of filters)result=result.filter(row=>exact(SR63.reportScopeValue(row,key,exam),value));
  return result;
};
SR63.reportDisplaySubject=function(page,exam){
  if(page?.subject&&![`الكل`,`كل المواد`].includes(String(page.subject).trim()))return page.subject;
  const rows=page?.allRows?.length?page.allRows:(page?.rows??[]);
  const subjects=[...new Set(rows.map(row=>String(row.subject??'').trim()).filter(Boolean))];
  return subjects.length===1?subjects[0]:'كل المواد';
};
SR63.normalizeReportPage=function(page,mode,exam,workspace){
  if(!page||mode==='subjects')return page;
  const scoped=SR63.reportScopeRows(page.rows??[],{scope:page.scope,entity:page.entity,teacher:page.teacher,className:page.className,grade:page.grade,subject:page.subject,department:page.department,exam});
  const allScoped=SR63.reportScopeRows(page.allRows??page.rows??[],{scope:page.scope,entity:page.entity,teacher:page.teacher,className:page.className,grade:page.grade,subject:page.subject,department:page.department,exam});
  const normalized={...page,rows:scoped,allRows:allScoped};
  if(mode!=='subjects')normalized.subject=SR63.reportDisplaySubject(normalized,exam);
  if(normalized.scope==='teacher'&&!normalized.teacher)normalized.teacher=normalized.entity||'';
  return normalized;
};
SR63.reportScopeAudit=function(page,mode,exam){
  const scoped=SR63.normalizeReportPage(page,mode,exam,SR63.currentWorkspace);
  if(!scoped)return {ok:false,reason:'missing-page'};
  if(mode==='subjects')return {ok:true,count:scoped.rows?.length??0};
  const rows=scoped.rows??[],key=page.scope,expected=page.teacher||page.className||page.grade||page.entity||'';
  const leaks=expected&&key?rows.filter(row=>ij(SR63.reportScopeValue(row,key,exam))!==ij(expected)):[];
  const subjects=[...new Set(rows.map(row=>row.subject).filter(Boolean))];
  return {ok:leaks.length===0&&subjects.length<=1,count:rows.length,leaks:leaks.length,subjects,scope:key,expected};
};
