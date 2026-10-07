const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('release HTTP server serves only built assets and validates real API requests',async(t)=>{
  const file=path.join(__dirname,'../scripts/preview.cjs');assert(fs.existsSync(file),'Release preview server missing');
  const {build}=require('../scripts/build.cjs');build();
  const {createServer}=require(file),{createHandler}=require('../server/oracle-handler.js');
  const server=createServer({handler:createHandler({env:{}})});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const url='http://127.0.0.1:'+server.address().port;
  const home=await fetch(url);assert.equal(home.status,200);assert.match(await home.text(),/Miloruna/);assert.equal(home.headers.get('x-content-type-options'),'nosniff');
  for(const name of ['.env','oracle-proxy.js','tests/reading.test.cjs','docs/superpowers/plans/2026-10-07-production-readiness.md'])assert.equal((await fetch(url+'/'+name)).status,404,name+' exposed');
  const head=await fetch(url+'/app.js',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  for(const [name,type] of [['favicon.png','image/png'],['favicon.ico','image/x-icon']]){
    const icon=await fetch(url+'/'+name);assert.equal(icon.status,200,name+' missing from release');assert.equal(icon.headers.get('content-type'),type);assert((await icon.arrayBuffer()).byteLength>100);
  }
  const api=await fetch(url+'/api/closing',{method:'POST',headers:{'Content-Type':'application/json',Origin:url},body:JSON.stringify({mode:'generate',reading:{id:'http-test',spreadId:'daily',cards:[{positionKey:'today',cardId:'major-03',reversed:false}]}})});assert.equal(api.status,503);assert.equal((await api.json()).error,'not-configured');
  assert.equal((await fetch(url+'/api/closing',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.test'},body:'{}'})).status,403);
  assert.equal((await fetch(url+'/api/closing',{method:'POST',headers:{'Content-Type':'application/json',Origin:url},body:'x'.repeat(17000)})).status,413);
});
test('HTTP session and generated JSON reuse a saved result without another provider call',async t=>{
 const {createServer}=require('../scripts/preview.cjs'),{createHandler}=require('../server/oracle-handler.js');
 const {testEnv,payload,store}=require('./helpers/handler-fixtures.cjs'),{resultFor}=require('./helpers/oracle-fixtures.cjs');let calls=0;
 const handler=createHandler({env:testEnv,store:await store(t),providerFetch:async()=>{calls++;return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(resultFor(['today']))}}],usage:{prompt_tokens:100,completion_tokens:80}}));}});
 const server=createServer({handler});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const url='http://127.0.0.1:'+server.address().port,headers={'Content-Type':'application/json',Origin:url};
 const session=await fetch(url+'/api/closing',{method:'POST',headers,body:'{"mode":"session"}'});assert.equal(session.status,200);headers.Cookie=session.headers.get('set-cookie').split(';')[0];
 const generate=()=>fetch(url+'/api/closing',{method:'POST',headers,body:JSON.stringify(payload)});
 assert.equal((await generate()).status,200);assert.equal((await (await generate()).json()).result.general,resultFor(['today']).general);assert.equal(calls,1);
 for(const file of ['.env.local','server/oracle-local-store.js','.local-data/oracle.json'])assert.equal((await fetch(url+'/'+file)).status,404);
});
test('HTTP pending/status, quota and disabled flows do not start extra provider requests',async t=>{
 const {createServer}=require('../scripts/preview.cjs'),{createHandler}=require('../server/oracle-handler.js');
 const {testEnv,payload,store}=require('./helpers/handler-fixtures.cjs'),{resultFor}=require('./helpers/oracle-fixtures.cjs');let calls=0,release;
 const blocked=new Promise(r=>release=r),env={...testEnv,ORACLE_DAILY_LIMIT:'1'},state=await store(t);
 let handler=createHandler({env,store:state,providerFetch:async()=>{calls++;await blocked;return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(resultFor(['today']))}}],usage:{prompt_tokens:100,completion_tokens:80}}));}});
 const server=createServer({handler:(req,res)=>handler(req,res)});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const url='http://127.0.0.1:'+server.address().port,headers={'Content-Type':'application/json',Origin:url};
 const send=body=>fetch(url+'/api/closing',{method:'POST',headers,body:JSON.stringify(body)});
 const session=await send({mode:'session'});headers.Cookie=session.headers.get('set-cookie').split(';')[0];
 const first=send(payload);for(let i=0;i<100&&!calls;i++)await new Promise(r=>setTimeout(r,1));
 const pending=await send({...payload,mode:'status'});assert.equal(pending.status,202);const ticket=(await pending.json()).ticket;
 assert.equal((await send({...payload,ticket})).status,202);assert.equal(calls,1);release();assert.equal((await first).status,200);
 assert.equal((await send({...payload,mode:'status',ticket})).status,200);
 assert.equal((await send({...payload,reading:{...payload.reading,id:'quota-http'}})).status,429);
 handler=createHandler({env:{...env,ORACLE_ENABLED:'false'},store:state});headers['X-Forwarded-For']='192.0.2.2';
 assert.equal((await send({...payload,reading:{...payload.reading,id:'disabled-http'}})).status,503);assert.equal(calls,1);
});
