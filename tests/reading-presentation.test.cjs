const test=require('node:test'),assert=require('node:assert/strict');
const UI=require('../ui-helpers.js'),spreads=require('../spreads.js'),{resultFor}=require('./helpers/oracle-fixtures.cjs');
test('all six spreads open with general interpretation, including daily and Celtic',()=>{
 for(const spread of spreads.SPREADS)assert.deepEqual(UI.storyOutline({spreadId:spread.id,positionKeys:spread.positions.map(p=>p.key),hasComparison:true,hasPairs:true}).map(c=>c.id),['closing','finish']);
});
test('daily detail preserves drawn direction and no links; missing position never borrows context',()=>{
 const reading={cards:[{positionKey:'today',cardId:'major-03',reversed:true}]},spread=spreads.getSpread('daily');
 const detail=UI.cardReadingDetail({reading,spread,interpretation:{holistic:resultFor(['today']),positions:[]},positionKey:'today'});
 assert.equal(detail.drawnReversed,true);assert.equal(detail.context,'Bu konumun kısa yorumu.');assert.equal(detail.connections.length,0);
 assert.equal(UI.cardReadingDetail({reading,spread,interpretation:{positions:[]},positionKey:'missing'}),null);
});
test('connections use labels from this reading and invalid structured data falls back locally',()=>{
 const spread=spreads.getSpread('three'),reading={cards:spread.positions.map((p,i)=>({positionKey:p.key,cardId:'major-0'+i,reversed:false}))},result=resultFor(['past','present','future']);
 const detail=UI.cardReadingDetail({reading,spread,interpretation:{holistic:result,positions:[]},positionKey:'past'});
 assert.match(detail.connections[0].label,/Şimdi/);assert(!detail.connections[0].label.includes('undefined'));
 const local=UI.cardReadingDetail({reading,spread,interpretation:{holistic:{...result,positions:[]},positions:[{positionKey:'past',context:'Yerel açıklama.'}]},positionKey:'past'});assert.equal(local.context,'Yerel açıklama.');
});
