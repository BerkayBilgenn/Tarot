'use strict';

const REFERENCE_WIDTH = 1586;
const REFERENCE_HEIGHT = 992;
const MOBILE_BREAKPOINT = 900;
const NARROW_BREAKPOINT = 375;
const CARD_RATIO = 600 / 350;
const DECK_SIZE = 78;
const SHUFFLE_HOLD_MS = 1500;
const AUTO_SHUFFLE_MS = 1800;
const FLIP_MS = 600;

const TAROT = window.TAROT_CARDS;
const SPREADS = window.TAROT_SPREADS;
const ENGINE = window.TAROT_READING;
const ORACLE = window.TAROT_ORACLE;

const INTENT_CARD = {
  today: 'major-19',
  love: 'major-06',
  work: 'pentacles-01',
  decision: 'major-11',
  general: 'major-01'
};

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
const BACK_MARK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5 8 12l7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let onBack = () => {};
const statusEl = $('#status');
const announcer = $('#announcer');
const dialogs = {
  history: $('#history-dialog'),
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
const applyMotion = () => { document.documentElement.dataset.motion = reduced() ? 'reduced' : 'full'; };

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
const pageScale = () => (isMobile() ? 1 : Math.min(window.innerWidth / REFERENCE_WIDTH, window.innerHeight / REFERENCE_HEIGHT));

// Transform scale sonrası bazı motorlar rect'i görsel, bazıları CSS pikselinde verir.
function rectFactor() {
  if (isMobile()) return 1;
  const width = stage.getBoundingClientRect().width;
  return width ? (REFERENCE_WIDTH * pageScale()) / width : 1;
}

function scaleRect(r, f) {
  return f === 1 ? r : { left: r.left * f, top: r.top * f, width: r.width * f, height: r.height * f };
}

// Ekran pikseli: body'ye eklenen uçan kart ve diyalog geçişi için.
function visualRect(el) {
  return el.closest('.stage') ? scaleRect(el.getBoundingClientRect(), rectFactor()) : el.getBoundingClientRect();
}

// Sahnenin kendi CSS pikseli: sahne içindeki transform'lar için.
function localRect(el) {
  return scaleRect(el.getBoundingClientRect(), rectFactor() / pageScale());
}

const LABEL_HEIGHT = { preview: 30, pick: 20, reveal: 64, share: 60 };
const MAX_CARD = { preview: 92, pick: 74, reveal: 150, share: 170 };

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

// Slot birimini kapsayıcıya sığdırır: 1 birim = kart + boşluk.
function geometry(spread, width, height, mode, narrow) {
  const slots = slotsFor(spread, narrow);
  const celtic = spread.id === 'celtic';
  const rowPreview = mode === 'preview' && frameFor(spread) === 'row';
  let labelH = LABEL_HEIGHT[mode];
  if (mode === 'reveal' && celtic) labelH = 44;
  if (rowPreview) labelH = isMobile() ? 34 : 60;
  if (mode === 'preview' && celtic) labelH = 22;
  let maxCard = MAX_CARD[mode];
  if (rowPreview) maxCard = isMobile() ? 86 : 118;
  if (mode === 'preview' && celtic) maxCard = 84;
  const cellRatio = celtic ? 1.42 : 1.36;
  const gapRatio = 0.14;
  const xs = slots.map((s) => s.x);
  const ys = slots.map((s) => s.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...ys) - minY;
  const byWidth = width / (spanX * cellRatio + 1);
  const byHeight = (height - labelH * (spanY + 1)) / (spanY * (CARD_RATIO + gapRatio) + CARD_RATIO);
  const cw = Math.max(8, Math.floor(Math.min(byWidth, byHeight, maxCard)));
  const ch = Math.round(cw * CARD_RATIO);
  const cellW = cw * cellRatio;
  const cellH = ch + labelH + cw * gapRatio;
  const contentW = spanX * cellW + cw;
  const contentH = spanY * cellH + ch + labelH;
  const ox = (width - contentW) / 2;
  const oyBase = (height - contentH) / 2;
  const oy = rowPreview ? Math.max(4, Math.min(oyBase, 12)) : oyBase;
  return {
    cw, ch, labelH, cellW, spanY,
    slots: slots.map((s) => ({ ...s, left: Math.round(ox + (s.x - minX) * cellW), top: Math.round(oy + (s.y - minY) * cellH) }))
  };
}

function cardBackVars(w, h) {
  const cover = Math.max(w / 136, h / 202);
  const posX = -920 * cover + (w - 136 * cover) / 2;
  const posY = -596 * cover + (h - 202 * cover) / 2;
  return `--bx:${cover.toFixed(4)};--by:${cover.toFixed(4)};--bpx:${posX.toFixed(2)}px;--bpy:${posY.toFixed(2)}px`;
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

function setHeading(title, instruction, { reference = false } = {}) {
  titleEl.textContent = title;
  titleEl.classList.toggle('is-reference', reference);
  instructionEl.textContent = instruction || '';
}

function setProgress(text) {
  progressEl.hidden = !text;
  progressEl.textContent = text || '';
}

function setActions({ back: backOpt = false, secondary = null, reshuffle = null, primary = null, status = '', statusHtml = '' } = {}) {
  if (backOpt && typeof backOpt === 'object') {
    backBtn.hidden = false;
    backBtn.innerHTML = `${BACK_MARK} ${esc(backOpt.label)}`;
    onBack = backOpt.onClick;
  } else {
    backBtn.hidden = !backOpt;
    backBtn.innerHTML = `${BACK_MARK} Geri`;
    onBack = back;
  }
  secondaryBtn.hidden = !secondary;
  secondaryBtn.textContent = secondary ? secondary.label : '';
  secondaryBtn.onclick = secondary ? secondary.onClick : null;
  reshuffleBtn.hidden = !reshuffle;
  reshuffleBtn.onclick = reshuffle ? reshuffle.onClick : null;
  primaryBtn.hidden = !primary;
  primaryBtn.disabled = Boolean(primary && primary.disabled);
  primaryBtn.innerHTML = primary ? `${esc(primary.label)}${primary.arrow === false ? '' : ' <span aria-hidden="true">→</span>'}` : '';
  primaryBtn.onclick = primary ? primary.onClick : null;
  if (statusHtml) statusEl.innerHTML = statusHtml;
  else statusEl.textContent = status || '';
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

function go(step, options = {}) {
  const from = state.step;
  state.step = step;
  stage.dataset.step = step;
  state.renderToken++;
  body.classList.remove('no-enter');
  clearConfirmChrome();
  if (step !== 'intent') armHistory();
  const result = RENDERERS[step](options, from);
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
  if (stage.dataset.view === 'guide') {
    showHome({ fromHistory: true });
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
    ? 'Kart seçimi başladıktan sonra okuma geri alınamaz. Seçtiğin kartlar saklanır; ana ekrandaki "Yarım kalan okuman var" kartından kaldığın yerden devam edebilirsin.'
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
  go('intent');
  if (next === 'guide') showGuide();
});

// ---------- 1 · Niyet ----------

RENDERERS.intent = async () => {
  const token = state.renderToken;
  resetReading();
  setHeading('Bugün ne öğrenmek istiyorsun?', 'Bir niyet seç; açılımı senin için hazırlayalım.');
  setProgress('');
  setActions();
  body.innerHTML = intentMarkup(null, null);
  const [draft, daily] = await Promise.all([service.draft(), service.dailyToday()]);
  if (token !== state.renderToken) return;
  if (draft || (daily && daily.status === 'complete')) {
    body.classList.add('no-enter');
    body.innerHTML = intentMarkup(draft, daily);
  }
};

function intentMarkup(draft, daily) {
  const banner = draft
    ? `<div class="draft-banner" role="region" aria-label="Yarım kalan okuma">
         <span><strong>Yarım kalan okuman var</strong> · ${esc(SPREADS.getSpread(draft.spreadId).name)}</span>
         <button type="button" class="banner-link" data-action="resume" data-id="${esc(draft.id)}">Devam et <span aria-hidden="true">→</span></button>
         <button type="button" class="banner-close" data-action="discard" data-id="${esc(draft.id)}" aria-label="Yarım okumayı kapat">×</button>
       </div>`
    : '';
  const doneDaily = daily && daily.status === 'complete' ? daily : null;
  const cards = SPREADS.INTENTS.map((intent, i) => {
    const spread = SPREADS.getSpread(intent.spreadId);
    const drawn = intent.id === 'today' && doneDaily ? TAROT.getCard(doneDaily.cards[0].cardId) : null;
    const portrait = drawn || TAROT.getCard(INTENT_CARD[intent.id]);
    const reversed = Boolean(drawn && doneDaily.cards[0].reversed);
    const label = drawn ? `${intent.title}: bugün çekildi, ${drawn.nameTr}. Kayıtlı yorumu aç.` : `${intent.title}: ${intent.sub}. ${SPREADS.chip(spread)}`;
    return `<li style="--i:${i}"><button type="button" class="intent-card${drawn ? ' is-done' : ''}" data-intent="${intent.id}" aria-label="${esc(label)}">
        <span class="intent-art${reversed ? ' is-reversed' : ''}"><img src="${esc(portrait.image)}" alt="" decoding="async"></span>
        <span class="intent-title">${esc(intent.title)}</span>
        ${drawn ? '<span class="done-badge">Bugün çekildi</span>' : ''}
        <span class="intent-sub">${esc(intent.sub)}</span>
        <span class="chip">${esc(SPREADS.chip(spread))}</span>
      </button></li>`;
  }).join('');
  return `<div class="intent-step">${banner}<ul class="intent-grid" role="list">${cards}</ul></div>`;
}

body.addEventListener('click', (event) => {
  const target = event.target.closest('[data-intent], [data-action]');
  if (!target || !body.contains(target)) return;
  if (target.dataset.intent) return chooseIntent(target.dataset.intent);
  const { action, id } = target.dataset;
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
      label: 'Kartlarımı aç',
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
        <aside class="spread-map" id="spread-map">
          <p class="map-kicker">AÇILIMIN HARİTASI</p>
          <ol class="position-list" id="position-list" aria-label="Pozisyonlar"></ol>
        </aside>
      </div>
    </div>`;
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
  setHeading(spread.name, spread.blurb || '');
  const meta = $('#spread-meta');
  meta.hidden = false;
  meta.className = 'meta-line';
  meta.textContent = `${spread.cardCount} kart · Yaklaşık ${spread.estMinutes} dakika`;
  $('#spread-map').classList.toggle('is-visual', frame === 'map');
  renderPositionList(spread);
  statusEl.innerHTML = readyStatusHtml(spread.cardCount);
}

function renderPositionList(spread) {
  $('#position-list').innerHTML = spread.positions.map((p) => `<li><span class="position-index">${p.index}</span><span><strong>${esc(labelFor(p))}</strong><small>${esc(captionFor(p))}</small></span></li>`).join('');
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
  setHeading('Sorunu yaz', decision ? 'A ve B seçenekleri zorunlu' : 'İsteğe bağlı');
  setProgress('');
  const deck = `<div class="question-altar" aria-hidden="true"><span class="question-deck" style="${cardBackVars(72, 116)}">${'<span class="card-back"></span>'.repeat(3)}</span></div>`;
  body.innerHTML = `<form class="question-step" id="question-form" novalidate>
      ${deck}
      <p class="question-invite">${decision ? 'İki yolu masaya koy. Sorunu onların arasına bırak.' : 'Bir nefes al. Sorunu destenin önüne bırak.'}</p>
      ${decision ? `<div class="option-row">
          <label class="field option-plate"><span>A seçeneği</span><input id="optionA" maxlength="${L.option}" required autocomplete="off" value="${esc(state.inputs.optionA)}" placeholder="İstanbul'da kal">${counter('optionA', L.option)}</label>
          <label class="field option-plate"><span>B seçeneği</span><input id="optionB" maxlength="${L.option}" required autocomplete="off" value="${esc(state.inputs.optionB)}" placeholder="Berlin'e taşın">${counter('optionB', L.option)}</label>
        </div>` : ''}
      <div class="question-paper">
        <label class="field"><span class="${decision ? '' : 'sr-only'}">${decision ? 'Biraz bağlam ekle' : 'Sorun'}</span>
          <textarea id="question" maxlength="${L.question}" rows="${decision ? 2 : 3}" placeholder="${esc(SPREADS.PLACEHOLDERS[spread.id] || '')}">${esc(state.inputs.question)}</textarea>${counter('question', L.question)}</label>
        ${spread.inputs.personName ? `<label class="field person-field"><span>Kişinin adı</span><input id="personName" maxlength="${L.personName}" autocomplete="off" value="${esc(state.inputs.personName)}" placeholder="İsteğe bağlı">${counter('personName', L.personName)}</label>` : ''}
      </div>
      <p class="hint">Açık uçlu sorular daha iyi okunur: 'Olacak mı?' yerine 'Neye dikkat etmeliyim?'</p>
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

RENDERERS.shuffle = () => {
  const spread = currentSpread();
  const question = state.inputs.question.trim();
  const deckLayer = (cls) => `<span class="deck-half ${cls}">${'<span class="card-back"></span>'.repeat(4)}</span>`;
  setHeading(spread.name, `${spread.cardCount} kart · yaklaşık ${spread.estMinutes} dakika`);
  setProgress('');
  body.innerHTML = `<div class="shuffle-step">
      ${question ? `<p class="shuffle-question">“${esc(question)}”</p>` : ''}
      <button type="button" class="deck" id="deck" aria-describedby="shuffle-instruction" aria-label="Deste. Karıştırmak için basılı tut." style="${cardBackVars(150, 240)}">
        ${deckLayer('deck-left')}${deckLayer('deck-right')}
      </button>
      <p class="shuffle-instruction" id="shuffle-instruction" aria-live="polite">${reduced() ? 'Desteye dokun ya da otomatik karıştır' : 'Sorunu düşünerek desteye basılı tut'}</p>
    </div>`;
  setActions({ back: true, primary: { label: 'Otomatik karıştır', arrow: false, onClick: () => autoShuffle() } });
  bindDeck($('#deck'));
};

function bindDeck(deck) {
  let hold = null;
  const instruction = $('#shuffle-instruction');
  const start = () => {
    if (state.busy || hold) return;
    if (reduced()) { autoShuffle(); return; }
    ensureReading();
    deck.classList.add('is-shuffling');
    sfx.riffleStart();
    hold = { at: performance.now(), ready: false };
    hold.timer = setTimeout(() => {
      if (!hold) return;
      hold.ready = true;
      instruction.textContent = 'Hazır olunca bırak';
      haptic(20);
    }, SHUFFLE_HOLD_MS);
  };
  const end = () => {
    if (!hold) return;
    clearTimeout(hold.timer);
    const { ready, at } = hold;
    hold = null;
    deck.classList.remove('is-shuffling');
    sfx.riffleStop();
    if (ready) finishShuffle('hold', performance.now() - at);
  };
  deck.addEventListener('pointerdown', (event) => { event.preventDefault(); deck.setPointerCapture?.(event.pointerId); start(); });
  deck.addEventListener('pointerup', end);
  deck.addEventListener('pointercancel', end);
  deck.addEventListener('lostpointercapture', end);
  deck.addEventListener('contextmenu', (event) => event.preventDefault());
  deck.addEventListener('keydown', (event) => {
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); start(); }
  });
  deck.addEventListener('keyup', (event) => { if (event.key === ' ' || event.key === 'Enter') end(); });
}

async function autoShuffle() {
  if (state.busy) return;
  state.busy = true;
  ensureReading();
  const deck = $('#deck');
  primaryBtn.disabled = true;
  if (reduced()) {
    await animate(deck, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: 'ease-in-out', fill: 'forwards' });
    return finishShuffle('auto', 400);
  }
  deck.classList.add('is-shuffling');
  sfx.riffleStart();
  await sleep(AUTO_SHUFFLE_MS);
  sfx.riffleStop();
  deck.classList.remove('is-shuffling');
  return finishShuffle('auto', AUTO_SHUFFLE_MS);
}

async function finishShuffle(mode, durationMs) {
  state.busy = true;
  track('shuffle_completed', { mode, durationMs: Math.round(durationMs) });
  try {
    const { readingId } = await ensureReading();
    const reading = await service.get(readingId);
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
  setActions({ back: true, status: '' });
  requestAnimationFrame(() => {
    renderLayout($('#layout'), spread, 'pick');
    updatePickHeading();
    buildFan();
    if (state.picks.length >= spread.cardCount) finishPicking();
  });
};

function updatePickHeading() {
  const spread = currentSpread();
  const n = state.picks.length;
  const next = spread.positions[n];
  const three = spread.id === 'three';
  setHeading(three ? 'Sana açılan üç kart' : `${spread.cardCount} kart seç`, next ? `Sıradaki: ${labelFor(next)}` : 'Kartların yerleşti.', { reference: three });
  setProgress(`${n} / ${spread.cardCount}`);
  $$('#layout .lay-slot').forEach((slot) => slot.classList.toggle('is-next', Boolean(next) && slot.dataset.key === next.key));
}

const fanState = { mobile: false, raf: 0 };

function fanCardSize() {
  const w = isMobile() ? 62 : 72;
  return { w, h: Math.round(w * CARD_RATIO) };
}

function buildFan() {
  const fan = $('#fan');
  const viewport = $('#fan-viewport');
  const { w, h } = fanCardSize();
  const used = new Set(state.picks.map((p) => p.fanIndex));
  fanState.mobile = isMobile();
  fan.style.cssText = cardBackVars(w, h);
  fan.innerHTML = Array.from({ length: DECK_SIZE }, (_, i) => `<button type="button" class="fan-card" data-index="${i}" tabindex="-1" aria-label="Kart ${i + 1} / ${DECK_SIZE}, yüzü kapalı. Seçmek için çift dokun"${used.has(i) ? ' disabled data-picked="true"' : ''}><span class="card-back"></span></button>`).join('');
  const buttons = $$('.fan-card', fan);
  if (fanState.mobile) {
    const spacing = 44;
    fan.style.width = `${(DECK_SIZE - 1) * spacing + w + viewport.clientWidth}px`;
    buttons.forEach((b, i) => { b.dataset.x = String(viewport.clientWidth / 2 - w / 2 + i * spacing); });
    viewport.scrollLeft = (fan.scrollWidth - viewport.clientWidth) / 2;
    positionMobileFan();
    viewport.onscroll = () => {
      cancelAnimationFrame(fanState.raf);
      fanState.raf = requestAnimationFrame(positionMobileFan);
    };
  } else {
    fan.style.width = '';
    const radius = 1300;
    const spread = 17;
    buttons.forEach((b, i) => {
      const angle = -spread + (2 * spread * i) / (DECK_SIZE - 1);
      const rad = (angle * Math.PI) / 180;
      const x = 443 + radius * Math.sin(rad) - w / 2;
      const y = 42 + radius * (1 - Math.cos(rad));
      b.dataset.angle = String(angle);
      b.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${angle.toFixed(2)}deg)`;
    });
  }
  const first = buttons.find((b) => !b.disabled);
  if (first) first.tabIndex = 0;
  fan.onclick = (event) => {
    const button = event.target.closest('.fan-card');
    if (button && !button.disabled) selectFanCard(Number(button.dataset.index));
  };
  fan.onkeydown = onFanKey;
  fan.onfocusin = (event) => {
    const button = event.target.closest('.fan-card');
    if (button && fanState.mobile) scrollFanTo(button);
  };
  openFan(buttons);
}

// Kartlar transform ile dizildiği için scrollIntoView yanlış konuma gider.
function scrollFanTo(button) {
  const viewport = $('#fan-viewport');
  const left = Number(button.dataset.x) + fanCardSize().w / 2 - viewport.clientWidth / 2;
  viewport.scrollTo({ left, behavior: reduced() ? 'auto' : 'smooth' });
}

function positionMobileFan() {
  const viewport = $('#fan-viewport');
  if (!viewport) return;
  const center = viewport.scrollLeft + viewport.clientWidth / 2;
  const { w } = fanCardSize();
  const radius = 620;
  $$('.fan-card', viewport).forEach((b) => {
    const x = Number(b.dataset.x);
    const d = Math.max(-radius * 0.9, Math.min(radius * 0.9, x + w / 2 - center));
    const rad = d / radius;
    const y = 26 + radius * (1 - Math.cos(rad));
    b.dataset.angle = String((rad * 180) / Math.PI);
    b.style.transform = `translate(${x}px, ${y.toFixed(1)}px) rotate(${(rad * 180 / Math.PI).toFixed(2)}deg)`;
  });
}

function openFan(buttons) {
  if (reduced()) return;
  const fan = $('#fan');
  const viewport = $('#fan-viewport');
  const originX = fanState.mobile ? viewport.scrollLeft + viewport.clientWidth / 2 - fanCardSize().w / 2 : 443 - fanCardSize().w / 2;
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
    if (state.step === 'pick' && !state.picks.some((p) => p.failed)) statusEl.textContent = '';
    if (state.step === 'reveal') updateReveal();
  }).catch(() => {
    pick.failed = true;
    statusEl.textContent = 'Bağlantı koptu, tekrar dene';
    secondaryBtn.hidden = false;
    secondaryBtn.textContent = 'Tekrar dene';
    secondaryBtn.onclick = retryFailedPicks;
  });
}

function retryFailedPicks() {
  secondaryBtn.hidden = true;
  statusEl.textContent = '';
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
  flyer.style.cssText = `left:${target.left}px;top:${target.top}px;width:${target.width}px;height:${target.height}px;${cardBackVars(target.width, target.height)}`;
  flyer.innerHTML = '<span class="card-back"></span>';
  document.body.append(flyer);
  fanCard.style.visibility = 'hidden';
  const { w } = fanCardSize();
  const scale = (w * pageScale()) / target.width;
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
  return animate($('.lay-card', slot), [{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 120, easing: 'ease-out' });
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
  setHeading(three ? 'Sana açılan üç kart' : spread.name, 'Kartlarına dokunarak aç', { reference: three });
  const layout = $('#layout');
  if (options.fromPick && layout) {
    const before = new Map($$('.lay-slot', layout).map((s) => [s.dataset.key, localRect(s)]));
    $('#fan-viewport').remove();
    layout.classList.replace('pick-stage', 'reveal-stage');
    renderLayout(layout, spread, 'reveal');
    if (!reduced()) flipFrom(layout, before, spring(240, 28));
  } else {
    body.innerHTML = `<div class="reveal-step"><div class="layout-stage reveal-stage" id="layout"></div><ol class="sr-only" id="sr-list"></ol></div>`;
    renderLayout($('#layout'), spread, 'reveal');
  }
  if (!state.interpretationPromise) state.interpretationPromise = service.complete(state.readingId);
  setActions({
    back: true,
    secondary: { label: 'Hepsini aç', onClick: revealAll },
    primary: { label: 'Yorumu gör', onClick: () => go('reading') }
  });
  primaryBtn.hidden = true;
  updateReveal();
};

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
  if (done && primaryBtn.hidden) {
    primaryBtn.hidden = false;
    statusEl.textContent = 'Tüm kartlar açıldı';
    if (!reduced()) animate(primaryBtn, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 250, easing: 'ease-out' });
    primaryBtn.focus({ preventScroll: true });
  }
  renderSrList();
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

function renderLayout(container, spread, mode) {
  const narrow = isNarrow();
  const reserve = mode === 'preview' && spread.id === 'celtic' && !narrow ? 112 : 0;
  const geo = geometry(spread, Math.max(40, container.clientWidth - reserve), container.clientHeight, mode, narrow);
  if (mode === 'preview' && spread.id === 'celtic') {
    const root = geo.slots.find((s) => s.key === 'root');
    if (root) root.top += 30;
  }
  container.style.setProperty('--cw', `${geo.cw}px`);
  container.style.setProperty('--ch', `${geo.ch}px`);
  container.style.setProperty('--label-w', `${Math.round(geo.cellW - 4)}px`);
  container.style.setProperty('--kw-lines', geo.spanY === 0 ? 2 : 1);
  container.dataset.mode = mode;
  container.dataset.spread = spread.id;
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
    slot.style.cssText = `left:${s.left}px;top:${s.top}px;width:${geo.cw}px;height:${geo.ch}px;${cardBackVars(geo.cw, geo.ch)}`;
    updateSlotLabel(slot, s.position, mode);
    const pick = state.picks.find((p) => p.positionKey === s.key);
    if (pick && mode !== 'preview') {
      slot.classList.add('is-filled');
      if (pick.card) setSlotCard(slot, pick);
      if (state.revealed.has(s.key)) slot.classList.add('is-revealed', ...(pick.reversed ? ['is-reversed'] : []));
    }
  });
  existing.forEach((slot) => slot.remove());
  return geo;
}

function createSlot(s, mode) {
  const slot = document.createElement('div');
  slot.className = `lay-slot${s.rot ? ' is-cross' : ''}`;
  slot.dataset.key = s.key;
  const interactive = mode === 'reveal' || mode === 'pick';
  const inner = `<span class="card-turn"><span class="card-flip"><span class="face face-back card-back"><span class="lay-index">${s.position.index}</span></span><span class="face face-front"><img alt="" decoding="async"></span></span></span>`;
  slot.innerHTML = `<div class="lay-rot" style="transform:rotate(${s.rot}deg)">${interactive ? `<button type="button" class="lay-card">${inner}</button>` : `<span class="lay-card">${inner}</span>`}</div>
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
  const button = mode === 'reveal' ? ensureSlotButton(slot) : $('.lay-card', slot);
  const pick = state.picks.find((p) => p.positionKey === position.key);
  const detail = $('.lay-detail', slot);
  const spread = currentSpread();
  if (mode === 'reveal' && pick && pick.card && state.revealed.has(position.key)) {
    const card = TAROT.getCard(pick.card.id);
    const kw = ENGINE.keywordsOf(card, pick.reversed, TAROT);
    detail.innerHTML = `<span class="lay-card-name">${esc(card.name)}${pick.reversed ? ' <span class="badge-reversed">Ters</span>' : ''}</span>${position.slot.rot ? '' : `<span class="lay-keywords">${esc(kw.join(' · '))}</span>`}`;
  } else if (mode === 'preview' && frameFor(spread) === 'row') {
    detail.innerHTML = `<span class="lay-prompt">${esc(captionFor(position))}</span>`;
  } else if (mode === 'preview' && spread.id === 'celtic' && position.key === 'present') {
    const challenge = spread.positions.find((p) => p.key === 'challenge');
    detail.innerHTML = `<span class="lay-subname">${esc(challenge.label)}</span>`;
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
      button.setAttribute('aria-label', revealed
        ? `${position.index}. ${label}: ${pick.card.name}${pick.reversed ? ', ters' : ''}. Kart detayını aç.`
        : `${position.index}. ${label}: yüzü kapalı. Açmak için dokun.`);
      button.onclick = () => {
        if (state.revealed.has(position.key)) openCardDetail(pick.card.id, pick.reversed, $('.face-front img', slot));
        else revealCard(position.key, 'tap');
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

// ---------- 8 · Yorum ----------

RENDERERS.reading = async () => {
  const token = state.renderToken;
  const spread = currentSpread();
  setProgress('');
  setActions({
    back: true,
    secondary: { label: 'Paylaş', onClick: shareReading },
    primary: { label: 'Yeni okuma', onClick: startNewReading }
  });
  secondaryBtn.disabled = true;
  const reading = state.reading;
  setHeading(spread.name, headingMeta(reading));
  body.innerHTML = `<div class="reading-step"><div class="reading-scroll" aria-busy="true">
      <div class="skeleton summary-skeleton"></div>${'<div class="skeleton row-skeleton"></div>'.repeat(Math.min(3, spread.cardCount))}
    </div></div>`;
  const interpretation = await (state.interpretationPromise || service.complete(state.readingId));
  const viewed = state.viewOnly ? state.reading : await service.markViewed(state.readingId);
  if (token !== state.renderToken) return;
  state.reading = viewed;
  if (!state.viewOnly) {
    track('reading_viewed', { spreadId: spread.id, msFromStart: Math.round(performance.now() - (state.startedAt || performance.now())), interpretationSource: interpretation.source });
  }
  secondaryBtn.disabled = false;
  body.innerHTML = `<div class="reading-step">${readingMarkup(viewed, spread, interpretation)}</div>`;
  bindReading(viewed, spread);
  fillClosing(viewed, spread, interpretation, token);
};

function headingMeta(reading) {
  const date = new Date(reading.completedAt || reading.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  return reading.question ? `${date} · “${reading.question}”` : date;
}

function readingMarkup(reading, spread, interpretation) {
  const byKey = Object.fromEntries(reading.cards.map((c) => [c.positionKey, c]));
  const texts = Object.fromEntries(interpretation.positions.map((p) => [p.positionKey, p.text]));
  const items = spread.positions.map((position, i) => {
    const drawn = byKey[position.key];
    const card = TAROT.getCard(drawn.cardId);
    const keywords = ENGINE.keywordsOf(card, drawn.reversed, TAROT);
    return `<li class="position-card fade-up" style="--i:${i + 1}">
        <button type="button" class="thumb${drawn.reversed ? ' is-reversed' : ''}" data-card="${esc(card.id)}" data-reversed="${drawn.reversed}" aria-label="${esc(card.name)} kartını büyüt"><img src="${esc(card.image)}" alt="" decoding="async"></button>
        <div class="position-copy">
          <p class="position-label">${position.index} · ${esc(ENGINE.displayLabel(position, reading))}</p>
          <h3>${esc(card.name)} <span class="card-tr">${esc(card.nameTr)}</span>${drawn.reversed ? ' <span class="badge-reversed">Ters</span>' : ''}</h3>
          <ul class="chips" aria-label="Anahtar kelimeler">${keywords.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>
          <p>${esc(texts[position.key])}</p>
        </div>
      </li>`;
  }).join('');
  const labels = Object.fromEntries(spread.positions.map((p) => [p.key, p]));
  const pairs = interpretation.pairs ? `<section class="reading-block fade-up" style="--i:${spread.cardCount + 1}"><h3>Pozisyon çiftleri</h3><ul class="pair-list">${interpretation.pairs.map((pair) => `<li><strong>${labels[pair.keys[0]].index}–${labels[pair.keys[1]].index} · ${esc(labels[pair.keys[0]].label)} ve ${esc(labels[pair.keys[1]].label)}</strong><p>${esc(pair.text)}</p></li>`).join('')}</ul></section>` : '';
  const compare = interpretation.comparison ? `<section class="reading-block fade-up" style="--i:${spread.cardCount + 1}"><h3>A ve B karşılaştırması</h3><div class="compare-grid">
      <div><h4>${esc(reading.optionA || 'A')}</h4><p>${esc(interpretation.comparison.a)}</p></div>
      <div><h4>${esc(reading.optionB || 'B')}</h4><p>${esc(interpretation.comparison.b)}</p></div>
    </div><p class="compare-note">${esc(interpretation.comparison.note)}</p></section>` : '';
  const reminder = spread.id === 'daily' ? `<label class="toggle-row"><span><strong>Her sabah hatırlat</strong><small>Saat ${esc(settings.reminderTime)} · Ayarlar'dan değiştirebilirsin.</small></span><input type="checkbox" role="switch" id="reminder-toggle"${settings.reminder ? ' checked' : ''}></label>` : '';
  return `<div class="reading-scroll" tabindex="0" aria-label="Yorum">
      <section class="summary-card fade-up" style="--i:0">
        <p class="eyebrow">GENEL SENTEZ</p>
        <p class="summary-text">${esc(interpretation.summary)}</p>
        ${interpretation.summaryMore ? `<p class="summary-more">${esc(interpretation.summaryMore)}</p>` : ''}
      </section>
      <ol class="position-cards">${items}</ol>
      ${compare}${pairs}
      <section class="reading-block closing-card fade-up" id="closing" style="--i:${spread.cardCount + 2}" aria-live="polite">
        <p class="eyebrow">GENEL YORUM</p>
        <p class="closing-text" id="closing-text">${esc(interpretation.closing || '')}</p>
        <p class="closing-status" id="closing-status"${interpretation.closing ? ' hidden' : ''}>Usta, kartların birlikte ne dediğine bakıyor.</p>
      </section>
      <section class="reading-block reading-actions fade-up" style="--i:${spread.cardCount + 3}">
        <label class="field"><span>Not ekle</span><textarea id="note" rows="3" maxlength="2000" placeholder="Bu okuma sana ne düşündürdü?">${esc(reading.note || '')}</textarea><span class="counter" id="note-state" aria-live="polite">Okuma otomatik kaydedildi</span></label>
        ${reminder}
      </section>
      <p class="disclaimer">Tarot bir yansıtma aracıdır; sağlık, hukuk ve finans kararlarında uzman görüşünün yerini tutmaz.</p>
    </div>`;
}

function closingStatus(error) {
  if (error && error.name === 'AbortError') return 'Yorum bu sefer yetişmedi. Üstteki sentez duruyor.';
  if (error && error.code === 'missing-model') return 'Yorum modeli henüz hazır değil. Üstteki sentez duruyor.';
  return 'Yorum kapısı kapalı. Üstteki sentez duruyor.';
}

async function fillClosing(reading, spread, interpretation, token) {
  const textEl = $('#closing-text');
  const statusEl = $('#closing-status');
  if (!textEl || !statusEl) return;
  if (interpretation.closing && interpretation.closingVoice === ORACLE.VOICE) {
    textEl.textContent = interpretation.closing;
    statusEl.hidden = true;
    return;
  }
  const draft = ORACLE.longClosing(reading, spread, TAROT);
  textEl.textContent = draft;
  statusEl.hidden = true;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const text = await ORACLE.closing(reading, spread, TAROT, { signal: ctrl.signal });
    const longEnough = text && text.trim().split(/\s+/).length >= 180;
    if (token !== state.renderToken || !textEl.isConnected || !longEnough) throw new Error('short');
    interpretation.closing = text.trim();
    interpretation.closingSource = 'llm';
    textEl.textContent = interpretation.closing;
    await service.saveClosing(reading.id, interpretation.closing, 'llm');
  } catch (error) {
    if (token !== state.renderToken || !textEl.isConnected) return;
    interpretation.closing = draft;
    interpretation.closingSource = 'template';
    textEl.textContent = draft;
    statusEl.hidden = true;
    await service.saveClosing(reading.id, draft, 'template');
  } finally {
    clearTimeout(timer);
  }
}

function bindReading(reading, spread) {
  const scroller = $('.reading-scroll', body);
  scroller.addEventListener('click', (event) => {
    const thumb = event.target.closest('.thumb');
    if (thumb) openCardDetail(thumb.dataset.card, thumb.dataset.reversed === 'true', $('img', thumb));
  });
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
  state.interpretationPromise = reading.interpretation ? Promise.resolve(reading.interpretation) : service.complete(reading.id);
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

function openCardDetail(cardId, reversed, fromImg) {
  const card = TAROT.getCard(cardId);
  const dialog = dialogs.card;
  const img = $('#card-dialog-img');
  img.src = card.image;
  img.classList.toggle('is-reversed', Boolean(reversed));
  $('#card-dialog-meta').textContent = TAROT.cardMeta(card).toLocaleUpperCase('tr');
  $('#card-dialog-title').textContent = card.name;
  $('#card-dialog-tr').textContent = `${card.nameTr}${reversed ? ' · bu okumada ters' : ''}`;
  $('#card-dialog-upright').textContent = card.upright;
  $('#card-dialog-reversed').textContent = card.reversed;
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
  statusEl.textContent = 'Paylaşım görseli indirildi';
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
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fcf4e0';
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.strokeStyle = '#cfa24e';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, 984, 1824);
  ctx.fillStyle = '#210e2b';
  ctx.textAlign = 'center';
  ctx.font = '700 64px TarotDisplay, Georgia, serif';
  ctx.fillText('kendine dön', 540, 170);
  ctx.font = '600 22px TarotUI, Arial, sans-serif';
  ctx.fillStyle = '#675975';
  ctx.fillText('İÇİNDE KALANLARA BİR YER', 540, 210);
  ctx.fillStyle = '#210e2b';
  ctx.font = '700 56px TarotDisplay, Georgia, serif';
  ctx.fillText(spread.name, 540, 320);
  ctx.font = '28px TarotUI, Arial, sans-serif';
  ctx.fillStyle = '#7e7390';
  ctx.fillText(new Date(reading.completedAt || reading.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }), 540, 368);

  const geo = geometry(spread, 900, 820, 'share', false);
  const byKey = Object.fromEntries(reading.cards.map((c) => [c.positionKey, c]));
  const faces = withFaces ? await Promise.all(spread.positions.map((p) => loadImage(TAROT.getCard(byKey[p.key].cardId).image))) : [];
  geo.slots.forEach((s, i) => {
    const drawn = byKey[s.key];
    const card = TAROT.getCard(drawn.cardId);
    const cx = 90 + s.left + geo.cw / 2;
    const cy = 420 + s.top + geo.ch / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(((s.rot + (drawn.reversed ? 180 : 0)) * Math.PI) / 180);
    if (faces[i]) ctx.drawImage(faces[i], -geo.cw / 2, -geo.ch / 2, geo.cw, geo.ch);
    else { ctx.fillStyle = '#264abd'; ctx.fillRect(-geo.cw / 2, -geo.ch / 2, geo.cw, geo.ch); }
    ctx.strokeStyle = '#cfa24e';
    ctx.lineWidth = 3;
    ctx.strokeRect(-geo.cw / 2, -geo.ch / 2, geo.cw, geo.ch);
    ctx.restore();
    if (!s.rot) {
      ctx.fillStyle = '#210e2b';
      ctx.font = `600 ${Math.max(16, Math.round(geo.cw / 7))}px TarotUI, Arial, sans-serif`;
      ctx.fillText(card.name + (drawn.reversed ? ' (Ters)' : ''), cx, cy + geo.ch / 2 + 30, geo.cellW);
      ctx.fillStyle = '#847690';
      ctx.font = `${Math.max(14, Math.round(geo.cw / 8))}px TarotUI, Arial, sans-serif`;
      ctx.fillText(ENGINE.displayLabel(s.position, reading), cx, cy + geo.ch / 2 + 54, geo.cellW);
    }
  });
  ctx.textAlign = 'left';
  ctx.fillStyle = '#210e2b';
  ctx.font = '32px TarotDisplay, Georgia, serif';
  wrapText(ctx, interpretation.summary, 110, 1330, 860, 46, 9);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#93849b';
  ctx.font = '20px TarotUI, Arial, sans-serif';
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

function renderGuide() {
  const query = guideQuery.trim().toLocaleLowerCase('tr');
  const groups = GUIDE_GROUPS.filter((group) => guideSuit === 'all' || group.id === guideSuit);
  let count = 0;
  const html = groups.map((group) => {
    const cards = guideCards(group.id).filter((card) => cardMatches(card, query));
    if (!cards.length) return '';
    count += cards.length;
    const tiles = cards.map((card) => `<button type="button" class="guide-card" data-card="${esc(card.id)}" tabindex="-1" aria-label="${esc(card.name)}, ${esc(card.nameTr)}">
        <span class="guide-art"><img src="${esc(card.image)}" alt="" loading="lazy" decoding="async"></span>
        <span class="guide-name">${esc(card.nameTr)}</span>
        <span class="guide-keys">${esc(card.keywords.slice(0, 2).join(' · '))}</span>
      </button>`).join('');
    return `<section class="guide-group"><h3>${esc(group.title)} <span>${cards.length}</span></h3><div class="guide-grid">${tiles}</div></section>`;
  }).join('');
  $('#guide-note').textContent = guideNote(count);
  $('#guide-scroll').innerHTML = html || '<p class="guide-empty">Bu aramaya uyan kart yok.</p>';
  const first = $('.guide-card', $('#guide-scroll'));
  if (first) first.tabIndex = 0;
}

function setGuideSuit(suit, focusButton) {
  guideSuit = suit;
  $$('[data-suit]', $('#guide-page')).forEach((button) => {
    const on = button.dataset.suit === suit;
    button.setAttribute('aria-checked', on ? 'true' : 'false');
    button.tabIndex = on ? 0 : -1;
  });
  renderGuide();
  if (focusButton) focusButton.focus();
}

function showHome({ fromHistory = false } = {}) {
  const wasGuide = stage.dataset.view === 'guide';
  stage.dataset.view = 'home';
  $('#guide-page').hidden = true;
  setActiveNav('home');
  if (wasGuide && !fromHistory && history.state?.kd === 'guide') history.back();
}

function showGuide() {
  stage.dataset.view = 'guide';
  $('#guide-page').hidden = false;
  setActiveNav('guide');
  renderGuide();
  if (history.state?.kd !== 'guide') history.pushState({ kd: 'guide' }, '');
  requestAnimationFrame(() => $('#guide-title').focus({ preventScroll: true }));
}

function setActiveNav(name) {
  $$('.navigation [data-nav]').forEach((el) => {
    const on = el.dataset.nav === name;
    el.classList.toggle('nav-active', on);
    if (on) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
}

function moveGuideFocus(event) {
  const buttons = $$('.guide-card', $('#guide-scroll'));
  const index = buttons.indexOf(document.activeElement);
  if (index < 0 || !buttons.length) return;
  const grid = document.activeElement.closest('.guide-grid');
  const columns = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 1;
  let next = index;
  if (event.key === 'ArrowRight') next = Math.min(buttons.length - 1, index + 1);
  else if (event.key === 'ArrowLeft') next = Math.max(0, index - 1);
  else if (event.key === 'ArrowDown') next = Math.min(buttons.length - 1, index + columns);
  else if (event.key === 'ArrowUp') next = Math.max(0, index - columns);
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = buttons.length - 1;
  else return;
  event.preventDefault();
  buttons.forEach((button, i) => { button.tabIndex = i === next ? 0 : -1; });
  buttons[next].focus();
}

let historySpread = '';

function formatReadingDate(iso) {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: sameYear ? undefined : 'numeric' });
}

function renderHistoryFilters() {
  const options = [{ id: '', name: 'Tümü' }, ...SPREADS.SPREADS.map((s) => ({ id: s.id, name: s.name }))];
  $('#history-filters').innerHTML = options.map((s) => {
    const on = s.id === historySpread;
    return `<button type="button" role="radio" data-spread="${s.id}" aria-checked="${on ? 'true' : 'false'}" tabindex="${on ? '0' : '-1'}">${esc(s.name)}</button>`;
  }).join('');
}

async function renderHistory() {
  const list = await service.list({ spreadId: historySpread || undefined });
  const count = $('#history-count');
  count.textContent = list.length ? `${list.length} okuma` : '';
  const el = $('#history-list');
  if (!list.length) {
    el.innerHTML = historySpread
      ? '<li class="history-empty"><strong>Bu açılımda okuma yok</strong><p>Başka bir açılım seçebilir ya da yeni bir okuma başlatabilirsin.</p></li>'
      : `<li class="history-empty"><span class="history-empty-mark card-back" style="${cardBackVars(78, 116)}" aria-hidden="true"></span><strong>Henüz bir okuman yok</strong><p>İlk açılımın burada, seçtiğin kartlarla birlikte duracak.</p></li>`;
    return;
  }
  el.innerHTML = list.map((r) => {
    const spread = SPREADS.getSpread(r.spreadId);
    const date = formatReadingDate(r.completedAt || r.createdAt);
    const faces = (r.cards || []).slice(0, 3).map((drawn) => {
      const card = TAROT.getCard(drawn.cardId);
      return `<img src="${esc(card.image)}" alt="" decoding="async">`;
    }).join('');
    const names = (r.cards || []).slice(0, 3).map((drawn) => TAROT.getCard(drawn.cardId).nameTr).join(' · ');
    const line = r.question ? `“${esc(r.question)}”` : esc(names);
    return `<li><button type="button" class="history-item" data-id="${esc(r.id)}">
        <span class="history-cards" aria-hidden="true">${faces}</span>
        <span class="history-copy"><span class="history-date">${esc(date)}</span><strong>${esc(spread.name)}</strong>${line ? `<em>${line}</em>` : ''}</span>
        <span class="history-go" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m9 5 7 7-7 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      </button></li>`;
  }).join('');
}

renderHistoryFilters();
$('#history-filters').addEventListener('click', (event) => {
  const button = event.target.closest('[data-spread]');
  if (!button || button.dataset.spread === historySpread) return;
  historySpread = button.dataset.spread;
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
$('#history-list').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-id]');
  if (!button) return;
  const reading = await service.get(button.dataset.id);
  dialogs.history.close();
  openSavedReading(reading);
});

function openSettings() {
  const form = $('#settings-form');
  form.reversals.checked = settings.reversals;
  form.sound.checked = settings.sound;
  form.haptic.checked = settings.haptic;
  form.reminderTime.value = settings.reminderTime;
  $$('input[name=motion]', form).forEach((r) => { r.checked = r.value === (reduced() ? 'reduced' : 'full'); });
  dialogs.settings.showModal();
}

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
$('#open-history').addEventListener('click', () => { renderHistory(); dialogs.history.showModal(); });
$('#open-settings').addEventListener('click', openSettings);

$$('[data-nav="home"]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  if (inReading()) {
    pendingView = 'home';
    openLeaveDialog();
    return;
  }
  if (stage.dataset.view === 'guide') showHome();
  if (state.step !== 'intent') go('intent');
}));

$('#guide-page').addEventListener('click', (event) => {
  const filter = event.target.closest('[data-suit]');
  if (filter) {
    setGuideSuit(filter.dataset.suit);
    return;
  }
  const card = event.target.closest('.guide-card');
  if (card) openCardDetail(card.dataset.card, false, $('img', card));
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

$('#guide-query').addEventListener('input', (event) => {
  guideQuery = event.target.value;
  renderGuide();
});

$('#guide-scroll').addEventListener('keydown', moveGuideFocus);

Object.values(dialogs).forEach((dialog) => dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}));

// ---------- Yeniden boyutlandırma ----------

let resizeRaf = 0;
let lastMobile = isMobile();
function resizeLayout() {
  document.documentElement.style.setProperty('--page-scale', pageScale());
  const mobile = isMobile();
  const layout = $('#layout');
  if (state.step === 'pick' && mobile !== lastMobile) buildFan();
  if (layout && layout.dataset.mode) renderLayout(layout, currentSpread(), layout.dataset.mode);
  if (state.step === 'pick' && fanState.mobile) positionMobileFan();
  lastMobile = mobile;
}
function onViewportChange() {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(resizeLayout);
}
window.addEventListener('resize', onViewportChange);
window.visualViewport?.addEventListener('resize', onViewportChange);
document.addEventListener('scroll', () => {
  if (scrollX || scrollY) scrollTo(0, 0);
}, { passive: true });
systemReduced.addEventListener?.('change', applyMotion);

applyMotion();
resizeLayout();
history.replaceState({ kd: 'base' }, '');
go('intent', { focus: false });
