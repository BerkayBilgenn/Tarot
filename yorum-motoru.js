// Bağlamsal Yorum Motoru (cme-0.1). Kaynak: Tarot-Yorum-Motoru/kod/yorum-motoru.ts
// Tarayıcı ve Node'da aynı saf fonksiyonlar. Yorum cümlesi üretmez; Reading Plan üretir.
(function (root) {
  'use strict';

// Bağlamsal Yorum Motoru: referans uygulama (cme-0.1)
//
// Dokümandaki deterministik kuralların saf fonksiyon hali: aynı girdi, aynı plan.
// LLM ve rastgelelik yok. Yorum metni bu plandan ayrıca üretilir.
// Yalnızca silinebilir (erasable) TypeScript kullanır; Node 22+ ile doğrudan çalışır.

                                                    
                                                                
                                                                         
                                                                                   
                                                                                       
                                                   
                                                             

// ---------------------------------------------------------------- deste

                       
             
               
                                      
                                                     
                                                                         
              
                                                                                     
                                                    
 

const EL_TR                     = { fire: 'Ateş', water: 'Su', air: 'Hava', earth: 'Toprak' };
const SUIT_EL                   = { wands: 'fire', cups: 'water', swords: 'air', pentacles: 'earth' };
const SUITS         = ['wands', 'cups', 'swords', 'pentacles'];
const WORDS = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const COURTS = ['page', 'knight', 'queen', 'king'];
const MAJORS                 = [
  ['The Fool', 'air'], ['The Magician', 'air'], ['The High Priestess', 'water'], ['The Empress', 'earth'],
  ['The Emperor', 'fire'], ['The Hierophant', 'earth'], ['The Lovers', 'air'], ['The Chariot', 'water'],
  ['Strength', 'fire'], ['The Hermit', 'earth'], ['Wheel of Fortune', 'fire'], ['Justice', 'air'],
  ['The Hanged Man', 'water'], ['Death', 'water'], ['Temperance', 'fire'], ['The Devil', 'earth'],
  ['The Tower', 'fire'], ['The Star', 'air'], ['The Moon', 'water'], ['The Sun', 'fire'],
  ['Judgement', 'fire'], ['The World', 'earth'],
];
const cap = (s        ) => s[0].toUpperCase() + s.slice(1);

function digitalRoot(n        )         {
  return n === 0 ? 0 : 1 + ((n - 1) % 9);
}

function buildDeck()         {
  const deck         = [];
  MAJORS.forEach(([name, element], n) =>
    deck.push({ id: `major-${n}`, name, arcana: 'major', number: n, element, numeralRoot: digitalRoot(n) }));
  for (const suit of SUITS) {
    WORDS.forEach((w, i) =>
      deck.push({
        id: `${suit}-${i + 1}`, name: `${w} of ${cap(suit)}`, arcana: 'minor', number: i + 1,
        rankKey: w.toLowerCase(), suit, element: SUIT_EL[suit], numeralRoot: digitalRoot(i + 1),
      }));
    for (const c of COURTS)
      deck.push({ id: `${suit}-${c}`, name: `${cap(c)} of ${cap(suit)}`, arcana: 'court', rankKey: c, suit, element: SUIT_EL[suit] });
  }
  return deck;
}

const DECK         = buildDeck();
const byId = new Map(DECK.map((c) => [c.id, c]));
const byName = new Map(DECK.map((c) => [c.name, c]));

// ---------------------------------------------------------------- Elemental Dignities

const W                      = { same: 2, friendly: 1, workable: 0.5, contrary: -2 };

function rel(a    , b    )      {
  if (a === b) return 'same';
  const k = [a, b].sort().join('+');
  if (k === 'air+fire' || k === 'earth+water') return 'friendly';
  if (k === 'earth+fire' || k === 'air+water') return 'workable';
  return 'contrary'; // fire+water, air+earth
}

function toBand(s        )       {
  if (s >= 3) return 'very_loud';
  if (s >= 1.5) return 'loud';
  if (s > -1.5) return 'normal';
  if (s > -3) return 'quiet';
  return 'muffled';
}

                                                                         

// principal: dignity'si hesaplanan kartın elementi. flankers: 1 ya da 2 yan kartın elementi.
function volume(principal    , flankers      , w                      = W)         {
  // Yan kartlar birbirine karşıtsa etkileri birbirini götürür; orta kart temiz okunur.
  if (flankers.length === 2 && rel(flankers[0], flankers[1]) === 'contrary')
    return { score: 0, band: 'normal', cancelled: true };
  const score = flankers.reduce((s, f) => s + w[rel(principal, f)], 0);
  return { score, band: toBand(score), cancelled: false };
}

// Artı düzeni (relationship'te bond, celtic'te present): dört flanker iki eksende toplanır.
function volumeCross(principal    , axes            , w                      = W)         {
  let raw = 0;
  for (const [a, b] of axes) {
    if (rel(a, b) === 'contrary') continue; // eksen kendi içinde iptal olur
    raw += w[rel(principal, a)] + w[rel(principal, b)];
  }
  const score = raw / axes.length; // eksen sayısıyla ölçeklenir
  return { score, band: toBand(score), cancelled: false };
}

const QUAL                               = {
  fire: ['hot', 'dry'], air: ['hot', 'wet'], water: ['cold', 'wet'], earth: ['cold', 'dry'],
};

// Yan kartlardan gelen nitelikler; iki ya da daha fazla aynı nitelik gelirse metne tonu eklenir.
function qualityTilt(flankers      )                         {
  const c                         = {};
  for (const f of flankers) for (const q of QUAL[f]) c[q] = (c[q] ?? 0) + 1;
  return Object.fromEntries(Object.entries(c).filter(([, n]) => n >= 2));
}

// ---------------------------------------------------------------- valence, ikili ilişki, sayı

// Kutup: |valence| >= 1. Kartlardan biri nötrse yalnızca renk verir.
function pairRelation(a        , b        )               {
  const pa = Math.abs(a) >= 1;
  const pb = Math.abs(b) >= 1;
  if (!pa || !pb) return 'color';
  if (a > 0 && b > 0) return 'amplify';
  if (a < 0 && b < 0) return 'intensify';
  return a > 0 ? 'erode' : 'resolve';
}

function valenceBalance(v          )          {
  if (v.length === 0) return 'mixed';
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  if (m <= -0.7) return 'heavy';
  if (m >= 0.7) return 'bright';
  return 'mixed';
}

function valenceArc(v          )      {
  const n = v.length;
  if (n < 2) return 'flat';
  const min = Math.min(...v);
  const max = Math.max(...v);
  if (n === 2) { // iki kartta yalnızca fark bakılır
    const d = v[1] - v[0];
    return Math.abs(d) < 1 ? 'flat' : d > 0 ? 'ascending' : 'descending';
  }
  const xm = (n - 1) / 2;
  const ym = v.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  v.forEach((y, i) => { num += (i - xm) * (y - ym); den += (i - xm) ** 2; });
  const slope = num / den;
  if (slope * (n - 1) >= 1.5) return 'ascending';
  if (slope * (n - 1) <= -1.5) return 'descending';
  const iMin = v.indexOf(min);
  const iMax = v.indexOf(max);
  const nonInc = (a          ) => a.every((x, i) => i === 0 || x <= a[i - 1]);
  const nonDec = (a          ) => a.every((x, i) => i === 0 || x >= a[i - 1]);
  // V: tek çukur (minimuma kadar azalır, sonra artar). Λ: tek tepe.
  if (iMin > 0 && iMin < n - 1 && v[0] >= min + 1 && v[n - 1] >= min + 1 && nonInc(v.slice(0, iMin + 1)) && nonDec(v.slice(iMin))) return 'V';
  if (iMax > 0 && iMax < n - 1 && v[0] <= max - 1 && v[n - 1] <= max - 1 && nonDec(v.slice(0, iMax + 1)) && nonInc(v.slice(iMax))) return 'lambda';
  if (max - min < 1) return 'flat';
  return 'oscillating';
}

function numericRelation(a      , b      )                                                  {
  if (a.rankKey && a.rankKey === b.rankKey) return 'sameRank';
  if (a.arcana === 'minor' && b.arcana === 'minor' && Math.abs(a.number  - b.number ) === 1) return 'consecutive';
  if ((a.arcana === 'major' || b.arcana === 'major') && a.numeralRoot !== undefined && a.numeralRoot === b.numeralRoot) return 'echo';
  return undefined;
}

// Sayılı kartların toplamı, 21'i aşarsa basamaklar toplanır. Court sayılmaz.
function essenceCard(cards        )                     {
  const nums = cards.filter((c) => c.number !== undefined && c.arcana !== 'court').map((c) => c.number );
  if (nums.length === 0) return undefined;
  let s = nums.reduce((a, b) => a + b, 0);
  while (s > 21) s = String(s).split('').reduce((a, d) => a + Number(d), 0);
  return `major-${s}`;
}

                                
                                     
                          
                 
                                 
 

function numberSignals(arcs          , all        )                {
  let trend                                        ;
  let run = false;
  for (const seq of arcs) {
    for (let i = 0; i + 2 < seq.length; i++) {
      const t = seq.slice(i, i + 3);
      if (!t.every((c) => c.arcana === 'minor')) continue;
      const [a, b, c] = t.map((x) => x.number );
      if (a < b && b < c) { trend = trend ?? 'ascending'; if (b - a === 1 && c - b === 1) run = true; }
      if (a > b && b > c) { trend = trend ?? 'descending'; if (a - b === 1 && b - c === 1) run = true; }
    }
  }
  const nums = all.filter((c) => c.arcana === 'minor').map((c) => c.number );
  const uniq = [...new Set(nums)].sort((x, y) => x - y);
  const gaps           = [];
  if (uniq.length >= 2) for (let n = uniq[0] + 1; n < uniq[uniq.length - 1]; n++) if (!uniq.includes(n)) gaps.push(n);
  let level                                    ;
  if (nums.length) {
    const m = nums.reduce((a, b) => a + b, 0) / nums.length;
    level = m <= 4 ? 'low' : m >= 7 ? 'high' : 'mid';
  }
  return { trend, consecutiveRun: run, gaps, level };
}

// ---------------------------------------------------------------- olasılık tabanlı eşikler (kesin hesap)

function C(n        , k        )         {
  if (k < 0 || k > n) return 0n;
  let r = 1n;
  for (let i = 1; i <= k; i++) r = (r * BigInt(n - k + i)) / BigInt(i);
  return r;
}
const ratio = (num        , den        ) => Number((num * 1_000_000_000_000n) / den) / 1e12;

// P(X >= k): 78 kartlık destede K kartlık gruptan n çekimde en az k tane.
function tailHyper(K        , n        , k        , N = 78)         {
  let num = 0n;
  for (let j = Math.max(k, 0); j <= Math.min(K, n); j++) num += C(K, j) * C(N - K, n - j);
  return ratio(num, C(N, n));
}
// P(X >= k): p = 0.5 binom (terslik).
function tailBinom(n        , k        )         {
  let num = 0n;
  for (let j = Math.max(k, 0); j <= n; j++) num += C(n, j);
  return ratio(num, 1n << BigInt(n));
}
const EL_ORDER       = ['fire', 'water', 'air', 'earth'];
const EL_COUNTS = [21, 19, 19, 19]; // Ateş, Su, Hava, Toprak (majorElementMode: golden_dawn)

function* compositions(n        , parts        )                      {
  if (parts === 1) { yield [n]; return; }
  for (let i = 0; i <= n; i++) for (const rest of compositions(n - i, parts - 1)) yield [i, ...rest];
}
// P(en kalabalık element >= k): çok değişkenli hipergeometrik.
function tailElementMax(n        , k        )         {
  let num = 0n;
  for (const comp of compositions(n, 4)) {
    if (Math.max(...comp) < k) continue;
    let t = 1n;
    comp.forEach((x, i) => { t *= C(EL_COUNTS[i], x); });
    num += t;
  }
  return ratio(num, C(78, n));
}
function pAnyElementMissing(n        )         {
  let num = 0n;
  for (const comp of compositions(n, 4)) {
    if (!comp.includes(0)) continue;
    let t = 1n;
    comp.forEach((x, i) => { t *= C(EL_COUNTS[i], x); });
    num += t;
  }
  return ratio(num, C(78, n));
}
const pNoMajor = (n        ) => ratio(C(56, n), C(78, n));

function minK(tail                       , n        , thr        )                {
  for (let k = 0; k <= n; k++) if (tail(k) <= thr) return k;
  return null;
}
const LEVELS = { notable: 0.2, rare: 0.03 };

function thresholds(n        ) {
  const both = (fn                       ) => ({ notable: minK(fn, n, LEVELS.notable), rare: minK(fn, n, LEVELS.rare) });
  return {
    n,
    major: both((k) => tailHyper(22, n, k)),
    court: both((k) => tailHyper(16, n, k)),
    sameElement: both((k) => tailElementMax(n, k)),
    reversed: both((k) => tailBinom(n, k)),
    pNoMajor: pNoMajor(n),
    pAnyElementMissing: pAnyElementMissing(n),
  };
}

// ---------------------------------------------------------------- açılım grafı

                           
                                             
                                                                  
 
                         
                                             
                                                    
                         
                                                
                        
                         
                                                                   
                           
                              
                             
                                                              
                                                                  
 

// Serbest çekim: kullanıcı N kart seçtiğinde çizgi grafı.
function freeLayout(n        )         {
  const keys = Array.from({ length: n }, (_, i) => `c${i + 1}`);
  const fnBy                         = { opening: 'situation', development: 'path', turn: 'advice', outcome: 'outcome', message: 'message' };
  const role = (i        ) => {
    if (n === 1) return 'message';
    if (i === 0) return 'opening';
    if (i === n - 1) return 'outcome';
    if (n >= 4 && i === n - 2) return 'turn';
    return 'development';
  };
  const timeOf = (i        ) => {
    if (n === 1) return 'present';
    const t = i / (n - 1);
    return t < 0.34 ? 'past' : t < 0.67 ? 'present' : 'future';
  };
  const positions             = keys.map((key, i) => ({
    index: i + 1, key, time: timeOf(i), agent: 'self', function: fnBy[role(i)], arcRole: role(i),
  }));
  const dignity                = n < 2 ? [] : keys.map((k, i) => ({
    principal: k, flankers: [keys[i - 1], keys[i + 1]].filter((x)              => x !== undefined),
  }));
  const links = keys.slice(0, -1).map((k, i) => [k, keys[i + 1], 'chain']                             );
  const mirrors                     = [];
  if (n >= 3) for (let i = 0; i < n - 1 - i; i++) mirrors.push([keys[i], keys[n - 1 - i]]);
  return { id: `free-${n}`, positions, dignity, links, axes: [], mirrors, echoes: [], order: keys, arcs: n >= 2 ? [keys] : [] };
}

// ---------------------------------------------------------------- plan

                               
                         
                     
 
const DEFAULT_CONFIG               = { workableWeight: 0.5, reversals: true };

                                                                
                                                                                  
                                                                                                       

                       
               
                                              
                         
               
                                                
 
                                  
                                                 
                                                                                            
                                       
                
                   
 
                                
                                      
                                                         
                                            
                                       
                                                                        
                                                       
                        
                                                                                                  
                       
                     
 
                              
                        
                   
            
                               
                       
                               
                        
                                                                                                 
 

const VOLUME_BONUS                       = { very_loud: 1.5, loud: 1, normal: 0, quiet: -0.25, muffled: -0.5 };
const arcanaWeight = (c      ) =>
  c.arcana === 'major' ? 2 : c.arcana === 'court' ? 1.5 : c.number === 1 || c.number === 10 ? 1.5 : 1;

function buildPlan(layout        , draw             , opts             )              {
  const cfg               = { ...DEFAULT_CONFIG, ...opts.config };
  const w                      = { ...W, workable: cfg.workableWeight };
  const n = layout.positions.length;
  if (draw.length !== n) throw new Error(`${layout.id}: ${n} kart gerekir, ${draw.length} geldi`);

  const at                                                                              = {};
  layout.positions.forEach((pos, i) => {
    const card = byId.get(draw[i].cardId);
    if (!card) throw new Error(`bilinmeyen kart: ${draw[i].cardId}`);
    const val = opts.valence[card.id];
    const v = val === undefined ? 0 : draw[i].reversed ? (val.reversed ?? -val.upright) : val.upright;
    at[pos.key] = { card, reversed: draw[i].reversed, v, pos };
  });
  const ord = new Map(layout.order.map((k, i) => [k, i]));
  const dir = (principal        , flanker        )                         =>
    ord.get(flanker)  < ord.get(principal)  ? 'leadsIn' : 'leadsOut';

  const ctx                                  = {};
  for (const pos of layout.positions)
    ctx[pos.key] = {
      key: pos.key, cardId: at[pos.key].card.id, reversed: at[pos.key].reversed,
      volume: { score: 0, band: 'normal', cancelled: false, from: [] }, links: [], salience: 0,
    };

  // 1) ses seviyesi (Elemental Dignities)
  for (const d of layout.dignity) {
    const pr = at[d.principal].card.element;
    const flankKeys = 'axes' in d ? d.axes.flat() : d.flankers;
    const vol = 'axes' in d
      ? volumeCross(pr, d.axes.map(([a, b]) => [at[a].card.element, at[b].card.element]            ), w)
      : volume(pr, d.flankers.map((k) => at[k].card.element), w);
    ctx[d.principal].volume = {
      ...vol,
      from: flankKeys.map((k) => ({ key: k, rel: rel(pr, at[k].card.element), direction: dir(d.principal, k) })),
    };
    const tilt = qualityTilt(flankKeys.map((k) => at[k].card.element));
    if (Object.keys(tilt).length) ctx[d.principal].qualityTilt = tilt;
  }

  // 2) ikili ilişkiler: okuma sırasında önce gelen özne, sonra gelen niteleyici
                                                            
  const prio = { chain: 3, axis: 3, branch: 2, triad: 1 }         ;
  const linkMap = new Map           ();
  const add = (from        , to        , kind           ) => {
    const id = `${from}>${to}`;
    const ex = linkMap.get(id);
    if (!ex || prio[kind] > prio[ex.kind]) linkMap.set(id, { from, to, kind });
  };
  for (const [a, b, k] of layout.links) add(a, b, k);
  for (const d of layout.dignity) {
    const fl = 'axes' in d ? d.axes.flat() : d.flankers;
    for (const f of fl) (dir(d.principal, f) === 'leadsIn' ? add(f, d.principal, 'triad') : add(d.principal, f, 'triad'));
  }
  for (const l of linkMap.values()) {
    const a = at[l.from];
    const b = at[l.to];
    const link       = { with: l.to, edge: l.kind, relation: pairRelation(a.v, b.v), element: rel(a.card.element, b.card.element) };
    const nr = numericRelation(a.card, b.card);
    if (nr) link.numeric = nr;
    ctx[l.from].links.push(link);
  }

  // 3) vurgu (salience)
  for (const pos of layout.positions) {
    const c = ctx[pos.key];
    const bonus = pos.function === 'outcome' || pos.function === 'advice' ? 0.5 : 0;
    c.salience = arcanaWeight(at[pos.key].card) + VOLUME_BONUS[c.volume.band] + bonus;
  }
  const cand                                                                      = [];
  for (const l of linkMap.values()) {
    const link = ctx[l.from].links.find((x) => x.with === l.to) ;
    cand.push({ with: l.to, from: l.from, relation: link.relation, s: ctx[l.from].salience + ctx[l.to].salience + (link.numeric ? 1 : 0) });
  }
  cand.sort((a, b) => b.s - a.s);
  const surfaceLinks = cand.slice(0, 3).map(({ with: w2, from, relation }) => ({ with: w2, from, relation }));

  const echoes           = [];
  for (const [a, b] of [...layout.mirrors, ...layout.axes, ...layout.echoes]) {
    const ca = at[a].card;
    const cb = at[b].card;
    if (ca.element === cb.element) echoes.push(`${a} ↔ ${b}: aynı element (${EL_TR[ca.element]})`);
    else if (rel(ca.element, cb.element) === 'contrary') echoes.push(`${a} ↔ ${b}: karşıt elementler (${EL_TR[ca.element]}–${EL_TR[cb.element]})`);
    if (ca.rankKey && ca.rankKey === cb.rankKey) echoes.push(`${a} ↔ ${b}: aynı rank (${ca.rankKey})`);
  }

  // 4) bütünlük sinyalleri
  const cards = layout.positions.map((p) => at[p.key].card);
  const majors = cards.filter((c) => c.arcana === 'major').length;
  const courts = cards.filter((c) => c.arcana === 'court').length;
  const arcCards = layout.arcs.map((seq) => seq.map((k) => at[k].card));
  const arcVals = layout.arcs.map((seq) => seq.map((k) => at[k].v));
  const allVals = layout.positions.map((p) => at[p.key].v);
  const rankCount = new Map                ();
  for (const c of cards) if (c.rankKey) rankCount.set(c.rankKey, (rankCount.get(c.rankKey) ?? 0) + 1);
  const adj = new Set        ();
  for (const l of linkMap.values()) adj.add(`${l.from}|${l.to}`);
  const adjacentSame = [...adj].map((s) => s.split('|')).filter(([a, b]) => at[a].card.rankKey && at[a].card.rankKey === at[b].card.rankKey).map(([a]) => at[a].card.rankKey );

  const g                = {
    major: { count: majors, p: tailHyper(22, n, majors) },
    courts: { count: courts, p: tailHyper(16, n, courts) },
    rank: { repeated: [...rankCount].filter(([, c]) => c >= 2).map(([k]) => k), adjacentSame: [...new Set(adjacentSame)] },
    number: numberSignals(arcCards, cards),
    valence: {
      balance: valenceBalance(allVals),
      arc: arcVals.length ? valenceArc(arcVals[0]) : 'flat',
      arcs: layout.arcs.map((keys, i) => ({ keys, arc: valenceArc(arcVals[i]), balance: valenceBalance(arcVals[i]) })),
    },
    headline: [],
  };
  const ess = essenceCard(cards);
  if (ess) g.essenceCard = ess;

  const cand2                              = [];
  if (n >= 2) {
    if (majors >= 1 && g.major.p <= LEVELS.notable) cand2.push({ id: 'majorWeight', p: g.major.p });
    if (majors === 0 && pNoMajor(n) <= LEVELS.notable) cand2.push({ id: 'majorAbsent', p: pNoMajor(n) });
    if (courts >= 1 && g.courts.p <= LEVELS.notable) cand2.push({ id: 'courtDensity', p: g.courts.p });
    const cnt = EL_ORDER.map((e) => cards.filter((c) => c.element === e).length);
    const top = Math.max(...cnt);
    if (cnt.filter((x) => x === top).length === 1) {
      const p = tailElementMax(n, top);
      if (p <= LEVELS.notable) {
        g.dominantElement = { el: EL_ORDER[cnt.indexOf(top)], count: top, p };
        cand2.push({ id: 'dominantElement', p });
      }
    }
    const pm = pAnyElementMissing(n);
    const missing = EL_ORDER.filter((e, i) => cnt[i] === 0);
    if (missing.length && pm <= LEVELS.notable) {
      g.missingElement = { els: missing, p: pm };
      cand2.push({ id: 'missingElement', p: pm });
    }
    if (cfg.reversals) {
      const rev = draw.filter((d) => d.reversed).length;
      const p = tailBinom(n, Math.max(rev, n - rev));
      if (p <= LEVELS.notable) {
        g.reversal = { count: rev, p, lean: rev > n - rev ? 'reversed' : 'upright' };
        cand2.push({ id: 'reversalRatio', p });
      }
    }
    cand2.sort((a, b) => a.p - b.p); // p küçük = salience (-log10 p) büyük
    g.headline = cand2.slice(0, 3).map((x) => x.id);
    if (g.headline.length === 0) g.headline = ['valenceBalance', 'valenceArc'];
  }

  return {
    engineVersion: 'cme-0.1', spreadId: layout.id, n,
    question: { intent: opts.intent ?? 'general' },
    config: cfg,
    positions: layout.positions.map((p) => ctx[p.key]),
    global: g,
    surface: { links: surfaceLinks, echoes },
  };
}

  const LAYOUTS = [{"id":"daily","name":"Günün kartı","cardCount":1,"positions":[{"index":1,"key":"today","label":"Bugünün teması","time":"present","agent":"self","function":"message"}],"dignity":[],"links":[],"axes":[],"mirrors":[],"echoes":[],"order":["today"],"arcs":[]},{"id":"three","name":"Üç kart","cardCount":3,"positions":[{"index":1,"key":"past","label":"Geçmiş","time":"past","agent":"self","function":"situation"},{"index":2,"key":"present","label":"Şimdi","time":"present","agent":"self","function":"situation"},{"index":3,"key":"future","label":"Gelecek","time":"future","agent":"self","function":"outcome"}],"dignity":[{"principal":"past","flankers":["present"]},{"principal":"present","flankers":["past","future"]},{"principal":"future","flankers":["present"]}],"links":[["past","present","chain"],["present","future","chain"]],"axes":[],"mirrors":[["past","future"]],"echoes":[],"order":["past","present","future"],"arcs":[["past","present","future"]]},{"id":"relationship","name":"İlişki","cardCount":5,"positions":[{"index":1,"key":"self","label":"Sen","time":"present","agent":"self","function":"situation"},{"index":2,"key":"other","label":"O","time":"present","agent":"other","function":"situation"},{"index":3,"key":"bond","label":"Aradaki bağ","time":"present","agent":"shared","function":"situation"},{"index":4,"key":"obstacle","label":"Engel","time":"present","agent":"external","function":"challenge"},{"index":5,"key":"potential","label":"Potansiyel","time":"future","agent":"shared","function":"outcome"}],"dignity":[{"principal":"bond","axes":[["self","other"],["potential","obstacle"]]}],"links":[],"axes":[["self","other"],["potential","obstacle"]],"mirrors":[],"echoes":[],"order":["self","other","bond","obstacle","potential"],"arcs":[["self","other","bond","obstacle","potential"]]},{"id":"decision","name":"Karar (İki yol)","cardCount":5,"positions":[{"index":1,"key":"situation","label":"Durum","time":"present","agent":"self","function":"situation"},{"index":2,"key":"a_path","label":"A yolu","time":"future","agent":"self","function":"path"},{"index":3,"key":"a_outcome","label":"A sonucu","time":"future","agent":"self","function":"outcome"},{"index":4,"key":"b_path","label":"B yolu","time":"future","agent":"self","function":"path"},{"index":5,"key":"b_outcome","label":"B sonucu","time":"future","agent":"self","function":"outcome"}],"dignity":[{"principal":"a_path","flankers":["situation","a_outcome"]},{"principal":"b_path","flankers":["situation","b_outcome"]},{"principal":"a_outcome","flankers":["a_path"]},{"principal":"b_outcome","flankers":["b_path"]}],"links":[["situation","a_path","branch"],["a_path","a_outcome","chain"],["situation","b_path","branch"],["b_path","b_outcome","chain"]],"axes":[["a_path","b_path"],["a_outcome","b_outcome"]],"mirrors":[],"echoes":[],"order":["situation","a_path","a_outcome","b_path","b_outcome"],"arcs":[["situation","a_path","a_outcome"],["situation","b_path","b_outcome"]]},{"id":"career","name":"Kariyer / Para","cardCount":5,"positions":[{"index":1,"key":"current","label":"Mevcut durum","time":"present","agent":"self","function":"situation"},{"index":2,"key":"obstacle","label":"Engel","time":"present","agent":"external","function":"challenge"},{"index":3,"key":"strength","label":"Güçlü yan","time":"present","agent":"self","function":"resource"},{"index":4,"key":"advice","label":"Tavsiye","time":"present","agent":"self","function":"advice"},{"index":5,"key":"outcome","label":"Gidişat","time":"future","agent":"self","function":"outcome"}],"dignity":[{"principal":"obstacle","flankers":["current","strength"]},{"principal":"advice","flankers":["outcome"]},{"principal":"outcome","flankers":["advice"]}],"links":[["advice","outcome","chain"],["obstacle","advice","branch"]],"axes":[],"mirrors":[],"echoes":[["current","outcome"]],"order":["current","obstacle","strength","advice","outcome"],"arcs":[["current","obstacle","strength","advice","outcome"]]},{"id":"celtic","name":"Celtic Cross","cardCount":10,"positions":[{"index":1,"key":"present","label":"Mevcut durum","time":"present","agent":"self","function":"situation"},{"index":2,"key":"challenge","label":"Kesen kart","time":"present","agent":"external","function":"challenge"},{"index":3,"key":"crown","label":"Taç","time":"timeless","agent":"self","function":"hope_fear"},{"index":4,"key":"root","label":"Temel","time":"timeless","agent":"self","function":"hidden"},{"index":5,"key":"past","label":"Yakın geçmiş","time":"past","agent":"self","function":"situation"},{"index":6,"key":"future","label":"Yakın gelecek","time":"future","agent":"self","function":"outcome"},{"index":7,"key":"self","label":"Sen","time":"present","agent":"self","function":"situation"},{"index":8,"key":"environment","label":"Çevre","time":"present","agent":"external","function":"situation"},{"index":9,"key":"hopes_fears","label":"Umutlar ve korkular","time":"timeless","agent":"self","function":"hope_fear"},{"index":10,"key":"outcome","label":"Sonuç","time":"future","agent":"self","function":"outcome"}],"dignity":[{"principal":"present","axes":[["past","future"],["crown","root"]]},{"principal":"challenge","flankers":["present"]},{"principal":"self","flankers":["environment"]},{"principal":"environment","flankers":["self","hopes_fears"]},{"principal":"hopes_fears","flankers":["environment","outcome"]},{"principal":"outcome","flankers":["hopes_fears"]}],"links":[["present","challenge","axis"],["self","environment","chain"],["environment","hopes_fears","chain"],["hopes_fears","outcome","chain"]],"axes":[["crown","root"],["past","future"],["self","environment"],["hopes_fears","outcome"]],"mirrors":[],"echoes":[],"order":["past","root","present","challenge","crown","future","self","environment","hopes_fears","outcome"],"arcs":[["past","present","future"],["self","environment","hopes_fears","outcome"]]}];
  const layoutById = (id) => LAYOUTS.find((layout) => layout.id === id) || null;

  // Dokümandaki örnek valence tablosu. Tabloda olmayan kart nötr (0) sayılır.
  const DOC_VALENCE = {
    'major-16': { upright: -2, reversed: 1 },
    'major-17': { upright: 2, reversed: -1 },
    'major-18': { upright: -1 },
    'major-15': { upright: -2 },
    'swords-6': { upright: 1 },
    'swords-7': { upright: -1 },
    'wands-5': { upright: -1 },
    'pentacles-4': { upright: 0.5 },
    'cups-2': { upright: 2 },
    'pentacles-queen': { upright: 1 },
    'wands-1': { upright: 2 },
  };

  const api = {
    EL_TR, DECK, byId, byName, digitalRoot, W, rel, toBand, volume, volumeCross, qualityTilt,
    pairRelation, valenceBalance, valenceArc, numericRelation, essenceCard, numberSignals,
    tailHyper, tailBinom, tailElementMax, pAnyElementMissing, pNoMajor, minK, LEVELS, thresholds,
    freeLayout, DEFAULT_CONFIG, buildPlan, LAYOUTS, layoutById, DOC_VALENCE,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TAROT_ENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
