const fs=require('fs'),path=require('path');

const cloudPath=path.resolve(__dirname,'../src/cloud.js');
const source=fs.readFileSync(cloudPath,'utf8');
const match=source.match(/const config=\{url:'([^']+)',key:'([^']+)'\}/);
if(!match)throw new Error('Could not locate the public Supabase configuration.');

const [,url,key]=match;
const endpoint=`${url}/rest/v1/school_health?select=id&limit=1`;

(async()=>{
  const response=await fetch(endpoint,{
    method:'GET',
    headers:{
      apikey:key,
      Authorization:`Bearer ${key}`,
      Accept:'application/json'
    },
    signal:AbortSignal.timeout(30000)
  });
  const text=await response.text();
  if(!response.ok)throw new Error(`Supabase health read failed (${response.status}): ${text.slice(0,300)}`);
  let rows;
  try{rows=JSON.parse(text);}catch{throw new Error('Supabase health response was not valid JSON.');}
  if(!Array.isArray(rows)||!rows.some(row=>row.id===1))throw new Error('Supabase health row is missing. Apply source/db/6.9.19_keep_alive.sql first.');
  console.log('SchoolResult Supabase health read succeeded.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
