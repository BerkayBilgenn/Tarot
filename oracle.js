// Yerel yorum. Kart anlamı koddan gelir; model yalnızca kapanışı yazar.
// Sayfa 127.0.0.1:8787 kapısına gider. Anahtar orada, .env içinde kalır.
(function (root) {
  'use strict';

  const ENDPOINT = 'http://127.0.0.1:18791/closing';
  const MODEL = 'deepseek-ai/deepseek-v4.1-flash';

  const SYSTEM = [
    'Sen otuz yıldır kart okuyan bir tarot ustasısın. Türkçe yazarsın. Dilin sıcak, net ve akıcıdır; kısa not değil, masanın sonunda okunan uzun bir yorumdur.',
    'Dört ya da beş paragraf yaz. Toplam 450 ile 650 kelime olsun. Paragrafların arasında bir boş satır bırak.',
    'Kartları madde madde sayma ve pozisyon pozisyon tekrar etme. Anlamları sorunun içine ör: hangi kart hangi kartla konuşuyor, ters kart nerede bir engel, gecikme ya da içe dönüş.',
    'İlk paragraf masanın genel havasını kursun. Sonra düğümü aç. Sonda soruya — soru yoksa kişinin duruşuna — kaderci olmayan somut bir yön göster.',
    'Sana verilen anlamların dışına çıkma. Yeni sembol ve kartta olmayan kehanet uydurma.',
    '"Olacak" deme; "işaret ediyor" ve "eğilim gösteriyor" de.',
    'Kesin tarih verme. Tıbbi teşhis, hukuki ya da finansal talimat verme. Ölüm kartı fiziksel ölüm değildir; bitiş, dönüşüm ya da bir dönemin kapanmasıdır.',
    'Karar açılımında hangi yolu seçmesi gerektiğini söyleme; iki yolun getirisini ve bedelini yan yana koy.',
    'İlişki açılımında karşı tarafın ne düşündüğünü ya da ne yapacağını iddia etme; onun ilişkiye getirdiği enerjiyi anlat.',
    'Günün kartında kişisel soru yoktur; güne dair uzun bir tavsiye ver.',
    'Kartın İngilizce adını bir kez, yanında Türkçe adıyla anman yeter.',
  ].join(' ');

  function sentence(text) {
    return String(text || '').split('.').slice(0, 2).join('.').replace(/\s+/g, ' ').trim();
  }

  function brief(reading, spread, cardsApi) {
    const seats = spread.positions.map((position) => {
      const drawn = reading.cards.find((card) => card.positionKey === position.key);
      const card = cardsApi.getCard(drawn.cardId);
      const meaning = sentence(drawn.reversed ? card.reversed : card.upright);
      return `${position.index}. ${position.label}: ${card.name} / ${card.nameTr}${drawn.reversed ? ' (ters: engel, gecikme ya da içe dönüş)' : ''}. Anlam: ${meaning}.`;
    });
    const lines = [`Açılım: ${spread.name}`];
    if (reading.question && reading.question.trim()) lines.push(`Soru: ${reading.question.trim()}`);
    else lines.push('Soru yok. Kişi genel bir bakış istedi.');
    if (spread.id === 'decision') {
      lines.push(`A yolu: ${reading.optionA || 'A'}`);
      lines.push(`B yolu: ${reading.optionB || 'B'}`);
      lines.push('Hangisini seçmesi gerektiğini söyleme.');
    }
    if (reading.personName && reading.personName.trim()) {
      lines.push(`İlişkide adı geçen kişi: ${reading.personName.trim()}. Onun aklından geçenleri yazma.`);
    }
    if (spread.id === 'daily') lines.push('Bu günün kartı. Kişisel soru yok.');
    lines.push('', 'Kartlar:', ...seats);
    return lines.join('\n');
  }

  const VOICE = 'okuma-4';

  function soften(bit) {
    const text = String(bit || '').replace(/\s+/g, ' ').replace(/^[“"'\s]+|[”"'\s.]+$/g, '').trim();
    if (!text) return '';
    return text.charAt(0).toLocaleLowerCase('tr') + text.slice(1);
  }

  function clauses(meaning) {
    return String(meaning || '')
      .split(/[,.;]/)
      .map(soften)
      .filter((bit) => bit.length > 2)
      .slice(0, 4);
  }

  function cap(text) {
    if (!text) return '';
    return text.charAt(0).toLocaleUpperCase('tr') + text.slice(1);
  }

  function listTr(bits) {
    if (!bits.length) return 'bu kartın teması';
    if (bits.length === 1) return bits[0];
    if (bits.length === 2) return `${bits[0]} ya da ${bits[1]}`;
    return `${bits.slice(0, -1).join(', ')} ya da ${bits[bits.length - 1]}`;
  }

  function deathNote(card) {
    if (card.id !== 'major-13' && card.slug !== 'death') return '';
    return ' Ölüm burada bedensel bir son değildir; bir dönemin kapanması ya da bir dönüşüm olabilir.';
  }

  function dailyEssay(item) {
    const bits = clauses(item.meaning);
    const list = listTr(bits);
    const name = `${item.card.nameTr} (${item.card.name})`;
    const turn = item.pick.reversed
      ? `Ters geldiği için bugün bu tam açılmayabilir. ${cap(list)} bir gecikme, bir engel ya da içine attığın bir hal olarak gelebilir. Zorlamak yerine, bugün nerede tutulduğunu fark etmen yeterli.`
      : `Düz geldiği için bugün bu hal sana yakın durabilir. ${cap(list)} bir ruh hali, bir karşılaşma ya da günün içindeki küçük bir an olarak çıkabilir.`;
    return [
      `Bugün sana ${name} geldi. Gün, ${list} etrafında dönebilir. Bunlardan biri öne çıkabilir; hepsi birden olmak zorunda değil.${deathNote(item.card)}`,
      turn,
      `Günün içinde ${list} nerede belirirse, kart orada konuşuyor demektir. Bunu tek bir saate bağlama. Akşama kadar her şeyi çözmek zorunda değilsin. Bugün bu hale küçük bir yer açman yeter.`,
    ].join('\n\n');
  }

  const reader = () => root.TAROT_READING || require('./reading.js');
  const notes = () => root.TAROT_NOTES || require('./card-notes.js');

  // Kapanış kartları tek tek saymaz; açılımın hikâyesini anlatır: nereden gelindi, düğüm nerede,
  // hangi güce dayanılır, yol nereye eğiliyor. Sonda iki kartın sorusu kişiye bırakılır.
  function seatsOf(reading, spread, cardsApi) {
    const map = {};
    spread.positions.forEach((position) => {
      const pick = reading.cards.find((card) => card.positionKey === position.key);
      const card = cardsApi.getCard(pick.cardId);
      map[position.key] = {
        position, pick, card,
        name: `${card.nameTr}${pick.reversed ? ' (ters)' : ''}`,
        themes: reader().themesOf(card, pick.reversed),
        rev: pick.reversed,
        ask: (() => { const n = notes().noteOf(card.id); return n ? (pick.reversed ? n.askReversed : n.ask) : ''; })(),
      };
    });
    return map;
  }

  const turn = (seat, text) => (seat.rev ? ` ${text}` : '');

  const STORIES = {
    three: (s) => [
      `Hikâye geçmişte ${s.past.name} kartıyla başlıyor. Geride kalan dönemde ${s.past.themes} belirleyiciydi ve bugüne uzanan bir iz bıraktı.${turn(s.past, 'Kart ters geldiği için o dönem tam yaşanmamış, içinde bir düğüm bırakmış olabilir.')}`,
      `Şimdi masanın ortasında ${s.present.name} duruyor. Bugün işin özünde ${s.present.themes} var.${turn(s.present, 'Ters geldiği için bu enerji şu an tıkalı ya da içe dönük akıyor.')} Geçmişten gelen iz ile bugünkü hal arasındaki bağ, yaşadığın şeyin neden şimdi önüne çıktığını anlatıyor.`,
      `Gidişatın yerinde ${s.future.name} var. Yol böyle sürerse ${s.future.themes} öne çıkabilir.${turn(s.future, 'Ters geldiği için bu tema gecikmeli ya da zorlanarak gelebilir.')} Bu bir kehanet değil; bugünkü adımların değişirse gidişat da değişir. Değişimin kapısı ortadaki kartta, yani bugünkü seçimlerinde duruyor.`,
    ],
    relationship: (s, r) => [
      `Önce ikinizin masadaki yerine bak. Sen bu ilişkiye ${s.self.name} ile geliyorsun: ${s.self.themes}. ${r.personName ? r.personName : 'Karşı taraf'} tarafında ${s.other.name} duruyor; ilişkiye ${s.other.themes} taşıyor. Kart onun aklından geçenleri söylemez, yalnızca getirdiği enerjiyi gösterir.`,
      `Aranızdaki bağ ${s.bond.name} kartıyla okunuyor. Bu bağın şu anki dokusu ${s.bond.themes}.${turn(s.bond, 'Kart ters geldiği için bu duygu şu an açıkça yaşanmıyor, içte tutuluyor olabilir.')} Önünüzdeki eşik ise ${s.obstacle.name}: ${s.obstacle.themes}. Bu eşik ilişkiyi bitiren bir duvar değil; ikinizin de bakması gereken yer.`,
      `Potansiyelin yerinde ${s.potential.name} var. İlişki en iyi ihtimalle ${s.potential.themes} yönünde açılabilir.${turn(s.potential, 'Ters geldiği için bu olasılık kendiliğinden gelmiyor; emek ve sabır istiyor.')} Bu, kendiliğinden yazılmış bir son değil; bağa nasıl emek verdiğinizle şekillenen bir ihtimal.`,
    ],
    career: (s) => [
      `İşte ya da parada şu an ${s.current.name} ile duruyorsun: ${s.current.themes}.${turn(s.current, 'Kart ters geldiği için bu durum sende bir sıkışma hissi bırakıyor olabilir.')} Önündeki en büyük engel ${s.obstacle.name} kartında görünüyor: ${s.obstacle.themes}.`,
      `Ama masada dayanabileceğin bir güç de var. ${s.strength.name} sana ${s.strength.themes} veriyor.${turn(s.strength, 'Ters geldiği için bu güç şu an uykuda; onu yeniden hatırlaman gerekebilir.')} Tavsiyenin yerindeki ${s.advice.name} ise atılacak adımı ${s.advice.themes} tarafında gösteriyor.`,
      `Bu yolda devam edersen ${s.outcome.name} kartının anlattığı hal öne çıkabilir: ${s.outcome.themes}.${turn(s.outcome, 'Ters geldiği için bu sonuç gecikmeli ya da beklediğinden farklı bir biçimde gelebilir.')} Bu kesin bir son değil; engeli tanıyıp güçlü yanına yaslandıkça yön de değişebilir.`,
    ],
    decision: (s, r) => [
      `Kararın özünde ${s.situation.name} duruyor: ${s.situation.themes}. Seçimi zorlaştıran ya da anlamlı kılan şey bu.`,
      `${r.optionA || 'Birinci yol'} tarafında süreç ${s.a_path.name} ile yürüyor: ${s.a_path.themes}. Bu yol ${s.a_outcome.name} kartına, yani ${s.a_outcome.themes} yönüne varma eğiliminde.${turn(s.a_outcome, 'Varış kartı ters geldiği için bu yolun bedeli sonda hissedilebilir.')}`,
      `${r.optionB || 'İkinci yol'} tarafında süreç ${s.b_path.name} ile yürüyor: ${s.b_path.themes}. Bu yol ${s.b_outcome.name} kartına, yani ${s.b_outcome.themes} yönüne varma eğiliminde.${turn(s.b_outcome, 'Varış kartı ters geldiği için bu yolun bedeli sonda hissedilebilir.')}`,
      `Kartlar hangisini seçmen gerektiğini söylemez. İki yolun getirisini ve bedelini yan yana koyar; sana benzeyen tarafı sen ayırırsın. Karar verirken şuna bak: hangi yolun bedelini taşımaya hazırsın, hangisinin getirisi sana gerçekten benziyor? Bazen doğru seçim daha kolay olan değil, sana daha çok benzeyen yoldur.`,
    ],
    celtic: (s) => [
      `Haçın kalbinde ${s.present.name} var: sorunun özünde ${s.present.themes} yatıyor. Onu kesen ${s.challenge.name} ise duruma karışan gücü gösteriyor: ${s.challenge.themes}.${turn(s.challenge, 'Kesen kart ters geldiği için bu güç açıkça değil, alttan alta çalışıyor.')} Bu iki kart birlikte, seni neyin meşgul ettiğini ve neyin önüne çıktığını yan yana koyuyor.`,
      `Kökte ${s.root.name} duruyor; görünenin altında ${s.root.themes} çalışıyor. Yakın geçmişten ${s.past.name} geliyor: ${s.past.themes}. Bu etki çekiliyor ama bugünkü tabloyu o hazırladı. Tacın yerindeki ${s.crown.name} ise bilinçli olarak uzandığın yeri gösteriyor: ${s.crown.themes}. Yakında kapıya ${s.future.name} geliyor; ${s.future.themes} belirmeye başlayabilir.`,
      `Sağdaki sütun senden başlıyor. Bu duruma ${s.self.name} ile yaklaşıyorsun: ${s.self.themes}. Çevrenden gelen etki ${s.environment.name}: ${s.environment.themes}. İç sesin ise ${s.hopes_fears.name} ile konuşuyor; umutların ve korkuların ${s.hopes_fears.themes} etrafında düğümleniyor.`,
      `Gidişatın vardığı yerde ${s.outcome.name} var: yol böyle sürerse ${s.outcome.themes} öne çıkabilir.${turn(s.outcome, 'Sonuç kartı ters geldiği için bu varış gecikmeli ya da zorlanarak gelebilir.')} Bu bir hüküm değil. Kalpteki düğümü ve kökteki sebebi gördükçe, sütunun sonundaki kart da değişebilir.`,
    ],
  };

  const AREA = { 'Ateş': 'tutku, irade ve harekete geçme', 'Su': 'duygular ve ilişkiler', 'Hava': 'düşünceler, iletişim ve kararlar', 'Toprak': 'para, iş, beden ve somut sonuçlar' };

  // Masanın genel havası: Büyük Arkana ağırlığı, ters kartlar ve baskın element.
  function tone(reading, cardsApi) {
    const sig = reader().signals(reading.cards, cardsApi);
    const lines = [];
    if (sig.majorRatio >= 0.5) lines.push('Büyük Arkana kartları ağırlıkta; konu gündelik bir ayrıntıdan çok hayatındaki büyük bir döneme bağlanıyor.');
    else if (sig.majorRatio === 0) lines.push('Masada hiç Büyük Arkana yok; konu gündelik ve büyük ölçüde senin elinde.');
    else lines.push('Büyük ve Küçük Arkana birlikte konuşuyor; geniş bir dönemin içinde gündelik adımların da payı var.');
    if (sig.reversedRatio >= 0.5) lines.push('Kartların çoğu ters geldi; enerji şu an içe dönük, bazı şeyler gecikiyor ya da henüz söze dökülmüyor.');
    else if (sig.reversedRatio === 0) lines.push('Hiç ters kart yok; enerji açık ve görünür akıyor.');
    else lines.push('Birkaç kart ters geldi; o yerlerde enerji içe dönük ya da gecikmeli.');
    if (sig.dominant) lines.push(`Baskın element ${sig.dominant}: asıl konu ${AREA[sig.dominant]} alanında dönüyor.`);
    return lines.join(' ');
  }

  const HEART = { three: 'present', relationship: 'bond', career: 'advice', decision: 'situation', celtic: 'present' };
  const LAST = { three: 'future', relationship: 'potential', career: 'outcome', decision: 'situation', celtic: 'outcome' };

  function longClosing(reading, spread, cardsApi) {
    if (spread.id === 'daily') {
      const pick = reading.cards[0];
      const card = cardsApi.getCard(pick.cardId);
      return dailyEssay({ position: spread.positions[0], pick, card, meaning: String(pick.reversed ? card.reversed : card.upright) });
    }
    const seats = seatsOf(reading, spread, cardsApi);
    const question = String(reading.question || '').replace(/\s+/g, ' ').trim();
    const opening = question
      ? `“${question}” diye sordun. Kartlar buna kesin bir hükümle değil, bu dönemin hikâyesini anlatarak cevap veriyor.`
      : 'Bu açılım, bu dönemde hayatında nelerin öne çıkabileceğini bir hikâye gibi anlatıyor.';
    const story = (STORIES[spread.id] || STORIES.three)(seats, reading);
    const asks = [...new Set([seats[HEART[spread.id]], seats[LAST[spread.id]]].filter(Boolean).map((seat) => seat.ask).filter(Boolean))];
    const ending = asks.length
      ? `Okumayı kapatırken kendine şunu sorabilirsin: ${asks.join(' Bir de: ')} Cevabı hemen bulmak zorunda değilsin; bu soruları birkaç gün yanında taşıman yeter.`
      : 'Okumayı kapatırken aklında kalan tek bir cümleyi not et. Kartlar bir son yazmaz; neye bakman gerektiğini gösterir.';
    return [opening, tone(reading, cardsApi), ...story, ending].join('\n\n');
  }

  async function closing(reading, spread, cardsApi, options) {
    const opts = options || {};
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: opts.signal,
      body: JSON.stringify({ system: SYSTEM, user: brief(reading, spread, cardsApi) }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = new Error(data.error || 'http');
      error.code = data.error || 'http';
      throw error;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    while (true) {
      const step = await reader.read();
      if (step.done) break;
      buffer += decoder.decode(step.value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        let packet;
        try { packet = JSON.parse(line); } catch (error) { continue; }
        if (packet.error) {
          const error = new Error(packet.error);
          error.code = packet.error;
          throw error;
        }
        if (!packet.delta) continue;
        text += packet.delta;
        if (opts.onToken) opts.onToken(text);
      }
    }
    return text.trim();
  }

  const api = { ENDPOINT, MODEL, SYSTEM, VOICE, brief, longClosing, closing };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TAROT_ORACLE = api;
})(typeof window !== 'undefined' ? window : globalThis);
