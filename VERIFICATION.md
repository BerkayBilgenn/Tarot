# Miloruna yayın adayı — doğrulama

Tarih: 7 Ekim 2026. Temel sürüm: `14f222dd036b7d83edddfb03b21884d0d2cc70da`. Çalışma dalı: `codex/production-readiness-2026-10-07`.

Ana daldaki `07fac70` PNG/ICO favicon güncellemesi de yayın adayına alındı. İki dosyanın build'e dahil edilmesi ve doğru içerik türüyle HTTP'den sunulması ayrıca sınandı.

## Sonuç

İncelemede doğrulanan uygulama hataları giderildi. Yerel yorumla çalışan, test edilmiş yayın adayı hazırlandı. Canlı yayın yapılmadı. Gerçek AI hizmeti, hosting ayarları ve fiziksel cihaz testleri aşağıdaki kapsam sınırlarıyla ayrı değerlendirilmelidir.

## Değişiklikler

- Kısa masaüstü önizlemelerinde üç kart, ilişki ve kariyer kartları artık küçülüp kaybolmuyor; içerik ve eylemler kaydırılarak erişiliyor. Çok kısa ana ekranlarda başlangıç düğmesi erişilebilir.
- Uzun yorumlarda tekerlek önce mevcut metni kaydırıyor. Klavyede Home/End ile seçilen yelpaze kartı ekrana getiriliyor.
- Büyük kart görünürken etkileşime kapatılmış harita hem telefon hem masaüstünde klavye odağından çıkarılıyor. Genel bakışa dönünce odak erişimi geri geliyor; yeniden boyutlandırma bu durumu koruyor.
- Dolu depolama mevcut geçmişi boş bir oturumla değiştirmiyor. Yeni okuma, seçim, yorum hazırlama, kart açma ve tamamlama hatalarında yeniden deneme mümkün. Kapanış metni kaydedilemese de görünen yorum korunuyor.
- Depolama izni tamamen kapalıysa geçici oturum çalışıyor; sayfa kapanınca kayıtların kaybolacağı belirtiliyor. Ayar yazma hataları akışı bozmuyor.
- Bozuk kayıtlar ayıklanıyor, geçerli kayıtlar korunuyor ve orijinal veri kurtarma dosyasıyla indirilebiliyor. Yedek yazılamıyorsa orijinal kayıt ezilmiyor. Kurtarma kopyası sayfa yenilemesinden sonra da erişilebilir. Bozuk yorum önbelleği çekilmiş kartlar değiştirilmeden yeniden üretiliyor.
- Karar açılımında iki zorunlu alanın gerekliliği görünür yardım metniyle açıklanıyor.
- Çalışmayan web bildirimi seçeneği, seçilen saatte her gün yineleyen alarmlı `.ics` takvim dosyasıyla değiştirildi. Kullanıcı etkinliği takviminde kaydetmeli; bildirimleri takvim uygulaması yönetir.
- AI isteği ziyaretçinin localhost adresi yerine `/api/closing` işlevine gidiyor. Sunucuda kart/gövde doğrulaması, süre ve cevap sınırları, köken kontrolü ve istek sınırlaması var. API anahtarı yalnız sunucu ortamında kullanılıyor. Hata ve eksik ayarlarda yerel yorum korunuyor.
- Mobil ana görsel ayrı ve daha küçük bir dosyadan yükleniyor. Sıkıştırma, önbellek ve güvenlik başlıkları tanımlandı.
- Yayın çıktısı yalnız izin verilen uygulama/varlık dosyalarından oluşuyor. Ortam dosyaları, geliştirme proxy'si, testler, dokümanlar, gizli varlık dosyaları ve sembolik bağlantılar dışarıda kalıyor. Otomatik test/build iş akışı eklendi.
- On kartlık paylaşım görselindeki eksik yatık kart etiketi giderildi. Dışa aktarılan görselde on kartın tamamı adı, terslik bilgisi ve numaralı konumuyla gösteriliyor.

## Doğrulama sonuçları

| Kontrol | Sonuç |
| --- | --- |
| Birim ve yerel HTTP testleri | **116/116 geçti** |
| Responsive tam tur, Chromium | **147/147 akış geçti**; 21 ekran ölçüsü, altı açılım ve yardımcı ekranlar |
| Yorum sayfaları, tam tur | **2.638 sayfa** gezildi; rastgele çekimlerde sayfa sayısı değişebilir |
| Responsive/odak/tekerlek regresyonları | Chromium **11/11**, WebKit **11/11** |
| Depolama, bozuk kayıt ve izin reddi | Chromium **9/9**, WebKit **9/9** |
| Takvim/yedek/AI fallback/paylaşım çıktıları | Chromium **10/10**, WebKit **10/10** |
| Animasyonlar açık akışlar | **6/6 geçti**; 390×844, 1440×900, 568×320; üç ve on kart açılımları; 169 yorum sayfası |
| Build, sözdizimi ve fark biçimi | Geçti; CSP inline kod özeti eşleşti, yayın çıktısında özel dosya bulunmadı |

Tam turda uygulama hatası ve beklenmedik ağ hatası **0**. Odaklı tarayıcı turlarında da uygulama hatası **0**. AI yapılandırılmadığında beklenen 503 cevabı, hata dönüşü testi kapsamında yerel yorumla tamamlandı.

Responsive ölçüler: 320×568, 360×640, 375×667, 390×844, 412×915, 430×932, 496×789, 600×800, 768×1024, 820×1180, 900×700, 901×700, 1024×768, 1180×820, 1280×720, 1366×500, 1440×900, 1920×1080, 2560×1440, 568×320, 844×390. Başlangıç düğmesi ayrıca 461 ve 480 piksel yüksekliklerde sınandı.

Tam geometri taraması 6.281 ham aday işaretledi. Bunlar doğrudan hata sayısı değildir: kart odağı sırasında küçültülen/örtülen harita kontrolleri, Celtic Cross'un bilinçli kesen kartı ve iki önizleme hover yükselmesi bu ölçüme girer. Ekran görüntüleri, alternatif konum listesi ve hedefli odak testleriyle incelendi. Haritanın etkileşime kapalı durumunda klavye odağında kalması ayrıca düzeltilip iki motorda tekrar sınandı.

## Performans

390×844, boş önbellek, Analytics isteği testte durdurulmuş, yerel yayın önizlemesi. Yavaş profil: 1,5 Mbps indirme, 150 ms gecikme ve 4 kat CPU yavaşlatma. Bu laboratuvar ölçümüdür; canlı CDN ve gerçek kullanıcı verisi değildir.

| Ölçüm | Önce | Sonra |
| --- | --- | --- |
| İlk mobil kaynak aktarımı | 1.405.123 bayt | Yaklaşık 600.646 bayt (**%57 daha az**) |
| Ana kart şeridi görseli | 607.440 bayt | 165.014 bayt (**%73 daha az**) |
| Yavaş profilde LCP | 8,092 sn | 3 tekrar: **3,688 / 3,684 / 3,688 sn** |

Yerel hızlı ölçüm LCP: 0,320 sn. Yavaş profildeki yaklaşık 3,69 sn sonucunu 2,5 sn altı garantisi olarak değerlendirmemek gerekir. Yayın sonrası gerçek ölçümlere göre mobil arka plan ve ilk yüklenen yorum verileri daha da küçültülebilir.

## Canlı yayın ve doğrulanmamış alanlar

- Vercel yayını yapılmadı; yapılandırma yerelde build ve HTTP testlerinden geçti. Önceki deployment adresi giriş sayfasına yönlendiği için herkese açık canlı akış doğrulanmış değil.
- NVIDIA'ya gerçek istek yapılmadı. Başarılı ve başarısız sağlayıcı cevapları kontrollü test verileriyle sınandı. Canlı AI için hosting'de `NVIDIA_API_KEY` ve erişilebilir `NVIDIA_MODEL` tanımlanmalı; toplam trafik/maliyet için hosting firewall ve sağlayıcı bütçe sınırı da ayarlanmalı. İşlev içindeki IP sınırı örnek başınadır, dağıtık global sınır değildir.
- Fiziksel iPhone/Android cihazları, sistem paylaşım menüsünün gerçek tamamlanması, takvim uygulamasına gerçek içe aktarma ve arka plan bildirimi doğrulanmadı. Paylaşım dosyası ve native paylaşım API'sine verilen dosya iki motorda sınandı; native API testi kontrollü bir yerine koyma kullanır.
- WebKit, Safari motoru kapsamı sağlar; bu fiziksel iOS Safari testi değildir. Firefox iki açılış denemesinde macOS sandbox/ekran oluşturma hatasıyla başlayamadı. Firefox sonucu **doğrulanmadı**, başarılı sayılmadı.
- Bağımsız kod incelemesi depolama eksiklerini belirledi; bu bulgular giderilip test edildi. İnceleme kullanım sınırı nedeniyle kısmen tamamlandı; son kaynak incelemesi ana ajan tarafından yürütüldü.

## Kanıt dosyaları

Proje çalışma alanındaki `design-plans/production-results/` klasöründe `unit-tests.txt`, `full-chromium/responsive-report.json`, `regression-*.json`, `storage-*.json`, `artifacts-*.json`, `motion/report.json`, `performance.json`, paylaşım görselleri, takvim dosyaları ve yayın dosyalarının SHA-256 manifesti bulunur. Yayın kurulumu `PRODUCTION.md` içinde açıklanır.
