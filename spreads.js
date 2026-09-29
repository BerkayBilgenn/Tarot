// Açılım tanımları "Tarot Okuma Akışı" spec'indeki spreads.json ile birebir aynıdır.
// Slot değerleri slot birimindedir; (0, 0) sol üst hücrenin merkezi, rot derece.
(function (root) {
  'use strict';

  const pos = (index, key, label, prompt, x, y, rot = 0) => ({ index, key, label, prompt, slot: { x, y, rot } });

  const SPREADS = [
    {
      id: 'daily', name: 'Günün kartı', cardCount: 1, estMinutes: 1, intents: ['today'],
      inputs: { question: 'none' },
      positions: [pos(1, 'today', 'Bugünün teması', 'Bugün hangi enerjiye odaklanmalıyım, ne tavsiye ediliyor?', 0, 0)],
    },
    {
      id: 'three', name: 'Üç kart', cardCount: 3, estMinutes: 2, intents: ['general'],
      inputs: { question: 'optional' },
      positions: [
        pos(1, 'past', 'Geçmiş', 'Bu durumu buraya getiren ne?', 0, 0),
        pos(2, 'present', 'Şimdi', 'Şu an ne oluyor?', 1, 0),
        pos(3, 'future', 'Gelecek', 'Mevcut gidişat nereye varıyor?', 2, 0),
      ],
    },
    {
      id: 'relationship', name: 'İlişki', cardCount: 5, estMinutes: 4, intents: ['love'],
      inputs: { question: 'optional', personName: 'optional' },
      positions: [
        pos(1, 'self', 'Sen', 'Bu ilişkide senin enerjin ve tutumun ne?', 0, 1),
        pos(2, 'other', 'O', 'Karşı tarafın ilişkiye getirdiği enerji ne?', 2, 1),
        pos(3, 'bond', 'Aradaki bağ', 'İlişkinin şu anki doğası ne?', 1, 1),
        pos(4, 'obstacle', 'Engel', 'Önünüzdeki zorluk ne?', 1, 2),
        pos(5, 'potential', 'Potansiyel', 'İlişki en iyi ihtimalle nereye gidebilir?', 1, 0),
      ],
    },
    {
      id: 'decision', name: 'Karar (İki yol)', cardCount: 5, estMinutes: 4, intents: ['decision'],
      inputs: { question: 'optional', options: 'required' },
      positions: [
        pos(1, 'situation', 'Durum', 'Kararın özü ve şu anki tablo ne?', 1, 0),
        pos(2, 'a_path', 'A yolu', "A'yı seçersen süreç nasıl gelişir?", 0, 1),
        pos(3, 'a_outcome', 'A sonucu', 'A seçeneği nereye varır?', 0, 2),
        pos(4, 'b_path', 'B yolu', "B'yi seçersen süreç nasıl gelişir?", 2, 1),
        pos(5, 'b_outcome', 'B sonucu', 'B seçeneği nereye varır?', 2, 2),
      ],
    },
    {
      id: 'career', name: 'Kariyer / Para', cardCount: 5, estMinutes: 4, intents: ['work'],
      inputs: { question: 'optional' },
      positions: [
        pos(1, 'current', 'Mevcut durum', 'İşte ya da parada şu an ne oluyor?', 0, 0),
        pos(2, 'obstacle', 'Engel', 'Önündeki en büyük engel ne?', 1, 0),
        pos(3, 'strength', 'Güçlü yan', 'Hangi gücüne dayanabilirsin?', 2, 0),
        pos(4, 'advice', 'Tavsiye', 'Ne yapmalısın?', 0.5, 1),
        pos(5, 'outcome', 'Gidişat', 'Bu yolda devam edersen nereye varırsın?', 1.5, 1),
      ],
    },
    {
      id: 'celtic', name: 'Celtic Cross', cardCount: 10, estMinutes: 8, intents: ['general'],
      inputs: { question: 'optional' },
      positions: [
        pos(1, 'present', 'Mevcut durum', 'Sorunun kalbinde ne var?', 1, 1.5),
        pos(2, 'challenge', 'Kesen kart', 'Duruma karışan güç ya da engel ne?', 1, 1.5, 90),
        pos(3, 'crown', 'Taç', 'Bilinçli hedef ya da ulaşılabilecek en iyi sonuç ne?', 1, 0.5),
        pos(4, 'root', 'Temel', 'Durumun altındaki kök sebep ne?', 1, 2.5),
        pos(5, 'past', 'Yakın geçmiş', 'Geride kalan etki ne?', 0, 1.5),
        pos(6, 'future', 'Yakın gelecek', 'Yakında ne geliyor?', 2, 1.5),
        pos(7, 'self', 'Sen', 'Bu durumda tutumun ne?', 3.4, 3),
        pos(8, 'environment', 'Çevre', 'Çevrendeki insanlar ve dış etkiler ne?', 3.4, 2),
        pos(9, 'hopes_fears', 'Umutlar ve korkular', 'Neyi umuyor, neden korkuyorsun?', 3.4, 1),
        pos(10, 'outcome', 'Sonuç', 'Gidişat devam ederse nereye varılır?', 3.4, 0),
      ],
    },
  ];

  // 375 px'ten dar ekranda Celtic Cross sütunu haçın altına yatay sıra olarak taşınır.
  const NARROW_SLOTS = {
    celtic: { self: { x: -0.25, y: 3.6 }, environment: { x: 0.65, y: 3.6 }, hopes_fears: { x: 1.55, y: 3.6 }, outcome: { x: 2.45, y: 3.6 } },
  };

  const INTENTS = [
    { id: 'today', title: 'Bugün', sub: 'Günün enerjisi ve tavsiyesi', spreadId: 'daily' },
    { id: 'love', title: 'Aşk', sub: 'İlişkin ve duyguların', spreadId: 'relationship' },
    { id: 'work', title: 'İş / Para', sub: 'Kariyer, iş ve maddi konular', spreadId: 'career' },
    { id: 'decision', title: 'Karar', sub: 'İki seçenek arasında kaldıysan', spreadId: 'decision' },
    { id: 'general', title: 'Genel', sub: 'Aklındaki herhangi bir soru', spreadId: 'three', detailedSpreadId: 'celtic' },
  ];

  const PLACEHOLDERS = {
    three: 'Bu dönem bana ne getirecek?',
    relationship: 'Bu ilişki nereye gidiyor?',
    career: 'Yeni iş teklifi hakkında neyi bilmeliyim?',
    celtic: 'Hayatımda şu an en çok neye odaklanmalıyım?',
    decision: 'Kararı zorlaştıran ne?',
  };

  const LIMITS = { question: 200, option: 40, personName: 30 };

  const BY_ID = new Map(SPREADS.map((spread) => [spread.id, spread]));
  const getSpread = (id) => BY_ID.get(id) || null;
  const chip = (spread) => `${spread.cardCount} kart · ${spread.estMinutes} dk`;

  const api = { SPREADS, NARROW_SLOTS, INTENTS, PLACEHOLDERS, LIMITS, getSpread, chip };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TAROT_SPREADS = api;
})(typeof window !== 'undefined' ? window : globalThis);
