'use strict';
// Reproducible audit through the real public local generator; no provider/network.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const cards = require('../cards.js'), spreads = require('../spreads.js'), reader = require('../reading.js'), oracle = require('../oracle.js');
const root = path.resolve(__dirname, '..');
const digest = text => createHash('sha256').update(text).digest('hex');
const words = text => text.trim().split(/\s+/u).length;
const first = text => text.match(/^[^.!?]+[.!?]/u)?.[0] || text;
const last = text => text.split(/(?<=[.!?])\s+/u).at(-1);
function mostCommon(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return Math.max(...counts.values());
}
function loadBaseline() {
  const source = execFileSync('git', ['show', '77601d2:oracle.js'], { cwd: root, encoding: 'utf8' });
  const sandbox = { module: { exports: {} }, require: name => require(path.resolve(root, name)), globalThis: {} };
  vm.runInNewContext(source, sandbox);
  return sandbox.module.exports;
}
function inventory(allInventoryTexts) {
  const spread = spreads.getSpread('daily'), totals = new Set();
  const counts = [];
  for (const card of cards.CARDS) for (const reversed of [false, true]) {
    const texts = new Set(); let trials = 0;
    while (texts.size < 512 && trials < 16000) {
      const reading = { id: `inventory-${trials++}`, spreadId: 'daily', cards: [{ positionKey: 'today', cardId: card.id, reversed }] };
      const text = oracle.longClosing(reading, spread, cards);
      texts.add(text);
      if (!text.includes(reversed ? card.reversed : card.upright)) throw new Error(`Incorrect orientation: ${card.id}/${reversed}`);
    }
    if (texts.size !== 512) throw new Error(`${card.id}/${reversed}: only ${texts.size} reachable texts`);
    for (const text of texts) {
      const hash = digest(text);
      totals.add(hash); allInventoryTexts.add(hash);
    }
    counts.push({ cardId: card.id, reversed, count: texts.size, trials });
  }
  return { total: totals.size, perOrientation: 512, orientations: counts.length, maxTrials: Math.max(...counts.map(c => c.trials)) };
}
function sampleReading(i) {
  const spread = spreads.SPREADS[i % spreads.SPREADS.length];
  const deck = reader.deriveDeck(digest(`draw-${i}`).slice(0,32), cards.CARDS.map(c=>c.id), true);
  return { id: `audit-${i}`, spreadId: spread.id, optionA: 'Mevcut yolda kalmak', optionB: 'Yeni bir yön denemek', cards: spread.positions.map((p,j)=>({ positionKey:p.key, cardId:deck.order[j], reversed:deck.reversed[j] })) };
}
function trace(api) {
  const history = [], texts = [], openings = [], endings = [], lengths = {}, missing = [];
  for (let i=0;i<1000;i++) {
    const reading = sampleReading(i), spread = spreads.getSpread(reading.spreadId);
    const closing = api.longClosing(reading,spread,cards,history);
    texts.push(digest(closing)); openings.push(first(closing)); endings.push(last(closing));
    (lengths[spread.id] ||= []).push(words(closing));
    if (reading.cards.some(c=>!closing.includes(cards.getCard(c.cardId).nameTr))) missing.push(i);
    history.unshift({ ...reading, interpretation: { closing } });
  }
  return {
    readings:1000, distinctWholeTexts:new Set(texts).size,
    mostCommonOpening:mostCommon(openings), mostCommonLastSentence:mostCommon(endings),
    readingsMissingACard:missing.length,
    words:Object.fromEntries(Object.entries(lengths).map(([id,list])=>[id,{ min:Math.min(...list), median:list.sort((a,b)=>a-b)[Math.floor(list.length/2)], max:Math.max(...list) }])),
  };
}
function sameCard(api) {
  return new Set(Array.from({ length:100 },(_,i)=>api.longClosing({ id:`new-reader-${i}`,spreadId:'daily',cards:[{positionKey:'today',cardId:'major-03',reversed:false}] },spreads.getSpread('daily'),cards))).size;
}
function multiInventory(allInventoryTexts) {
  const result = {};
  for (const id of ['three','relationship','career','decision','celtic']) {
    const spread=spreads.getSpread(id),texts=new Set(); let trials=0;
    const drawn=spread.positions.map((p,i)=>({positionKey:p.key,cardId:cards.CARDS[(i*11+4)%78].id,reversed:i%3===0}));
    while (texts.size<2048 && trials<40000) texts.add(oracle.longClosing({id:`multi-inventory-${trials++}`,spreadId:id,cards:drawn},spread,cards));
    if (texts.size!==2048) throw new Error(`${id}: only ${texts.size} reachable texts`);
    for (const text of texts) allInventoryTexts.add(digest(text));
    result[id]={distinct:texts.size,trials};
  }
  return result;
}
function configurations(n) {
  let count=1n; for (let i=0;i<n;i++) count *= BigInt(78-i) * 2n; return count;
}
const baseline=loadBaseline();
const allInventoryTexts=new Set();
const report = {
  method:'Actual daily outputs with no history, all 156 orientations; deterministic mixed 1000 real deck draws with previous history. Counts exclude names/questions and repeat-count additions.',
  daily:inventory(allInventoryTexts), multiStyleSamples:multiInventory(allInventoryTexts), sameDailyCard100:{before:sameCard(baseline),after:sameCard(oracle)},
  mixed1000:{before:trace(baseline),after:trace(oracle)},
  orderedCardConfigurations:Object.fromEntries([1,3,5,10].map(n=>[n,configurations(n).toString()])),
};
report.verifiedDistinctInventoryTexts=allInventoryTexts.size;
report.theoreticalTextCapacityBySpread=Object.fromEntries(spreads.SPREADS.map(s=>[s.id,(configurations(s.cardCount)*BigInt(s.id==='daily'?512:report.multiStyleSamples[s.id].distinct)).toString()]));
report.theoreticalTotal=Object.values(report.theoreticalTextCapacityBySpread).reduce((total,count)=>total+BigInt(count),0n).toString();
const output=process.argv[2];
if (output) fs.writeFileSync(path.resolve(output),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
