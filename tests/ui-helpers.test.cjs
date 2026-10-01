'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spreadDisplayName, matchesHistoryQuery, fanLayout } = require('../ui-helpers.js');

test('spreadDisplayName parantez içindeki alt adı ortada noktayla ayırır', () => {
  assert.equal(spreadDisplayName('Karar (İki yol)'), 'Karar · İki yol');
  assert.equal(spreadDisplayName('Üç kart'), 'Üç kart');
  assert.equal(spreadDisplayName(''), '');
});

test('matchesHistoryQuery Türkçe büyük/küçük harf kuralıyla soru, açılım ve kart adında arar', () => {
  const reading = { question: 'İşimde yeni bir yön' };
  assert.equal(matchesHistoryQuery(reading, 'Kariyer & para', ['Büyücü'], ''), true);
  assert.equal(matchesHistoryQuery(reading, 'Kariyer & para', ['Büyücü'], '  '), true);
  assert.equal(matchesHistoryQuery(reading, 'Kariyer & para', [], 'İŞİMDE'), true);
  assert.equal(matchesHistoryQuery(reading, 'Kariyer & para', [], 'kariyer'), true);
  assert.equal(matchesHistoryQuery(reading, 'Kariyer & para', ['Büyücü'], 'büyücü'), true);
  assert.equal(matchesHistoryQuery(reading, 'Kariyer & para', ['Büyücü'], 'ilişki'), false);
  assert.equal(matchesHistoryQuery({}, 'Günün kartı', [], 'günün'), true);
});

test('fanLayout yatay kaydırılan yelpazeyi masaüstü ve mobil için ayrı boyutlandırır', () => {
  const wide = fanLayout(1586);
  assert.ok(wide.cardWidth >= 96 && wide.cardWidth <= 140);
  assert.ok(wide.spacing >= 40 && wide.spacing < wide.cardWidth);
  assert.ok(wide.radius >= 700);
  assert.ok(wide.drop > 0 && wide.height >= wide.cardHeight + wide.drop);
  // Görünür yarı genişlik yay yarıçapından küçüktür: uç kartlar dik durmaz.
  assert.ok(1586 / 2 / wide.radius < 0.7);
  const mid = fanLayout(1100);
  assert.ok(mid.cardWidth <= wide.cardWidth);
  const phone = fanLayout(390);
  assert.equal(phone.cardWidth, 72);
  assert.equal(phone.spacing, 44);
  assert.ok(phone.height > phone.cardHeight);
});

const {
  splitSentences, paginateText, pageWindow, fitCount, guideFanPose, snapTarget,
  wordStep, storyOutline, coverPoint
} = require('../ui-helpers.js');

test('splitSentences cümleyi noktalama ve ardından gelen boşlukta böler, sayı içindeki noktada bölmez', () => {
  assert.deepEqual(
    splitSentences('Bir. İki! Üç? “Dört.” Beş… Yol 2.5 kez uzar.'),
    ['Bir.', 'İki!', 'Üç?', '“Dört.”', 'Beş…', 'Yol 2.5 kez uzar.']
  );
  assert.deepEqual(splitSentences('Noktasız son cümle'), ['Noktasız son cümle']);
  assert.deepEqual(splitSentences('  '), []);
});

test('paginateText cümleleri sığdığı kadar aynı sayfada toplar, taşanı yeni sayfaya geçirir', () => {
  const fits = (text) => text.length <= 20;
  assert.deepEqual(paginateText('Aa bb. Cc dd. Ee ff gg hh.', fits), ['Aa bb. Cc dd.', 'Ee ff gg hh.']);
  assert.deepEqual(paginateText('Kısa.', fits), ['Kısa.']);
  assert.deepEqual(paginateText('', fits), []);
});

test('paginateText paragraf aralığını korur ve tek başına sığmayan cümleyi kelimelerden böler', () => {
  const fits = (text) => text.length <= 20;
  assert.deepEqual(paginateText('Bir.\n\nİki.', fits), ['Bir.\n\nİki.']);
  assert.deepEqual(
    paginateText('Bu cümle yirmi karakterden çok uzun.', fits),
    ['Bu cümle yirmi', 'karakterden çok', 'uzun.']
  );
});

test('pageWindow sayfayı sınırlar içinde tutar ve dilimi verir', () => {
  assert.deepEqual(pageWindow(7, 3, 0), { pages: 3, page: 0, start: 0, end: 3 });
  assert.deepEqual(pageWindow(7, 3, 2), { pages: 3, page: 2, start: 6, end: 7 });
  assert.deepEqual(pageWindow(7, 3, 9), { pages: 3, page: 2, start: 6, end: 7 });
  assert.deepEqual(pageWindow(7, 3, -1), { pages: 3, page: 0, start: 0, end: 3 });
  assert.deepEqual(pageWindow(0, 3, 0), { pages: 1, page: 0, start: 0, end: 0 });
  assert.deepEqual(pageWindow(2, 0, 1), { pages: 2, page: 1, start: 1, end: 2 });
});

test('fitCount alana sığan öğe sayısını verir, en az bir öğe gösterir', () => {
  assert.equal(fitCount(500, 150, 0), 3);
  assert.equal(fitCount(469, 150, 10), 2);
  assert.equal(fitCount(490, 150, 20), 3);
  assert.equal(fitCount(100, 150, 0), 1);
  assert.equal(fitCount(0, 0, 0), 1);
});

test('guideFanPose ortadaki kartı öne çıkarır, yanları simetrik ve uzakları sık dizer', () => {
  const opts = { cardWidth: 200, visible: 6 };
  const center = guideFanPose(0, opts);
  assert.equal(center.x, 0);
  assert.equal(center.rotate, 0);
  assert.equal(center.scale, 1);
  assert.equal(center.opacity, 1);
  const right = guideFanPose(2, opts);
  const left = guideFanPose(-2, opts);
  assert.equal(left.x, -right.x);
  assert.equal(left.rotate, -right.rotate);
  assert.equal(left.y, right.y);
  assert.ok(right.rotate > 0 && right.scale < 1 && right.z < center.z);
  // İlk komşu boşluğu, uzaktaki kartlar arasındaki boşluktan geniştir.
  const gap01 = guideFanPose(1, opts).x - center.x;
  const gap45 = guideFanPose(5, opts).x - guideFanPose(4, opts).x;
  assert.ok(gap01 > gap45 && gap45 > 0);
  // Yelpaze uca doğru aşağı iner.
  assert.ok(guideFanPose(4, opts).y > guideFanPose(1, opts).y);
  // Görünür pencerenin dışındaki kart tamamen söner, yarım konumlar ara değer alır.
  assert.equal(guideFanPose(7, opts).opacity, 0);
  const half = guideFanPose(0.5, opts);
  assert.ok(half.x > 0 && half.x < guideFanPose(1, opts).x);
});

test('snapTarget bırakılan desteyi en yakın karta oturtur, hızlı fırlatmayı ileri taşır', () => {
  assert.equal(snapTarget(2.4, 0, 10), 2);
  assert.equal(snapTarget(2.6, 0, 10), 3);
  assert.ok(snapTarget(2.4, 12, 10) > 2);
  assert.ok(snapTarget(2.4, -12, 10) < 2);
  assert.equal(snapTarget(0.2, -40, 10), 0);
  assert.equal(snapTarget(8.9, 40, 10), 9);
  assert.equal(snapTarget(3, 5, 0), 0);
});

test('wordStep kelime aralığını toplam süre sınırına göre kısaltır', () => {
  assert.equal(wordStep(10, { step: 18, max: 1400 }), 18);
  assert.equal(wordStep(200, { step: 18, max: 1400 }), 7);
  assert.equal(wordStep(0, { step: 18, max: 1400 }), 18);
});

test('storyOutline okumayı genel bakış, kartlar, karşılaştırma, çiftler, genel yorum ve not sırasıyla anlatır', () => {
  assert.deepEqual(
    storyOutline({ spreadId: 'three', positionKeys: ['past', 'present', 'future'] }).map((c) => c.id),
    ['summary', 'card:past', 'card:present', 'card:future', 'closing', 'notes']
  );
  assert.deepEqual(
    storyOutline({ spreadId: 'decision', positionKeys: ['now', 'a'], hasComparison: true, hasPairs: true }).map((c) => c.id),
    ['summary', 'card:now', 'card:a', 'comparison', 'pairs', 'closing', 'notes']
  );
  // Günün kartında önce kart, sonra günün teması gelir.
  assert.deepEqual(
    storyOutline({ spreadId: 'daily', positionKeys: ['card'] }).map((c) => c.id),
    ['card:card', 'summary', 'closing', 'notes']
  );
  const card = storyOutline({ spreadId: 'three', positionKeys: ['past'] })[1];
  assert.deepEqual(card, { id: 'card:past', kind: 'card', key: 'past' });
});

test('coverPoint arka plan görselindeki noktayı cover + center top yerleşiminde ekrana çevirir', () => {
  assert.deepEqual(coverPoint(1586, 992, 1586, 992, 35, 285), { x: 35, y: 285, scale: 1 });
  assert.deepEqual(coverPoint(793, 992, 1586, 992, 0, 0), { x: -396.5, y: 0, scale: 1 });
  assert.deepEqual(coverPoint(3172, 992, 1586, 992, 100, 100), { x: 200, y: 200, scale: 2 });
});

test('fanLayout kısa ekranda yelpazeyi küçültür, yeterince uzun ekranda boyutu korur', () => {
  assert.equal(fanLayout(1586, 992).cardWidth, fanLayout(1586).cardWidth);
  assert.ok(fanLayout(1366, 768).cardWidth < fanLayout(1366).cardWidth);
  assert.equal(fanLayout(390, 844).cardWidth, 72);
  const short = fanLayout(320, 568);
  assert.ok(short.cardWidth < 72);
  assert.ok(short.height <= 568 * 0.32);
});

const { paginateBlocks } = require('../ui-helpers.js');

test('paginateBlocks farklı biçimli blokları aynı sayfada birleştirir, sayfa sırasını fits fonksiyonuna verir', () => {
  const chars = (page) => page.reduce((n, part) => n + part.text.length, 0);
  assert.deepEqual(
    paginateBlocks([{ text: 'Aa. Bb.' }, { text: 'Cc.' }], (page) => chars(page) <= 8),
    [[{ block: 0, text: 'Aa. Bb.' }], [{ block: 1, text: 'Cc.' }]]
  );
  // İlk sayfada başlık yer kapladığı için daha az metin sığar.
  assert.deepEqual(
    paginateBlocks([{ text: 'Aa. Bb.' }, { text: 'Cc.' }], (page, index) => chars(page) <= (index === 0 ? 4 : 8)),
    [[{ block: 0, text: 'Aa.' }], [{ block: 0, text: 'Bb.' }, { block: 1, text: 'Cc.' }]]
  );
  assert.deepEqual(paginateBlocks([{ text: '' }, { text: 'Tek.' }], () => true), [[{ block: 1, text: 'Tek.' }]]);
  assert.deepEqual(paginateBlocks([], () => true), []);
});

const { labelSides, sideLabelLayout } = require('../ui-helpers.js');

const RELATIONSHIP = [
  { key: 'self', x: 0, y: 1 }, { key: 'other', x: 2, y: 1 }, { key: 'bond', x: 1, y: 1 },
  { key: 'obstacle', x: 1, y: 2 }, { key: 'potential', x: 1, y: 0 }
];
const DECISION = [
  { key: 'situation', x: 1, y: 0 }, { key: 'a_path', x: 0, y: 1 }, { key: 'a_outcome', x: 0, y: 2 },
  { key: 'b_path', x: 2, y: 1 }, { key: 'b_outcome', x: 2, y: 2 }
];

test('labelSides satırında yalnız kalan ve kenardaki kartın etiketini yana, ortadakini alta koyar', () => {
  assert.deepEqual(labelSides(RELATIONSHIP), { self: 'left', other: 'right', bond: 'below', obstacle: 'right', potential: 'right' });
  assert.deepEqual(labelSides(DECISION), { situation: 'right', a_path: 'left', a_outcome: 'left', b_path: 'right', b_outcome: 'right' });
  // Tek sıralı açılımda her kartın komşusu vardır; ortadakiler alta, uçtakiler yana gider.
  assert.deepEqual(labelSides([{ key: 'a', x: 0, y: 0 }, { key: 'b', x: 1, y: 0 }, { key: 'c', x: 2, y: 0 }]), { a: 'left', b: 'below', c: 'right' });
});

test('sideLabelLayout kartları ve yan etiketleri kutuya sığdırır, kartlar çakışmaz', () => {
  const box = { width: 1000, height: 555, ratio: 1.714, labelH: 82, labelW: 150, labelGap: 14, maxCard: 240 };
  [RELATIONSHIP, DECISION].forEach((slots) => {
    const geo = sideLabelLayout(slots, box);
    assert.ok(geo.cw >= 80, `kart genişliği ${geo.cw}`);
    const rects = geo.slots.map((s) => ({ ...s, right: s.left + geo.cw, bottom: s.top + geo.ch }));
    rects.forEach((r) => {
      const labelLeft = r.side === 'left' ? r.left - box.labelGap - box.labelW : r.left;
      const labelRight = r.side === 'right' ? r.right + box.labelGap + box.labelW : r.right;
      const labelBottom = r.side === 'below' ? r.bottom + box.labelH : r.bottom;
      assert.ok(labelLeft >= 0 && labelRight <= box.width, `${r.key} yatayda taşıyor`);
      assert.ok(r.top >= 0 && labelBottom <= box.height, `${r.key} dikeyde taşıyor`);
    });
    rects.forEach((a, i) => rects.slice(i + 1).forEach((b) => {
      const apart = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
      assert.ok(apart, `${a.key} ile ${b.key} çakışıyor`);
    }));
  });
});

test('sideLabelLayout alt etiketli satırın altında etiket payı bırakır, diğer satırları sıkı dizer', () => {
  const geo = sideLabelLayout(RELATIONSHIP, { width: 1000, height: 555, ratio: 1.714, labelH: 82, labelW: 150, labelGap: 14, maxCard: 240 });
  const top = Object.fromEntries(geo.slots.map((s) => [s.key, s.top]));
  const firstGap = top.bond - top.potential - geo.ch;
  const secondGap = top.obstacle - top.bond - geo.ch;
  assert.ok(secondGap >= 82 && firstGap < 82);
  // Yarım satırlı (Celtic Cross gibi) dizilimlerde yan etiket düzeni kullanılmaz.
  assert.equal(sideLabelLayout([{ key: 'a', x: 0, y: 0.5 }, { key: 'b', x: 1, y: 0 }], { width: 500, height: 500, ratio: 1.7, labelH: 60, labelW: 100, labelGap: 10, maxCard: 200 }), null);
});

const { stripLayout, stackCardWidth } = require('../ui-helpers.js');

const rectsOf = (geo) => geo.slots.map((s) => ({ ...s, right: s.left + geo.cw, bottom: s.top + geo.ch }));

test('stripLayout on kartı geniş ve basık alanda tek sıraya, dar alanda iki sıraya dizer, büyük kartı seçer', () => {
  const opts = { ratio: 1.714, maxCard: 106, gapX: 0.16, labelH: 46, labelMin: 72, badgeRoom: 16, rowGap: 18 };
  const wide = stripLayout(10, { ...opts, width: 1516, height: 358 });
  assert.equal(wide.rows, 1);
  assert.equal(wide.cols, 10);
  assert.ok(wide.cw >= 100, `masaüstü şerit kartı ${wide.cw}`);
  assert.equal(wide.labels, true);
  const phone = stripLayout(10, { ...opts, maxCard: 72, width: 350, height: 369 });
  assert.equal(phone.rows, 2);
  assert.equal(phone.cols, 5);
  assert.ok(phone.cw >= 58, `telefon şerit kartı ${phone.cw}`);
  // Kart etiket için dar kalınca etiket payı bırakılmaz, numara rozeti yeter.
  assert.equal(phone.labels, false);
  assert.equal(phone.labelH, 0);
});

test('stripLayout kartları kutunun içinde, birbirine ve etiketlerine binmeden dizer', () => {
  [[1516, 358, 106], [1165, 246, 92], [350, 369, 72], [288, 200, 50], [699, 528, 120]].forEach(([width, height, maxCard]) => {
    const geo = stripLayout(10, { width, height, ratio: 1.714, maxCard, gapX: 0.16, labelH: 46, labelMin: 72, badgeRoom: 16, rowGap: 18 });
    const rects = rectsOf(geo);
    assert.equal(rects.length, 10);
    rects.forEach((r) => {
      assert.ok(r.left >= 0 && r.right <= width + 0.5, `${width}x${height}: ${r.index} yatayda taşıyor`);
      assert.ok(r.top - geo.badgeRoom >= -0.5 && r.bottom + geo.labelH <= height + 0.5, `${width}x${height}: ${r.index} dikeyde taşıyor`);
    });
    rects.forEach((a, i) => rects.slice(i + 1).forEach((b) => {
      const apart = a.right <= b.left || b.right <= a.left || a.bottom + geo.labelH + geo.badgeRoom <= b.top || b.bottom + geo.labelH + geo.badgeRoom <= a.top;
      assert.ok(apart, `${width}x${height}: ${a.index} ile ${b.index} çakışıyor`);
    }));
    // Sıra soldan sağa, sonra alt satıra iner.
    assert.deepEqual(geo.slots.map((s) => s.index), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

test('stackCardWidth satır arasını rozetin taşacağı kadar açık tutar', () => {
  // Celtic Cross sütunu: dört kart üst üste, rozet yarıçapı 13 px.
  const cw = stackCardWidth({ height: 524, rows: 4, ratio: 1.714, gapRatio: 0.1, minGap: 19 });
  const ch = Math.round(cw * 1.714);
  const gap = Math.max(cw * 0.1, 19);
  assert.ok(4 * ch + 3 * gap <= 524 + 1, `sütun ${4 * ch + 3 * gap} px`);
  assert.ok(gap >= 19);
  // Alan büyükse boşluk oranla büyür, kart en büyük haliyle sığar.
  const big = stackCardWidth({ height: 3000, rows: 4, ratio: 1.714, gapRatio: 0.1, minGap: 19 });
  assert.ok(4 * Math.round(big * 1.714) + 3 * big * 0.1 <= 3001);
  assert.ok(big > 380);
  // Tek satırda boşluk yoktur.
  assert.equal(stackCardWidth({ height: 171.4, rows: 1, ratio: 1.714, gapRatio: 0.1, minGap: 19 }), 100);
});

test('stripLayout istenen sütun sayısıyla dizer; satırı dolmayan son sıra ortalanır', () => {
  const opts = { width: 1516, height: 358, ratio: 1.714, maxCard: 106, gapX: 0.16, badgeRoom: 16, rowGap: 6 };
  const two = stripLayout(10, { ...opts, cols: [5] });
  assert.equal(two.cols, 5);
  assert.equal(two.rows, 2);
  const odd = stripLayout(7, { ...opts, cols: [4] });
  const lastRow = odd.slots.filter((s) => s.row === 1);
  const firstRow = odd.slots.filter((s) => s.row === 0);
  assert.equal(lastRow.length, 3);
  const mid = (list) => (list[0].left + list[list.length - 1].left + odd.cw) / 2;
  assert.ok(Math.abs(mid(lastRow) - mid(firstRow)) <= 1, 'son sıra ortada');
});
