# Gece Ritüeli — uygulama doğrulaması (30 Eylül 2026)

Yöntem: Chrome (headless, puppeteer-core) ile gerçek uygulama; her ekran SCREENS.json boyutunda yakalandı. Ekran görüntüleri `verification/screens/`.

| Referans | Boyut | Yakalanan dosya | Kalan fark |
|---|---|---|---|
| 01 ana sayfa | 1586×992 | 01-ana-sayfa.png | Sprite kartlar türetilmiş varlık; metin rasterizasyonu Fraunces/DM Sans ile referanstan küçük farklı |
| 02 okumalarım | 1503×1047 | 02-okumalarim.png | Günlük kayıtta tek kart (bilinçli, mockup hatası kopyalanmadı) |
| 03 ayarlar | 1487×1058 | 03-ayarlar.png | İkon çizimleri elle yapıldı |
| 04–08 açılım önizlemeleri | 1586×992 | 04…08 | Kart boyutları kalibre, birebir ölçü ölçülmedi |
| 09–10 soru | 1586×992 | 09, 10 | — |
| 11 karıştırma | 1586×992 | 11-karistirma.png | Deste 3B eğimi CSS ile; referanstan hafif farklı |
| 12 seçim | 1586×992 | 12-kart-secimi.png | Yelpaze yay eğimi/kart boyutu yaklaşık |
| 13 kartları aç | 1586×992 | 13-kartlari-ac.png | — |
| 14 yorum | 1586×992 | 14-yorum.png | Örnek Büyücü/Ay/Yıldız yerine gerçek çekim |
| 15 günün kartı | 1586×992 | 15-gunun-karti.png | — |
| 16 rehber / 17 detay / 18 ayrıl | 1586×992 | 16, 17, 18 | — |

Piksel düzeyinde karşılaştırma/yarı saydam bindirme yapılmadı; "pixel-perfect" iddiası yoktur.

## Otomatik işlev kontrolü (50 madde)
İnceleme düzeltmelerinden sonra 1586×992, 390×844 ve 320×568'de 50/50 geçti (1440×900 düzeltmeden önce 50/50; sonrasında yeniden koşulmadı).
Testler: `node --test tests/*.test.cjs` → 33/33 (30 eski + 3 yeni yardımcı testi).
Ekran görüntüleri düzeltmelerden önce alındı; düzeltmeler yalnızca davranış/odak/yerleşim değişkenleri.

## Kaydırmasız sahne ve hareket katmanı (30 Eylül 2026, ikinci tur)

İstek: sayfa hiç kaymasın, her yerde animasyon olsun, daha çok tarot gibi hissettirsin.
Önceki sözleşmedeki "uzun yorumlar sayfayı uzatabilir" ve "sürekli salınım yok" kuralları bu istekle bilerek değişti.

Yöntem: headless Chrome (puppeteer-core) ile tam akış — ana sayfa, İlişki onayı, soru, karıştırma, 5 kart seçimi,
açma, yorumun bütün bölümleri, günün kartı, ana sayfaya dönüş, Okumalarım, Ayarlar, Kartları tanı, kart detayı.
Her ekranda ölçülen: belge yüksekliği − pencere yüksekliği (0 olmalı), görünür bir öğenin pencere dışına taşması,
yorum sayfasının kendi kutusundan taşması (negatif = boşluk kalıyor).

| Boyut | Sayfa kayması | Görünür taşma | Yorum sayfası taşması |
|---|---|---|---|
| 1586×992 | 16/16 ekranda 0 | yok* | yok |
| 1440×900 | 16/16 ekranda 0 (son, yalnızca mobili etkileyen düzeltmelerden önce koşuldu) | yok* | yok |
| 1100×920 | 16/16 ekranda 0 | yok* | yok |
| 390×844 (mobil) | 16/16 ekranda 0 | yok* | yok |
| 320×568 (mobil) | 16/16 ekranda 0 | yok* | yok |

\* Onay ekranında ekran okuyucu için görünmez tutulan "kartın hazır" durum metni ve mobilde görünmez tutulan
pozisyon listesi kırpılmış kutularından taşıyor sayılıyor; görünür değiller.

Azaltılmış hareket (Ayarlar → Animasyonlar → Azaltılmış): yorum metni, başlık kelimeleri ve niyet kartlarında görünmez
kalan öğe 0; toz/mum katmanı kapalı.
Pencere 460 px'ten alçaksa (yatay telefon) içerik sığamayacağı için yalnızca orada sayfa kayar.

Testler: `node --test tests/*.test.cjs` → 48/48 (33 eski + 15 yeni yardımcı testi).

Yeni ekran görüntüleri 1586×992'de alındı (Okumalarım ve Ayarlar da bu boyutta; referans boyutları 1503×1047
ve 1487×1058). `14b`, `14c`, `15b` ve `mobil/` yeni. 04, 06–08, 10, 12b, 18 bu turda yeniden alınmadı.

## Karıştırma ritüeli, gerçek yorum, Celtic Cross ve donmalar (1 Ekim 2026, üçüncü tur)

İstek: karıştırma zayıf; sonda gerçek bir tarot yorumu yok, insanlar ne çektiğini anlamıyor; 10'lu destede kartlar kötü duruyor; bazı yerlerde donma var.

Bulunan kök nedenler:
- `app.js`'te iki `bindDeck` vardı; Kartları tanı destesininki karıştırma destesininkini eziyordu. Desteye basılı tutmak hiçbir şey yapmıyordu, yalnız "Otomatik karıştır" çalışıyordu. (`bindShuffleDeck` / `bindGuideDeck` olarak ayrıldı.)
- Yorum metni motorun iç terimlerini ("yanlardan gelen nitelik soğuk ve nemli bir tona çekiyor") ve dolgu cümlelerini okuyucuya gösteriyordu; sayı kartlarının anahtar kelimeleri sayının genel temasından geliyordu (Kılıç Üçlüsü'ne "işbirliği").
- Celtic Cross'ta her kartın altındaki etiket payı kartları ~55 px'e indiriyordu; etiketler üst üste biniyordu.
- Çizim maliyeti: her kelime ve her büyük geçiş ayrı bulanıklık animasyonuydu, kıvılcımlar yüzlerce ayrı DOM katmanıydı, kart arkası 958×1642 PNG'ydi.

Yapılan: `shuffle.js` (yıkama + dolan çember + iç içe geçme + üçe kesme), `card-notes.js` (78 kart: görsel anlatımı, düz/ters soru),
kart bölümü "Kartta · Anlamı · … yerinde · Kendine sor" ve büyük kart + köşede harita, "Masadaki kartlar" listesi,
zorlu kart/olumlu yer uyumu, açılımın hikâyesini anlatan şablon kapanış, Celtic Cross'ta numara rozeti + yan liste.

Ölçüm (headless Chrome, 4× yavaşlatılmış işlemci, Celtic Cross akışı, stil yeniden hesaplama toplamı):
açma → yorum 870 → 157 ms, hepsini aç 558 → 141 ms, ana sayfa → onay 451 → 51 ms; yorum sayfalarında katmanlama 423 → 167 ms.

Kaydırmasız kontrol (flow.mjs, 16 ekran): 1586×992, 1440×900, 1100×920, 390×844, 320×568'de sayfa kayması 0, yorum sayfası taşması yok.
Onay ekranındaki tek "taşma" yine görünmez ekran okuyucu metni. Azaltılmış hareket: görünmez kalan öğe 0.
Celtic Cross sayfa sayısı: masaüstünde her kart tek sayfa; 390×844'te 2–3, 320×568'de 4–5 sayfa.

Testler: `node --test tests/*.test.cjs` → 58/58 (art arda 6 koşu).

## Celtic Cross seçimi, açılışta çakışmalar, yarıda bırakma ve her boyutta uyum (1 Ekim 2026, dördüncü tur)

İstek (ekran görüntüleriyle, ~1800×920): kartlar büyük olmasına rağmen seçilen kartlar minicik, 1 ve 2 karışık; açma ekranında
UI hatası; yarıda bırakınca ana sayfa bozuluyor; "tüm proje aşırı uyumlu responsive olmalı".

Bulunan kök nedenler:
- Seçimde Celtic Cross haç + sütun biçimiyle (7 kart boyu yükseklik) basık seçim alanına sığdırılıyordu: kartlar 46 px, yelpaze 106 px.
  Seçim ekranı dizilimi yelpaze kendi yüksekliğini koymadan ölçüyordu.
- Açarken satır arası kart genişliğinin %10'u (~7 px), numara rozetinin yarı çapı 13 px: rozetler üstteki karta biniyordu;
  10 satırlık liste kutusuna sığmıyordu (son satır kesik); kesen kart 5 ve 6'ya değiyordu.
- Ana sayfada kart boyutu formülü bandı ve "bugün çekildi" rozetini saymıyordu; taşan içerik ortalandığı için başlığın üstüne kayıyordu.
- Yarıda bırakılıp açma adımına dönülünce dizilim düğmeler kurulmadan ölçülüyor, kartlar "Hepsini aç" düğmesine biniyordu.
- Önceki doğrulama yalnızca sayfa kaymasını ve pencere dışına taşmayı ölçüyordu; öğelerin üst üste binmesi hiç ölçülmüyordu.
  Bu yüzden 320–375 px telefonlarda ilişki/karar/kariyer etiketleri, soru ekranı, rehber destesi, anlatım okları gibi eski sorunlar da görünmemişti.

Yapılan:
- Seçim şeridi (`ui-helpers.stripLayout`): çok kartlı açılımlar seçilirken sırayla bir şeritte, yelpaze kartı boyunda, yerin adı altta;
  yelpazenin yükselen uçlarına değmeyecek kadar daralır, gerekirse iki satıra iner. Açılışta kartlar dizilimdeki yerlerine uçar,
  kesen kart uçarken döner. Haritalı açılımlar (İlişki, Karar) masaüstünde şerit belirgin büyük değilse haritada kalır.
- Rozetli dizilim: satır arası rozetin taşacağı kadar (`ui-helpers.stackCardWidth`), rozet için üstte pay; kesen kartın rozeti kendi
  ucunun içinde; 1'e (kart, liste satırı ya da anlatım) gelince kesen kart saydamlaşır, alttaki kart görünür.
  Celtic önizlemesi de rozetli (adlar sağdaki haritada). Telefonda açarken İlişki, Karar ve Kariyer de rozetli + altta yana kayan liste.
- Masaüstünde Celtic Cross açılırken başlık listenin üstüne, sağ sütuna geçer; dizilim bütün yüksekliği kullanır (1800×920: 70 → 87 px).
  Liste satırları kapsayıcı yüksekliğine göre küçülür, hiçbir yükseklikte kesilmez.
- Kart altı etiketler çizildikten sonra ölçülür (açarken en uzun yer adı, kart adı, "Ters" ve anahtar kelimelerle); pay yetmezse
  dizilim yeniden kurulur. Telefonda hücre ada dar kalırsa dizilim kendiliğinden rozetli olur. Dizilim kutusu sonradan boyut
  değiştirirse (düğmeler, yazı tipi) ResizeObserver kartları yeniden sığdırır.
- Ana sayfa: bant ve rozet için yer ayrılır, içerik `safe center`; telefonda karusel kartları kalan gerçek boşluktan ölçülür
  (en az 84 px), bant iki satırlı küçük bir karttır, "bugün çekildi" rozeti telefonda yalnız ekran okuyucuya okunur (kartın yüzü açık).
- Küçük ekranlar: onay haritasına ikinci sıkılaştırma kademesi; soru ekranında deste kutusuyla küçülür, kısa telefonda adım çizgisi
  çekilir; rehberde deste her boyut değişiminde yeniden ölçülür, kısa telefonda alt başlık ve künye çekilir; anlatım noktaları anlatım
  kutusu darsa sıkışır; not sayfası kutusu alçaldıkça sıkışır; yatay telefonda yorum iki sütun, karusel kartları sabit boy.

Ölçüm (headless Chrome, `sweep.mjs` + `measure.mjs`): her boyutta 47 ekran (ana sayfa, günün kartı, karar/kariyer/ilişki/üç kart/
Celtic Cross onay–soru–karıştırma–seçim–açma–yorum, yarıda bırakma penceresi, bantlı ana sayfa, devam etme, Okumalarım, Ayarlar,
Kartları tanı, kart detayı). Ölçülen: sayfa kayması; görünür metin satırları (taşmayı kırpan üst öğeyle kesilmiş), kontroller, kartlar,
rozetler ve yelpaze kartları arasındaki çakışma; pencere dışına taşma; kendi kutusundan taşan liste/anlatım/harita.
Bilinçli üst üste binmeler sayılmaz: kesen kartın 1'in üstünde durması, rozetin kendi kartında durması, rehber destesinin yelpazesi,
yorumda öne çıkan kartın hafif büyümesi, açık pencerenin arkası.

| Boyut | Önce (çakışma ölçülerek) | Sonra |
|---|---|---|
| 320×568 | 14/35 | 47/47 |
| 360×640 · 375×667 | 20/35 · 21/35 | 47/47 · 47/47 |
| 390×844 · 412×915 · 430×932 | 29/35 · 28/35 · 31/35 | 47/47 |
| 768×1024 · 820×1180 · 1024×1366 | 33/35 · 34/35 · 34/35 | 47/47 |
| 1024×768 · 1180×820 | 27/35 · 35/35 | 47/47 |
| 1280×720 · 1280×800 · 1366×768 | 28/35 · 30/35 · 30/35 | 47/47 |
| 1440×900 · 1536×864 · 1680×1050 | 27/35 · 35/35 · 35/35 | 47/47 |
| 1800×920 · 1920×1080 · 2560×1440 | 34/35 · 35/35 · 35/35 | 47/47 |
| 844×390 · 667×375 (yatay, sayfa bilerek kayar) | karusel kartları 0 px, yorum haritası minicik | 47/47 (çakışma yok) |

"Önce" sütunu bu turun ilk taramasıdır (35 ekran; kariyer ve üç kartın tam akışı sonradan eklendi). Son üç küçük düzeltme
(karusel alt sınırı, bant üstü boşluk, karuselin daralmaması) yalnızca telefon kurallarındadır; telefon boyutları ve 1440×900
son kodla yeniden ölçüldü, diğer masaüstü/tablet boyutları bu düzeltmelerden hemen önceki kodla ölçüldü.

Yarıda bırakma (`leave.mjs`, 1800×920): 3 kart açıkken ayrıl → bantlı ana sayfa → pencere küçült/büyüt → devam et → hepsini aç → yorum:
her adımda çakışma 0. Geçiş (`motion.mjs`): seçimde kesen kart dik, açılışta 0° → 90° animasyonla yatar; 1'in ya da listedeki
1. satırın üzerinde kesen kart 0,14 saydamlığa iner, ayrılınca 1'e döner. Azaltılmış hareket: dönüş animasyonsuz, görünmez kalan öğe 0.

Testler: `node --test tests/*.test.cjs` → 62/62 (58 eski + 4 yeni: şerit, satır arası).
Yeni ekran görüntüleri: `19-celtic-secim`, `20-celtic-acik`, `21-yarim-okuma`, `22-gunun-karti-acik` (1800×920),
`mobil/390-celtic-secim`, `mobil/390-celtic-acik`, `mobil/390-iliski-acik`, `mobil/320-yarim-okuma`, `mobil/844x390-yorum`.

## Telefonda yorum ekranında kartlar küçük kalıyordu (1 Ekim 2026, beşinci tur)

İstek: yorum ekranı (Masadaki kartlar, Genel bakış) telefonda çok kötü, kartlar küçük (kullanıcının penceresi yaklaşık 496×789).

Kök neden: telefonda dizilim anlatımın üstünde, alanın %34'ünde (alçak ekranda %22) duruyor. Üç sıralı haritalar (İlişki, Karar,
Celtic Cross) bu basık alana ancak minicik sığıyordu; bir önceki "kartları aç" ekranında aynı kartlar ~75 px genişliğindeydi.

Düzeltme: telefonda yorumun dizilimi, kartlar numaralı bir şeritte (tek ya da iki sıra) belirgin biçimde büyüyorsa şeride dizilir
(seçim ekranındaki kuralın aynısı: şerit haritadan %15'ten fazla büyükse). Haritada kalan dizilimler de numara rozeti taşır.
Açma → yorum geçişinde kartlar şeride süzülür, Celtic Cross'un kesen kartı dönerek doğrulur. Alçak telefonda dizilimin payı %22 → %28.
Listede kart adı sığmazsa yalnız ad kısalır, "Ters" rozeti kesilmez (önce rozet de kesilip kayboluyordu). Telefonun iki sütunlu
listesinde (Celtic Cross) yer adı görünüyorsa rozet onun yanına geçer; masaüstünde rozet adın yanında kalır.

| Boyut | Açılım | Önce | Sonra |
|---|---|---|---|
| 496×789 | İlişki | 31×53 | 79×135 |
| 390×844 | İlişki · Celtic Cross | 34×58 · 18×31 | 62×106 · 45×77 |
| 375×667 | Karar | — | 59×101 |
| 320×568 | İlişki | 14×24 | 49×84 |
| 1440×900 | İlişki (masaüstü, değişmedi) | 85×146 | 85×146 |

Tarama (`sweep.mjs`, 47 ekran): 360×640, 375×667, 390×844, 412×915, 430×932, 768×1024, 1024×768, 1440×900, 1920×1080,
844×390, 667×375 → 47/47. 320×568 → 46/47: Günün kartı yorumunda anlatım kutusu bir an 9 px taşmış ölçüldü; dört ayrı çekimle
ayrıca ölçüldüğünde taşma 0 (kelimeler belirirken alınan geçici ölçüm). 496×789 → 44/47: Celtic Cross seçim ekranında yelpazenin
en sağdaki kartının köşesi 10. boş yuvaya 34 px² değiyor; bu ekran bu turda değişmedi, 496 genişlik önceki taramalarda yoktu.

Liste düzeltmesinden sonra yeniden: 320×568, 360×640, 390×844, 768×1024, 1440×900 → 47/47; 496×789 → 44/47 (aynı seçim ekranı).

Testler: `node --test tests/*.test.cjs` → 62/62.
Yeni ekran görüntüleri: `mobil/496-iliski-yorum`, `mobil/390-celtic-yorum`, `mobil/320-iliski-yorum`.
