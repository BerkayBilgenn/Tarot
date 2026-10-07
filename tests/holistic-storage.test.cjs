const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../reading.js'),cards=require('../cards.js'),spreads=require('../spreads.js'),{resultFor}=require('./helpers/oracle-fixtures.cjs');
function service(){const storage=R.memoryStorage(),svc=R.createService({cards,spreads,storage,now:()=>new Date('2026-10-07T09:00:00Z')});return {svc,storage};}
async function ready(svc){const {readingId}=await svc.createReading({spreadId:'daily',forceNew:true});await svc.pick(readingId,0,0);await svc.complete(readingId);return readingId;}
test('refreshing old local text preserves validated holistic result and signed state',async()=>{
 const {svc,storage}=service(),id=await ready(svc),result=resultFor(['today']);
 await svc.saveHolistic(id,result,{source:'llm',ticket:'signed-ticket'});
 const records=JSON.parse(storage.getItem('kd.readings.v1'));records.find(r=>r.id===id).interpretation.textVersion='old';storage.setItem('kd.readings.v1',JSON.stringify(records));
 const again=await svc.complete(id);assert.deepEqual(again.holistic,result);assert.equal(again.closing,result.general);assert.equal(again.oracleState.ticket,'signed-ticket');
});
test('malformed AI data cannot overwrite cards or a saved reading; local fallback remains local',async()=>{
 const {svc,storage}=service(),id=await ready(svc);await assert.rejects(svc.saveHolistic(id,{version:1,general:'bad',positions:[]},{source:'llm'}));
 await svc.saveOracleState(id,{status:'local',reason:'disabled'});assert.equal((await svc.complete(id)).oracleState.status,'local');
 const records=JSON.parse(storage.getItem('kd.readings.v1'));records.find(r=>r.id===id).interpretation.holistic={version:1,general:'bad',positions:[]};storage.setItem('kd.readings.v1',JSON.stringify(records));
 assert.equal((await svc.complete(id)).holistic,undefined);assert.equal((await svc.get(id)).cards.length,1);
});
test('legacy AI closing survives upgrade and saving reading A never changes reading B',async()=>{
 const {svc,storage}=service(),a=await ready(svc),b=await ready(svc);
 await svc.saveClosing(a,'Eski AI yorumu','llm');const records=JSON.parse(storage.getItem('kd.readings.v1'));records.find(r=>r.id===a).interpretation.textVersion='old';storage.setItem('kd.readings.v1',JSON.stringify(records));
 assert.equal((await svc.complete(a)).closing,'Eski AI yorumu');
 await svc.saveHolistic(a,resultFor(['today']),{source:'llm'});assert.equal((await svc.complete(b)).holistic,undefined);
});
