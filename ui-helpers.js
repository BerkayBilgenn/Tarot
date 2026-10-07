// Arayüz için saf yardımcılar: DOM'a dokunmaz, tarayıcıda ve Node testlerinde aynı çalışır.
(function (root) {
  'use strict';

  const CARD_RATIO = 600 / 350;

  // "Karar (İki yol)" gibi adlarda parantez içini başlıkta "Karar · İki yol" olarak gösterir.
  function spreadDisplayName(name) {
    return String(name || '').replace(/\s*\(([^)]+)\)/, ' · $1');
  }

  // Karıştırırken açılımın adını değil, kişinin aklında tutacağı konuyu söyler.
  function shuffleInvite(spreadId) {
    const invites = {
      daily: 'Bugün için bir kart seçilecek.',
      three: 'Şu an aklındaki durumu düşün.',
      relationship: 'İlişkindeki durumu düşün.',
      decision: 'Karşındaki iki seçeneği düşün.',
      career: 'İş ve para konularında aklındaki durumu düşün.',
      celtic: 'Seni meşgul eden konuyu düşün.'
    };
    return invites[spreadId] || 'Aklındaki durumu düşün.';
  }

  const fold = (text) => String(text || '').toLocaleLowerCase('tr-TR');

  // Okumalarım araması: soru, açılım adı ve kart adlarında Türkçe harf kuralıyla arar.
  function matchesHistoryQuery(reading, spreadName, cardNames, query) {
    const needle = fold(query).trim();
    if (!needle) return true;
    const haystack = fold([reading && reading.question, spreadName, ...(cardNames || [])].filter(Boolean).join(' '));
    return haystack.includes(needle);
  }

  // Kart yelpazesi: 78 kart yatay kaydırılan bir yayda durur; orta kart en aşağıda, uçlar yukarıdadır.
  // Telefonda kartlar küçük ve sık, masaüstünde büyük ve seyrektir. Yükseklik verilirse kısa ekranda kartlar küçülür.
  function fanLayout(viewportWidth, viewportHeight) {
    const width = Math.max(320, viewportWidth);
    const height = Number(viewportHeight) || 0;
    const phone = width <= 900;
    let cardWidth = phone ? 72 : Math.max(96, Math.min(132, Math.round(width * 0.072)));
    if (height) {
      cardWidth = phone
        ? Math.max(50, Math.min(72, Math.round(height * 0.086)))
        : Math.max(80, Math.min(cardWidth, Math.round(height * 0.115)));
    }
    const spacing = phone ? Math.round(cardWidth * 0.61) : Math.round(cardWidth * 0.52);
    const radius = phone ? 620 : Math.round(Math.max(700, width * 1.05));
    const visibleRad = Math.min(0.9, width / 2 / radius);
    const drop = Math.round(radius * (1 - Math.cos(visibleRad)));
    const cardHeight = Math.round(cardWidth * CARD_RATIO);
    const pad = 24;
    return { cardWidth, cardHeight, spacing, radius, drop, pad, height: cardHeight + drop + pad + 8 };
  }

  const STOPS = '.!?…';
  const CLOSERS = '"\'”’»)';

  // Metni cümlelere böler. Noktalamadan sonra boşluk yoksa (2.5 gibi) bölmez; kapanan tırnak cümlede kalır.
  function splitSentences(text) {
    const s = String(text || '');
    const out = [];
    let start = 0;
    for (let i = 0; i < s.length; i++) {
      if (!STOPS.includes(s[i])) continue;
      let j = i + 1;
      while (j < s.length && STOPS.includes(s[j])) j++;
      while (j < s.length && CLOSERS.includes(s[j])) j++;
      if (j < s.length && !/\s/.test(s[j])) continue;
      const piece = s.slice(start, j).trim();
      if (piece) out.push(piece);
      start = j;
      i = j - 1;
    }
    const rest = s.slice(start).trim();
    if (rest) out.push(rest);
    return out;
  }

  // Biçimi farklı metin bloklarını sayfalara böler: cümleler sığdığı kadar aynı sayfada toplanır,
  // paragraf aralığı korunur, tek başına sığmayan cümle kelimelerden bölünür.
  // fits(sayfa, sayfaSırası) sayfaya sığıp sığmadığını söyler; tarayıcıda DOM ölçümü, testte uzunluk kuralı olur.
  // Sayfa, [{ block, text }] listesidir; block, girişteki bloğun sırasıdır.
  function paginateBlocks(blocks, fits) {
    const units = [];
    (blocks || []).forEach((b, block) => {
      String((b && b.text) || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).forEach((paragraph, para) => {
        splitSentences(paragraph).forEach((sentence) => units.push({ block, para, text: sentence }));
      });
    });
    const shape = (list) => {
      const parts = [];
      list.forEach((u, i) => {
        const prev = list[i - 1];
        if (prev && prev.block === u.block) parts[parts.length - 1].text += (prev.para === u.para ? ' ' : '\n\n') + u.text;
        else parts.push({ block: u.block, text: u.text });
      });
      return parts;
    };
    const pages = [];
    let page = [];
    units.forEach((unit) => {
      if (fits(shape([...page, unit]), pages.length)) { page.push(unit); return; }
      if (page.length) pages.push(shape(page));
      page = [];
      if (fits(shape([unit]), pages.length)) { page = [unit]; return; }
      let line = '';
      unit.text.split(/\s+/).forEach((word) => {
        const next = line ? `${line} ${word}` : word;
        if (!line || fits([{ block: unit.block, text: next }], pages.length)) { line = next; return; }
        pages.push([{ block: unit.block, text: line }]);
        line = word;
      });
      if (line) page = [{ ...unit, text: line }];
    });
    if (page.length) pages.push(shape(page));
    return pages;
  }

  // Tek bloklu metin için sayfalama; her sayfa düz metin olarak döner.
  function paginateText(text, fits) {
    return paginateBlocks([{ text }], (page) => fits(page[0].text)).map((page) => page[0].text);
  }

  // Sayfalı liste: istenen sayfayı sınırlar içinde tutar ve gösterilecek dilimi verir.
  function pageWindow(total, perPage, page) {
    const per = Math.max(1, Math.floor(perPage) || 0);
    const pages = Math.max(1, Math.ceil(total / per));
    const current = Math.min(pages - 1, Math.max(0, Math.floor(page) || 0));
    const start = Math.min(total, current * per);
    return { pages, page: current, start, end: Math.min(total, start + per) };
  }

  // Verilen yüksekliğe aralarında boşlukla kaç öğe sığar; en az bir öğe gösterilir.
  function fitCount(available, item, gap) {
    const unit = item + gap;
    if (!(unit > 0)) return 1;
    return Math.max(1, Math.floor((available + gap) / unit));
  }

  // Kart rehberi destesi: ortadaki kart düz ve tam boy; yanlar elde tutulan bir yelpaze gibi dönüp aşağı iner.
  // İlk komşu ortadaki karttan geniş açılır, uzaktakiler sıklaşır. offset ondalık olabilir (sürükleme sırasında).
  function guideFanPose(offset, { cardWidth, visible = 6 }) {
    const a = Math.abs(offset);
    const sign = Math.sign(offset);
    const first = cardWidth * 0.66;
    const step = cardWidth * 0.3;
    const reach = a <= 1 ? a * first : first + (a - 1) * step;
    const opacity = a >= visible ? 0 : a <= visible - 1 ? 1 : visible - a;
    return {
      x: sign * reach,
      y: Math.min(a, visible) ** 2 * cardWidth * 0.018,
      rotate: sign * Math.min(a, visible) * 4.5,
      scale: Math.max(0.68, 1 - 0.16 * Math.min(a, 1) - 0.03 * Math.max(0, a - 1)),
      opacity,
      dim: Math.min(1, a / 2),
      z: Math.round(100 - a * 10)
    };
  }

  // Kart açma düzeninde etiketin yeri: satırında yalnız kalan kartın etiketi sağa,
  // en soldaki sütunun etiketi sola, en sağdakinin sağa, arada kalanlarınki alta gelir.
  function labelSides(slots) {
    const xs = slots.map((s) => s.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const sides = {};
    slots.forEach((s) => {
      const alone = slots.filter((o) => o.y === s.y).length === 1;
      sides[s.key] = alone ? 'right' : s.x === minX ? 'left' : s.x === maxX ? 'right' : 'below';
    });
    return sides;
  }

  // Yan etiketli yerleşim: yalnızca alt etiketi olan satırlar etiket payı taşır, böylece kartlar büyür
  // ve sütunlar birbirine yaklaşır. Yarım satırlı dizilimlerde (Celtic Cross) kullanılmaz: null döner.
  function sideLabelLayout(slots, { width, height, ratio, labelH, labelW, labelGap, maxCard, gapRatio = 0.1, colRatio = 1.3 }) {
    if (!slots.length || slots.some((s) => !Number.isInteger(s.y))) return null;
    const sides = labelSides(slots);
    const minX = Math.min(...slots.map((s) => s.x));
    const rows = [...new Set(slots.map((s) => s.y))].sort((a, b) => a - b);
    const below = rows.map((y) => slots.some((s) => s.y === y && sides[s.key] === 'below'));
    const leftPad = slots.some((s) => sides[s.key] === 'left') ? labelW + labelGap : 0;
    let byWidth = Infinity;
    slots.forEach((s) => {
      const extra = sides[s.key] === 'right' ? labelGap + labelW : 0;
      byWidth = Math.min(byWidth, (width - leftPad - extra) / ((s.x - minX) * colRatio + 1));
    });
    const labelRows = below.filter(Boolean).length;
    const byHeight = (height - labelRows * labelH - 2) / (rows.length * ratio + (rows.length - 1) * gapRatio);
    const cw = Math.max(8, Math.floor(Math.min(byWidth, byHeight, maxCard)));
    const ch = Math.round(cw * ratio);
    const gap = cw * gapRatio;
    const cellW = cw * colRatio;
    const rowTop = [];
    let y = 0;
    rows.forEach((row, i) => { rowTop.push(y); y += ch + (below[i] ? labelH : 0) + gap; });
    const totalH = y - gap;
    const lefts = slots.map((s) => (s.x - minX) * cellW);
    let minEdge = Infinity;
    let maxEdge = -Infinity;
    slots.forEach((s, i) => {
      minEdge = Math.min(minEdge, lefts[i] - (sides[s.key] === 'left' ? labelGap + labelW : 0));
      maxEdge = Math.max(maxEdge, lefts[i] + cw + (sides[s.key] === 'right' ? labelGap + labelW : 0));
    });
    const ox = (width - (maxEdge - minEdge)) / 2 - minEdge;
    const oy = (height - totalH) / 2;
    return {
      cw, ch, cellW,
      slots: slots.map((s, i) => ({ key: s.key, side: sides[s.key], left: Math.round(ox + lefts[i]), top: Math.round(oy + rowTop[rows.indexOf(s.y)]) }))
    };
  }

  // Üst üste dizilen satırlara sığan kart genişliği. Satır arası kart genişliğiyle büyür ama minGap'ten
  // küçülmez: kartın üst kenarına oturan numara rozeti üstteki kartın üstüne binmez.
  function stackCardWidth({ height, rows, ratio, gapRatio = 0, minGap = 0 }) {
    const gaps = Math.max(0, rows - 1);
    const byRatio = height / (rows * ratio + gaps * gapRatio);
    const byMin = (height - gaps * minGap) / (rows * ratio);
    let cw = Math.max(8, Math.floor(Math.min(byRatio, byMin) + 1e-9));
    const used = (w) => rows * Math.round(w * ratio) + gaps * Math.max(w * gapRatio, minGap);
    while (cw > 8 && used(cw) > height + 1e-9) cw--;
    return cw;
  }

  // Seçim şeridi: kartlar sırasıyla tek satıra ya da iki satıra dizilir; hangisinde kart büyükse o seçilir
  // (cols ile sütun sayısı adayları verilebilir). Kart labelMin'den darsa etiket payı bırakılmaz, numara rozeti yeter.
  // Rozet kartın üstünde badgeRoom kadar yer ister.
  function stripLayout(count, { width, height, ratio, maxCard, gapX = 0.16, labelH = 0, labelMin = 0, badgeRoom = 0, rowGap = 0, align = 'center', cols: colOptions = null }) {
    const fit = (cols, lh) => {
      const rows = Math.ceil(count / cols);
      const byWidth = width / (cols + (cols - 1) * gapX);
      const byHeight = (height - rows * (badgeRoom + lh) - (rows - 1) * rowGap) / (rows * ratio);
      let cw = Math.max(8, Math.floor(Math.min(byWidth, byHeight, maxCard)));
      while (cw > 8 && rows * (badgeRoom + lh + Math.round(cw * ratio)) + (rows - 1) * rowGap > height) cw--;
      return { cols, rows, cw, labelH: lh, labels: lh > 0 };
    };
    const candidates = [...new Set(colOptions || [count, Math.ceil(count / 2)])].map((cols) => {
      const labelled = labelH > 0 ? fit(cols, labelH) : null;
      return labelled && labelled.cw >= labelMin ? labelled : fit(cols, 0);
    });
    const best = candidates.reduce((a, b) => (b.cw > a.cw ? b : a));
    const { cols, rows, cw, labelH: lh } = best;
    const ch = Math.round(cw * ratio);
    const stepX = cw * (1 + gapX);
    const rowH = badgeRoom + ch + lh;
    const contentH = rows * rowH + (rows - 1) * rowGap;
    const oy = align === 'top' ? 0 : Math.max(0, (height - contentH) / 2);
    const slots = Array.from({ length: count }, (_, index) => {
      const row = Math.floor(index / cols);
      const inRow = Math.min(cols, count - row * cols);
      const ox = (width - (inRow * cw + (inRow - 1) * gapX * cw)) / 2;
      const col = index - row * cols;
      return { index, col, row, left: Math.round(ox + col * stepX), top: Math.round(oy + row * (rowH + rowGap) + badgeRoom) };
    });
    return { ...best, ch, cellW: stepX, badgeRoom, slots };
  }

  // Bırakılan desteyi en yakın karta oturtur; hız (kart/saniye) hareketi ileri taşır.
  function snapTarget(position, velocity, count) {
    if (!(count > 0)) return 0;
    const projected = position + velocity * 0.12;
    return Math.min(count - 1, Math.max(0, Math.round(projected)));
  }

  // Kelime kelime beliren metinde toplam süre sınırı aşılmasın diye kelime aralığı kısalır.
  function wordStep(count, { step, max }) {
    if (!(count > 0)) return step;
    return Math.min(step, Math.max(2, Math.floor(max / count)));
  }

  function generalText(interpretation,fallback='') {
    const oracle=root.TAROT_ORACLE || (typeof require==='function'?require('./oracle.js'):null);
    const keys=(interpretation?.positions||[]).map(p=>p.positionKey);
    const result=oracle?.validateResult(interpretation?.holistic,keys);
    if(result)return result.general;
    return interpretation?.closingSource==='llm' && interpretation.closing ? interpretation.closing : fallback;
  }

  function storyOutline() { return [{id:'closing',kind:'closing'},{id:'finish',kind:'finish'}]; }
  function cardReadingDetail({reading,spread,interpretation,positionKey}) {
    const position=spread?.positions.find(p=>p.key===positionKey),drawn=reading?.cards.find(c=>c.positionKey===positionKey);
    if(!position||!drawn)return null;
    const oracle=root.TAROT_ORACLE || (typeof require==='function'?require('./oracle.js'):null);
    const cards=root.TAROT_CARDS || (typeof require==='function'?require('./cards.js'):null);
    const result=oracle?.validateResult(interpretation?.holistic,spread.positions.map(p=>p.key));
    const p=result?.positions.find(p=>p.positionKey===positionKey),local=interpretation?.positions?.find(p=>p.positionKey===positionKey);
    const connections=(p?.connections||[]).map(c=>{
      const seat=spread.positions.find(p=>p.key===c.positionKey),card=reading.cards.find(p=>p.positionKey===c.positionKey);
      return {positionKey:c.positionKey,label:[seat.label,cards.getCard(card.cardId)?.nameTr].filter(Boolean).join(' · '),text:c.text};
    });
    const positionLabel=spread.id==='decision'&&position.key.startsWith('a_')?`${reading.optionA||'A'} · ${position.label}`:spread.id==='decision'&&position.key.startsWith('b_')?`${reading.optionB||'B'} · ${position.label}`:position.label;
    return {positionLabel,drawnReversed:drawn.reversed,context:p?.context||[local?.seat,local?.context,local?.tie].filter(Boolean).join(' ')||local?.text||'',connections};
  }

  // background-size:cover + center top ile çizilen görseldeki bir noktanın ekrandaki yeri.
  function coverPoint(viewWidth, viewHeight, imageWidth, imageHeight, px, py) {
    const scale = Math.max(viewWidth / imageWidth, viewHeight / imageHeight);
    return { x: (viewWidth - imageWidth * scale) / 2 + px * scale, y: py * scale, scale };
  }

  const api = {
    spreadDisplayName, shuffleInvite, matchesHistoryQuery, fanLayout, splitSentences, paginateBlocks, paginateText, pageWindow,
    fitCount, guideFanPose, snapTarget, wordStep, generalText, cardReadingDetail, storyOutline, coverPoint, labelSides, sideLabelLayout,
    stackCardWidth, stripLayout
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TAROT_UI = api;
})(typeof window !== 'undefined' ? window : globalThis);
