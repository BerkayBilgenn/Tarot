'use strict';
const cards = require('../cards.js');
const spreads = require('../spreads.js');
const oracle = require('../oracle.js');
const crypto=require('node:crypto');
const {loadConfig,reserveCost,usageCost}=require('./oracle-config.js');
const I=require('./oracle-identity.js');
const {createStore}=require('./oracle-store.js');
const MAX_BODY=16384;
function reply(res,status,data){
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 res.end(JSON.stringify(typeof data==='string'?{error:data}:data));
}
function validatedReading(body) {
  const r = body?.reading;
  const spread = r && spreads.getSpread(r.spreadId);
  if (!spread || typeof r.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(r.id)) return null;
  if (!Array.isArray(r.cards) || r.cards.length !== spread.cardCount) return null;
  if (Object.keys(body).some(k=>!['mode','reading','ticket'].includes(k))) return null;
  if (!['generate','status'].includes(body.mode)) return null;
  if (body.ticket !== undefined && (typeof body.ticket !== 'string' || body.ticket.length>2048)) return null;
  const result = { id: r.id, spreadId: spread.id, cards: [] };
  const seen = new Set();
  for (let i = 0; i < r.cards.length; i++) {
    const card = r.cards[i];
    if (!card || card.positionKey !== spread.positions[i].key || !cards.getCard(card.cardId) || seen.has(card.cardId) || typeof card.reversed !== 'boolean') return null;
    seen.add(card.cardId);
    result.cards.push({ positionKey: card.positionKey, cardId: card.cardId, reversed: card.reversed });
  }
  for (const [key, max] of Object.entries({question:200, optionA:40, optionB:40, personName:30})) {
    if (r[key] === undefined) continue;
    if (typeof r[key] !== 'string' || r[key].length > max) return null;
    result[key] = r[key].trim();
  }
  if (spread.inputs.options === 'required' && (!result.optionA || !result.optionB)) return null;
  return { reading: result, spread };
}

async function readBody(req) {
  if (Number(req.headers['content-length']) > MAX_BODY) throw Object.assign(new Error(), {status:413});
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? String(req.body) : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > MAX_BODY) throw Object.assign(new Error(), {status:413});
    return JSON.parse(raw);
  }
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error(), {status:413});
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function boundedJson(response){
 if(Number(response.headers.get('content-length'))>65536)throw new Error('response-too-large');
 const reader=response.body.getReader();let bytes=0,chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>65536)throw new Error('response-too-large');chunks.push(Buffer.from(value));}}
 finally{await reader.cancel().catch(()=>{});}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function createHandler({env=process.env,fetchImpl=globalThis.fetch,now=Date.now,store,providerFetch=fetchImpl}={}){
 const config=loadConfig(env);
 if(!store&&env.UPSTASH_REDIS_REST_URL&&env.UPSTASH_REDIS_REST_TOKEN){try{store=createStore({url:env.UPSTASH_REDIS_REST_URL,token:env.UPSTASH_REDIS_REST_TOKEN,fetchImpl,now});}catch{}}
 return async(req,res)=>{
  if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(res,405,'method-not-allowed');}
  try{const o=req.headers.origin;if(req.headers['sec-fetch-site']==='cross-site'||(o&&(new URL(o).host!==req.headers.host||!['http:','https:'].includes(new URL(o).protocol))))return reply(res,403,'origin-not-allowed');}catch{return reply(res,403,'origin-not-allowed');}
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))return reply(res,415,'json-required');
  let body,input;try{body=await readBody(req);if(body?.mode!=='session')input=validatedReading(body);else if(Object.keys(body).length!==1)throw Error();}catch(e){return reply(res,e.status||400,e.status===413?'body-too-large':'invalid-reading');}
  if(body?.mode!=='session'&&!input)return reply(res,400,'invalid-reading');
  if(!config||!store)return reply(res,503,'not-configured');
  const at=now(),ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  try{if(!await store.burst({ip,at,scope:body.mode==='status'?'status':'write'})){res.setHeader('Retry-After','60');return reply(res,429,'rate-limited');}}catch{return reply(res,503,'store-unavailable');}
  if(body.mode==='session'){
   if(!I.ownerFromRequest(req,config.secret,at)){
    const secure=!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host||'');
    res.setHeader('Set-Cookie',I.issueOwner(config.secret,at,secure).cookie);
   }
   return reply(res,200,{status:'session'});
  }
  const ownerId=I.ownerFromRequest(req,config.secret,at);if(!ownerId)return reply(res,428,'session-required');
  const fingerprint=I.canonicalFingerprint(input.reading),identity={ownerId,readingId:input.reading.id,fingerprint},query={...identity,at};
  if(body.ticket!==undefined&&!I.verifyTicket(body.ticket,identity,config.secret,at))return reply(res,409,'invalid-ticket');
  function recordReply(record){
   const status=record.status,ticket=record.startedAt!==undefined?I.issueTicket({...identity,createdAt:record.startedAt},config.secret):undefined;
   if(status==='ready')return reply(res,200,{status,result:record.result,ticket});
   if(status==='pending')return reply(res,202,{status,ticket});
   return reply(res,409,{status,error:status,ticket});
  }
  let record;try{record=await store.lookup(query);}catch{return reply(res,503,'store-unavailable');}
  if(record)return recordReply(record);
  if(body.mode==='status')return reply(res,404,{status:'missing',error:'missing'});
  if(!config.enabled)return reply(res,503,'disabled');
  if(!config.key||!config.endpoint)return reply(res,503,'not-configured');
  const messages=[{role:'system',content:oracle.SYSTEM},{role:'user',content:oracle.brief(input.reading,input.spread,cards)}];
  const maxTokens=oracle.maxOutputTokens(input.spread.id);let reservation;
  try{reservation=reserveCost(messages,maxTokens,config);}catch{return reply(res,400,'input-too-large');}
  const requestId=crypto.randomUUID(),day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
  let admitted;try{admitted=await store.admit({...query,reserveNano:reservation.nano,limitNano:config.limitNano,dailyLimit:config.dailyLimit,day,requestId});}catch{return reply(res,503,'store-unavailable');}
  if(admitted.status!=='start'){
   if(['quota','budget'].includes(admitted.status))return reply(res,429,{status:admitted.status,error:admitted.status});
   return recordReply(admitted.record||{status:admitted.status});
  }
  const ticket=I.issueTicket({...identity,createdAt:at},config.secret);
  let data,result,status='unknown',costNano=reservation.nano,httpStatus=502;
  try{
   const upstream=await providerFetch(config.endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.key}`},signal:AbortSignal.timeout(20000),body:JSON.stringify({model:config.model,temperature:0.7,stream:false,enable_thinking:false,response_format:{type:'json_object'},max_tokens:maxTokens,messages})});
   if(!upstream.ok)throw Error('upstream-unavailable');
   data=await boundedJson(upstream);costNano=usageCost(data?.usage,config,reservation);status='failed';
   if(data?.choices?.[0]?.finish_reason==='stop'){
    try{result=oracle.validateResult(JSON.parse(data.choices[0].message.content),input.spread.positions.map(p=>p.key));}catch{}
   }
   if(result){status='ready';httpStatus=200;}
  }catch(e){if(['TimeoutError','AbortError'].includes(e.name))httpStatus=504;}
  let settled;try{settled=await store.settle({...identity,requestId,status,result,costNano,at:now()});}catch{return reply(res,503,{status:'unknown',error:'store-unavailable',ticket});}
  if(settled.status==='ready')return reply(res,200,{status:'ready',result:settled.result,ticket});
  return reply(res,httpStatus,{status:settled.status,error:settled.status==='failed'?'invalid-upstream-response':'upstream-unavailable',ticket});
 };
}
module.exports={createHandler,validatedReading};
