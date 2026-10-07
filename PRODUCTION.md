# Miloruna yayın kurulumu

Bu sürüm 7 Ekim 2026'da [www.miloruna.com](https://www.miloruna.com) adresinde yayınlandı ve herkese açık adreste doğrulandı. Node.js 24 kullanır, uygulama ve sunucu için ek paket gerektirmez.

## Çalıştırma

```sh
npm test
npm run build
npm start
```

Önizleme `http://127.0.0.1:8769` adresinde yalnız `dist/` dosyalarını ve `/api/closing` işlevini sunar. Yerel `.env` otomatik okunmaz. Build; testleri, dokümanları, eski proxy'yi ve ortam dosyalarını yayın çıktısına almaz. Varlıklarda yalnız görsel/font dosyaları ve font lisansları kopyalanır; gizli dosyalar ve sembolik bağlantılar atlanır. GitHub CI test ve build çalıştırır.

## Vercel

Mevcut yayın projesi `berkaybilgenn/taroot`, ana adresi `https://www.miloruna.com` ve Node.js sürümü `24.x`. Yayın önce `vercel deploy --prod --skip-domain` ile hazırlanır; doğrulandıktan sonra `vercel promote` ile ana adrese geçirilir. `.vercelignore` gizli ortam dosyalarını, geliştirme proxy'sini, testleri ve tasarım/inceleme belgelerini kaynak yüklemesinden de çıkarır; font lisansları korunur.

Hobby hesabında son Git kaydının yazarı hosting sahibinin bağlı GitHub hesabıyla eşleşmelidir. Farklı bir kişisel/iş e-posta adresi kullanmak, aynı kişinin yerel kaydının hosting tarafından başka bir hesap olarak görülmesine neden olabilir. Yayın kaydında doğrulanmış proje sahibinin GitHub kimliği kullanılır; diğer projelerin genel Git ayarları değiştirilmez.

`vercel.json`, framework `Other`, build `npm run build`, output `dist` ve 30 saniyelik `/api/closing` işlevini tanımlar. Statik çıktı ve işlev aynı kökenden sunulur. Header kuralları içerik güvenliği, çerçeveleme koruması, kaynak türü kontrolü ve önbellek davranışını tanımlar. Google Analytics'in mevcut inline kodunun SHA-256 özeti CSP'de izinlidir; bu inline kod değişirse CSP özeti de güncellenmelidir.

## Bütünsel yorum ve Qwen bağlantısı

Bu sürüm SEO keşif sayfalarını ve bütünsel yorum arayüzünü birlikte içerir; ana seçim ekranı korunmuştur. Yorum sayfası önce genel yorumu gösterir. Çekilen kartların kısa açıklamaları ve diğer kartlarla bağlantıları kart ayrıntısında açılır. AI etkinleştirildiğinde bu bölümler aynı AI yanıtından gelir; ayrıntı açmak yeni bir model çağrısı oluşturmaz. AI kapalıyken mevcut yerel yorum motoru çalışır.

Üretimde AI varsayılan olarak kapalıdır. Server-side ortam değişkenleri:

| Ad | Açıklama |
| --- | --- |
| `ORACLE_ENABLED` | Yalnız `true` yeni AI üretimini açar; kayıtlı sonuç kapalıyken de okunabilir. |
| `QWEN_API_KEY` | Aynı Singapore çalışma alanının gizli anahtarı. |
| `QWEN_WORKSPACE_ID` | Örneğin `ws-…`; konsolun workspace-specific endpoint'i buradan kurulur. |
| `QWEN_MODEL` | Bu çalışma için `qwen3.8-flash`. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Ortak kalıcı Redis REST deposu. Üretimde zorunlu. |
| `ORACLE_SIGNING_SECRET` | En az 32 karakterlik rastgele ve kalıcı sunucu sırrı. |
| `ORACLE_BUDGET_USD` | Başlangıçta `10`; aynı Redis namespace'inin toplam harcama zarfı. |
| `ORACLE_DAILY_LIMIT` | Başlangıçta `2`; anonim tarayıcı başına Europe/Istanbul takvim gününde yeni okuma sınırı. |

Gizli değerler frontend'e, Git'e veya yayınlanan dosyalara girmez. `.env.example` yalnız boş örnek alanlar içerir. Yapılandırma veya Redis eksik/ulaşılamazsa yeni ücretli üretim başlamaz; kullanıcı yerel temel yorumu okuyabilir.

Qwen isteği OpenAI uyumlu Singapore çalışma alanı adresine gider. Günlük açılım 1024, diğer açılımlar 4096 çıktı tokenıyla sınırlıdır. Thinking kapalıdır; tek JSON yanıtı genel yorum, konum bağlamları ve bağlantıları birlikte içerir. Sunucu konumları, çekilen kartları, yönleri ve JSON yapısını doğrular. Kesilmiş veya bozuk yanıt yeniden üretilmez. Modele yalnız soru, seçenekler, kişi adı ve çekilen kartların yerel anlamları gönderilir; cihaz kimliği ve gizli deste sırası gönderilmez.

Bu hesaplamada Qwen3.8 Flash input fiyatı $0.15 / milyon token, output fiyatı $0.47 / milyon token kabul edilmiştir (7 Ekim 2026 [resmi Singapore fiyatları](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-flash)). Cache indirimi hesaba katılmaz. Model ve fiyatlar yayından önce resmi fiyat ekranıyla yeniden karşılaştırılmalıdır; fiyat değişirse `server/oracle-config.js` fiyat tablosu güncellenir. Bu model adı güncellenebilir bir alias'tır; sabit snapshot garantisi yoktur.

Bütçe tamsayı nanodollar olarak tutulur (1 USD = 1,000,000,000 birim). Kabul sırasında giriş metninin UTF-8 boyutuna dayanan üst sınır ve maksimum çıktı maliyeti atomik olarak ayrılır. Ortak `spent + reserved` toplamı zarfı aşan yeni çağrılar reddedilir. Geçerli sağlayıcı kullanım verisi geldiyse gerçek token miktarıyla kapatılır; miktar eksik veya güvenilir değilse rezervasyonun tamamı tutulur. Ağ hatası, zaman aşımı, sağlayıcı hatası ve belirsiz sonuç maliyet defterinde ihtiyatlı şekilde üst sınırdan sayılır. Bu defter Alibaba faturası değildir; özellikle reddedilen isteklerde gerçek ücret oluştuğu anlamına gelmez.

Sunucu tarafından imzalı HttpOnly sahiplik çerezi ve okuma bileti kullanılır. Aynı okuma kimliğiyle kart, yön, soru veya seçenek değiştirmek yeni üretim sağlamaz. Paralel istekler aynı kayda yönlenir. Bekleyen kayıt 30 saniye sonra belirsiz olarak kapanır; otomatik yeniden deneme yapılmaz. Başarılı sonuç 180 gün tutulur, üretim kaydı/tombstone ve toplam bütçe sayacı kalıcıdır. Süresi bitmiş sonuç aynı okumayı yeniden ücretlendirmez. Sırrı veya Redis verisini değiştirmek sahipliği/bütçe korumasını etkileyebileceği için yayında korunmalıdır.

Gövde sınırı 16 KB, sağlayıcı zaman aşımı 20 saniye, yanıt sınırı 64 KB'dır. Redis üzerindeki IP burst sınırı oturum/üretim için dakikada 6, yalnız durum okuma için ayrı dakikada 12 istektir; tüm sunucu örneklerinde paylaşılır. Durum sorguları model çağrısı oluşturmaz; ayrı sayaç, bekleyen yorum kontrollerinin üretim hız sınırına takılmasını engeller. Bu uygulama zarfı yalnız kendi Qwen çağrılarını kapsar; aynı anahtarın başka uygulamalardaki harcamasını sınırlamaz. Redis hizmetinin ücretleri token zarfının dışında kalır.

## Yerel deneme

```sh
npm run local
```

Bu komut `.env.local` dosyasını okur, yoksa kalıcı imza sırrı ekler, build alır ve yalnız `127.0.0.1:8771` üzerinde sunar. Yerel tek süreç için `.local-data/oracle.json` kalıcı defter kullanılır; kilit dosyası iki önizleme sürecinin aynı deftere yazmasını engeller. Bu depo üretim için kullanılmaz; Vercel işlevi Redis gerektirir. `.env.local` ve `.local-data` yayın çıktısından ve Git'ten dışlanmıştır. Yerel testte günlük kota 20'dir; üretim örneği 2 olarak kalır.

`npm start`, ortam dosyası okumayan normal 8769 önizlemesidir. Gerçek API testleri ayrıca `node scripts/live-samples.cjs` ile açıkça başlatılır; günlük, üç kart, bir kartı değiştirilmiş üç kart ve Celtic Cross örneklerini yerel sunucu üzerinden dener. Her çalıştırma yeni okuma kimlikleri kullanır ve AI açıksa ücret oluşturabilir. Yeniden açma/sayfa yenileme/kart ayrıntısı mevcut kaydı kullanır.

7 Ekim 2026 gerçek bağlantı denemesinde dört örnek Alibaba'ya ulaştı fakat `403 AccessDenied.Unpurchased` ile reddedildi. Gerçek model metni ve token kullanım verisi alınmadı. Resmi hata rehberi bu kodu Model Studio hizmetinin etkinleştirilmemesiyle açıklar: Singapore bölgesinde hesap kaydı ve gösteriliyorsa hizmet sözleşmesi tamamlanmalıdır. Etkinleştirmeden sonra yeni bir test okuması gerekir; önceki belirsiz kayıtlar otomatik tekrar gönderilmez.

Otomatik testler, gerçek HTTP yolu ve enjekte edilmiş örnek sağlayıcıyla başarılı JSON, aynı sonucun tekrar kullanılması, bütçe/kota ve hata akışını doğrular. Gerçek Upstash hesabı bağlı olmadığı için Redis Lua betikleri gerçek servis üzerinde denenmemiştir. Gerçek Qwen yorum kalitesi ve üretim Redis bağlantısı, üretimde AI etkinleştirilmeden önce ayrıca doğrulanmalıdır. Ayrıntılı yerel sonuçlar `VERIFICATION-HOLISTIC.md` dosyasındadır; rapor yayın öncesindeki yerel doğrulamayı kaydeder.

## Kayıtlar ve hatırlatma

Geçmiş tarayıcının yerel depolamasındadır. Bozuk kayıtlar içinden geçerli okumalar korunur ve `kd.readings.v1.recovery` alanına kurtarma kopyası alınır. Ekrandaki indirme düğmesi bu kopyayı dışa aktarır. Yedek alınamıyorsa yeni kayıt yazımı orijinal bozuk veriyi ezmez. Dolu depolama kullanıcıya yer açıp yeniden deneme yolu sunar.

Günlük hatırlatma `.ics` takvim dosyasıdır. Kullanıcı dosyayı takviminde açıp günlük etkinliği kaydeder. Saat floating local time olarak yazılır; içe aktarıldığı takvimin yerel saat dilimi geçerlidir. Bildirimi takvim uygulaması ve izinleri yönetir. Uygulama kapalıyken web bildirimi gönderildiği iddia edilmez. Saati sonradan değiştirmek için takvim etkinliği düzenlenir; uygulamadaki saat bir sonraki dosya içindir.

## Kaynaklar

- [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel build/output ayarları](https://vercel.com/docs/builds/configure-a-build#output-directory)
- [iCalendar standardı, RFC 5545](https://www.rfc-editor.org/rfc/rfc5545)

Yayın öncesi testlerin kesin sonucu ve fiziksel cihaz/canlı hizmet sınırları ayrıca hazırlanan doğrulama raporunda bulunur.
