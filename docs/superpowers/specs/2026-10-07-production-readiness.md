# Miloruna yayın adayı

Amaç: 7 Ekim incelemesinde tekrar üretilen dokuz sorunu gidermek ve güvenilir bir yayın paketi hazırlamak. Mevcut lacivert/altın tasarım, altı açılım ve yerel yorum korunur.

Kabul koşulları:
- 320 px telefonlar, kısa masaüstü ve yatay ekranlarda eylemler ve pozisyon açıklamaları erişilebilir kalır; önizleme kartları 8 px'e düşmez.
- Yorum içeriği kayarken bölüm değişmez; kaydırma sınırında bölüm gezintisi kullanılabilir.
- Yelpazede klavye ile seçilen kart görünür olur. Mobil büyük kart küçük haritayı örttüğünde harita odak alamaz; geniş ekran/özet durumunda yeniden etkinleşir.
- Dolu depolama hem otomatik hem elle karıştırmada anlaşılır hata verir ve tekrar denemeye izin verir. Bozuk kayıtlar açılışı/geçmişi çökertmez; geçerli kayıtlar korunur ve kurtarma kopyası alınır.
- Karar alanlarının zorunluluğu ve ilerleme koşulu görünür ve erişilebilir olur.
- Günlük hatırlatma standart takvim dosyası olarak kullanıcının takvimine eklenir; kullanıcı etkinliği takviminde onaylar. Sayfa kapalıyken tarayıcı bildirimi vaat edilmez.
- İstemci aynı kökenli `/api/closing` adresine yapılandırılmış okuma gönderir. Sunucu sabit sistem talimatı ve doğrulanmış kart anlamları üretir; anahtar yalnız sunucu ortamında bulunur. Eksik anahtar, zaman aşımı, bozuk yanıt ve ağ hatasında yerel yorum tamamlanır.
- Yayın çıktısı yalnız gerekli uygulama dosyalarıdır; testler, kaynak notları, yerel proxy ve ortam dosyaları statik sunulmaz. Güvenlik/önbellek başlıkları ve tekrarlanabilir test/build komutları bulunur.
- Ağır ana görsel için daha hafif mobil kaynak hazırlanır; görünüm gözle doğrulanır.

Sınırlar: canlı ortama yayın veya gizli anahtar yükleme bu hazırlık işleminin parçası değildir. Chromium ve mümkünse WebKit/Firefox otomasyonu yapılır; fiziksel cihaz ve gerçek takvim teslimi ayrıca belirtilir. Test edilmiş kod, doğrulanmamış canlı hizmet olarak tanıtılmaz.

Kaynak: `../../../../design-plans/audit-2026-10-07/INCELEME.md`; önceki testlerin kanıtları aynı klasördedir.
