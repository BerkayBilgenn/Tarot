// Okuma motoru: seed, permütasyon, seçim, kayıt ve bağlamsal yorum.
// Yorum metni Tarot Yorum Motoru'nun (cme-0.1) Reading Plan'ından üretilir.
// Spec'te sunucuda duran kısım (seed, permütasyon, okuma kayıtları) burada `createService`
// içinde tutulur ve dışarıya yalnızca spec'teki API yanıtlarının şekli verilir.
(function (root) {
  'use strict';

  // ---------- ChaCha20 (128 bit anahtar) tabanlı deterministik, kriptografik PRNG ----------

  const TAU = [0x61707865, 0x3120646e, 0x79622d36, 0x6b206574]; // "expand 16-byte k"

  function rotl(v, n) { return (v << n) | (v >>> (32 - n)); }

  function quarter(s, a, b, c, d) {
    s[a] = (s[a] + s[b]) | 0; s[d] = rotl(s[d] ^ s[a], 16);
    s[c] = (s[c] + s[d]) | 0; s[b] = rotl(s[b] ^ s[c], 12);
    s[a] = (s[a] + s[b]) | 0; s[d] = rotl(s[d] ^ s[a], 8);
    s[c] = (s[c] + s[d]) | 0; s[b] = rotl(s[b] ^ s[c], 7);
  }

  function chachaBlock(key, counter) {
    const input = [...TAU, ...key, ...key, counter, 0, 0, 0];
    const s = input.slice();
    for (let i = 0; i < 10; i++) {
      quarter(s, 0, 4, 8, 12); quarter(s, 1, 5, 9, 13); quarter(s, 2, 6, 10, 14); quarter(s, 3, 7, 11, 15);
      quarter(s, 0, 5, 10, 15); quarter(s, 1, 6, 11, 12); quarter(s, 2, 7, 8, 13); quarter(s, 3, 4, 9, 14);
    }
    return s.map((v, i) => (v + input[i]) >>> 0);
  }

  function seedToKey(seed) {
    if (!/^[0-9a-f]{32}$/.test(seed)) throw new Error('seed 128 bit hex olmalı');
    return [0, 1, 2, 3].map((i) => parseInt(seed.slice(i * 8, i * 8 + 8), 16) >>> 0);
  }

  function createRng(seed) {
    const key = seedToKey(seed);
    let counter = 0;
    let block = [];
    const next32 = () => {
      if (!block.length) block = chachaBlock(key, counter++);
      return block.shift();
    };
    // Reddetme örneklemesiyle [0, n) aralığında tarafsız tam sayı.
    const below = (n) => {
      const limit = Math.floor(0x100000000 / n) * n;
      let v;
      do { v = next32(); } while (v >= limit);
      return v % n;
    };
    return { next32, below };
  }

  function randomSeed(cryptoImpl) {
    const c = cryptoImpl || root.crypto;
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Seed'den 78 kartlık Fisher–Yates permütasyonu ve her yelpaze yeri için terslik biti.
  function deriveDeck(seed, cardIds, reversalsEnabled) {
    const rng = createRng(seed);
    const order = cardIds.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = rng.below(i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    const reversed = order.map(() => rng.below(2) === 1 && Boolean(reversalsEnabled));
    return { order, reversed };
  }

  // ---------- Tarih ----------

  function localDate(date) {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const DAY = 24 * 60 * 60 * 1000;

  // ---------- Metin yardımcıları ----------

  const CRISIS = /(intihar|kendimi (öldür|asmak|asacağım)|ölmek istiyorum|yaşamak istemiyorum|kendime zarar|canıma kıy|hayatıma son|bileklerimi kes|artık yaşamak)/i;

  function isCrisis(...texts) {
    return texts.some((text) => text && CRISIS.test(text.toLocaleLowerCase('tr')));
  }

  function tokens(text) {
    return new Set((text || '').toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2));
  }

  function similarQuestions(a, b) {
    const ta = tokens(a);
    const tb = tokens(b);
    if (!ta.size || !tb.size) return false;
    let shared = 0;
    ta.forEach((w) => { if (tb.has(w)) shared++; });
    return shared / (ta.size + tb.size - shared) >= 0.6;
  }

  const clip = (text, max) => (text || '').trim().slice(0, max);

  // ---------- Servis (spec'teki API'nin yerel karşılığı) ----------

  function memoryStorage() {
    const data = new Map();
    return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
  }

  function createService(options) {
    const opts = options || {};
    const storage = opts.storage || memoryStorage();
    const cards = opts.cards;
    const spreads = opts.spreads;
    const now = opts.now || (() => new Date());
    const cryptoImpl = opts.crypto;
    const latency = opts.latency || 0;
    const KEY = 'kd.readings.v1';
    const DEVICE = 'kd.device.v1';
    const cardIds = cards.CARDS.map((card) => card.id);

    const wait = (value) => new Promise((resolve) => setTimeout(() => resolve(value), latency));
    const load = () => { try { return JSON.parse(storage.getItem(KEY)) || []; } catch (e) { return []; } };
    const save = (list) => storage.setItem(KEY, JSON.stringify(list));
    const find = (list, id) => {
      const reading = list.find((r) => r.id === id);
      if (!reading) throw new Error('Okuma bulunamadı');
      return reading;
    };

    function userId() {
      let id = storage.getItem(DEVICE);
      if (!id) { id = 'anon-' + randomSeed(cryptoImpl).slice(0, 16); storage.setItem(DEVICE, id); }
      return id;
    }

    function cardView(id) {
      const card = cards.getCard(id);
      return { id: card.id, name: card.name, nameTr: card.nameTr, image: card.image };
    }

    // İstemciye dönen kopya: seed ve permütasyon hiçbir zaman çıkmaz.
    function publicReading(r) {
      if (!r) return null;
      const { seed, ...rest } = r;
      return JSON.parse(JSON.stringify(rest));
    }

    function expireDrafts(list) {
      const t = now().getTime();
      let changed = false;
      list.forEach((r) => {
        if ((r.status === 'picking' || r.status === 'revealing') && t - Date.parse(r.createdAt) > 7 * DAY) {
          r.status = 'abandoned';
          changed = true;
        }
      });
      if (changed) save(list);
    }

    // Bugünün günün kartları, eskiden yeniye. Ana ekran en son çekileni açar.
    function todaysDailies(list, uid, date) {
      return list
        .filter((r) => r.spreadId === 'daily' && r.userId === uid && r.localDate === date && r.status !== 'abandoned')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }

    function createReading(input) {
      const spread = spreads.getSpread(input.spreadId);
      if (!spread) return Promise.reject(new Error('Bilinmeyen açılım'));
      const list = load();
      const uid = userId();
      const date = localDate(now());
      if (spread.id === 'daily' && !input.forceNew) {
        const existing = todaysDailies(list, uid, date).at(-1);
        if (existing) return wait({ readingId: existing.id, cardCount: 1, existing: true });
      }
      if (spread.inputs.options === 'required' && (!clip(input.optionA, 40) || !clip(input.optionB, 40))) {
        return Promise.reject(new Error('A ve B seçenekleri zorunlu'));
      }
      const reading = {
        id: 'r-' + randomSeed(cryptoImpl).slice(0, 12),
        userId: uid,
        spreadId: spread.id,
        status: 'picking',
        question: spread.inputs.question === 'none' ? undefined : clip(input.question, 200) || undefined,
        optionA: spread.inputs.options ? clip(input.optionA, 40) : undefined,
        optionB: spread.inputs.options ? clip(input.optionB, 40) : undefined,
        personName: spread.inputs.personName ? clip(input.personName, 30) || undefined : undefined,
        reversalsEnabled: input.reversalsEnabled !== false,
        seed: randomSeed(cryptoImpl),
        cards: [],
        localDate: spread.id === 'daily' ? date : undefined,
        createdAt: now().toISOString(),
      };
      list.push(reading);
      save(list);
      return wait({ readingId: reading.id, cardCount: spread.cardCount, existing: false });
    }

    function pick(readingId, pickIndex, fanIndex) {
      try {
        const list = load();
        const reading = find(list, readingId);
        const spread = spreads.getSpread(reading.spreadId);
        const done = reading.cards[pickIndex];
        if (done) {
          if (done.fanIndex !== fanIndex) throw new Error('Bu seçim zaten yapıldı');
          return wait({ positionKey: done.positionKey, card: cardView(done.cardId), reversed: done.reversed });
        }
        if (!Number.isInteger(fanIndex) || fanIndex < 0 || fanIndex >= cardIds.length) throw new Error('Geçersiz yelpaze yeri');
        if (pickIndex !== reading.cards.length || pickIndex >= spread.cardCount) throw new Error('Geçersiz seçim sırası');
        if (reading.cards.some((c) => c.fanIndex === fanIndex)) throw new Error('Bu kart zaten seçildi');
        const deck = deriveDeck(reading.seed, cardIds, reading.reversalsEnabled);
        const drawn = {
          positionKey: spread.positions[pickIndex].key,
          cardId: deck.order[fanIndex],
          reversed: deck.reversed[fanIndex],
          fanIndex,
        };
        reading.cards.push(drawn);
        if (reading.cards.length === spread.cardCount) reading.status = 'revealing';
        save(list);
        return wait({ positionKey: drawn.positionKey, card: cardView(drawn.cardId), reversed: drawn.reversed });
      } catch (error) {
        return Promise.reject(error);
      }
    }

    function reveal(readingId, positionKey) {
      const list = load();
      const reading = find(list, readingId);
      const card = reading.cards.find((c) => c.positionKey === positionKey);
      if (card && !card.revealedAt) { card.revealedAt = now().toISOString(); save(list); }
      return wait(undefined);
    }

    function complete(readingId) {
      const list = load();
      const reading = find(list, readingId);
      if (!reading.interpretation) {
        reading.interpretation = interpret(reading, spreads.getSpread(reading.spreadId), cards);
        save(list);
      }
      return wait(reading.interpretation);
    }

    // Yorum ekranı açılınca okuma tamamlanmış sayılır ve "Okumalarım"a girer.
    function markViewed(readingId) {
      const list = load();
      const reading = find(list, readingId);
      if (reading.status !== 'complete') {
        reading.status = 'complete';
        reading.completedAt = now().toISOString();
        reading.cards.forEach((c) => { c.revealedAt = c.revealedAt || reading.completedAt; });
        save(list);
      }
      return wait(publicReading(reading));
    }

    function abandon(readingId) {
      const list = load();
      const reading = find(list, readingId);
      if (reading.status !== 'complete') { reading.status = 'abandoned'; save(list); }
      return wait(undefined);
    }

    function get(readingId) {
      return wait(publicReading(load().find((r) => r.id === readingId)));
    }

    function dailyToday() {
      const reading = todaysDailies(load(), userId(), localDate(now())).at(-1);
      return wait(publicReading(reading));
    }

    function draft() {
      const list = load();
      expireDrafts(list);
      const drafts = list.filter((r) => r.status === 'revealing' || (r.status === 'picking' && r.cards.length > 0));
      drafts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return wait(publicReading(drafts[0]));
    }

    function listReadings(filter) {
      const spreadId = filter && filter.spreadId;
      const list = load().filter((r) => r.status === 'complete' && (!spreadId || r.spreadId === spreadId));
      list.sort((a, b) => (b.completedAt || b.createdAt).localeCompare(a.completedAt || a.createdAt));
      return wait(list.map(publicReading));
    }

    function patch(readingId, changes) {
      const list = load();
      const reading = find(list, readingId);
      if (typeof changes.note === 'string') reading.note = changes.note.slice(0, 2000);
      save(list);
      return wait(undefined);
    }

    function saveClosing(readingId, text, source) {
      const list = load();
      const reading = find(list, readingId);
      if (!reading.interpretation) return wait(null);
      const closing = String(text || '').trim().slice(0, 8000);
      reading.interpretation.closing = closing;
      reading.interpretation.closingSource = source === 'template' ? 'template' : 'llm';
      reading.interpretation.closingVoice = 'okuma-3';
      save(list);
      return wait(reading.interpretation);
    }

    // Aynı açılım ve benzer soru 24 saat içinde sorulduysa yumuşak uyarı için.
    function recentSimilar(spreadId, question) {
      const t = now().getTime();
      return load().some((r) => r.spreadId === spreadId && r.question && t - Date.parse(r.createdAt) < DAY && similarQuestions(r.question, question));
    }

    return { createReading, pick, reveal, complete, markViewed, abandon, get, dailyToday, draft, list: listReadings, patch, saveClosing, recentSimilar, publicReading, userId };
  }

  // Yanıt gelmezse aynı pickIndex ile üç kez daha dener; seçim idempotent olduğu için güvenli.
  async function withRetry(task, attempts) {
    let lastError;
    for (let i = 0; i < (attempts || 3); i++) {
      try { return await task(); } catch (error) {
        lastError = error;
        if (/zaten|Geçersiz|bulunamadı/.test(error.message)) break;
      }
    }
    throw lastError;
  }

  // ---------- Kodda hesaplanan sinyaller ----------

  const SIGN_ELEMENT = {
    'Koç': 'Ateş', 'Aslan': 'Ateş', 'Yay': 'Ateş', 'Boğa': 'Toprak', 'Başak': 'Toprak', 'Oğlak': 'Toprak',
    'İkizler': 'Hava', 'Terazi': 'Hava', 'Kova': 'Hava', 'Yengeç': 'Su', 'Akrep': 'Su', 'Balık': 'Su',
    'Merkür': 'Hava', 'Ay': 'Su', 'Venüs': 'Toprak', 'Jüpiter': 'Ateş', 'Mars': 'Ateş', 'Güneş': 'Ateş', 'Satürn': 'Toprak',
  };
  const ELEMENTS = ['Ateş', 'Su', 'Hava', 'Toprak'];
  const ELEMENT_AREA = { 'Ateş': 'tutku, irade ve harekete geçme', 'Su': 'duygular ve ilişkiler', 'Hava': 'düşünceler, iletişim ve kararlar', 'Toprak': 'para, iş, beden ve somut sonuçlar' };

  function elementOf(card) {
    if (card.arcana === 'minor') return card.element;
    const astro = card.astrology || '';
    if (astro.includes('/')) return astro.split('/')[1].trim();
    return SIGN_ELEMENT[astro.trim()] || null;
  }

  function signals(drawn, cards) {
    const list = drawn.map((d) => ({ ...d, card: cards.getCard(d.cardId) }));
    const n = list.length;
    const majors = list.filter((d) => d.card.arcana === 'major').length;
    const reversed = list.filter((d) => d.reversed).length;
    const counts = Object.fromEntries(ELEMENTS.map((e) => [e, 0]));
    list.forEach((d) => { const e = elementOf(d.card); if (e) counts[e]++; });
    const sorted = ELEMENTS.slice().sort((a, b) => counts[b] - counts[a]);
    const dominant = counts[sorted[0]] > counts[sorted[1]] ? sorted[0] : null;
    const missing = n >= 5 ? ELEMENTS.filter((e) => counts[e] === 0) : [];
    const ranks = {};
    list.filter((d) => d.card.arcana === 'minor').forEach((d) => { ranks[d.card.rank] = (ranks[d.card.rank] || 0) + 1; });
    const repeated = Object.entries(ranks).filter(([, c]) => c >= 2).map(([rank, count]) => ({ rank: Number(rank), count }));
    return { majorRatio: n ? majors / n : 0, reversedRatio: n ? reversed / n : 0, elements: counts, dominant, missing, repeated };
  }

  // ---------- Bağlamsal yorum (cme-0.1 planı → şablon cümle) ----------

  const lower = (text) => text.charAt(0).toLocaleLowerCase('tr') + text.slice(1);
  const trimDot = (text) => text.replace(/[.\s]+$/, '');
  const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;

  // Soru merceği serbest metni yorumlamaz; söz edimini sınıflar.
  // closed: evet/hayır hükmü isteniyor. particular: yaşam alanı sözlüğünün
  // dışında özel bir şey adlandırılmış ve o alanda başka bir konu yok.
  // İkisi birden ("yeşil elmayı almam hayırlı mı") kartın o şeyi bildiğini iddia etmez.
  const QUESTION_TOPICS = ['iş', 'kariyer', 'para', 'maaş', 'aşk', 'ilişki', 'sevgili', 'evlilik', 'ayrıl', 'karar', 'taşın', 'dikkat', 'gelecek', 'geçmiş', 'duygu', 'aile', 'anne', 'baba', 'arkadaş', 'okul', 'sınav', 'teklif', 'şehir', 'ev', 'borç', 'sağlık', 'kabul', 'çocuk', 'eş', 'patron'];
  const QUESTION_VERBS = new Set(['al', 'et', 'yap', 'ol', 'gel', 'git', 'bak', 'seç', 'ver', 'kal', 'çık', 'düşün', 'bil', 'sor', 'iste', 'istem']);
  const QUESTION_VERB_SUFFIXES = ['malıyım', 'meliyim', 'malıyız', 'meliyiz', 'malısın', 'melisin', 'malı', 'meli', 'mam', 'mem', 'maz', 'mez', 'mak', 'mek', 'acağım', 'eceğim', 'acak', 'ecek', 'ıyorum', 'iyorum', 'uyorum', 'üyorum', 'ıyor', 'iyor', 'uyor', 'üyor', 'dım', 'dim', 'dum', 'düm', 'tım', 'tim', 'tum', 'tüm', 'yım', 'yim', 'yum', 'yüm', 'sın', 'sin', 'sun', 'sün', 'lar', 'ler', 'ma', 'me', 'yı', 'yi', 'yu', 'yü'];
  const QUESTION_FUNCTION = new Set(['bir', 'bu', 'şu', 'ne', 'neye', 'neyi', 'neden', 'niye', 'nasıl', 'için', 'ile', 've', 'veya', 'ben', 'sen', 'bana', 'sana', 'benim', 'senin', 'çok', 'daha', 'kadar', 'gibi', 'diye', 'yok', 'var', 'hiç', 'her', 'şey', 'hakkında', 'acaba', 'şimdi', 'bugün', 'yarın', 'sonra', 'önce', 'hayırlı', 'hayırsız', 'da', 'de', 'ki', 'ya', 'en', 'biraz', 'onu', 'ona', 'onun', 'beni', 'seni', 'bunu', 'şunu']);

  function displayQuestion(raw) {
    let text = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    text = text
      .replace(/[!]+/g, ',')
      .replace(/\.+/g, ',')
      .replace(/\?+/g, '?')
      .replace(/\s+,/g, ',')
      .replace(/,+/g, ',')
      .replace(/,(?=\S)/g, ', ')
      .replace(/^[, \s]+/g, '')
      .replace(/[, \s]+$/g, '')
      .replace(/\s+\?/g, '?');
    if (text.length > 90) {
      const cut = text.slice(0, 90);
      const space = cut.lastIndexOf(' ');
      text = `${(space > 40 ? cut.slice(0, space) : cut).trim()}…`;
    }
    return text;
  }

  function questionTokens(raw) {
    return String(raw || '')
      .toLocaleLowerCase('tr')
      .replace(/['’]/g, '')
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);
  }

  function isQuestionParticle(token) {
    return /^(?:mı|mi|mu|mü)$/.test(token) || /^m[ıiuü]y[ıiuü]m$/.test(token) || /^m[ıiuü]s[ıiuü]n$/.test(token) || /^m[ıiuü]y[ıiuü]z$/.test(token);
  }

  function isQuestionTopic(token) {
    return QUESTION_TOPICS.some((topic) => {
      if (!token.startsWith(topic)) return false;
      const rest = token.slice(topic.length);
      if (!rest) return true;
      if (/^(?:l[ae]r)?(?:[dt][ae]n|[dt][ae]|n[aeıiuü]n|y?[aeıiuü]n|y?[aeıiuü]m|m|y?[aeıiuü]|s[ıiuü])$/.test(rest)) return true;
      if (/^mal[ıi](?:y[ıi]m|s[ıi]n|y[ıi]z|lar)?$/.test(rest)) return true;
      if (/^mel[ıi](?:y[ıi]m|s[ıi]n|y[ıi]z|ler)?$/.test(rest)) return true;
      return /^(?:ma|me|mak|mek|ması|mesi)$/.test(rest);
    });
  }

  function isQuestionVerb(token) {
    let word = token;
    if (QUESTION_VERBS.has(word)) return true;
    for (let i = 0; i < 3; i++) {
      const suffix = QUESTION_VERB_SUFFIXES.find((item) => word.length - item.length >= 2 && word.endsWith(item));
      if (!suffix) return false;
      word = word.slice(0, -suffix.length);
      if (QUESTION_VERBS.has(word)) return true;
    }
    return false;
  }

  function readQuestion(raw) {
    const text = displayQuestion(raw);
    if (!text) return { text: '', closed: false, particular: false };
    let topics = 0;
    let unknowns = 0;
    let closed = false;
    for (const token of questionTokens(raw)) {
      if (isQuestionParticle(token)) { closed = true; continue; }
      if (QUESTION_FUNCTION.has(token)) continue;
      if (isQuestionTopic(token)) { topics += 1; continue; }
      if (isQuestionVerb(token)) continue;
      if (token.length >= 3) unknowns += 1;
    }
    return { text, closed, particular: unknowns > 0 && topics === 0 };
  }

  function questionLens(reading, spread) {
    if (spread && spread.inputs && spread.inputs.question === 'none') return readQuestion('');
    return readQuestion(reading && reading.question);
  }

  function questionFrame(lens) {
    if (!lens.text) return '';
    const quote = `“${lens.text}”`;
    if (lens.particular && lens.closed) return `${quote} Kartlar bunu tek tek bilmez; küçük bir tercih olarak okur ve hayırlı ya da hayırsız diye hüküm vermez.`;
    if (lens.particular) return `${quote} Kartlar bunu tek tek bilmez; ona özel bir anlam yüklemez, küçük bir mesele olarak okur.`;
    if (lens.closed) return `${quote} Kartlar bunu evet ya da hayır diye kesmez; eğilimi ve bedelini anlatır.`;
    return `${quote} Kartlar buna bir liste değil, bir eğilim olarak cevap verir.`;
  }

  function questionSeat(lens, role) {
    if (!lens.text || !role) return '';
    if (role === 'first') {
      if (lens.particular) return 'Bu yer o özel şeyi değil, bu seçimin nasıl kurulduğunu söyler.';
      if (lens.closed) return 'Bu yer evet ya da hayır kesmez; eğilimin nereden geldiğini söyler.';
      return 'Bu yer, sorduğun şeye kartın kendi anlamıyla cevap verir.';
    }
    if (lens.particular && lens.closed) return 'Kapanış da hüküm vermez; bu tercihteki eğilimi gösterir.';
    if (lens.particular) return 'Kapanış o özel şeye anlam yüklemez; meselenin gidişatını gösterir.';
    if (lens.closed) return 'Kapanış bir hüküm değil, bu sorudaki eğilimdir.';
    return 'Sorduğun şeyin cevabı burada bir hüküm olarak değil, bir eğilim olarak toplanır.';
  }

  function motor() {
    if (root.TAROT_ENGINE) return root.TAROT_ENGINE;
    return require('./yorum-motoru.js');
  }

  const COURT_TO_ENGINE = { 11: 'page', 12: 'knight', 13: 'queen', 14: 'king' };
  const ENGINE_TO_COURT = { page: '11', knight: '12', queen: '13', king: '14' };
  const SPREAD_INTENT = { daily: 'advice', three: 'general', relationship: 'love', decision: 'decision', career: 'work', celtic: 'general' };

  function toEngineId(appId) {
    if (appId.startsWith('major-')) return 'major-' + Number(appId.slice(6));
    const dash = appId.lastIndexOf('-');
    const suit = appId.slice(0, dash);
    const n = Number(appId.slice(dash + 1));
    return n > 10 ? `${suit}-${COURT_TO_ENGINE[n]}` : `${suit}-${n}`;
  }

  function fromEngineId(engineId) {
    if (engineId.startsWith('major-')) return 'major-' + String(Number(engineId.slice(6))).padStart(2, '0');
    const dash = engineId.indexOf('-');
    const suit = engineId.slice(0, dash);
    const rest = engineId.slice(dash + 1);
    if (ENGINE_TO_COURT[rest]) return `${suit}-${ENGINE_TO_COURT[rest]}`;
    return `${suit}-${String(Number(rest)).padStart(2, '0')}`;
  }

  function displayLabel(position, reading) {
    const a = reading.optionA || 'A';
    const b = reading.optionB || 'B';
    switch (position.key) {
      case 'other': return reading.personName || position.label;
      case 'a_path': return reading.optionA ? `${a} · yol` : position.label;
      case 'a_outcome': return reading.optionA ? `${a} · sonuç` : position.label;
      case 'b_path': return reading.optionB ? `${b} · yol` : position.label;
      case 'b_outcome': return reading.optionB ? `${b} · sonuç` : position.label;
      default: return position.label;
    }
  }

  function displayPrompt(position, reading) {
    let prompt = position.prompt;
    if (reading.optionA) prompt = prompt.replace(/\bA'yı\b/, `"${reading.optionA}" yolunu`).replace(/\bA seçeneği\b/, `"${reading.optionA}"`);
    if (reading.optionB) prompt = prompt.replace(/\bB'yi\b/, `"${reading.optionB}" yolunu`).replace(/\bB seçeneği\b/, `"${reading.optionB}"`);
    return prompt;
  }

  function keywordsOf(card, reversed, cardsApi) {
    if (card.arcana === 'minor' && !card.court) {
      const suit = cardsApi.SUITS[card.suit];
      return [...card.keywords, ...suit.area.split(', ')].slice(0, 3);
    }
    return card.keywords.slice(0, 3);
  }

  const POSITION_FRAMES = {
    past: 'Bu pozisyon bugünü hazırlayan etkileri anlatır.',
    present: 'Bu pozisyon şu anın enerjisini anlatır.',
    future: 'Bu pozisyon mevcut gidişatın eğilimini anlatır; kesin bir sonuç değil, bir yöndür.',
    self: 'Bu pozisyon senin bu konuya getirdiğin enerjiyi ve tutumu anlatır.',
    other: 'Bu pozisyon karşı tarafın ilişkiye taşıdığı enerjiyi anlatır.',
    bond: 'Bu pozisyon aranızdaki bağın şu anki doğasını anlatır.',
    obstacle: 'Bu pozisyon önündeki zorluğu, aşılması gereken eşiği anlatır.',
    potential: 'Bu pozisyon en iyi ihtimalle açılabilecek yolu anlatır.',
    situation: 'Bu pozisyon kararın özünü ve şu anki tabloyu anlatır.',
    a_path: 'Bu pozisyon ilk yolu seçersen sürecin nasıl akabileceğini anlatır.',
    a_outcome: 'Bu pozisyon ilk yolun nereye varma eğiliminde olduğunu anlatır.',
    b_path: 'Bu pozisyon ikinci yolu seçersen sürecin nasıl akabileceğini anlatır.',
    b_outcome: 'Bu pozisyon ikinci yolun nereye varma eğiliminde olduğunu anlatır.',
    current: 'Bu pozisyon işte ya da parada şu an olanı anlatır.',
    strength: 'Bu pozisyon dayanabileceğin gücü anlatır.',
    advice: 'Bu pozisyon atabileceğin adımı, kartların tavsiyesini anlatır.',
    outcome: 'Bu pozisyon bu yolda devam edersen varılabilecek yeri anlatır.',
    challenge: 'Bu pozisyon duruma karışan gücü, kesişen engeli anlatır.',
    crown: 'Bu pozisyon bilinçli hedefini, ulaşılabilecek en iyi sonucu anlatır.',
    root: 'Bu pozisyon durumun altındaki kök sebebi anlatır.',
    environment: 'Bu pozisyon çevrendeki insanları ve dış etkileri anlatır.',
    hopes_fears: 'Bu pozisyon umutlarını ve korkularını birlikte anlatır.',
  };

  const QUAL_TR = { hot: 'sıcak', cold: 'soğuk', wet: 'nemli', dry: 'kuru' };
  const ARC_SENTENCE = {
    ascending: 'Hikâye yükselen bir eğri çiziyor; baştaki yük sona doğru hafifliyor.',
    descending: 'Hikâye alçalan bir eğri çiziyor; başlangıçtaki açıklık sona doğru daralıyor.',
    V: 'Hikâye bir çukurdan geçiyor: ortada bir sarsıntı, ardından toparlanma var.',
    lambda: 'Hikâye bir tepe yapıp iniyor; ortadaki yükseliş sonda yeniden sınanıyor.',
    flat: 'Hikâyenin tonu düz; kartlar birbirini sertçe yükseltmiyor ya da düşürmüyor.',
    oscillating: 'Hikâye dalgalı; aydınlık ve gölge sırayla yer değiştiriyor.',
  };
  const ARC_SHORT = {
    ascending: 'yükselen', descending: 'alçalan', V: 'çukurdan geçip toparlanan',
    lambda: 'tepe yapıp inen', flat: 'düz', oscillating: 'dalgalı',
  };
  const BALANCE_SHORT = { heavy: 'ağır', mixed: 'karışık', bright: 'parlak' };
  const REL_SENTENCE = {
    amplify: (a, b) => `${a}, ${b} ile aynı yönde güçleniyor.`,
    intensify: (a, b) => `${a} ile ${b} birlikte ağırlığı artırıyor.`,
    erode: (a, b) => `${a}, ${b} tarafındaki yükü hafifletiyor.`,
    resolve: (a, b) => `${a}, ${b} ile gelen zorluğun ardından bir çıkış gösteriyor.`,
    color: (a, b) => `${a}, ${b} kartına yalnızca bir renk katıyor.`,
  };

  function firstSentence(text) {
    const match = String(text).match(/^.*?[.!?](?:\s|$)/);
    return (match ? match[0] : text).trim();
  }

  function cardLabel(card, reversed) {
    return `${card.nameTr}${reversed ? ' (ters)' : ''}`;
  }

  function volumeSentence(ctx, nameOf) {
    if (!ctx.volume.from.length) return '';
    if (ctx.volume.cancelled) return 'İki yanındaki kart birbirine karşıt geldiği için bu kart temiz okunuyor; komşular birbirinin etkisini götürüyor.';
    const names = ctx.volume.from.map((item) => nameOf(item.key));
    const who = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} ve ${names[names.length - 1]}`;
    if (ctx.volume.band === 'very_loud') return `${who} bu enerjiyi çok yükseltiyor; kart burada yüksek sesle konuşuyor.`;
    if (ctx.volume.band === 'loud') return `${who} bu enerjiyi belirginleştiriyor; kart bu pozisyonda öne çıkıyor.`;
    if (ctx.volume.band === 'quiet') return `${who} bu kartın sesini kısıyor; anlam duruyor, daha kısık duyuluyor.`;
    if (ctx.volume.band === 'muffled') return `${who} bu enerjiyi bastırıyor; kaybolmuyor, yalnızca zor duyuluyor.`;
    return `${who} yanında dengeli duruyor; enerji ne bastırılıyor ne de abartılıyor.`;
  }

  // Her yer kendi fiilini kullanır. Aynı kart başka koltuğa geçince cümle de değişir.
  const PLACE_ANSWER = {
    today: (n, kw, gist) => `${n} günün tek yerinde. Bugün bakılacak nokta ${kw}: ${gist}`,
    past: (n, kw, gist) => `${n} geçmişin yerinde. Buraya gelmeni hazırlayan etki ${kw}: ${gist}`,
    present: (n, kw, gist) => `${n} şimdinin yerinde. Olup bitenin kendisi ${kw}: ${gist}`,
    future: (n, kw, gist) => `${n} geleceğin yerinde. Bu bir hüküm değil; gidişat ${kw} yönüne eğiliyor: ${gist}`,
    self: (n, kw, gist) => `${n} senin yerinde. Bu konuya sen ${kw} getiriyorsun: ${gist}`,
    other: (n, kw, gist) => `${n} karşı tarafın yerinde. Ne düşündüğünü söylemez; ilişkiye ${kw} taşıdığını anlatır: ${gist}`,
    bond: (n, kw, gist) => `${n} bağın yerinde. Aranızdaki şeyin doğası ${kw}: ${gist}`,
    obstacle: (n, kw, gist) => `${n} engelin yerinde. ${kw} burada yolu açmıyor, eşiği kuruyor: ${gist}`,
    potential: (n, kw, gist) => `${n} potansiyelin yerinde. En iyi ihtimal ${kw} tarafına açılıyor: ${gist}`,
    situation: (n, kw, gist) => `${n} durumun yerinde. Kararın özü ${kw}: ${gist}`,
    a_path: (n, kw, gist) => `${n} ilk yolun yerinde. Bu yol seçilirse süreç ${kw} ile yürür: ${gist}`,
    a_outcome: (n, kw, gist) => `${n} ilk yolun varış yerinde. Bu bir hüküm değil; eğilim ${kw}: ${gist}`,
    b_path: (n, kw, gist) => `${n} ikinci yolun yerinde. Bu yol seçilirse süreç ${kw} ile yürür: ${gist}`,
    b_outcome: (n, kw, gist) => `${n} ikinci yolun varış yerinde. Bu bir hüküm değil; eğilim ${kw}: ${gist}`,
    current: (n, kw, gist) => `${n} mevcut durumun yerinde. İşte ya da parada şimdi ${kw} var: ${gist}`,
    strength: (n, kw, gist) => `${n} gücün yerinde. Dayanabileceğin şey ${kw}: ${gist}`,
    advice: (n, kw, gist) => `${n} tavsiyenin yerinde. Atılacak adım ${kw} tarafında: ${gist}`,
    outcome: (n, kw, gist) => `${n} gidişatın yerinde. Devam eden yön ${kw} tarafına eğiliyor: ${gist}`,
    challenge: (n, kw, gist) => `${n} kesen kartın yerinde. Duruma karışan güç ${kw}: ${gist}`,
    crown: (n, kw, gist) => `${n} hedefin yerinde. Bilinçli olarak uzanılan şey ${kw}: ${gist}`,
    root: (n, kw, gist) => `${n} kökün yerinde. Altta duran sebep ${kw}: ${gist}`,
    environment: (n, kw, gist) => `${n} çevrenin yerinde. Dışarıdan gelen etki ${kw}: ${gist}`,
    hopes_fears: (n, kw, gist) => `${n} umut ile korkunun yerinde. İkisi birden ${kw} içinden konuşuyor: ${gist}`,
  };

  function placedClaim(position, card, drawn, cardsApi) {
    const kw = keywordsOf(card, drawn.reversed, cardsApi).map((item) => lower(item)).join(', ');
    const name = cardLabel(card, drawn.reversed);
    const gist = trimDot(firstSentence(drawn.reversed ? card.reversed : card.upright));
    const answer = PLACE_ANSWER[position.key] || ((n, themes, body) => `${n} bu yerde ${themes} anlatıyor: ${body}`);
    const text = answer(name, kw, gist);
    return /[.!?]$/.test(text) ? text : `${text}.`;
  }

  function positionText(position, drawn, reading, spread, cardsApi, plan, nameOf) {
    const card = cardsApi.getCard(drawn.cardId);
    const ctx = plan.positions.find((item) => item.key === position.key);
    const claim = placedClaim(position, card, drawn, cardsApi);
    const shortClaim = placedClaim(position, card, drawn, cardsApi).replace(/:.*$/, '.');
    const volume = volumeSentence(ctx, nameOf);
    const links = plan.surface.links
      .filter((link) => link.from === position.key)
      .map((link) => REL_SENTENCE[link.relation](nameOf(position.key), nameOf(link.with)));
    const hedge = 'Bunu kesin bir hüküm olarak değil, üzerine düşünebileceğin bir eğilim olarak al.';
    const optional = [];
    if (ctx.qualityTilt) {
      const bits = Object.keys(ctx.qualityTilt).map((key) => QUAL_TR[key]).filter(Boolean);
      if (bits.length) optional.push(`Yanlardan gelen nitelik ${bits.join(' ve ')} bir tona çekiyor.`);
    }
    if (drawn.reversed) optional.push('Ters durduğu için bu yerde anlam gecikmeli ya da içe dönük yaşanıyor; düz anlam silinmiyor.');
    if (card.arcana === 'minor') {
      const suit = cardsApi.SUITS[card.suit];
      optional.push(`${suit.nameTr} (${suit.element}) bu yeri ${lower(suit.area)} alanına bağlıyor.`);
    } else if (card.loveWork && (spread.id === 'relationship' || spread.id === 'career')) {
      optional.push(card.loveWork);
    } else if (!drawn.reversed) {
      optional.push('Bu bir Major Arcana kartı; bu yerde konu gündelik bir ayrıntıdan çok daha geniş bir döngüye işaret ediyor.');
    }
    optional.push(`Bu yerin sorusu şu: ${displayPrompt(position, reading)}`);
    const seat = position.index === 1 ? 'first' : position.index === spread.positions.length ? 'last' : '';
    const bound = questionSeat(questionLens(reading, spread), seat);

    const build = (body, extras) => [body, volume, ...links, ...extras, bound, hedge].filter(Boolean).join(' ');
    let extras = optional.slice();
    let text = build(claim, extras);
    while (wordCount(text) > 140 && extras.length) {
      extras.pop();
      text = build(claim, extras);
    }
    if (wordCount(text) > 140) text = build(shortClaim, []);
    const pads = [
      'Yer değişirse aynı kart başka bir soruya cevap verir.',
      'Komşular bu koltuğun sesini değiştirir; kartın oturduğu yer sorunun kendisidir.',
      'Bu yüzden kartı yerinden ayırıp tek başına okumak, açılımın söylediğini eksik bırakır.',
    ];
    for (const pad of pads) {
      if (wordCount(text) >= 60) break;
      text = `${text} ${pad}`;
    }
    return text;
  }

  function dailyText(drawn, cardsApi) {
    const card = cardsApi.getCard(drawn.cardId);
    const bits = String(drawn.reversed ? card.reversed : card.upright)
      .split(/[,.]/)
      .map((bit) => bit.replace(/\s+/g, ' ').trim())
      .filter((bit) => bit.length > 2)
      .slice(0, 3)
      .map((bit) => bit.charAt(0).toLocaleLowerCase('tr') + bit.slice(1));
    const focus = bits[0] || lower(card.keywords[0]);
    const list = bits.length <= 1 ? focus : bits.length === 2 ? `${bits[0]} ya da ${bits[1]}` : `${bits.slice(0, -1).join(', ')} ya da ${bits[bits.length - 1]}`;
    const turn = drawn.reversed
      ? 'Ters geldiği için bugün bu tam açılmayabilir; bir gecikme ya da içine attığın bir hal olarak gelebilir.'
      : 'Düz geldiği için bugün bu hal sana yakın durabilir.';
    return {
      summary: `Bugün ${card.nameTr} ile açılıyorsun. Gün, ${focus} etrafında dönebilir. ${drawn.reversed ? 'Enerji içe dönük ya da gecikmeli gelebilir.' : 'Bu enerji bugün görünür bir kapı gibi durabilir.'}`,
      text: `Bugün sana ${card.nameTr} geldi. Gün, ${list || focus} etrafında dönebilir. ${turn} Gün içinde bu hal nerede belirirse, kart orada konuşuyor demektir. Bunu tek bir saate bağlama; günün herhangi bir anında çıkabilir. Akşama her şeyi bitirmek zorunda değilsin. Bugün bu hale küçük bir yer açman yeter. Acele bir hüküm kurma.`,
    };
  }

  function headlineSentence(id, global, cardsApi) {
    const elTr = motor().EL_TR;
    if (id === 'majorWeight') return `Major Arcana ağırlıkta; ${global.major.count} büyük arkana kartı, konunun gündelik bir ayrıntıdan daha geniş bir döngüye bağlandığını gösteriyor.`;
    if (id === 'majorAbsent') return 'Hiç Major Arcana yok; konu gündelik ve büyük ölçüde senin elinde.';
    if (id === 'courtDensity') return `${global.courts.count} saray kartı var; burada kişiler, roller ya da bir haber öne çıkıyor.`;
    if (id === 'dominantElement') {
      const name = elTr[global.dominantElement.el];
      return `Baskın element ${name}: asıl konu ${ELEMENT_AREA[name]} alanında dönüyor.`;
    }
    if (id === 'missingElement') {
      const names = global.missingElement.els.map((el) => elTr[el]);
      return `${names.join(' ve ')} hiç yok; ${names.map((name) => ELEMENT_AREA[name]).join(' ile ')} tarafı ihmal ediliyor olabilir.`;
    }
    if (id === 'reversalRatio') {
      return global.reversal.lean === 'reversed'
        ? 'Kartların çoğu ters; bu bir tıkanıklığa ya da içe dönük bir döneme işaret ediyor.'
        : 'Kartların çoğu düz; enerji dışarıya, görünen eyleme dönük akıyor.';
    }
    if (id === 'valenceBalance') {
      if (global.valence.balance === 'heavy') return 'Genel ton ağır: kartlar zorlanan, sıkışan bir dönemi anlatıyor.';
      if (global.valence.balance === 'bright') return 'Genel ton parlak: kartlar açılan, desteklenen bir dönemi anlatıyor.';
      return 'Genel ton karışık: aydınlık ve gölge aynı okumada yan yana duruyor.';
    }
    if (id === 'valenceArc') return ARC_SENTENCE[global.valence.arc];
    return '';
  }

  function placementSentence(spread, reading, cardsApi) {
    const seats = spread.positions.map((position) => {
      const drawn = reading.cards.find((card) => card.positionKey === position.key);
      const card = cardsApi.getCard(drawn.cardId);
      return `${displayLabel(position, reading)}: ${cardLabel(card, drawn.reversed)}`;
    });
    return `${seats.join(', ')}.`;
  }

  function loudestSentence(plan, spread, reading, cardsApi) {
    const top = plan.positions.slice().sort((a, b) => b.salience - a.salience)[0];
    const position = spread.positions.find((item) => item.key === top.key);
    const drawn = reading.cards.find((card) => card.positionKey === top.key);
    const name = cardLabel(cardsApi.getCard(drawn.cardId), drawn.reversed);
    const label = displayLabel(position, reading);
    if (top.volume.cancelled) return `${label} yerindeki ${name} temiz okunuyor, çünkü yanları birbirini götürüyor.`;
    const voice = {
      very_loud: 'en yüksek sesle konuşuyor',
      loud: 'öne çıkıyor',
      normal: 'komşularıyla dengede duruyor',
      quiet: 'kısık kalıyor',
      muffled: 'bastırılmış duyuluyor',
    }[top.volume.band];
    return `${label} yerindeki ${name} bu açılımda ${voice}.`;
  }

  function summaryFromPlan(plan, spread, reading, cardsApi) {
    const frame = questionFrame(questionLens(reading, spread));
    const lines = [];
    if (frame) lines.push(frame);
    lines.push(placementSentence(spread, reading, cardsApi));
    const head = headlineSentence(plan.global.headline[0], plan.global, cardsApi);
    if (head) lines.push(head);
    if (lines.length < 3) lines.push(loudestSentence(plan, spread, reading, cardsApi));
    if (lines.length < 2) lines.push(ARC_SENTENCE[plan.global.valence.arc]);
    return lines.slice(0, 3).join(' ');
  }

  function celticMore(reading, cardsApi, plan) {
    const byKey = Object.fromEntries(reading.cards.map((d) => [d.positionKey, cardsApi.getCard(d.cardId)]));
    const rankName = { ace: 'As', two: 'İkili', three: 'Üçlü', four: 'Dörtlü', five: 'Beşli', six: 'Altılı', seven: 'Yedili', eight: 'Sekizli', nine: 'Dokuzlu', ten: 'Onlu', page: 'Prens', knight: 'Şövalye', queen: 'Kraliçe', king: 'Kral' };
    const repeated = plan.global.rank.repeated.length
      ? ` Tekrar eden ${plan.global.rank.repeated.map((rank) => rankName[rank] || rank).join(', ')} bu temaları güçlendiriyor.`
      : '';
    const arcs = plan.global.valence.arcs;
    const timeArc = arcs[0] ? ` Zaman çizgisi ${ARC_SHORT[arcs[0].arc]} bir seyir çiziyor.` : '';
    const staffArc = arcs[1] ? ` Sağdaki sütun ${ARC_SHORT[arcs[1].arc]} bir seyir çiziyor.` : '';
    const essence = plan.global.essenceCard
      ? ` Sayıların özü ${cardsApi.getCard(fromEngineId(plan.global.essenceCard)).nameTr} kartında toplanıyor.`
      : '';
    return `Haçın kalbinde ${byKey.present.nameTr} ile ${byKey.challenge.nameTr} karşılaşıyor: durumu belirleyen enerji ile ona karışan güç aynı anda çalışıyor. Sağdaki sütun ${byKey.self.nameTr} ile senden başlayıp ${byKey.outcome.nameTr} ile sonuca uzanıyor; aradaki ${byKey.environment.nameTr} ve ${byKey.hopes_fears.nameTr} kartları, çevrenin ve iç sesinin bu yolu nasıl renklendirdiğini gösteriyor.${timeArc}${staffArc}${essence}${repeated}`;
  }

  function echoNote(a, b, echoes) {
    const hit = echoes.find((line) => {
      const pair = line.split(':')[0];
      return pair.includes(a) && pair.includes(b);
    });
    if (!hit) return '';
    if (hit.includes('aynı element')) return ' İkisi aynı enerjiyi paylaşıyor.';
    if (hit.includes('karşıt elementler')) return ' Biri diğerine karşıt bir enerji taşıyor.';
    if (hit.includes('aynı rank')) return ' Aynı basamaktan geldikleri için tema tekrar ediyor.';
    return '';
  }

  const PAIR_FRAMES = {
    'present|challenge': (a, b) => `Durumun kalbinde ${a} var; ${b} ise buna karışan güç. İkisi birlikte, neyin seni meşgul ettiğini ve neyin önüne çıktığını yan yana koyuyor.`,
    'crown|root': (a, b) => `Bilinçli hedefin ${a} ile görünüyor, kök sebep ise ${b}. Hedef ile temel arasındaki mesafe, zorlanmanın nereden geldiğini anlatıyor.`,
    'past|future': (a, b) => `${a} geride kalan etki, ${b} yakında gelen. Bu çift, bir kapının kapanıp diğerinin aralanışını gösteriyor.`,
    'self|environment': (a, b) => `Senin tutumun ${a}, çevrenin etkisi ${b}. İçeriden ve dışarıdan gelen bu iki ses aynı yöne mi bakıyor, bunu tartabilirsin.`,
    'hopes_fears|outcome': (a, b) => `Umutların ve korkuların ${a} ile, gidişat ${b} ile beliriyor. Beklentin sonucu nasıl şekillendiriyor, bu çift ona dair bir ipucu veriyor.`,
  };

  function buildReadingPlan(reading, spread) {
    const engine = motor();
    const layout = engine.layoutById(spread.id);
    if (!layout) throw new Error('Açılım grafı yok: ' + spread.id);
    const draw = spread.positions.map((position) => {
      const drawn = reading.cards.find((card) => card.positionKey === position.key);
      return { cardId: toEngineId(drawn.cardId), reversed: !!drawn.reversed };
    });
    return JSON.parse(JSON.stringify(engine.buildPlan(layout, draw, {
      valence: engine.DOC_VALENCE,
      intent: SPREAD_INTENT[spread.id] || 'general',
      config: { reversals: reading.reversalsEnabled !== false },
    })));
  }

  function interpret(reading, spread, cardsApi) {
    const plan = buildReadingPlan(reading, spread);
    if (spread.id === 'daily') {
      const d = dailyText(reading.cards[0], cardsApi);
      return { summary: d.summary, positions: [{ positionKey: 'today', text: d.text }], source: 'template', engineVersion: plan.engineVersion, plan };
    }
    const byKey = Object.fromEntries(reading.cards.map((card) => [card.positionKey, card]));
    const nameOf = (key) => cardLabel(cardsApi.getCard(byKey[key].cardId), byKey[key].reversed);
    const result = {
      summary: summaryFromPlan(plan, spread, reading, cardsApi),
      positions: spread.positions.map((position) => ({
        positionKey: position.key,
        text: positionText(position, byKey[position.key], reading, spread, cardsApi, plan, nameOf),
      })),
      signals: signals(reading.cards, cardsApi),
      source: 'template',
      engineVersion: plan.engineVersion,
      plan,
    };
    if (spread.id === 'celtic') {
      result.summaryMore = celticMore(reading, cardsApi, plan);
      result.pairs = [['present', 'challenge'], ['crown', 'root'], ['past', 'future'], ['self', 'environment'], ['hopes_fears', 'outcome']]
        .map((keys) => ({ keys, text: PAIR_FRAMES[keys.join('|')](nameOf(keys[0]), nameOf(keys[1])) + echoNote(keys[0], keys[1], plan.surface.echoes) }));
    }
    if (spread.id === 'decision') {
      const side = (pathKey, outcomeKey, option) => {
        const path = byKey[pathKey];
        const outcome = byKey[outcomeKey];
        const pc = cardsApi.getCard(path.cardId);
        const oc = cardsApi.getCard(outcome.cardId);
        const gain = [path, outcome].filter((card) => !card.reversed).map((card) => lower(cardsApi.getCard(card.cardId).keywords[0]));
        const cost = [path, outcome].filter((card) => card.reversed).map((card) => lower(trimDot(cardsApi.getCard(card.cardId).reversed.split('.')[0])));
        const arc = plan.global.valence.arcs.find((item) => item.keys.includes(pathKey) && item.keys.includes(outcomeKey));
        const pathCtx = plan.positions.find((item) => item.key === pathKey);
        const voice = pathCtx.volume.cancelled
          ? 'Yolun ortasındaki kart temiz okunuyor, çünkü yanları birbirine karşıt.'
          : `Bu yolun sesi ${pathCtx.volume.band === 'quiet' || pathCtx.volume.band === 'muffled' ? 'kısık' : pathCtx.volume.band === 'very_loud' || pathCtx.volume.band === 'loud' ? 'yüksek' : 'dengede'}.`;
        const curve = arc ? ` Eğrisi ${ARC_SHORT[arc.arc]}, tonu ${BALANCE_SHORT[arc.balance]}.` : '';
        return `${option}: süreç ${pc.nameTr}${path.reversed ? ' (ters)' : ''}, varış ${oc.nameTr}${outcome.reversed ? ' (ters)' : ''}. `
          + (gain.length ? `Getirisi ${gain.join(' ve ')} yönünde. ` : 'Bu yolun getirisi hemen görünmüyor; sabır istiyor. ')
          + (cost.length ? `Bedeli: ${cost.join('; ')}. ` : `Bedeli, ${lower(pc.keywords[pc.keywords.length - 1])} temasının getirdiği sorumluluk. `)
          + voice + curve;
      };
      result.comparison = {
        a: side('a_path', 'a_outcome', reading.optionA || 'A'),
        b: side('b_path', 'b_outcome', reading.optionB || 'B'),
        note: 'Kartlar hangi yolu seçmen gerektiğini söylemez; iki yolun getirisini ve bedelini yan yana koyar. Hangisinin sana daha çok benzediğine sen karar verirsin.',
      };
    }
    return result;
  }

  const api = { createRng, randomSeed, deriveDeck, localDate, isCrisis, similarQuestions, createService, withRetry, signals, elementOf, interpret, displayLabel, displayPrompt, keywordsOf, readQuestion, memoryStorage };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TAROT_READING = api;
})(typeof window !== 'undefined' ? window : globalThis);
