const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {resultFor}=require('./helpers/oracle-fixtures.cjs');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8'),start=source.indexOf('function setClosingText(');
// Execute the application's actual functions, isolating only layout/storage/provider boundaries.
const functions=source.slice(start,source.indexOf('\nfunction bindReading()',start));
const reading={id:'A'},spread={id:'daily'},result=resultFor(['today']);
function page(options={}){
 const shown=[],saved=[],node={textContent:''},interpretation={},state={renderToken:1};
 const story={chapters:[{kind:'closing',blocks:[{text:'initial'}],pages:[{}]}],at:{chapter:0,page:0}};
 const full=()=>Promise.reject(Object.assign(Error('full'),{code:'storage-full'}));
 const context={state,story,$:()=>node,storyMeasure:()=>({innerHTML:''}),paginateChapter:chapter=>{chapter.pages=[{}];},showStoryPage:()=>shown.push(story.chapters[0].blocks[0].text),updateStoryNav:()=>{},UI:{generalText:()=>null},TAROT:{},service:{previousReadings:async()=>[],saveOracleState:options.full?full:async()=>{},saveHolistic:options.full?full:async(id,data)=>{saved.push({id,result:data});return {holistic:data,closing:data.general,closingSource:'llm'};},saveClosing:options.full?full:async()=>{}},ORACLE:{longClosing:()=> 'local fallback',generate:options.generate||(async(r,s,o)=>{await o.onTicket('signed');return result;})},updateStorageNotice:()=>{},refreshOpenReadingDetail:()=>{context.refreshed=true;}};
 vm.createContext(context);vm.runInContext(functions,context);return {context,shown,saved,node,interpretation,state,story};
}
test('successful interpretation remains visible with ticket and card contexts when local storage fills',async()=>{
 const p=page({full:true});await p.context.fillClosing(reading,spread,p.interpretation,1);
 assert.equal(p.interpretation.holistic.general,result.general);assert.equal(p.interpretation.oracleState.ticket,'signed');assert.equal(p.interpretation.oracleState.status,'ready');
 assert.equal(p.shown.at(-1),result.general);assert.match(p.node.textContent,/kaydedilemedi/);assert.doesNotMatch(p.node.textContent,/hazırlanıyor/);
});
test('provider failure still ends the preparing state when fallback persistence also fails',async()=>{
 const p=page({full:true,generate:async()=>{throw Object.assign(Error('unavailable'),{code:'upstream-unavailable'});}});
 await p.context.fillClosing(reading,spread,p.interpretation,1);assert.equal(p.shown.at(-1),'local fallback');assert.match(p.node.textContent,/temel yorum/);assert.doesNotMatch(p.node.textContent,/hazırlanıyor/);
});
test('late response saves reading A without replacing the rendered text or status of reading B',async()=>{
 let resolve,started;const entered=new Promise(r=>started=r),pending=new Promise(r=>resolve=r);
 const p=page({generate:async()=>{started();return pending;}}),work=p.context.fillClosing(reading,spread,p.interpretation,1);await entered;
 p.state.renderToken=2;p.story.chapters[0].blocks[0].text='reading B';p.node.textContent='B status';resolve(result);await work;
 assert.equal(p.saved[0].id,'A');assert.equal(p.saved[0].result.general,result.general);assert.equal(p.story.chapters[0].blocks[0].text,'reading B');assert.equal(p.node.textContent,'B status');assert.equal(p.context.refreshed,undefined);
});
