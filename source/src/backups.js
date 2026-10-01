/* Complete portable backups. Archive lists carry metadata only; bodies are fetched on demand. */
SR63.listSnapshots=()=>SR63.cloud.list();
SR63.getSnapshot=async point=>point?.workspace?structuredClone(point):SR63.cloud.archive(typeof point==='string'?point:point?.id);
SR63.listFullSnapshots=()=>SR63.cloud.listFull();
SR63.parseBackup=function(raw){
  if(raw?.format!=='school-results-complete'){if(raw?.format)throw new Error('صيغة النسخة غير مدعومة.');return {workspace:LN(raw).workspace,snapshots:[]};}
  if(raw.formatVersion!==1||!Array.isArray(raw.snapshots))throw new Error('بنية النسخة الشاملة غير صالحة.');
  const workspace=LN(raw.workspace).workspace,ids=new Set();
  const snapshots=raw.snapshots.map(point=>{
    if(!point||typeof point.id!=='string'||!point.id||ids.has(point.id)||typeof point.reason!=='string'||typeof point.at!=='string'||!Number.isFinite(Date.parse(point.at))||!point.workspace)throw new Error('بيانات إحدى نقاط الأرشيف غير صالحة أو مكررة.');
    ids.add(point.id);const checked=LN(point.workspace).workspace;
    return {id:point.id,at:point.at,reason:point.reason,workspace:checked,year:checked.settings.academicYear,pinned:!!point.pinned||point.reason.startsWith('أرشيف نهاية العام'),bytes:new Blob([JSON.stringify(checked)]).size};
  });return {workspace,snapshots};
};
SR63.makeBackup=function(workspace,snapshots){const result={format:'school-results-complete',formatVersion:1,exportedAt:new Date().toISOString(),workspace,snapshots};SR63.parseBackup(result);return structuredClone(result);};
SR63.mergeSnapshots=function(incoming,existing){const byId=new Map(existing.map(point=>[point.id,point])),result=[];for(const point of incoming){const old=byId.get(point.id);if(old&&SR63.equal(old.workspace,point.workspace)&&old.pinned)continue;const next={...point,id:old&&!SR63.equal(old.workspace,point.workspace)?crypto.randomUUID():point.id,pinned:true};byId.set(next.id,next);result.push(next);}return result;};
