# Genel yorum önce, kart ayrıntıları dokununca

Durum: Kullanıcı 2026-10-07 tarihinde ana seçim ekranının korunacağını netleştirip “tamam yap” diyerek yazılı tasarımı onayladı. Ürün koduna henüz uygulanmadı; yazılı uygulama planı inceleme aşamasında.

## Kullanıcının istediği sonuç

Okuma tamamlandığında kullanıcı doğrudan kartların birlikte anlattığı genel yoruma ulaşır. Her kartın uzun açıklamasını sırayla okumak gerekmez. Bir karta basınca kartın temel anlamı, açılımdaki konumunun yorumu ve diğer kartlarla bağlantısı açılır. Ana yorum ve açılıma özel kart ayrıntıları tek AI üretiminde hazırlanır, kaydedilir; ayrıntı açmak ücretli istek oluşturmaz.

İsteğe bağlı soru aynı ekranda kalır. Yeni alt soru ekranı, sohbet ve takip sorusu eklenmez. Kart seçimi, açılım türleri ve mevcut görsel dil korunur. AI yorumunun Türkçe anlatımı, kartların konumları ve ilişkilerine dayanır; kullanıcının vermediği özel hayat bilgileri uydurulmaz.

## Yaklaşım

Seçilen yaklaşım: Qwen tek istekte bütünsel yorum ve konuma özel kısa kart açıklamaları üretir. Kartların temel anlamı mevcut yerel veri kaynağından gösterilir. Sunucu sonucu ve ücretli üretim durumunu kalıcı olarak kaydeder. Bu yaklaşım hem anlatımı hem tekrar kullanım maliyetini kontrol eder.

Değerlendirilen alternatifler: Yalnızca yerel şablonların yerini değiştirmek genel yoruma erişimi kolaylaştırır fakat kullanıcının eleştirdiği anlatım sorununu çözmez. Her karta basıldığında AI çağırmak maliyeti ve beklemeyi artırır; seçilmedi.

## Okuma ekranı

- İlk bölümün başlığı **Genel yorum** olur. Hazırsa kaydedilmiş yorum hemen gösterilir; üretim sürüyorsa **Kartların birlikte anlattığı yorum hazırlanıyor.** yazısı görünür.
- Çekilen kartlara aynı ekrandaki görünür kart düğmelerinden ulaşılır. Kartlar yorum metnini okumayı engellemez; tüm açılımlarda, günlük tek kart dahil, ayrıntı erişimi vardır.
- Ana ileri/geri akışı yalnızca genel yorumun sayfaları ve bitiş bölümünden oluşur. Kart anlamları, eski ayrı özet, pozisyon çiftleri ve karşılaştırma bölümleri zorunlu okuma sırasından çıkarılır. İki yol karşılaştırması ve Celtic bağlantıları genel yorumun içinde yer alır.
- Karta basınca mevcut kart ayrıntısı penceresi açılır. İçerik: **Kartın anlamı**, **Bu açılımdaki yeri**, **Diğer kartlarla bağlantısı**. Son iki bölüm kaydedilmiş AI verisinden gelir. Günlük kartta diğer kartlarla bağlantı bölümü bulunmaz.
- Pencereyi kapatınca genel yorumun aynı sayfasına dönülür. Klavye odağı açan düğmeye döner; Escape ve ekran okuyucu desteği korunur. Taşan ayrıntı pencere içinde kaydırılabilir.
- Kart rehberinden açılan pencere yalnızca temel anlamları gösterir. Başka bir okumanın bağlamı rehbere veya yeni açılıma taşınmaz. Düz/ters anahtarı temel anlamı değiştirir; bu açılımda çekilmiş yönün bağlamı sabit kalır ve belirtilir.

## Tek üretimin içeriği

Sunucu kart ve pozisyonları yerel veri kaynaklarından doğrular; istemciden gelen hazır talimat veya kart anlamını kabul etmez. Soru, seçenekler ve kişi adı veri olarak işlenir, sistem talimatını değiştiremez.

AI yanıtı sürümlü JSON olur:

```json
{
  "version": 1,
  "general": "Paragraflardan oluşan bütünsel Türkçe yorum",
  "positions": [
    {
      "positionKey": "present",
      "context": "Bu kartın bu konumda, bu soruya ilişkin yorumu",
      "connections": [{"positionKey": "past", "text": "İki kartın birlikte söylediği"}]
    }
  ]
}
```

Pozisyonlar çekilen kartlarla birebir örtüşür. Bağlantılar yalnızca bu okumadaki farklı pozisyonları işaret edebilir. Çok kartlı açılımda her kart için en az bir, en çok iki bağlantı bulunur; günlük kartta dizi boştur. Sunucu tipleri, boyutları, pozisyon sayısını, benzersizliği ve bağlantı anahtarlarını doğrular. Eksik veya hatalı JSON sonucu başarılı yorum olarak kaydetmez; ikinci ücretli düzeltme isteği yapılmaz. Kullanıcıya gösterilen metin HTML olarak çalıştırılmaz.

Hedef uzunluklar: Günlük yorum 80–140 kelime; üç kart 180–280; ilişki, iş/para ve karar 220–350; Celtic Cross 320–450. Her kartın bağlamı 25–45, her bağlantısı 15–25 kelimeyi hedefler. Bunlar anlatım hedefleridir; çıktı sınırı ve yapısal doğrulama ayrıca uygulanır. API çıktısı günlük için en fazla 1024, diğerleri için en fazla 4096 token ile sınırlanır.

Soru varsa yorum doğrudan ona döner; yoksa seçilen açılımın konumları çerçeve oluşturur. Geçmiş–şimdi–gelecek değişimini, ilişki dinamiğini, iş/para engel–güç–yön ilişkisini, A/B yollarının fırsat ve bedellerini, Celtic Cross'un temel karşıtlıklarını kullanır. Kartları değiştirmek yorumun ana gerekçesini değiştirmelidir. Kesin gelecek, tarih ve başka kişinin zihnini bildiği iddiası kullanılmaz. Sahte deneyim iddiası olan “otuz yıllık usta” talimatı kaldırılır.

## Sağlayıcı ve kayıt

Başlangıç sağlayıcısı Qwen, model tercihi Qwen 3.7 Flash olur; model sunucudaki yapılandırmadan seçilir. API anahtarı yalnızca sunucu ortam değişkeninde tutulur. Canlı hesap bağlantısı ve ücretli kalite denemesi bu tasarımın uygulanmasından ayrı bir hazırlık adımıdır; modelin Türkçe kalitesi henüz ölçülmüş sayılmaz.

Kalıcı ortak kayıt için Upstash Redis REST kullanılır. Yeni servis hesabı otomatik açılmaz. Gerekli bağlantı ve anahtarlar yoksa ücretli üretim kapalı kalır; yerel yorum çalışır. Servisin kendi ücretleri AI token bütçesinden ayrıdır.

Bir okumanın sahibi sunucunun imzaladığı anonim, HttpOnly ve Secure çerezle tanımlanır. Anahtar; sahip, okuma kimliği ve sunucunun doğrulanmış soru/pozisyon/kart/yön verilerinden oluşturduğu parmak izine bağlıdır. Aynı kimlik farklı veriyle gönderilirse 409 döner. İstemci kimliğine tek başına güvenilmez.

Sunucu durumları `pending`, `ready`, `failed` ve `unknown` olur. İşlem öncesi kayıt/harcama rezervasyonu atomik yapılır. Aynı okuma için eşzamanlı istekler tek ücretli üretime gider; diğerleri durumu okur. Tarayıcı kapanınca üretimin sonucu sunucuda kalır. `ready` sonuç, kota veya bütçe bitmiş olsa da alınabilir. Açılmış kart ayrıntıları yalnızca bellekteki/kaydedilmiş sonuçtan okunur.

Başarılı sonuçlar sunucuda 180 gün, istemcide mevcut yerel geçmiş politikası boyunca tutulur. Sunucu kaydı süresi dolmuş eski okumayı kendiliğinden yeniden üretmez; yerel kayıt varsa gösterilir. Eski okuma kimliğinin sona erdiği sunucu tarafından imzalı kayıt biletinden anlaşılır. Ham sorular sunucu günlüklerine yazılmaz; kayıt için gereken parmak izi ve yorum sonucu tutulur.

Ağ hatası ve zaman aşımında sağlayıcının ücret kesip kesmediği bilinmeyebilir. Böyle okumalar `unknown` olur; rezervasyon korunur, otomatik yeniden üretim yapılmaz. Süresi dolan işlem kilidi de tekrar ücretli üretime açılmaz. Yalnızca durum sorgulama ve hazır sonucu alma ücretli AI isteği olmadan tekrarlanabilir.

## Maliyet kontrolü ve hata davranışı

Önerilen başlangıç ayarları: AI üretimi yapılandırma tamamlanana kadar kapalı, toplam token harcama zarfı 10 USD, anonim tarayıcı başına günde en fazla iki yeni AI okuması. Gün sınırı Europe/Istanbul takvim günüdür. Bunlar kullanıcıya abonelik olarak sunulmaz ve teknik ayarlardan değiştirilebilir. Anonim kota kişi kimliği garantisi değildir; toplam ortak bütçe sınırı belirleyicidir.

Global bütçe, günlük kota ve üretim sahipliği Redis'te tek atomik işlemle ayrılır; Vercel örneğine özel bellek sınırına dayanılmaz. İstek boyutu ve çıktı sınırı için muhafazakâr üst maliyet rezervasyonu yapılır. Sağlayıcının döndürdüğü doğrulanmış kullanım ile rezervasyon kapatılır; kullanım bilinmiyorsa rezervasyon harcanmış kabul edilir. Fiyatlar sunucudaki açık sürümlü ayarlardır. Sağlayıcı fiyatları/hesap faturası, vergi ve servis ücretleri nedeniyle uygulama sınırı hesap bakiyesinin birebir garantisi olarak pazarlanmaz. Hesaptaki harcama sınırı ve otomatik yükleme ayarı ayrıca kontrol edilir.

API yapılandırılmamışsa, bütçe/kota dolmuşsa veya sağlayıcı başarısızsa genel yorum bölümü mevcut yerel sentezi gösterir. Yanına kısa durum yazısı gelir: **Şu anda temel yorum sunuluyor. Kişisel yorum geçici olarak kullanılamıyor.** Yeni açılım akışı kesilmez. Yerel kart bağlamı ayrıntıda kullanılabilir; AI üretimi gibi etiketlenmez. Geçici yerel sonuç başarılı AI kaydı olarak işaretlenmez.

Benzerlik nedeniyle ikinci üretim yapan mevcut `attempt` döngüsü kaldırılır. Sayfa yenileme, geçmişten açma, karta dokunma, ileri/geri veya yeni yorum sürümü eski başarılı yorumu yeniden üretmez. Önceden kaydedilmiş düz metin AI yorumları korunur ve ilk bölümde gösterilir; kart ayrıntıları yerel veriyle doldurulur.

## Değişiklik sınırları

Asıl güncel kaynak `/Users/kberkaybilgenn/.codex/.chatgpt-projects/g-p-6ac4b14685f48191a97bbfec963958e3/production` içindedir. Buradaki bekleyen SEO değişiklikleri ve İş / Para adı korunur. Uygulama aşamasında güncel kaynak ve mevcut değişiklikleri içeren yazılabilir, ayrı bir çalışma kopyası hazırlanır; bu sohbetin eski `tarot-fix` kopyası kaynak alınmaz. `sources/` salt okunur kalır.

Hedef alanlar: `oracle.js` üretim talimatı/istemci sözleşmesi; `server/oracle-handler.js` doğrulanmış istek ve sağlayıcı bağlantısı; yeni sunucu kayıt/bütçe modülü; `reading.js` sürümlü sonuç kaydı; `ui-helpers.js` yorum sırası; `app.js` ana yorum ve kart ayrıntısı; `index.html` mevcut penceredeki ek alanlar; gerekli sınırlı stil ve önizleme/build uyumu. Yayına alma, gerçek API harcaması, ücretli hesap açma ve anahtar paylaşımı bu uygulama onayının otomatik sonucu değildir.

## Kabul ve doğrulama

1. Altı açılımın hepsinde tamamlandıktan sonra ilk görünür bölüm Genel yorum olur; kart açıklaması sayfalarını geçmek gerekmez.
2. Bir kart açılıp kapandığında yorum sayfası ve odak korunur; anlam, konum ve bağlantı doğru karta/yöne aittir. Rehber ve önceki okumadan veri sızmaz.
3. Bir AI yanıtından genel yorum ve tüm kart ayrıntıları kaydedilir. Tıklama, yenileme ve eşzamanlı isteklerde sağlayıcı çağrı sayısı artmaz.
4. Farklı pozisyon, terslik, soru ve A/B seçenekleri doğru isteme taşınır. Hayali kart/pozisyon ve hatalı yanıtlar reddedilir; otomatik ücretli düzeltme yapılmaz.
5. Bütçe sınırında eşzamanlı yeni okumalar toplam rezervasyonu aşamaz; hazır kayıtlar okunur. Redis veya API çalışmadığında ücretli çağrı yapılmaz ve yerel yorum görünür.
6. Zaman aşımı ve tarayıcıdan ayrılma ikinci üretime yol açmaz; başarılı sunucu sonucu sonradan alınır. Eski düz metin kayıtları ve yerel depolama kurtarma davranışı korunur.
7. Mevcut testler ve üretim derlemesi geçer. Yeni sunucu maliyet/eşzamanlılık testleri sahte sağlayıcı ve denetlenebilir kayıt katmanıyla çalışır; AI hesabına ücretli çağrı yapmaz.
8. Mobil ve masaüstünde genel yorum erişimi, kart ayrıntısı, Escape/klavye ve uzun Türkçe metin kontrol edilir. Gerçek model kalitesi ancak ayrıca kontrollü örnek okumalarla değerlendirilir; geçerli JSON veya uzun metin tek başına iyi tarot yorumu kanıtı sayılmaz.
