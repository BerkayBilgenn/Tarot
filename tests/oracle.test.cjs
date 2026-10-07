const test = require('node:test');
const assert = require('node:assert/strict');
const cards = require('../cards.js');
const spreads = require('../spreads.js');
const oracle = require('../oracle.js');

test('the closing brief carries the question, the seats and the bans', () => {
  const spread = spreads.getSpread('decision');
  const reading = {
    question: 'Hangisi bana daha çok benziyor?',
    optionA: 'Kalmak',
    optionB: 'Gitmek',
    cards: spread.positions.map((position, i) => ({
      positionKey: position.key,
      cardId: i === 0 ? 'major-13' : 'cups-01',
      reversed: i === 1,
    })),
  };
  const text = oracle.brief(reading, spread, cards);
  assert.match(text, /Hangisi bana daha çok benziyor/);
  assert.match(text, /Death/);
  assert.match(text, /Ölüm/);
  assert.match(text, /Kalmak/);
  assert.match(text, /Gitmek/);
  assert.match(text, /seçmesi gerektiğini söyleme/);
  assert.match(oracle.SYSTEM, /fiziksel ölüm değildir/);
  assert.match(oracle.SYSTEM, /hangi yolu seçmesi/);
  const essay = oracle.longClosing(reading, spread, cards);
  const essayWords = essay.trim().split(/\s+/).length;
  assert.ok(essayWords >= 180, `closing is ${essayWords} words`);
  assert.match(essay, /Hangisi bana daha çok benziyor/);
  assert.match(essay, /hangisini seçmen gerektiğini söylemez/);
  assert.equal(oracle.MODEL, 'deepseek-ai/deepseek-v4.1-flash');
});

test('the template closing tells the spread as a story and ends with the cards\' questions', () => {
  const notes = require('../card-notes.js');
  const spread = spreads.getSpread('celtic');
  const reading = {
    question: 'Hayatımda şu an en çok neye odaklanmalıyım?',
    cards: spread.positions.map((position, i) => ({ positionKey: position.key, cardId: cards.CARDS[(i * 11 + 4) % 78].id, reversed: i % 4 === 3 })),
  };
  const essay = oracle.longClosing(reading, spread, cards);
  for (const beat of ['Haçın kalbinde', 'Kökte', 'Sağdaki sütun', 'Gidişatın vardığı yerde', 'kendine şunu sorabilirsin']) assert.match(essay, new RegExp(beat));
  const present = reading.cards.find((c) => c.positionKey === 'present');
  assert.ok(essay.includes(notes.noteOf(present.cardId).ask), 'the heart card asks its own question');
  assert.doesNotMatch(essay, /olacak\b|undefined/);
  assert.ok(essay.split('\n\n').length >= 6);
});

test('a repeated daily card gets a different closing grounded in the repeat', () => {
  const spread = spreads.getSpread('daily');
  const first = { id: 'first', spreadId: 'daily', cards: [{ positionKey: 'today', cardId: 'major-03', reversed: false }] };
  const again = { ...first, id: 'again' };
  const original = oracle.longClosing(first, spread, cards);
  const repeated = oracle.longClosing(again, spread, cards, [first]);
  assert.notEqual(repeated, original);
  assert.match(repeated, /yeniden|tekrar|ikinci/i);
  assert.match(repeated, /İmparatoriçe/);
});

test('ten first-time readers with the same daily card receive different local closings', () => {
  const spread = spreads.getSpread('daily');
  const draw = [{ positionKey: 'today', cardId: 'major-03', reversed: false }];
  const closings = [];
  for (let i = 0; i < 10; i++) {
    const current = oracle.longClosing({ id: `r-${i}`, spreadId: 'daily', cards: draw }, spread, cards);
    for (const prior of closings) assert.ok(phraseOverlap(current, prior) < 0.65, `first reading ${i + 1} repeats a closing`);
    closings.push(current);
  }
});

test('reversed daily meanings do not say ya da twice', () => {
  const spread = spreads.getSpread('daily');
  const reading = { id: 'reversed', spreadId: 'daily', cards: [{ positionKey: 'today', cardId: 'swords-03', reversed: true }] };
  const text = oracle.longClosing(reading, spread, cards);
  assert.doesNotMatch(text, /ya da ya da/i);
  assert.match(text, /bastırılmış acı/i);
});

test('a repeated three-card draw gets a different local closing', () => {
  const spread = spreads.getSpread('three');
  const first = {
    id: 'first', spreadId: 'three', question: 'Neye dikkat etmeliyim?',
    cards: spread.positions.map((position, i) => ({ positionKey: position.key, cardId: cards.CARDS[i + 3].id, reversed: false })),
  };
  const again = { ...first, id: 'again' };
  const original = oracle.longClosing(first, spread, cards);
  const repeated = oracle.longClosing(again, spread, cards, [first]);
  assert.notEqual(repeated, original);
  assert.match(repeated, /yeniden|tekrar/i);
});

function phraseOverlap(a, b) {
  const grams = (text) => {
    const words = text.toLocaleLowerCase('tr').match(/[\p{L}\p{N}]+/gu) || [];
    return new Set(words.slice(0, -3).map((_, i) => words.slice(i, i + 4).join(' ')));
  };
  const left = grams(a);
  const right = grams(b);
  return [...left].filter((part) => right.has(part)).length / Math.min(left.size, right.size);
}

test('ten repeats of one daily card do not recycle most of a prior closing', () => {
  const spread = spreads.getSpread('daily');
  const draw = [{ positionKey: 'today', cardId: 'major-03', reversed: false }];
  const closings = [];
  for (let i = 0; i < 10; i++) {
    const reading = { id: `reading-${i}`, spreadId: 'daily', cards: draw };
    const history = closings.map((closing, j) => ({ id: `reading-${j}`, spreadId: 'daily', cards: draw, interpretation: { closing } })).reverse();
    const current = oracle.longClosing(reading, spread, cards, history);
    for (const prior of closings) assert.ok(phraseOverlap(current, prior) < 0.65, `repeat ${i + 1} reused most of a prior closing`);
    closings.push(current);
  }
});

test('repeat multi-card closings shift their emphasis instead of copying the story', () => {
  const spread = spreads.getSpread('three');
  const draw = spread.positions.map((position, i) => ({ positionKey: position.key, cardId: cards.CARDS[i + 3].id, reversed: false }));
  const closings = [];
  for (let i = 0; i < 10; i++) {
    const reading = { id: `reading-${i}`, spreadId: 'three', cards: draw, question: 'Neye dikkat etmeliyim?' };
    const history = closings.map((closing, j) => ({ id: `reading-${j}`, spreadId: 'three', cards: draw, interpretation: { closing } })).reverse();
    const current = oracle.longClosing(reading, spread, cards, history);
    for (const prior of closings) assert.ok(phraseOverlap(current, prior) < 0.65, `repeat ${i + 1} copied an earlier story`);
    closings.push(current);
  }
});

test('the local fallback checks its alternative against saved closings too', () => {
  const spread = spreads.getSpread('daily');
  const reading = { id: 'repeat', spreadId: 'daily', cards: [{ positionKey: 'today', cardId: 'major-03', reversed: false }] };
  const unrelated = { spreadId: 'daily', cards: [{ positionKey: 'today', cardId: 'major-04', reversed: false }] };
  const draft = oracle.longClosing(reading, spread, cards);
  const alternative = oracle.longClosing(reading, spread, cards, [{ ...unrelated, id: 'prior', interpretation: { closing: draft } }]);
  const history = [
    { ...unrelated, id: 'alternative', interpretation: { closing: alternative } },
    { ...unrelated, id: 'prior', interpretation: { closing: draft } },
  ];
  const fresh = oracle.longClosing(reading, spread, cards, history);
  assert.notEqual(fresh, draft);
  assert.notEqual(fresh, alternative);
  assert.ok(phraseOverlap(fresh, draft) < 0.65);
  assert.ok(phraseOverlap(fresh, alternative) < 0.65);
});

test('ten different draws per spread do not reuse most of a prior closing', () => {
  for (const spreadId of ['three', 'relationship', 'decision', 'career', 'celtic']) {
    const spread = spreads.getSpread(spreadId);
    const closings = [];
    for (let i = 0; i < 10; i++) {
      const reading = {
        id: `r-${i}`, spreadId, question: 'Neye dikkat etmeliyim?', optionA: 'Kalmak', optionB: 'Gitmek',
        cards: spread.positions.map((position, j) => ({ positionKey: position.key, cardId: cards.CARDS[(i * 7 + j * 11) % 78].id, reversed: false })),
      };
      const current = oracle.longClosing(reading, spread, cards);
      for (const prior of closings) assert.ok(phraseOverlap(current, prior) < 0.55, `${spreadId} draw ${i + 1} reused generic wording`);
      closings.push(current);
    }
  }
});

test('different daily cards avoid recent closings with similar stock wording', () => {
  const spread = spreads.getSpread('daily');
  const history = [];
  for (let i = 0; i < 10; i++) {
    const reading = { id: `r-${i}`, spreadId: 'daily', cards: [{ positionKey: 'today', cardId: cards.CARDS[(i * 7) % 78].id, reversed: false }] };
    const closing = oracle.longClosing(reading, spread, cards, history);
    for (const prior of history) assert.ok(phraseOverlap(closing, prior.interpretation.closing) < 0.65, `daily draw ${i + 1} sounded like a prior card`);
    history.unshift({ ...reading, interpretation: { closing } });
  }
});

test('a local multi-card closing changes when its first draft resembles recent text', () => {
  const spread = spreads.getSpread('three');
  const reading = { id: 'new', spreadId: 'three', cards: spread.positions.map((position, i) => ({ positionKey: position.key, cardId: cards.CARDS[i + 3].id, reversed: false })) };
  const firstDraft = oracle.longClosing(reading, spread, cards);
  const prior = { id: 'old', spreadId: 'three', cards: spread.positions.map((position, i) => ({ positionKey: position.key, cardId: cards.CARDS[i + 10].id, reversed: false })), interpretation: { closing: firstDraft } };
  const changed = oracle.longClosing(reading, spread, cards, [prior]);
  assert.ok(phraseOverlap(changed, firstDraft) < 0.65);
  assert.match(changed, /İmparatoriçe/);
});

test('a repeated model closing is retried with a new focus', async () => {
  const spread = spreads.getSpread('three');
  const reading = {
    id: 'new-reading', spreadId: 'three', question: 'Neye dikkat etmeliyim?',
    cards: spread.positions.map((position, i) => ({ positionKey: position.key, cardId: cards.CARDS[i + 3].id, reversed: false })),
  };
  const repeated = 'Kartlar burada sana önce durup bakmanı söylüyor. Geçmişin izi bugünkü seçimine karışıyor. Bu durum kendi hızını bulmanı istiyor. Somut bir adım için önce düşüncelerini yazabilirsin.';
  const nearRepeat = repeated.replace('Somut bir adım', 'Küçük bir adım');
  const fresh = 'İmparatoriçe ile büyütmek istediğin şey görünür oluyor. Aziz bu isteğe alıştığın kuralları getirirken Âşıklar hangi değeri seçeceğini soruyor. Bu üç kart arasında önce kendi önceliğini belirleyebilirsin.';
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body).attempt);
    return new Response(JSON.stringify({ delta: requests.length === 1 ? nearRepeat : fresh }) + '\n');
  };
  try {
    const result = await oracle.closing(reading, spread, cards, { recentClosings: [repeated] });
    assert.equal(result, fresh);
    assert.equal(requests.length, 2);
    assert.notEqual(requests[0], requests[1]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a long model paraphrase with the same content words is retried', async () => {
  const spread = spreads.getSpread('daily');
  const reading = { id: 'paraphrase', spreadId: 'daily', cards: [{ positionKey: 'today', cardId: 'major-03', reversed: false }] };
  const themes = 'sabır büyüme yaratım bakım emek dinlenme ilişki sınır seçim duygu fırsat farkındalık değişim konuşma ihtiyaç beklenti eylem düşünce denge destek güven zaman deneyim adım';
  const previous = Array(9).fill(themes).join(' ');
  const paraphrase = Array(9).fill(themes.split(' ').reverse().join(' ')).join(' ');
  const fresh = Array(9).fill('orman deniz bulut yıldız yol kitap ışık ağaç rüzgâr bahçe çiçek dalga nehir dağ ova kuş sabah akşam sonbahar yaz kış gölge güneş gökyüzü').join(' ');
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ delta: calls === 1 ? paraphrase : fresh }) + '\n'); };
  try {
    const result = await oracle.closing(reading, spread, cards, { recentClosings: [previous] });
    assert.equal(result, fresh);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a model closing that repeats twice is rejected for the local fallback', async () => {
  const spread = spreads.getSpread('daily');
  const reading = { id: 'repeat', spreadId: 'daily', cards: [{ positionKey: 'today', cardId: 'major-03', reversed: false }] };
  const repeated = 'Bu kart bugün yeniden karşına çıktı. Aynı konuya farklı bir yerden bakmayı deneyebilirsin. Önce elindeki bilgiyi yaz, sonra atabileceğin küçük adımı düşün.';
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ delta: repeated }) + '\n'); };
  try {
    await assert.rejects(oracle.closing(reading, spread, cards, { recentClosings: [repeated] }), { code: 'repeated' });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
