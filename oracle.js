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
    'Hazır giriş ve kapanış kalıplarını tekrarlama. Bu açılımdaki kartların özgül ilişkisini ve kullanıcının sorusunu merkeze al.',
  ].join(' ');

  function sentence(text) {
    return String(text || '').split('.').slice(0, 2).join('.').replace(/\s+/g, ' ').trim();
  }

  function brief(reading, spread, cardsApi, attempt) {
    const seats = spread.positions.map((position) => {
      const drawn = reading.cards.find((card) => card.positionKey === position.key);
      const card = cardsApi.getCard(drawn.cardId);
      const meaning = sentence(drawn.reversed ? card.reversed : card.upright);
      return `${position.index}. ${position.label}: ${card.name} / ${card.nameTr}${drawn.reversed ? (reader().toneOf(card, true) === 'soft' ? ' (ters: zorlayıcı yön gevşeyebilir)' : ' (ters: engel, gecikme ya da içe dönüş)') : ''}. Anlam: ${meaning}.`;
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
    const hash = [...String(reading.id || '')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const focus = spread.positions[(hash + (attempt || 0)) % spread.positions.length];
    const focusPick = reading.cards.find((card) => card.positionKey === focus.key);
    const focusCard = cardsApi.getCard(focusPick.cardId);
    const clauses = String(focusPick.reversed ? focusCard.reversed : focusCard.upright).split(/[,.;]/).map((part) => part.trim()).filter(Boolean);
    const focusTheme = clauses[(hash + (attempt || 0)) % clauses.length] || focusCard.keywords[0];
    lines.push(spread.id === 'daily'
      ? `Bu yoruma özgü odak: ${focusCard.nameTr} kartındaki ${focusTheme} temasının gün içindeki somut karşılığı.`
      : `Bu yoruma özgü odak: ${focus.label} yerindeki ${focusCard.nameTr}; özellikle ${focusTheme} temasını diğer kartlarla ilişkilendir.`);
    if (attempt) lines.push('Önceki taslak yakın geçmişteki bir yoruma fazla benzedi. Girişi, paragraf akışını ve kapanış sorusunu bu odağa göre yeniden kur.');
    lines.push('', 'Kartlar:', ...seats);
    return lines.join('\n');
  }

  const VOICE = 'okuma-5';

  function soften(bit) {
    const text = String(bit || '').replace(/\s+/g, ' ').replace(/^[“"'\s]+|[”"'\s.]+$/g, '').replace(/^(?:ya da|veya)\s+/i, '').trim();
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

  function reversedNote(card) {
    return reader().toneOf(card, true) === 'soft'
      ? 'Kart ters geldiği için zorlayıcı yanın gevşemesi ya da bir rahatlama mümkün olabilir.'
      : 'Kart ters geldiği için bu tema gecikmiş ya da içe dönük yaşanabilir.';
  }

  const DAILY_REPEAT_LENSES = [
    ({ name, focus, count, ask }) => [
      `${name} yeniden geldi; tamamladığın günlük okumalarda bu kartla toplam ${count} kez karşılaştın. Bugün ${focus} temasının sende nerede karşılık bulduğuna bak.`,
      `Önceki okumayı hatırladığında ilk aklına gelen olay ne? Aynı kartın yeniden gelmesi, aynı anı yaşadığın anlamına gelmez. Bu temanın şimdi hangi koşulda belirdiğini ayırmaya çalış.`,
      `${ask} Gün bitmeden bu soruya karşılık gelen tek bir somut anı not et.`,
    ],
    ({ name, focus, count, ask }) => [
      `${name} ile tamamladığın günlük okumalarda ${count} kez karşılaştın. Kartın ${focus} yönü bugün dikkatini çekebilir; bunu kesin bir sonuç gibi okumaya gerek yok.`,
      `Bu temayla ilgili bir süredir düşündüğün şey varsa, düşüncen ile yaptığın şey arasındaki mesafeye bak. Küçük bir hareket bile hangi kısmın gerçekten sana ait olduğunu gösterebilir.`,
      `${ask} Yanıt hemen gelmezse, bugün yalnızca sorunun hangi anlarda ortaya çıktığını izle.`,
    ],
    ({ name, focus, count, ask }) => [
      `${name} yine masada. Tamamladığın günlük okumalarda ${count} kez gelen bu kartta bugün ${focus} sözcüğü üzerinde dur.`,
      `Bu sözcük sana bir imkân mı, yoksa dikkat isteyen bir alan mı gibi geliyor? Kart yalnızca bir yön gösterir; yaşadığın ayrıntıyı sen bilirsin.`,
      `${ask} Önceki notun varsa bugünkü yanıtınla karşılaştır; değişen kısmı bir cümleyle yaz.`,
    ],
    ({ name, focus, count, ask }) => [
      `${name} bugün de karşına çıktı; tamamladığın günlük okumalarda toplam ${count} kez gördün. Bu kez kartın ${focus} tarafını günlük hayatındaki küçük seçimlerle ilişkilendir.`,
      `Büyük bir işaret aramadan, bu temanın davranışlarına nerede değdiğini fark et. Bir şeyi sürdürmek, ertelemek ya da açıkça söylemek de bir seçimdir.`,
      `${ask} Bugün atabileceğin en küçük ve geri alınabilir adım ne, onu düşün.`,
    ],
    ({ name, focus, count, ask }) => [
      `Tamamladığın günlük okumalarda bu kartın ${count}. gelişi, ${name} için yeni bir kehanet kurmayı gerektirmiyor. ${focus} temasına bugün bulunduğun yerden bak.`,
      `İlk gördüğün anla şimdi arasında ne değişti? Dış koşullar aynı kalsa bile senin isteğin, sınırın ya da sabrın farklılaşmış olabilir. Bunlardan hangisi doğru geliyor, kendine sor.`,
      `${ask} Cevabını önceki okumadan kopyalamadan, bugünün sözcükleriyle yaz.`,
    ],
    ({ name, focus, count, ask }) => [
      `${name} yeniden geldi. Tamamladığın günlük okumalardaki ${count} karşılaşma içinde bu kez ${focus} öne çıkıyor.`,
      `Kartın anlattığı şeyi yalnızca sonuçta arama; süreçteki küçük belirtilere de bak. Bu tema hangi konuşmada, hangi kararda veya hangi bekleyişte hissediliyor?`,
      `${ask} Aklına gelen örneklerin içinden en somut olanını seç; yorumun sana gerçekten değip değmediğini oradan tart.`,
    ],
    ({ name, focus, count, ask }) => [
      `Tamamladığın günlük okumalarda ${count} kez gördüğün ${name} bugün ${focus} yönünden okunabilir. Tekrarlanan kart, aynı cevabı zorunlu kılmaz.`,
      `Önceki yorumda neyi beklediğini, bugün neyi bildiğini düşün. Aradaki fark bir olay, bir duygu ya da yalnızca daha net bir soru olabilir.`,
      `${ask} Bugün elinde olan bilgiyi ve hâlâ bilmediğin şeyi ayrı ayrı not et.`,
    ],
    ({ name, focus, count, ask }) => [
      `${name} ile yeniden karşılaştın; tamamladığın günlük okumalarda bu ${count}. karşılaşman. ${focus} teması bu defa hangi ilişkiye veya işe dokunuyor?`,
      `Kartın anlamını hayatının her alanına yaymak zorunda değilsin. Tek bir bağlam seçtiğinde yorum daha açık hale gelebilir. O bağlamda neyi korumak, neyi değiştirmek istiyorsun?`,
      `${ask} Seçtiğin bağlamı ve neden önemli olduğunu bir cümleyle belirt.`,
    ],
    ({ name, focus, count, ask }) => [
      `${name} tamamladığın günlük okumalarda toplam ${count} kez geldi. Bugünün odağı ${focus}; bunu daha önce gözünden kaçan bir ayrıntı olarak ele alabilirsin.`,
      `Bu temayı doğrulayan bir örnek kadar ona uymayan bir örnek de ara. İkisine birlikte bakmak, kartın sözünü kendi hayatına daha dürüstçe uyarlamana yardım eder.`,
      `${ask} Bugün gördüğün iki farklı işareti not et ve hangisinin daha güçlü olduğunu düşün.`,
    ],
    ({ name, focus, count, ask }) => [
      `${name} bir kez daha masada: tamamladığın günlük okumalarda toplam ${count} karşılaşma. ${focus} hakkında hemen yeni bir hüküm vermeden önce önceki notlarına dön.`,
      `Bu kartı ilk gördüğünde aklından geçen düşünceyle şimdiki düşüncen aynı mı? Bakışın değiştiyse, aynı sembolün sende uyandırdığı şey de değişebilir.`,
      `${ask} Bu sefer okumadan yanında taşımak istediğin tek soruyu seç.`,
    ],
  ];

  function dailyEssay(item, repeats) {
    const bits = clauses(item.meaning);
    const list = listTr(bits);
    const name = `${item.card.nameTr} (${item.card.name})`;
    if (repeats) {
      const focus = bits[repeats % (bits.length || 1)] || item.card.keywords[0];
      const ask = notes().noteOf(item.card.id);
      const question = ask && (item.pick.reversed ? ask.askReversed : ask.ask);
      const paragraphs = DAILY_REPEAT_LENSES[(repeats - 1) % DAILY_REPEAT_LENSES.length]({ name, focus, count: repeats + 1, ask: question || 'Bu tema bugün hayatında nerede görünür hale geliyor?' });
      paragraphs[0] += deathNote(item.card);
      paragraphs[1] += item.pick.reversed
        ? ` ${reversedNote(item.card)}`
        : ' Kart düz geldiği için bu tema görünür bir adımda belirebilir.';
      return paragraphs.join('\n\n');
    }
    const turn = item.pick.reversed
      ? `${reversedNote(item.card)} ${cap(list)} ile ilgili hangi olasılığın kendi durumuna daha çok uyduğunu gözlemle.`
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
      `Geçmişte ${s.past.name} var: ${s.past.themes}.${turn(s.past, 'Ters gelişi, bu temanın o dönemde tam açılamadığını düşündürebilir.')} ${s.past.ask || 'O dönemin sende bıraktığı iz ne?'}`,
      `Şimdi ${s.present.name} öne çıkıyor: ${s.present.themes}.${turn(s.present, 'Ters geliş bu alanın bugün içe döndüğünü gösterebilir.')} Geçmişteki ${s.past.name} ile bugünkü ${s.present.name} arasında kendi yaşadığın bağı arayabilirsin.`,
      `Gidişatta ${s.future.name} görünüyor: ${s.future.themes}.${turn(s.future, 'Ters geldiği için bu tema gecikmeli yaşanabilir.')} ${s.future.ask || 'Bu yönde hangi adım sana ait?'} Bu kesin bir son değil; bugünkü seçimlerin yönü değiştirebilir.`,
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
      `Kartlar hangisini seçmen gerektiğini söylemez. ${r.optionA || 'Birinci yol'} için ${s.a_path.themes}, ${r.optionB || 'İkinci yol'} için ${s.b_path.themes} öne çıkıyor. Birinin getirisi diğerinin bedelini otomatik silmez; hangi bedeli taşımaya hazır olduğunu ve hangi getirinin senin değerlerine uyduğunu düşün.`,
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

  function repeatedSpreadClosing(reading, spread, seats, count) {
    const focusPosition = spread.positions[(count - 1) % spread.positions.length];
    const nextPosition = spread.positions[count % spread.positions.length];
    const focus = seats[focusPosition.key];
    const next = seats[nextPosition.key];
    const question = reading.question ? `Sorduğun “${reading.question}” sorusu` : 'Bu okumanın konusu';
    const ask = focus.ask || 'Bu tema bugün hayatında nerede karşılık buluyor?';
    const frames = [
      [
        `Bu kart dizilimi yeniden karşına çıktı; tamamladığın bu açılımda toplam ${count + 1} kez gördün. Kartlar yerlerini değiştirmediği için temel anlamları da aynı; bugün ${focusPosition.label} yerindeki ${focus.name} üzerinde duralım.`,
        `${focus.name} burada ${focus.themes} temasını taşıyor. ${nextPosition.label} yerindeki ${next.name} ise ${next.themes} yönünü açıyor. Bu iki yeri yan yana koyduğunda hangisi bugünkü durumunu daha iyi anlatıyor?`,
        `${question} önceki okumayla aynıysa, o günden bu yana neyin değiştiğini düşün. Konu değiştiyse aynı kartların yeni bağlamda hangi ayrıntıya dokunduğunu ayır.`,
        `${ask} Önceki yanıtını bugünkü yanıtınla karşılaştır; kartlar kesin bir son söylemez.`,
      ],
      [
        `Bu açılım yeniden aynı sırayla geldi; tamamladığın bu açılımda onu şimdiye kadar ${count + 1} kez gördün. Bu kez başlangıç noktası ${focusPosition.label} olsun.`,
        `Oradaki ${focus.name}, ${focus.themes} ile konuşuyor. ${next.name} kartının ${next.themes} yönü bu temaya başka bir açı ekliyor. İki kartın işaret ettiği konuları ayrı ayrı düşünmek daha açık bir resim verebilir.`,
        `Önceki okumanda aklında kalan cümleyi hatırla. ${question} için bugün elinde daha fazla bilgi var mı? Kartların tekrarını bu yeni bilgiyle birlikte tart.`,
        `${ask} Cevabı bugünün koşullarıyla kur; geçen seferki yorumunu yeniden söylemek zorunda değilsin.`,
      ],
      [
        `Tamamladığın bu açılımda ${count + 1}. kez aynı dizilimle karşılaşıyorsun. Bugün ${focus.name} kartını ${focusPosition.label} yerinde okurken kendi ilk tepkini fark et.`,
        `Bu kart ${focus.themes} alanını açıyor. Yanındaki ${next.name} ise ${next.themes} getiriyor. Aralarındaki fark, tek bir açıklamaya tutunmadan iki olasılığı da görmene yardım edebilir.`,
        `${question} hâlâ açıksa, hangi kısmın senin elinde olduğuna bak. Daha önce fark etmediğin küçük bir seçim veya sınır şimdi görünür olabilir.`,
        `${ask} Hemen karar vermek yerine, bu soruyu destekleyen somut bir örnek ara.`,
      ],
      [
        `Kartlar aynı; tamamladığın bu açılımda bu dizilimle toplam ${count + 1} kez karşılaştın. Bu defa açılımı ${focusPosition.label} yerinden okumak yeni bir ayrıntı gösterebilir.`,
        `${focus.name} için ${focus.themes} öne çıkıyor. ${nextPosition.label} yerindeki ${next.name} ise ${next.themes} anlatıyor. Hangisinin etkisi bugün daha belirgin, bunu yaşadığın olaylar belirler.`,
        `Bu tekrarın sana ne hissettirdiğini de yorumun bir parçası olarak düşün. ${question} hakkında bildiklerinle yalnızca umduklarını birbirinden ayır.`,
        `${ask} Önceki okumana dönüp bugüne uyan ve uymayan kısımları işaretle.`,
      ],
    ];
    return frames[(count - 1) % frames.length].join('\n\n');
  }

  function cardBridge(reading, spread, seats) {
    const hash = [...String(reading.id || '')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const index = hash % spread.positions.length;
    const firstPosition = spread.positions[index];
    const nextPosition = spread.positions[(index + 1) % spread.positions.length];
    const first = seats[firstPosition.key];
    const next = seats[nextPosition.key];
    const firstMeaning = sentence(first.pick.reversed ? first.card.reversed : first.card.upright);
    const nextMeaning = sentence(next.pick.reversed ? next.card.reversed : next.card.upright);
    return `${firstPosition.label} yerindeki ${first.name} için kartın söylediği şey şu: ${firstMeaning} `
      + `${nextPosition.label} yerindeki ${next.name} ise başka bir ayrıntı getiriyor: ${nextMeaning} `
      + `Bu iki kartı birlikte okurken önce ${first.themes} ile ${next.themes} arasında kendi hayatında bir bağ olup olmadığına bak. `
      + `${first.card.keywords.slice(0, 2).join(' ve ')} için yaşadığın bir anı, ${next.card.keywords.slice(0, 2).join(' ve ')} için başka bir anı düşün. Hangisi bugünkü soruna daha yakınsa oradan başla. `
      + `${first.ask || 'Bu tema sende nerede karşılık buluyor?'} Ardından diğer kartın sorusunu da düşün: ${next.ask || 'Bu konuda hangi adımı atabilirsin?'}`;
  }

  const DAILY_FALLBACK_FRAMES = [
    'Bir anı seçip bu temanın orada neyi değiştirdiğini düşün. Olayın kendisiyle ona verdiğin anlamı ayrı ayrı yaz.',
    'Bu konuya ilişkin bugün yaptığın küçük bir şeyi hatırla. Niyetinle davranışın aynı yöne mi bakıyor, bunu tart.',
    'Kartın sözünü bir duyguya bağla. O duygu hangi durumda beliriyor ve hangi durumda hafifliyor, fark etmeye çalış.',
    'Hemen bir sonuç arama. Önce bu temayla ilgili bildiğin bir şeyi ve henüz bilmediğin bir şeyi ayır.',
    'Aklındaki olasılığın tersini de düşün. İki bakış arasındaki fark, bugün nerede daha dikkatli olacağını gösterebilir.',
    'Bugünkü koşullar içinde değiştirebileceğin tek ayrıntıyı bul. Büyük bir karar yerine o küçük hareketi gözlemle.',
    'Bu söz sana birini mi, bir işi mi, yoksa kendinle ilişkini mi hatırlatıyor? Yalnızca bir bağlam seç.',
    'Kartın sana yakın gelen tarafı kadar uzak gelen tarafını da not et. Hangisi gerçek bir olaya dayanıyor?',
    'Günün sonunda ilk tepkinle sonraki düşünceni karşılaştır. Aradaki değişim, bu kartı nasıl okuduğunu gösterebilir.',
    'Bir süredir ertelediğin konuşma ya da hareket var mı? Varsa bu temayla bağlantısını acele etmeden yokla.',
  ];

  const DAILY_FRESH_OPENINGS = [
    ({ name, focus }) => `${name} kartında bugün ${focus} temasını izle. Bu ifade gününün tamamını anlatmak zorunda değil.`,
    ({ name, focus }) => `Bugünkü ${name} için ${focus} bir başlangıç noktası. Bunun karşılığını tek bir olayda aramak yorumu daha açık kılabilir.`,
    ({ name, focus }) => `${name} sana ${focus} yönünden sesleniyor. İlk aklına gelen anı düşün ve bu anının hangi kısmının gerçekten kartla örtüştüğünü tart.`,
    ({ name, focus }) => `${focus} bu kez ${name} kartının içinden öne çıkıyor. Onu kesin bir sonuca çevirmeden önce gündelik bir davranışta nasıl göründüğüne bak.`,
    ({ name, focus }) => `${name} ile başlayan gününde ${focus} sözüne yer açabilirsin. Bu temayı bir kehanet yerine kendi koşullarını anlamak için kullan.`,
    ({ name, focus }) => `Masadaki ${name} sana ${focus} hakkında düşünme alanı veriyor. Yaşadığın bir sahneyi seçip kartın hangi ayrıntıya ışık tuttuğunu yokla.`,
    ({ name, focus }) => `${name} bugün ${focus} tarafıyla dikkatini çekebilir. Bu ifadeyi duyduğunda kendi deneyiminden hangi karşılık geliyor, onu bir cümlede anlat.`,
    ({ name, focus }) => `Bu günün ${name} kartında ${focus} öne çıkıyor. Önceki beklentilerinden bağımsız, yalnızca bugünkü koşullarda ne gördüğünü anlamaya çalış.`,
    ({ name, focus }) => `${name} için ${focus} sözüne hemen anlam yükleme. Gün ilerlerken bu konuyla gerçekten ilgili olan ve olmayan olayları ayır.`,
    ({ name, focus }) => `Bugün ${name} sana ${focus} üzerine durabileceğin bir yer gösteriyor. Sonucu önceden bilmek yerine kendi tepkini izle.`,
  ];
  const DAILY_FRESH_ENDINGS = [
    ({ ask }) => `${ask} Yanıtını kendi yaşadığın belirli bir örnekle sınayabilirsin.`,
    ({ ask }) => `${ask} Bugün cevabın yoksa sorunun hangi anda belirginleştiğini not etmen yeter.`,
    ({ ask }) => `${ask} Aklına gelen ilk cevapla gün sonunda vereceğin cevabı karşılaştır.`,
    ({ ask }) => `${ask} Bu soruyu tek bir kişi ya da olayla ilişkilendirip oradan başla.`,
    ({ ask }) => `${ask} Sözün sende bıraktığı etkiyi kısa bir notla görünür kılabilirsin.`,
    ({ ask }) => `${ask} Aklına gelen örneğin neden önemli olduğunu kendi sözcüklerinle anlat.`,
    ({ ask }) => `${ask} Cevap ararken bildiğin şeyle umduğun şeyi birbirinden ayır.`,
    ({ ask }) => `${ask} Bugün küçük bir gözlem, büyük bir yargıdan daha yararlı olabilir.`,
    ({ ask }) => `${ask} Günün sonunda bu sorunun hangi kısmının açık kaldığını fark et.`,
    ({ ask }) => `${ask} Verdiğin cevabın bugünkü davranışına değip değmediğini kontrol et.`,
  ];

  function distinctDailyEssay(item, variant) {
    const note = notes().noteOf(item.card.id) || {};
    const name = `${item.card.nameTr} (${item.card.name})`;
    const meaning = String(item.pick.reversed ? item.card.reversed : item.card.upright).trim();
    const ask = item.pick.reversed ? note.askReversed : note.ask;
    if (variant) {
      const bits = clauses(meaning);
      const focus = bits[(variant - 1) % (bits.length || 1)] || item.card.keywords[0];
      const opening = DAILY_FRESH_OPENINGS[(variant - 1) % DAILY_FRESH_OPENINGS.length]({ name, focus });
      const ending = DAILY_FRESH_ENDINGS[(variant - 1) % DAILY_FRESH_ENDINGS.length]({ ask: ask || 'Bu tema sende hangi soruyu açıyor?' });
      return [
        `${opening}${deathNote(item.card)}`,
        `Kart ${item.pick.reversed ? 'ters' : 'düz'} geldi; anlamı ${meaning} Bu anlamların hangisinin yaşadığın duruma değdiğini seçerken acele etme.`,
        DAILY_FALLBACK_FRAMES[(variant - 1) % DAILY_FALLBACK_FRAMES.length],
        ending,
      ].join('\n\n');
    }
    return [
      `${name} kartının görseline bak: ${note.scene || 'Kartın sahnesi düşünmek için bir başlangıç olabilir.'} Bu sahnede bugün gözünün takıldığı ayrıntı hangisi?${deathNote(item.card)}`,
      `Kart ${item.pick.reversed ? 'ters' : 'düz'} geldi. Anlamı şöyle: ${meaning} Bu sözcükleri hayatının tamamına yaymak yerine, bugün yaşadığın tek bir olaya bağlamayı dene. O olayda neyi hissedip neyi yaptığını birbirinden ayır.`,
      `${ask || 'Bu tema sende hangi soruyu açıyor?'} Bugünün yorumunu, karşılığını görebileceğin somut bir anla birlikte not edebilirsin.`,
    ].join('\n\n');
  }

  function distinctSpreadEssay(reading, spread, seats, variant) {
    if (variant) {
      const position = spread.positions[(variant - 1) % spread.positions.length];
      const partner = spread.positions[variant % spread.positions.length];
      const a = seats[position.key];
      const b = seats[partner.key];
      const focus = clauses(a.pick.reversed ? a.card.reversed : a.card.upright)[(variant - 1) % 4] || a.themes;
      const lens = DAILY_FALLBACK_FRAMES[(variant - 1) % DAILY_FALLBACK_FRAMES.length];
      return [
        `${position.label} yerindeki ${a.name} bu okumada ${focus} temasını açıyor. ${reading.question ? `“${reading.question}” sorusuyla` : 'Bugünkü durumunla'} bu temanın bağını kendi yaşadığın bir örnekte ara.`,
        `${b.position.label} yerindeki ${b.name} ise ${b.themes} yönünü gösteriyor. Bu iki yeri yan yana koyduğunda hangi fark dikkatini çekiyor? ${lens}`,
        `${a.ask || 'Bu tema sende nerede beliriyor?'} Kartlar kesin bir sonuç yazmaz; verdiğin cevabı bugünkü koşullarınla birlikte değerlendir.`,
      ].join('\n\n');
    }
    const hash = [...String(reading.id || '')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const index = hash % spread.positions.length;
    const positions = spread.positions.slice(index).concat(spread.positions.slice(0, index));
    const paragraphs = [reading.question
      ? `“${reading.question}” sorusuna bu kez kartların tek tek getirdiği ayrıntılardan bakalım.`
      : 'Bu açılımda her kart başka bir ayrıntıyı görünür kılıyor.'];
    for (let i = 0; i < positions.length; i += 2) {
      const a = seats[positions[i].key];
      const b = positions[i + 1] && seats[positions[i + 1].key];
      const first = `${a.position.label} yerindeki ${a.name}, ${a.themes} konusunu açıyor. ${a.ask || 'Bu konu sende neyi uyandırıyor?'}`;
      if (!b) { paragraphs.push(first); continue; }
      paragraphs.push(`${first} ${b.position.label} yerindeki ${b.name} ise ${b.themes} yönünü gösteriyor. ${b.ask || 'Bu ikinci tema nerede beliriyor?'} `
        + 'İki soruya da kendi yaşadıklarından örnek verip sonra aralarında gerçekten bir bağ olup olmadığına bak.');
    }
    paragraphs.push('Kartlar kesin bir sonuç söylemez. Hangi sorunun bugünkü durumuna daha çok değdiğini ve hangi adımın senin elinde olduğunu not edebilirsin.');
    return paragraphs.join('\n\n');
  }

  function avoidRecent(draft, history, alternative) {
    const recent = (history || []).slice(0, 10).map((item) => item.interpretation && item.interpretation.closing).filter(Boolean);
    if (!tooSimilar(draft, recent)) return draft;
    for (let variant = 0; variant < 40; variant++) {
      const candidate = alternative(variant);
      if (!tooSimilar(candidate, recent)) return candidate;
    }
    // Çok uzun, birbirine benzeyen geçmiş metinlerde bile birebir eski metni gösterme.
    const final = alternative(40);
    const normalized = (text) => String(text).toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
    return recent.some((old) => normalized(old) === normalized(final))
      ? `${final}\n\nBu kez kendi gününden yalnızca bir somut örnek seçip kartın sorusunu onun üzerinden düşün.`
      : final;
  }

  function longClosing(reading, spread, cardsApi, history) {
    const repeats = reader().repeatContext(reading, history);
    if (spread.id === 'daily') {
      const pick = reading.cards[0];
      const card = cardsApi.getCard(pick.cardId);
      const item = { position: spread.positions[0], pick, card, meaning: String(pick.reversed ? card.reversed : card.upright) };
      const variation = [...String(reading.id || '')].reduce((hash, char) => (hash * 33 + char.charCodeAt(0)) >>> 0, 0) % 10;
      const draft = !repeats.sameCardCount && variation ? distinctDailyEssay(item, variation) : dailyEssay(item, repeats.sameCardCount);
      return avoidRecent(draft, history, (variant) => distinctDailyEssay(item, variant));
    }
    const seats = seatsOf(reading, spread, cardsApi);
    if (repeats.sameDrawCount) return avoidRecent(repeatedSpreadClosing(reading, spread, seats, repeats.sameDrawCount), history, (variant) => distinctSpreadEssay(reading, spread, seats, variant));
    const question = String(reading.question || '').replace(/\s+/g, ' ').trim();
    const opening = question
      ? `“${question}” diye sordun. Kartlar buna kesin bir hükümle değil, bu dönemin hikâyesini anlatarak cevap veriyor.`
      : 'Bu açılım, bu dönemde hayatında nelerin öne çıkabileceğini bir hikâye gibi anlatıyor.';
    const story = (STORIES[spread.id] || STORIES.three)(seats, reading);
    const asks = [...new Set([seats[HEART[spread.id]], seats[LAST[spread.id]]].filter(Boolean).map((seat) => seat.ask).filter(Boolean))];
    const ending = asks.length
      ? `Okumayı kapatırken kendine şunu sorabilirsin: ${asks.join(' Bir de: ')} Cevabı hemen bulmak zorunda değilsin; bu soruları birkaç gün yanında taşıman yeter.`
      : 'Okumayı kapatırken aklında kalan tek bir cümleyi not et. Kartlar bir son yazmaz; neye bakman gerektiğini gösterir.';
    const draft = [opening, tone(reading, cardsApi), ...story, cardBridge(reading, spread, seats), ending].join('\n\n');
    return avoidRecent(draft, history, (variant) => distinctSpreadEssay(reading, spread, seats, variant));
  }

  const COMMON_WORDS = new Set('bana bunu bundan bugün burada daha diye gibi gibiyle günün hangi için kadar kart kartlar kartın kendine kendi olabilir olan olarak önce sonra sana senin şunu şeyleri sorunun tekrar yine yorum yorumun zaman zamanla'.split(' '));

  function contentWords(words) {
    return new Set(words.filter((word) => word.length >= 4 && !COMMON_WORDS.has(word)).map((word) => word.slice(0, 5)));
  }

  function tooSimilar(text, previous, compareContent) {
    const words = (value) => String(value || '').toLocaleLowerCase('tr').match(/[\p{L}\p{N}]+/gu) || [];
    const current = words(text);
    const grams = (list) => new Set(list.slice(0, -3).map((_, i) => list.slice(i, i + 4).join(' ')));
    const currentGrams = grams(current);
    const currentContent = compareContent ? contentWords(current) : null;
    return (previous || []).some((item) => {
      const old = words(item);
      if (current.join(' ') === old.join(' ')) return true;
      const oldGrams = grams(old);
      if (currentGrams.size && oldGrams.size) {
        let shared = 0;
        currentGrams.forEach((gram) => { if (oldGrams.has(gram)) shared++; });
        if (shared / Math.min(currentGrams.size, oldGrams.size) >= 0.65) return true;
      }
      if (!compareContent) return false;
      const oldContent = contentWords(old);
      if (Math.min(currentContent.size, oldContent.size) < 12) return false;
      let shared = 0;
      currentContent.forEach((word) => { if (oldContent.has(word)) shared++; });
      return shared / Math.min(currentContent.size, oldContent.size) >= 0.78;
    });
  }

  async function requestClosing(reading, spread, cardsApi, opts, attempt) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: opts.signal,
      body: JSON.stringify({ system: SYSTEM, user: brief(reading, spread, cardsApi, attempt) }),
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

  async function closing(reading, spread, cardsApi, options) {
    const opts = options || {};
    for (let attempt = 0; attempt < 2; attempt++) {
      const text = await requestClosing(reading, spread, cardsApi, opts, attempt);
      if (!tooSimilar(text, opts.recentClosings, true)) return text;
    }
    const error = new Error('Tekrarlanan yorum');
    error.code = 'repeated';
    throw error;
  }

  const api = { ENDPOINT, MODEL, SYSTEM, VOICE, brief, longClosing, closing };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TAROT_ORACLE = api;
})(typeof window !== 'undefined' ? window : globalThis);
