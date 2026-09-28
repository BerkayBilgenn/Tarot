const POSITIONS = [
  { key: "carry", label: "Taşıdığın", lens: "Üzerinde tuttuğun" },
  { key: "need", label: "İhtiyacın", lens: "Şu an sana iyi gelecek" },
  { key: "step", label: "İlk adım", lens: "Bugün atılabilecek adım" },
];

const INTENTS = [
  "Güçlü görünüyorum. Biraz yoruldum.",
  "Ne istediğimi yeni yeni duyuyorum.",
  "Bir kararın eşiğindeyim.",
  "Aynı yerde biraz fazla kaldım.",
];

const HINTS = [
  "Seni çağıran ilk kartı seç.",
  "İki kartın daha var.",
  "Son kartın için acele etme.",
  "Üç kart da yerinde.",
];

const DECK = [
  {
    id: "star",
    name: "Yıldız",
    line: "İyileşme uzakta değil. Küçük bir açıklık bile yön gösterir.",
  },
  {
    id: "moon",
    name: "Ay",
    line: "Her şey net olmak zorunda değil. Belirsizlikte de kalabilirsin.",
  },
  {
    id: "sun",
    name: "Güneş",
    line: "Sakladığın canlılık ortaya çıkmak istiyor. Biraz yer aç.",
  },
  {
    id: "hermit",
    name: "Ermiş",
    line: "Cevap dışarıdaki seste değil, yavaşladığında duyulan tarafta.",
  },
  {
    id: "strength",
    name: "Güç",
    line: "Zorlamak yerine yanında durmak da bir güç. Yumuşak kalabilirsin.",
  },
  {
    id: "lovers",
    name: "Aşıklar",
    line: "Bir seçim var ve ikisi de bir şey istiyor. Kalbine yakın olanı ayır.",
  },
  {
    id: "chariot",
    name: "Savaş Arabası",
    line: "Dağınık parçalar aynı yöne bakınca hareket başlar.",
  },
  {
    id: "tower",
    name: "Kule",
    line: "Artık taşımayan bir şey yıkılabilir. Bu bir bitiş, bir ceza değil.",
  },
  {
    id: "world",
    name: "Dünya",
    line: "Bir döngü kapanmak üzere. Bitirdiğin şeyi kutlamadan geçme.",
  },
  {
    id: "justice",
    name: "Adalet",
    line: "Dürüst bir tartı yeter. Kendine karşı da aynı açıklıkta ol.",
  },
  {
    id: "temperance",
    name: "Denge",
    line: "Aşırı uçların ortasında senin ritmin var. Acele etme.",
  },
  {
    id: "magician",
    name: "Büyücü",
    line: "Elinde olanlar sandığından fazla. Bir tanesiyle başla.",
  },
];

const slotsEl = document.querySelector("#slots");
const fanEl = document.querySelector("#fan");
const intentEl = document.querySelector("#intent-text");
const countMain = document.querySelector("#count-main");
const countHint = document.querySelector("#count-hint");
const readBtn = document.querySelector("#read");
const reading = document.querySelector("#reading");
const readingGrid = document.querySelector("#reading-grid");

const state = {
  intent: 0,
  slots: [DECK[0], DECK[1], null],
  fan: DECK.slice(2),
};

function filledCount() {
  return state.slots.filter(Boolean).length;
}

function renderIntent() {
  intentEl.textContent = INTENTS[state.intent];
}

function renderStatus() {
  const n = filledCount();
  countMain.textContent = `${n} / 3 kart seçildi`;
  countHint.textContent = HINTS[n];
  readBtn.disabled = n < 3;
}

function renderSlots() {
  slotsEl.replaceChildren();
  const origins = [322, 474, 626];
  state.slots.forEach((card, index) => {
    const position = POSITIONS[index];
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.style.left = `calc(${origins[index]} * 100cqw / 1024)`;
    slot.style.top = `calc(238 * 100cqh / 682)`;

    const num = document.createElement("div");
    num.className = "slot-num";
    num.textContent = String(index + 1);

    const label = document.createElement("div");
    label.className = "slot-label";
    label.textContent = position.label;

    if (card) {
      const placed = document.createElement("div");
      placed.className = "placed";
      const img = document.createElement("img");
      img.className = "card-face";
      img.src = "assets/card.png";
      img.alt = "";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove";
      remove.setAttribute("aria-label", `${position.label} kartını geri koy`);
      remove.textContent = "×";
      remove.addEventListener("click", () => returnCard(index));
      placed.append(img, remove);
      slot.append(num, placed, label);
    } else {
      const empty = document.createElement("div");
      empty.className = "empty-slot";
      empty.setAttribute("aria-hidden", "true");
      const plus = document.createElement("span");
      plus.textContent = "+";
      empty.append(plus);
      slot.append(num, empty, label);
    }

    slotsEl.append(slot);
  });
}

function renderFan() {
  fanEl.replaceChildren();
  const cards = state.fan;
  const n = cards.length;
  cards.forEach((card, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fan-card";
    const next = POSITIONS[filledCount()];
    button.setAttribute(
      "aria-label",
      next ? `${next.label} için bir kart seç` : "Seçili kart"
    );
    const img = document.createElement("img");
    img.src = "assets/card.png";
    img.alt = "";
    button.append(img);

    const t = n === 1 ? 0 : (index / (n - 1)) * 2 - 1;
    const rot = t * 15;
    const x = t * 268;
    const y = Math.abs(t) * 16;
    button.style.left = `calc(${x} * 100cqw / 1024)`;
    button.style.top = `calc(${y} * 100cqh / 682)`;
    button.style.transform = `translate(-50%, 0) rotate(${rot}deg)`;
    const center = (n - 1) / 2;
    button.style.zIndex = String(80 - Math.round(Math.abs(index - center)));
    button.addEventListener("click", () => takeCard(card.id));
    fanEl.append(button);
  });
}

function render() {
  renderIntent();
  renderStatus();
  renderSlots();
  renderFan();
}

function takeCard(id) {
  const slotIndex = state.slots.findIndex((card) => card === null);
  if (slotIndex === -1) return;
  const index = state.fan.findIndex((card) => card.id === id);
  if (index === -1) return;
  const [card] = state.fan.splice(index, 1);
  state.slots[slotIndex] = card;
  render();
}

function returnCard(slotIndex) {
  const card = state.slots[slotIndex];
  if (!card) return;
  state.slots[slotIndex] = null;
  state.fan.push(card);
  render();
}

function shuffle() {
  const pool = [...state.slots.filter(Boolean), ...state.fan];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  state.slots = [null, null, null];
  state.fan = pool;
  if (reading.open) reading.close();
  render();
}

function openReading() {
  if (filledCount() < 3) return;
  readingGrid.replaceChildren();
  state.slots.forEach((card, index) => {
    const position = POSITIONS[index];
    const item = document.createElement("article");
    item.className = "reading-item";
    const eyebrow = document.createElement("h3");
    eyebrow.textContent = position.label;
    const title = document.createElement("strong");
    title.textContent = card.name;
    const text = document.createElement("p");
    text.textContent = `${position.lens}: ${card.line}`;
    item.append(eyebrow, title, text);
    readingGrid.append(item);
  });
  reading.showModal();
}

document.querySelector("#change-intent").addEventListener("click", () => {
  state.intent = (state.intent + 1) % INTENTS.length;
  renderIntent();
});

document.querySelector("#shuffle").addEventListener("click", shuffle);
readBtn.addEventListener("click", openReading);

render();
