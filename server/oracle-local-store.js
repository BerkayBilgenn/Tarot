'use strict';
// Used only by the explicitly launched loopback preview. Never selected by the production handler.
const fs=require('node:fs/promises'),path=require('node:path');
const stores=new Map(),TTL=180*86400000;
function createLocalStore({file}){
 file=path.resolve(file);if(stores.has(file))return stores.get(file);
 let queue=Promise.resolve();
 const transact=(op)=>{const work=queue.then(async()=>{
  let state;try{state=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state={records:{},spentNano:0,reservedNano:0,daily:{},bursts:{}};}
  const result=op(state);await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});const tmp=file+'.tmp';await fs.writeFile(tmp,JSON.stringify(state),{mode:0o600});await fs.rename(tmp,file);return structuredClone(result);
 });queue=work.catch(()=>{});return work;};
 const key=(a)=>a.ownerId+':'+a.readingId;
 function existing(s,a){const r=s.records[key(a)];if(!r)return null;
  if(r.fingerprint!==a.fingerprint)return {status:'conflict'};
  const at=a.at??Date.now();
  if(r.status==='pending'&&at-r.startedAt>30000){s.reservedNano-=r.reserveNano;s.spentNano+=r.reserveNano;r.status='unknown';}
  if(r.status==='ready'&&at-r.finishedAt>TTL){r.status='expired';delete r.result;}
  return {status:r.status,record:r};
 }
 const store={file,
  lookup:a=>transact(s=>{const e=existing(s,a);return e?e.status==='conflict'?{status:'conflict'}:e.record:null;}),
  admit:a=>transact(s=>{
   const e=existing(s,a);if(e)return e;
   const dayKey=a.ownerId+':'+a.day;
   if((s.daily[dayKey]||0)>=a.dailyLimit)return {status:'quota'};
   if(s.spentNano+s.reservedNano+a.reserveNano>a.limitNano)return {status:'budget'};
   s.reservedNano+=a.reserveNano;s.daily[dayKey]=(s.daily[dayKey]||0)+1;
   const record={fingerprint:a.fingerprint,requestId:a.requestId,reserveNano:a.reserveNano,status:'pending',startedAt:a.at};s.records[key(a)]=record;return {status:'start',record};
  }),
  settle:a=>transact(s=>{
   const r=s.records[key(a)];if(!r||r.fingerprint!==a.fingerprint||r.requestId!==a.requestId)throw new Error('reservation-owner');
   if(r.status!=='pending')return r;
   const cost=Number.isSafeInteger(a.costNano)&&a.costNano>=0&&a.costNano<=r.reserveNano?a.costNano:r.reserveNano;
   s.reservedNano-=r.reserveNano;s.spentNano+=cost;r.status=a.status;r.finishedAt=a.at;
   if(a.status==='ready')r.result=a.result;return r;
  }),
  burst:({ip,at,scope})=>transact(s=>{const window=Math.floor(at/60000),status=scope==='status',k=(status?'status:':'write:')+ip+':'+window;for(const k of Object.keys(s.bursts))if(Number(k.split(':').pop())<window-1)delete s.bursts[k];s.bursts[k]=(s.bursts[k]||0)+1;return s.bursts[k]<=(status?12:6);})
 };stores.set(file,store);return store;
}
module.exports={createLocalStore};
