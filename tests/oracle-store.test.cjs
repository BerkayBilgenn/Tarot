const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {resultFor}=require('./helpers/oracle-fixtures.cjs');
async function local(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'miloruna-store-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return require('../server/oracle-local-store.js').createLocalStore({file:path.join(dir,'store.json')});}
const args={ownerId:'o',readingId:'r',fingerprint:'fp',reserveNano:6,limitNano:10,dailyLimit:100,day:'2026-10-07',at:1000,requestId:'q'};
test('concurrent admissions cannot exceed the shared budget',async t=>{
 const s=await local(t),results=await Promise.all(Array.from({length:20},(_,i)=>s.admit({...args,readingId:'r'+i,requestId:'q'+i})));
 assert.equal(results.filter(r=>r.status==='start').length,1);assert.equal(results.filter(r=>r.status==='budget').length,19);
});
test('saved records survive restart, settle once and reject changed input',async t=>{
 const s=await local(t);assert.equal((await s.admit(args)).status,'start');assert.equal((await s.admit({...args,requestId:'q2'})).status,'pending');
 assert.equal((await s.admit({...args,fingerprint:'changed'})).status,'conflict');
 await s.settle({...args,status:'ready',result:resultFor(['today']),costNano:3});
 await s.settle({...args,status:'ready',costNano:3});assert.equal((await s.admit({...args,limitNano:0,dailyLimit:0})).status,'ready');
 const again=require('../server/oracle-local-store.js').createLocalStore({file:s.file});assert.equal((await again.lookup(args)).result.general,resultFor(['today']).general);
 assert.equal((await again.admit({...args,readingId:'r2',requestId:'q2',reserveNano:8})).status,'budget');
});
test('stale pending and expired results cannot produce a second charged request',async t=>{
 const s=await local(t);await s.admit(args);
 assert.equal((await s.admit({...args,at:32000})).status,'unknown');
 assert.equal((await s.admit({...args,at:999999})).status,'unknown');
 const s2=await local(t);await s2.admit(args);await s2.settle({...args,status:'ready',result:resultFor(['today']),costNano:3});
 assert.equal((await s2.lookup({...args,at:181*86400000})).status,'expired');
});
test('daily quota rolls over without resetting global spending',async t=>{
 const s=await local(t);await s.admit({...args,dailyLimit:1});await s.settle({...args,status:'failed',costNano:3});
 assert.equal((await s.admit({...args,readingId:'two',dailyLimit:1})).status,'quota');
 assert.equal((await s.admit({...args,readingId:'two',day:'2026-10-08',dailyLimit:1})).status,'start');
});
test('Redis uses authenticated EVAL and fails closed on HTTP or protocol failure',async()=>{
 const {createStore}=require('../server/oracle-store.js');let captured;
 const store=createStore({url:'https://redis.test',token:'fake',fetchImpl:async(url,opts)=>{captured=opts;return new Response(JSON.stringify({result:JSON.stringify({status:'budget'})}));}});
 assert.equal((await store.admit(args)).status,'budget');assert.equal(JSON.parse(captured.body)[0],'EVAL');assert.equal(captured.headers.Authorization,'Bearer fake');
 for(const response of [new Response('{}',{status:500}),new Response('{"error":"bad"}')]){
  const bad=createStore({url:'https://redis.test',token:'fake',fetchImpl:async()=>response});await assert.rejects(bad.admit(args));
 }
});
test('Redis returns original result JSON without Lua altering empty connection arrays',async()=>{
 const {createStore}=require('../server/oracle-store.js');const result=resultFor(['today']);let command;
 const store=createStore({url:'https://redis.test',token:'fake',fetchImpl:async(url,opts)=>{
  command=JSON.parse(opts.body);return new Response(JSON.stringify({result:JSON.stringify({status:'ready',record:{status:'ready',resultJson:JSON.stringify(result)}})}));
 }});
 const saved=await store.lookup(args);assert.deepEqual(saved.result,result);assert.deepEqual(saved.result.positions[0].connections,[]);
 assert.match(command[1],/resultJson=body/);assert.doesNotMatch(command[1],/cjson\.decode\(body\)/);
});
test('status reads and new requests retain independent bounded burst limits in both store adapters',async t=>{
 const s=await local(t),ip='192.0.2.1',at=0;
 for(let i=0;i<6;i++)assert.equal(await s.burst({ip,at}),true);assert.equal(await s.burst({ip,at}),false);
 for(let i=0;i<12;i++)assert.equal(await s.burst({ip,at,scope:'status'}),true);assert.equal(await s.burst({ip,at,scope:'status'}),false);
 const {createStore}=require('../server/oracle-store.js'),commands=[];
 const redis=createStore({url:'https://redis.test',token:'fake',fetchImpl:async(url,opts)=>{commands.push(JSON.parse(opts.body));return new Response('{"result":1}');}});
 await redis.burst({ip,at});await redis.burst({ip,at,scope:'status'});assert.equal(commands[0].at(-1),'6');assert.equal(commands[1].at(-1),'12');assert.notEqual(commands[0][3],commands[1][3]);
});
