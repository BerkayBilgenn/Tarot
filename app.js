'use strict';

const MOBILE_BREAKPOINT = 900;
const NARROW_BREAKPOINT = 375;
const CARD_RATIO = 600 / 350;
const DECK_SIZE = 78;
const AUTO_SHUFFLE_MS = 1300;
const FLIP_MS = 600;

const TAROT = window.TAROT_CARDS;
const SPREADS = window.TAROT_SPREADS;
const ENGINE = window.TAROT_READING;
const ORACLE = window.TAROT_ORACLE;
const UI = window.TAROT_UI;
const MOTION = window.TAROT_MOTION;
const NOTES = window.TAROT_NOTES || { noteOf: () => null };


const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const stage = $('#app');
const panel = $('.reading-panel');
const body = $('#step-body');
const titleEl = $('#spread-title');
const instructionEl = $('#instruction');
const progressEl = $('#progress');
const backBtn = $('#back');
const secondaryBtn = $('#secondary');
const primaryBtn = $('#primary');
const reshuffleBtn = $('#reshuffle');
const BACK_MARK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ARROW_MARK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SHUFFLE_MARK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7h3.500c5 0 6 10 11 10H21m0 0-3-3m3 3-3 3M3 17h3.500c1.700 0 2.900-.7 3.900-1.800M21 7h-3.500c-1.700 0-2.900.7-3.900 1.800M21 7l-3-3m3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let onBack = () => {};
const statusEl = $('#status');
const announcer = $('#announcer');
const dialogs = {
  settings: $('#settings-dialog'),
  leave: $('#leave-dialog'),
  card: $('#card-dialog')
};

// ---------- Depolama, ayarlar, servis ----------

const storage = (() => {
  try {
    const probe = '__kd_probe';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch (error) {
    return ENGINE.memoryStorage();
  }
})();

const SETTINGS_KEY = 'kd.settings.v1';
const settings = Object.assign(
  { reversals: true, motion: null, sound: false, haptic: true, reminder: false, reminderTime: '09:00' },
  (() => { try { return JSON.parse(storage.getItem(SETTINGS_KEY)) || {}; } catch (error) { return {}; } })()
);
const saveSettings = () => storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
const systemReduced = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => (settings.motion ? settings.motion === 'reduced' : systemReduced.matches);
const applyMotion = () => {
  document.documentElement.dataset.motion = reduced() ? 'reduced' : 'full';
  MOTION.sync();
};

const service = ENGINE.createService({ cards: TAROT, spreads: SPREADS, storage, latency: 140 });

// Soru, seçenek ve kişi adı metinleri hiçbir event'e girmez.
const analytics = (window.__tarotEvents = []);
function track(name, props = {}) {
  const event = { name, props, at: new Date().toISOString() };
  analytics.push(event);
  document.dispatchEvent(new CustomEvent('tarot:analytics', { detail: event }));
}

// ---------- Haptic ve ses ----------

function haptic(ms) {
  if (settings.haptic && navigator.vibrate) navigator.vibrate(ms);
}

const sfx = (() => {
  let ctx = null;
  let riffleTimer = null;
  const audio = () => {
    if (!settings.sound) return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = ctx || new Ctx();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  function noise(duration, { from = 2400, to = from, q = 0.8, gain = 0.12 } = {}) {
    const c = audio();
    if (!c) return;
    const length = Math.ceil(c.sampleRate * duration);
    const buffer = c.createBuffer(1, length, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = c.createBufferSource();
    const filter = c.createBiquadFilter();
    const amp = c.createGain();
    filter.type = 'bandpass';
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(to, c.currentTime + duration);
    amp.gain.value = gain;
    src.buffer = buffer;
    src.connect(filter).connect(amp).connect(c.destination);
    src.start();
  }
  return {
    riffleStart() {
      if (!settings.sound) return;
      clearInterval(riffleTimer);
      const tick = () => { for (let i = 0; i < 6; i++) setTimeout(() => noise(0.03, { from: 3200, gain: 0.08 }), i * 45); };
      tick();
      riffleTimer = setInterval(tick, 600);
    },
    riffleStop() { clearInterval(riffleTimer); riffleTimer = null; },
    slide() { noise(0.18, { from: 1800, to: 900, gain: 0.1 }); },
    // Karıştırmanın küçük sesleri: kartların örtüde kayışı, iç içe geçişi ve kesilişi.
    tick(kind) {
      if (kind === 'riffle') noise(0.022, { from: 3400, gain: 0.07 });
      else if (kind === 'wash') noise(0.09, { from: 1400, to: 900, q: 0.5, gain: 0.035 });
      else noise(0.14, { from: 1600, to: 700, gain: 0.09 });
    },
    whoosh() { noise(0.35, { from: 600, to: 2600, q: 0.6, gain: 0.08 }); }
  };
})();

// ---------- Hareket yardımcıları ----------

const springCache = new Map();
const supportsLinear = window.CSS && CSS.supports('animation-timing-function', 'linear(0, 1)');

// Kütle 1 kabul edilen yayı örnekleyip CSS linear() eğrisine çevirir.
function spring(stiffness, damping) {
  const key = `${stiffness}/${damping}`;
  if (springCache.has(key)) return springCache.get(key);
  const dt = 1 / 240;
  let x = 0;
  let v = 0;
  let t = 0;
  const points = [0];
  while (t < 2) {
    for (let i = 0; i < 4; i++) {
      const a = stiffness * (1 - x) - damping * v;
      v += a * dt;
      x += v * dt;
      t += dt;
    }
    points.push(Math.round(x * 10000) / 10000);
    if (t > 0.15 && Math.abs(1 - x) < 0.002 && Math.abs(v) < 0.02) break;
  }
  points[points.length - 1] = 1;
  const result = supportsLinear
    ? { easing: `linear(${points.join(', ')})`, duration: Math.round(t * 1000) }
    : { easing: 'cubic-bezier(.2,.9,.3,1.05)', duration: Math.round(t * 1000) };
  springCache.set(key, result);
  return result;
}

function animate(el, keyframes, options) {
  if (!el || !el.animate) return Promise.resolve();
  const animation = el.animate(keyframes, options);
  return animation.finished.catch(() => {}).then(() => animation);
}

// ---------- Ölçek ve yerleşim ----------

const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;
const isNarrow = () => window.innerWidth < NARROW_BREAKPOINT;

// Sayfa artık ölçeklenmiyor: getBoundingClientRect CSS pikseli olarak doğrudan kullanılır.
const visualRect = (el) => el.getBoundingClientRect();
const localRect = (el) => el.getBoundingClientRect();

const LABEL_HEIGHT = { preview: 30, pick: 24, reveal: 84, reading: 40, share: 60 };
const MAX_CARD = { preview: 150, pick: 100, reveal: 240, reading: 190, share: 170 };

function frameFor(spread) {
  const ys = spread.positions.map((p) => p.slot.y);
  return Math.max(...ys) - Math.min(...ys) < 0.01 ? 'row' : 'map';
}

function slotsFor(spread, narrow) {
  const override = narrow ? SPREADS.NARROW_SLOTS[spread.id] : null;
  return spread.positions.map((p) => {
    const o = override && override[p.key];
    return { position: p, key: p.key, x: o ? o.x : p.slot.x, y: o ? o.y : p.slot.y, rot: p.slot.rot };
  });
}

// Numara rozetinin çapı (night.css .lay-index ile aynı). Rozet kartın üst kenarına yarı yarıya oturur.
const badgeSize = () => (window.innerWidth <= 400 ? 18 : 26);

// Kartın altına yerin adı sığmayan dizilimlerde kartlar numara rozeti taşır, adlar listede durur:
// Celtic Cross her yerde; telefonda açarken haritalı açılımlar (İlişki, Karar) ve beş kartlık sıra (Kariyer) da.
// Etiket payı kalkınca kartlar büyür.
function badged(spread, mode) {
  if (spread.id === 'celtic') return ['preview', 'reveal', 'reading'].includes(mode);
  // Telefonda yorumda kartın altında etiket yoktur; numara rozeti kartı listedeki ve anlatımdaki yerine bağlar.
  if (mode === 'reading' && isMobile()) return spread.cardCount > 1;
  return mode === 'reveal' && isMobile() && (frameFor(spread) === 'map' || spread.cardCount >= 5);
}
// Kartları açarken yerlerin adını ve açılan kartı gösteren liste (masaüstünde yanda, telefonda altta).
const usesLegend = (spread) => badged(spread, 'reveal');

// Celtic Cross seçilirken on kart sırasıyla bir şeride dizilir: haç ve sütun basık seçim alanına ancak
// minicik sığar, 1 ile 2 de üst üste biner. Şeritte kartlar yelpazedekiyle aynı boyda durur ve yerlerinin
// adını taşır; kartlar açılırken haça yerleşir. Yelpazenin yükselen uçlarına değmesin diye şerit gerekirse daralır.
function stripGeometry(spread, width, height) {
  const badge = badgeSize();
  const fan = UI.fanLayout(($('#fan-viewport') || {}).clientWidth || window.innerWidth, window.innerHeight);
  const opts = { height, ratio: CARD_RATIO, maxCard: fan.cardWidth, gapX: 0.16, labelH: 46, labelMin: 76, badgeRoom: Math.round(badge / 2) + 2, rowGap: 6, align: 'top' };
  // Kartın yay üzerindeki yükselişi: merkezden d uzaklıktaki kartın üst köşesi bu kadar yukarıdadır.
  const rise = (d) => fan.radius * (1 - Math.cos(d / fan.radius)) + (fan.cardWidth / 2) * Math.sin(Math.min(0.9, d / fan.radius));
  const clearance = isMobile() ? 8 : 14;
  const clears = (geo, w) => {
    const bottom = geo.slots[geo.slots.length - 1].top + geo.ch + geo.labelH;
    // Yer adı kartın iki yanından taşar (hücre genişliğinde); yelpazeye en yakın nokta adın ucudur.
    const half = geo.labels ? Math.max(geo.cw, geo.cellW - 4) / 2 : geo.cw / 2;
    const reach = Math.max(...geo.slots.map((s) => Math.abs(s.left + geo.cw / 2 - w / 2) + half));
    return height + clearance - bottom >= rise(reach) + 8;
  };
  // Her dizilim (tek satır, iki satır) yelpazeye değmeyene kadar daraltılır; kartı büyük olan seçilir.
  // Tek satır yerlerin adını da taşıdığı için kartı biraz küçük olsa da tercih edilir.
  const fitCols = (cols) => {
    let w = width;
    let geo = UI.stripLayout(spread.cardCount, { ...opts, width: w, cols: [cols] });
    for (let i = 0; i < 16 && !clears(geo, w); i++) {
      w *= 0.94;
      geo = UI.stripLayout(spread.cardCount, { ...opts, width: w, cols: [cols] });
    }
    return { geo, w };
  };
  const one = fitCols(spread.cardCount);
  const two = fitCols(Math.ceil(spread.cardCount / 2));
  const { geo, w } = one.geo.cw >= two.geo.cw * 0.9 ? one : two;
  const ox = (width - w) / 2;
  return {
    cw: geo.cw, ch: geo.ch, labelH: geo.labelH, cellW: geo.cellW, spanY: geo.rows - 1, strip: geo.labels ? 'labels' : 'badges',
    slots: spread.positions.map((p, i) => {
      const placed = geo.slots[i];
      return { position: p, key: p.key, x: placed.col, y: placed.row, rot: 0, side: 'below', left: Math.round(ox + placed.left), top: placed.top };
    })
  };
}

// Slot birimini kapsayıcıya sığdırır: 1 birim = kart + boşluk.
function geometry(spread, width, height, mode, narrow, fit = {}) {
  if (mode === 'pick' && spread.cardCount > 1) {
    // Seçerken kartlar yelpazenin yükselen uçlarından uzak duran bir şeritte sırayla dizilir (sıra açılımları ve
    // Celtic Cross her ekranda); haritalı açılımlar şeritte kartlar belirgin biçimde büyüyorsa (telefonda hep) şeride geçer.
    // Kartlar açılırken dizilimdeki yerlerine uçar.
    const strip = stripGeometry(spread, width, height);
    if (spread.id === 'celtic' || frameFor(spread) === 'row') return strip;
    const map = slotGeometry(spread, width, height, mode, narrow, fit);
    return strip.cw > map.cw * 1.15 ? strip : map;
  }
  if (mode === 'reading' && spread.cardCount > 1 && isMobile()) {
    // Telefonda yorumun dizilimi anlatımın üstündeki basık alandadır: üç sıralı haritada (İlişki, Karar, Celtic Cross)
    // kartlar parmak ucu kadar kalır. Kartlar numaralı bir şeritte belirgin biçimde büyüyorsa sırayla şeride dizilir.
    const map = slotGeometry(spread, width, height, mode, narrow, fit);
    const strip = readingStrip(spread, width, height);
    return strip.cw > map.cw * 1.15 ? strip : map;
  }
  return slotGeometry(spread, width, height, mode, narrow, fit);
}

// Yorumun şeridi: kartlar sırasıyla tek satıra ya da iki satıra dizilir, numara rozeti taşır; hangisinde kart büyükse o.
function readingStrip(spread, width, height) {
  const geo = UI.stripLayout(spread.cardCount, { width, height, ratio: CARD_RATIO, maxCard: MAX_CARD.reading, gapX: 0.16, badgeRoom: Math.round(badgeSize() / 2) + 3, rowGap: 6 });
  return {
    cw: geo.cw, ch: geo.ch, labelH: 0, cellW: geo.cellW, spanY: geo.rows - 1, strip: 'badges',
    slots: spread.positions.map((p, i) => {
      const placed = geo.slots[i];
      return { position: p, key: p.key, x: placed.col, y: placed.row, rot: 0, side: 'below', left: placed.left, top: placed.top };
    })
  };
}

function slotGeometry(spread, width, height, mode, narrow, fit = {}) {
  const slots = slotsFor(spread, narrow);
  const celtic = spread.id === 'celtic';
  const tight = badged(spread, mode) || Boolean(fit.badged);
  const rowPreview = mode === 'preview' && frameFor(spread) === 'row';
  let labelH = LABEL_HEIGHT[mode];
  if (mode === 'reveal' && frameFor(spread) === 'map' && !celtic) labelH = isMobile() ? 56 : 82;
  if (mode === 'reading' && isMobile()) labelH = 0;
  if (rowPreview) labelH = isMobile() ? 80 : 100;
  if (mode === 'preview' && !celtic && !rowPreview) labelH = spread.id === 'relationship' ? 12 : (isMobile() ? 34 : 46);
  let maxCard = MAX_CARD[mode];
  if (rowPreview) maxCard = isMobile() ? 96 : 230;
  if (mode === 'preview' && celtic) maxCard = 130;
  if (mode === 'preview' && !celtic && !rowPreview) maxCard = 150;
  if (mode === 'reading' && spread.cardCount === 1) maxCard = 330;
  if (mode === 'reading' && celtic) maxCard = 150;
  if (mode === 'reveal' && celtic) maxCard = 190;
  if (tight) labelH = 0;
  // Çizilen etiket ayrılan paydan uzun çıktıysa (renderLayout ölçer) pay etiketin gerçek boyuna çıkar.
  else if (fit.labelH > labelH) labelH = fit.labelH;
  // Harita açılımlarında etiketlere yer açmak için hücreler yatayda geniş tutulur.
  // Celtic Cross'ta yatık kesen kart (2) kart boyunun yarısı kadar iki yana taşar; 1.5 hücre onu 5 ve 6'dan ayırır.
  const wideCells = !celtic && frameFor(spread) === 'map' && ['pick', 'reveal', 'reading'].includes(mode);
  const mapPreview = mode === 'preview' && frameFor(spread) === 'map' && !tight;
  const cellRatio = tight ? (celtic ? 1.5 : 1.3) : celtic ? 1.42 : wideCells ? 2.05 : 1.36;
  const gapRatio = tight ? 0.1 : mode === 'preview' && !celtic ? 0.08 : 0.14;
  // Rozet kartın üst kenarından yarı çapı kadar taşar; satır arası ondan dar olursa üstteki kartı ya da etiketi örter.
  const minGap = tight ? Math.round(badgeSize() / 2) + 6 : mapPreview ? 18 : 0;
  const xs = slots.map((s) => s.x);
  const ys = slots.map((s) => s.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...ys) - minY;
  // Numara rozetleri kartın üst kenarından taşar; üstteki başlığa ya da düğmeye binmesin diye onlara yer bırakılır.
  const badgeRoom = tight ? Math.round(badgeSize() / 2) + 3 : mapPreview ? 18 : 0;
  const byWidth = width / (spanX * cellRatio + 1);
  const byHeight = UI.stackCardWidth({ height: height - badgeRoom - labelH * (spanY + 1), rows: spanY + 1, ratio: CARD_RATIO, gapRatio, minGap });
  const cw = Math.max(8, Math.floor(Math.min(byWidth, byHeight, maxCard)));
  const ch = Math.round(cw * CARD_RATIO);
  const cellW = cw * cellRatio;
  const cellH = ch + labelH + Math.max(cw * gapRatio, minGap);
  const contentW = spanX * cellW + cw;
  const contentH = spanY * cellH + ch + labelH;
  const ox = (width - contentW) / 2;
  const oyBase = (height - contentH + badgeRoom) / 2;
  const oy = rowPreview ? Math.max(4, Math.min(oyBase, 12)) : oyBase;
  const uniform = {
    cw, ch, labelH, cellW, spanY,
    slots: slots.map((s) => ({ ...s, side: 'below', left: Math.round(ox + (s.x - minX) * cellW), top: Math.round(oy + (s.y - minY) * cellH) }))
  };
  // Kartları açarken harita açılımlarında kenardaki ve satırında yalnız kalan kartın etiketi yana alınır:
  // yalnızca ortadaki satır etiket payı taşır, kartlar büyür ve birbirine yaklaşır.
  if (mode !== 'reveal' || tight || frameFor(spread) !== 'map') return uniform;
  const labelW = Math.round(Math.max(118, Math.min(170, width * 0.15)));
  const side = UI.sideLabelLayout(slots, { width, height, ratio: CARD_RATIO, labelH, labelW, labelGap: 14, maxCard: 260 });
  if (!side || side.cw < cw * 1.08) return uniform;
  const placed = Object.fromEntries(side.slots.map((s) => [s.key, s]));
  return {
    cw: side.cw, ch: side.ch, labelH, cellW: side.cellW, spanY, labelW,
    slots: slots.map((s) => ({ ...s, side: placed[s.key].side, left: placed[s.key].left, top: placed[s.key].top }))
  };
}

// ---------- Durum ----------

const STEP_NUMBER = { intent: 1, confirm: 2, question: 3, shuffle: 4, pick: 5, reveal: 6, reading: 8 };

const state = {
  step: 'intent',
  intentId: null,
  spreadId: null,
  inputs: { question: '', optionA: '', optionB: '', personName: '' },
  readingId: null,
  reading: null,
  readingPromise: null,
  picks: [],
  revealed: new Set(),
  revealing: new Set(),
  pickChain: Promise.resolve(),
  interpretationPromise: null,
  startedAt: 0,
  viewOnly: false,
  renderToken: 0,
  busy: false,
  forceNew: false
};

const currentSpread = () => SPREADS.getSpread(state.spreadId);

function resetReading() {
  state.readingId = null;
  state.reading = null;
  state.readingPromise = null;
  state.picks = [];
  state.revealed = new Set();
  state.revealing = new Set();
  state.pickChain = Promise.resolve();
  state.interpretationPromise = null;
  state.viewOnly = false;
  state.busy = false;
  state.finishing = false;
  state.forceNew = false;
}

function resetInputs() {
  state.inputs = { question: '', optionA: '', optionB: '', personName: '' };
}

function readingContext() {
  return state.reading || { ...state.inputs };
}

function labelFor(position) {
  return ENGINE.displayLabel(position, readingContext());
}

// ---------- Başlık, aksiyon satırı, duyurular ----------

// Başlık değişince kelimeleri sırayla belirir; alt satır değişince yumuşakça yükselir.
let shownTitle = null;
function setHeading(title, instruction, { strong = '' } = {}) {
  if (title !== shownTitle) {
    shownTitle = title;
    if (reduced()) titleEl.textContent = title;
    else MOTION.titleWords(titleEl, title);
  }
  const before = instructionEl.textContent;
  instructionEl.textContent = instruction || '';
  if (strong) {
    const em = document.createElement('strong');
    em.textContent = strong;
    instructionEl.append(em);
  }
  if (instructionEl.textContent && instructionEl.textContent !== before) MOTION.enter([instructionEl], { y: 8, blur: 4, duration: 560, delay: 180 });
}

function setProgress(text) {
  progressEl.hidden = !text;
  progressEl.textContent = text || '';
}

function setActions({ back: backOpt = false, secondary = null, reshuffle = null, primary = null, status = '', statusHtml = '' } = {}) {
  if (backOpt && typeof backOpt === 'object') {
    backBtn.hidden = false;
    backBtn.innerHTML = `${BACK_MARK}<span class="btn-label">${esc(backOpt.label)}</span>`;
    onBack = backOpt.onClick;
  } else {
    backBtn.hidden = !backOpt;
    backBtn.innerHTML = `${BACK_MARK}<span class="btn-label">Geri</span>`;
    onBack = back;
  }
  secondaryBtn.hidden = !secondary;
  secondaryBtn.textContent = secondary ? secondary.label : '';
  secondaryBtn.onclick = secondary ? secondary.onClick : null;
  reshuffleBtn.hidden = !reshuffle;
  reshuffleBtn.onclick = reshuffle ? reshuffle.onClick : null;
  primaryBtn.hidden = !primary;
  primaryBtn.disabled = Boolean(primary && primary.disabled);
  primaryBtn.innerHTML = primary ? `${esc(primary.label)}${primary.icon || (primary.arrow === false ? '' : ARROW_MARK)}` : '';
  primaryBtn.onclick = primary ? primary.onClick : null;
  if (statusHtml) statusEl.innerHTML = statusHtml;
  else statusEl.textContent = status || '';
  statusEl.classList.remove('is-alert');
  panel.classList.toggle('no-actions', !backOpt && !secondary && !reshuffle && !primary);
}

function announce(text) {
  announcer.textContent = '';
  requestAnimationFrame(() => { announcer.textContent = text; });
}

// ---------- Navigasyon ----------

const RENDERERS = {};

function clearConfirmChrome() {
  delete panel.dataset.frame;
  delete stage.dataset.frame;
  const meta = $('#spread-meta');
  if (meta) {
    meta.hidden = true;
    meta.replaceChildren();
  }
  const depth = $('#depth-slot');
  if (depth) depth.replaceChildren();
}

// Adım çubuğu: niyet ana sayfada, kartlar 2. adımda, yorum 3. adımda.
function paintFlowSteps() {
  const bar = $('#flow-steps');
  const current = state.step === 'reading' ? 3 : state.step === 'intent' ? 0 : 2;
  bar.hidden = current === 0 || (state.step === 'reading' && state.spreadId === 'daily');
  $$('[data-flow]', bar).forEach((li) => {
    const n = Number(li.dataset.flow);
    li.classList.toggle('is-done', n < current);
    li.classList.toggle('is-current', n === current);
    if (n === current) li.setAttribute('aria-current', 'step');
    else li.removeAttribute('aria-current');
  });
}

// Adım değişirken eski sahne yerinde sönerek çekilir, yenisi aşağıdan netleşerek gelir.
// Kartların aynı masada kaldığı geçişlerde (seçim → açma, açma → yorum) kartlar yerinden süzülür.
function go(step, options = {}) {
  const from = state.step;
  const flipBefore = step === 'reading' && from === 'reveal' && $('#layout')
    ? new Map($$('#layout .lay-slot').map((s) => [s.dataset.key, localRect(s)]))
    : null;
  const turnBefore = flipBefore ? new Map($$('#layout .lay-slot').map((s) => [s.dataset.key, $('.lay-rot', s).style.transform])) : null;
  const swap = from !== step && stage.dataset.view === 'home' && !options.fromPick && !flipBefore && body.firstElementChild;
  if (swap) MOTION.ghost(body);
  state.step = step;
  stage.dataset.step = step;
  stage.dataset.spread = state.spreadId || '';
  paintFlowSteps();
  state.renderToken++;
  body.classList.remove('no-enter');
  clearConfirmChrome();
  if (step !== 'intent') armHistory();
  const result = RENDERERS[step]({ ...options, flipBefore, turnBefore }, from);
  if (swap && step !== 'intent') MOTION.enter([body.firstElementChild], { y: 22, blur: 0, duration: 700, delay: 120 });
  if (options.focus !== false) requestAnimationFrame(() => titleEl.focus({ preventScroll: true }));
  return result;
}

function armHistory() {
  if (!history.state || history.state.kd !== 'app') history.pushState({ kd: 'app' }, '');
}

const inReading = () => state.step === 'shuffle' || state.step === 'pick' || state.step === 'reveal';

function back() {
  switch (state.step) {
    case 'confirm': return go('intent');
    case 'question': return go('confirm');
    case 'shuffle':
    case 'pick':
    case 'reveal': return openLeaveDialog();
    case 'reading': return go('intent');
    default: return undefined;
  }
}

window.addEventListener('popstate', () => {
  if (Object.values(dialogs).some((d) => d.open)) {
    Object.values(dialogs).forEach((d) => d.open && d.close());
    armHistory();
    return;
  }
  if (stage.dataset.view !== 'home') {
    showHome({ fromHistory: true });
    requestAnimationFrame(() => titleEl.focus({ preventScroll: true }));
    return;
  }
  if (state.step === 'intent') return;
  back();
  if (state.step !== 'intent' || inReading()) armHistory();
});

backBtn.addEventListener('click', () => onBack());

let pendingView = 'home';

function openLeaveDialog() {
  const picked = state.picks.length > 0;
  $('#leave-text').textContent = picked
    ? 'Seçtiğin kartlar taslak olarak saklanır. İstersen daha sonra kaldığın yerden devam edebilirsin.'
    : 'Karıştırma sıfırlanır ve bu okuma kaydedilmez.';
  dialogs.leave.returnValue = '';
  dialogs.leave.showModal();
}

dialogs.leave.addEventListener('close', async () => {
  const next = pendingView;
  pendingView = 'home';
  if (dialogs.leave.returnValue !== 'leave') return;
  if (!state.picks.length && state.readingPromise) {
    const { readingId, existing } = await state.readingPromise.catch(() => ({}));
    if (readingId && !existing) {
      await service.abandon(readingId);
      track('reading_abandoned', { spreadId: state.spreadId, lastStep: STEP_NUMBER[state.step] });
    }
  }
  resetReading();
  if (next === 'guide') { go('intent', { focus: false }); showGuide(); return; }
  if (next === 'history') { go('intent', { focus: false }); showHistory(); return; }
  go('intent');
});

// ---------- 1 · Niyet ----------

RENDERERS.intent = async () => {
  const token = state.renderToken;
  resetReading();
  setHeading('Biraz da kendini dinle.', 'Bir nefes al. Bugün kendine biraz daha yaklaş.');
  setProgress('');
  setActions();
  body.innerHTML = intentMarkup(null, null);
  bindIntent();
  const [draft, daily] = await Promise.all([service.draft(), service.dailyToday()]);
  if (token !== state.renderToken) return;
  if (draft || (daily && daily.status === 'complete')) {
    const scroll = $('.intent-picker', body)?.scrollLeft || 0;
    body.classList.add('no-enter');
    body.innerHTML = intentMarkup(draft, daily);
    bindIntent(scroll);
  }
};

// Masaüstünde kartlar imleci izler. Telefonda kartlar yatay bir karuselde durur; ortaya oturan kart seçilir.
function bindIntent(scroll = null) {
  const picker = $('.intent-picker', body);
  if (!picker) return;
  MOTION.bindTilt(picker, '.intent-art');
  const choices = $$('.intent-choice', picker);
  const middle = () => picker.scrollLeft + picker.clientWidth / 2;
  const centerOf = (choice) => choice.offsetLeft + choice.offsetWidth / 2;
  let raf = 0;
  let settle = 0;
  const paint = () => {
    raf = 0;
    const mobile = isMobile();
    choices.forEach((choice) => {
      if (!mobile) { choice.style.removeProperty('--ad'); return; }
      const d = Math.abs(centerOf(choice) - middle()) / choice.offsetWidth;
      choice.style.setProperty('--ad', Math.min(1.6, d).toFixed(3));
    });
  };
  picker.addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(paint);
    clearTimeout(settle);
    settle = setTimeout(() => {
      if (!isMobile()) return;
      const nearest = choices.reduce((best, c) => (Math.abs(centerOf(c) - middle()) < Math.abs(centerOf(best) - middle()) ? c : best));
      const input = $('input', nearest);
      if (!input.checked) {
        input.checked = true;
        selectIntentForHome(input.value);
        haptic(8);
      }
    }, 120);
  }, { passive: true });
  picker.addEventListener('change', (event) => {
    if (isMobile() && event.target.name === 'intent') centerIntent(event.target.closest('.intent-choice'), true);
  });
  picker.paint = paint;
  fitIntentCards(picker);
  if (isMobile()) {
    if (scroll !== null) picker.scrollLeft = scroll;
    else centerIntent($('input:checked', picker)?.closest('.intent-choice'), false);
  }
  paint();
}

// Telefonda karusel kartları ekranda gerçekten kalan boşluğa göre boyutlanır: yarım okuma bandı, günün kartı
// bağlantısı ya da kısa ekran ne kadar yer alırsa kart o kadar küçülür, ama adı okunur kalır (en az 84 px).
// Böylece hiçbir şey başlığa ya da "Açılıma başla" düğmesine binmez. Masaüstünde CSS'teki boyut geçerlidir.
const INTENT_ART_RATIO = 743 / 423.2;
function fitIntentCards(picker) {
  picker.style.removeProperty('--ic-w');
  const step = picker.closest('.intent-step');
  const choice = $('.intent-choice', picker);
  if (!isMobile() || !step || !choice) return;
  const cs = getComputedStyle(step);
  const kids = [...step.children].filter((el) => el.offsetParent);
  const used = kids.reduce((sum, el) => sum + el.offsetHeight, 0) + (kids.length - 1) * (parseFloat(cs.rowGap) || 0) + (parseFloat(cs.paddingTop) || 0);
  const free = step.clientHeight - used - 8;
  const width = choice.offsetWidth + free / INTENT_ART_RATIO;
  const cap = Math.min(window.innerWidth * 0.46, 200);
  picker.style.setProperty('--ic-w', `${Math.round(Math.max(84, Math.min(cap, width)))}px`);
}

function centerIntent(choice, smooth) {
  if (!choice) return;
  const picker = choice.parentElement;
  picker.scrollTo({ left: choice.offsetLeft + choice.offsetWidth / 2 - picker.clientWidth / 2, behavior: smooth && !reduced() ? 'smooth' : 'auto' });
}

// Ana sayfada seçim ile başlatma iki ayrı etkileşimdir. Seçim yalnızca arayüz durumudur.
let selectedIntentId = 'today';

function intentMarkup(draft, daily) {
  const banner = draft
    ? `<div class="draft-banner" role="region" aria-label="Yarım kalan okuma">
         <span class="banner-copy"><strong>Yarım kalan okuman var</strong><span class="banner-sep" aria-hidden="true"> · </span><span class="banner-name">${esc(UI.spreadDisplayName(SPREADS.getSpread(draft.spreadId).name))}</span></span>
         <button type="button" class="banner-link" data-action="resume" data-id="${esc(draft.id)}">Devam et <span aria-hidden="true">→</span></button>
         <button type="button" class="banner-close" data-action="discard" data-id="${esc(draft.id)}" aria-label="Yarım okumayı kapat">×</button>
       </div>`
    : '';
  const doneDaily = daily && daily.status === 'complete' ? daily : null;
  const choices = SPREADS.INTENTS.map((intent, i) => {
    const spread = SPREADS.getSpread(intent.spreadId);
    const drawn = intent.id === 'today' && doneDaily ? TAROT.getCard(doneDaily.cards[0].cardId) : null;
    const reversed = Boolean(drawn && doneDaily.cards[0].reversed);
    const art = drawn
      ? `<span class="intent-art is-face${reversed ? ' is-reversed' : ''}" aria-hidden="true"><img src="${esc(drawn.image)}" alt="" decoding="async"></span>`
      : '<span class="intent-art" aria-hidden="true"></span>';
    return `<label class="intent-choice" style="--i:${i}">
        <input type="radio" name="intent" value="${intent.id}"${intent.id === selectedIntentId ? ' checked' : ''}>
        ${art}
        <span class="intent-title">${esc(intent.title)}</span>
        <span class="intent-meta">${esc(SPREADS.chip(spread))}<span class="sr-only">. ${esc(intent.sub)}</span></span>
        ${drawn ? `<span class="done-badge">Bugün çekildi · ${esc(drawn.nameTr)}</span>` : ''}
      </label>`;
  }).join('');
  return `<div class="intent-step">${banner}
      <fieldset class="intent-picker"><legend class="sr-only">Açılımını seç</legend>${choices}</fieldset>
      <div class="intent-cta">
        <button type="button" class="btn btn-main" data-action="start">Açılıma başla ${ARROW_MARK}</button>
        ${doneDaily
          ? `<button type="button" class="link-button intent-redraw" data-action="redraw">${RENEW_MARK} Bugün için yeni bir kart çek</button>`
          : '<p class="intent-note">Sana yakın gelen yerden başla.</p>'}
      </div>
    </div>`;
}

function selectIntentForHome(id) {
  if (!SPREADS.INTENTS.some((intent) => intent.id === id)) return;
  selectedIntentId = id;
}

let starting = false;
async function startSelectedIntent() {
  if (starting) return undefined;
  starting = true;
  try { return await chooseIntent(selectedIntentId); } finally { starting = false; }
}

body.addEventListener('change', (event) => {
  if (event.target.name === 'intent') selectIntentForHome(event.target.value);
});

body.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.name === 'intent') {
    event.preventDefault();
    startSelectedIntent();
  }
});

body.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target || !body.contains(target)) return;
  const { action, id } = target.dataset;
  if (action === 'start') return startSelectedIntent();
  if (action === 'redraw') return redrawDaily();
  if (action === 'resume') return service.get(id).then(resumeReading);
  if (action === 'discard') {
    return service.get(id).then((r) => service.abandon(id).then(() => {
      track('reading_abandoned', { spreadId: r.spreadId, lastStep: r.status === 'revealing' ? STEP_NUMBER.reveal : STEP_NUMBER.pick });
      target.closest('.draft-banner').remove();
    }));
  }
  return undefined;
});

function chooseIntent(intentId) {
  track('intent_selected', { intent: intentId });
  const intent = SPREADS.INTENTS.find((i) => i.id === intentId);
  resetInputs();
  state.intentId = intentId;
  state.startedAt = performance.now();
  if (intentId === 'today') return openDaily();
  state.spreadId = intent.spreadId;
  return go('confirm');
}

// Günün kartı bir kez çekildikten sonra da istenirse aynı gün yeniden çekilir; yeni kart günün kartı olur.
function redrawDaily() {
  track('intent_selected', { intent: 'today', redraw: true });
  resetReading();
  resetInputs();
  state.intentId = 'today';
  state.spreadId = 'daily';
  state.startedAt = performance.now();
  state.forceNew = true;
  return go('shuffle');
}

async function openDaily() {
  const daily = await service.dailyToday();
  if (daily && daily.status === 'complete') return openSavedReading(daily);
  if (daily && daily.cards.length) return resumeReading(daily);
  state.intentId = 'today';
  state.spreadId = 'daily';
  resetInputs();
  return go('shuffle');
}

// ---------- 2 · Açılım onayı ----------

function readyTitle(count) {
  return count === 1 ? 'Kartın hazır' : `${count} kartın da hazır`;
}

function readyStatusHtml(count) {
  return `<span class="ready-check" aria-hidden="true">✓</span><span>${readyTitle(count)}</span>`;
}

function captionFor(position) {
  return position.caption || ENGINE.displayPrompt(position, readingContext());
}

RENDERERS.confirm = () => {
  const spread = currentSpread();
  setProgress('');
  setActions({
    back: { label: 'Başka açılım seç', onClick: () => go('intent') },
    primary: {
      label: 'Devam',
      onClick: () => {
        track('spread_confirmed', { spreadId: state.spreadId, depth: state.spreadId === 'celtic' ? 'detailed' : 'quick' });
        go('question');
      }
    },
    statusHtml: readyStatusHtml(spread.cardCount)
  });
  body.innerHTML = `<div class="confirm-step">
      <div class="confirm-grid">
        <div class="layout-stage preview-stage" id="layout"></div>
        <aside class="spread-map" id="spread-map" aria-labelledby="map-title">
          <h2 class="map-title" id="map-title">Açılımın haritası</h2>
          <ol class="position-list" id="position-list" aria-label="Pozisyonlar"></ol>
        </aside>
        <div class="map-focus" id="map-focus" aria-hidden="true"></div>
      </div>
    </div>`;
  bindSpreadMap();
  if (state.intentId === 'general') {
    $('#depth-slot').innerHTML = `<div class="segmented depth-control" role="radiogroup" aria-label="Okuma derinliği">
        <button type="button" role="radio" data-depth="three" aria-checked="${spread.id === 'three'}" tabindex="${spread.id === 'three' ? 0 : -1}">Hızlı · 3 kart</button>
        <button type="button" role="radio" data-depth="celtic" aria-checked="${spread.id === 'celtic'}" tabindex="${spread.id === 'celtic' ? 0 : -1}">Detaylı · 10 kart</button>
      </div>`;
    const control = $('.depth-control');
    control.addEventListener('click', (event) => {
      const button = event.target.closest('[data-depth]');
      if (button) setDepth(button.dataset.depth);
    });
    control.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      setDepth(state.spreadId === 'three' ? 'celtic' : 'three');
      $(`[data-depth="${state.spreadId}"]`, control).focus();
    });
  }
  paintConfirmChrome(spread);
  requestAnimationFrame(() => renderLayout($('#layout'), spread, 'preview'));
};

function paintConfirmChrome(spread) {
  const frame = frameFor(spread);
  panel.dataset.frame = frame;
  stage.dataset.frame = frame;
  setHeading(UI.spreadDisplayName(spread.name), spread.blurb || '');
  const meta = $('#spread-meta');
  meta.hidden = false;
  meta.className = 'meta-line';
  meta.innerHTML = `<svg class="meta-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.500" y="6" width="10" height="14" rx="1.500" transform="rotate(-10 8.500 13)" stroke="currentColor" stroke-width="1.300"/><rect x="10" y="4.500" width="10" height="14" rx="1.500" transform="rotate(8 15 11.500)" stroke="currentColor" stroke-width="1.300" fill="#0a1020"/><path d="m15.200 9.500.6 1.300 1.400.2-1 1 .2 1.400-1.200-.7-1.300.7.300-1.400-1-1 1.400-.2Z" fill="currentColor"/></svg>${spread.cardCount} kart · Yaklaşık ${spread.estMinutes} dakika`;
  renderPositionList(spread);
  statusEl.innerHTML = readyStatusHtml(spread.cardCount);
}

function renderPositionList(spread) {
  $('#position-list').innerHTML = spread.positions.map((p) => `<li data-key="${esc(p.key)}"><span class="position-index">${p.index}</span><span><strong>${esc(labelFor(p))}</strong><small>${esc(captionFor(p))}</small></span></li>`).join('');
  mapFocusKey = spread.positions[0].key;
  paintMapFocus(false);
  requestAnimationFrame(fitSpreadMap);
}

// Harita uzun gelirse (Celtic Cross) açıklamalar çekilir; liste hiçbir zaman kaymaz.
// Açılımın haritası kutusuna sığmazsa önce açıklamalar çekilir, yine sığmazsa satırlar sıkışır.
function fitSpreadMap() {
  const map = $('#spread-map');
  if (!map) return;
  map.classList.remove('is-dense', 'is-tight');
  if (map.scrollHeight > map.clientHeight + 1) map.classList.add('is-dense');
  if (map.scrollHeight > map.clientHeight + 1) map.classList.add('is-tight');
}

// Haritadaki satır ile dizilimdeki kart birbirini işaret eder; telefonda dokunulan yerin anlamı altta belirir.
let mapFocusKey = null;
function hintPosition(key) {
  $$('#position-list li').forEach((li) => li.classList.toggle('is-hint', li.dataset.key === key));
  $$('#layout .lay-slot').forEach((slot) => slot.classList.toggle('is-hint', slot.dataset.key === key));
}

function paintMapFocus(animated = true) {
  const box = $('#map-focus');
  const spread = currentSpread();
  const position = spread && spread.positions.find((p) => p.key === mapFocusKey);
  if (!box || !position) return;
  box.innerHTML = `<span class="position-index">${position.index}</span><span class="map-focus-body"><strong>${esc(labelFor(position))}</strong><small>${esc(captionFor(position))}</small></span>`;
  if (!animated) $('.map-focus-body', box).style.animation = 'none';
}

function bindSpreadMap() {
  const layout = $('#layout');
  const list = $('#position-list');
  layout.addEventListener('pointerover', (event) => {
    const slot = event.target.closest('.lay-slot');
    if (slot && event.pointerType === 'mouse') hintPosition(slot.dataset.key);
  });
  layout.addEventListener('pointerleave', () => hintPosition(null));
  layout.addEventListener('click', (event) => {
    const slot = event.target.closest('.lay-slot');
    if (!slot) return;
    mapFocusKey = slot.dataset.key;
    paintMapFocus();
    hintPosition(slot.dataset.key);
    haptic(8);
  });
  list.addEventListener('pointerover', (event) => {
    const li = event.target.closest('li[data-key]');
    if (li) hintPosition(li.dataset.key);
  });
  list.addEventListener('pointerleave', () => hintPosition(null));
}

function setDepth(spreadId) {
  if (spreadId === state.spreadId) return;
  state.spreadId = spreadId;
  const spread = currentSpread();
  $$('[data-depth]').forEach((b) => {
    const on = b.dataset.depth === spreadId;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  paintConfirmChrome(spread);
  const layout = $('#layout');
  void layout.offsetWidth;
  morphLayout(layout, spread, 'preview');
}

// ---------- 3 · Soru ----------

RENDERERS.question = () => {
  const spread = currentSpread();
  const decision = spread.inputs.options === 'required';
  const L = SPREADS.LIMITS;
  const counter = (id, max) => `<span class="counter" id="${id}-count" aria-live="off">${(state.inputs[id] || '').length} / ${max}</span>`;
  setHeading(decision ? 'İki yolu masaya koy' : 'Sorunu yaz', `${UI.spreadDisplayName(spread.name)} · ${decision ? 'A ve B zorunlu' : 'İsteğe bağlı'}`);
  setProgress('');
  const deck = `<div class="question-altar" aria-hidden="true"><span class="question-deck">${'<span class="card-back"></span>'.repeat(3)}</span></div>`;
  body.innerHTML = `<form class="question-step" id="question-form" novalidate>
      ${deck}
      ${decision ? '' : '<p class="question-invite">Bir nefes al. Sorunu destenin önüne bırak.</p>'}
      ${decision ? `<div class="option-row">
          <label class="field"><span>A seçeneği</span><input id="optionA" maxlength="${L.option}" required autocomplete="off" value="${esc(state.inputs.optionA)}" placeholder="İstanbul'da kal">${counter('optionA', L.option)}</label>
          <label class="field"><span>B seçeneği</span><input id="optionB" maxlength="${L.option}" required autocomplete="off" value="${esc(state.inputs.optionB)}" placeholder="Berlin'e taşın">${counter('optionB', L.option)}</label>
        </div>` : ''}
      <label class="field"><span>${decision ? 'Biraz bağlam ekle' : 'Sorun'}</span>
        <textarea id="question" maxlength="${L.question}" rows="${decision ? 2 : 3}" placeholder="${esc(SPREADS.PLACEHOLDERS[spread.id] || '')}">${esc(state.inputs.question)}</textarea>${counter('question', L.question)}</label>
      ${spread.inputs.personName ? `<label class="field"><span>Kişinin adı</span><input id="personName" maxlength="${L.personName}" autocomplete="off" value="${esc(state.inputs.personName)}" placeholder="İsteğe bağlı">${counter('personName', L.personName)}</label>` : ''}
      <p class="hint" id="question-hint">${decision ? 'İki seçeneği de yazmalısın.' : 'Açık uçlu sorulara yer aç: “Olacak mı?” yerine “Neye dikkat etmeliyim?”'}</p>
      <p class="soft-warning" id="repeat-warning" hidden>Aynı soruyu kısa sürede tekrar sormak okumayı bulanıklaştırır. Yine de devam edebilirsin.</p>
    </form>`;
  const form = $('#question-form');
  const canContinue = () => !decision || (state.inputs.optionA.trim() && state.inputs.optionB.trim());
  const refresh = () => {
    primaryBtn.disabled = !canContinue();
    $('#repeat-warning').hidden = !(state.inputs.question.trim() && service.recentSimilar(spread.id, state.inputs.question));
  };
  form.addEventListener('input', (event) => {
    const field = event.target;
    if (!(field.id in state.inputs)) return;
    state.inputs[field.id] = field.value;
    const max = Number(field.getAttribute('maxlength'));
    const count = $(`#${field.id}-count`);
    count.textContent = `${field.value.length} / ${max}`;
    count.classList.toggle('is-full', field.value.length >= max);
    refresh();
  });
  form.addEventListener('submit', (event) => { event.preventDefault(); if (canContinue()) submitQuestion(); });
  setActions({
    back: true,
    secondary: decision ? null : { label: 'Soru olmadan devam et', onClick: () => { state.inputs.question = ''; submitQuestion(); } },
    primary: { label: 'Kartları karıştır', disabled: !canContinue(), onClick: () => { if (canContinue()) submitQuestion(); } }
  });
  refresh();
};

function submitQuestion() {
  const { question, optionA, optionB, personName } = state.inputs;
  if (ENGINE.isCrisis(question, optionA, optionB)) return showCrisis();
  track('question_submitted', { spreadId: state.spreadId, hasQuestion: Boolean(question.trim()), length: question.trim().length });
  return go('shuffle');
}

function showCrisis() {
  setHeading('Şu an yanındayız', 'Bu soru için okuma yapmıyoruz.');
  body.innerHTML = `<div class="crisis-card" role="alert">
      <p>Yazdıkların, şu an çok zor bir yerde olabileceğini düşündürüyor. Bunu tek başına taşımak zorunda değilsin ve bunun için kartlardan daha iyi bir destek var.</p>
      <ul>
        <li><strong>112</strong> · Acil bir tehlike varsa hemen ara.</li>
        <li><strong>ALO 183</strong> · Sosyal destek hattı, 7/24.</li>
        <li>Güvendiğin biriyle, bir yakınınla ya da bir ruh sağlığı uzmanıyla bugün konuşmayı dene.</li>
      </ul>
    </div>`;
  setActions({ back: true, primary: { label: 'Ana ekrana dön', onClick: () => go('intent') } });
}

// ---------- 4 · Karıştırma ----------

function ensureReading() {
  if (!state.readingPromise) {
    const forceNew = state.forceNew;
    state.readingPromise = service.createReading({
      spreadId: state.spreadId,
      ...state.inputs,
      reversalsEnabled: settings.reversals,
      forceNew
    }).then((result) => {
      if (!result.existing) state.forceNew = false;
      return result;
    });
  }
  return state.readingPromise;
}

function startNewReading() {
  const spreadId = state.spreadId;
  const intentId = state.intentId;
  const source = state.reading || state.inputs;
  const inputs = {
    question: source.question || '',
    optionA: source.optionA || '',
    optionB: source.optionB || '',
    personName: source.personName || ''
  };
  resetReading();
  state.spreadId = spreadId;
  state.intentId = intentId;
  state.inputs = inputs;
  state.startedAt = performance.now();
  state.forceNew = true;
  return go('shuffle');
}

const HAND_MARK = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9.500 11.500V5a1.500 1.500 0 0 1 3 0v5m0-1a1.500 1.500 0 0 1 3 0v1.500m0-.5a1.500 1.500 0 0 1 3 0v4.500A6 6 0 0 1 12.500 21h-1a6 6 0 0 1-4.800-2.400L4 15a1.600 1.600 0 0 1 2.400-2L9.500 15" stroke="currentColor" stroke-width="1.200" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const SHUFFLE_TEXT = {
  idle: 'Sorunu düşünerek desteye basılı tut',
  idleReduced: 'Desteye dokun ya da otomatik karıştır',
  start: 'Kartlar karışıyor… sorunu düşünmeye devam et',
  half: 'Niyetin kartlara geçiyor…',
  ready: 'Hazır olunca bırak',
  early: 'Biraz daha karıştır. Yeniden basılı tut',
  finale: 'Deste kesiliyor…'
};
const RING_MARK = '<svg class="shuffle-ring" viewBox="0 0 200 200" aria-hidden="true"><circle class="ring-track" cx="100" cy="100" r="96" pathLength="1"/><circle class="ring-fill" cx="100" cy="100" r="96" pathLength="1"/></svg>';

let shuffleRig = null;

RENDERERS.shuffle = () => {
  const spread = currentSpread();
  const question = state.inputs.question.trim();
  const invite = spread.id === 'daily' ? 'Bugün için bir kart seçilecek.' : (question ? `“${question}”` : 'Bir nefes al. Sorunu düşün.');
  setHeading(UI.spreadDisplayName(spread.name), `${spread.cardCount} kart · Yaklaşık ${spread.estMinutes} dakika`);
  setProgress('');
  body.innerHTML = `<div class="shuffle-step">
      <div class="shuffle-ornament" aria-hidden="true">✦</div>
      <p class="shuffle-question"></p>
      <button type="button" class="deck" id="deck" aria-describedby="shuffle-instruction" aria-label="Deste. Karıştırmak için basılı tut.">${RING_MARK}</button>
      <p class="shuffle-instruction" id="shuffle-instruction" aria-live="polite">${HAND_MARK}<span class="shuffle-instruction-text">${reduced() ? SHUFFLE_TEXT.idleReduced : SHUFFLE_TEXT.idle}</span></p>
    </div>`;
  $('.shuffle-question').textContent = invite;
  setActions({ back: true, primary: { label: 'Otomatik karıştır', icon: ` ${SHUFFLE_MARK}`, onClick: () => autoShuffle() } });
  bindShuffleDeck($('#deck'));
};

// Basılı tutunca deste masada yayılıp döner ve çember dolar; imleçle karıştırmak hızlandırır.
// Çember dolmadan bırakılırsa kartlar toplanır ama emek kaybolmaz; yeniden basılı tutunca kaldığı yerden sürer.
function bindShuffleDeck(deck) {
  if (shuffleRig) shuffleRig.shuffler.destroy();
  const text = $('.shuffle-instruction-text');
  const say = (value) => { if (text.textContent !== value) text.textContent = value; };
  let milestone = 0;
  const shuffler = window.TAROT_SHUFFLE.create(deck, {
    ring: $('.ring-fill', deck),
    reduced,
    onProgress: (p) => {
      const step = p >= 1 ? 3 : p >= 0.5 ? 2 : p > 0 ? 1 : 0;
      if (step <= milestone) return;
      milestone = step;
      if (step === 2) { say(SHUFFLE_TEXT.half); haptic(8); }
    },
    onReady: () => {
      deck.classList.add('is-ready');
      say(rig.auto ? SHUFFLE_TEXT.finale : SHUFFLE_TEXT.ready);
      MOTION.burst(deck, { count: 14, size: 1.3 });
      haptic(24);
    },
    onTick: (kind) => {
      sfx.tick(kind);
      if (kind === 'cut') haptic(12);
    }
  });
  const rig = { deck, shuffler, say, holding: false, auto: false, startedAt: 0 };
  shuffleRig = rig;
  const start = () => {
    if (state.busy || rig.holding) return;
    if (reduced()) { autoShuffle(); return; }
    ensureReading();
    rig.holding = true;
    rig.startedAt = rig.startedAt || performance.now();
    deck.classList.add('is-shuffling');
    sfx.riffleStart();
    if (!shuffler.ready) say(SHUFFLE_TEXT.start);
    shuffler.hold();
  };
  const end = () => {
    if (!rig.holding) return;
    rig.holding = false;
    deck.classList.remove('is-shuffling');
    sfx.riffleStop();
    if (shuffler.release()) completeShuffle('hold');
    else say(SHUFFLE_TEXT.early);
  };
  deck.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    try { deck.setPointerCapture(event.pointerId); } catch (error) { /* yakalama desteklenmiyorsa bırakma yine gelir */ }
    start();
  });
  // Dokunmatikte movementX her tarayıcıda gelmez; hız konum farkından hesaplanır.
  let lastPoint = null;
  deck.addEventListener('pointermove', (event) => {
    if (!rig.holding) { lastPoint = null; return; }
    if (lastPoint) shuffler.stir(event.clientX - lastPoint.x, event.clientY - lastPoint.y);
    lastPoint = { x: event.clientX, y: event.clientY };
  });
  deck.addEventListener('pointerup', end);
  deck.addEventListener('pointercancel', end);
  deck.addEventListener('lostpointercapture', end);
  deck.addEventListener('contextmenu', (event) => event.preventDefault());
  deck.addEventListener('keydown', (event) => {
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); start(); }
  });
  deck.addEventListener('keyup', (event) => { if (event.key === ' ' || event.key === 'Enter') end(); });
  deck.addEventListener('blur', end);
}

async function completeShuffle(mode) {
  const rig = shuffleRig;
  if (!rig || state.busy) return;
  state.busy = true;
  const token = state.renderToken;
  primaryBtn.disabled = true;
  rig.say(SHUFFLE_TEXT.finale);
  await rig.shuffler.finale();
  if (token !== state.renderToken) return;
  finishShuffle(mode, performance.now() - (rig.startedAt || performance.now()));
}

async function autoShuffle() {
  if (state.busy) return undefined;
  state.busy = true;
  const token = state.renderToken;
  ensureReading();
  const rig = shuffleRig;
  const deck = $('#deck');
  primaryBtn.disabled = true;
  if (reduced() || !rig) {
    await animate(deck, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: 'ease-in-out', fill: 'forwards' });
    if (token !== state.renderToken) return undefined;
    return finishShuffle('auto', 400);
  }
  const at = performance.now();
  deck.classList.add('is-shuffling');
  sfx.riffleStart();
  rig.auto = true;
  rig.say(SHUFFLE_TEXT.start);
  await rig.shuffler.auto(AUTO_SHUFFLE_MS);
  sfx.riffleStop();
  deck.classList.remove('is-shuffling');
  if (token !== state.renderToken) return undefined;
  return finishShuffle('auto', performance.now() - at);
}

async function finishShuffle(mode, durationMs) {
  state.busy = true;
  const token = state.renderToken;
  track('shuffle_completed', { mode, durationMs: Math.round(durationMs) });
  try {
    const { readingId } = await ensureReading();
    const reading = await service.get(readingId);
    if (token !== state.renderToken) return;
    state.readingId = readingId;
    state.reading = reading;
    state.picks = reading.cards.map(pickFromStored);
    state.busy = false;
    go('pick');
  } catch (error) {
    state.busy = false;
    state.readingPromise = null;
    statusEl.textContent = 'Bağlantı koptu, tekrar dene';
    primaryBtn.disabled = false;
  }
}

function pickFromStored(stored) {
  const card = TAROT.getCard(stored.cardId);
  const pick = { positionKey: stored.positionKey, fanIndex: stored.fanIndex, reversed: stored.reversed, card: { id: card.id, name: card.name, nameTr: card.nameTr, image: card.image }, pending: false };
  pick.ready = preload(card.image);
  return pick;
}

function preload(src) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return (img.decode ? img.decode() : Promise.resolve()).catch(() => {});
}

// ---------- 5 · Kart seçimi ----------

const PICK_HINT = 'Acele etme. Sana yakın gelen kartı seç.';

RENDERERS.pick = () => {
  const spread = currentSpread();
  body.innerHTML = `<div class="pick-step">
      <div class="layout-stage pick-stage" id="layout"></div>
      <div class="fan-viewport" id="fan-viewport">
        <div class="card-fan" id="fan" role="group" aria-label="Yüzü kapalı 78 kart. Ok tuşlarıyla gez, Enter ile seç."></div>
      </div>
      <ol class="sr-only" id="sr-list"></ol>
    </div>`;
  updatePickHeading();
  setActions({ back: true, status: PICK_HINT });
  // Yelpaze önce kurulur: seçim alanının yüksekliği yelpazenin yüksekliğinden gelir, dizilim ona göre ölçülür.
  requestAnimationFrame(() => {
    buildFan();
    renderLayout($('#layout'), spread, 'pick');
    updatePickHeading();
    if (state.picks.length >= spread.cardCount) finishPicking();
  });
};

function updatePickHeading() {
  const spread = currentSpread();
  const n = state.picks.length;
  const next = spread.positions[n];
  setHeading(spread.cardCount === 1 ? 'Bir kart seç' : `${spread.cardCount} kart seç`, next ? 'Sıradaki: ' : 'Kartların yerleşti.', next ? { strong: labelFor(next) } : {});
  setProgress(`${n} / ${spread.cardCount}`);
  $$('#layout .lay-slot').forEach((slot) => slot.classList.toggle('is-next', Boolean(next) && slot.dataset.key === next.key));
}

const fanState = { layout: null, raf: 0, dragged: false, abort: null };

function fanCardSize() {
  const viewport = $('#fan-viewport');
  const { cardWidth, cardHeight } = UI.fanLayout(viewport ? viewport.clientWidth : window.innerWidth, window.innerHeight);
  return { w: cardWidth, h: cardHeight };
}

function buildFan({ animate = true } = {}) {
  const fan = $('#fan');
  const viewport = $('#fan-viewport');
  fanState.layout = UI.fanLayout(viewport.clientWidth || window.innerWidth, window.innerHeight);
  const { cardWidth: w, spacing, height, drop, pad } = fanState.layout;
  const used = new Set(state.picks.map((p) => p.fanIndex));
  [viewport, viewport.parentElement].forEach((el) => {
    el.style.setProperty('--fan-h', `${height}px`);
    el.style.setProperty('--fan-top', `${drop + pad}px`);
    el.style.setProperty('--fan-w', `${w}px`);
  });
  fan.innerHTML = Array.from({ length: DECK_SIZE }, (_, i) => `<button type="button" class="fan-card" data-index="${i}" tabindex="-1" aria-label="Kart ${i + 1} / ${DECK_SIZE}, yüzü kapalı. Seçmek için çift dokun"${used.has(i) ? ' disabled data-picked="true"' : ''}><span class="card-back"></span></button>`).join('');
  const buttons = $$('.fan-card', fan);
  fan.style.width = `${(DECK_SIZE - 1) * spacing + w + viewport.clientWidth}px`;
  buttons.forEach((b, i) => { b.dataset.x = String(viewport.clientWidth / 2 - w / 2 + i * spacing); });
  viewport.scrollLeft = (fan.scrollWidth - viewport.clientWidth) / 2;
  positionFan();
  viewport.onscroll = () => {
    cancelAnimationFrame(fanState.raf);
    fanState.raf = requestAnimationFrame(positionFan);
  };
  bindFanPointer(viewport);
  const first = buttons.find((b) => !b.disabled);
  if (first) first.tabIndex = 0;
  fan.onclick = (event) => {
    const button = event.target.closest('.fan-card');
    if (fanState.dragged) { fanState.dragged = false; return; }
    if (button && !button.disabled) selectFanCard(Number(button.dataset.index));
  };
  fan.onkeydown = onFanKey;
  fan.onfocusin = (event) => {
    const button = event.target.closest('.fan-card');
    if (button && button.matches(':focus-visible')) scrollFanTo(button);
  };
  if (animate) openFan(buttons);
}

// Kartlar transform ile dizildiği için scrollIntoView yanlış konuma gider.
function scrollFanTo(button) {
  const viewport = $('#fan-viewport');
  const left = Number(button.dataset.x) + fanCardSize().w / 2 - viewport.clientWidth / 2;
  viewport.scrollTo({ left, behavior: reduced() ? 'auto' : 'smooth' });
}

// Yelpaze kaydıkça her kart yay üzerindeki yerine göre konumlanır ve dönür.
function positionFan() {
  const viewport = $('#fan-viewport');
  const layout = fanState.layout;
  if (!viewport || !layout) return;
  const center = viewport.scrollLeft + viewport.clientWidth / 2;
  const { radius, drop, pad } = layout;
  const { w } = fanCardSize();
  $$('.fan-card', viewport).forEach((b) => {
    const x = Number(b.dataset.x);
    const d = Math.max(-radius * 0.9, Math.min(radius * 0.9, x + w / 2 - center));
    const rad = d / radius;
    const y = pad + drop - radius * (1 - Math.cos(rad));
    b.dataset.angle = String((-rad * 180) / Math.PI);
    b.style.transform = `translate(${x}px, ${y.toFixed(1)}px) rotate(${((-rad * 180) / Math.PI).toFixed(2)}deg)`;
  });
}

// Fareyle sürükleme ve dikey tekerlek hareketi yatay kaydırmaya çevrilir.
function bindFanPointer(viewport) {
  if (viewport.dataset.bound) return;
  viewport.dataset.bound = 'true';
  if (fanState.abort) fanState.abort.abort();
  fanState.abort = new AbortController();
  const { signal } = fanState.abort;
  let drag = null;
  viewport.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { x: event.clientX, left: viewport.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 8) return;
    drag.moved = true;
    fanState.dragged = true;
    viewport.classList.add('is-dragging');
    viewport.scrollLeft = drag.left - dx;
  }, { signal });
  const end = () => {
    if (!drag) return;
    drag = null;
    viewport.classList.remove('is-dragging');
    setTimeout(() => { fanState.dragged = false; }, 0);
  };
  window.addEventListener('pointerup', end, { signal });
  window.addEventListener('pointercancel', end, { signal });
  viewport.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    viewport.scrollLeft += event.deltaY;
  }, { passive: false });
}

function openFan(buttons) {
  if (reduced()) return;
  const fan = $('#fan');
  const viewport = $('#fan-viewport');
  const originX = viewport.scrollLeft + viewport.clientWidth / 2 - fanCardSize().w / 2;
  fan.classList.add('is-opening');
  const animations = buttons.map((b, i) => b.animate(
    [{ transform: `translate(${originX}px, -160px) rotate(0deg)`, opacity: 0 }, { transform: b.style.transform, opacity: 1 }],
    { duration: 160, delay: i * 6, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', fill: 'backwards' }
  ));
  Promise.all(animations.map((a) => a.finished.catch(() => {}))).then(() => fan.classList.remove('is-opening'));
}

function onFanKey(event) {
  const buttons = $$('.fan-card', $('#fan'));
  const open = buttons.filter((b) => !b.disabled);
  if (!open.length) return;
  const current = document.activeElement.closest?.('.fan-card');
  let index = open.indexOf(current);
  if (index < 0) index = 0;
  let next = null;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = open[Math.min(open.length - 1, index + 1)];
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = open[Math.max(0, index - 1)];
  else if (event.key === 'Home') next = open[0];
  else if (event.key === 'End') next = open[open.length - 1];
  if (!next) return;
  event.preventDefault();
  buttons.forEach((b) => { b.tabIndex = -1; });
  next.tabIndex = 0;
  next.focus({ preventScroll: true });
}

function selectFanCard(fanIndex) {
  const spread = currentSpread();
  if (state.picks.length >= spread.cardCount || state.picks.some((p) => p.fanIndex === fanIndex)) return;
  const pickIndex = state.picks.length;
  const position = spread.positions[pickIndex];
  const pick = { positionKey: position.key, fanIndex, pending: true, card: null, reversed: false };
  state.picks.push(pick);
  const fanCard = $(`.fan-card[data-index="${fanIndex}"]`);
  const wasFocused = document.activeElement === fanCard;
  track('card_picked', { spreadId: spread.id, pickIndex });
  haptic(10);
  sfx.slide();
  updatePickHeading();
  announce(`${labelFor(position)} pozisyonuna bir kart seçildi. ${state.picks.length} / ${spread.cardCount}.`);

  pick.request = requestPick(pick, pickIndex);
  pick.flight = flyToSlot(fanCard, position).then(() => settleSlot(position.key));
  fanCard.disabled = true;
  fanCard.dataset.picked = 'true';
  fanCard.tabIndex = -1;
  if (wasFocused) {
    const next = $$('.fan-card:not(:disabled)').find((b) => Number(b.dataset.index) > fanIndex) || $('.fan-card:not(:disabled)');
    if (next) { next.tabIndex = 0; next.focus({ preventScroll: true }); }
  }
  if (state.picks.length === spread.cardCount) {
    Promise.all(state.picks.map((p) => p.flight)).then(() => finishPicking());
  }
}

function requestPick(pick, pickIndex) {
  const task = () => ENGINE.withRetry(() => service.pick(state.readingId, pickIndex, pick.fanIndex), 3);
  state.pickChain = state.pickChain.catch(() => {}).then(task);
  return state.pickChain.then((result) => {
    Object.assign(pick, { card: result.card, reversed: result.reversed, pending: false, failed: false });
    pick.ready = preload(result.card.image);
    const slot = slotEl(pick.positionKey);
    if (slot) setSlotCard(slot, pick);
    if (state.step === 'pick' && !state.picks.some((p) => p.failed)) { statusEl.textContent = PICK_HINT; statusEl.classList.remove('is-alert'); }
    if (state.step === 'reveal') updateReveal();
  }).catch(() => {
    pick.failed = true;
    statusEl.classList.add('is-alert');
    statusEl.textContent = 'Bağlantı koptu, tekrar dene';
    secondaryBtn.hidden = false;
    secondaryBtn.textContent = 'Tekrar dene';
    secondaryBtn.onclick = retryFailedPicks;
  });
}

function retryFailedPicks() {
  secondaryBtn.hidden = true;
  statusEl.classList.remove('is-alert');
  statusEl.textContent = PICK_HINT;
  state.picks.forEach((pick, i) => { if (pick.failed) pick.request = requestPick(pick, i); });
}

function slotEl(key) {
  return $(`#layout .lay-slot[data-key="${key}"]`);
}

async function flyToSlot(fanCard, position) {
  const slot = slotEl(position.key);
  if (!slot || !fanCard) return;
  const source = visualRect(fanCard);
  const target = visualRect(slot);
  const angle = Number(fanCard.dataset.angle || 0);
  const rot = position.slot.rot;
  if (reduced()) {
    fanCard.style.visibility = 'hidden';
    slot.classList.add('is-filled');
    await animate($('.lay-card', slot), [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
    return;
  }
  const flyer = document.createElement('div');
  flyer.className = 'flyer';
  flyer.style.cssText = `left:${target.left}px;top:${target.top}px;width:${target.width}px;height:${target.height}px`;
  flyer.innerHTML = '<span class="card-back"></span>';
  document.body.append(flyer);
  fanCard.style.visibility = 'hidden';
  const scale = source.width / target.width;
  const dx = source.left + source.width / 2 - (target.left + target.width / 2);
  const dy = source.top + source.height / 2 - (target.top + target.height / 2);
  const motion = spring(220, 26);
  await animate(flyer, [
    { transform: `translate(${dx}px, ${dy}px) rotate(${angle}deg) scale(${scale})` },
    { transform: `translate(${dx / 2}px, ${dy / 2 - 40}px) rotate(${(angle + rot) / 2}deg) scale(${(scale + 1) / 2})`, offset: 0.5 },
    { transform: `translate(0, 0) rotate(${rot}deg) scale(1)` }
  ], { duration: Math.max(520, motion.duration), easing: motion.easing, fill: 'forwards' });
  slot.classList.add('is-filled');
  flyer.remove();
}

function settleSlot(key) {
  const slot = slotEl(key);
  if (!slot) return Promise.resolve();
  haptic(10);
  if (reduced()) return Promise.resolve();
  MOTION.burst(slot, { count: 7, size: 0.75 });
  return animate($('.lay-card', slot), [{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,.9,.25,1.2)' });
}

async function finishPicking() {
  if (state.step !== 'pick' || state.finishing) return;
  state.finishing = true;
  await Promise.all(state.picks.map((p) => p.request));
  if (state.picks.some((p) => p.failed)) { state.finishing = false; return; }
  state.interpretationPromise = service.complete(state.readingId);
  const fan = $('#fan-viewport');
  if (fan && !reduced()) {
    const motion = spring(260, 30);
    await animate(fan, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(70%)', opacity: 0 }], { duration: Math.max(420, motion.duration), easing: motion.easing, fill: 'forwards' });
  }
  state.finishing = false;
  go('reveal', { fromPick: true });
}

// ---------- 6–7 · Yerleşme ve açma ----------

RENDERERS.reveal = (options) => {
  const spread = currentSpread();
  const three = spread.id === 'three';
  setHeading(three ? 'Sana açılan üç kart' : UI.spreadDisplayName(spread.name), 'Kartlarına dokunarak aç');
  // Düğmeler dizilimden önce kurulur: düğme satırı dizilim kutusunun yüksekliğini belirler.
  const actions = () => {
    setActions({
      back: true,
      secondary: { label: 'Hepsini aç', onClick: revealAll },
      primary: { label: 'Yorumu gör', onClick: () => go('reading') }
    });
    primaryBtn.hidden = true;
  };
  const layout = $('#layout');
  if (options.fromPick && layout) {
    const before = new Map($$('.lay-slot', layout).map((s) => [s.dataset.key, localRect(s)]));
    const turned = new Map($$('.lay-slot', layout).map((s) => [s.dataset.key, $('.lay-rot', s).style.transform]));
    $('#fan-viewport').remove();
    actions();
    layout.classList.replace('pick-stage', 'reveal-stage');
    if (usesLegend(spread)) layout.parentElement.classList.add('has-legend');
    renderLayout(layout, spread, 'reveal');
    if (!reduced()) {
      const motion = spring(240, 28);
      flipFrom(layout, before, motion);
      turnFrom(layout, turned, motion);
    }
  } else {
    body.innerHTML = `<div class="reveal-step${usesLegend(spread) ? ' has-legend' : ''}"><div class="layout-stage reveal-stage" id="layout"></div><ol class="sr-only" id="sr-list"></ol></div>`;
    actions();
    renderLayout($('#layout'), spread, 'reveal');
  }
  if (usesLegend(spread)) mountLegend($('#layout'), spread);
  if (!state.interpretationPromise) state.interpretationPromise = service.complete(state.readingId);
  updateReveal();
};

// Rozetli dizilimde kartları açarken liste her yerin adını ve açılan kartın adını gösterir.
// Listedeki satıra dokunmak o kartı açar; açık kartta kartın penceresini açar.
function mountLegend(layout, spread) {
  const host = layout.parentElement;
  let legend = $('.reveal-legend', host);
  if (!legend) {
    legend = document.createElement('ol');
    legend.className = 'reveal-legend';
    legend.id = 'position-list';
    legend.setAttribute('aria-label', 'Açılımın yerleri');
    host.append(legend);
    legend.addEventListener('click', (event) => {
      const li = event.target.closest('li[data-key]');
      if (!li) return;
      const pick = state.picks.find((p) => p.positionKey === li.dataset.key);
      if (!state.revealed.has(li.dataset.key)) revealCard(li.dataset.key, 'legend');
      else if (pick && pick.card) openCardDetail(pick.card.id, pick.reversed, $('.face-front img', slotEl(li.dataset.key)));
    });
    legend.addEventListener('pointerover', (event) => { const li = event.target.closest('li[data-key]'); if (li) hintPosition(li.dataset.key); });
    legend.addEventListener('pointerleave', () => hintPosition(null));
    layout.addEventListener('pointerover', (event) => { const slot = event.target.closest('.lay-slot'); if (slot && event.pointerType === 'mouse') hintPosition(slot.dataset.key); });
    layout.addEventListener('pointerleave', () => hintPosition(null));
  }
  legendLatest = null;
  legend.innerHTML = spread.positions.map((p) => `<li data-key="${esc(p.key)}"><span class="position-index">${p.index}</span><span class="legend-copy"><strong>${esc(labelFor(p))}</strong><small></small></span></li>`).join('');
  if (!reduced()) MOTION.enter($$('li', legend), { x: 18, y: 0, duration: 520, delay: 200, stagger: 40 });
  paintLegend();
}

let legendLatest = null;
function paintLegend(latest = legendLatest) {
  legendLatest = latest;
  const legend = $('.reveal-legend');
  if (!legend) return;
  const next = currentSpread().positions.find((p) => !state.revealed.has(p.key));
  $$('li[data-key]', legend).forEach((li) => {
    const key = li.dataset.key;
    const pick = state.picks.find((p) => p.positionKey === key);
    const open = state.revealed.has(key) && pick && pick.card;
    const small = $('small', li);
    const text = open ? `${TAROT.getCard(pick.card.id).nameTr}${pick.reversed ? 'Ters' : ''}` : 'Kapalı';
    if (small.textContent !== text) {
      small.innerHTML = open
        ? `<span class="legend-name">${esc(TAROT.getCard(pick.card.id).nameTr)}</span>${pick.reversed ? '<span class="badge-reversed">Ters</span>' : ''}`
        : '<span class="legend-name">Kapalı</span>';
      if (open && !reduced()) MOTION.enter([small], { x: 8, y: 0, duration: 420, delay: 0 });
    }
    li.classList.toggle('is-open', Boolean(open));
    li.classList.toggle('is-next', Boolean(next) && next.key === key);
    li.classList.toggle('is-latest', key === latest);
  });
  // Telefonda liste yana kayan tek sıradır: son açılan kart, yoksa sıradaki yer ortaya gelir.
  const focus = $('li.is-latest', legend) || $('li.is-next', legend);
  if (focus && legend.scrollWidth > legend.clientWidth + 1) {
    legend.scrollTo({ left: focus.offsetLeft + focus.offsetWidth / 2 - legend.clientWidth / 2, behavior: reduced() ? 'auto' : 'smooth' });
  }
}

function flipFrom(container, before, motion) {
  $$('.lay-slot', container).forEach((slot) => {
    const from = before.get(slot.dataset.key);
    if (!from) return;
    const to = localRect(slot);
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const s = from.width / to.width;
    slot.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${s})` }, { transform: 'none' }], { duration: motion.duration, easing: motion.easing });
  });
}

// Celtic Cross şeritten haça geçerken kesen kart yerine uçarken yatar; dönüş bir anda atlamaz.
function turnFrom(container, before, motion) {
  $$('.lay-slot', container).forEach((slot) => {
    const rot = $('.lay-rot', slot);
    const from = before.get(slot.dataset.key);
    if (from === undefined || from === rot.style.transform) return;
    rot.animate([{ transform: from || 'none' }, { transform: rot.style.transform }], { duration: motion.duration, easing: motion.easing });
  });
}

function updateReveal() {
  const spread = currentSpread();
  const total = spread.cardCount;
  const count = state.revealed.size;
  setProgress(`${count} / ${total}`);
  const next = spread.positions.find((p) => !state.revealed.has(p.key));
  $$('#layout .lay-slot').forEach((slot) => {
    slot.classList.toggle('is-suggested', Boolean(next) && slot.dataset.key === next.key);
  });
  const done = count === total;
  secondaryBtn.hidden = done;
  if (!done) statusEl.textContent = `${count} / ${total} kart açık`;
  if (done && primaryBtn.hidden) {
    primaryBtn.hidden = false;
    statusEl.textContent = 'Tüm kartlar açıldı';
    if (!reduced()) animate(primaryBtn, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 250, easing: 'ease-out' });
    primaryBtn.focus({ preventScroll: true });
  }
  renderSrList();
  paintLegend();
}

function renderSrList() {
  const list = $('#sr-list');
  if (!list) return;
  const spread = currentSpread();
  list.innerHTML = spread.positions.map((p) => {
    const pick = state.picks.find((x) => x.positionKey === p.key);
    const label = labelFor(p);
    if (!pick) return `<li>${esc(label)}: boş</li>`;
    if (!state.revealed.has(p.key) || !pick.card) return `<li>${esc(label)}: yüzü kapalı</li>`;
    return `<li>${esc(label)}: ${esc(pick.card.name)}${pick.reversed ? ', ters' : ''}</li>`;
  }).join('');
}

async function revealCard(key, mode) {
  const spread = currentSpread();
  const pick = state.picks.find((p) => p.positionKey === key);
  if (!pick || state.revealed.has(key) || state.revealing.has(key)) return;
  state.revealing.add(key);
  if (pick.pending) await pick.request;
  if (!pick.card) { state.revealing.delete(key); return; }
  await pick.ready;
  const slot = slotEl(key);
  if (!slot) return;
  setSlotCard(slot, pick);
  service.reveal(state.readingId, key);
  track('card_revealed', { spreadId: spread.id, positionKey: key, reversed: pick.reversed, mode });
  const flip = $('.card-flip', slot);
  const turn = $('.card-turn', slot);
  if (reduced()) {
    slot.classList.add('is-revealed');
    if (pick.reversed) slot.classList.add('is-reversed');
    await animate($('.face-front', slot), [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
  } else {
    sfx.whoosh();
    const major = TAROT.getCard(pick.card.id).arcana === 'major';
    setTimeout(() => MOTION.burst(slot, { major }), FLIP_MS * 0.45);
    if (major) setTimeout(() => haptic(30), FLIP_MS * 0.5);
    flip.style.willChange = 'transform';
    setTimeout(() => haptic(15), FLIP_MS / 2);
    await animate(flip, [
      { transform: 'rotateY(0deg) scale(1)' },
      { transform: 'rotateY(90deg) scale(1.08)', offset: 0.5 },
      { transform: 'rotateY(180deg) scale(1)' }
    ], { duration: FLIP_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' });
    slot.classList.add('is-revealed');
    flip.getAnimations().forEach((a) => a.cancel());
    flip.style.willChange = '';
    if (pick.reversed) {
      await animate(turn, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(180deg)' }], { duration: 350, easing: 'ease-in-out', fill: 'forwards' });
      slot.classList.add('is-reversed');
      turn.getAnimations().forEach((a) => a.cancel());
    }
  }
  state.revealing.delete(key);
  state.revealed.add(key);
  const position = spread.positions.find((p) => p.key === key);
  updateSlotLabel(slot, position, 'reveal');
  const label = $('.lay-detail', slot);
  if (label && !reduced()) animate(label, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 250, easing: 'ease-out' });
  paintLegend(key);
  const card = TAROT.getCard(pick.card.id);
  const keywords = ENGINE.keywordsOf(card, pick.reversed, TAROT);
  announce(`${labelFor(position)}: ${card.name}${pick.reversed ? ', ters' : ''}. ${keywords.join(', ')}.`);
  if (state.step === 'reveal') updateReveal();
}

async function revealAll() {
  const spread = currentSpread();
  secondaryBtn.hidden = true;
  const pending = spread.positions.filter((p) => !state.revealed.has(p.key) && !state.revealing.has(p.key));
  for (let i = 0; i < pending.length; i++) {
    revealCard(pending[i].key, 'all');
    if (i < pending.length - 1) await sleep(150);
  }
}

// ---------- Layout çizimi ----------

// Dizilim kutusu sonradan boyut değiştirirse (düğmeler belirince, yazı tipi yüklenince, liste açılınca)
// kartlar yeniden sığdırılır; aynı boyda yeniden çizilmez. Gözlemci boyamadan önce çalışır, sıçrama görünmez.
const layoutSize = new WeakMap();
const layoutObserver = window.ResizeObserver ? new ResizeObserver((entries) => {
  entries.forEach(({ target }) => {
    if (!target.isConnected || !target.dataset.mode || !state.spreadId) return;
    if (layoutSize.get(target) === `${target.clientWidth}x${target.clientHeight}`) return;
    renderLayout(target, currentSpread(), target.dataset.mode);
  });
}) : null;

function renderLayout(container, spread, mode, fit = {}) {
  if (!layoutSize.has(container) && layoutObserver) layoutObserver.observe(container);
  layoutSize.set(container, `${container.clientWidth}x${container.clientHeight}`);
  const narrow = isNarrow();
  const geo = geometry(spread, Math.max(40, container.clientWidth), container.clientHeight, mode, narrow, fit);
  container.style.setProperty('--cw', `${geo.cw}px`);
  container.style.setProperty('--ch', `${geo.ch}px`);
  container.style.setProperty('--label-w', `${Math.round(geo.cellW - 4)}px`);
  container.style.setProperty('--side-w', `${geo.labelW || 150}px`);
  container.style.setProperty('--kw-lines', geo.spanY === 0 ? 2 : 1);
  container.dataset.mode = mode;
  container.dataset.spread = spread.id;
  container.dataset.frame = frameFor(spread);
  if (geo.strip) container.dataset.strip = geo.strip;
  else delete container.dataset.strip;
  container.toggleAttribute('data-badged', !geo.strip && (badged(spread, mode) || Boolean(fit.badged)));
  // Kart rozetten pek büyük değilse rozetler kartı örter: yalnız öne çıkan ve sıradaki kartın rozeti kalır.
  container.toggleAttribute('data-tiny', geo.cw < 34);
  const existing = new Map($$('.lay-slot', container).map((s) => [s.dataset.key, s]));
  geo.slots.forEach((s) => {
    let slot = existing.get(s.key);
    if (!slot) {
      slot = createSlot(s, mode);
      container.append(slot);
    }
    existing.delete(s.key);
    slot.classList.toggle('is-cross', Boolean(s.rot));
    $('.lay-rot', slot).style.transform = `rotate(${s.rot}deg)`;
    slot.style.cssText = `left:${s.left}px;top:${s.top}px;width:${geo.cw}px;height:${geo.ch}px`;
    slot.dataset.label = s.side || 'below';
    updateSlotLabel(slot, s.position, mode);
    const pick = state.picks.find((p) => p.positionKey === s.key);
    if (pick && mode !== 'preview') {
      slot.classList.add('is-filled');
      if (pick.card) setSlotCard(slot, pick);
      if (state.revealed.has(s.key)) slot.classList.add('is-revealed', ...(pick.reversed ? ['is-reversed'] : []));
    }
  });
  existing.forEach((slot) => slot.remove());
  // Telefonda hücre yerin adını taşıyamayacak kadar darsa (adlar kesilir, birbirine biner) kartlar numara rozeti taşır;
  // sıradaki yerin adı başlıkta, seçilen yerin anlamı altta durur.
  if (!fit.badged && !geo.strip && geo.labelH > 0 && isMobile() && spread.cardCount > 1 && ['preview', 'pick'].includes(mode) && geo.cellW < 84) {
    return renderLayout(container, spread, mode, { badged: true });
  }
  // Kart altındaki etiket ayrılan paya sığmazsa alttaki karta ya da düğmelere biner: dizilim gerçek boyla yeniden kurulur.
  if (!fit.labelH && !fit.badged && geo.labelH > 0 && !geo.strip) {
    const need = labelNeed(container, spread, mode);
    if (need > geo.labelH + 1) return renderLayout(container, spread, mode, { labelH: need });
  }
  return geo;
}

// Kart altındaki etiketlerin istediği pay. Açarken etiket sonradan kart adı, "Ters" ve anahtar kelimelerle uzar;
// bu yüzden açılımın en uzun yer adı, en uzun kart adı ve en uzun anahtar kelimeleriyle bir deneme etiketi de ölçülür.
function labelNeed(container, spread, mode) {
  const below = $$('.lay-slot', container).filter((s) => s.dataset.label === 'below' && !s.classList.contains('is-cross'));
  const height = (slot, label) => label.offsetTop - slot.offsetHeight + label.offsetHeight;
  let need = 0;
  below.forEach((slot) => {
    const label = $('.lay-label', slot);
    if (label && label.offsetParent) need = Math.max(need, height(slot, label));
  });
  const slot = below[0];
  const label = slot && $('.lay-label', slot);
  if (mode === 'reveal' && label && label.offsetParent) {
    const probe = label.cloneNode(true);
    probe.style.visibility = 'hidden';
    const longest = (list) => list.reduce((a, b) => (b.length > a.length ? b : a), '');
    $('.lay-text', probe).textContent = longest(spread.positions.map(labelFor));
    $('.lay-detail', probe).innerHTML = `<span class="lay-card-name">${esc(LONGEST.name())}</span><span class="badge-reversed">Ters</span><span class="lay-keywords">${esc(LONGEST.keywords())}</span>`;
    slot.append(probe);
    need = Math.max(need, height(slot, probe));
    probe.remove();
  }
  return Math.ceil(need);
}

// Destedeki en uzun kart adı ve en uzun anahtar kelime dizisi (etiket payını ölçmek için, bir kez hesaplanır).
const LONGEST = (() => {
  let cache = null;
  const compute = () => {
    if (cache) return cache;
    const longest = (list) => list.reduce((a, b) => (b.length > a.length ? b : a), '');
    const cards = TAROT.CARDS || [];
    cache = {
      name: longest(cards.map((c) => c.nameTr)),
      keywords: longest(cards.flatMap((c) => [false, true].map((r) => ENGINE.keywordsOf(c, r, TAROT).join(' · '))))
    };
    return cache;
  };
  return { name: () => compute().name, keywords: () => compute().keywords };
})();

function createSlot(s, mode) {
  const slot = document.createElement('div');
  slot.className = `lay-slot${s.rot ? ' is-cross' : ''}`;
  slot.dataset.key = s.key;
  const interactive = mode === 'reveal' || mode === 'pick';
  const inner = '<span class="card-turn"><span class="card-flip"><span class="face face-back card-back"></span><span class="face face-front"><img alt="" decoding="async"></span></span></span>';
  slot.innerHTML = `<div class="lay-rot" style="transform:rotate(${s.rot}deg)">${interactive ? `<button type="button" class="lay-card">${inner}</button>` : `<span class="lay-card">${inner}</span>`}</div>
    <span class="lay-index" aria-hidden="true">${s.position.index}</span>
    <div class="lay-label"><span class="lay-name"><span class="lay-num">${s.position.index}</span> <span class="lay-text"></span></span><span class="lay-detail"></span></div>`;
  return slot;
}

function ensureSlotButton(slot) {
  const card = $('.lay-card', slot);
  if (card.tagName === 'BUTTON') return card;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'lay-card';
  button.innerHTML = card.innerHTML;
  card.replaceWith(button);
  return button;
}

function updateSlotLabel(slot, position, mode) {
  const label = labelFor(position);
  SPREADS.stampSlotBadge(slot, position);
  $('.lay-text', slot).textContent = label;
  const interactive = mode === 'reveal' || mode === 'reading';
  const button = interactive ? ensureSlotButton(slot) : $('.lay-card', slot);
  const pick = state.picks.find((p) => p.positionKey === position.key);
  const detail = $('.lay-detail', slot);
  const spread = currentSpread();
  if (interactive && pick && pick.card && state.revealed.has(position.key)) {
    const card = TAROT.getCard(pick.card.id);
    const kw = ENGINE.keywordsOf(card, pick.reversed, TAROT);
    const keywords = mode === 'reveal' && !position.slot.rot ? `<span class="lay-keywords">${esc(kw.join(' · '))}</span>` : '';
    detail.innerHTML = `<span class="lay-card-name">${esc(card.nameTr)}</span>${pick.reversed ? '<span class="badge-reversed">Ters</span>' : ''}${keywords}`;
  } else if (mode === 'reveal') {
    detail.innerHTML = '<span class="lay-hint">Açmak için dokun</span>';
  } else if (mode === 'preview' && frameFor(spread) === 'row') {
    detail.innerHTML = `<span class="lay-prompt">${esc(captionFor(position))}</span>`;
  } else {
    detail.innerHTML = '';
  }
  if (button.tagName === 'BUTTON') {
    if (mode === 'pick') {
      button.tabIndex = -1;
      button.setAttribute('aria-hidden', 'true');
    } else {
      button.removeAttribute('aria-hidden');
      button.tabIndex = 0;
      const revealed = pick && state.revealed.has(position.key) && pick.card;
      const action = mode === 'reading' ? 'Yorumuna geç; yeniden dokununca kartı büyüt.' : 'Kart detayını aç.';
      button.setAttribute('aria-label', revealed
        ? `${position.index}. ${label}: ${pick.card.name}${pick.reversed ? ', ters' : ''}. ${action}`
        : `${position.index}. ${label}: yüzü kapalı. Açmak için dokun.`);
      button.onclick = () => {
        if (!state.revealed.has(position.key)) { revealCard(position.key, 'tap'); return; }
        const told = story.chapters[story.at.chapter];
        if (mode === 'reading' && state.step === 'reading' && story.chapters.length && (!told || told.key !== position.key)) {
          goToChapter(`card:${position.key}`);
          return;
        }
        openCardDetail(pick.card.id, pick.reversed, $('.face-front img', slot));
      };
    }
  }
}

function setSlotCard(slot, pick) {
  const img = $('.face-front img', slot);
  if (pick.card && img.getAttribute('src') !== pick.card.image) img.src = pick.card.image;
  const position = currentSpread().positions.find((p) => p.key === pick.positionKey);
  if (position) updateSlotLabel(slot, position, state.step === 'reveal' ? 'reveal' : slot.parentElement.dataset.mode);
}

function morphLayout(container, spread, mode) {
  const before = new Map($$('.lay-slot', container).map((s) => [s.dataset.key, localRect(s)]));
  const old = new Set(before.keys());
  const leaving = [];
  $$('.lay-slot', container).forEach((slot) => {
    if (!spread.positions.some((p) => p.key === slot.dataset.key)) {
      const clone = slot.cloneNode(true);
      clone.classList.add('is-leaving');
      leaving.push(clone);
    }
  });
  renderLayout(container, spread, mode);
  if (reduced()) return;
  const motion = spring(300, 30);
  leaving.forEach((clone) => {
    container.append(clone);
    animate(clone, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-out' }).then(() => clone.remove());
  });
  $$('.lay-slot:not(.is-leaving)', container).forEach((slot) => {
    if (!old.has(slot.dataset.key)) {
      slot.animate([{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 80, easing: 'ease-out', fill: 'backwards' });
    }
  });
  flipFrom(container, before, motion);
}

// ---------- 8 · Yorum: kart kart anlatım ----------
// Yorum kaydırılmaz: genel bakış, her kart, genel yorum ve not sırayla birer sahne olarak gelir.
// Anlatılan kart dizilimde öne çıkar; uzun metin cümle sınırından ekrana sığan sayfalara bölünür.

const PREV_MARK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 5-7 7 7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const NEXT_MARK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ZOOM_MARK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.500" stroke="currentColor" stroke-width="1.500"/><path d="m16 16 4.500 4.500M11 8.500v5M8.500 11h5" stroke="currentColor" stroke-width="1.500" stroke-linecap="round"/></svg>';

const story = { chapters: [], at: { chapter: 0, page: 0 }, notes: null, seen: new Set(), resizeTimer: 0 };

RENDERERS.reading = async (options = {}) => {
  const token = state.renderToken;
  const spread = currentSpread();
  setProgress('');
  setActions();
  const reading = state.reading;
  story.chapters = [];
  setHeading(spread.id === 'daily' ? 'Günün kartı' : UI.spreadDisplayName(spread.name), headingMeta(reading));
  body.innerHTML = `<div class="reading-step"><div class="reading-grid">
      <div class="reading-visual"><div class="layout-stage reading-stage" id="layout"></div></div>
      <section class="story" id="story" aria-label="Yorum" aria-busy="true">
        <div class="story-viewport" id="story-viewport">
          <div class="story-page is-current" aria-hidden="true"><div class="story-inner"><div class="skeleton summary-skeleton"></div>${'<div class="skeleton row-skeleton"></div>'.repeat(Math.min(2, spread.cardCount))}</div></div>
        </div>
        <nav class="story-nav" aria-label="Yorumun bölümleri">
          <button type="button" class="story-arrow" id="story-prev" aria-label="Önceki bölüm" disabled>${PREV_MARK}</button>
          <ol class="story-dots" id="story-dots"></ol>
          <span class="story-sub" id="story-sub" aria-hidden="true"></span>
          <button type="button" class="story-arrow is-primary" id="story-next" aria-label="Sonraki bölüm" disabled>${NEXT_MARK}</button>
        </nav>
      </section>
    </div></div>`;
  const layout = $('#layout');
  renderLayout(layout, spread, 'reading');
  if (options.flipBefore && !reduced()) {
    // Telefonda haç şeride dizilirken Celtic Cross'un kesen kartı da doğrulur.
    const motion = spring(170, 22);
    flipFrom(layout, options.flipBefore, motion);
    if (options.turnBefore) turnFrom(layout, options.turnBefore, motion);
    MOTION.enter([$('#story')], { x: 28, y: 0, blur: 0, duration: 800, delay: 280 });
  }
  const interpretation = await (state.interpretationPromise || service.complete(state.readingId));
  const viewed = state.viewOnly ? state.reading : await service.markViewed(state.readingId);
  if (token !== state.renderToken) return;
  state.reading = viewed;
  if (!state.viewOnly) {
    track('reading_viewed', { spreadId: spread.id, msFromStart: Math.round(performance.now() - (state.startedAt || performance.now())), interpretationSource: interpretation.source });
  }
  buildStory(viewed, spread, interpretation);
  fillClosing(viewed, spread, interpretation, token);
};

function headingMeta(reading) {
  const date = new Date(reading.completedAt || reading.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  return reading.question ? `${date} · “${reading.question}”` : date;
}

const SHARE_MARK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 15V4m0 0L8 8m4-4 4 4M6 12v6.500A1.500 1.500 0 0 0 7.500 20h9a1.500 1.500 0 0 0 1.500-1.500V12" stroke="currentColor" stroke-width="1.500" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const RENEW_MARK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.300-5.600" stroke="currentColor" stroke-width="1.600" stroke-linecap="round"/><path d="M20 4v5h-5" stroke="currentColor" stroke-width="1.600" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Genel bakışta masadaki kartların listesi: hangi yere hangi kart geldi, tek bakışta.
function drawnList(reading, spread) {
  // Telefonun dar iki sütununda kart adının yanına "Ters" sığmaz: rozet yerin adının yanında da durur, hangisinin
  // görüneceğini night.css seçer. Yer adı gizlenen sıkışık listede rozet adın yanındadır; ad kısalır, rozet kesilmez.
  const two = spread.positions.length > 5;
  const rows = spread.positions.map((position) => {
    const drawn = reading.cards.find((c) => c.positionKey === position.key);
    if (!drawn) return '';
    const card = TAROT.getCard(drawn.cardId);
    const badge = drawn.reversed ? ' <span class="badge-reversed">Ters</span>' : '';
    return `<li><button type="button" class="drawn-row" data-goto="card:${esc(position.key)}" aria-label="${position.index}. ${esc(ENGINE.displayLabel(position, reading))}: ${esc(card.nameTr)}${drawn.reversed ? ', ters' : ''}. Bu kartın yorumuna git."><span class="drawn-num">${position.index}</span><span class="drawn-copy"><span class="drawn-name"><span class="drawn-card">${esc(card.nameTr)}</span>${badge}</span><span class="drawn-seat">${esc(ENGINE.displayLabel(position, reading))}${two ? badge : ''}</span></span></button></li>`;
  }).join('');
  return `<ol class="drawn-list${two ? ' is-two' : ''}" aria-label="Çektiğin kartlar">${rows}</ol>`;
}

// Anlatımın bölümleri: başlık (yalnızca ilk sayfada) ve sayfalara bölünebilen metin blokları.
function storyChapters(reading, spread, interpretation) {
  const daily = spread.id === 'daily';
  const byKey = Object.fromEntries(reading.cards.map((c) => [c.positionKey, c]));
  const told = Object.fromEntries(interpretation.positions.map((p) => [p.positionKey, p]));
  const positions = Object.fromEntries(spread.positions.map((p) => [p.key, p]));
  const outline = UI.storyOutline({
    spreadId: spread.id,
    positionKeys: spread.positions.map((p) => p.key),
    hasComparison: Boolean(interpretation.comparison),
    hasPairs: Boolean(interpretation.pairs && interpretation.pairs.length)
  });
  // Birden çok kartlı açılımda anlatım, masadaki kartların listesiyle açılır: ne çektiğini önce bir bakışta gör.
  if (!daily) outline.splice(outline.findIndex((c) => c.kind === 'summary'), 0, { id: 'drawn', kind: 'drawn' });
  return outline.map((chapter) => {
    if (chapter.kind === 'drawn') {
      return { ...chapter, label: 'Masadaki kartlar', head: `<p class="eyebrow">MASADAKİ KARTLAR</p>${drawnList(reading, spread)}`, blocks: [], empty: '' };
    }
    if (chapter.kind === 'summary') {
      return { ...chapter, label: daily ? 'Bugünün teması' : 'Genel bakış',
        head: `<p class="eyebrow">${daily ? 'BUGÜNÜN TEMASI' : 'GENEL BAKIŞ'}</p>`,
        blocks: [{ cls: 'summary-text', text: interpretation.summary || '' }, { cls: 'summary-more', text: interpretation.summaryMore || '' }] };
    }
    if (chapter.kind === 'card') {
      const position = positions[chapter.key];
      const drawn = byKey[chapter.key];
      const card = TAROT.getCard(drawn.cardId);
      const keywords = ENGINE.keywordsOf(card, drawn.reversed, TAROT);
      const seat = daily ? 'Günün kartı' : `${position.index} · ${ENGINE.displayLabel(position, reading)}`;
      const said = told[chapter.key] || {};
      const note = NOTES.noteOf(card.id) || {};
      const meaning = [said.meaning || (drawn.reversed ? card.reversed : card.upright), said.area || ''].filter(Boolean).join(' ');
      const here = said.seat ? [said.seat, said.context, said.tie].filter(Boolean).join(' ') : (said.text || '');
      const ask = drawn.reversed ? note.askReversed : note.ask;
      const place = daily ? 'Bugün için' : `${ENGINE.displayLabel(position, reading)} yerinde`;
      return { ...chapter, label: daily ? card.nameTr : seat,
        head: `<p class="eyebrow">${esc(seat)}</p>
          <h3 class="story-title">${esc(card.nameTr)} <span class="card-tr">${esc(card.name)}</span>${drawn.reversed ? ' <span class="badge-reversed">Ters</span>' : ''}
            <button type="button" class="card-zoom" data-card="${esc(card.id)}" data-reversed="${drawn.reversed}" data-key="${esc(chapter.key)}" aria-label="${esc(card.nameTr)} kartını büyüt">${ZOOM_MARK}</button></h3>
          <ul class="chips" aria-label="Anahtar kelimeler">${keywords.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>`,
        blocks: [
          note.scene ? { cls: 'scene-text', label: 'Kartta', text: note.scene } : null,
          { cls: 'meaning-text', label: drawn.reversed ? 'Ters gelişte anlamı' : 'Anlamı', text: meaning },
          { cls: 'position-text', label: place, text: here },
          ask ? { cls: 'ask-text', label: 'Kendine sor', text: ask } : null
        ].filter(Boolean) };
    }
    if (chapter.kind === 'comparison') {
      const cmp = interpretation.comparison;
      return { ...chapter, label: 'İki yol',
        head: '<p class="eyebrow">İKİ YOL</p><h3 class="story-title">A ve B karşılaştırması</h3>',
        blocks: [
          { cls: 'compare-text', title: reading.optionA || 'A', text: cmp.a || '' },
          { cls: 'compare-text', title: reading.optionB || 'B', text: cmp.b || '' },
          { cls: 'compare-note', text: cmp.note || '' }
        ] };
    }
    if (chapter.kind === 'pairs') {
      return { ...chapter, label: 'Pozisyon çiftleri', head: '<p class="eyebrow">POZİSYON ÇİFTLERİ</p>',
        blocks: interpretation.pairs.map((pair) => {
          const [a, b] = pair.keys.map((key) => positions[key]);
          return { cls: 'pair-text', title: `${a.index}–${b.index} · ${a.label} ve ${b.label}`, text: pair.text || '' };
        }) };
    }
    if (chapter.kind === 'closing') {
      return { ...chapter, label: 'Genel yorum', head: '<p class="eyebrow">GENEL YORUM</p>',
        blocks: [{ cls: 'closing-text', text: interpretation.closing || '' }], empty: 'Usta, kartların birlikte ne dediğine bakıyor.' };
    }
    return { ...chapter, label: daily ? 'Bugünden bir not' : 'Notun', fixed: true };
  });
}

function notesPage(reading, spread) {
  const daily = spread.id === 'daily';
  const page = document.createElement('section');
  page.className = 'story-page story-notes';
  page.hidden = true;
  const reminder = daily ? `<label class="toggle-row"><span><strong>Her sabah hatırlat</strong><small>Saat ${esc(settings.reminderTime)} · Ayarlar'dan değiştirebilirsin.</small></span><input type="checkbox" role="switch" id="reminder-toggle"${settings.reminder ? ' checked' : ''}></label>` : '';
  const primaryAction = `<button type="button" class="btn btn-main" id="reading-new">${RENEW_MARK} ${daily ? 'Yeni kart çek' : 'Yeni okuma'}</button>`;
  page.innerHTML = `<div class="story-inner">
      <p class="saved-note">Okuman kaydedildi</p>
      <div class="reading-notes"><label class="field"><span>${daily ? 'Bugünden bir not' : 'Not ekle'}</span><textarea id="note" rows="3" maxlength="2000" placeholder="${daily ? 'Aklında kalan bir cümle…' : 'Bu okuma sana ne düşündürdü?'}">${esc(reading.note || '')}</textarea><span class="counter" id="note-state" aria-live="polite">Okuma otomatik kaydedildi</span></label></div>
      ${reminder}
      <div class="reading-buttons">
        <button type="button" class="btn btn-outline" id="reading-share">${SHARE_MARK} Paylaş</button>
        ${primaryAction}
      </div>
      <p class="share-status" id="reading-status" role="status" aria-live="polite"></p>
      <p class="disclaimer">Tarot bir yansıtma aracıdır; sağlık, hukuk ve finans kararlarında uzman görüşünün yerini tutmaz.</p>
    </div>`;
  return page;
}

function buildStory(reading, spread, interpretation) {
  story.chapters = storyChapters(reading, spread, interpretation);
  story.seen = new Set();
  const viewport = $('#story-viewport');
  viewport.replaceChildren();
  story.notes = notesPage(reading, spread);
  viewport.append(story.notes);
  $('#story').removeAttribute('aria-busy');
  paginateStory();
  $('#story-dots').innerHTML = story.chapters.map((c, i) => `<li><button type="button" class="story-dot" data-chapter="${i}" aria-label="${esc(c.label)}"></button></li>`).join('');
  bindStory();
  bindReading(reading, spread);
  showStoryPage(0, 0, 1, { first: true });
}

function storyMeasure() {
  const viewport = $('#story-viewport');
  let measure = $('.story-measure', viewport);
  if (!measure) {
    measure = document.createElement('div');
    measure.className = 'story-page story-measure';
    measure.setAttribute('aria-hidden', 'true');
    viewport.append(measure);
  }
  return measure;
}

function storyPageHtml(chapter, parts, pageIndex) {
  const head = pageIndex === 0
    ? `<div class="story-head${chapter.compact ? ' is-compact' : ''}">${chapter.head}</div>`
    : `<div class="story-head is-cont"><p class="eyebrow">${esc(chapter.label)} · devamı</p></div>`;
  const blocks = parts.length
    ? parts.map((part) => {
      const block = chapter.blocks[part.block];
      const title = block.title && part.first !== false ? `<h4 class="story-subtitle">${esc(block.title)}</h4>` : '';
      const label = block.label && part.first !== false ? `<p class="story-label">${esc(block.label)}</p>` : '';
      return `${title}<div class="story-block">${label}<p class="story-text ${block.cls}"></p></div>`;
    }).join('')
    : `<p class="story-status">${esc(chapter.empty || '')}</p>`;
  return `<div class="story-inner">${head}<div class="story-body">${blocks}</div></div>`;
}

function paginateChapter(chapter, measure) {
  if (chapter.fixed) { chapter.pages = [null]; return; }
  // Başlık tek başına sayfanın yarısını aşıyorsa (kısa ekran) sade başlık kullanılır.
  chapter.compact = false;
  measure.innerHTML = storyPageHtml(chapter, chapter.blocks.length ? [{ block: 0, text: '' }] : [], 0);
  chapter.compact = measure.firstElementChild.offsetHeight > measure.clientHeight * (chapter.blocks.length ? 0.5 : 1) - 6;
  // Metni olmayan bölüm (masadaki kartlar) tek sayfadır.
  if (!chapter.blocks.length) { chapter.pages = [[]]; return; }
  const fits = (parts, index) => {
    measure.innerHTML = storyPageHtml(chapter, parts, index);
    $$('.story-text', measure).forEach((p, i) => { p.textContent = parts[i].text; });
    return measure.firstElementChild.offsetHeight <= measure.clientHeight - 6;
  };
  const pages = UI.paginateBlocks(chapter.blocks.map((b) => ({ text: b.text })), fits);
  const seen = new Set();
  chapter.pages = (pages.length ? pages : [[]]).map((parts) => parts.map((part) => {
    const first = !seen.has(part.block);
    seen.add(part.block);
    return { ...part, first };
  }));
}

// Bölümler gösterilecekleri an ölçülür; yorum ekranı açılırken on kartın bütün sayfaları birden ölçülmez.
function paginateStory() {
  story.chapters.forEach((chapter) => { chapter.pages = null; });
}

function ensurePages(chapter) {
  if (!chapter || chapter.pages) return chapter;
  const measure = storyMeasure();
  paginateChapter(chapter, measure);
  measure.innerHTML = '';
  return chapter;
}

// Bir sonraki bölüm boşta ölçülür; ileri basınca hazır olur.
function prefetchPages(index) {
  const next = story.chapters[index];
  if (!next || next.pages) return;
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 120));
  idle(() => { if (story.chapters[index] === next && $('#story-viewport')) ensurePages(next); });
}

function showStoryPage(ci, pi, dir = 1, { first = false, quiet = false } = {}) {
  const chapter = ensurePages(story.chapters[ci]);
  const viewport = $('#story-viewport');
  if (!chapter || !viewport) return;
  const pageIndex = Math.max(0, Math.min(pi, chapter.pages.length - 1));
  story.at = { chapter: ci, page: pageIndex };
  story.seen.add(ci);
  const old = $('.story-page.is-current:not(.story-measure)', viewport);
  let page;
  if (chapter.fixed) {
    page = story.notes;
    page.hidden = false;
  } else {
    page = document.createElement('section');
    page.className = 'story-page';
    const parts = chapter.pages[pageIndex];
    page.innerHTML = storyPageHtml(chapter, parts, pageIndex);
    let delay = first ? 320 : 160;
    $$('.story-text', page).forEach((p, i) => {
      const typed = MOTION.words(p, parts[i].text, { delay, step: 16, max: 950 });
      if (quiet) typed.el.classList.add('is-instant');
      delay += Math.min(420, typed.duration * 0.35);
    });
    viewport.append(page);
  }
  page.setAttribute('role', 'group');
  page.setAttribute('aria-roledescription', 'bölüm');
  page.setAttribute('aria-label', `${ci + 1} / ${story.chapters.length}: ${chapter.label}`);
  page.classList.add('is-current');
  if (old && old !== page) retireStoryPage(old, dir);
  if (!quiet) MOTION.enter([page], { x: dir * 36, y: 0, blur: 6, duration: 640, delay: old ? 90 : 0 });
  if (!quiet) focusLayoutOn(chapter);
  updateStoryNav();
  prefetchPages(ci + 1);
}

function retireStoryPage(page, dir) {
  page.classList.remove('is-current');
  const done = () => {
    if (page.classList.contains('is-current')) return;
    if (page === story.notes) page.hidden = true;
    else page.remove();
  };
  if (reduced()) { done(); return; }
  page.style.pointerEvents = 'none';
  MOTION.run(page, [
    { opacity: 1, transform: 'none', filter: 'blur(0)' },
    { opacity: 0, transform: `translateX(${-dir * 36}px)`, filter: 'blur(6px)' }
  ], { duration: 300, easing: 'cubic-bezier(.4,0,.7,.2)', fill: 'forwards' }).then((animation) => {
    done();
    page.style.pointerEvents = '';
    if (animation && animation.cancel) animation.cancel();
  });
}

// Anlatılan kart öne çıkar; genel bakışta ve genel yorumda bütün kartlar sırayla bir kez kıpırdar.
function focusLayoutOn(chapter) {
  const layout = $('#layout');
  if (!layout) return;
  const key = chapter.kind === 'card' ? chapter.key : '';
  $$('.lay-slot', layout).forEach((slot) => slot.classList.toggle('is-focus', slot.dataset.key === key));
  if (key) layout.dataset.focus = key;
  else delete layout.dataset.focus;
  paintFocusCard(chapter);
  if (key || reduced() || chapter.fixed) return;
  $$('.lay-slot .lay-card', layout).forEach((card, i) => MOTION.run(card, [
    { transform: 'none' }, { transform: 'translateY(-10px) scale(1.03)', offset: 0.4 }, { transform: 'none' }
  ], { duration: 900, delay: 160 + i * 80, easing: 'ease-in-out' }));
}

// Telefonda dizilim küçük kalır; anlatılan kart üst alanda büyük gösterilir, dokununca penceresi açılır.
function paintFocusCard(chapter) {
  const visual = $('.reading-visual');
  if (!visual) return;
  const pick = chapter.kind === 'card' && currentSpread().cardCount > 1 ? state.picks.find((p) => p.positionKey === chapter.key) : null;
  let holder = $('.focus-card', visual);
  visual.classList.toggle('has-focus-card', Boolean(pick && pick.card));
  if (!pick || !pick.card) return;
  if (!holder) {
    holder = document.createElement('button');
    holder.type = 'button';
    holder.className = 'focus-card';
    visual.append(holder);
    holder.addEventListener('click', () => {
      const img = $('img', holder);
      openCardDetail(holder.dataset.card, holder.dataset.reversed === 'true', img);
    });
  }
  holder.dataset.card = pick.card.id;
  holder.dataset.reversed = String(pick.reversed);
  holder.setAttribute('aria-label', `${pick.card.name}${pick.reversed ? ', ters' : ''} kartını büyüt`);
  holder.innerHTML = `<img src="${esc(pick.card.image)}" alt=""${pick.reversed ? ' class="is-reversed"' : ''}>`;
  MOTION.enter([holder.firstElementChild], { y: 14, scale: 0.93, duration: 640, delay: 60 });
}

function updateStoryNav() {
  const { chapter: ci, page } = story.at;
  const chapter = story.chapters[ci];
  const prev = $('#story-prev');
  const next = $('#story-next');
  if (!chapter || !prev) return;
  const hasMore = page < chapter.pages.length - 1;
  const following = hasMore ? chapter : story.chapters[ci + 1];
  prev.disabled = ci === 0 && page === 0;
  next.disabled = !following;
  next.classList.toggle('is-nudge', ci === 0 && page === 0);
  next.setAttribute('aria-label', !following ? 'Son bölüm' : hasMore ? `${chapter.label}, devamı` : `Sonraki: ${following.label}`);
  $('#story-sub').textContent = chapter.pages.length > 1 ? `${page + 1} / ${chapter.pages.length}` : '';
  $$('#story-dots .story-dot').forEach((dot, i) => {
    if (i === ci) dot.setAttribute('aria-current', 'step');
    else dot.removeAttribute('aria-current');
    dot.classList.toggle('is-seen', story.seen.has(i));
  });
}

function storyStep(dir) {
  if (!story.chapters.length) return;
  const { chapter: ci, page } = story.at;
  const chapter = story.chapters[ci];
  if (dir > 0) {
    if (page < chapter.pages.length - 1) showStoryPage(ci, page + 1, 1);
    else if (ci < story.chapters.length - 1) showStoryPage(ci + 1, 0, 1);
    else return;
  } else {
    if (page > 0) showStoryPage(ci, page - 1, -1);
    else if (ci > 0) showStoryPage(ci - 1, ensurePages(story.chapters[ci - 1]).pages.length - 1, -1);
    else return;
  }
  haptic(6);
}

function goToChapter(id) {
  const index = story.chapters.findIndex((c) => c.id === id);
  if (index < 0 || index === story.at.chapter) return;
  showStoryPage(index, 0, index > story.at.chapter ? 1 : -1);
}

function bindStory() {
  $('#story-prev').onclick = () => storyStep(-1);
  $('#story-next').onclick = () => storyStep(1);
  $('#story-dots').onclick = (event) => {
    const dot = event.target.closest('.story-dot');
    if (!dot) return;
    const index = Number(dot.dataset.chapter);
    if (index !== story.at.chapter) showStoryPage(index, 0, index > story.at.chapter ? 1 : -1);
  };
  $('#story-viewport').onclick = (event) => {
    const goto = event.target.closest('[data-goto]');
    if (goto) { goToChapter(goto.dataset.goto); return; }
    const zoom = event.target.closest('.card-zoom');
    if (zoom) {
      const slot = slotEl(zoom.dataset.key);
      openCardDetail(zoom.dataset.card, zoom.dataset.reversed === 'true', slot ? $('.face-front img', slot) : null);
      return;
    }
    if (!event.target.closest('button, a, input, textarea, label, select')) {
      $$('.story-page.is-current .words').forEach((words) => words.classList.add('is-instant'));
    }
  };
  const grid = $('.reading-grid');
  bindSwipe(grid, storyStep);
  bindWheelSteps(grid, storyStep);
}

function storyResize() {
  if (state.step !== 'reading' || !story.chapters.length || !$('#story-viewport')) return;
  clearTimeout(story.resizeTimer);
  story.resizeTimer = setTimeout(() => {
    const { chapter, page } = story.at;
    paginateStory();
    const current = $('#story-viewport .story-page.is-current');
    if (current && current !== story.notes) current.remove();
    if (current) current.classList.remove('is-current');
    showStoryPage(chapter, page, 1, { quiet: true });
  }, 160);
}

// Yorum ekranında ok tuşları ve PageUp/PageDown bölümler arasında gezer.
document.addEventListener('keydown', (event) => {
  if (stage.dataset.view !== 'home' || state.step !== 'reading' || !story.chapters.length) return;
  if (Object.values(dialogs).some((d) => d.open) || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target.closest && event.target.closest('input, textarea, select, [role=radiogroup]')) return;
  if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); storyStep(1); }
  else if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); storyStep(-1); }
});

// Dokunmatikte yatay kaydırma hareketi bir adım ilerletir ya da geri alır.
function bindSwipe(el, onStep) {
  if (!el || el.dataset.swipe) return;
  el.dataset.swipe = 'true';
  let start = null;
  el.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' || event.target.closest('textarea, input, select')) return;
    start = { x: event.clientX, y: event.clientY };
  });
  el.addEventListener('pointerup', (event) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    const stop = (e) => { e.stopPropagation(); e.preventDefault(); };
    el.addEventListener('click', stop, { capture: true, once: true });
    setTimeout(() => el.removeEventListener('click', stop, { capture: true }), 350);
    onStep(dx < 0 ? 1 : -1);
  });
  el.addEventListener('pointercancel', () => { start = null; });
}

// Sayfa kaymadığı için fare tekerleği ve dokunmatik yüzey kaydırması da bir adım sayılır.
// Kesintisiz bir hareket (ataletli kaydırma dahil) yalnızca bir adım atar.
function bindWheelSteps(el, onStep, { threshold = 40 } = {}) {
  if (!el || el.dataset.wheel) return;
  el.dataset.wheel = 'true';
  let sum = 0;
  let locked = false;
  let quiet = 0;
  el.addEventListener('wheel', (event) => {
    if (event.target.closest('textarea') || event.ctrlKey) return;
    event.preventDefault();
    clearTimeout(quiet);
    quiet = setTimeout(() => { locked = false; sum = 0; }, 220);
    if (locked) return;
    sum += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(sum) < threshold) return;
    locked = true;
    onStep(sum > 0 ? 1 : -1);
  }, { passive: false });
}

function closingStatus(error) {
  if (error && error.name === 'AbortError') return 'Yorum bu sefer yetişmedi. Üstteki sentez duruyor.';
  if (error && error.code === 'missing-model') return 'Yorum modeli henüz hazır değil. Üstteki sentez duruyor.';
  return 'Yorum kapısı kapalı. Üstteki sentez duruyor.';
}

// Genel yorum önce şablonla gelir; model cevabı yetişirse sayfaları yeniden dizilir.
function setClosingText(text, token) {
  if (token !== state.renderToken) return;
  const index = story.chapters.findIndex((c) => c.kind === 'closing');
  const chapter = story.chapters[index];
  if (!chapter || chapter.blocks[0].text === text) return;
  chapter.blocks[0].text = text;
  const measure = storyMeasure();
  paginateChapter(chapter, measure);
  measure.innerHTML = '';
  if (story.at.chapter === index) showStoryPage(index, 0, 1);
  else updateStoryNav();
}

async function fillClosing(reading, spread, interpretation, token) {
  if (!story.chapters.some((c) => c.kind === 'closing')) return;
  if (interpretation.closing && (interpretation.closingSource === 'llm' || interpretation.closingVoice === ORACLE.VOICE)) {
    setClosingText(interpretation.closing, token);
    return;
  }
  const draft = ORACLE.longClosing(reading, spread, TAROT);
  setClosingText(draft, token);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const text = await ORACLE.closing(reading, spread, TAROT, { signal: ctrl.signal });
    const longEnough = text && text.trim().split(/\s+/).length >= 180;
    if (token !== state.renderToken || !longEnough) throw new Error('short');
    interpretation.closing = text.trim();
    interpretation.closingSource = 'llm';
    setClosingText(interpretation.closing, token);
    await service.saveClosing(reading.id, interpretation.closing, 'llm');
  } catch (error) {
    if (token !== state.renderToken) return;
    interpretation.closing = draft;
    interpretation.closingSource = 'template';
    setClosingText(draft, token);
    await service.saveClosing(reading.id, draft, 'template');
  } finally {
    clearTimeout(timer);
  }
}

function bindReading(reading, spread) {
  $('#reading-share').addEventListener('click', shareReading);
  $('#reading-new').addEventListener('click', startNewReading);
  let timer = 0;
  $('#note').addEventListener('input', (event) => {
    clearTimeout(timer);
    $('#note-state').textContent = 'Kaydediliyor…';
    timer = setTimeout(async () => {
      await service.patch(reading.id, { note: event.target.value });
      $('#note-state').textContent = 'Not kaydedildi';
    }, 500);
  });
  const reminder = $('#reminder-toggle');
  if (reminder) {
    reminder.addEventListener('change', () => {
      settings.reminder = reminder.checked;
      saveSettings();
      track('daily_reminder_toggled', { enabled: reminder.checked });
      if (reminder.checked && window.Notification && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    });
  }
}

async function openSavedReading(reading) {
  resetReading();
  state.reading = reading;
  state.readingId = reading.id;
  state.spreadId = reading.spreadId;
  state.viewOnly = reading.status === 'complete';
  state.picks = reading.cards.map(pickFromStored);
  state.revealed = new Set(reading.cards.map((c) => c.positionKey));
  state.interpretationPromise = service.complete(reading.id);
  return go('reading');
}

async function resumeReading(reading) {
  if (!reading) return undefined;
  resetReading();
  const spread = SPREADS.getSpread(reading.spreadId);
  state.reading = reading;
  state.readingId = reading.id;
  state.spreadId = reading.spreadId;
  state.intentId = spread.intents[0];
  state.inputs = { question: reading.question || '', optionA: reading.optionA || '', optionB: reading.optionB || '', personName: reading.personName || '' };
  state.readingPromise = Promise.resolve({ readingId: reading.id, existing: true });
  state.picks = reading.cards.map(pickFromStored);
  state.revealed = new Set(reading.cards.filter((c) => c.revealedAt).map((c) => c.positionKey));
  state.startedAt = performance.now();
  if (state.picks.length < spread.cardCount) return go('pick');
  state.interpretationPromise = service.complete(reading.id);
  return go('reveal');
}

// ---------- Kart detayı ----------

// Kart rehberinden açılınca önceki/sonraki gezinmesi için görünen kart sırası.
let detailContext = null;

function fillCardDetail(cardId, reversed) {
  const card = TAROT.getCard(cardId);
  const img = $('#card-dialog-img');
  img.src = card.image;
  img.alt = `${card.nameTr} kartı`;
  const meta = card.arcana === 'major' ? `Büyük Arkana · ${card.numeral}` : `${TAROT.SUITS[card.suit].nameTr} · ${card.title}`;
  $('#card-dialog-meta').textContent = meta.toLocaleUpperCase('tr');
  $('#card-dialog-title').textContent = card.nameTr;
  $('#card-dialog-tr').textContent = [card.name, card.arcana === 'major' ? card.astrology : '', reversed ? 'bu okumada ters' : ''].filter(Boolean).join(' · ');
  $('#card-dialog-keys').replaceChildren(...card.keywords.slice(0, 4).map((keyword) => {
    const li = document.createElement('li');
    li.textContent = keyword;
    return li;
  }));
  detailMeaning = { card, drawnReversed: Boolean(reversed) };
  setMeaning(reversed ? 'reversed' : 'upright', { animate: false });
  return img;
}

// Düz ve ters anlam aynı yerde gösterilir; terse geçince kart da elde döner gibi ters çevrilir.
let detailMeaning = null;
function setMeaning(kind, { animate: animated = true } = {}) {
  if (!detailMeaning) return;
  const { card, drawnReversed } = detailMeaning;
  const reversed = kind === 'reversed';
  $$('#meaning-toggle [data-meaning]').forEach((button) => {
    const on = button.dataset.meaning === kind;
    button.setAttribute('aria-checked', String(on));
    button.tabIndex = on ? 0 : -1;
  });
  const img = $('#card-dialog-img');
  if (!animated) img.style.transition = 'none';
  img.classList.toggle('is-reversed', reversed);
  if (!animated) { void img.offsetWidth; img.style.transition = ''; }
  $('#card-meaning-title').textContent = reversed ? (drawnReversed ? 'Ters anlam · bu okumada' : 'Ters anlam') : 'Düz anlam';
  $('#card-meaning-text').textContent = reversed ? card.reversed : card.upright;
  const box = $('#card-meaning');
  box.classList.remove('is-swapping');
  if (animated && !reduced()) { void box.offsetWidth; box.classList.add('is-swapping'); }
}

$('#meaning-toggle').addEventListener('click', (event) => {
  const button = event.target.closest('[data-meaning]');
  if (button && button.getAttribute('aria-checked') !== 'true') { setMeaning(button.dataset.meaning); haptic(8); }
});
$('#meaning-toggle').addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  event.stopPropagation();
  const next = $('#meaning-toggle [aria-checked=false]');
  setMeaning(next.dataset.meaning);
  next.focus();
});

function updateCardNav() {
  const nav = $('#card-dialog-nav');
  nav.hidden = !detailContext || detailContext.ids.length < 2;
  if (nav.hidden) return;
  $('#card-prev').disabled = detailContext.index <= 0;
  $('#card-next').disabled = detailContext.index >= detailContext.ids.length - 1;
}

function stepCardDetail(direction) {
  if (!detailContext) return;
  const index = detailContext.index + direction;
  if (index < 0 || index >= detailContext.ids.length) return;
  detailContext.index = index;
  fillCardDetail(detailContext.ids[index], false);
  updateCardNav();
  MOTION.enter([$('#card-dialog-img')], { x: direction * 40, y: 0, blur: 0, scale: 0.94, duration: 520, delay: 0 });
  MOTION.enter($$('.card-detail-copy > *:not(.card-detail-nav)'), { x: direction * 18, y: 0, blur: 4, duration: 480, delay: 40, stagger: 30 });
  const focusTarget = direction > 0 ? $('#card-next') : $('#card-prev');
  (focusTarget.disabled ? (direction > 0 ? $('#card-prev') : $('#card-next')) : focusTarget).focus();
}

function openCardDetail(cardId, reversed, fromImg, ids = null) {
  const dialog = dialogs.card;
  detailContext = ids && ids.length ? { ids, index: Math.max(0, ids.indexOf(cardId)) } : null;
  const img = fillCardDetail(cardId, reversed);
  updateCardNav();
  dialog.showModal();
  if (!fromImg || reduced()) return;
  const from = visualRect(fromImg);
  const to = img.getBoundingClientRect();
  if (!from.width || !to.width) return;
  const motion = spring(260, 28);
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const turn = reversed ? ' rotate(180deg)' : '';
  img.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width})${turn}` },
    { transform: reversed ? 'rotate(180deg)' : 'none' }
  ], { duration: Math.max(320, motion.duration), easing: motion.easing });
  animate(dialog, [{ opacity: 0.4 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
}

$('#card-prev').addEventListener('click', () => stepCardDetail(-1));
$('#card-next').addEventListener('click', () => stepCardDetail(1));
dialogs.card.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') stepCardDetail(-1);
  else if (event.key === 'ArrowRight') stepCardDetail(1);
});

// ---------- Paylaş ----------

async function shareReading() {
  const reading = state.reading;
  const spread = currentSpread();
  const interpretation = await (state.interpretationPromise || service.complete(reading.id));
  let blob;
  try { blob = await storyImage(reading, spread, interpretation, true); } catch (error) { blob = null; }
  if (!blob) blob = await storyImage(reading, spread, interpretation, false);
  track('reading_shared', { spreadId: spread.id });
  const file = new File([blob], `kendine-don-${spread.id}.png`, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: `kendine dön · ${spread.name}` }); return; } catch (error) { if (error.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  const shareStatus = $('#reading-status');
  (shareStatus || statusEl).textContent = 'Paylaşım görseli indirildi';
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(/\s+/);
  let line = '';
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      if (lines === maxLines - 1) { ctx.fillText(`${line}…`, x, y); return y + lineHeight; }
      ctx.fillText(line, x, y);
      line = words[i];
      y += lineHeight;
      lines++;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineHeight;
}

async function storyImage(reading, spread, interpretation, withFaces) {
  await document.fonts.ready;
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const DISPLAY = 'NightDisplay, Georgia, serif';
  const UI_FONT = 'NightUI, Arial, sans-serif';
  ctx.fillStyle = '#070d19';
  ctx.fillRect(0, 0, W, H);
  // Masa sahnesi: hedef oranı dolduracak şekilde ortadan kırpılır.
  try {
    const scene = await loadImage('assets/night/night-scene.png');
    const scale = Math.max(W / scene.width, H / scene.height);
    const sw = W / scale;
    const sh = H / scale;
    ctx.drawImage(scene, (scene.width - sw) / 2, (scene.height - sh) / 2, sw, sh, 0, 0, W, H);
  } catch (error) { /* düz zemin yeter */ }
  const veil = ctx.createLinearGradient(0, 0, 0, H);
  veil.addColorStop(0, 'rgba(7,13,25,.72)');
  veil.addColorStop(0.45, 'rgba(7,13,25,.38)');
  veil.addColorStop(1, 'rgba(7,13,25,.86)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(235,222,202,.28)';
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, W - 96, H - 96);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4ebdd';
  ctx.font = `400 72px ${DISPLAY}`;
  ctx.fillText('kendine dön', 540, 170);
  ctx.fillStyle = '#d8b782';
  ctx.font = `400 22px ${UI_FONT}`;
  ctx.fillText('İÇİNDE KALANLARA BİR YER', 540, 214);
  ctx.fillStyle = '#f4ebdd';
  ctx.font = `400 60px ${DISPLAY}`;
  ctx.fillText(UI.spreadDisplayName(spread.name), 540, 330);
  ctx.font = `400 28px ${UI_FONT}`;
  ctx.fillStyle = '#b7b4be';
  ctx.fillText(new Date(reading.completedAt || reading.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }), 540, 380);

  const geo = geometry(spread, 900, 820, 'share', false);
  const byKey = Object.fromEntries(reading.cards.map((c) => [c.positionKey, c]));
  const faces = withFaces ? await Promise.all(spread.positions.map((p) => loadImage(TAROT.getCard(byKey[p.key].cardId).image))) : [];
  const back = withFaces ? null : await loadImage('assets/night/card-back.png').catch(() => null);
  geo.slots.forEach((s, i) => {
    const drawn = byKey[s.key];
    const card = TAROT.getCard(drawn.cardId);
    const cx = 90 + s.left + geo.cw / 2;
    const cy = 430 + s.top + geo.ch / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(((s.rot + (drawn.reversed ? 180 : 0)) * Math.PI) / 180);
    ctx.shadowColor = 'rgba(0,0,0,.7)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 12;
    if (faces[i]) ctx.drawImage(faces[i], -geo.cw / 2, -geo.ch / 2, geo.cw, geo.ch);
    else if (back) ctx.drawImage(back, -geo.cw / 2, -geo.ch / 2, geo.cw, geo.ch);
    else { ctx.fillStyle = '#10245c'; ctx.fillRect(-geo.cw / 2, -geo.ch / 2, geo.cw, geo.ch); }
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(216,183,130,.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-geo.cw / 2, -geo.ch / 2, geo.cw, geo.ch);
    ctx.restore();
    if (!s.rot) {
      ctx.fillStyle = '#f4ebdd';
      ctx.font = `400 ${Math.max(18, Math.round(geo.cw / 6.5))}px ${DISPLAY}`;
      ctx.fillText(card.nameTr + (drawn.reversed ? ' (Ters)' : ''), cx, cy + geo.ch / 2 + 32, geo.cellW);
      ctx.fillStyle = '#b7b4be';
      ctx.font = `400 ${Math.max(14, Math.round(geo.cw / 8))}px ${UI_FONT}`;
      ctx.fillText(ENGINE.displayLabel(s.position, reading), cx, cy + geo.ch / 2 + 58, geo.cellW);
    }
  });
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f4ebdd';
  ctx.font = `400 34px ${DISPLAY}`;
  wrapText(ctx, interpretation.summary, 110, 1340, 860, 48, 9);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8f8c9a';
  ctx.font = `400 20px ${UI_FONT}`;
  ctx.fillText('Tarot bir yansıtma aracıdır; uzman görüşünün yerini tutmaz.', 540, 1820);
  return new Promise((resolve, reject) => {
    try { canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('blob'))), 'image/png'); } catch (error) { reject(error); }
  });
}

// ---------- Diyaloglar ----------

const GUIDE_GROUPS = [
  { id: 'major', title: 'Büyük Arkana' },
  { id: 'wands', title: 'Asalar' },
  { id: 'cups', title: 'Kupalar' },
  { id: 'swords', title: 'Kılıçlar' },
  { id: 'pentacles', title: 'Tılsımlar' }
];
let guideSuit = 'all';
let guideQuery = '';

function guideCards(groupId) {
  return groupId === 'major' ? TAROT.MAJOR : TAROT.MINOR.filter((card) => card.suit === groupId);
}

function cardMatches(card, query) {
  if (!query) return true;
  const haystack = [card.name, card.nameTr, card.altTr, ...(card.keywords || [])].filter(Boolean).join(' ').toLocaleLowerCase('tr');
  return haystack.includes(query);
}

function guideNote(count) {
  if (!count) return 'Bu aramaya uyan kart yok.';
  if (guideSuit === 'all') return `${count} kart. Birine dokun, penceresini aç.`;
  if (guideSuit === 'major') return `${count} kart. Hayatın geniş döngüleri.`;
  const suit = TAROT.SUITS[guideSuit];
  return `${count} kart · ${suit.element}. ${suit.area}.`;
}

// Kartları tanı: seçilen kartlar masada elde tutulan bir yelpaze gibi açılır; ortadaki kart düz ve büyüktür.
// Sürükleyerek, tekerlekle, oklarla ya da yandaki karta dokunarak gezilir; ortadaki karta dokununca penceresi açılır.
const deck = { cards: [], buttons: [], pos: 0, vel: 0, target: 0, spread: 1, spreadVel: 0, spreadTarget: 1, raf: 0, last: 0, drag: null, dragged: false, w: 180, h: 308, index: -1, told: -1, dealTimer: 0 };

function renderGuide({ deal = true, keep = false } = {}) {
  const query = guideQuery.trim().toLocaleLowerCase('tr');
  const groups = GUIDE_GROUPS.filter((group) => guideSuit === 'all' || group.id === guideSuit);
  const cards = groups.flatMap((group) => guideCards(group.id).filter((card) => cardMatches(card, query)));
  const keepId = keep && deck.cards[deck.target] ? deck.cards[deck.target].id : null;
  deck.cards = cards;
  $('#guide-note').textContent = guideNote(cards.length);
  $('#guide-empty').hidden = cards.length > 0;
  $('#guide-caption').style.visibility = cards.length ? '' : 'hidden';
  $('.guide-controls').style.visibility = cards.length ? '' : 'hidden';
  const host = $('#guide-deck');
  host.innerHTML = cards.map((card, i) => `<button type="button" class="guide-card" data-card="${esc(card.id)}" data-i="${i}" tabindex="-1" aria-label="${esc(card.nameTr)}, ${esc(card.name)}. Penceresini aç."><span class="guide-art card-back"><img alt="" draggable="false" src="${esc(card.image)}"></span></button>`).join('');
  deck.buttons = $$('.guide-card', host);
  $$('img', host).forEach(watchCardImage);
  const start = keepId ? Math.max(0, cards.findIndex((c) => c.id === keepId)) : 0;
  deck.pos = start;
  deck.target = start;
  deck.vel = 0;
  deck.index = -1;
  deck.told = -1;
  measureDeck();
  deck.spread = deal && !reduced() ? 0 : 1;
  deck.spreadVel = 0;
  deck.spreadTarget = 1;
  paintDeck();
  kickDeck();
}

// Kart yüzü yüklenene kadar kart arkası görünür; yükleme bozulursa görsel bir kez daha istenir.
function watchCardImage(img) {
  const show = () => img.classList.add('is-loaded');
  if (img.complete && img.naturalWidth) { show(); return; }
  img.addEventListener('load', show, { once: true });
  img.addEventListener('error', () => {
    const base = img.getAttribute('src').split('?')[0];
    setTimeout(() => {
      img.addEventListener('load', show, { once: true });
      img.src = `${base}?r=${Date.now()}`;
    }, 400);
  }, { once: true });
}

function measureDeck() {
  const host = $('#guide-deck');
  if (!host || !host.clientHeight) return;
  const h = Math.max(64, Math.min(host.clientHeight * 0.84, host.clientWidth * (isMobile() ? 0.5 : 0.25) * CARD_RATIO, 520));
  deck.h = Math.round(h);
  deck.w = Math.round(h / CARD_RATIO);
  host.style.setProperty('--gw', `${deck.w}px`);
  host.style.setProperty('--gh', `${deck.h}px`);
}

function paintDeck() {
  const visible = isMobile() ? 4 : 7;
  deck.buttons.forEach((button, i) => {
    if (Math.abs(i - deck.pos) > visible + 1.5) {
      if (button.style.visibility !== 'hidden') button.style.visibility = 'hidden';
      return;
    }
    const pose = UI.guideFanPose((i - deck.pos) * deck.spread, { cardWidth: deck.w, visible });
    button.style.visibility = pose.opacity > 0.01 ? '' : 'hidden';
    button.style.transform = `translate(-50%, -50%) translate(${pose.x.toFixed(1)}px, ${pose.y.toFixed(1)}px) rotate(${pose.rotate.toFixed(2)}deg) scale(${pose.scale.toFixed(3)})`;
    button.style.opacity = pose.opacity.toFixed(3);
    button.style.zIndex = String(pose.z);
    button.style.setProperty('--dim', pose.dim.toFixed(2));
  });
  const n = deck.cards.length;
  const index = n ? Math.max(0, Math.min(n - 1, Math.round(deck.pos))) : -1;
  if (index !== deck.index) { deck.index = index; paintDeckCaption(); }
}

function paintDeckCaption() {
  const card = deck.cards[deck.index];
  if (!card) return;
  $('#guide-card-meta').textContent = card.arcana === 'major' ? `Büyük Arkana · ${card.numeral}` : `${TAROT.SUITS[card.suit].nameTr} · ${TAROT.SUITS[card.suit].element}`;
  $('#guide-card-name').textContent = card.nameTr;
  $('#guide-card-keys').textContent = card.keywords.slice(0, 3).join(' · ');
  $('#guide-count').textContent = `${deck.index + 1} / ${deck.cards.length}`;
  $('#guide-prev').disabled = deck.index <= 0;
  $('#guide-next').disabled = deck.index >= deck.cards.length - 1;
  const caption = $('#guide-caption');
  caption.classList.remove('is-swapping');
  if (!reduced()) { void caption.offsetWidth; caption.classList.add('is-swapping'); }
  const host = $('#guide-deck');
  const focused = host.contains(document.activeElement);
  deck.buttons.forEach((button, i) => {
    button.classList.toggle('is-center', i === deck.index);
    button.tabIndex = i === deck.index ? 0 : -1;
  });
  if (focused && deck.buttons[deck.index]) deck.buttons[deck.index].focus({ preventScroll: true });
}

// Destenin durduğu kartı ekran okuyucuya bir kez söyler; sürüklerken her kartı okumaz.
function tellDeck() {
  const card = deck.cards[deck.index];
  if (!card || deck.told === deck.index) return;
  deck.told = deck.index;
  $('#guide-live').textContent = `${card.nameTr}. ${card.keywords.slice(0, 3).join(', ')}. ${deck.index + 1} / ${deck.cards.length}.`;
}

function kickDeck() {
  if (reduced()) {
    deck.pos = deck.target;
    deck.spread = deck.spreadTarget;
    deck.vel = 0;
    deck.spreadVel = 0;
    paintDeck();
    tellDeck();
    return;
  }
  if (!deck.raf) {
    deck.last = performance.now();
    deck.raf = requestAnimationFrame(stepDeck);
  }
}

// Deste bir yay gibi hedef karta oturur; dağıtırken hafifçe taşar, toplarken taşmadan kapanır.
function stepDeck(now) {
  const dt = Math.min(0.032, Math.max(0.001, (now - deck.last) / 1000));
  deck.last = now;
  if (!deck.drag) {
    deck.vel += ((deck.target - deck.pos) * 170 - deck.vel * 24) * dt;
    deck.pos += deck.vel * dt;
  }
  const opening = deck.spreadTarget > deck.spread;
  deck.spreadVel += ((deck.spreadTarget - deck.spread) * (opening ? 90 : 320) - deck.spreadVel * (opening ? 13 : 36)) * dt;
  deck.spread += deck.spreadVel * dt;
  paintDeck();
  const settled = !deck.drag && Math.abs(deck.target - deck.pos) < 0.002 && Math.abs(deck.vel) < 0.01
    && Math.abs(deck.spreadTarget - deck.spread) < 0.002 && Math.abs(deck.spreadVel) < 0.01;
  if (!settled) { deck.raf = requestAnimationFrame(stepDeck); return; }
  deck.pos = deck.target;
  deck.spread = deck.spreadTarget;
  deck.vel = 0;
  deck.spreadVel = 0;
  paintDeck();
  deck.raf = 0;
  tellDeck();
}

function setDeckTarget(index) {
  const n = deck.cards.length;
  if (!n) return;
  const next = Math.max(0, Math.min(n - 1, index));
  if (next !== deck.target) haptic(5);
  deck.target = next;
  kickDeck();
}

function bindGuideDeck() {
  const host = $('#guide-deck');
  host.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    deck.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, pos: deck.pos, lastX: event.clientX, lastT: event.timeStamp, v: 0, moved: false };
  });
  host.addEventListener('pointermove', (event) => {
    const drag = deck.drag;
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 8) return;
      if (Math.abs(event.clientY - drag.y) > Math.abs(dx)) { deck.drag = null; return; }
      drag.moved = true;
      if (host.setPointerCapture) host.setPointerCapture(event.pointerId);
      host.classList.add('is-dragging');
    }
    const per = deck.w * 0.45;
    deck.pos = Math.max(-0.45, Math.min(deck.cards.length - 0.55, drag.pos - dx / per));
    const dt = (event.timeStamp - drag.lastT) / 1000;
    if (dt > 0) drag.v = drag.v * 0.6 + (-(event.clientX - drag.lastX) / per / dt) * 0.4;
    drag.lastX = event.clientX;
    drag.lastT = event.timeStamp;
    kickDeck();
  });
  const end = (event) => {
    const drag = deck.drag;
    if (!drag || event.pointerId !== drag.id) return;
    deck.drag = null;
    host.classList.remove('is-dragging');
    if (!drag.moved) return;
    deck.dragged = true;
    setTimeout(() => { deck.dragged = false; }, 0);
    deck.vel = drag.v;
    setDeckTarget(UI.snapTarget(deck.pos, drag.v, deck.cards.length));
    kickDeck();
  };
  host.addEventListener('pointerup', end);
  host.addEventListener('pointercancel', end);
  host.addEventListener('click', (event) => {
    if (deck.dragged) return;
    const button = event.target.closest('.guide-card');
    if (!button) return;
    const i = Number(button.dataset.i);
    if (i === deck.target && Math.abs(deck.pos - deck.target) < 0.3) {
      openCardDetail(button.dataset.card, false, $('img', button), deck.cards.map((c) => c.id));
    } else {
      setDeckTarget(i);
    }
  });
  host.addEventListener('keydown', (event) => {
    const moves = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, PageDown: 5, PageUp: -5 };
    if (event.key in moves) { event.preventDefault(); setDeckTarget(deck.target + moves[event.key]); }
    else if (event.key === 'Home') { event.preventDefault(); setDeckTarget(0); }
    else if (event.key === 'End') { event.preventDefault(); setDeckTarget(deck.cards.length - 1); }
  });
  let wheelSum = 0;
  let wheelQuiet = 0;
  host.addEventListener('wheel', (event) => {
    if (event.ctrlKey) return;
    event.preventDefault();
    wheelSum += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    clearTimeout(wheelQuiet);
    wheelQuiet = setTimeout(() => { wheelSum = 0; }, 200);
    const steps = Math.trunc(wheelSum / 60);
    if (steps) { wheelSum -= steps * 60; setDeckTarget(deck.target + steps); }
  }, { passive: false });
  $('#guide-prev').addEventListener('click', () => setDeckTarget(deck.target - 1));
  $('#guide-next').addEventListener('click', () => setDeckTarget(deck.target + 1));
}

// Takım değişince deste ortada toplanır, sonra yeni kartlar yeniden dağıtılır.
function setGuideSuit(suit, focusButton) {
  if (suit === guideSuit) return;
  guideSuit = suit;
  $$('[data-suit]', $('#guide-page')).forEach((button) => {
    const on = button.dataset.suit === suit;
    button.setAttribute('aria-checked', on ? 'true' : 'false');
    button.tabIndex = on ? 0 : -1;
  });
  if (focusButton) focusButton.focus();
  clearTimeout(deck.dealTimer);
  if (reduced() || !deck.cards.length) { renderGuide(); return; }
  deck.spreadTarget = 0;
  kickDeck();
  deck.dealTimer = setTimeout(() => renderGuide(), 240);
}

// Üç bağımsız sayfa: home (akış), guide, history. Aynı anda yalnızca biri görünür.
// Sayfa değişirken eskisi yerinde söner, masa bir an yaklaşır, yenisi önünde belirir.
const VIEW_PAGES = { home: '#acilim', guide: '#guide-page', history: '#history-page' };

function setView(name) {
  const was = stage.dataset.view;
  const changing = was !== name;
  if (changing) MOTION.ghost($(VIEW_PAGES[was]), { y: 0, duration: 380 });
  stage.dataset.view = name;
  Object.entries(VIEW_PAGES).forEach(([view, selector]) => { $(selector).hidden = view !== name; });
  setActiveNav(name);
  if (changing) {
    MOTION.sceneBreath(stage);
    MOTION.enter([$(VIEW_PAGES[name])], { y: 0, scale: 1.015, blur: 0, duration: 760, delay: 60 });
  }
}

function showHome({ fromHistory = false } = {}) {
  const was = stage.dataset.view;
  setView('home');
  if (was !== 'home') requestAnimationFrame(resizeLayout);
  if (was !== 'home' && !fromHistory && history.state?.kd === was) history.back();
}

function showGuide() {
  setView('guide');
  renderGuide();
  if (history.state?.kd !== 'guide') history.pushState({ kd: 'guide' }, '');
  requestAnimationFrame(() => $('#guide-title').focus({ preventScroll: true }));
}

async function showHistory() {
  setView('history');
  if (history.state?.kd !== 'history') history.pushState({ kd: 'history' }, '');
  historyPage = 0;
  await renderHistory();
  $('#history-title').focus({ preventScroll: true });
}

function setActiveNav(name, instant = false) {
  let active = null;
  $$('.site-nav [data-nav]').forEach((el) => {
    const on = el.dataset.nav === name;
    el.classList.toggle('nav-active', on);
    if (on) { el.setAttribute('aria-current', 'page'); active = el; }
    else el.removeAttribute('aria-current');
  });
  MOTION.ink($('.site-nav'), active, { instant });
}

let historySpread = '';
let historyQuery = '';
let historyPage = 0;

function formatReadingDate(iso) {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: sameYear ? undefined : 'numeric' });
}

function renderHistoryFilters() {
  const options = [{ id: '', name: 'Tümü' }, ...SPREADS.SPREADS.map((s) => ({ id: s.id, name: s.id === 'daily' ? 'Günün kartı' : UI.spreadDisplayName(s.name) }))];
  $('#history-filters').innerHTML = options.map((s) => {
    const on = s.id === historySpread;
    return `<button type="button" role="radio" data-spread="${s.id}" aria-checked="${on ? 'true' : 'false'}" tabindex="${on ? '0' : '-1'}">${esc(s.name)}</button>`;
  }).join('');
}

async function renderHistory() {
  const all = await service.list({ spreadId: historySpread || undefined });
  const list = all.filter((r) => {
    const spread = SPREADS.getSpread(r.spreadId);
    const names = (r.cards || []).map((drawn) => TAROT.getCard(drawn.cardId).nameTr);
    return UI.matchesHistoryQuery(r, spread ? spread.name : '', names, historyQuery);
  });
  const count = $('#history-count');
  count.textContent = list.length ? `${list.length} okuma` : '';
  const el = $('#history-list');
  if (!list.length) {
    const searching = historyQuery.trim() || historySpread;
    el.innerHTML = searching
      ? '<li class="history-empty"><strong>Aramana uyan okuma yok</strong><p>Başka bir sözcük ya da açılım deneyebilir, yeni bir okuma başlatabilirsin.</p></li>'
      : '<li class="history-empty"><span class="history-empty-mark card-back" aria-hidden="true"></span><strong>Henüz bir okuman yok</strong><p>İlk açılımın burada, seçtiğin kartlarla birlikte duracak.</p></li>';
    $('#history-pager').hidden = true;
    MOTION.enter([el.firstElementChild], { y: 14, blur: 0, duration: 600 });
    return;
  }
  el.innerHTML = list.map((r) => {
    const spread = SPREADS.getSpread(r.spreadId);
    const date = formatReadingDate(r.completedAt || r.createdAt);
    const drawnCards = (r.cards || []).slice(0, spread.id === 'daily' ? 1 : 3);
    const faces = drawnCards.map((drawn) => {
      const card = TAROT.getCard(drawn.cardId);
      return `<img src="${esc(card.image)}" alt=""${drawn.reversed ? ' class="is-reversed" style="rotate:180deg"' : ''} decoding="async" loading="lazy">`;
    }).join('');
    const first = drawnCards[0] ? TAROT.getCard(drawnCards[0].cardId) : null;
    const names = (r.cards || []).slice(0, 3).map((drawn) => TAROT.getCard(drawn.cardId).nameTr).join(' · ');
    const title = r.question ? `“${esc(r.question)}”` : (spread.id === 'daily' && first ? `Günün kartı: ${esc(first.nameTr)}` : esc(names || UI.spreadDisplayName(spread.name)));
    const spreadName = spread.id === 'daily' ? 'Günün kartı' : UI.spreadDisplayName(spread.name);
    return `<li><button type="button" class="history-item" data-id="${esc(r.id)}">
        <span class="history-cards" aria-hidden="true">${faces}</span>
        <span class="history-copy"><strong>${title}</strong><em>${esc(date)} · ${esc(spreadName)}</em></span>
        <span class="history-go" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="m9 5 7 7-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      </button></li>`;
  }).join('');
  paginateHistory();
}

// Liste kaymaz: alana sığan kadar okuma görünür, kalanı sayfalardadır. Sayfa değişirken satırlar sırayla gelir.
function paginateHistory({ dir = 0, animate: animated = true } = {}) {
  const list = $('#history-list');
  const pager = $('#history-pager');
  const items = $$(':scope > li', list);
  if (!items.length || items[0].classList.contains('history-empty')) { pager.hidden = true; return; }
  items.forEach((li) => { li.hidden = false; });
  const itemHeight = Math.max(...items.map((li) => li.offsetHeight));
  const fit = () => UI.fitCount(list.clientHeight, itemHeight, 0);
  pager.hidden = true;
  let perPage = fit();
  if (items.length > perPage) { pager.hidden = false; perPage = fit(); }
  const view = UI.pageWindow(items.length, perPage, historyPage);
  historyPage = view.page;
  items.forEach((li, i) => { li.hidden = i < view.start || i >= view.end; });
  $('#history-page-label').textContent = `${view.page + 1} / ${view.pages}`;
  $('#history-prev').disabled = view.page === 0;
  $('#history-next').disabled = view.page >= view.pages - 1;
  if (animated) MOTION.enter(items.slice(view.start, view.end), { x: dir * 44, y: dir ? 0 : 14, blur: 0, duration: 560, delay: 30, stagger: 55 });
}

function stepHistory(dir) {
  const before = historyPage;
  historyPage += dir;
  paginateHistory({ dir, animate: false });
  if (historyPage === before) return;
  haptic(6);
  const shown = $$('#history-list > li:not([hidden])');
  MOTION.enter(shown, { x: dir * 44, y: 0, blur: 0, duration: 560, delay: 30, stagger: 55 });
}

renderHistoryFilters();
$('#history-filters').addEventListener('click', (event) => {
  const button = event.target.closest('[data-spread]');
  if (!button || button.dataset.spread === historySpread) return;
  historySpread = button.dataset.spread;
  historyPage = 0;
  $$('[data-spread]', $('#history-filters')).forEach((el) => {
    const on = el.dataset.spread === historySpread;
    el.setAttribute('aria-checked', on ? 'true' : 'false');
    el.tabIndex = on ? 0 : -1;
  });
  renderHistory();
});
$('#history-filters').addEventListener('keydown', (event) => {
  const buttons = $$('[role=radio]', $('#history-filters'));
  const index = buttons.indexOf(document.activeElement);
  if (index < 0) return;
  let next = index;
  if (event.key === 'ArrowRight') next = Math.min(buttons.length - 1, index + 1);
  else if (event.key === 'ArrowLeft') next = Math.max(0, index - 1);
  else return;
  event.preventDefault();
  buttons[next].click();
  buttons[next].focus();
});
$('#history-prev').addEventListener('click', () => stepHistory(-1));
$('#history-next').addEventListener('click', () => stepHistory(1));
bindSwipe($('#history-list'), stepHistory);
bindWheelSteps($('#history-list'), stepHistory);
$('#history-query').addEventListener('input', (event) => {
  historyPage = 0;
  historyQuery = event.target.value;
  renderHistory();
});
$('#history-list').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-id]');
  if (!button) return;
  const reading = await service.get(button.dataset.id);
  showHome({ fromHistory: true });
  openSavedReading(reading);
});
$('#history-new').addEventListener('click', () => {
  showHome({ fromHistory: true });
  if (state.step !== 'intent') go('intent');
  else $('#spread-title').focus({ preventScroll: true });
});

function openSettings() {
  const form = $('#settings-form');
  form.reversals.checked = settings.reversals;
  form.sound.checked = settings.sound;
  form.haptic.checked = settings.haptic;
  form.reminderTime.value = settings.reminderTime;
  $$('input[name=motion]', form).forEach((r) => { r.checked = r.value === (reduced() ? 'reduced' : 'full'); });
  dialogs.settings.showModal();
  $('#open-settings').setAttribute('aria-expanded', 'true');
}

dialogs.settings.addEventListener('close', () => {
  $('#open-settings').setAttribute('aria-expanded', 'false');
});

$('#settings-form').addEventListener('change', (event) => {
  const field = event.target;
  if (field.name === 'motion') settings.motion = field.value;
  else if (field.type === 'checkbox') settings[field.name] = field.checked;
  else settings[field.name] = field.value;
  saveSettings();
  applyMotion();
});

$('#open-guide').addEventListener('click', () => {
  if (stage.dataset.view === 'guide') return;
  if (inReading()) {
    pendingView = 'guide';
    openLeaveDialog();
    return;
  }
  showGuide();
});
$('#open-history').addEventListener('click', () => {
  if (stage.dataset.view === 'history') return;
  if (inReading()) {
    pendingView = 'history';
    openLeaveDialog();
    return;
  }
  showHistory();
});
$('#open-settings').addEventListener('click', openSettings);

$$('[data-nav="home"]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  if (inReading()) {
    pendingView = 'home';
    openLeaveDialog();
    return;
  }
  if (stage.dataset.view !== 'home') showHome();
  if (state.step !== 'intent') go('intent');
  window.scrollTo(0, 0);
}));

$('.guide-filters').addEventListener('click', (event) => {
  const filter = event.target.closest('[data-suit]');
  if (filter) setGuideSuit(filter.dataset.suit);
});
bindGuideDeck();
// Kartın adı ya da anlamı satır değiştirince deste alanı daralır; kart her seferinde o alana yeniden sığdırılır.
if (window.ResizeObserver) {
  new ResizeObserver(() => { if (stage.dataset.view === 'guide') { measureDeck(); paintDeck(); } }).observe($('#guide-deck'));
}

// Kart detayında önceki/sonraki ile gezilen kart, pencere kapanınca destede ortaya gelir.
dialogs.card.addEventListener('close', () => {
  if (stage.dataset.view === 'guide' && detailContext) setDeckTarget(detailContext.index);
});

$('.guide-filters').addEventListener('keydown', (event) => {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
  const buttons = $$('[data-suit]', $('#guide-page'));
  const index = buttons.findIndex((button) => button.getAttribute('aria-checked') === 'true');
  const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
  const next = buttons[(index + direction + buttons.length) % buttons.length];
  event.preventDefault();
  setGuideSuit(next.dataset.suit, next);
});

let guideQueryTimer = 0;
$('#guide-query').addEventListener('input', (event) => {
  guideQuery = event.target.value;
  clearTimeout(guideQueryTimer);
  guideQueryTimer = setTimeout(() => renderGuide(), 180);
});

Object.values(dialogs).forEach((dialog) => dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}));

// ---------- Yeniden boyutlandırma ----------

let resizeRaf = 0;
let lastMobile = isMobile();
function resizeLayout() {
  setActiveNav(stage.dataset.view, true);
  if (stage.dataset.view === 'guide') { measureDeck(); paintDeck(); return; }
  if (stage.dataset.view === 'history') { paginateHistory({ animate: false }); return; }
  if (stage.dataset.view !== 'home') return;
  const mobile = isMobile();
  const layout = $('#layout');
  if (state.step === 'pick' && (mobile !== lastMobile || !mobile)) buildFan({ animate: false });
  if (layout && layout.dataset.mode && state.spreadId) renderLayout(layout, currentSpread(), layout.dataset.mode);
  if (state.step === 'pick') positionFan();
  // Telefon ile masaüstü arasında geçilince açma adımı listeyle ya da kart altı etiketlerle yeniden kurulur.
  if (state.step === 'reveal' && Boolean($('.reveal-legend')) !== usesLegend(currentSpread())) RENDERERS.reveal({});
  if (state.step === 'intent') {
    const picker = $('.intent-picker', body);
    if (picker && picker.paint) {
      fitIntentCards(picker);
      if (mobile && !lastMobile) centerIntent($('input:checked', picker)?.closest('.intent-choice'), false);
      picker.paint();
    }
  }
  if (state.step === 'confirm') fitSpreadMap();
  storyResize();
  lastMobile = mobile;
}
function onViewportChange() {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(resizeLayout);
}
window.addEventListener('resize', onViewportChange);
window.visualViewport?.addEventListener('resize', onViewportChange);
systemReduced.addEventListener?.('change', applyMotion);

MOTION.init({ reduced, scene: stage });
applyMotion();
resizeLayout();
document.fonts?.ready.then(() => setActiveNav(stage.dataset.view, true));
history.replaceState({ kd: 'base' }, '');
go('intent', { focus: false });
