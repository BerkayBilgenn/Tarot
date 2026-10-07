'use strict';
const crypto=require('node:crypto');
const MAX_AGE=180*86400000;
function sign(value,secret){const data=Buffer.from(JSON.stringify(value)).toString('base64url');return data+'.'+crypto.createHmac('sha256',secret).update(data).digest('base64url');}
function verify(token,secret){
 try{if(typeof token!=='string'||token.length>2048)return null;const [data,sig,extra]=token.split('.');if(extra||!data||!sig)return null;
 const expected=crypto.createHmac('sha256',secret).update(data).digest(),actual=Buffer.from(sig,'base64url');if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return null;
 return JSON.parse(Buffer.from(data,'base64url').toString('utf8'));}catch{return null;}
}
function validTime(at,now){return Number.isSafeInteger(at)&&at<=now+60000&&now-at<=MAX_AGE;}
function canonicalFingerprint(r){return crypto.createHash('sha256').update(JSON.stringify({spreadId:r.spreadId,question:r.question||'',optionA:r.optionA||'',optionB:r.optionB||'',personName:r.personName||'',cards:r.cards.map(({positionKey,cardId,reversed})=>({positionKey,cardId,reversed}))})).digest('hex');}
function issueOwner(secret,now=Date.now(),secure=true){const ownerId=crypto.randomUUID(),token=sign({kind:'owner',ownerId,createdAt:now},secret);return {ownerId,cookie:`ml_oracle=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE/1000}${secure?'; Secure':''}`};}
function ownerFromRequest(req,secret,now=Date.now()){
 const token=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('ml_oracle='))?.slice(10);
 const v=verify(token,secret);return v?.kind==='owner'&&/^[0-9a-f-]{36}$/.test(v.ownerId)&&validTime(v.createdAt,now)?v.ownerId:null;
}
function issueTicket(value,secret){return sign({kind:'reading',...value},secret);}
function verifyTicket(token,expected,secret,now=Date.now()){
 const v=verify(token,secret);return !!(v?.kind==='reading'&&v.ownerId===expected.ownerId&&v.readingId===expected.readingId&&v.fingerprint===expected.fingerprint&&validTime(v.createdAt,now));
}
module.exports={canonicalFingerprint,issueOwner,ownerFromRequest,issueTicket,verifyTicket};
