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
    const health = { recovered: false, backupSaved: false, writeError: null };
    let recoveryRaw = null;
    let deviceId = null;
    function validReading(r) {
      if (!r || typeof r !== 'object' || typeof r.id !== 'string' || typeof r.userId !== 'string') return false;
      const spread = spreads.getSpread(r.spreadId);
      if (!spread || !['picking', 'revealing', 'complete', 'abandoned'].includes(r.status)) return false;
      if (typeof r.createdAt !== 'string' || !Number.isFinite(Date.parse(r.createdAt)) || !/^[0-9a-f]{32}$/.test(r.seed)) return false;
      if (!Array.isArray(r.cards) || r.cards.length > spread.cardCount) return false;
      if (['revealing', 'complete'].includes(r.status) && r.cards.length !== spread.cardCount) return false;
      if (['question', 'optionA', 'optionB', 'personName', 'completedAt', 'localDate'].some((key) => r[key] !== undefined && typeof r[key] !== 'string')) return false;
      if (r.completedAt && !Number.isFinite(Date.parse(r.completedAt))) return false;
      const seen = new Set();
      return r.cards.every((card, i) => {
        if (!card || card.positionKey !== spread.positions[i].key || !cardIds.includes(card.cardId) || typeof card.reversed !== 'boolean') return false;
        if (!Number.isInteger(card.fanIndex) || card.fanIndex < 0 || card.fanIndex >= cardIds.length || seen.has(card.fanIndex)) return false;
        seen.add(card.fanIndex);
        return true;
      });
    }
    const load = () => {
      let raw;
      let parsed;
      try {
        raw = storage.getItem(KEY);
        if (raw === null) return [];
        parsed = JSON.parse(raw);
      } catch (error) { parsed = null; }
      const list = Array.isArray(parsed) ? parsed.filter(validReading) : [];
      if (!Array.isArray(parsed) || list.length !== parsed.length) {
        health.recovered = true;
        recoveryRaw = raw;
        try { storage.setItem(KEY + '.recovery', raw); health.backupSaved = true; }
        catch (error) { health.backupSaved = false; }
      }
      return list;
    };
    const storageError = (cause) => Object.assign(new Error('Okuma bu cihazda kaydedilemedi.'), {
      code: cause.name === 'QuotaExceededError' ? 'storage-full' : 'storage-unavailable', cause
    });
    const save = (list) => {
      if (recoveryRaw !== null && !health.backupSaved) {
        throw Object.assign(new Error('Bozuk kayıtların yedeği alınamadı. Önce kayıtlarını dışa aktar.'), { code: 'storage-recovery' });
      }
      try { storage.setItem(KEY, JSON.stringify(list)); health.writeError = null; }
      catch (error) { const failure = storageError(error); health.writeError = failure.code; throw failure; }
    };
    const find = (list, id) => {
      const reading = list.find((r) => r.id === id);
      if (!reading) throw new Error('Okuma bulunamadı');
      return reading;
    };

    function priorReadings(list, reading) {
      return list.slice(0, list.findIndex((item) => item.id === reading.id))
        .filter((item) => item.userId === reading.userId && item.status === 'complete')
        .reverse();
    }

    function userId() {
      let id = storage.getItem(DEVICE);
      if (!id) {
        id = deviceId || 'anon-' + randomSeed(cryptoImpl).slice(0, 16);
        // Reading history remains available even when writes are blocked. Creating
        // or changing a reading still fails through save(), without losing data.
        try { storage.setItem(DEVICE, id); }
        catch (error) { health.writeError = storageError(error).code; }
      }
      deviceId = id;
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
      if (changed) {
        try { save(list); } catch (error) { /* Expiration must not block read-only startup. */ }
      }
    }

    // Bugünün günün kartları, eskiden yeniye. Ana ekran en son çekileni açar.
    function todaysDailies(list, uid, date) {
      return list
        .filter((r) => r.spreadId === 'daily' && r.userId === uid && r.localDate === date && r.status !== 'abandoned')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }

    async function createReading(input) {
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

    async function reveal(readingId, positionKey) {
      const list = load();
      const reading = find(list, readingId);
      const card = reading.cards.find((c) => c.positionKey === positionKey);
      if (card && !card.revealedAt) { card.revealedAt = now().toISOString(); save(list); }
      return wait(undefined);
    }

    function holisticResult(value, spread) {
      const oracle=root.TAROT_ORACLE || (typeof require==='function'?require('./oracle.js'):null);
      return oracle?.validateResult(value,spread.positions.map(p=>p.key)) || null;
    }
    function oracleState(value) {
      if(!value || !['pending','ready','local','unknown','failed'].includes(value.status))return null;
      if(value.ticket!==undefined && (typeof value.ticket!=='string'||value.ticket.length>2048))return null;
      if(value.reason!==undefined && (typeof value.reason!=='string'||value.reason.length>80))return null;
      return {status:value.status,...(value.ticket?{ticket:value.ticket}:{}),...(value.reason?{reason:value.reason}:{})};
    }
    function validInterpretation(value, spread) {
      if (!value || typeof value.summary !== 'string' || !Array.isArray(value.positions) || value.positions.length !== spread.cardCount) return false;
      if (['summaryMore', 'closing', 'closingSource', 'closingVoice'].some(key => value[key] !== undefined && typeof value[key] !== 'string')) return false;
      if (!value.positions.every((p, i) => p && p.positionKey === spread.positions[i].key && typeof p.text === 'string' &&
        ['seat', 'context', 'tie', 'meaning', 'area'].every(key => p[key] === undefined || typeof p[key] === 'string'))) return false;
      if (value.comparison !== undefined && (!value.comparison || !['a','b','note'].every(key => typeof value.comparison[key] === 'string'))) return false;
      if (value.pairs !== undefined && (!Array.isArray(value.pairs) || !value.pairs.every(pair => pair && typeof pair.text === 'string' &&
        Array.isArray(pair.keys) && pair.keys.length === 2 && pair.keys.every(key => spread.positions.some(p => p.key === key))))) return false;
      if(value.holistic!==undefined && !holisticResult(value.holistic,spread))return false;
      if(value.oracleState!==undefined && !oracleState(value.oracleState))return false;
      return true;
    }

    async function complete(readingId) {
      const list = load();
      const reading = find(list, readingId);
      const spread = spreads.getSpread(reading.spreadId);
      if (reading.cards.length !== spread.cardCount) throw new Error('Önce tüm kartları seç');
      const old = reading.interpretation;
      // Tamamlanmış okumalar bir kayıt: yeni yazım sürümü eski yorumu yeniden yazmaz.
      if (reading.status === 'complete' && validInterpretation(old, spread)) return wait(old);
      if (!validInterpretation(old, spread) || old.textVersion !== TEXT_VERSION) {
        const fresh = interpret(reading, spread, cards, priorReadings(list, reading));
        if (old && old.closingSource === 'llm' && typeof old.closing === 'string' && old.closing) Object.assign(fresh, { closing: old.closing, closingSource: 'llm', closingVoice: typeof old.closingVoice === 'string' ? old.closingVoice : undefined });
        const holistic=old && holisticResult(old.holistic,spread), savedState=old && oracleState(old.oracleState);
        if(holistic)Object.assign(fresh,{holistic,closing:holistic.general,closingSource:'llm'});
        if(savedState)fresh.oracleState=savedState;
        reading.interpretation = fresh;
        save(list);
      }
      return wait(reading.interpretation);
    }

    // Yorum ekranı açılınca okuma tamamlanmış sayılır ve "Okumalarım"a girer.
    async function markViewed(readingId) {
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

    async function abandon(readingId) {
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

    function previousReadings(readingId) {
      const list = load();
      const reading = find(list, readingId);
      return wait(priorReadings(list, reading).map(publicReading));
    }

    async function patch(readingId, changes) {
      const list = load();
      const reading = find(list, readingId);
      if (typeof changes.note === 'string') reading.note = changes.note.slice(0, 2000);
      save(list);
      return wait(undefined);
    }

    async function saveClosing(readingId, text, source) {
      const list = load();
      const reading = find(list, readingId);
      if (!reading.interpretation) return wait(null);
      const closing = String(text || '').trim().slice(0, 8000);
      reading.interpretation.closing = closing;
      reading.interpretation.closingSource = source === 'template' ? 'template' : 'llm';
      reading.interpretation.closingVoice = 'okuma-6';
      save(list);
      return wait(reading.interpretation);
    }

    async function saveHolistic(readingId,result,options={}) {
      const list=load(),reading=find(list,readingId),spread=spreads.getSpread(reading.spreadId);
      const normalized=holisticResult(result,spread);
      if(!normalized || options.source!=='llm' || !reading.interpretation)throw new Error('Geçersiz yorum');
      const savedState=oracleState({status:'ready',...(options.ticket?{ticket:options.ticket}:{})});
      if(!savedState)throw new Error('Geçersiz yorum kaydı');
      Object.assign(reading.interpretation,{holistic:normalized,closing:normalized.general,closingSource:'llm',oracleState:savedState});
      save(list);return wait(reading.interpretation);
    }
    async function saveOracleState(readingId,value) {
      const list=load(),reading=find(list,readingId),normalized=oracleState(value);
      if(!normalized || !reading.interpretation)throw new Error('Geçersiz yorum kaydı');
      reading.interpretation.oracleState=normalized;save(list);return wait(reading.interpretation);
    }

    // Aynı açılım ve benzer soru 24 saat içinde sorulduysa yumuşak uyarı için.
    function recentSimilar(spreadId, question) {
      const t = now().getTime();
      return load().some((r) => r.spreadId === spreadId && r.question && t - Date.parse(r.createdAt) < DAY && similarQuestions(r.question, question));
    }

    function storageStatus() {
      const hasBackup = storage.getItem(KEY + '.recovery') !== null;
      return { ...health, recovered: health.recovered || hasBackup, backupSaved: health.recovered ? health.backupSaved : hasBackup };
    }
    return { createReading, pick, reveal, complete, markViewed, abandon, get, dailyToday, draft, list: listReadings, previousReadings, patch, saveClosing, saveHolistic, saveOracleState, recentSimilar, publicReading, userId,
      storageStatus, recoveryBackup: () => recoveryRaw ?? storage.getItem(KEY + '.recovery') };
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

  // "Neye, nasıl, hangi…" ile açılan soru belli bir nesneyi değil bir yönü sorar; özel bir şey sayılmaz.
  const QUESTION_WH = /^(?:ne|neye|neyi|neden|niye|nasıl|nereye|nerede|hangi|hangisi|kim|kime|ne zaman)$/;

  function readQuestion(raw) {
    const text = displayQuestion(raw);
    if (!text) return { text: '', closed: false, particular: false };
    let topics = 0;
    let unknowns = 0;
    let closed = false;
    let wh = false;
    for (const token of questionTokens(raw)) {
      if (QUESTION_WH.test(token)) wh = true;
      if (isQuestionParticle(token)) { closed = true; continue; }
      if (QUESTION_FUNCTION.has(token)) continue;
      if (isQuestionTopic(token)) { topics += 1; continue; }
      if (isQuestionVerb(token)) continue;
      if (token.length >= 3) unknowns += 1;
    }
    return { text, closed, particular: unknowns > 0 && topics === 0 && !(wh && !closed) };
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
    return `${quote} Kartlar buna bir hükümle değil, bir yön göstererek cevap veriyor.`;
  }

  function questionSeat(lens, role) {
    if (!lens.text || !role) return '';
    if (role === 'first') {
      if (lens.particular) return 'Kartlar sorduğun o özel şeyi bilmez; bu yer, bu seçimin nasıl kurulduğunu söyler.';
      if (lens.closed) return 'Bu yer evet ya da hayır demez; eğilimin nereden geldiğini söyler.';
      return 'Sorduğun şeye ilk cevap bu kartın yerinden geliyor.';
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
      case 'other': return reading.personName ? `${reading.personName} (karşı taraf)` : 'Karşı taraf';
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

  // Kartın bu gelişteki anahtar kelimeleri. Düz Büyük Arkana kendi kelimelerini taşır; sayı ve saray kartlarında
  // kelimeler kartın anlamından gelir (sayının genel teması Kılıç Üçlüsü'ne "işbirliği" dedirtmesin), ters kartta ters anlamdan.
  function keywordsOf(card, reversed) {
    if (card.arcana === 'major' && !reversed) return card.keywords.slice(0, 3);
    const parts = themesOf(card, reversed).replace(/ bir tutum$/, '').split(/, | ve /).map((bit) => bit.trim()).filter(Boolean);
    return (parts.length ? parts : card.keywords).slice(0, 3);
  }

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

  function cardLabel(card, reversed) {
    return `${card.nameTr}${reversed ? ' (ters)' : ''}`;
  }

  // ---------- Okuyucu dili ----------
  // Her kart için dört parça: kartın anlamı (kart verisinden), bu yerde ne dediği, komşularının etkisi ve
  // soruya bağı. Motorun planı yalnızca belirgin olduğunda ve sade cümleyle söze girer.

  const TEXT_VERSION = 4;

  function repeatContext(reading, history) {
    const previous = (history || []).filter((item) => item.id !== reading.id && (!reading.userId || !item.userId || item.userId === reading.userId));
    const sameCard = spreadId => previous.filter((item) => item.spreadId === spreadId && item.cards && item.cards[0] && item.cards[0].cardId === reading.cards[0].cardId).length;
    const sameDraw = previous.filter((item) => item.spreadId === reading.spreadId && item.cards && item.cards.length === reading.cards.length &&
      reading.cards.every((card, i) => item.cards[i].positionKey === card.positionKey && item.cards[i].cardId === card.cardId && !!item.cards[i].reversed === !!card.reversed)).length;
    return { sameCardCount: reading.spreadId === 'daily' ? sameCard('daily') : 0, sameDrawCount: sameDraw };
  }
  const CONNECTOR = /^(?:ya da tersine|ya da|veya|ama|ancak|yani)\s+/i;

  function meaningOf(card, reversed) {
    return String((reversed ? card.reversed : card.upright) || '').replace(/\s+/g, ' ').trim();
  }

  // Aşk ya da iş açılımında Büyük Arkana'nın o alana dair cümlesi.
  function areaNote(card, spread) {
    if (!card.loveWork || !spread) return '';
    const parts = splitSentencesTr(card.loveWork);
    if (spread.id === 'relationship') return parts.filter((p) => !/^İşte\b/.test(p)).join(' ');
    if (spread.id === 'career') return parts.filter((p) => /^İşte\b/.test(p)).map((p) => p.replace(/^İşte\s+/, 'İş tarafında ')).join(' ');
    return '';
  }

  function splitSentencesTr(text) {
    return String(text || '').split(/(?<=[.!?])\s+/).map((p) => p.trim()).filter(Boolean);
  }

  function listTr(items) {
    if (items.length <= 1) return items[0] || '';
    return `${items.slice(0, -1).join(', ')} ve ${items[items.length - 1]}`;
  }

  // Kartın anlamından cümle içine oturan kısa temalar: "tutunmak, güvenlik ihtiyacı ve tutumluluk".
  function themesOf(card, reversed) {
    const usable = (text) => text.replace(/["“][^"”]+["”]:\s*/g, '').split(/[,.;:]/)
      .map((bit) => bit.replace(/\s+/g, ' ').trim().replace(CONNECTOR, ''))
      .filter((bit) => bit.length > 2 && bit.split(' ').length <= 6)
      .filter((bit) => !/değil|kartı|^(?:sen|seni|sana)\s/i.test(bit) && !/\s(?:var|yok)$/i.test(bit) && !/(?:[dt][ıiuü]r|s[ıiuü]n|[^\s]{3,}(?:[dt]a|[dt]e))$/i.test(bit))
      .map(lower);
    // "Ya da …" ile başlayan cümle kartın öbür okumasıdır; ilk okuma yeterince tema veriyorsa karışmaz.
    const sentences = splitSentencesTr(meaningOf(card, reversed));
    const main = sentences.filter((sentence, i) => i === 0 || !/^(?:ya da|veya)\b/i.test(sentence));
    let clauses = usable(main.join(' '));
    if (clauses.length < 2) clauses = usable(sentences.join(' '));
    const pool = clauses.length >= 2 ? clauses : [...clauses, ...card.keywords.map(lower)];
    const picked = [];
    let words = 0;
    for (const bit of pool) {
      if (picked.includes(bit)) continue;
      const n = bit.split(' ').length;
      if (picked.length >= 2 && words + n > 10) break;
      picked.push(bit);
      words += n;
      if (picked.length === 3) break;
    }
    // Parçalardan biri zaten "ve" taşıyorsa art arda iki "ve" okunmasın: virgülle dizilir.
    let text = picked.some((bit) => / ve /.test(bit)) ? picked.join(', ') : listTr(picked);
    // Saray kartları çoğu zaman bir kişiyi sıfatlarla anlatır: "aceleci, dürtüsel ve sabırsız" bir tutumdur.
    if (card.court && /(?:c[ıiuü]|l[ıiuü]|s[ıiuü]z|[ae]n|[ae]l)$/.test(text)) text += ' bir tutum';
    return text;
  }

  // Kartın bu gelişteki yüzü: zorlu mu, destekleyici mi. Zor kartların tersi çoğu zaman rahatlamadır.
  const HARD_UPRIGHT = new Set(['major-13', 'major-15', 'major-16', 'major-18', 'swords-02', 'swords-03', 'swords-05', 'swords-07', 'swords-08', 'swords-09', 'swords-10', 'cups-04', 'cups-05', 'wands-05', 'wands-10', 'pentacles-05']);
  const RELIEF_REVERSED = new Set(['major-15', 'major-18', 'swords-03', 'swords-05', 'swords-07', 'swords-08', 'swords-09', 'swords-10', 'cups-04', 'cups-05', 'wands-10', 'pentacles-05']);
  function toneOf(card, reversed) {
    if (reversed) return RELIEF_REVERSED.has(card.id) ? 'soft' : 'hard';
    return HARD_UPRIGHT.has(card.id) ? 'hard' : 'soft';
  }

  const optionName = (reading, side) => (side === 'a' ? reading.optionA : reading.optionB) || (side === 'a' ? 'A' : 'B');

  // Her yer kendi cümlesini kurar. Aynı kart başka bir yere geçince cevap da değişir.
  const SEAT = {
    today: (t) => `Bugünün teması ${t}. Gün içinde bu hal bir karşılaşmada, bir düşüncede ya da küçük bir kararda belirebilir.`,
    past: (t) => `Geçmişin yerinde bu kart var: geride kalan dönemde ${t} belirleyiciydi. Bugünkü tablonun bir kısmı oradan geliyor.`,
    present: (t) => `Şimdinin yerinde bu kart duruyor: şu an işin merkezinde ${t} var. Olup bitenin özü burada görünüyor.`,
    future: (t) => `Geleceğin yerinde bu kart var. Şimdiki gidişat sürerse ${t} öne çıkabilir; bu bir hüküm değil, yolun eğilimi.`,
    self: (t) => `Senin yerinde bu kart var: bu ilişkiye sen ${t} getiriyorsun. Kart senin tutumunu ve enerjini anlatıyor.`,
    other: (t, r) => `${r.personName || 'Karşı taraf'} ilişkiye ${t} taşıyor. Kart onun ne düşündüğünü söylemez; ilişkiye getirdiği enerjiyi gösterir.`,
    bond: (t) => `Aranızdaki bağın şu anki dokusu ${t} ile örülü. İkinizin arasında dolaşan duygu bu.`,
    obstacle: (t) => `Önünüzdeki eşik ${t} ile ilgili. Bu eşik yolu kapatmaz; üzerinde durmanız gereken yeri gösterir.`,
    potential: (t) => `İlişki en iyi ihtimalle ${t} yönünde açılabilir. Bu, ikinizin de besleyebileceği bir olasılık.`,
    situation: (t) => `Kararın özünde ${t} yatıyor. Seçimi zorlaştıran ya da anlamlı kılan şey bu.`,
    a_path: (t, r) => `${optionName(r, 'a')} yolunu seçersen süreç ${t} ile yürüyebilir. Bu yolun gündelik hali bu kartta görünüyor.`,
    a_outcome: (t, r) => `${optionName(r, 'a')} yolu ${t} yönüne varma eğiliminde. Bu bir hüküm değil; yolun nereye eğildiğini gösterir.`,
    b_path: (t, r) => `${optionName(r, 'b')} yolunu seçersen süreç ${t} ile yürüyebilir. Bu yolun gündelik hali bu kartta görünüyor.`,
    b_outcome: (t, r) => `${optionName(r, 'b')} yolu ${t} yönüne varma eğiliminde. Bu bir hüküm değil; yolun nereye eğildiğini gösterir.`,
    current: (t) => `İşte ya da parada şu an ${t} öne çıkıyor. Durduğun yer bu; işin bugünkü tonu bu kartta görünüyor.`,
    'career.obstacle': (t) => `Önündeki en büyük engel ${t} ile ilgili. Onu görmek, aşmanın ilk adımı.`,
    strength: (t) => `Dayanabileceğin güç ${t}. Zorlandığında buna yaslanabilirsin; bu kart sende zaten var olan bir kaynağı gösteriyor.`,
    advice: (t) => `Kartların tavsiyesi ${t} tarafında. Atabileceğin bir sonraki adım bu enerjiden geçiyor; onu gündelik bir davranışa çevirmeyi dene.`,
    outcome: (t) => `Bu yolda devam edersen ${t} öne çıkabilir. Kesin bir son değil; şimdiki yönün vardığı yer.`,
    'celtic.present': (t) => `Sorunun kalbinde ${t} var. Şu anki durumu en iyi anlatan kart bu.`,
    challenge: (t) => `Bu kart mevcut durumu kesiyor: seni zorlayan ya da duruma karışan güç ${t}. Hem engel hem ders olabilir.`,
    crown: (t) => `Bilinçli olarak uzandığın, ulaşabileceğin en iyi yer ${t}. Bu kart seni çeken hedefi ve ideali gösteriyor.`,
    root: (t) => `Durumun kökünde ${t} yatıyor. Görünenin altında çalışan sebep bu olabilir.`,
    'celtic.past': (t) => `Yakın geçmişte ${t} etkiliydi. Bu etki çekiliyor ama izi hâlâ duruyor.`,
    'celtic.future': (t) => `Yakında ${t} belirmeye başlayabilir. Kapıdaki bir sonraki hal bu.`,
    'celtic.self': (t) => `Bu duruma sen ${t} ile yaklaşıyorsun. Kart senin tutumunu gösteriyor.`,
    environment: (t) => `Çevrenden ve dış dünyadan gelen etki ${t}. Etrafındaki insanlar ya da koşullar bu enerjiyi taşıyor.`,
    hopes_fears: (t) => `Umutların ve korkuların ${t} etrafında düğümleniyor. İstediğin ile çekindiğin şey bazen aynı yerde durur.`,
    'celtic.outcome': (t) => `Gidişat böyle sürerse ${t} öne çıkabilir. Bu bir hüküm değil; bugünkü yönün vardığı yer.`,
  };

  // Destekleyici bir yere zor kart, zorlayıcı bir yere olumlu kart düştüğünde cümle kartın yüzüne göre kurulur.
  const SEAT_HARD = {
    strength: (t) => `Güç yerinde zorlu bir kart var: ${t}. Buradaki güç, bu halle yüzleşip ondan ders çıkarabilmekten geliyor.`,
    advice: (t) => `Tavsiye yerinde zorlu bir kart var: ${t}. Kartlar bunu yaşamanı değil, bu hali fark edip ona göre davranmanı öğütlüyor.`,
    potential: (t) => `Potansiyel yerinde zorlu bir kart var: ${t}. İlişkinin açılması, önce bu temanın konuşulmasına bağlı olabilir.`,
    crown: (t) => `Tacın yerinde zorlu bir kart var: ${t}. Uzandığın yer şu an bu halin gölgesinde; hedefini yeniden tanımlaman gerekebilir.`,
    future: (t) => `Geleceğin yerinde zorlu bir kart var. Şimdiki gidişat sürerse ${t} öne çıkabilir; bunu bir uyarı gibi oku, yön değişirse sonuç da değişir.`,
    outcome: (t) => `Bu yolda devam edersen ${t} öne çıkabilir. Bunu bir uyarı gibi oku: yön değişirse sonuç da değişir.`,
    'celtic.outcome': (t) => `Gidişat böyle sürerse ${t} öne çıkabilir. Bunu bir hüküm değil, bir uyarı gibi oku; kalpteki düğüm çözüldükçe sonuç da değişebilir.`,
    'celtic.future': (t) => `Yakında ${t} belirmeye başlayabilir. Bunu önceden görmek, o an geldiğinde hazırlıklı olmanı sağlar.`,
    a_outcome: (t, r) => `${optionName(r, 'a')} yolu ${t} yönüne varma eğiliminde. Bu yolun bedeli burada görünüyor; bu bir hüküm değil, bir uyarı.`,
    b_outcome: (t, r) => `${optionName(r, 'b')} yolu ${t} yönüne varma eğiliminde. Bu yolun bedeli burada görünüyor; bu bir hüküm değil, bir uyarı.`,
  };
  const SEAT_SOFT = {
    obstacle: (t) => `Engel yerinde aslında olumlu bir kart var: ${t}. Engel, bu iyi şeye fazla yaslanmak ya da onu kabul etmekte zorlanmak olabilir.`,
    'career.obstacle': (t) => `Engel yerinde aslında olumlu bir kart var: ${t}. Seni durduran, bu gücü henüz kullanmıyor olman olabilir.`,
    challenge: (t) => `Kesen kart olumlu bir enerji taşıyor: ${t}. Seni zorlayan, bu iyi şeyi hayatına almakta zorlanman olabilir.`,
  };

  const REVERSED_NOTE = {
    past: 'Kart ters geldiği için bu etki tam yaşanmamış, içte kalmış olabilir.',
    future: 'Kart ters geldiği için bu tema gecikmeli ya da zorlanarak gelebilir.',
    obstacle: 'Kart ters geldiği için engel dışarıdan çok içeriden, bir çekingenlikten geliyor olabilir.',
    challenge: 'Kart ters geldiği için bu güç açıkça değil, alttan alta çalışıyor olabilir.',
    advice: 'Kart ters geldiği için tavsiye önce neyi bırakman gerektiğine bakıyor.',
    strength: 'Kart ters geldiği için bu güç şu an uykuda; onu yeniden uyandırman gerekebilir.',
  };

  function seatFor(position, spread, tone) {
    const pick = (map) => map[`${spread.id}.${position.key}`] || map[position.key];
    return (tone === 'hard' && pick(SEAT_HARD)) || (tone === 'soft' && pick(SEAT_SOFT)) || pick(SEAT) || ((t) => `${position.label} yerinde ${t} öne çıkıyor.`);
  }

  function neighbourNames(ctx, nameOf) {
    const names = ctx.volume.from.slice(0, 2).map((item) => `${nameOf(item.key)}`);
    return names.length === 1 ? `${names[0]} kartı` : `${names.join(' ve ')} kartları`;
  }

  // Motorun ses ölçüsü: yalnızca kart belirgin biçimde güçlenip ya da kısıldığında söylenir.
  function contextSentence(ctx, nameOf) {
    if (!ctx || !ctx.volume.from.length) return '';
    if (ctx.volume.cancelled) return 'İki yanındaki kart birbirinin etkisini götürdüğü için bu kart sade ve temiz okunuyor.';
    const who = neighbourNames(ctx, nameOf);
    if (ctx.volume.band === 'very_loud') return `Yanındaki ${who} bu kartı çok güçlendiriyor; okumanın en yüksek sesi burada.`;
    if (ctx.volume.band === 'loud') return `Yanındaki ${who} bu kartı güçlendiriyor; bu yer okumada öne çıkıyor.`;
    if (ctx.volume.band === 'muffled') return `Yanındaki ${who} bu kartı bastırıyor; mesajı kaybolmuyor ama zor duyuluyor.`;
    return '';
  }

  function seatReading(position, drawn, reading, spread, cardsApi, plan, nameOf) {
    const card = cardsApi.getCard(drawn.cardId);
    const ctx = plan.positions.find((item) => item.key === position.key);
    const themes = themesOf(card, drawn.reversed);
    const tone = toneOf(card, drawn.reversed);
    let seat = seatFor(position, spread, tone)(themes, reading);
    if (drawn.reversed && tone === 'soft') seat += ' Kart ters geldiği için zor yüzü gevşiyor; bu bir rahatlama işareti olabilir.';
    else if (drawn.reversed) seat += ` ${REVERSED_NOTE[position.key] || 'Kart ters geldiği için bu enerji şimdilik tıkalı, gecikmeli ya da içe dönük yaşanıyor olabilir.'}`;
    const editorial = root.TAROT_NOTES || require('./card-notes.js');
    const category = editorial.contextOf(card.id, drawn.reversed, spread.id);
    const context = [category, contextSentence(ctx, nameOf)].filter(Boolean).join(' ');
    const role = position.index === 1 ? 'first' : position.index === spread.positions.length ? 'last' : '';
    const tie = questionSeat(questionLens(reading, spread), role);
    const text = [seat, context, tie].filter(Boolean).join(' ');
    return { seat, context, tie, text, themes, tone, meaning: meaningOf(card, drawn.reversed), area: drawn.reversed ? '' : areaNote(card, spread) };
  }

  // Aynı kart dizilimi tekrarlandığında sabit yer metnini yeni bir gözlem sorusuyla değiştir.
  const REPEAT_DETAIL_FRAMES = [
    ({ name, label, focus }) => `${label} yerindeki ${name} bu kez ${focus} konusunu ilk tepkinden ayırmanı öneriyor. Kartı görür görmez ne düşündün? Ardından yaşadığın somut olaya bak; ilk düşüncen o olayla gerçekten örtüşüyor mu?`,
    ({ name, label, focus }) => `${name}, ${label} için ${focus} yönünü açıyor. Önceki okumanda bu sözün karşılığını nerede aramıştın? Bugün aynı yeri değil, farklı bir anı düşün ve iki örnek arasındaki farkı adlandır.`,
    ({ name, label, focus }) => `Bu defa ${label} yerindeki ${name} ile bir sonuç aramak yerine ${focus} temasının hangi koşulda belirdiğini izle. Koşul değiştiğinde verdiğin tepki de değişiyor mu? Bunu küçük bir olay üzerinden tart.`,
    ({ name, label, focus }) => `${label} konumunda yine ${name} var. Buradaki ${focus} sana bir imkân gibi mi, dikkat gerektiren bir alan gibi mi geliyor? İki ihtimali de açık tut; hangisini destekleyen gerçek bir örneğin olduğunu kendine sor.`,
    ({ name, label, focus }) => `${name} kartının ${label} yerindeki sesi bu kez ${focus} ile ilgili. Geçen yorumdan aklında kalan cümleyi düşün. O cümle bugün hâlâ işe yarıyor mu, yoksa elindeki yeni bilgi başka bir soru mu açıyor?`,
    ({ name, label, focus }) => `${label} yerini ${name} dolduruyor; ${focus} temasına davranışların üzerinden bakabilirsin. Son günlerde neyi sürdürdün, neyi erteledin? Kartın anlattığını bu iki hareketten hangisi daha iyi açıklıyor?`,
    ({ name, label, focus }) => `Yeniden gördüğün ${name}, ${label} alanında ${focus} hakkında konuşuyor. Bu konuyu hayatının her yerine yaymadan tek bir bağlam seç. Orada senin etkin ne, dış koşulların etkisi ne? İkisini ayrı yaz.`,
    ({ name, label, focus }) => `${label} için gelen ${name} kartını bu sefer ${focus} açısından sınayabilirsin. Temayı doğrulayan bir olay bulmak kolay olabilir; ona uymayan bir olay da ara. Yorumun sınırını görmek, onu daha dürüst kılar.`,
    ({ name, label, focus }) => `${name} burada ${focus} temasını taşıyor, fakat ${label} yerindeki anlamını bugünkü durum belirler. İlk okumadan beri hangi isteğin ya da sınırın değişti? Değişmeyen kart ile değişen bakışını yan yana koy.`,
    ({ name, label, focus }) => `${label} yerinde tekrar ${name} belirdi. ${focus} üzerine hemen karar kurma; önce ne bildiğini, neyi yalnızca umduğunu ayır. Sonra bu kartın sorusuna bugün verebildiğin en somut yanıtı düşün.`,
  ];

  function repeatDetail(card, drawn, label, repeats, offset) {
    const parts = meaningOf(card, drawn.reversed).split(/[,.;]/).map((part) => part.trim().replace(/^(?:ya da|veya)\s+/i, '')).filter(Boolean);
    const focus = lower(parts[(repeats + offset) % (parts.length || 1)] || card.keywords[0]);
    const frame = REPEAT_DETAIL_FRAMES[(repeats - 1 + offset) % REPEAT_DETAIL_FRAMES.length];
    const text = frame({ name: card.nameTr, label, focus });
    return text + (drawn.reversed ? ` ${reversedDetail(card)}` : '');
  }

  function reversedDetail(card) {
    return toneOf(card, true) === 'soft'
      ? 'Ters gelişte zorlayıcı yan gevşeyebilir; kartın sunduğu rahatlama olasılığını kendi durumunla tart.'
      : 'Ters gelişte bu tema gecikmeli ya da içe dönük yaşanabilir; hangi kısmın sana uyduğunu gözlemle.';
  }

  function readingVariant(id) {
    return [...String(id || '')].reduce((hash, char) => (hash * 33 + char.charCodeAt(0)) >>> 0, 0) % 10;
  }

  const DAILY_FRESH_OPENINGS = [
    ({ name, focus }) => `${name} bugün ${focus} konusuna dikkat çekiyor. Bu sözü bütün güne yaymak yerine, hangi tek anda belirginleştiğini görmeye çalış.`,
    ({ name, focus }) => `Günün kartı ${name}; onun ${focus} yönü bir olayı farklı okumaya çağırabilir. Olayın kendisiyle ona verdiğin tepkiyi birbirinden ayır.`,
    ({ name, focus }) => `${name} ile açılan bu günde ${focus} temasını önce küçük seçimlerinde ara. Hangi davranışın bu söze yaklaşıyor, hangisi senden uzak duruyor?`,
    ({ name, focus }) => `Bugün ${name} kartındaki ${focus} sözüne bir soru gibi bak. Cevabı karttan hazır almak yerine, gün içinde karşılaştığın bir ayrıntıyla sınayabilirsin.`,
    ({ name, focus }) => `${focus} bugün ${name} kartının öne çıkan yanı. Sana yakın gelen bir örnek bul; ardından bu yoruma uymayan bir örnek de düşün.`,
  ];
  const DAILY_FRESH_ACTIONS = [
    'Akşama doğru aklında kalan örneği not et. Bir şeyi hemen çözmek zorunda değilsin; önce neyi gerçekten gördüğünü adlandırman yeter.',
    'Günün sonunda ilk düşüncenle sonradan fark ettiğin şeyi karşılaştır. Arada bir fark varsa, kartın sana açtığı yer orası olabilir.',
  ];

  const REPEAT_SUMMARY_FRAMES = [
    ({ subject, scope, count, focus }) => `Yeniden gelen ${subject}, ${focus} yönünü açıyor; ${scope} toplam ${count} kez karşılaştın. Önceki yorumla bugünkü durumun arasındaki farkı düşün.`,
    ({ subject, startScope, count, focus }) => `${startScope} toplam ${count} kez karşılaştın. Bu defa ${subject} için ${focus} temasının hangi olayda belirginleştiğine bak.`,
    ({ subject, startScope, count, focus }) => `Bugün ${subject} için ${focus} öne çıkıyor. ${startScope} toplam ${count} kez karşılaştın; bu aynı sonuca varman gerektiği anlamına gelmiyor.`,
    ({ subject, scope, count, startFocus }) => `${subject} yeniden dikkatini çekiyor; ${scope} toplam ${count} kez karşılaştın. ${startFocus} ile ilgili önceki varsayımını bugünkü bilginle sınayabilirsin.`,
    ({ subject, startScope, count, focus }) => `${startScope} toplam ${count} kez karşılaştın; ${subject} bu kez ${focus} yönünden okunabilir. Bu konuda neyin değiştiğini tek bir örnekle anlat.`,
    ({ subject, startScope, count, focus }) => `Bu kez ${subject} için ${focus} üzerinde dur. ${startScope} toplam ${count} kez karşılaştın; bildiğin şey ile beklediğin şeyi ayır.`,
    ({ subject, scope, count, startFocus }) => `${subject} yine karşında; ${scope} toplam ${count} kez karşılaştın. ${startFocus} temasını doğrulayan kadar ona uymayan bir olayı da hesaba kat.`,
    ({ subject, startScope, count, startFocus }) => `${startFocus} bugün ${subject} için seçilen odak. ${startScope} toplam ${count} kez karşılaştın; bakışındaki hangi ayrıntının değiştiğini fark et.`,
    ({ subject, startScope, count, focus }) => `${startScope} toplam ${count} kez karşılaştın; ${subject} için bugün ${focus} konuşuyor. İlk tepkinle yaşadığın somut olayı birbirinden ayır.`,
    ({ subject, startScope, count, focus }) => `Tekrar gelen ${subject} bu defa ${focus} temasını açıyor. ${startScope} toplam ${count} kez karşılaştın; bugün sana ait küçük bir adımı düşün.`,
  ];

  function repeatedSummary(subject, scope, count, focus) {
    const startScope = scope.charAt(0).toLocaleUpperCase('tr') + scope.slice(1);
    const startFocus = focus.charAt(0).toLocaleUpperCase('tr') + focus.slice(1);
    return REPEAT_SUMMARY_FRAMES[(count - 2) % REPEAT_SUMMARY_FRAMES.length]({ subject, scope, startScope, count, focus, startFocus });
  }

  function dailyText(drawn, cardsApi, repeats, variation) {
    const card = cardsApi.getCard(drawn.cardId);
    const bits = String(drawn.reversed ? card.reversed : card.upright)
      .split(/[,.]/)
      .map((bit) => bit.replace(/\s+/g, ' ').trim().replace(/^(?:ya da|veya)\s+/i, ''))
      .filter((bit) => bit.length > 2)
      .slice(0, 3)
      .map((bit) => bit.charAt(0).toLocaleLowerCase('tr') + bit.slice(1));
    const focus = bits[(repeats || variation) % (bits.length || 1)] || lower(card.keywords[0]);
    const list = bits.length <= 1 ? focus : bits.length === 2 ? `${bits[0]} ya da ${bits[1]}` : `${bits.slice(0, -1).join(', ')} ya da ${bits[bits.length - 1]}`;
    const turn = drawn.reversed
      ? reversedDetail(card)
      : 'Düz geldiği için bugün bu hal sana yakın durabilir.';
    return {
      summary: repeats
        ? repeatedSummary(card.nameTr, 'tamamladığın günlük okumalarda bu kartla', repeats + 1, focus)
        : `Bugün ${card.nameTr} ile açılıyorsun. Gün, ${focus} etrafında dönebilir. ${drawn.reversed ? reversedDetail(card) : 'Bu enerji bugün görünür bir kapı gibi durabilir.'}`,
      text: repeats
        ? repeatDetail(card, drawn, 'Bugün', repeats, 0)
        : variation
          ? `${DAILY_FRESH_OPENINGS[variation % DAILY_FRESH_OPENINGS.length]({ name: card.nameTr, focus })} ${DAILY_FRESH_ACTIONS[Math.floor(variation / DAILY_FRESH_OPENINGS.length) % DAILY_FRESH_ACTIONS.length]}${drawn.reversed ? ` ${reversedDetail(card)}` : ''}`
        : `Bugün sana ${card.nameTr} geldi. Gün, ${list || focus} etrafında dönebilir. ${turn} Gün içinde bu hal nerede belirirse, kart orada konuşuyor demektir. Bunu tek bir saate bağlama; günün herhangi bir anında çıkabilir. Akşama her şeyi bitirmek zorunda değilsin. Bugün bu hale küçük bir yer açman yeter. Acele bir hüküm kurma.`,
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

  // Okumanın kalbi: planda en çok öne çıkan kart, yeri ve teması.
  function heartSentence(plan, spread, reading, cardsApi) {
    const top = plan.positions.slice().sort((a, b) => b.salience - a.salience)[0];
    const position = spread.positions.find((item) => item.key === top.key);
    const drawn = reading.cards.find((card) => card.positionKey === top.key);
    const card = cardsApi.getCard(drawn.cardId);
    return `Okumanın kalbinde ${displayLabel(position, reading)} yerindeki ${cardLabel(card, drawn.reversed)} var: ${themesOf(card, drawn.reversed)}.`;
  }

  function summaryFromPlan(plan, spread, reading, cardsApi, repeats) {
    if (repeats) {
      const position = spread.positions[(repeats - 1) % spread.positions.length];
      const drawn = reading.cards.find((card) => card.positionKey === position.key);
      const card = cardsApi.getCard(drawn.cardId);
      const parts = meaningOf(card, drawn.reversed).split(/[,.;]/).map((part) => part.trim().replace(/^(?:ya da|veya)\s+/i, '')).filter(Boolean);
      const focus = lower(parts[repeats % (parts.length || 1)] || card.keywords[0]);
      return repeatedSummary(`${displayLabel(position, reading)} yerindeki ${cardLabel(card, drawn.reversed)}`, 'tamamladığın bu açılımda aynı dizilimle', repeats + 1, focus);
    }
    const frame = questionFrame(questionLens(reading, spread));
    const lines = [];
    if (frame) lines.push(frame);
    lines.push(heartSentence(plan, spread, reading, cardsApi));
    const head = headlineSentence(plan.global.headline[0], plan.global, cardsApi);
    lines.push(head || ARC_SENTENCE[plan.global.valence.arc]);
    return lines.filter(Boolean).slice(0, 3).join(' ');
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
    const essence = '';
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

  function interpret(reading, spread, cardsApi, history) {
    const plan = buildReadingPlan(reading, spread);
    const repeats = repeatContext(reading, history);
    if (spread.id === 'daily') {
      const d = dailyText(reading.cards[0], cardsApi, repeats.sameCardCount, readingVariant(reading.id));
      const card = cardsApi.getCard(reading.cards[0].cardId);
      const reversed = reading.cards[0].reversed;
      return {
        summary: d.summary,
        positions: [{ positionKey: 'today', text: d.text, seat: d.text, context: '', tie: '', themes: themesOf(card, reversed), meaning: meaningOf(card, reversed), area: '' }],
        source: 'template', engineVersion: plan.engineVersion, textVersion: TEXT_VERSION, plan,
      };
    }
    const byKey = Object.fromEntries(reading.cards.map((card) => [card.positionKey, card]));
    const nameOf = (key) => cardLabel(cardsApi.getCard(byKey[key].cardId), byKey[key].reversed);
    const result = {
      summary: summaryFromPlan(plan, spread, reading, cardsApi, repeats.sameDrawCount),
      positions: spread.positions.map((position) => {
        const drawn = byKey[position.key];
        const base = seatReading(position, drawn, reading, spread, cardsApi, plan, nameOf);
        if (!repeats.sameDrawCount) return { positionKey: position.key, ...base };
        const seat = repeatDetail(cardsApi.getCard(drawn.cardId), drawn, displayLabel(position, reading), repeats.sameDrawCount, position.index - 1);
        return { positionKey: position.key, ...base, seat, text: [seat, base.context, base.tie].filter(Boolean).join(' ') };
      }),
      signals: signals(reading.cards, cardsApi),
      source: 'template',
      engineVersion: plan.engineVersion,
      textVersion: TEXT_VERSION,
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

  const api = { createRng, randomSeed, deriveDeck, localDate, isCrisis, similarQuestions, createService, withRetry, signals, elementOf, interpret, repeatContext, displayLabel, displayPrompt, keywordsOf, readQuestion, memoryStorage, themesOf, meaningOf, areaNote, toneOf, TEXT_VERSION };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TAROT_READING = api;
})(typeof window !== 'undefined' ? window : globalThis);
