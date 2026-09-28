// 78 kartlık Rider-Waite-Smith destesi. Yapı ve metinler "Tarot Rehberi: 78 Kart,
// Kombinasyonlar ve Okuma Metodolojileri" belgesini izler: suit/element tablosu, sayı
// temaları, court rolleri, 22 Major (astroloji + anahtar kelimeler + düz/aşk-iş/ters) ve
// 56 Minor (Golden Dawn başlığı + dekan astrolojisi + düz/ters).
// Görseller: assets/cards/<sıra>-<suit>-<no>-<slug>.jpg (RWS 1909, kamu malı).
(function (root) {
  'use strict';

  const IMAGE_DIR = 'assets/cards/';

  const SUITS = {
    wands: { key: 'wands', order: 1, name: 'Wands', nameTr: 'Asalar', altTr: 'Değnekler', singularTr: 'Asa', element: 'Ateş', area: 'Tutku, irade, yaratıcılık, girişim, kariyer hamlesi', zodiac: ['Koç', 'Aslan', 'Yay'], timing: 'Günler', intro: 'Wands tutkunun, iradenin, yaratıcılığın ve harekete geçmenin suit\'idir. Açılımda çok sayıda Wands varsa konu enerji, motivasyon, kariyer hamlesi ya da hızlı gelişen olaylar etrafında döner.' },
    cups: { key: 'cups', order: 2, name: 'Cups', nameTr: 'Kupalar', altTr: null, singularTr: 'Kupa', element: 'Su', area: 'Duygular, ilişkiler, sezgi, hayal gücü', zodiac: ['Yengeç', 'Akrep', 'Balık'], timing: 'Aylar', intro: 'Cups duyguların, ilişkilerin, sezginin ve hayal gücünün suit\'idir. Açılımı Cups doldurmuşsa soru ne olursa olsun asıl mesele duygusaldır: aşk, aile, arkadaşlık ya da iç dünya.' },
    swords: { key: 'swords', order: 3, name: 'Swords', nameTr: 'Kılıçlar', altTr: null, singularTr: 'Kılıç', element: 'Hava', area: 'Düşünce, iletişim, kararlar, çatışma, gerçek', zodiac: ['İkizler', 'Terazi', 'Kova'], timing: 'Haftalar', intro: 'Swords zihnin, iletişimin, kararların ve çatışmanın suit\'idir. Destenin en "zor" görünen kartları buradadır, çünkü zihin hem netlik hem acı üretir. Çok sayıda Swords, konunun kafada yaşandığını, stres ve konuşulması gereken gerçeklerle dolu olduğunu gösterir.' },
    pentacles: { key: 'pentacles', order: 4, name: 'Pentacles', nameTr: 'Tılsımlar', altTr: 'Paralar', singularTr: 'Tılsım', element: 'Toprak', area: 'Para, iş, beden, sağlık, maddi dünya', zodiac: ['Boğa', 'Başak', 'Oğlak'], timing: 'Yıllar', intro: 'Pentacles para, iş, beden, sağlık ve somut sonuçların suit\'idir. Bazı destelerde Coins ya da Disks adını alır. Pentacles ağırlıklı bir açılım, konunun pratik olduğunu ve sonuçların yavaş ama kalıcı geleceğini gösterir.' },
  };

  // Minor kartlarda sayı, suit'in enerjisinin hangi aşamada olduğunu söyler.
  const NUMBERS = {
    1: { theme: 'Tohum, saf potansiyel, yeni başlangıç', example: 'Ace of Cups = yeni bir duygu, aşkın başlangıcı' },
    2: { theme: 'Denge, ikilik, seçim, ortaklık', example: 'Two of Swords = iki düşünce arasında sıkışma' },
    3: { theme: 'Büyüme, ilk sonuç, işbirliği', example: 'Three of Pentacles = ekip işi, ilk somut ürün' },
    4: { theme: 'İstikrar, yapı, durgunluk', example: 'Four of Wands = sağlam zemin, kutlama' },
    5: { theme: 'Kriz, çatışma, kayıp, sarsıntı', example: 'Five of Pentacles = maddi zorluk' },
    6: { theme: 'Uyum, iyileşme, paylaşım', example: 'Six of Swords = zor süreçten çıkış' },
    7: { theme: 'Sınav, değerlendirme, belirsizlik', example: 'Seven of Cups = fazla seçenek, yanılsama' },
    8: { theme: 'Hareket, ustalık, yeniden yönlenme', example: 'Eight of Wands = hızlanma' },
    9: { theme: 'Doruk öncesi, bireysel tamamlanma, yoğunluk', example: 'Nine of Swords = zihinsel sıkıntının zirvesi' },
    10: { theme: 'Döngünün sonu, tamamlanma veya aşırı yük', example: 'Ten of Wands = taşınamayan yük' },
  };

  // Court kartları: gerçek bir kişi, danışanın bir kişilik yönü ya da bir olay/mesaj.
  const COURTS = {
    page: { role: 'Öğrenci, merak, yeni başlayan', element: 'Toprak', asEvent: 'Haber, mesaj, fırsatın ilk işareti' },
    knight: { role: 'Hareket, arayış, aşırılık', element: 'Hava', asEvent: 'Bir sonraki adım, gelişme, yolculuk' },
    queen: { role: 'İçsel ustalık, besleyicilik', element: 'Su', asEvent: 'Konunun duygusal/içsel olgunlaşması' },
    king: { role: 'Dışsal otorite, kontrol, liderlik', element: 'Ateş', asEvent: 'Kontrolü ele alma, karar yetkisi' },
  };

  const RANKS = [
    { rank: 1, key: 'ace', name: 'Ace', nameTr: 'Ası' },
    { rank: 2, key: 'two', name: 'Two', nameTr: 'İkilisi' },
    { rank: 3, key: 'three', name: 'Three', nameTr: 'Üçlüsü' },
    { rank: 4, key: 'four', name: 'Four', nameTr: 'Dörtlüsü' },
    { rank: 5, key: 'five', name: 'Five', nameTr: 'Beşlisi' },
    { rank: 6, key: 'six', name: 'Six', nameTr: 'Altılısı' },
    { rank: 7, key: 'seven', name: 'Seven', nameTr: 'Yedilisi' },
    { rank: 8, key: 'eight', name: 'Eight', nameTr: 'Sekizlisi' },
    { rank: 9, key: 'nine', name: 'Nine', nameTr: 'Dokuzlusu' },
    { rank: 10, key: 'ten', name: 'Ten', nameTr: 'Onlusu' },
    { rank: 11, key: 'page', name: 'Page', nameTr: 'Prensi', court: 'page' },
    { rank: 12, key: 'knight', name: 'Knight', nameTr: 'Şövalyesi', court: 'knight' },
    { rank: 13, key: 'queen', name: 'Queen', nameTr: 'Kraliçesi', court: 'queen' },
    { rank: 14, key: 'king', name: 'King', nameTr: 'Kralı', court: 'king' },
  ];

  const NUMERALS = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

  // [slug, name, nameTr, altTr, astrology, keywords, upright, loveWork, reversed]
  const MAJOR_ROWS = [
    ['the-fool', 'The Fool', 'Deli', null, 'Uranüs / Hava', ['başlangıç', 'özgürlük', 'inanç', 'spontanlık'],
      'Yeni bir yolculuğun başı. Bilinmeyene güvenle adım atmak, masumiyet, risk almaya hazır olmak. Plan yok ama açıklık var.',
      'Yeni, hafif ve özgür bir ilişki. İşte yeni proje, girişim, kariyer değişikliği ya da seyahat.',
      'Düşüncesizlik, hesapsız risk, safdillik. Ya da tersine, korkudan adım atamamak ve sorumluluktan kaçış.'],
    ['the-magician', 'The Magician', 'Büyücü', null, 'Merkür', ['irade', 'beceri', 'odak', 'tezahür'],
      'Dört elementin tümü masada; ihtiyacın olan her şey elinde. Niyeti eyleme dökmek, ikna gücü, iletişim.',
      'Karşılıklı çekim, girişkenlik. İşte yeteneğini gösterme, satış, sunum ve yeni girişim için doğru an.',
      'Manipülasyon, kandırma, boş vaat. Ya da yeteneği kullanamamak, dağınıklık, özgüven eksikliği.'],
    ['the-high-priestess', 'The High Priestess', 'Başrahibe', null, 'Ay', ['sezgi', 'gizli bilgi', 'bilinçaltı', 'sessizlik'],
      'Perdenin arkasında henüz açığa çıkmamış bir şey var. Sessiz kalmak, gözlemlemek, iç sesi dinlemek.',
      'Söylenmemiş duygular, gizemli çekim. İşte bilgi toplama, kartları açmama, bekleme.',
      'İç sesi bastırmak, sırlar ve gizli gündemler, yüzeysellik. Bilginin geç ortaya çıkması.'],
    ['the-empress', 'The Empress', 'İmparatoriçe', null, 'Venüs', ['bereket', 'bolluk', 'doğa', 'duyusallık'],
      'Besleyen anne arketipi. Doğurganlık, bolluk, yaratıcı projelerin büyümesi, bedensel zevk.',
      'Sevgi dolu ve besleyici ilişki; hamilelik ya da aile genişlemesi. İşte büyüme, üretkenlik, estetik işler.',
      'Yaratıcı tıkanıklık, kendini ihmal etmek. Aşırı korumacılık, bağımlı kılma, bolluğun kısılması.'],
    ['the-emperor', 'The Emperor', 'İmparator', null, 'Koç', ['otorite', 'yapı', 'düzen', 'sınırlar'],
      'Baba figürü. Disiplin ve kurallarla sağlam temel kurmak, koruma, sorumluluk.',
      'İstikrarlı, koruyucu ama kontrolcü olabilen partner. İşte liderlik, yönetim, resmi kurumlar.',
      'Tahakküm, katılık, kontrol takıntısı. Ya da disiplin eksikliği ve otoriteyle çatışma.'],
    ['the-hierophant', 'The Hierophant', 'Aziz', 'Başrahip', 'Boğa', ['gelenek', 'kurum', 'öğretmen', 'inanç sistemi'],
      'Kurallara uymak, eğitim, mentorluk, topluluğun ortak değerleri.',
      'Geleneksel bağlılık, evlilik, aile onayı. İşte kurumsal yapı, eğitim, sertifika.',
      'Dogmaya karşı çıkıp kendi yolunu çizmek. Ya da katı kurallara körü körüne bağlılık.'],
    ['the-lovers', 'The Lovers', 'Âşıklar', null, 'İkizler', ['aşk', 'uyum', 'değerler', 'seçim'],
      'Derin bağ ve uyum. Asıl tema, değerlere dayanan bilinçli bir seçimdir.',
      'Güçlü romantik bağ, ruh eşi teması. İşte ortaklık ve değerlerle uyumlu karar.',
      'Uyumsuzluk, değer çatışması, kararsızlık. Yanlış seçim ya da seçimden kaçış.'],
    ['the-chariot', 'The Chariot', 'Savaş Arabası', null, 'Yengeç', ['irade', 'zafer', 'kararlılık', 'ilerleme'],
      'Zıt güçleri kontrol altına alıp tek yöne sürmek. İrade ile kazanılan zafer; yolculuk.',
      'Engelleri aşan, sahiplenen ilişki. İşte hedefe odaklı ilerleme, rekabette kazanmak.',
      'Kontrol kaybı, farklı yönlere çekilmek. Ya da saldırgan, zorlayıcı bir irade.'],
    ['strength', 'Strength', 'Güç', null, 'Aslan', ['içsel güç', 'cesaret', 'şefkat', 'sabır'],
      'Kaba kuvvetle değil sabır ve yumuşaklıkla evcilleştirmek. Öz denetim, sakin cesaret.',
      'Zor dönemi birlikte aşan şefkatli ilişki. İşte dayanıklılık ve sessiz özgüven.',
      'Öz-şüphe, korku, özgüven kaybı. Ya da öfke patlamaları ve kontrolsüz dürtüler.'],
    ['the-hermit', 'The Hermit', 'Ermiş', null, 'Başak', ['içe dönüş', 'yalnızlık', 'bilgelik', 'arayış'],
      'Işığı kendi içinde bulmak. Geri çekilip düşünmek, rehber ya da bilge kişi.',
      'Yalnız kalma ihtiyacı, ilişkide mesafe. İşte araştırma, uzmanlaşma, danışmanlık.',
      'İzolasyon, kendini kapatma. Ya da içe bakmaktan kaçış, yalnızlık korkusu.'],
    ['wheel-of-fortune', 'Wheel of Fortune', 'Kader Çarkı', null, 'Jüpiter', ['döngüler', 'kader', 'dönüm noktası', 'şans'],
      'Talihin dönmesi. Kontrol dışındaki değişim, çoğunlukla olumlu yönde.',
      'Kader gibi hissettiren karşılaşma. İşte beklenmedik fırsat, yükseliş.',
      'Kötü şans, değişime direnç. Aynı döngüyü tekrar tekrar yaşamak.'],
    ['justice', 'Justice', 'Adalet', null, 'Terazi', ['hakkaniyet', 'doğruluk', 'neden-sonuç', 'hukuk'],
      'Dengeli karar, gerçeğin ortaya çıkması. Ne ekersen onu biçmek.',
      'Dürüst, eşit ilişki. İşte sözleşme, hukuki süreç, adil değerlendirme.',
      'Haksızlık, dürüst olmamak, sorumluluk almamak. Hukuki gecikme ya da olumsuz sonuç.'],
    ['the-hanged-man', 'The Hanged Man', 'Asılan Adam', null, 'Neptün / Su', ['teslimiyet', 'askıda kalma', 'yeni bakış açısı'],
      'Bir şeyi feda ederek içgörü kazanmak. Beklemek ve olaylara tersten bakmak.',
      'İlişkide duraklama, farklı açıdan bakma gereği. İşte beklemeye alınan projeler.',
      'Gereksiz fedakârlık, oyalanma, kararsızlıkta takılı kalmak. Ya da beklemenin sona ermesi.'],
    ['death', 'Death', 'Ölüm', null, 'Akrep', ['son', 'dönüşüm', 'bırakma', 'yenilenme'],
      'Neredeyse hiçbir zaman fiziksel ölüm değildir. Bir dönemin kapanması ve yeniye yer açılması.',
      'İlişkinin sonu ya da köklü dönüşümü. İşte kapanan bir iş, radikal değişim.',
      'Değişime direnç, bitmesi gerekeni bırakamamak, durgunluk. Yavaş ve sancılı dönüşüm.'],
    ['temperance', 'Temperance', 'Denge', 'Ölçülülük', 'Yay', ['denge', 'sabır', 'orta yol', 'iyileşme'],
      'Karışımı doğru ayarlamak. Zıtları uyumla birleştirmek, sabırla ilerlemek.',
      'Uyumlu, dengeli ilişki. İşte işbirliği ve istikrarlı ilerleme.',
      'Dengesizlik, aşırılık, sabırsızlık. Uyumsuz şeyleri zorla birleştirmek.'],
    ['the-devil', 'The Devil', 'Şeytan', null, 'Oğlak', ['bağımlılık', 'bağlanma', 'maddecilik', 'gölge'],
      'Seni tutan zincirler gevşek; aslında çıkabilirsin. Arzu, cinsellik, saplantı, gölge benlik.',
      'Tutkulu ama saplantılı ya da toksik bağ. İşte para veya statü yüzünden kapana kısılmışlık.',
      'Zincirleri kırmak, özgürleşme. Ya da gölgenin daha derine gömülmesi.'],
    ['the-tower', 'The Tower', 'Yıkılan Kule', null, 'Mars', ['ani yıkım', 'şok', 'açığa çıkış', 'uyanış'],
      'Sahte temellerin çökmesi. Acı ama kaçınılmaz ve sonunda özgürleştirici bir sarsıntı.',
      'Ani ayrılık ya da ilişkideki gerçeğin patlaması. İşte ani kayıp, kriz, işten çıkarılma.',
      'Felaketten kıl payı kurtulmak ya da kaçınılmaz değişimi ertelemek. İçsel, yavaş çöküş.'],
    ['the-star', 'The Star', 'Yıldız', null, 'Kova', ['umut', 'iyileşme', 'ilham', 'yenilenme'],
      'Tower\'dan sonra gelen sakinlik. İnancın geri dönmesi, şifa, huzur.',
      'İyileştiren, umut veren ilişki. İşte vizyon, yaratıcı ilham, uzun vadeli hedefler.',
      'Umutsuzluk, inanç kaybı, motivasyonsuzluk. Kendinden kopmak.'],
    ['the-moon', 'The Moon', 'Ay', null, 'Balık', ['yanılsama', 'korku', 'belirsizlik', 'bilinçaltı'],
      'Her şey göründüğü gibi değil. Sezgiye güven ama karar vermeden önce netliği bekle.',
      'Kafa karıştırıcı, gizli şeyler barındıran ilişki. İşte eksik bilgi ve net olmayan durum.',
      'Korkuların çözülmesi, gerçeğin ortaya çıkması. Ya da yoğun kaygı ve kendini kandırma.'],
    ['the-sun', 'The Sun', 'Güneş', null, 'Güneş', ['başarı', 'sevinç', 'canlılık', 'açıklık'],
      'Destenin en olumlu kartı. Netlik, mutluluk, sağlık, iç çocuk.',
      'Mutlu, açık ilişki; çocuk teması. İşte başarı ve tanınma.',
      'Geçici hayal kırıklığı, ertelenmiş başarı, abartılı iyimserlik. Ters haliyle bile genelde yumuşaktır.'],
    ['judgement', 'Judgement', 'Mahkeme', 'Yargı', 'Plüton / Ateş', ['uyanış', 'çağrı', 'yeniden doğuş', 'hesaplaşma'],
      'Geçmişi değerlendirip yeni sayfa açmak. İç çağrıya yanıt vermek, affetmek.',
      'Eski bir ilişkinin geri dönüşü ya da yeniden değerlendirme. İşte meslek çağrısı, büyük karar.',
      'Öz-yargı, kendini affedememek, çağrıyı duymamak. Pişmanlık ve kararsızlık.'],
    ['the-world', 'The World', 'Dünya', null, 'Satürn', ['tamamlanma', 'bütünlük', 'başarı', 'seyahat'],
      'Bir döngünün başarıyla kapanması. Hedefe ulaşmak, dünyayla bütünleşmek.',
      'Olgun, tamamlanmış ilişki. İşte projenin başarıyla bitmesi, uluslararası fırsat.',
      'Tamamlanmamış işler, kapanışın ertelenmesi. Son adımda takılmak ya da kısa yollara başvurmak.'],
  ];

  // Her suit için Ace → King sırasıyla: [Golden Dawn başlığı, dekan astrolojisi, düz, ters]
  const MINOR_ROWS = {
    wands: [
      ['Root of the Powers of Fire', null, 'Yeni bir tutku, ilham kıvılcımı, yaratıcı başlangıç. Aşkta güçlü çekim, işte yeni proje ya da girişim.', 'Ertelenen başlangıç, ilham eksikliği, motivasyon kaybı. Başlanıp bırakılan projeler.'],
      ['Lord of Dominion', 'Mars / Koç', 'Planlama ve geleceğe bakmak. İlk başarıdan sonra ufku genişletme kararı; seyahat ya da büyüme planı.', 'Değişim korkusu, konfor alanında kalmak, kötü planlama. Seçenekler arasında takılı kalmak.'],
      ['Lord of Established Strength', 'Güneş / Koç', 'Genişleme, ilk sonuçların gelmesi, uzak ufuklar. Planlar yürüyor; yurtdışı ve uzak bağlantılar.', 'Gecikmeler, beklenen dönüşün gelmemesi, öngörü eksikliği.'],
      ['Lord of Perfected Work', 'Venüs / Koç', 'Kutlama, ev, istikrar, topluluk. Düğün, nişan, eve dönüş; sağlam temel üzerinde sevinç.', 'Ev içinde gerginlik, iptal edilen kutlama, aidiyet eksikliği. Geçiş dönemi.'],
      ['Lord of Strife', 'Satürn / Aslan', 'Rekabet, fikir ayrılığı, ego çatışması. Çoğu zaman oyun gibi, yıkıcı olmayan bir mücadele.', 'Çatışmadan kaçınmak ya da gerginliğin bitmesi. Bazen iç çatışma ve bastırılmış öfke.'],
      ['Lord of Victory', 'Jüpiter / Aslan', 'Zafer, tanınma, kamuoyu onayı, başarı haberi. Haklı bir özgüven.', 'Tanınmamak, başarısızlık, ego şişkinliği. Düşüş korkusu.'],
      ['Lord of Valour', 'Mars / Aslan', 'Savunma, pozisyonunu korumak, rakiplere karşı direnmek. Kararlılık ve ilkeler.', 'Bunalmak, pes etmek, savunmayı bırakmak. Ya da gereksiz savunmacılık.'],
      ['Lord of Swiftness', 'Merkür / Yay', 'Hız, haberler, ani gelişmeler, seyahat. İşler birden hızlanıyor.', 'Gecikme, iptal, aceleyle yapılan yanlış hamle. Enerjinin boşa harcanması.'],
      ['Lord of Great Strength', 'Ay / Yay', 'Dayanıklılık, son hamle öncesi yorgunluk, sınır koymak. Neredeyse bitti, devam et.', 'Tükenmişlik, paranoya, aşırı savunmacılık. Direnecek gücün kalmaması.'],
      ['Lord of Oppression', 'Satürn / Yay', 'Aşırı yük, sorumluluk fazlası, stres. Başarı bir yüke dönüşmüş.', 'Yükü bırakmak, devretmek, delege etmek. Ya da çöküş noktası.'],
      [null, null, 'Keşif, heyecan, yaratıcı bir fikir ya da haber. Özgür ruhlu, meraklı genç biri.', 'Yönsüzlük, sabırsızlık, bitirilmeyen işler. Geciken ya da kötü haber.'],
      [null, null, 'Enerji, macera, ani hareket, taşınma. Atılgan ve karizmatik biri.', 'Aceleci, dürtüsel, sabırsız. Öfke, dağınıklık, yarım kalan işler.'],
      [null, null, 'Özgüven, sıcaklık, karizma, sosyal güç. Kalabalıkta parlayan, kararlı biri.', 'Kıskançlık, özgüven eksikliği, talepkârlık. Bencil ya da sönük enerji.'],
      [null, null, 'Vizyoner lider, girişimci, ilham veren. Büyük resmi gören, cesur karar alıcı.', 'Dürtüsellik, zorbalık, gerçek dışı beklentiler. Plansız liderlik.'],
    ],
    cups: [
      ['Root of the Powers of Water', null, 'Yeni aşk, duygusal başlangıç, şefkat taşkınlığı. Yaratıcı ve ruhsal açılım.', 'Bastırılmış duygular, iç boşluk, duygusal tıkanıklık. Kendini sevmekte zorlanmak.'],
      ['Lord of Love', 'Venüs / Yengeç', 'Karşılıklı çekim, ortaklık, birlik. Bir ilişkinin ya da anlaşmanın başlangıcı.', 'Dengesizlik, kopukluk, ayrılık. Kırılan iletişim ve güven.'],
      ['Lord of Abundance', 'Merkür / Yengeç', 'Dostluk, kutlama, topluluk, neşe. Arkadaşlarla buluşma, iyi haber paylaşımı.', 'Aşırılık, dedikodu, üçüncü kişi. Gruptan kopma, yalnızlaşma.'],
      ['Lord of Blended Pleasure', 'Ay / Yengeç', 'Kayıtsızlık, tatminsizlik, önündeki fırsatı görmemek. İçe dönük yeniden değerlendirme.', 'Yeni farkındalık, durgunluktan çıkış. Ya da daha derin bir geri çekilme.'],
      ['Lord of Loss in Pleasure', 'Mars / Akrep', 'Kayıp, yas, pişmanlık. Dökülen kupalara odaklanırken arkadaki iki sağlam kupayı görmemek.', 'Kabullenme, affetme, iyileşme. Yeniden ileriye bakmak.'],
      ['Lord of Pleasure', 'Güneş / Akrep', 'Nostalji, çocukluk, masumiyet. Geçmişten biri, iyi niyetli bir jest.', 'Geçmişte takılı kalmak, onu idealize etmek. Büyümeyi reddetmek.'],
      ['Lord of Illusionary Success', 'Venüs / Akrep', 'Çok fazla seçenek, hayaller, yanılsama. Netlik yok; hangisinin gerçek olduğu belirsiz.', 'Netleşme, gerçeğe dönüş, karar. Ya da hayallerde tamamen kaybolmak.'],
      ['Lord of Abandoned Success', 'Satürn / Balık', 'Anlamını yitirmiş bir durumu geride bırakmak. Daha derin bir anlam arayışı.', 'Gitme korkusu ya da terk edilme. Kalmakla gitmek arasında gidip gelmek.'],
      ['Lord of Material Happiness', 'Jüpiter / Balık', '"Dilek kartı": tatmin, keyif, dileğin gerçekleşmesi. Evet/hayır sorusunda güçlü evet.', 'Tatminsizlik, aşırı haz düşkünlüğü, kibir. Dileğin eksik gerçekleşmesi.'],
      ['Lord of Perfected Success', 'Mars / Balık', 'Aile mutluluğu, duygusal tamamlanma, uyumlu yuva.', 'Aile içi çatışma, kopukluk. İdealize edilen aile ile gerçek arasındaki fark.'],
      [null, null, 'Duygusal mesaj, flört teklifi, yaratıcı fırsat, sezgisel haber. Hassas, hayalperest genç biri.', 'Duygusal olgunlaşmamışlık, hayal kırıklığı, yaratıcı tıkanıklık.'],
      [null, null, 'Romantik teklif, çekicilik, duygularını takip eden romantik biri.', 'Gerçek dışı beklentiler, kıskançlık, kararsızlık, duygusal manipülasyon.'],
      [null, null, 'Şefkat, empati, güçlü sezgi, duygusal güvenlik sağlayan biri.', 'Duygusal bağımlılık, kendini unutmak, aşırı hassasiyet.'],
      [null, null, 'Duygusal denge ve olgunluk, diplomasi, sakin bilgelik.', 'Duygusal manipülasyon, bastırılmış duygular, ruh hali dalgalanmaları.'],
    ],
    swords: [
      ['Root of the Powers of Air', null, 'Netlik, zihinsel atılım, gerçeğin ortaya çıkması. Keskin bir fikir ya da kesin karar.', 'Kafa karışıklığı, yanlış bilgi, kötü karar. Kırıcı sözler.'],
      ['Lord of Peace Restored', 'Ay / Terazi', 'Karar verememek, çıkmaz, bilgiden kaçınmak. Gözler bağlı, kırılgan bir denge.', 'Kararsızlığın bitmesi ama bilgi bombardımanı. Ya da iç çatışmanın derinleşmesi.'],
      ['Lord of Sorrow', 'Satürn / Terazi', 'Kalp kırıklığı, acı gerçek, keder, ayrılık.', 'İyileşme, affetme, acıyı bırakmak. Ya da bastırılmış acı.'],
      ['Lord of Rest from Strife', 'Jüpiter / Terazi', 'Dinlenme, iyileşme, geri çekilme, meditasyon. Kriz sonrası toparlanma.', 'Tükenmişlik, huzursuzluk, dinlenmeyi reddetmek. Ya da uyanıp harekete dönmek.'],
      ['Lord of Defeat', 'Venüs / Kova', 'Kaybettiren zafer, yenilgi, gurur yüzünden kaybetmek. "Haklı çıktım ama yalnız kaldım."', 'Barışma, geçmişi geride bırakmak. Ya da kin ve pişmanlık.'],
      ['Lord of Earned Success', 'Merkür / Kova', 'Geçiş, zor bir durumdan uzaklaşmak, sakin sulara yolculuk.', 'Takılı kalmak, geçişe direnç, bitmemiş iş.'],
      ['Lord of Unstable Effort', 'Ay / Kova', 'Hile, gizlilik, strateji, bir şeyi sıvıştırmak. Yalnız hareket etmek.', 'İtiraf, vicdan, yakalanmak. Kendini kandırmayı bırakmak.'],
      ['Lord of Shortened Force', 'Jüpiter / İkizler', 'Kısıtlanmışlık hissi, kurban psikolojisi, kendi zihninin hapsinde olmak. Bağlar aslında gevşek.', 'Özgürleşme, yeni bakış açısı, sınırlayıcı düşünceleri bırakmak.'],
      ['Lord of Despair and Cruelty', 'Mars / İkizler', 'Kaygı, uykusuzluk, kabus, suçluluk. Korkuların gerçekten büyük görünmesi.', 'Umut, kaygının azalması, yardım istemek. Ya da derin, gizli korkular.'],
      ['Lord of Ruin', 'Güneş / İkizler', 'Dip noktası, ihanet, acı son. Ama ufukta şafak var; daha kötüsü olmayacak.', 'Toparlanma, direnç. Ya da kaçınılmaz sonu uzatmak.'],
      [null, null, 'Merak, yeni fikirler, gözlem, haber. Soru soran, keskin zekâlı genç biri.', 'Dedikodu, düşünmeden konuşmak, casusluk.'],
      [null, null, 'Hırslı, hızlı düşünen, doğrudan, sonuca koşan biri.', 'Düşüncesiz, saldırgan iletişim, acelecilik.'],
      [null, null, 'Bağımsızlık, net sınırlar, keskin zekâ, dürüstlük. Deneyimle bilgeleşmiş biri.', 'Soğukluk, acımasızlık, acı sözler.'],
      [null, null, 'Entelektüel otorite, etik, analitik karar. Hukukçu, uzman, gerçeği savunan biri.', 'Manipülatif, zalim, gücü kötüye kullanan.'],
    ],
    pentacles: [
      ['Root of the Powers of Earth', null, 'Yeni maddi fırsat, iş teklifi, yatırım, bolluğun tohumu.', 'Kaçan fırsat, plan eksikliği, kötü finansal karar.'],
      ['Lord of Harmonious Change', 'Jüpiter / Oğlak', 'Denge kurmak, birden fazla işi aynı anda yürütmek, esneklik.', 'Dengesizlik, düzensizlik, fazla yüklenmek.'],
      ['Lord of Material Works', 'Mars / Oğlak', 'Ekip çalışması, işbirliği, ustalık, öğrenme. İlk somut ürün.', 'Ekip içi uyumsuzluk, kötü işçilik, iletişimsizlik.'],
      ['Lord of Earthly Power', 'Güneş / Oğlak', 'Tutunmak, güvenlik ihtiyacı, tutumluluk, kontrol.', 'Açgözlülük ya da israf. Veya sıkı tutmayı bırakmak.'],
      ['Lord of Material Trouble', 'Merkür / Boğa', 'Maddi kayıp, yoksunluk, dışlanmışlık hissi, sağlık endişesi. Yardım yakında ama görülmüyor.', 'Toparlanma, maddi iyileşme, yardımı kabul etmek.'],
      ['Lord of Material Success', 'Ay / Boğa', 'Cömertlik, yardım, paylaşım, verme-alma dengesi.', 'Tek taraflı ilişki, borç, koşullu yardım.'],
      ['Lord of Success Unfulfilled', 'Satürn / Boğa', 'Uzun vadeli yatırım, sabır, ara değerlendirme. Hasadı beklemek.', 'Sabırsızlık, düşük getiri, emeğin karşılığını alamamak.'],
      ['Lord of Prudence', 'Güneş / Başak', 'Beceri geliştirmek, çıraklık, emeğe ve detaya dikkat.', 'Mükemmeliyetçilik, motivasyon eksikliği, yönsüz çalışma.'],
      ['Lord of Material Gain', 'Venüs / Başak', 'Maddi bağımsızlık, konfor, kendi emeğinin meyvesi, zarafet.', 'Aşırı çalışma, finansal kırılganlık, yüzeysellik.'],
      ['Lord of Wealth', 'Merkür / Başak', 'Servet, miras, aile, uzun vadeli güvenlik, kalıcılık.', 'Aile içi para anlaşmazlığı, finansal kayıp, miras sorunu.'],
      [null, null, 'Yeni finansal fırsat, öğrenme, hedef belirleme. Çalışkan, ciddi öğrenci.', 'Tembellik, ilerleme eksikliği, fırsatı değerlendirememek.'],
      [null, null, 'Çalışkanlık, rutin, sorumluluk, yavaş ama emin ilerleme. Güvenilir biri.', 'Durgunluk, sıkılma. Ya da tembellik veya işkoliklik.'],
      [null, null, 'Pratik, besleyici, maddi güvenlik sağlayan. Ev ve iş dengesini kuran biri.', 'Kendini ihmal etmek, ev-iş dengesini kaybetmek, maddi bağımlılık.'],
      [null, null, 'Zenginlik, iş başarısı, güvenilir liderlik. Bolluğu yöneten biri.', 'Açgözlülük, maddecilik, inatçılık, başarı takıntısı.'],
    ],
  };

  function pad2(n) { return String(n).padStart(2, '0'); }

  const MAJOR = MAJOR_ROWS.map((row, number) => {
    const [slug, name, nameTr, altTr, astrology, keywords, upright, loveWork, reversed] = row;
    return {
      id: 'major-' + pad2(number),
      arcana: 'major',
      number,
      numeral: NUMERALS[number],
      slug,
      name,
      nameTr,
      altTr,
      astrology,
      keywords,
      upright,
      loveWork,
      reversed,
      image: IMAGE_DIR + '0-major-' + pad2(number) + '-' + slug + '.jpg',
    };
  });

  const MINOR = [];
  Object.keys(SUITS).forEach((suitKey) => {
    const suit = SUITS[suitKey];
    MINOR_ROWS[suitKey].forEach((row, index) => {
      const rank = RANKS[index];
      const [title, astrology, upright, reversed] = row;
      const slug = rank.key + '-of-' + suitKey;
      MINOR.push({
        id: suitKey + '-' + pad2(rank.rank),
        arcana: 'minor',
        suit: suitKey,
        element: suit.element,
        rank: rank.rank,
        rankKey: rank.key,
        court: rank.court || null,
        slug,
        name: rank.name + ' of ' + suit.name,
        nameTr: suit.singularTr + ' ' + rank.nameTr,
        altTr: null,
        title,
        astrology,
        keywords: rank.court ? COURTS[rank.court].role.split(', ') : NUMBERS[rank.rank].theme.split(', '),
        upright,
        reversed,
        image: IMAGE_DIR + suit.order + '-' + suitKey + '-' + pad2(rank.rank) + '-' + slug + '.jpg',
      });
    });
  });

  const CARDS = MAJOR.concat(MINOR);
  const BY_ID = new Map(CARDS.map((card) => [card.id, card]));

  function getCard(id) { return BY_ID.get(id) || null; }

  // Bir kartın kart yüzünün altında gösterilecek kısa künye satırı.
  function cardMeta(card) {
    if (card.arcana === 'major') return card.numeral + ' · ' + card.astrology;
    if (card.court) return COURTS[card.court].role;
    return card.title + (card.astrology ? ' · ' + card.astrology : '');
  }

  const api = { SUITS, NUMBERS, COURTS, RANKS, MAJOR, MINOR, CARDS, getCard, cardMeta };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TAROT_CARDS = api;
})(typeof window !== 'undefined' ? window : globalThis);
