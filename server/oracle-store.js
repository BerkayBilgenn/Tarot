'use strict';
const crypto=require('node:crypto');
const PREFIX='miloruna:oracle:v1:';
const READ=String.raw`
local raw=redis.call('GET',KEYS[1])
if not raw then return cjson.encode({status='missing'}) end
local r=cjson.decode(raw)
if r.fingerprint~=ARGV[1] then return cjson.encode({status='conflict'}) end
local at=tonumber(ARGV[2])
if r.status=='pending' and at-r.startedAt>30000 then
 redis.call('HINCRBY',KEYS[3],'reservedNano',-r.reserveNano)
 redis.call('HINCRBY',KEYS[3],'spentNano',r.reserveNano)
 r.status='unknown';redis.call('SET',KEYS[1],cjson.encode(r))
end
if r.status=='ready' then
 local body=redis.call('GET',KEYS[2])
 if body then r.resultJson=body else r.status='expired';redis.call('SET',KEYS[1],cjson.encode(r)) end
end
return cjson.encode({status=r.status,record=r})`;
const ADMIT=String.raw`
local raw=redis.call('GET',KEYS[1])
if raw then
 local r=cjson.decode(raw)
 if r.fingerprint~=ARGV[1] then return cjson.encode({status='conflict'}) end
 if r.status=='pending' and tonumber(ARGV[2])-r.startedAt>30000 then
  redis.call('HINCRBY',KEYS[3],'reservedNano',-r.reserveNano);redis.call('HINCRBY',KEYS[3],'spentNano',r.reserveNano)
  r.status='unknown';redis.call('SET',KEYS[1],cjson.encode(r))
 end
 if r.status=='ready' then local body=redis.call('GET',KEYS[2]);if body then r.resultJson=body else r.status='expired';redis.call('SET',KEYS[1],cjson.encode(r)) end end
 return cjson.encode({status=r.status,record=r})
end
if tonumber(redis.call('GET',KEYS[4]) or '0')>=tonumber(ARGV[5]) then return cjson.encode({status='quota'}) end
local spent=tonumber(redis.call('HGET',KEYS[3],'spentNano') or '0')
local reserved=tonumber(redis.call('HGET',KEYS[3],'reservedNano') or '0')
if spent+reserved+tonumber(ARGV[3])>tonumber(ARGV[4]) then return cjson.encode({status='budget'}) end
redis.call('HINCRBY',KEYS[3],'reservedNano',ARGV[3]);redis.call('INCR',KEYS[4]);redis.call('EXPIRE',KEYS[4],172800)
local r={fingerprint=ARGV[1],startedAt=tonumber(ARGV[2]),reserveNano=tonumber(ARGV[3]),requestId=ARGV[6],status='pending'}
redis.call('SET',KEYS[1],cjson.encode(r))
return cjson.encode({status='start',record=r})`;
const SETTLE=String.raw`
local raw=redis.call('GET',KEYS[1]);if not raw then return redis.error_reply('reservation-missing') end
local r=cjson.decode(raw)
if r.fingerprint~=ARGV[1] or r.requestId~=ARGV[2] then return redis.error_reply('reservation-owner') end
if r.status~='pending' then return cjson.encode(r) end
local cost=tonumber(ARGV[4]);if not cost or cost<0 or cost>r.reserveNano then cost=r.reserveNano end
redis.call('HINCRBY',KEYS[3],'reservedNano',-r.reserveNano);redis.call('HINCRBY',KEYS[3],'spentNano',cost)
r.status=ARGV[3];r.finishedAt=tonumber(ARGV[5])
redis.call('SET',KEYS[1],cjson.encode(r))
if r.status=='ready' then redis.call('SET',KEYS[2],ARGV[6],'EX',15552000);r.resultJson=ARGV[6] end
return cjson.encode(r)`;
const BURST=String.raw`local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],60) end;return n<=tonumber(ARGV[1]) and 1 or 0`;
function createStore({url,token,fetchImpl=globalThis.fetch,now=Date.now}){
 if(!/^https:\/\/[a-zA-Z0-9.-]+\/?$/.test(url)||!token)throw new Error('store-config');
 const keys=a=>{const id=crypto.createHash('sha256').update(a.ownerId+':'+a.readingId).digest('hex');return [PREFIX+'record:'+id,PREFIX+'result:'+id,PREFIX+'ledger'];};
 async function evalScript(script,keys,args){
  const res=await fetchImpl(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(['EVAL',script,keys.length,...keys,...args.map(String)]),signal:AbortSignal.timeout(3000)});
  if(!res.ok)throw new Error('store-unavailable');const data=await res.json();if(data.error||data.result===undefined)throw new Error('store-error');const value=typeof data.result==='string'?JSON.parse(data.result):data.result;
  const record=value?.record||value;
  if(record&&typeof record.resultJson==='string'){record.result=JSON.parse(record.resultJson);delete record.resultJson;}
  return value;
 }
 return {
  lookup:async a=>{const v=await evalScript(READ,keys(a),[a.fingerprint,a.at??now()]);return v.status==='missing'?null:v.status==='conflict'?{status:'conflict'}:v.record;},
  admit:a=>evalScript(ADMIT,[...keys(a),PREFIX+'day:'+a.ownerId+':'+a.day],[a.fingerprint,a.at,a.reserveNano,a.limitNano,a.dailyLimit,a.requestId]),
  settle:a=>evalScript(SETTLE,keys(a),[a.fingerprint,a.requestId,a.status,a.costNano??'',a.at,JSON.stringify(a.result||null)]),
  burst:async({ip,at,scope})=>!!(await evalScript(BURST,[PREFIX+'burst:'+(scope==='status'?'status:':'write:')+crypto.createHash('sha256').update(ip).digest('hex')+':'+Math.floor(at/60000)],[scope==='status'?12:6]))
 };
}
module.exports={createStore};
