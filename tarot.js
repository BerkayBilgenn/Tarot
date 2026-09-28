(function (root) {
  'use strict';

  function createSelection() { return []; }
  function selectCard(selection, cardId) {
    if (!Number.isInteger(cardId) || cardId < 0 || cardId > 8 || selection.includes(cardId) || selection.length >= 3) return [...selection];
    return [...selection, cardId];
  }
  function removeCard(selection, slot) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= selection.length) return [...selection];
    return selection.filter((_, index) => index !== slot);
  }
  function canRead(selection) { return selection.length === 3; }
  function resetCards() { return []; }

  // 78 kartlık desteden, masaya kapalı serilecek `size` adet farklı kart çeker (Fisher-Yates).
  function drawHand(cards, size, random) {
    const rnd = typeof random === 'function' ? random : Math.random;
    const pool = cards.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(size, pool.length));
  }

  const api = { createSelection, selectCard, removeCard, canRead, resetCards, drawHand };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', function () {
    const deck = document.getElementById('deck');
    if (!deck) return;
    const TAROT = root.TAROT_CARDS;
    const HAND_SIZE = 9;
    const slots = document.getElementById('slots');
    const count = document.getElementById('selection-count');
    const readButton = document.getElementById('read-button');
    const shuffleButton = document.getElementById('shuffle-button');
    const newButton = document.getElementById('new-reading');
    const selectionScreen = document.getElementById('selection-screen');
    const resultScreen = document.getElementById('result-screen');
    const note = document.getElementById('note');
    const saveButton = document.getElementById('save-button');
    const saveStatus = document.getElementById('save-status');
    const themeSelect = document.getElementById('theme');
    const themeResult = document.getElementById('theme-result');
    const hint = document.getElementById('selection-hint');
    const resultHeading = document.getElementById('result-heading');
    const resultSubheading = document.getElementById('result-subheading');
    const revealedCards = document.getElementById('revealed-cards');
    const readingBlocks = document.getElementById('reading-blocks');
    const reflectionQuestion = document.getElementById('reflection-question');
    const cardNames = ['Taşıdığın', 'İhtiyacın', 'İlk adım'];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
    const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
    const FAN_STEP_DEG = 3.4;
    const FAN_ARC_PX = 2.6;
    let selection = createSelection();
    // Masadaki kapalı kartlar: her karıştırmada 78 kartlık desteden yeniden çekilir.
    // `selection` bu elin indekslerini (0..8) tutar; kartın kendisi hand[index]'tir.
    let hand = drawHand(TAROT.CARDS, HAND_SIZE);
    const deckOrder = Array.from({ length: HAND_SIZE }, (_, i) => i);
    let busy = false;

    function selectedCards() { return selection.map((index) => hand[index]); }
    function preload(card) { const img = new Image(); img.src = card.image; }
    function upperTr(text) { return text.toLocaleUpperCase('tr'); }

    function motionOff() { return reduceMotion.matches || typeof Element.prototype.animate !== 'function'; }

    function fanPose(index, total) {
      const t = index - (total - 1) / 2;
      return { rot: t * FAN_STEP_DEG, y: t * t * FAN_ARC_PX };
    }
    function poseTransform(pose) { return 'translateY(' + pose.y + 'px) rotate(' + pose.rot + 'deg)'; }

    function cardArt() {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'card-art');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#card-back');
      svg.append(use);
      return svg;
    }

    // Records where every card currently sits (centre, width, rotation) so the next render can animate from it.
    function snapshot() {
      const map = new Map();
      document.querySelectorAll('[data-card-id]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        map.set(el.dataset.cardId, { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: el.offsetWidth, rot: Number(el.dataset.rot || 0), y: Number(el.dataset.y || 0) });
      });
      return map;
    }

    function flipFrom(prev) {
      if (motionOff()) return;
      document.querySelectorAll('[data-card-id]').forEach((el) => {
        const before = prev.get(el.dataset.cardId);
        const rect = el.getBoundingClientRect();
        if (!rect.width) return;
        const toRot = Number(el.dataset.rot || 0);
        const toY = Number(el.dataset.y || 0);
        const target = el.style.transform || 'none';
        if (!before) {
          el.animate([{ opacity: 0, transform: 'translateY(' + (toY + 10) + 'px) rotate(' + toRot + 'deg) scale(.96)' }, { opacity: 1, transform: target }], { duration: 260, easing: EASE_OUT, fill: 'both' }).addEventListener('finish', function () { this.cancel(); });
          return;
        }
        const dx = before.cx - (rect.left + rect.width / 2);
        const dy = before.cy - (rect.top + rect.height / 2);
        const scale = before.w / el.offsetWidth;
        if (Math.abs(dx) < .5 && Math.abs(dy) < .5 && Math.abs(before.rot - toRot) < .1 && Math.abs(scale - 1) < .01) return;
        const travelling = Math.hypot(dx, dy) > 60;
        el.style.zIndex = travelling ? '30' : '';
        const anim = el.animate(
          [{ transform: 'translate(' + dx + 'px, ' + (dy + toY) + 'px) rotate(' + before.rot + 'deg) scale(' + scale + ')' }, { transform: target }],
          { duration: travelling ? 460 : 340, easing: travelling ? EASE_IN_OUT : EASE_OUT, fill: 'both' }
        );
        const art = el.querySelector('.card-art');
        if (travelling && art) {
          art.animate(
            [{ boxShadow: 'var(--card-shadow)' }, { boxShadow: 'var(--card-shadow-lift)', offset: .5 }, { boxShadow: 'var(--card-shadow)' }],
            { duration: 460, easing: 'linear' }
          );
        }
        anim.addEventListener('finish', () => { anim.cancel(); el.style.zIndex = ''; });
      });
    }

    function dealIn() {
      if (motionOff()) return Promise.resolve();
      const cards = Array.from(deck.querySelectorAll('.deck-card'));
      const deckRect = deck.getBoundingClientRect();
      const centerX = deckRect.left + deckRect.width / 2;
      const anims = cards.map((el, i) => {
        const r = el.getBoundingClientRect();
        const dx = centerX - (r.left + r.width / 2);
        const order = Math.abs(i - (cards.length - 1) / 2);
        return el.animate(
          [{ opacity: 0, transform: 'translate(' + dx + 'px, 18px) rotate(0deg) scale(.96)' }, { opacity: 1, transform: el.style.transform }],
          { duration: 520, delay: 40 + order * 55, easing: EASE_OUT, fill: 'both' }
        );
      });
      return Promise.all(anims.map((a) => a.finished)).then(() => anims.forEach((a) => a.cancel()), () => {});
    }

    function gatherToDeck() {
      if (motionOff()) return Promise.resolve();
      const deckRect = deck.getBoundingClientRect();
      const centerX = deckRect.left + deckRect.width / 2;
      const centerY = deckRect.top + deckRect.height / 2;
      const anims = Array.from(document.querySelectorAll('[data-card-id]')).map((el, i) => {
        const r = el.getBoundingClientRect();
        const dx = centerX - (r.left + r.width / 2);
        const dy = centerY - (r.top + r.height / 2);
        const scale = el.classList.contains('slot-card') ? (deck.querySelector('.deck-card') || el).offsetWidth / el.offsetWidth : 1;
        return el.animate(
          [{ transform: el.style.transform || 'none' }, { transform: 'translate(' + dx + 'px, ' + dy + 'px) rotate(' + ((i % 2 ? 1 : -1) * 1.5) + 'deg) scale(' + scale + ')' }],
          { duration: 300, delay: i * 18, easing: EASE_IN_OUT, fill: 'forwards' }
        );
      });
      return Promise.all(anims.map((a) => a.finished)).catch(() => {});
    }

    function render() {
      const nextSlot = selection.length;
      slots.replaceChildren();
      cardNames.forEach((name, slotIndex) => {
        const cell = document.createElement('div');
        cell.className = 'slot';
        const number = document.createElement('span');
        number.className = 'slot-number';
        number.textContent = String(slotIndex + 1).padStart(2, '0');
        const label = document.createElement('span');
        label.className = 'slot-label';
        label.textContent = name;
        cell.append(number);
        if (selection[slotIndex] !== undefined) {
          const card = document.createElement('div');
          card.className = 'slot-card';
          card.dataset.cardId = String(selection[slotIndex]);
          card.dataset.rot = '0';
          card.dataset.y = '0';
          card.setAttribute('role', 'img');
          card.setAttribute('aria-label', name + ' için seçilen kapalı kart');
          card.dataset.card = hand[selection[slotIndex]].id;
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.className = 'remove-card';
          remove.setAttribute('aria-label', name + ' kartını kaldır');
          remove.textContent = '×';
          remove.addEventListener('click', () => {
            if (busy) return;
            const prev = snapshot();
            selection = removeCard(selection, slotIndex);
            render();
            flipFrom(prev);
          });
          card.append(cardArt(), remove);
          cell.append(card);
        } else {
          const empty = document.createElement('div');
          empty.className = 'slot-empty' + (slotIndex === nextSlot ? ' is-next' : '');
          empty.setAttribute('aria-hidden', 'true');
          empty.textContent = '+';
          cell.append(empty);
        }
        cell.append(label);
        slots.append(cell);
      });

      deck.replaceChildren();
      const remaining = deckOrder.filter((id) => !selection.includes(id));
      remaining.forEach((id, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'deck-card';
        const pose = fanPose(index, remaining.length);
        button.dataset.cardId = String(id);
        button.dataset.card = hand[id].id;
        button.dataset.rot = String(pose.rot);
        button.dataset.y = String(pose.y);
        button.style.transform = poseTransform(pose);
        button.setAttribute('aria-label', 'Desteden ' + (index + 1) + '. kartı seç');
        button.disabled = canRead(selection);
        button.addEventListener('click', () => {
          if (busy) return;
          const prev = snapshot();
          selection = selectCard(selection, id);
          preload(hand[id]);
          render();
          flipFrom(prev);
        });
        button.append(cardArt());
        deck.append(button);
      });
      count.textContent = selection.length + ' / 3 kart seçildi';
      readButton.disabled = !canRead(selection);
      hint.textContent = canRead(selection) ? 'Üç kart da yerinde.' : selection.length === 0 ? 'İlk kartını seçerek başla.' : 'Sonraki kart için acele etme.';
    }

    function shuffleOrder() {
      hand = drawHand(TAROT.CARDS, HAND_SIZE);
    }

    function revealedCard(card, slotIndex) {
      const wrap = document.createElement('div');
      wrap.className = 'revealed-card';
      const label = document.createElement('span');
      label.textContent = upperTr(cardNames[slotIndex]);
      const flip = document.createElement('div');
      flip.className = 'flip-card';
      flip.setAttribute('role', 'img');
      flip.setAttribute('aria-label', card.nameTr + ' kartı (' + card.name + ')');
      const inner = document.createElement('div');
      inner.className = 'flip-inner';
      const back = cardArt();
      back.classList.add('flip-back');
      const face = document.createElement('img');
      face.className = 'card-face flip-front';
      face.src = card.image;
      face.alt = '';
      face.decoding = 'async';
      inner.append(back, face);
      flip.append(inner);
      const title = document.createElement('strong');
      title.textContent = card.nameTr;
      const meta = document.createElement('small');
      meta.textContent = TAROT.cardMeta(card);
      wrap.append(label, flip, title, meta);
      return wrap;
    }

    function readingBlock(card, slotIndex) {
      const block = document.createElement('div');
      block.className = 'reading-block' + (slotIndex === 2 ? ' small-step' : '');
      const eyebrow = document.createElement('span');
      eyebrow.className = 'eyebrow';
      eyebrow.textContent = upperTr(cardNames[slotIndex]) + ' · ' + upperTr(card.nameTr);
      const keywords = document.createElement('small');
      keywords.className = 'reading-keywords';
      keywords.textContent = card.keywords.join(' · ');
      const text = document.createElement('p');
      text.textContent = card.upright;
      block.append(eyebrow, keywords, text);
      return block;
    }

    // Seçilen üç kartı rehberdeki düz anlamlarıyla yorum ekranına yazar.
    function renderReading() {
      const cards = selectedCards();
      resultHeading.replaceChildren(
        document.createTextNode(cards[0].nameTr + ', ' + cards[1].nameTr),
        document.createElement('br'),
        document.createTextNode(' ve ' + cards[2].nameTr + '.')
      );
      resultSubheading.textContent = 'Taşıdığın ' + cards[0].nameTr + ', ihtiyacın ' + cards[1].nameTr + '.';
      revealedCards.replaceChildren(...cards.map(revealedCard));
      readingBlocks.replaceChildren(...cards.map(readingBlock));
      reflectionQuestion.textContent = cards[1].nameTr + ' kartı bugün sana neyi hatırlatıyor?';
      return Array.from(revealedCards.querySelectorAll('.flip-card'));
    }

    shuffleButton.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      shuffleButton.disabled = true;
      gatherToDeck().then(() => {
        selection = resetCards();
        shuffleOrder();
        render();
        return dealIn();
      }).then(() => {
        busy = false;
        shuffleButton.disabled = false;
      });
    });

    function showScreen(from, to, focusId) {
      to.classList.remove('screen-enter');
      from.hidden = true;
      to.hidden = false;
      void to.offsetWidth;
      to.classList.add('screen-enter');
      to.addEventListener('animationend', () => to.classList.remove('screen-enter'), { once: true });
      document.getElementById(focusId).focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: motionOff() ? 'auto' : 'smooth' });
    }

    readButton.addEventListener('click', () => {
      if (!canRead(selection) || busy) return;
      themeResult.textContent = themeSelect.value;
      const flipCards = renderReading();
      showScreen(selectionScreen, resultScreen, 'result-heading');
      const stagger = motionOff() ? 120 : 260;
      flipCards.forEach((card, i) => {
        window.setTimeout(() => card.classList.add('is-revealed'), 240 + i * stagger);
      });
    });
    newButton.addEventListener('click', () => {
      selection = resetCards();
      shuffleOrder();
      saveStatus.textContent = '';
      render();
      showScreen(resultScreen, selectionScreen, 'selection-heading');
      dealIn();
    });
    saveButton.addEventListener('click', () => {
      const value = note.value.trim();
      if (!value) {
        saveStatus.textContent = 'Önce kendine kısa bir not yaz.';
        note.focus();
        return;
      }
      try {
        localStorage.setItem('kendine-don-not', value);
        saveStatus.textContent = 'Notun bu tarayıcıya kaydedildi.';
      } catch (_) {
        saveStatus.textContent = 'Bu tarayıcıda kaydedilemedi; notunu kopyalayabilirsin.';
      }
    });
    render();
    dealIn();
  });
})(typeof window !== 'undefined' ? window : globalThis);
