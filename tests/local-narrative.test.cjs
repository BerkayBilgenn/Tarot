const test = require('node:test');
const assert = require('node:assert/strict');
const cards = require('../cards.js');
const spreads = require('../spreads.js');
const oracle = require('../oracle.js');
const reader = require('../reading.js');

function draw(spreadId, ids, reversed = []) {
  const spread = spreads.getSpread(spreadId);
  return { id: 'narrative', spreadId, cards: spread.positions.map((p, i) => ({ positionKey: p.key, cardId: ids[i], reversed: !!reversed[i] })) };
}
const firstSentence = text => text.match(/^[^.!?]+[.!?]/u)?.[0] || text;
const lastParagraph = text => text.split('\n\n').at(-1);

test('first-time daily readings have more than ten narratives for the same card', () => {
  const reading = draw('daily', ['major-03']);
  const texts = Array.from({ length: 100 }, (_, i) => oracle.longClosing({ ...reading, id: `new-reader-${i}` }, spreads.getSpread('daily'), cards));
  assert.ok(new Set(texts).size >= 80, `${new Set(texts).size}/100 distinct`);
  assert.equal(oracle.longClosing(reading, spreads.getSpread('daily'), cards), oracle.longClosing(reading, spreads.getSpread('daily'), cards));
});

test('every daily narrative keeps the actual upright or reversed meaning', () => {
  for (const card of cards.CARDS) for (const reversed of [false, true]) {
    const reading = draw('daily', [card.id], [reversed]);
    const text = oracle.longClosing(reading, spreads.getSpread('daily'), cards);
    assert.ok(text.includes(reversed ? card.reversed : card.upright), `${card.id}/${reversed} loses its meaning`);
    assert.doesNotMatch(text, /undefined|\[object Object\]|ya da ya da/);
  }
});

test('sequential different draws vary their openings and closings', () => {
  const spread = spreads.getSpread('three');
  const history = [], openings = [], endings = [], lastSentences = [];
  for (let i = 0; i < 100; i++) {
    const reading = draw('three', [0, 1, 2].map(j => cards.CARDS[(i * 7 + j * 11) % 78].id), [i % 2 === 0, false, i % 3 === 0]);
    reading.id = `sequence-${i}`;
    const closing = oracle.longClosing(reading, spread, cards, history);
    openings.push(firstSentence(closing)); endings.push(lastParagraph(closing));
    lastSentences.push(closing.split(/(?<=[.!?])\s+/u).at(-1));
    history.unshift({ ...reading, interpretation: { closing } });
  }
  assert.ok(new Set(openings).size >= 80, 'the same opening must not dominate');
  assert.ok(new Set(endings).size >= 80, 'the same closing must not dominate');
  assert.ok(new Set(lastSentences).size >= 80, 'the last sentence is grounded in this draw too');
});

test('relationship synthesis explains the bond and its actual obstacle', () => {
  const reading = draw('relationship', ['major-08', 'cups-14', 'cups-02', 'swords-02', 'major-19']);
  const text = oracle.longClosing(reading, spreads.getSpread('relationship'), cards);
  const connection = text.split('\n\n').find(p => p.includes('Kupa İkilisi') && p.includes('Kılıç İkilisi'));
  assert.ok(connection, 'the important pair is read together');
  assert.match(connection, /yakınlık|bağ|karşılıklılık/);
  assert.match(connection, /konuşul|ertelen|belirsiz/);
  assert.doesNotMatch(text, /hangi bağ.*olup olmadığına bak/);
});

test('a supportive card in the obstacle seat is read as a possible excess, not a bad card', () => {
  const reading = draw('relationship', ['major-08', 'cups-14', 'cups-02', 'major-19', 'major-17']);
  const text = oracle.longClosing(reading, spreads.getSpread('relationship'), cards);
  const connection = text.split('\n\n').find(p => p.includes('Kupa İkilisi') && p.includes('Güneş'));
  assert.match(connection, /olumlu beklentinin|olumlu yönü.*engel/);
  assert.doesNotMatch(connection, /Güneş.*kötü bir kart/);
});

test('decision compares the two paths without treating path B as the result of path A', () => {
  const reading = draw('decision', ['major-06', 'major-08', 'cups-03', 'pentacles-08', 'major-19']);
  const text = oracle.longClosing(reading, spreads.getSpread('decision'), cards);
  const comparison = text.split('\n\n').find(p => p.includes('Güç') && p.includes('Tılsım Sekizlisi'));
  assert.ok(comparison);
  assert.match(comparison, /İki yolun süreç|iki seçeneğin süreç/);
  assert.doesNotMatch(comparison, /Bu yolun süreci ile olası karşılığı/);
});

test('card detail translates the same card into love and work context', () => {
  const love = draw('relationship', ['pentacles-08', 'cups-14', 'cups-02', 'swords-02', 'major-19']);
  const work = draw('career', ['pentacles-08', 'cups-14', 'cups-02', 'swords-02', 'major-19']);
  const loveText = reader.interpret(love, spreads.getSpread('relationship'), cards).positions[0].text;
  const workText = reader.interpret(work, spreads.getSpread('career'), cards).positions[0].text;
  assert.match(loveText, /küçük özen|günlük özen/);
  assert.match(workText, /çalışmanın niteliği|ustalaşma|becerini/);
  assert.notEqual(loveText, workText);
});

test('repeat avoidance keeps the whole spread instead of dropping card meanings', () => {
  const ids = ['major-08', 'cups-14', 'cups-02', 'swords-02', 'major-19'];
  const reading = draw('relationship', ids);
  const spread = spreads.getSpread('relationship');
  const closing = oracle.longClosing(reading, spread, cards);
  const history = [{ ...reading, id: 'earlier', interpretation: { closing } }];
  const repeated = oracle.longClosing({ ...reading, id: 'again' }, spread, cards, history);
  for (const id of ids) assert.ok(repeated.includes(cards.getCard(id).nameTr), `${id} disappears on repeat`);
  assert.notEqual(repeated, closing);
});

test('a completed saved local reading is unchanged when its text version is old', async () => {
  const storage = reader.memoryStorage();
  const service = reader.createService({ cards, spreads, storage, now: () => new Date('2026-10-07T10:00:00Z') });
  const { readingId } = await service.createReading({ spreadId: 'daily' });
  await service.pick(readingId, 0, 0);
  await service.complete(readingId);
  await service.saveClosing(readingId, 'Daha önce kaydedilmiş kişisel günlük yorum.', 'template');
  await service.markViewed(readingId);
  const key = 'kd.readings.v1';
  const list = JSON.parse(storage.getItem(key));
  list.find(r => r.id === readingId).interpretation.textVersion = 1;
  storage.setItem(key, JSON.stringify(list));
  const again = await service.complete(readingId);
  assert.equal(again.closing, 'Daha önce kaydedilmiş kişisel günlük yorum.');
});

test('malformed cached text in a valid previous reading cannot prevent a new local comment', async () => {
  for (const damaged of [
    { closing: { damaged: true } },
    { closing: 42 },
    { closing: ['broken'] },
    { holistic: { general: { damaged: true } }, closing: 'Geçerli eski yorum.' },
  ]) {
    const storage = reader.memoryStorage();
    const service = reader.createService({ cards, spreads, storage });
    const { readingId: earlier } = await service.createReading({ spreadId: 'daily' });
    await service.pick(earlier, 0, 0);
    await service.complete(earlier);
    await service.markViewed(earlier);
    const list = JSON.parse(storage.getItem('kd.readings.v1'));
    Object.assign(list.find(r => r.id === earlier).interpretation, damaged);
    storage.setItem('kd.readings.v1', JSON.stringify(list));
    const { readingId: current } = await service.createReading({ spreadId: 'daily', forceNew: true });
    await service.pick(current, 0, 1);
    await service.complete(current);
    const reading = await service.get(current);
    const history = await service.previousReadings(current);
    assert.ok(history.some(r => r.id === earlier), 'the otherwise valid previous reading remains');
    const text = oracle.longClosing(reading, spreads.getSpread('daily'), cards, history);
    assert.equal(typeof text, 'string');
    assert.ok(text.includes(cards.getCard(reading.cards[0].cardId).nameTr));
    assert.doesNotMatch(text, /\[object Object\]|undefined/);
  }
});
