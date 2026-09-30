const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cards = require('../cards.js');
const spreads = require('../spreads.js');
const R = require('../reading.js');

const SEED = '00112233445566778899aabbccddeeff';
const ids = cards.CARDS.map((card) => card.id);

function service(overrides) {
  let t = new Date('2026-09-29T09:00:00');
  const clock = { set: (d) => { t = new Date(d); } };
  const svc = R.createService({ cards, spreads, now: () => t, storage: R.memoryStorage(), ...overrides });
  return { svc, clock };
}

test('spreads.js matches the spec spreads.json', () => {
  const specPath = path.join(__dirname, '..', 'spec', 'spreads.json');
  if (!fs.existsSync(specPath)) return;
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  assert.deepEqual(JSON.parse(JSON.stringify(spreads.SPREADS)), spec);
});

test('every spread numbers its positions from 1 with unique keys', () => {
  assert.deepEqual(spreads.SPREADS.map((s) => s.id), ['daily', 'three', 'relationship', 'decision', 'career', 'celtic']);
  for (const spread of spreads.SPREADS) {
    assert.equal(spread.positions.length, spread.cardCount, spread.id);
    assert.deepEqual(spread.positions.map((p) => p.index), spread.positions.map((_, i) => i + 1));
    assert.equal(new Set(spread.positions.map((p) => p.key)).size, spread.cardCount);
  }
});

test('the seed reproduces the same permutation and reversals', () => {
  const a = R.deriveDeck(SEED, ids, true);
  const b = R.deriveDeck(SEED, ids, true);
  assert.deepEqual(a, b);
  assert.equal(new Set(a.order).size, 78);
  assert.deepEqual(a.order.slice().sort(), ids.slice().sort());
  assert.notDeepEqual(R.deriveDeck('ffeeddccbbaa99887766554433221100', ids, true).order, a.order);
  assert.ok(a.reversed.some(Boolean) && a.reversed.some((r) => !r));
  assert.ok(R.deriveDeck(SEED, ids, false).reversed.every((r) => r === false));
});

test('random seeds are 128 bit hex', () => {
  const seed = R.randomSeed(globalThis.crypto);
  assert.match(seed, /^[0-9a-f]{32}$/);
  assert.notEqual(seed, R.randomSeed(globalThis.crypto));
});

test('fanIndex decides the card, picks are idempotent and never repeat a card', async () => {
  const { svc } = service();
  const { readingId, cardCount } = await svc.createReading({ spreadId: 'career' });
  assert.equal(cardCount, 5);
  const first = await svc.pick(readingId, 0, 23);
  assert.equal(first.positionKey, 'current');
  assert.deepEqual(await svc.pick(readingId, 0, 23), first);
  await assert.rejects(svc.pick(readingId, 1, 23), /zaten/);
  await assert.rejects(svc.pick(readingId, 3, 5), /sıra/);
  const seen = new Set([first.card.id]);
  for (let i = 1; i < 5; i++) seen.add((await svc.pick(readingId, i, i)).card.id);
  assert.equal(seen.size, 5);
  const reading = await svc.get(readingId);
  assert.equal(reading.status, 'revealing');
  assert.equal(reading.seed, undefined, 'seed never leaves the service');
});

test('decision requires both options and clips inputs to their limits', async () => {
  const { svc } = service();
  await assert.rejects(svc.createReading({ spreadId: 'decision', optionA: 'Kal' }), /zorunlu/);
  const { readingId } = await svc.createReading({ spreadId: 'decision', optionA: 'x'.repeat(60), optionB: 'Git', question: 'q'.repeat(300) });
  const reading = await svc.get(readingId);
  assert.equal(reading.optionA.length, 40);
  assert.equal(reading.question.length, 200);
});

test('daily card is drawn once per local date', async () => {
  const { svc, clock } = service();
  const a = await svc.createReading({ spreadId: 'daily', question: 'ignored' });
  await svc.pick(a.readingId, 0, 10);
  const again = await svc.createReading({ spreadId: 'daily' });
  assert.equal(again.readingId, a.readingId);
  assert.equal(again.existing, true);
  assert.equal((await svc.dailyToday()).localDate, '2026-09-29');
  assert.equal((await svc.get(a.readingId)).question, undefined);
  clock.set('2026-09-30T08:00:00');
  assert.equal(await svc.dailyToday(), null);
  assert.notEqual((await svc.createReading({ spreadId: 'daily' })).readingId, a.readingId);
});

test('an explicit new daily reading draws again instead of reopening today', async () => {
  const { svc } = service();
  const first = await svc.createReading({ spreadId: 'daily' });
  await svc.pick(first.readingId, 0, 4);
  await svc.complete(first.readingId);
  await svc.markViewed(first.readingId);
  const second = await svc.createReading({ spreadId: 'daily', forceNew: true });
  assert.equal(second.existing, false);
  assert.notEqual(second.readingId, first.readingId);
  await svc.pick(second.readingId, 0, 19);
  const replay = await svc.createReading({ spreadId: 'daily' });
  assert.equal(replay.existing, true);
  assert.equal(replay.readingId, second.readingId);
  assert.equal((await svc.dailyToday()).id, second.readingId);
  assert.equal((await svc.dailyToday()).cards[0].fanIndex, 19);
});

test('drafts resume, expire after 7 days and completed readings reach history', async () => {
  const { svc, clock } = service();
  const { readingId } = await svc.createReading({ spreadId: 'three', question: 'Bu dönem bana ne getirecek?' });
  assert.equal(await svc.draft(), null, 'no cards yet, nothing to resume');
  await svc.pick(readingId, 0, 1);
  assert.equal((await svc.draft()).id, readingId);
  clock.set('2026-10-07T09:00:01');
  assert.equal(await svc.draft(), null);
  assert.equal((await svc.get(readingId)).status, 'abandoned');

  const next = await svc.createReading({ spreadId: 'three' });
  for (let i = 0; i < 3; i++) await svc.pick(next.readingId, i, 40 + i);
  await svc.complete(next.readingId);
  await svc.markViewed(next.readingId);
  await svc.patch(next.readingId, { note: 'Not' });
  const list = await svc.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].note, 'Not');
  assert.equal((await svc.list({ spreadId: 'celtic' })).length, 0);
});

test('template interpretation follows the writing rules', async () => {
  const { svc } = service();
  for (const spread of spreads.SPREADS) {
    const input = { spreadId: spread.id, question: 'Neye dikkat etmeliyim?', optionA: 'İstanbul\'da kal', optionB: 'Berlin\'e taşın', personName: 'Deniz' };
    const { readingId } = await svc.createReading(input);
    for (let i = 0; i < spread.cardCount; i++) await svc.pick(readingId, i, i * 7);
    const result = await svc.complete(readingId);
    assert.equal(result.source, 'template');
    assert.equal(result.positions.length, spread.cardCount);
    const sentences = result.summary.split(/(?<=\.)\s/).length;
    assert.ok(sentences >= 2 && sentences <= 3, `${spread.id} summary has ${sentences} sentences`);
    for (const p of result.positions) {
      const words = p.text.split(/\s+/).length;
      assert.ok(words >= 60 && words <= 140, `${spread.id}.${p.positionKey}: ${words} words`);
      assert.doesNotMatch(p.text, /olacak\b/);
    }
    if (spread.id === 'celtic') assert.equal(result.pairs.length, 5);
    if (spread.id === 'decision') assert.ok(result.comparison.a.startsWith('İstanbul') && result.comparison.b.startsWith('Berlin'));
    assert.equal(result.engineVersion, 'cme-0.1');
    assert.equal(result.plan.spreadId, spread.id);
    assert.equal(result.plan.positions.length, spread.cardCount);
    assert.deepEqual(await svc.complete(readingId), result, 'generated once and cached');
  }
});

test('contextual plan changes how the same cards are read', () => {
  const reading = {
    spreadId: 'three',
    reversalsEnabled: false,
    cards: [
      { positionKey: 'past', cardId: 'swords-06', reversed: false },
      { positionKey: 'present', cardId: 'major-16', reversed: false },
      { positionKey: 'future', cardId: 'major-17', reversed: false },
    ],
  };
  const result = R.interpret(reading, spreads.getSpread('three'), cards);
  const present = result.plan.positions.find((position) => position.key === 'present');
  assert.equal(present.volume.band, 'loud');
  assert.equal(result.plan.global.valence.arc, 'V');
  assert.equal(result.plan.global.headline[0], 'majorWeight');
  assert.match(result.positions.find((position) => position.positionKey === 'present').text, /öne çıkıyor/);
  assert.match(result.summary, /Major Arcana ağırlıkta/);

  const flipped = R.interpret({
    ...reading,
    cards: [
      { positionKey: 'past', cardId: 'major-16', reversed: false },
      { positionKey: 'present', cardId: 'swords-06', reversed: false },
      { positionKey: 'future', cardId: 'major-17', reversed: false },
    ],
  }, spreads.getSpread('three'), cards);
  assert.equal(flipped.plan.positions.find((position) => position.key === 'present').volume.band, 'very_loud');
  assert.notEqual(flipped.positions[1].text, result.positions[1].text);
  assert.notEqual(flipped.summary, result.summary);
  assert.match(result.summary, /Geçmiş: Kılıç Altılısı/);
  assert.match(flipped.summary, /Geçmiş: Yıkılan Kule/);
});

test('the same card says a different thing in a different seat', () => {
  const spread = spreads.getSpread('three');
  const seat = (key, cardId) => ({ positionKey: key, cardId, reversed: false });
  const asPast = R.interpret({
    reversalsEnabled: false,
    cards: [seat('past', 'cups-03'), seat('present', 'wands-01'), seat('future', 'swords-01')],
  }, spread, cards);
  const asFuture = R.interpret({
    reversalsEnabled: false,
    cards: [seat('past', 'wands-01'), seat('present', 'swords-01'), seat('future', 'cups-03')],
  }, spread, cards);
  const pastText = asPast.positions.find((position) => position.positionKey === 'past').text;
  const futureText = asFuture.positions.find((position) => position.positionKey === 'future').text;
  assert.match(pastText, /geçmişin yerinde/);
  assert.match(futureText, /geleceğin yerinde/);
  assert.doesNotMatch(pastText, /geleceğin yerinde/);
  assert.doesNotMatch(futureText, /geçmişin yerinde/);
});

test('signals count majors, reversals, elements and repeated ranks', () => {
  const sig = R.signals([
    { cardId: 'cups-03', reversed: true }, { cardId: 'swords-03', reversed: true }, { cardId: 'cups-05', reversed: false },
  ], cards);
  assert.equal(sig.majorRatio, 0);
  assert.equal(sig.reversedRatio, 2 / 3);
  assert.equal(sig.dominant, 'Su');
  assert.deepEqual(sig.repeated, [{ rank: 3, count: 2 }]);
  assert.equal(R.elementOf(cards.getCard('major-18')), 'Su');
  assert.equal(R.elementOf(cards.getCard('major-20')), 'Ateş');
  for (const card of cards.MAJOR) assert.ok(R.elementOf(card), card.id);
});

function threeReading(question) {
  return {
    reversalsEnabled: false,
    question,
    cards: [
      { positionKey: 'past', cardId: 'swords-06', reversed: false },
      { positionKey: 'present', cardId: 'major-16', reversed: false },
      { positionKey: 'future', cardId: 'major-17', reversed: false },
    ],
  };
}

test('a question is classified by speech act, not by inventing the noun', () => {
  const apple = R.readQuestion('Yeşil elmayı almam hayırlı mı?');
  assert.equal(apple.closed, true);
  assert.equal(apple.particular, true);
  assert.match(apple.text, /Yeşil elmayı almam hayırlı mı/);

  const job = R.readQuestion('işten ayrılmalı mıyım');
  assert.equal(job.closed, true);
  assert.equal(job.particular, false);

  const move = R.readQuestion("İstanbul'a taşınmalı mıyım?");
  assert.equal(move.closed, true);
  assert.equal(move.particular, false, 'a named place inside a life-domain question is not an unknown object');

  const open = R.readQuestion('Neye dikkat etmeliyim?');
  assert.equal(open.closed, false);
  assert.equal(open.particular, false);

  assert.equal(R.readQuestion('   ').text, '');
});

test('the same cards answer the question that was asked', () => {
  const spread = spreads.getSpread('three');
  const apple = R.interpret(threeReading('Yeşil elmayı almam hayırlı mı?'), spread, cards);
  const job = R.interpret(threeReading('işten ayrılmalı mıyım'), spread, cards);
  const open = R.interpret(threeReading('Neye dikkat etmeliyim?'), spread, cards);
  const bare = R.interpret(threeReading(''), spread, cards);
  const sentences = (summary) => summary.split(/(?<=\.)\s/).length;

  assert.match(apple.summary, /Yeşil elmayı almam hayırlı mı/);
  assert.match(apple.summary, /tek tek bilmez/);
  assert.match(apple.summary, /hüküm vermez/);
  assert.doesNotMatch(apple.summary, /hayırlıdır|hayırsızdır|bereket/);
  assert.match(job.summary, /işten ayrılmalı mıyım/);
  assert.match(job.summary, /evet ya da hayır/);
  assert.doesNotMatch(job.summary, /bilmez/);
  assert.match(open.summary, /Neye dikkat etmeliyim/);
  assert.doesNotMatch(open.summary, /bilmez|evet ya da hayır/);
  assert.doesNotMatch(bare.summary, /bilmez|“/);

  for (const result of [apple, job, open, bare]) {
    assert.ok(sentences(result.summary) >= 2 && sentences(result.summary) <= 3);
    for (const position of result.positions) assert.doesNotMatch(position.text, /olacak\b/);
  }

  const text = (result, key) => result.positions.find((position) => position.positionKey === key).text;
  assert.match(text(apple, 'past'), /seçimin nasıl kurulduğunu/);
  assert.match(text(apple, 'future'), /hüküm vermez/);
  assert.doesNotMatch(text(apple, 'present'), /bilmez|hüküm vermez|seçimin nasıl/);
  assert.equal(text(apple, 'present'), text(job, 'present'));
  assert.notEqual(apple.summary, job.summary);
  assert.notEqual(text(apple, 'past'), text(job, 'past'));
  assert.match(text(open, 'past'), /sorduğun/);
  assert.match(text(job, 'future'), /Kapanış bir hüküm değil/);

  const daily = R.interpret({
    question: 'Yeşil elmayı almam hayırlı mı?',
    cards: [{ positionKey: 'today', cardId: 'cups-01', reversed: false }],
  }, spreads.getSpread('daily'), cards);
  assert.doesNotMatch(daily.summary, /bilmez|Yeşil elma/);
});

test('crisis and repeated-question detection', async () => {
  assert.equal(R.isCrisis('Artık yaşamak istemiyorum'), true);
  assert.equal(R.isCrisis('Yeni iş teklifi hakkında neyi bilmeliyim?'), false);
  assert.equal(R.similarQuestions('Bu ilişki nereye gidiyor?', 'bu ilişki nereye gidiyor'), true);
  assert.equal(R.similarQuestions('Bu ilişki nereye gidiyor?', 'Yeni iş teklifini kabul etmeli miyim?'), false);
  const { svc, clock } = service();
  await svc.createReading({ spreadId: 'relationship', question: 'Bu ilişki nereye gidiyor?' });
  assert.equal(svc.recentSimilar('relationship', 'Bu ilişki nereye gidiyor'), true);
  assert.equal(svc.recentSimilar('career', 'Bu ilişki nereye gidiyor'), false);
  clock.set('2026-09-30T09:00:01');
  assert.equal(svc.recentSimilar('relationship', 'Bu ilişki nereye gidiyor'), false);
});

function fakeSlot(badge, num) {
  const nodes = {
    '.lay-index': { textContent: String(badge) },
    '.lay-num': { textContent: String(num) },
  };
  return { querySelector: (selector) => nodes[selector], nodes };
}

const PAGE_SPREADS = ['three', 'relationship', 'decision', 'career', 'celtic'];

test('badges are 1..N, unique, and the same numbers as the legend', () => {
  for (const id of PAGE_SPREADS) {
    const spread = spreads.getSpread(id);
    const slots = spread.positions.map(() => fakeSlot('stale', 'stale'));
    spread.positions.forEach((position, i) => spreads.stampSlotBadge(slots[i], position));
    const badges = slots.map((slot) => slot.nodes['.lay-index'].textContent);
    const legend = slots.map((slot) => slot.nodes['.lay-num'].textContent);
    assert.deepEqual(badges, legend);
    assert.deepEqual(badges, spread.positions.map((position) => String(position.index)));
    assert.deepEqual(badges, Array.from({ length: spread.cardCount }, (_, i) => String(i + 1)));
    assert.equal(new Set(badges).size, spread.cardCount);
  }
});

test('a reused three-card slot takes the Celtic Cross index, not the old row count', () => {
  const three = spreads.getSpread('three');
  const celtic = spreads.getSpread('celtic');
  const slots = new Map(three.positions.map((position) => [position.key, fakeSlot(position.index, position.index)]));
  for (const position of celtic.positions) {
    if (!slots.has(position.key)) slots.set(position.key, fakeSlot('', ''));
    spreads.stampSlotBadge(slots.get(position.key), position);
  }
  const badge = (key) => slots.get(key).nodes['.lay-index'].textContent;
  assert.deepEqual(
    ['present', 'challenge', 'crown', 'root', 'past', 'future', 'self', 'environment', 'hopes_fears', 'outcome'].map(badge),
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
  );
});

test('layout refresh writes the badge from position.index', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const fn = src.slice(src.indexOf('function updateSlotLabel'), src.indexOf('function setSlotCard'));
  assert.match(fn, /stampSlotBadge\(slot, position\)/);
  assert.doesNotMatch(fn, /slotIndex|\[\s*,\s*i\s*\]/);
});

test('ten celtic picks bind to position keys in index order', async () => {
  const celtic = spreads.getSpread('celtic');
  const { svc } = service();
  const { readingId } = await svc.createReading({ spreadId: 'celtic' });
  const keys = [];
  for (let i = 0; i < celtic.cardCount; i++) keys.push((await svc.pick(readingId, i, i)).positionKey);
  assert.deepEqual(keys, celtic.positions.map((position) => position.key));
  assert.deepEqual(keys, ['present', 'challenge', 'crown', 'root', 'past', 'future', 'self', 'environment', 'hopes_fears', 'outcome']);
  const reading = await svc.get(readingId);
  assert.deepEqual(reading.cards.map((card) => card.positionKey), keys);
});

test('career is one row and its graph is a chain', () => {
  const career = spreads.getSpread('career');
  assert.deepEqual(career.positions.map((position) => [position.slot.x, position.slot.y]), [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);
  const engine = require('../yorum-motoru.js');
  const layout = engine.layoutById('career');
  assert.deepEqual(layout.order, ['current', 'obstacle', 'strength', 'advice', 'outcome']);
  assert.deepEqual(layout.arcs, [['current', 'obstacle', 'strength', 'advice', 'outcome']]);
  assert.deepEqual(layout.dignity, [
    { principal: 'current', flankers: ['obstacle'] },
    { principal: 'obstacle', flankers: ['current', 'strength'] },
    { principal: 'strength', flankers: ['obstacle', 'advice'] },
    { principal: 'advice', flankers: ['strength', 'outcome'] },
    { principal: 'outcome', flankers: ['advice'] },
  ]);
  assert.deepEqual(layout.links, [
    ['current', 'obstacle', 'chain'],
    ['obstacle', 'strength', 'chain'],
    ['strength', 'advice', 'chain'],
    ['advice', 'outcome', 'chain'],
  ]);
  assert.deepEqual(layout.axes, []);
  assert.deepEqual(layout.mirrors, [['current', 'outcome'], ['obstacle', 'advice']]);
  assert.deepEqual(layout.echoes, []);
});

test('outcome questions are not written as fate', () => {
  const banned = [
    'İlişki en iyi ihtimalle nereye gidebilir?',
    'Bu yol nereye gider?',
    'A seçeneği nereye varır?',
    'B seçeneği nereye varır?',
    'İki yolun da nereye vardığını yan yana gör.',
  ];
  const files = ['spreads.js', 'spec/spreads.json', 'spec/Tarot-Okuma-Akisi-Spec.md', 'reading.js', 'app.js', 'yorum-motoru.js'];
  const blob = files.map((file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')).join('\n');
  for (const phrase of banned) assert.equal(blob.includes(phrase), false, phrase);
});

test('retry stops on validation errors but retries transient ones', async () => {
  let calls = 0;
  await assert.rejects(R.withRetry(() => { calls++; return Promise.reject(new Error('Bu kart zaten seçildi')); }), /zaten/);
  assert.equal(calls, 1);
  calls = 0;
  assert.equal(await R.withRetry(() => (++calls < 3 ? Promise.reject(new Error('ağ')) : Promise.resolve('ok'))), 'ok');
});
