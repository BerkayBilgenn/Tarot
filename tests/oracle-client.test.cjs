const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const spreads=require('../spreads.js'),{resultFor}=require('./helpers/oracle-fixtures.cjs');
function client(fetch){const c={fetch,TextEncoder,AbortController,setTimeout,clearTimeout,module:{exports:{}}};vm.runInNewContext(fs.readFileSync(require.resolve('../oracle.js'),'utf8'),c);return c.module.exports;}
const reading={id:'one',spreadId:'daily',seed:'secret',userId:'private',cards:[{positionKey:'today',cardId:'major-03',reversed:false}]};
test('client bootstraps once and coalesces a reading; private device/deck state never leaves browser',async()=>{
 const bodies=[],O=client(async(url,options)=>{assert.equal(url,'/api/closing');const b=JSON.parse(options.body);bodies.push(b);return new Response(JSON.stringify(b.mode==='session'?{status:'session'}:{status:'ready',result:resultFor(['today']),ticket:'signed'}));});
 const [a,b]=await Promise.all([O.generate(reading,spreads.getSpread('daily')),O.generate(reading,spreads.getSpread('daily'))]);
 assert.equal(a.general,b.general);assert.deepEqual(bodies.map(b=>b.mode),['session','generate']);
 assert(!JSON.stringify(bodies).includes('secret'));assert(!JSON.stringify(bodies).includes('private'));
});
test('ticketed reopening uses status and similarity does not trigger rewrites',async()=>{
 const modes=[],O=client(async(url,options)=>{const b=JSON.parse(options.body);modes.push(b.mode);return new Response(JSON.stringify(b.mode==='session'?{status:'session'}:{status:'ready',result:resultFor(['today']),ticket:'signed'}));});
 assert.equal((await O.generate(reading,spreads.getSpread('daily'),{ticket:'signed'})).general,resultFor(['today']).general);
 assert.deepEqual(modes,['session','status']);
});
test('a failing ticket save does not discard a validated ready response',async()=>{
 const O=client(async(url,options)=>{const b=JSON.parse(options.body);return new Response(JSON.stringify(b.mode==='session'?{status:'session'}:{status:'ready',result:resultFor(['today']),ticket:'signed'}));});
 const result=await O.generate(reading,spreads.getSpread('daily'),{onTicket:async()=>{throw Object.assign(Error('full'),{code:'storage-full'});}});
 assert.equal(result.general,resultFor(['today']).general);
});
