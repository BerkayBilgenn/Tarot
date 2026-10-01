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
  assert.equal(oracle.ENDPOINT, 'http://127.0.0.1:18791/closing');
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
