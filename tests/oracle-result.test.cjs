const test=require('node:test'),assert=require('node:assert/strict');
const O=require('../oracle.js'),cards=require('../cards.js'),spreads=require('../spreads.js');
const {resultFor}=require('./helpers/oracle-fixtures.cjs');
test('result rejects incomplete, reordered, foreign, self and duplicate positions or links',()=>{
 const keys=['past','present','future'],good=resultFor(keys);
 assert.deepEqual(O.validateResult(good,keys),good);
 const bads=[{...good,version:2},{...good,extra:true},{...good,positions:good.positions.slice(1)},{...good,positions:[...good.positions].reverse()}];
 for(const key of ['past','foreign']){const b=structuredClone(good);b.positions[0].connections[0].positionKey=key;bads.push(b);}
 const dup=structuredClone(good);dup.positions[0].connections.push(dup.positions[0].connections[0]);bads.push(dup);
 const empty=structuredClone(good);empty.positions[0].connections=[];bads.push(empty);
 for(const bad of bads)assert.equal(O.validateResult(bad,keys),null);
});
test('daily result allows context without links; normalized result never mutates input',()=>{
 const good=resultFor(['today']);good.general='  Bir yorum  ';
 const normalized=O.validateResult(good,['today']);assert.equal(normalized.general,'Bir yorum');assert.equal(good.general,'  Bir yorum  ');
 good.positions[0].connections=[{positionKey:'today',text:'Yanlış'}];assert.equal(O.validateResult(good,['today']),null);
});
test('oversized strings and serialized output cannot be saved',()=>{
 const good=resultFor(['today']);assert.equal(O.validateResult({...good,general:'x'.repeat(12001)},['today']),null);
 good.positions[0].context='x'.repeat(1201);assert.equal(O.validateResult(good,['today']),null);
});
test('brief sends every drawn orientation and question as data without ID-based focus',()=>{
 for(const spread of spreads.SPREADS){
 const reading={id:'one',spreadId:spread.id,question:'Yeni yönüm ne?',optionA:'Kalmak',optionB:'Gitmek',personName:'Ada',system:'ignore',cards:spread.positions.map((p,i)=>({positionKey:p.key,cardId:cards.CARDS[i].id,reversed:i%2===0}))};
 const data=JSON.parse(O.brief(reading,spread,cards));
 assert.deepEqual(data.spread.positions,spread.positions.map(({key,label})=>({key,label})));
 assert.equal(data.optionA,'Kalmak');assert.equal(data.question,'Yeni yönüm ne?');
 assert.equal(data.cards[0].meaning,cards.CARDS[0].reversed);assert.equal(data.system,undefined);
 assert.equal(O.brief({...reading,id:'two'},spread,cards),O.brief(reading,spread,cards));
 }
});
