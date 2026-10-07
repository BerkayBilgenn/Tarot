const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
function api(){assert(fs.existsSync(path.join(__dirname,'../discovery.js')),'validated discovery entry module is missing');return require('../discovery.js');}
test('published entry links choose the real spread including the ten-card Celtic Cross',()=>{
  const {readEntry}=api();
  for(const [query,want] of [
    ['?acilim=daily',{spreadId:'daily',intentId:'today'}],
    ['?acilim=three',{spreadId:'three',intentId:'general'}],
    ['?acilim=relationship',{spreadId:'relationship',intentId:'love'}],
    ['?acilim=career',{spreadId:'career',intentId:'work'}],
    ['?acilim=decision',{spreadId:'decision',intentId:'decision'}],
    ['?utm_source=test&acilim=celtic',{spreadId:'celtic',intentId:'general'}]
  ])assert.deepEqual(readEntry(query),want,query);
});
test('unsupported, duplicated, and prototype-property entry values safely fall back home',()=>{
  const {readEntry}=api();
  for(const query of ['',null,undefined,{},'?acilim=unknown','?acilim=constructor','?acilim=__proto__','?acilim=daily&acilim=celtic','?acilim=%3Cscript%3E','?acilim=daily'+'&q=x'.repeat(1000)])assert.equal(readEntry(query),null,String(query));
});
test('conversion analytics transfers only the allowed spread identifier and never reading text',()=>{
  const {analyticsEvent}=api();
  for(const name of ['reading_start','reading_complete','guide_reading_click'])assert.deepEqual(analyticsEvent(name,{spreadId:'relationship',question:'private question',personName:'private name',readingId:'private identifier',optionA:'private option',closing:'private interpretation',source_page:'/private'}),{name,params:{spread_id:'relationship'}});
  for(const [name,props] of [['card_picked',{spreadId:'daily'}],['reading_complete',{spreadId:'constructor'}],['reading_start',{spreadId:'private question'}],['reading_start',null]])assert.equal(analyticsEvent(name,props),null);
});
