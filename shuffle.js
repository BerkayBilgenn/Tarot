// Kendine dön — karıştırma ritüeli. Deste masada yayılıp kendi etrafında döner (yıkama), basılı tuttukça
// masadaki çember dolar. Bırakınca kartlar toplanır, iki yarı birbirinin içine geçer ve deste üçe kesilip
// yeniden birleşir. Her kart kendi yayıyla hedefine gider; bu yüzden hareket her an kesilip yön değiştirebilir.
// Hareket azaltıldığında hiçbir şey dönmez: deste yerinde kalır, çağıran doğrudan sonraki adıma geçer.
(function (root) {
  'use strict';

  const COUNT = 16;
  const HOLD_S = 2.1;
  const rand = (a, b) => a + Math.random() * (b - a);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // deck: kartların dizileceği eğik masa düzlemi (button.deck). ring: dolan çember (svg circle, pathLength=1).
  function create(deck, { ring = null, reduced = () => false, onProgress = () => {}, onReady = () => {}, onTick = () => {} } = {}) {
    const cards = Array.from({ length: COUNT }, (_, i) => {
      const el = document.createElement('span');
      el.className = 'shuffle-card card-back';
      el.setAttribute('aria-hidden', 'true');
      deck.append(el);
      const seat = { x: rand(-1.2, 1.2), y: rand(-1.2, 1.2), rot: rand(-2.2, 2.2), z: i * 0.7 };
      return {
        el, i, seat,
        x: seat.x, y: seat.y, z: seat.z, rot: seat.rot,
        vx: 0, vy: 0, vz: 0, vr: 0,
        tx: seat.x, ty: seat.y, tz: seat.z, tr: seat.rot,
        k: 170, c: 20,
        // Yıkamada her kartın kendi yörüngesi: yarıçap, hız, salınım ve dönüş.
        orbit: { r: rand(0.42, 1), a: (i / COUNT) * Math.PI * 2 + rand(-0.3, 0.3), w: rand(0.9, 1.7) * (i % 5 === 0 ? -1 : 1), f: rand(0.6, 1.4), p: rand(0, 6.3), spin: rand(-40, 40) }
      };
    });
    let mode = 'pile';
    let energy = 0;
    let energyV = 0;
    let holding = false;
    let progress = 0;
    let ready = false;
    let stir = 0;
    let raf = 0;
    let last = 0;
    let time = 0;
    let lastTick = 0;
    let dead = false;
    let box = null;
    // Deste boyutu basılı tutma başında bir kez okunur; karelerde düzen okunmaz.
    const size = () => box || (box = { w: deck.offsetWidth || 160, h: deck.offsetHeight || 270 });

    function paint(card) {
      card.el.style.transform = `translate3d(${card.x.toFixed(1)}px, ${card.y.toFixed(1)}px, ${card.z.toFixed(1)}px) rotate(${card.rot.toFixed(2)}deg)`;
    }
    cards.forEach(paint);

    function setRing(value) {
      if (!ring) return;
      ring.style.strokeDashoffset = String(1 - value);
    }

    // Yıkama hedefi: kartlar desteden masaya yayılır, iki grup birbirine ters döner, yarıçap nefes alır.
    function washTargets(dt) {
      const { w, h } = size();
      const reach = Math.max(w, h * 0.6) * 0.95;
      const speed = 1 + stir * 1.6;
      cards.forEach((card) => {
        const o = card.orbit;
        o.a += o.w * speed * dt;
        const r = reach * o.r * (0.78 + 0.22 * Math.sin(time * o.f + o.p)) * energy;
        card.tx = Math.cos(o.a) * r;
        card.ty = Math.sin(o.a) * r * 0.6;
        card.tr = card.seat.rot + ((o.a * 180) / Math.PI) * 0.35 * energy + o.spin * energy;
        card.tz = card.seat.z + energy * (4 + 5 * Math.sin(time * 1.7 + o.p));
      });
    }

    function frame(now) {
      if (dead || !deck.isConnected) { stop(); return; }
      const dt = Math.min(0.034, Math.max(0.001, (now - (last || now)) / 1000));
      last = now;
      time += dt;
      // Enerji: basılı tutulurken 1'e, bırakınca 0'a giden yumuşak bir yay.
      const goal = holding || mode === 'wash' ? 1 : 0;
      energyV += ((goal - energy) * (goal ? 26 : 34) - energyV * (goal ? 8.5 : 11)) * dt;
      energy = Math.max(0, Math.min(1.08, energy + energyV * dt));
      stir *= Math.pow(0.12, dt);
      if (holding) {
        progress = Math.min(1, progress + dt / HOLD_S);
        setRing(progress);
        onProgress(progress);
        if (progress >= 1 && !ready) { ready = true; onReady(); }
        if (now - lastTick > 90 + Math.random() * 90) { lastTick = now; onTick('wash'); }
      }
      if (mode === 'wash' || holding || energy > 0.004) washTargets(dt);
      let moving = false;
      cards.forEach((card) => {
        card.vx += ((card.tx - card.x) * card.k - card.vx * card.c) * dt;
        card.vy += ((card.ty - card.y) * card.k - card.vy * card.c) * dt;
        card.vz += ((card.tz - card.z) * card.k - card.vz * card.c) * dt;
        card.vr += ((card.tr - card.rot) * card.k - card.vr * card.c) * dt;
        card.x += card.vx * dt;
        card.y += card.vy * dt;
        card.z += card.vz * dt;
        card.rot += card.vr * dt;
        if (Math.abs(card.tx - card.x) + Math.abs(card.ty - card.y) + Math.abs(card.tr - card.rot) > 0.06 || Math.abs(card.vx) + Math.abs(card.vy) > 0.4) moving = true;
        paint(card);
      });
      if (!moving && !holding && mode === 'pile' && energy < 0.004) { raf = 0; last = 0; return; }
      raf = requestAnimationFrame(frame);
    }

    function kick() {
      if (reduced() || raf || dead) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    function toPile({ neat = false } = {}) {
      cards.forEach((card) => {
        if (neat) card.seat = { x: rand(-0.6, 0.6), y: rand(-0.6, 0.6), rot: rand(-0.8, 0.8), z: card.seat.z };
        card.tx = card.seat.x;
        card.ty = card.seat.y;
        card.tz = card.seat.z;
        card.tr = card.seat.rot;
        card.k = 170;
        card.c = 21;
      });
    }

    // Kartlar yeni bir sıraya dizilir: z (yükseklik) sırası da değişir, deste gerçekten karışır.
    function reorder(order) {
      order.forEach((card, rank) => { card.seat.z = rank * 0.7; card.el.style.zIndex = String(rank); });
    }

    // Toplanma → iki yarı → iç içe geçme → üçe kesme → birleşme.
    async function finale() {
      holding = false;
      mode = 'pile';
      if (reduced()) return;
      kick();
      toPile();
      await sleep(300);
      const { w } = size();
      const byHeight = cards.slice().sort((a, b) => a.seat.z - b.seat.z);
      const left = byHeight.slice(0, COUNT / 2);
      const right = byHeight.slice(COUNT / 2);
      // İki yarı yana açılır, uçları birbirine doğru hafifçe kalkar.
      left.forEach((card, n) => { card.tx = -w * 0.62; card.ty = w * 0.04; card.tr = -9; card.tz = n * 0.7; card.k = 230; card.c = 24; });
      right.forEach((card, n) => { card.tx = w * 0.62; card.ty = w * 0.04; card.tr = 9; card.tz = n * 0.7; card.k = 230; card.c = 24; });
      onTick('split');
      await sleep(260);
      // Kartlar sırayla, bir soldan bir sağdan ortaya düşer.
      const woven = [];
      for (let n = COUNT / 2 - 1; n >= 0; n--) woven.push(left[n], right[n]);
      woven.reverse();
      reorder(woven);
      for (let n = 0; n < woven.length; n++) {
        const card = woven[n];
        card.tx = rand(-1, 1);
        card.ty = rand(-1, 1);
        card.tr = rand(-1.5, 1.5);
        card.tz = card.seat.z + 10;
        card.k = 320;
        card.c = 26;
        onTick('riffle');
        await sleep(22);
      }
      await sleep(100);
      toPile({ neat: true });
      await sleep(210);
      // Üçe kes: üstteki üçte bir sağa, ortadaki sola; sonra alttan üste yeniden birleşir.
      const stack = cards.slice().sort((a, b) => a.seat.z - b.seat.z);
      const third = Math.round(COUNT / 3);
      const bottom = stack.slice(0, third);
      const middle = stack.slice(third, third * 2);
      const top = stack.slice(third * 2);
      middle.forEach((card) => { card.tx = -w * 0.78; card.ty = w * 0.1; card.tr = -4; card.k = 190; card.c = 22; });
      top.forEach((card) => { card.tx = w * 0.78; card.ty = w * 0.1; card.tr = 4; card.k = 190; card.c = 22; });
      onTick('cut');
      await sleep(360);
      reorder([...top, ...bottom, ...middle]);
      middle.forEach((card) => { card.tx = card.seat.x; card.ty = card.seat.y; card.tr = card.seat.rot; card.tz = card.seat.z + 14; });
      await sleep(150);
      top.forEach((card) => { card.tx = card.seat.x; card.ty = card.seat.y; card.tr = card.seat.rot; });
      onTick('cut');
      await sleep(140);
      toPile();
      await sleep(280);
    }

    return {
      get progress() { return progress; },
      get ready() { return ready; },
      hold() {
        if (dead) return;
        box = null;
        holding = true;
        mode = 'pile';
        kick();
      },
      stir(dx, dy) {
        stir = Math.min(1, stir + Math.hypot(dx, dy) * 0.006);
      },
      release() {
        holding = false;
        toPile();
        kick();
        return ready;
      },
      // Otomatik karıştırma: çember kendiliğinden dolar, sonra aynı kapanış oynar.
      async auto(ms = 1500) {
        if (reduced()) return;
        holding = true;
        kick();
        const from = progress;
        const started = performance.now();
        while (performance.now() - started < ms && !dead) {
          const t = (performance.now() - started) / ms;
          progress = Math.max(progress, from + (1 - from) * t);
          stir = Math.max(stir, 0.35);
          await sleep(60);
        }
        holding = false;
        progress = 1;
        setRing(1);
        onProgress(1);
        if (!ready) { ready = true; onReady(); }
        await finale();
      },
      finale,
      destroy() { dead = true; stop(); }
    };
  }

  const api = { create, COUNT, HOLD_S };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TAROT_SHUFFLE = api;
})(typeof window !== 'undefined' ? window : globalThis);
