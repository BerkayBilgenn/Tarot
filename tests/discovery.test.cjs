const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const source=path.resolve(__dirname,'..');
function release(t){
  assert(fs.existsSync(path.join(source,'scripts/discovery.cjs')),'SEO/GEO static generation is missing');
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'miloruna-discovery-'));
  t.after(()=>fs.rmSync(out,{recursive:true,force:true}));
  require('../scripts/build.cjs').build({outDir:out});
  return out;
}
function locations(out){return [...fs.readFileSync(path.join(out,'sitemap.xml'),'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);}
function fileFor(out,url){return path.join(out,new URL(url).pathname,'index.html');}
test('published sitemap includes every real card and spread as a unique readable page',t=>{
  const out=release(t),urls=locations(out);
  assert.equal(urls.length,99);assert.equal(new Set(urls).size,99);
  for(const expected of ['https://www.miloruna.com/','https://www.miloruna.com/ask-tarot/','https://www.miloruna.com/kelt-haci-tarot/','https://www.miloruna.com/tarot-kartlari/ay/','https://www.miloruna.com/tarot-kartlari/tilsim-krali/','https://www.miloruna.com/rehber/tarot-nasil-bakilir/'])assert(urls.includes(expected),expected+' missing');
  for(const url of urls){assert.equal(new URL(url).origin,'https://www.miloruna.com');assert.equal(new URL(url).search,'');assert(fs.existsSync(fileFor(out,url)),url+' not built');}
  const moon=fs.readFileSync(path.join(out,'tarot-kartlari/ay/index.html'),'utf8');
  assert.match(moon,/<h1[^>]*>Ay tarot kartı/);assert.match(moon,/Düz anlam/);assert.match(moon,/Ters anlam/);assert.match(moon,/köpekle bir kurt/);assert.match(moon,/Açılımda bir örnek/);
  assert(!moon.includes('src="app.js'),'article downloads the entire reading app');
});
test('canonical, social identity, and unique titles agree on all published pages',t=>{
  const out=release(t),titles=new Set();
  for(const url of locations(out)){
    const html=fs.readFileSync(fileFor(out,url),'utf8');
    const canonical=[...html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/g)];
    assert.equal(canonical.length,1,url+' canonical missing/duplicated');assert.equal(canonical[0][1],url);
    assert(html.includes('<meta property="og:url" content="'+url+'">'));
    assert.match(html,/<meta name="description" content="[^\"]{30,}"/);
    const title=html.match(/<title>([^<]+)<\/title>/)?.[1];assert(title);assert(!titles.has(title),title+' duplicated');titles.add(title);
    assert.match(html,/<html lang="tr"/);assert.match(html,/<meta property="og:image" content="https:\/\/www.miloruna.com\//);
    const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));assert(schemas.length>0);
    assert(!JSON.stringify(schemas).includes('aggregateRating'),'unverified review rating');
    assert(!JSON.stringify(schemas).includes('FAQPage'),'removed FAQ search feature');
  }
});
test('crawlable links and image resources resolve inside the public build without exposing source',t=>{
  const out=release(t),urls=locations(out),known=new Set(urls.map(u=>new URL(u).pathname));
  for(const url of urls){
    const html=fs.readFileSync(fileFor(out,url),'utf8');
    for(const m of html.matchAll(/(?:href|src)="(\/[^\"]*)"/g)){
      const target=new URL(m[1].replaceAll('&amp;','&'),url);
      if(target.pathname.endsWith('/'))assert(known.has(target.pathname),url+' links to missing page '+target.pathname);
      else assert(fs.existsSync(path.join(out,target.pathname)),url+' links to missing asset '+target.pathname);
    }
  }
  for(const privatePath of ['content','scripts','tests','docs','.env','server/oracle-handler.js'])assert(!fs.existsSync(path.join(out,privatePath)),privatePath+' leaked');
  const home=fs.readFileSync(path.join(out,'index.html'),'utf8');assert.match(home,/href="\/tarot-kartlari\/"/);assert.match(home,/href="\/rehber\/"/);
});
test('robots permits public search and AI discovery while declaring only the canonical sitemap',t=>{
  const out=release(t),robots=fs.readFileSync(path.join(out,'robots.txt'),'utf8');
  assert.match(robots,/User-agent: \*/);assert.match(robots,/Allow: \/\n/);assert.match(robots,/Disallow: \/api\//);
  assert.match(robots,/Sitemap: https:\/\/www.miloruna.com\/sitemap.xml/);
  assert(!/Disallow: \/\s*(?:\n|$)/.test(robots),'public site blocked');
  assert(!robots.includes('GPTBot'),'training preference altered');
});
