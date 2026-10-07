# Miloruna yerel bütünsel yorum doğrulaması

7 Ekim 2026. Çalışma bu klasördeki ayrı kopyada yapıldı; mevcut yayın değiştirilmedi.

## Yapılan değişiklik

Altı açılım genel yorumla açılır. Kartın temel anlamı, açılımdaki konumu ve diğer kartlarla bağlantıları kart ayrıntısında gösterilir. Tek AI yanıtı bütün bölümleri birlikte üretir. Kayıtlı yorum yeniden açılırken ve kart ayrıntısına girilirken model tekrar çağrılmaz. Eski düz metin AI yorumları korunur.

Qwen3.8 Flash bağlantısı sunucu üzerinden kurulmuştur. Anahtar yalnız Git'in dışladığı `.env.local` içindedir ve dosya izinleri 600'dür. $10 ortak zarf, paralel rezervasyon, imzalı oturum/okuma bileti, günlük kota ve belirsiz sonuçta tekrar üretmeme kontrolleri eklendi.

## Kontroller

- Başlangıç sürümü: 125 otomatik test geçti.
- Bu sürüm: 151 otomatik test geçti; build başarılı. Son bağımsız incelemenin üç somut bulgusu düzeltildi.
- Gerçek yerel HTTP yolu: başarılı JSON, kaydın tekrar kullanılması, bekleyen yorum/status, kota, API kapalı durumu ve gizli dosyaların 404 dönmesi sınandı. Sağlayıcı bu kontrollerde örnektir; ücret oluşmaz.
- Diskteki bütçe deposu: paralel kabul, bir defa hesap kapatma, değişmiş girdi reddi, günlük kota ve eski/belirsiz kaydın tekrar üretilmemesi sınandı.
- Redis REST: yetkili EVAL isteği, servis hatasında kapalı kalma ve boş günlük bağlantı dizisinin korunması sınandı. Gerçek Redis hesabında Lua yürütmesi henüz doğrulanmadı.
- Tarayıcı: günlük ters kartta yerel yedek yorum, genel yorumun önce açılması, yön değişince çekilen yönün konum açıklamasında korunması ve Escape ile açan karta odak dönüşü doğrulandı.
- Örnek yanıtla tarayıcı: Celtic Cross'ta 10 kart şeridi, uzun genel yorumun sayfalanması, doğru kart/konum bağlantıları ve rehberde açılım bağlamının temizlenmesi doğrulandı. İş / Para, Karar (A/B etiketleriyle) ve üç kart yorumları da başarılı örnek yanıtla doğrulandı. Gerçek deneme ile örnek sunucu farklı yerel hostname kullanarak oturumları ayırdı. 390×844 mobil ve 1440×900 masaüstünde yatay sayfa taşması yok. Görseller `evidence/` klasöründedir ve gerçek Qwen metni değildir.

## Son incelemeden gelen düzeltmeler

Başarılı yorum, cihaz depolaması üretim sırasında dolsa da bellekte ve ekranda korunur; kaydedilemediği açıkça söylenir. Yerel yedek yorumun kaydı da başarısız olursa hazırlanıyor durumu kapanır. Kayıt biletini yazma hatası sağlayıcının başarılı yanıtını veya asıl hata türünü değiştirmez.

Durum sorgularına üretimden ayrı 12/dakika sınır kondu; oturum/üretim 6/dakika olarak kaldı. Boş bir bilet açıkça verilmişse ücretli çağrı başlamadan reddedilir. Bu üç hata önce başarısız testle yeniden üretildi, sonra düzeltmeyle geçti. Gerçek `fillClosing` ve `setClosingText` işlevlerini çalıştıran test, A'nın geç gelen sonucunun A'ya kaydedildiğini, B'nin görünür metninin ve durumunun değişmediğini de doğrular.

## Gerçek API sonucu

Dört karşılaştırma örneği ve bir etkileşimli günlük açılım Alibaba'ya ulaştı. Servis `403 AccessDenied.Unpurchased` döndürdü. Model metni veya token kullanım verisi alınmadığı için yorum kalitesi ve gerçek yorum başına maliyet henüz ölçülmedi. Yerel defter hatalı/belirsiz çağrıyı ihtiyatlı rezervasyon üst sınırından sayar; bu tutar gerçek Alibaba ücretini doğrulamaz.

[Alibaba'nın hata açıklaması](https://www.alibabacloud.com/help/en/model-studio/error-code), Model Studio hizmetinin etkinleştirilmesini, bölgenin seçilmesini ve hesap kaydının tamamlanmasını ister. Singapore hizmeti etkinleştirildiğinde yeni bir okuma kimliğiyle gerçek deneme yapılmalıdır. Önceki belirsiz okumalar otomatik yeniden gönderilmez.

## İncelemede hüküm verilmeyen alanlar

- Gerçek Qwen metni ve faturası: servis erişimi reddedildiği için hüküm verilmiyor; örnek ekran metinleri kalite kanıtı değildir.
- Gerçek Redis Lua uyumu: hesabı bağlı değil; üretim etkinleştirilmeden önce servis üzerinde kontrol gerekir.
- Fiziksel cihaz ve kapsamlı yardımcı teknoloji davranışı: mobil/masaüstü tarayıcı kontrolleri yapıldı; fiziksel cihaz veya tam ekran okuyucu uyumu iddia edilmiyor.
- Güncel fiyat doğruluğu: inceleme sonrası resmi Singapore model sayfası kontrol edildi; $0.15 giriş ve $0.47 çıkış/milyon token kullanıcı ekranıyla eşleşiyor. Gelecekte fiyat değişikliği bütçe hesabını etkiler.

## Kararlar ve sınırlar

- Kullanıcının son tercihiyle planın 3.7 modeli yerine `qwen3.8-flash` seçildi; maliyet $0.15/$0.47 milyon giriş/çıkış tokenı olarak hesaplanır. [Resmi Singapore fiyatı](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-flash) ayrıca doğrulandı; fiyat değişirse bütçe hesabı yeniden doğrulanmalıdır.
- Kullanıcının son izniyle canlı yerel çağrı yapıldı. Anahtar sunucuda kalır; başarılı testler küçük token ücreti oluşturabilir.
- Yerel tek süreç için disk deposu eklendi. Üretim Redis olmadan ücretli üretime başlamaz; disk deposu üretimde kullanılırsa dağıtık bütçe güvencesi vermez.
- Ayrı bellek testi deposu yerine gerçek disk deposu test edildi. Gerçek Redis Lua doğrulaması yayın öncesinde gereklidir.
- Yerel karşılaştırmalar için günlük kota 20, üretim örneğinde 2'dir. Yerel kotayı üretime taşımamak gerekir.
- Offline UI araç komutu bulunamadığı için mevcut erişilebilirlik talimatlarıyla sınırlı kontrol yapıldı. Tam otomatik erişilebilirlik denetimi yapılmadı.

Bu kopya yalnız yerel deneme içindir. Yayına alınmadan önce gerçek Qwen yanıtı, Redis bağlantısı ve sağlayıcı fiyatları doğrulanmalıdır.

- Durum okumaları için ayrı 12/dakika sayaç seçildi; ücretli üretim 6/dakika olarak kaldı. Bunun bedeli biraz daha fazla durum okuma trafiğidir; model maliyeti artmaz.
- Boş biletten ücretli çağrı başlaması incelemedeki minor seviyesinden önemliye yükseltildi ve düzeltildi; bozuk biletler artık yeni bir okumaya dönüşmez.

Sonuç: inceleme bulguları düzeltildi; ertelenen minor bulgu yok. `local/holistic-qwen` dalı ve 8771 yerel önizleme korunur. Yayın yapılmadı. Tüm uygulama kararlarının ve test adımlarının kaydı `docs/implementation-decisions.md` içindedir.
