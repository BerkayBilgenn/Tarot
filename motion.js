// Kendine dön — hareket katmanı: masadaki ortam (toz, mum ışığı, derinlik), ekran geçişleri,
// kart açılışındaki kıvılcımlar, kelime kelime beliren metin ve imleci izleyen kart eğimi.
// Hareket azaltıldığında her fonksiyon son hâli doğrudan çizer ya da hiçbir şey yapmaz.
(function (root) {
  'use strict';

  const UI = root.TAROT_UI;
  let reducedFn = () => false;
  const reduced = () => reducedFn();

  // Mum alevinin night-scene.png üzerindeki yeri (görsel 1586 × 992).
  const SCENE = { width: 1586, height: 992, candle: { x: 35, y: 300 } };
  const PARALLAX_ZOOM = 1.025;
  const EASE_OUT = 'cubic-bezier(.23, 1, .32, 1)';
  const rand = (a, b) => a + Math.random() * (b - a);

  function run(el, keyframes, options) {
    if (!el || !el.animate) return Promise.resolve();
    const animation = el.animate(keyframes, options);
    return animation.finished.catch(() => {}).then(() => animation);
  }

  // ---------- Ortam: altın toz, uzak ışık lekeleri, mum ışığı, fareyle derinlik ----------

  const ambient = (() => {
    let host = null;
    let bg = null;
    let canvas = null;
    let ctx = null;
    let candle = null;
    let mote = null;
    let glow = null;
    let motes = [];
    let blobs = [];
    let raf = 0;
    let last = 0;
    let running = false;
    let w = 0;
    let h = 0;
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    const drawn = { px: NaN, py: NaN };
    let candleAt = { x: 0, y: 0 };
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

    function sprite(size, stops) {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      stops.forEach(([at, color]) => grad.addColorStop(at, color));
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      return c;
    }

    const newMote = (anywhere) => ({
      x: rand(0, w), y: anywhere ? rand(0, h) : h + rand(4, 40), r: rand(0.6, 1.9), vy: rand(6, 18),
      sway: rand(4, 16), freq: rand(0.05, 0.22), phase: rand(0, 6.3), alpha: rand(0.2, 0.62), twinkle: rand(0.2, 0.8), depth: rand(0.3, 1)
    });
    const newBlob = () => ({
      x: rand(0, w), y: rand(0, h), r: rand(50, 130), vx: rand(-4, 4), vy: rand(-5, -1.5), alpha: rand(0.03, 0.07), depth: rand(0.15, 0.4), phase: rand(0, 6.3)
    });

    // Arka plan kendi katmanında durur. Derinlik hareketi yalnızca bu katmanın ve mumun transform'unu
    // değiştirir; sahnenin köküne değişken yazılmaz, bu yüzden her karede bütün sayfanın stili yeniden hesaplanmaz.
    function mount(scene) {
      host = scene;
      bg = document.createElement('div');
      bg.className = 'scene-bg';
      bg.setAttribute('aria-hidden', 'true');
      canvas = document.createElement('canvas');
      canvas.className = 'ambient-dust';
      canvas.setAttribute('aria-hidden', 'true');
      candle = document.createElement('div');
      candle.className = 'candle-light';
      candle.setAttribute('aria-hidden', 'true');
      candle.innerHTML = '<span class="candle-halo"></span><span class="candle-flame"></span>';
      host.prepend(bg, canvas, candle);
      host.classList.add('has-bg');
      ctx = canvas.getContext('2d');
      mote = sprite(32, [[0, 'rgba(255,240,208,1)'], [0.3, 'rgba(240,206,149,.6)'], [1, 'rgba(240,206,149,0)']]);
      glow = sprite(128, [[0, 'rgba(240,206,149,.85)'], [0.5, 'rgba(240,190,120,.25)'], [1, 'rgba(240,190,120,0)']]);
      resize();
      addEventListener('resize', resize);
      document.addEventListener('visibilitychange', sync);
      addEventListener('pointermove', (event) => {
        if (!finePointer.matches) return;
        pointer.x = event.clientX / w - 0.5;
        pointer.y = event.clientY / h - 0.5;
      }, { passive: true });
      sync();
    }

    function resize() {
      if (!canvas) return;
      w = innerWidth;
      h = innerHeight;
      // Toz yumuşak lekelerden oluşur; retina çözünürlüğü görünmez ama dört kat piksel çizdirir.
      const dpr = 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(64, Math.max(20, (w * h) / 28000)));
      while (motes.length < count) motes.push(newMote(true));
      motes.length = count;
      if (!blobs.length) blobs = Array.from({ length: 7 }, newBlob);
      placeCandle();
    }

    function placeCandle() {
      const p = UI.coverPoint(w, h, SCENE.width, SCENE.height, SCENE.candle.x, SCENE.candle.y);
      const zoom = host.classList.contains('has-parallax') ? PARALLAX_ZOOM : 1;
      const x = w / 2 + (p.x - w / 2) * zoom;
      const y = h / 2 + (p.y - h / 2) * zoom;
      candle.hidden = x < -60 || x > w + 60 || y > h;
      candleAt = { x, y };
      candle.style.setProperty('--cs', (p.scale * zoom).toFixed(3));
      drawn.px = NaN;
      paintDepth(pointer.sx * -18, pointer.sy * -12);
    }

    function paintDepth(px, py) {
      if (Math.abs(px - drawn.px) < 0.05 && Math.abs(py - drawn.py) < 0.05) return;
      drawn.px = px;
      drawn.py = py;
      const zoom = host.classList.contains('has-parallax') ? PARALLAX_ZOOM : 1;
      bg.style.transform = zoom === 1 && !px && !py ? '' : `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0) scale(${zoom})`;
      candle.style.transform = `translate3d(${(candleAt.x + px).toFixed(1)}px, ${(candleAt.y + py).toFixed(1)}px, 0)`;
    }

    function frame(time) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (time - (last || time)) / 1000);
      last = time;
      const t = time / 1000;
      pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 2.6);
      pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 2.6);
      if (finePointer.matches) paintDepth(pointer.sx * -18, pointer.sy * -12);
      ctx.clearRect(0, 0, w, h);
      blobs.forEach((b) => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y < -b.r) { b.y = h + b.r; b.x = rand(0, w); }
        if (b.x < -b.r) b.x = w + b.r;
        if (b.x > w + b.r) b.x = -b.r;
        ctx.globalAlpha = b.alpha * (0.7 + 0.3 * Math.sin(t * 0.35 + b.phase));
        ctx.drawImage(glow, b.x - b.r + pointer.sx * -44 * b.depth, b.y - b.r + pointer.sy * -28 * b.depth, b.r * 2, b.r * 2);
      });
      for (let i = 0; i < motes.length; i++) {
        let m = motes[i];
        m.y -= m.vy * dt;
        if (m.y < -10) { m = newMote(false); motes[i] = m; }
        const x = m.x + Math.sin(t * m.freq * 6.283 + m.phase) * m.sway + pointer.sx * -34 * m.depth;
        const y = m.y + pointer.sy * -22 * m.depth;
        const edge = Math.min(1, m.y / (h * 0.22), (h + 20 - m.y) / (h * 0.12));
        ctx.globalAlpha = Math.max(0, m.alpha * (0.5 + 0.5 * Math.sin(t * m.twinkle * 6.283 + m.phase)) * edge);
        const s = m.r * 7;
        ctx.drawImage(mote, x - s / 2, y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    }

    function sync() {
      if (!host) return;
      const on = !reduced() && !document.hidden;
      host.classList.toggle('has-parallax', on && finePointer.matches);
      placeCandle();
      if (on === running) return;
      running = on;
      if (on) {
        last = 0;
        canvas.hidden = false;
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
        ctx.clearRect(0, 0, w, h);
        canvas.hidden = true;
        pointer.sx = 0;
        pointer.sy = 0;
        drawn.px = NaN;
        paintDepth(0, 0);
      }
    }

    return { mount, sync, background: () => bg };
  })();

  // ---------- Geçişler ----------

  // Eski içeriğin bir kopyasını aynı yerde bırakıp söndürür; yeni içerik altından gelir.
  let activeGhost = null;
  const entrances = new WeakMap();

  function ghost(node, { y = -8, duration = 180, into = null } = {}) {
    if (activeGhost) {
      activeGhost.getAnimations().forEach((animation) => animation.cancel());
      activeGhost.remove();
      activeGhost = null;
    }
    if (reduced() || !node || !node.isConnected) return null;
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const scrollers = [...node.querySelectorAll('*')].map((el, i) => [i, el.scrollLeft, el.scrollTop]).filter(([, left, top]) => left || top);
    const visual = getComputedStyle(node);
    const opacity = visual.opacity;
    const transform = visual.transform;
    entrances.get(node)?.cancel();
    const clone = node.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    clone.classList.add('is-ghost');
    Object.assign(clone.style, { position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', zIndex: '4', pointerEvents: 'none' });
    (into || node.closest('.scene') || document.body).append(clone);
    const all = clone.querySelectorAll('*');
    scrollers.forEach(([i, left, top]) => { all[i].scrollLeft = left; all[i].scrollTop = top; });
    activeGhost = clone;
    run(clone, [
      { opacity, transform },
      { opacity: 0, transform: `translateY(${y}px) scale(.985)` }
    ], { duration, easing: EASE_OUT, fill: 'forwards' }).then(() => {
      clone.remove();
      if (activeGhost === clone) activeGhost = null;
    });
    return clone;
  }

  // Öğeleri sırayla aşağıdan getirir. Büyük kutularda bulanıklık animasyonu her karede yeniden çizim ister;
  // bu yüzden varsayılan olarak yalnızca saydamlık ve konum oynar.
  function enter(nodes, { x = 0, y = 8, scale = 1, duration = 260, delay = 0, stagger = 35 } = {}) {
    const list = [...nodes].filter(Boolean);
    return Promise.all(list.map((el, i) => {
      const previous = entrances.get(el);
      const current = previous && previous.playState !== 'finished' ? getComputedStyle(el) : null;
      const start = current
        ? { opacity: current.opacity, transform: current.transform }
        : { opacity: 0, transform: `translate(${x}px, ${y}px) scale(${scale})` };
      previous?.cancel();
      if (reduced() || !el.animate) return Promise.resolve();
      const animation = el.animate([start, { opacity: 1, transform: 'none' }], {
        duration: Math.min(duration, 300), delay: Math.min(delay, 60) + Math.min(i * stagger, 120), easing: EASE_OUT, fill: 'backwards'
      });
      entrances.set(el, animation);
      return animation.finished.catch(() => {}).then(() => {
        if (entrances.get(el) === animation) { entrances.delete(el); animation.cancel(); }
      });
    }));
  }

  // Sahne arka planı bir an yaklaşır: masada bir yerden ötekine geçiyormuş gibi. Yalnızca ölçek ve saydamlık.
  function sceneBreath() {
    const layer = ambient.background();
    if (reduced() || !layer) return;
    layer.animate([{ scale: '1.05', opacity: 0.72 }, { scale: '1', opacity: 1 }], { duration: 1100, easing: EASE_OUT });
  }

  // ---------- Metin ----------

  // Başlığı kelimelere ayırır; her kelime sırayla belirir.
  function titleWords(el, text) {
    el.textContent = '';
    let k = 0;
    String(text || '').split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { el.append(part); return; }
      const span = document.createElement('span');
      span.className = 'tw';
      span.style.setProperty('--i', k++);
      span.textContent = part;
      el.append(span);
    });
  }

  // Metni kelime kelime yazar. Ekran okuyucu için tam metin ayrıca durur; görünen kelimeler aria-hidden'dır.
  // Kelimeler satır içi kalır ve yalnızca saydamlıkları oynar: yüzlerce ayrı katman açılmaz.
  function words(el, text, { step = 24, max = 1500, delay = 0 } = {}) {
    el.textContent = '';
    const value = String(text || '');
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = value;
    const visible = document.createElement('span');
    visible.className = 'words';
    visible.setAttribute('aria-hidden', 'true');
    const parts = value.split(/(\s+)/).filter(Boolean);
    const count = parts.filter((p) => !/^\s+$/.test(p)).length;
    const gap = UI.wordStep(count, { step, max });
    let k = 0;
    parts.forEach((part) => {
      if (/^\s+$/.test(part)) { visible.append(part); return; }
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = part;
      span.style.animationDelay = `${delay + k * gap}ms`;
      k++;
      visible.append(span);
    });
    el.append(sr, visible);
    if (reduced()) visible.classList.add('is-instant');
    return { el: visible, duration: reduced() ? 0 : delay + k * gap + 650 };
  }

  // ---------- Kıvılcım ----------

  // Kart açıldığında altın bir halka ve dışa saçılan kıvılcımlar. Büyük Arkana daha güçlü parlar.
  // Hepsi tek bir tuvalde çizilir: on kart birden açılsa da sahneye yüzlerce ayrı katman eklenmez.
  const sparks = (() => {
    let canvas = null;
    let ctx = null;
    let dot = null;
    let star = null;
    let raf = 0;
    let last = 0;
    let dpr = 1;
    const items = [];
    const rings = [];

    function setup() {
      canvas = document.createElement('canvas');
      canvas.className = 'spark-layer';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.append(canvas);
      ctx = canvas.getContext('2d');
      dot = document.createElement('canvas');
      dot.width = dot.height = 32;
      const d = dot.getContext('2d');
      const g = d.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255,250,240,1)');
      g.addColorStop(0.35, 'rgba(240,206,149,.9)');
      g.addColorStop(1, 'rgba(240,206,149,0)');
      d.fillStyle = g;
      d.fillRect(0, 0, 32, 32);
      star = document.createElement('canvas');
      star.width = star.height = 32;
      const s = star.getContext('2d');
      s.translate(16, 16);
      s.fillStyle = '#f7dca6';
      s.shadowColor = '#f0ce95';
      s.shadowBlur = 6;
      s.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 ? 2.2 : 11;
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      s.closePath();
      s.fill();
      addEventListener('resize', size);
      size();
    }

    function size() {
      dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.round(innerWidth * dpr);
      canvas.height = Math.round(innerHeight * dpr);
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.t += dt;
        const k = Math.min(1, r.t / r.life);
        if (k >= 1) { rings.splice(i, 1); continue; }
        const e = 1 - Math.pow(1 - k, 3);
        ctx.globalAlpha = (1 - k) * (r.major ? 0.85 : 0.65);
        ctx.strokeStyle = '#f7dca6';
        ctx.lineWidth = (r.major ? 5 : 3.5) * (1 - k) + 0.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.from + (r.to - r.from) * e, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = items.length - 1; i >= 0; i--) {
        const p = items[i];
        p.t += dt;
        if (p.t < 0) continue;
        const k = p.t / p.life;
        if (k >= 1) { items.splice(i, 1); continue; }
        const e = 1 - Math.pow(1 - k, 3);
        const x = p.x + p.dx * e;
        const y = p.y + p.dy * e - 14 * k;
        const grow = k < 0.22 ? 0.2 + (k / 0.22) * 0.8 : 1 - (k - 0.22) * 0.95;
        ctx.globalAlpha = k < 0.22 ? k / 0.22 : 1 - (k - 0.22) / 0.78;
        const sz = p.size * grow;
        ctx.drawImage(p.star ? star : dot, x - sz / 2, y - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
      if (items.length || rings.length) { raf = requestAnimationFrame(frame); return; }
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      raf = 0;
      last = 0;
    }

    function add(rect, { count, major, size: scale }) {
      if (!canvas) setup();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const reach = Math.max(rect.width, rect.height) * 0.62 * scale;
      const n = major ? count + 10 : count;
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + rand(-0.35, 0.35);
        const dist = reach * rand(0.55, 1.2);
        const isStar = Math.random() < (major ? 0.5 : 0.3);
        items.push({ x, y, dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, t: -rand(0, 0.09), life: rand(0.7, 1.15), star: isStar, size: isStar ? 15 : 8 });
      }
      const base = Math.max(rect.width, rect.height) * 0.65 * scale;
      rings.push({ x, y, from: base * 0.5, to: base * (major ? 2 : 1.65), t: 0, life: major ? 1 : 0.76, major });
      if (!raf) raf = requestAnimationFrame(frame);
    }

    return { add };
  })();

  function burst(hostEl, { count = 12, major = false, size = 1 } = {}) {
    if (reduced() || !hostEl || !hostEl.isConnected) return;
    const rect = hostEl.getBoundingClientRect();
    if (!rect.width) return;
    sparks.add(rect, { count, major, size });
  }

  // ---------- Etkileşim ----------

  // İmleci izleyen hafif üç boyutlu eğim ve kartın üstünden geçen ışık. Yalnızca fare/kalem ile.
  function bindTilt(container, selector, { max = 7 } = {}) {
    if (!container || container.dataset.tilt) return;
    container.dataset.tilt = 'true';
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    container.addEventListener('pointermove', (event) => {
      if (reduced() || !fine.matches) return;
      const el = event.target.closest(selector);
      if (!el || !container.contains(el)) return;
      const r = el.getBoundingClientRect();
      const x = (event.clientX - r.left) / r.width - 0.5;
      const y = (event.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--ry', `${(x * max * 2).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${(-y * max * 2).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
      el.classList.add('is-tilting');
    });
    container.addEventListener('pointerout', (event) => {
      const el = event.target.closest(selector);
      if (!el || el.contains(event.relatedTarget)) return;
      el.classList.remove('is-tilting');
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
    });
  }

  // Menüde etkin öğenin altındaki altın çizgi, seçilen öğeye kayar.
  function ink(nav, target, { instant = false } = {}) {
    if (!nav) return;
    let bar = nav.querySelector('.nav-ink');
    if (!bar) {
      bar = document.createElement('span');
      bar.className = 'nav-ink';
      bar.setAttribute('aria-hidden', 'true');
      nav.append(bar);
      instant = true;
    }
    if (!target || !target.offsetWidth) { bar.style.opacity = '0'; return; }
    bar.classList.toggle('is-instant', instant || reduced());
    bar.style.transform = `translateX(${target.offsetLeft}px) scaleX(${target.offsetWidth / 100})`;
    bar.style.opacity = '1';
    if (instant) requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.remove('is-instant')));
  }

  function init({ reduced: fn, scene }) {
    reducedFn = fn;
    if (scene) ambient.mount(scene);
  }

  root.TAROT_MOTION = { init, sync: ambient.sync, run, ghost, enter, sceneBreath, titleWords, words, burst, bindTilt, ink, EASE_OUT };
})(typeof window !== 'undefined' ? window : globalThis);
