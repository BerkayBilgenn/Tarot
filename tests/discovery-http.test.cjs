const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
async function preview(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'miloruna-seo-http-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  require('../scripts/build.cjs').build({outDir:root});
  const {createHandler}=require('../server/oracle-handler.js');
  const server=require('../scripts/preview.cjs').createServer({root,handler:createHandler({env:{}})});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  return 'http://127.0.0.1:'+server.address().port;
}
test('public nested pages and crawl files return readable HTML XML and text over real HTTP',async t=>{
  const base=await preview(t);
  for(const [route,type,content] of [['/tarot-kartlari/ay/','text/html','Ay tarot kartı'],['/rehber/tarot-nasil-bakilir/','text/html','Tarot nasıl bakılır'],['/ask-tarot/','text/html','beş kartlık ilişki'],['/sitemap.xml','application/xml','<urlset'],['/robots.txt','text/plain','User-agent: *']]){
    const res=await fetch(base+route);assert.equal(res.status,200,route);assert(res.headers.get('content-type').startsWith(type),route);assert((await res.text()).includes(content),route);
  }
  const head=await fetch(base+'/tarot-kartlari/ay/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
});
test('slashless content redirects once while query strings cannot change canonical or open private sources',async t=>{
  const base=await preview(t);
  const redirect=await fetch(base+'/ask-tarot?utm_source=test',{redirect:'manual'});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'/ask-tarot/?utm_source=test');
  const page=await fetch(base+'/ask-tarot/?question=private');assert.equal(page.status,200);const html=await page.text();assert(html.includes('rel="canonical" href="https://www.miloruna.com/ask-tarot/"'));assert(!html.includes('question=private'));
  for(const route of ['/tarot-kartlari/unknown/','/content/editorial.cjs','/scripts/discovery.cjs','/docs/SEO-GEO.md','/.env','/%2e%2e%2fpackage.json'])assert.equal((await fetch(base+route)).status,404,route+' exposed');
  assert.equal((await fetch(base+'/api/closing')).status,405,'existing API route changed');
});
