const test=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../server/oracle-handler.js');
const {resultFor}=require('./helpers/oracle-fixtures.cjs'),{testEnv,payload,req,call,store}=require('./helpers/handler-fixtures.cjs');
const good=()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(resultFor(['today']))}}],usage:{prompt_tokens:100,completion_tokens:80}}));
test('handler rejects wrong method/origin/body/card layout and client provider overrides',async()=>{
 const handler=createHandler({env:testEnv,now:()=>0});
 assert.equal((await call(handler,req(payload,{method:'GET'}))).statusCode,405);
 assert.equal((await call(handler,req(payload,{headers:{host:'miloruna.test',origin:'https://other.test','content-type':'application/json'}}))).statusCode,403);
 for(const body of [{},{...payload,model:'override'},{...payload,attempt:1},{...payload,reading:{...payload.reading,cards:[]}},{...payload,reading:{...payload.reading,question:'x'.repeat(201)}}])assert.equal((await call(handler,req(body))).statusCode,400);
 assert.equal((await call(handler,req('x'.repeat(17000)))).statusCode,413);
});
test('session bootstrap and status missing never contact the provider',async t=>{
 let calls=0;const handler=createHandler({env:testEnv,store:await store(t),now:()=>0,providerFetch:()=>{calls++;throw Error();}});
 const sessionRequest=req({mode:'session'});delete sessionRequest.headers.cookie;const session=await call(handler,sessionRequest);assert.equal(session.statusCode,200);assert(session.headers['set-cookie']);
 const status=await call(handler,req({...payload,mode:'status'}));assert.equal(status.statusCode,404);assert.equal(calls,0);
});
test('two simultaneous requests for the same reading invoke Qwen exactly once and reuse ready while disabled',async t=>{
 let calls=0,release,upstream;const blocked=new Promise(r=>release=r),state=await store(t);
 const handler=createHandler({env:testEnv,store:state,now:()=>0,providerFetch:async(url,options)=>{calls++;upstream={url,body:JSON.parse(options.body)};await blocked;return good();}});
 const request=req(),first=call(handler,request);
 for(let i=0;i<100&&calls===0;i++)await new Promise(r=>setTimeout(r,1));
 assert.equal((await call(handler,request)).statusCode,202);assert.equal(calls,1);release();
 const res=await first;assert.equal(res.statusCode,200);assert.equal(JSON.parse(res.text).result.version,1);
 assert.equal(upstream.body.model,'qwen3.8-flash');assert.equal(upstream.body.enable_thinking,false);assert.match(upstream.url,/ws-test\.ap-southeast-1\.maas\.aliyuncs\.com/);
 const disabled=createHandler({env:{...testEnv,ORACLE_ENABLED:'false',QWEN_API_KEY:''},store:state,now:()=>0});
 assert.equal((await call(disabled,{...request,body:{...payload,mode:'status'}})).statusCode,200);assert.equal(calls,1);
 assert.equal((await call(handler,{...request,body:{...payload,reading:{...payload.reading,question:'Changed'}}})).statusCode,409);
 assert.equal((await call(handler,{...request,body:{...payload,ticket:'forged'}})).statusCode,409);
});
test('budget, missing session and unavailable store prevent paid calls',async t=>{
 let calls=0;const providerFetch=async()=>{calls++;return good();},state=await store(t);
 const handler=createHandler({env:{...testEnv,ORACLE_BUDGET_USD:'0'},store:state,now:()=>0,providerFetch});
 assert.equal((await call(handler,req())).statusCode,429);
 const r=req();delete r.headers.cookie;assert.equal((await call(handler,r)).statusCode,428);
 assert.equal((await call(createHandler({env:testEnv,now:()=>0,providerFetch}),req())).statusCode,503);assert.equal(calls,0);
});
test('invalid, truncated and failed responses never cause a second generation',async t=>{
 for(const response of [new Response('{"choices":[{"finish_reason":"stop","message":{"content":"bad"}}]}'),new Response('{"choices":[{"finish_reason":"length","message":{"content":"{}"}}]}'),new Response('private',{status:500})]){
  let calls=0;const handler=createHandler({env:testEnv,store:await store(t),now:()=>0,providerFetch:async()=>{calls++;return response;}}),request=req();
  assert.equal((await call(handler,request)).statusCode,502);const repeated=await call(handler,request);assert.equal(repeated.statusCode,409);assert.equal(calls,1);assert(!repeated.text.includes('test-secret'));
 }
});
test('an explicitly empty ticket is rejected before a provider invocation',async t=>{
 let calls=0;const handler=createHandler({env:testEnv,store:await store(t),now:()=>0,providerFetch:async()=>{calls++;return good();}});
 assert.equal((await call(handler,req({...payload,ticket:''}))).statusCode,409);assert.equal(calls,0);
});
test('status polling has a separate bounded allowance from session and generation',async t=>{
 let release,calls=0;const blocked=new Promise(r=>release=r),handler=createHandler({env:testEnv,store:await store(t),now:()=>0,providerFetch:async()=>{calls++;await blocked;return good();}});
 const request=req();assert.equal((await call(handler,{...request,body:{mode:'session'}})).statusCode,200);
 const first=call(handler,request);for(let i=0;i<100&&!calls;i++)await new Promise(r=>setTimeout(r,1));
 try{
  for(let i=0;i<6;i++)assert.equal((await call(handler,{...request,body:{...payload,mode:'status'}})).statusCode,202);
  for(let i=0;i<6;i++)assert.equal((await call(handler,{...request,body:{...payload,mode:'status'}})).statusCode,202);
  assert.equal((await call(handler,{...request,body:{...payload,mode:'status'}})).statusCode,429);assert.equal(calls,1);
 }finally{release();await first;}
});
