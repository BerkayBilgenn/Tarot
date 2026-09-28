const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createSelection, selectCard, removeCard, canRead, resetCards, drawHand } = require('../tarot.js');
const { SUITS, NUMBERS, COURTS, MAJOR, MINOR, CARDS, getCard, cardMeta } = require('../cards.js');

test('deck follows the guide: 22 Major + 4 suits × 14 = 78 unique cards', () => {
  assert.equal(CARDS.length, 78);
  assert.equal(MAJOR.length, 22);
  assert.equal(MINOR.length, 56);
  assert.equal(new Set(CARDS.map((card) => card.id)).size, 78);
  for (const suit of Object.keys(SUITS)) {
    const inSuit = MINOR.filter((card) => card.suit === suit);
    assert.equal(inSuit.length, 14, suit);
    assert.deepEqual(inSuit.map((card) => card.rank), Array.from({ length: 14 }, (_, i) => i + 1));
    assert.equal(inSuit.filter((card) => card.court).length, 4);
  }
  assert.deepEqual(MAJOR.map((card) => card.number), Array.from({ length: 22 }, (_, i) => i));
  assert.equal(Object.keys(NUMBERS).length, 10);
  assert.deepEqual(Object.keys(COURTS), ['page', 'knight', 'queen', 'king']);
});

test('every card carries the guide fields and points at an existing RWS image', () => {
  for (const card of CARDS) {
    for (const field of ['id', 'name', 'nameTr', 'upright', 'reversed', 'image']) {
      assert.ok(typeof card[field] === 'string' && card[field].length > 0, card.id + '.' + field);
    }
    assert.ok(Array.isArray(card.keywords) && card.keywords.length > 0, card.id + '.keywords');
    assert.ok(fs.existsSync(path.join(__dirname, '..', card.image)), card.image);
    if (card.arcana === 'major') {
      assert.ok(card.numeral && card.astrology && card.loveWork, card.id);
    } else {
      assert.equal(typeof card.element, 'string');
      if (card.rank <= 10) assert.ok(card.title, card.id + ' Golden Dawn title');
      if (card.rank >= 2 && card.rank <= 10) assert.match(card.astrology, / \/ /, card.id + ' decan');
    }
  }
  assert.equal(getCard('major-16').nameTr, 'Yıkılan Kule');
  assert.equal(getCard('wands-10').name, 'Ten of Wands');
  assert.equal(getCard('wands-10').nameTr, 'Asa Onlusu');
  assert.equal(cardMeta(getCard('major-08')), 'VIII · Aslan');
  assert.equal(cardMeta(getCard('cups-05')), 'Lord of Loss in Pleasure · Mars / Akrep');
  assert.equal(getCard('nope'), null);
});

test('drawHand deals distinct cards from the deck without touching it', () => {
  const hand = drawHand(CARDS, 9);
  assert.equal(hand.length, 9);
  assert.equal(new Set(hand.map((card) => card.id)).size, 9);
  assert.equal(CARDS.length, 78);
  const fixed = drawHand(CARDS, 3, () => 0);
  assert.deepEqual(fixed.map((card) => card.id), [CARDS[1].id, CARDS[2].id, CARDS[3].id]);
  assert.equal(drawHand(CARDS.slice(0, 2), 9).length, 2);
});

test('three different cards unlock the reading; repeated or fourth picks do not', () => {
  let selection = createSelection();
  assert.equal(canRead(selection), false);
  selection = selectCard(selection, 4);
  selection = selectCard(selection, 4);
  assert.deepEqual(selection, [4]);
  selection = selectCard(selection, 7);
  selection = selectCard(selection, 2);
  assert.deepEqual(selection, [4, 7, 2]);
  assert.equal(canRead(selection), true);
  assert.deepEqual(selectCard(selection, 8), [4, 7, 2]);
});

test('removing a card frees its slot and reshuffling clears the spread', () => {
  const full = [4, 7, 2];
  const two = removeCard(full, 1);
  assert.deepEqual(two, [4, 2]);
  assert.deepEqual(selectCard(two, 8), [4, 2, 8]);
  assert.deepEqual(resetCards(full), []);
  assert.equal(canRead(resetCards(full)), false);
});
