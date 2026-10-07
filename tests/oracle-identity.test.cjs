const test=require('node:test'),assert=require('node:assert/strict');
const secret='x'.repeat(32);
test('signed session and tickets bind owner, reading and cards and reject tampering/expiry',()=>{
 const I=require('../server/oracle-identity.js');
 const {ownerId,cookie}=I.issueOwner(secret,1000);
 assert.equal(I.ownerFromRequest({headers:{cookie:cookie.split(';')[0]}},secret,1000),ownerId);
 assert.equal(I.ownerFromRequest({headers:{cookie:cookie.replace(/.$/,'z').split(';')[0]+'z'}},secret,1000),null);
 const expected={ownerId,readingId:'r',fingerprint:'fp'},ticket=I.issueTicket({...expected,createdAt:1000},secret);
 assert(I.verifyTicket(ticket,expected,secret,1000));assert(!I.verifyTicket(ticket,{...expected,readingId:'other'},secret,1000));
 assert(!I.verifyTicket(ticket,expected,secret,1000+181*86400000));
 const reading={spreadId:'daily',cards:[{positionKey:'today',cardId:'major-03',reversed:false}]};
 assert.equal(I.canonicalFingerprint(reading),I.canonicalFingerprint({...reading,seed:'x',id:'other'}));
 assert.notEqual(I.canonicalFingerprint(reading),I.canonicalFingerprint({...reading,question:'Yeni soru'}));
});
test('Qwen3.8 pricing reserves maximum output and never trusts invalid usage',()=>{
 const C=require('../server/oracle-config.js'),env={ORACLE_ENABLED:'true',QWEN_API_KEY:'fake',QWEN_WORKSPACE_ID:'ws-test',ORACLE_SIGNING_SECRET:secret};
 const cfg=C.loadConfig(env);assert.equal(cfg.model,'qwen3.8-flash');
 const reservation=C.reserveCost([{role:'user',content:'abc'}],1024,cfg);
 assert.equal(C.usageCost({prompt_tokens:100,completion_tokens:80},cfg,reservation),52600);
 for(const usage of [null,{prompt_tokens:-1,completion_tokens:5},{prompt_tokens:1e9,completion_tokens:10}])assert.equal(C.usageCost(usage,cfg,reservation),reservation.nano);
 assert.equal(C.loadConfig({...env,QWEN_WORKSPACE_ID:'evil.test/x'}),null);
});
