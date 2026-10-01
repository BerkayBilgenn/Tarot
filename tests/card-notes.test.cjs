const test = require('node:test');
const assert = require('node:assert/strict');
const { CARDS } = require('../cards.js');
const { NOTES, noteOf } = require('../card-notes.js');

function words(text) { return text.trim().split(/\s+/).length; }

test('every card in the deck has exactly one note, and nothing extra', () => {
  assert.equal(Object.keys(NOTES).length, 78);
  for (const card of CARDS) {
    assert.ok(noteOf(card.id), card.id + ' has a note');
  }
  const ids = new Set(CARDS.map((card) => card.id));
  for (const id of Object.keys(NOTES)) assert.ok(ids.has(id), id + ' is a real card');
});

test('scene describes the card in 16–40 words', () => {
  for (const [id, note] of Object.entries(NOTES)) {
    assert.equal(typeof note.scene, 'string', id);
    const count = words(note.scene);
    assert.ok(count >= 16 && count <= 40, id + ' scene has ' + count + ' words');
  }
});

test('ask and askReversed are short open questions without fate words', () => {
  for (const [id, note] of Object.entries(NOTES)) {
    for (const field of ['ask', 'askReversed']) {
      const text = note[field];
      const label = id + '.' + field;
      assert.equal(typeof text, 'string', label);
      assert.ok(text.endsWith('?'), label + ' ends with ?');
      const count = words(text);
      assert.ok(count >= 5 && count <= 14, label + ' has ' + count + ' words');
      assert.doesNotMatch(text, /olacak\b/, label);
      assert.doesNotMatch(text, /\s(mı|mi|mu|mü)\?$/, label + ' is not a yes/no question');
    }
  }
});

test('noteOf returns null for an unknown id', () => {
  assert.equal(noteOf('nope'), null);
  assert.equal(noteOf('major-22'), null);
  assert.equal(noteOf('pentacles-15'), null);
});
