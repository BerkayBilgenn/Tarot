'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const cards=require('../cards.js'),spreads=require('../spreads.js');
async function main(){
 const url='http://127.0.0.1:8771/api/closing',headers={'Content-Type':'application/json',Origin:'http://127.0.0.1:8771','X-Forwarded-For':'192.0.2.99'};
 const before=JSON.parse(await fs.readFile(path.join(__dirname,'../.local-data/oracle.json'),'utf8').catch(()=>'{"spentNano":0}'));
 const session=await fetch(url,{method:'POST',headers,body:'{"mode":"session"}'});if(!session.ok)throw Error('session '+session.status);headers.Cookie=session.headers.get('set-cookie').split(';')[0];
 const samples=[
  {spreadId:'daily',title:'Günlük · İmparatoriçe',ids:['major-03']},
  {spreadId:'three',title:'Üç kart · İş değişikliği',question:'Mevcut işimden ayrılıp yeni bir işe geçerken neye dikkat etmeliyim?',ids:['major-09','major-00','major-17']},
  {spreadId:'three',title:'Aynı soru, farklı gelecek kartı',question:'Mevcut işimden ayrılıp yeni bir işe geçerken neye dikkat etmeliyim?',ids:['major-09','major-00','major-16']},
  {spreadId:'celtic',title:'Celtic Cross · Genel yön',question:'Bu dönemde hayatımın yönünü belirlerken neyi gözden kaçırıyorum?',ids:['major-01','major-12','major-07','major-02','major-10','major-19','major-08','major-05','major-18','major-21']}
 ];
 const results=[];
 for(const sample of samples){
  const spread=spreads.getSpread(sample.spreadId),reading={id:'live-'+crypto.randomUUID(),spreadId:spread.id,question:sample.question,cards:spread.positions.map((p,i)=>({positionKey:p.key,cardId:sample.ids[i],reversed:sample.spreadId==='celtic'&&i===1}))};
  const start=Date.now(),res=await fetch(url,{method:'POST',headers,body:JSON.stringify({mode:'generate',reading})}),data=await res.json();
  results.push({title:sample.title,reading,httpStatus:res.status,durationMs:Date.now()-start,...data});console.log(JSON.stringify({title:sample.title,status:res.status,state:data.status,durationMs:Date.now()-start}));
 }
 const repeated=await fetch(url,{method:'POST',headers,body:JSON.stringify({mode:'generate',reading:results[0].reading})});console.log('Saved reading reuse:',repeated.status);
 const after=JSON.parse(await fs.readFile(path.join(__dirname,'../.local-data/oracle.json'),'utf8'));
 const cost=(after.spentNano-before.spentNano)/1e9;
 await fs.writeFile(path.join(__dirname,'../.local-data/samples.json'),JSON.stringify({results,costUsd:cost},null,2),{mode:0o600});
 let md='# Qwen3.8 Flash · Miloruna yerel denemeleri\n\n7 Ekim 2026 · Singapore · Genel yorum ve kart ayrıntıları tek üretim.\n\n';
 for(const r of results){md+='## '+r.title+'\n\n';md+=(r.reading.question?'Soru: '+r.reading.question+'\n\n':'');md+='Kartlar: '+r.reading.cards.map(c=>cards.getCard(c.cardId).nameTr+(c.reversed?' (ters)':'')).join(', ')+'\n\n';
  if(r.result){md+=r.result.general+'\n\n';for(const p of r.result.positions){const label=spreads.getSpread(r.reading.spreadId).positions.find(s=>s.key===p.positionKey).label;md+='### '+label+'\n\n'+p.context+'\n\n';for(const c of p.connections)md+='- '+spreads.getSpread(r.reading.spreadId).positions.find(s=>s.key===c.positionKey).label+': '+c.text+'\n';md+='\n';}}
  else md+='Üretim tamamlanamadı: '+r.status+' / '+r.error+'\n\n';
 }
 md+='Toplam yerel bütçe kaydı: $'+cost.toFixed(6)+'. Gerçek faturadaki ücretsiz kota/önbellek indirimi bu tutarı azaltabilir.\n';await fs.writeFile(path.join(__dirname,'../qwen-deneme-yorumlari.md'),md);console.log('Sample budget charged/reserved: $'+cost.toFixed(6));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
