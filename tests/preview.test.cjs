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
  const api=await fetch(url+'/api/closing',{method:'POST',headers:{'Content-Type':'application/json',Origin:url},body:JSON.stringify({reading:{id:'http-test',spreadId:'daily',cards:[{positionKey:'today',cardId:'major-03',reversed:false}]}})});assert.equal(api.status,503);assert.equal((await api.json()).error,'not-configured');
  assert.equal((await fetch(url+'/api/closing',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.test'},body:'{}'})).status,403);
  assert.equal((await fetch(url+'/api/closing',{method:'POST',headers:{'Content-Type':'application/json',Origin:url},body:'x'.repeat(17000)})).status,413);
});
