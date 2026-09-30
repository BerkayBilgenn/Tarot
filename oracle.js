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

  const VOICE = 'okuma-3';

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

  function seatReading(item, when) {
    const list = listTr(clauses(item.meaning));
    const turn = item.pick.reversed
      ? `Ters geldiği için bu, dışarıda büyük bir olaydan çok bir gecikme, bir engel ya da içine çekilen bir hal olabilir.`
      : `Düz geldiği için bu hal gizlenmeden, bu dönemin içinde görünebilir.`;
    return `${item.position.label} tarafında ${item.card.nameTr} (${item.card.name}) duruyor. ${when} burada ${list} olabilir. ${turn}${deathNote(item.card)}`;
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

  function longClosing(reading, spread, cardsApi) {
    const seats = spread.positions.map((position) => {
      const pick = reading.cards.find((card) => card.positionKey === position.key);
      const card = cardsApi.getCard(pick.cardId);
      const meaning = String(pick.reversed ? card.reversed : card.upright);
      return { position, pick, card, meaning };
    });
    if (spread.id === 'daily') return dailyEssay(seats[0]);
    const question = String(reading.question || '').replace(/\s+/g, ' ').trim();
    const opening = question
      ? `“${question}” diye sordun. Kartlar bunu kesin bir hükümle değil, bu dönemde yaşayabileceğin hallerle cevaplıyor.`
      : `Bu açılım, bu dönemde nelerin öne çıkabileceğini anlatıyor.`;
    const paragraphs = seats.map((item) => seatReading(item, 'Bu dönemde'));
    let ending;
    if (spread.id === 'decision') {
      ending = `${reading.optionA || 'Birinci yol'} ile ${reading.optionB || 'ikinci yol'} aynı masada duruyor. Kartlar hangisini seçmen gerektiğini söylemez. Bir yol daha hafif, diğeri daha bedelli gelebilir. Sana benzeyen tarafı sen ayırırsın.`;
    } else if (spread.id === 'relationship') {
      const who = reading.personName ? `${reading.personName} bu ilişkiye bir enerji getiriyor. ` : '';
      ending = `${who}Bu okuma karşı tarafın aklından geçenleri söylemez. Onun getirdiği hal ile senin durduğun yeri yan yana koyar. Bugün bunu bir kavga ya da bir yakınlaşma olarak görebilirsin; ikisi de mümkün.`;
    } else {
      ending = `Kartlar “böyle olur” demiyor. Bu dönemde bu haller öne çıkabilir. Hangisi günün içinde belirirse, okuma tam orada duruyordur.`;
    }
    return [opening, ...paragraphs, ending].join('\n\n');
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
