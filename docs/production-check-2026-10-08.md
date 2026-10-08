# Miloruna yayın öncesi kontrolü — 8 Ekim 2026

Bu sürüm, yapay zekasız yorumları kart yönü, kategori, konum ve birlikte gelen kartların ilişkileriyle geliştirir. Tekrarlanan giriş ve kapanışlar azaltılır. Geçerli tamamlanmış okumalar yeniden açıldığında korunur. Kullanıcı kontrolün ardından yayını açıkça yetkilendirmiştir.

## Kontrol sonucu

- Node.js 24 ile tam test takımı: **165 başarılı, 0 başarısız**.
- Üretim derlemesi ve Git değişiklik kontrolü başarılı.
- Bağımsız inceleme: açık kritik veya önemli kod sorunu bulunmuyor.
- Altı açılımın oluşturma, kart seçme, tamamlama, kaydetme ve yeniden yükleme akışı gerçek bellek deposuyla doğrulandı.
- 156 kart/yön profilinin tamamı dolu. İncelemenin 18.000 örneğinde en uzun yorum 3.766 karakter; 8.000 karakter kayıt sınırının altında.
- Bozuk eski yorumun yeni yorumları durdurması yeniden üretildi ve düzeltildi; nesne, sayı, dizi ve bozuk bütünsel metin testte kapsanıyor.
- AI bilerek kapalı/yapılandırılmamışken tamamlanan yerel yorum artık geçici arıza olarak gösterilmiyor. Kaydetme hatası yine bildiriliyor.
- Genel metin ve kart ayrıntıları güvenli metin/kaçış yollarıyla gösteriliyor; değişen uygulama dosyalarının cache sürümleri güncellendi.
- Gerçek metin sayımı: **90.112 farklı envanter çıktısı**; 1.000 örnekte giriş/son cümlenin en yüksek tekrarı 5. Bu sayımlar bütün teorik kapasitenin özgünlük veya kullanıcı memnuniyeti garantisi değildir.
- Vercel hedefi `berkaybilgenn/taroot`, Node.js `24.x`; üretim ortam değişkeni yok. Ücretli AI kapalı kalır, anahtar taşınmaz.
- Yayın yüklemesi kuru çalıştırmada incelendi. Gizli ortam dosyaları, testler, belgeler, yerel proxy ve yerel veri defteri dışlanır; statik derleme açık dosya listesi kullanır.

## Yayın doğrulaması

Yerel yorum sürümü `3b152393ab3cf8a0e5d57f8bdfa27db4449a2d4e` GitHub main üzerinden yayınlandı. GitHub CI ve Vercel production yayını başarılı; canlı sitedeki 228 adres derlemeyle birebir eşleşti. Altı özel dosya yolu 404, yapılandırılmamış AI oturumu 503 ve desteklenmeyen GET isteği 405 döndü. Korumalı aday adres için koruma atlatılmadı; doğrulama herkese açık canlı adreste yapıldı.

## Kaydırma çubukları ve son responsive kontrol

Kullanıcının ekran görüntüsündeki yatay kart çubuğu ve dikey yorum çubuğu kaldırıldı. Kaydırma işlevi korunur; ana akış, kart pencereleri ve yatay telefondaki sayfa da aynı çubuksuz görünümü kullanır. Uzun ve boşluksuz metinler hem sayfalama ölçümünde hem görünür yorumda satıra bölünür. `night.css` önbellek sürümü 16'ya yükseltildi.

- Yorum ekranı: 320×568, 375×667, 390×844, 768×1024, 1024×600, 1366×768, 1440×900 ve 844×390. Yatay sayfa taşması yok; kart ve yorum çubukları gizli. Yatay telefonda alt gezinme düğmesine odaklanınca sayfa kayarak düğmeyi görünür alana getiriyor.
- Ana sayfa, kart rehberi ve geçmiş: 320×568, 390×844, 768×1024, 1366×768 ve 844×390; yatay sayfa taşması yok. Rehberin kart yelpazesinin kendi alanı dışındaki dekoratif kartları sayfayı genişletmiyor.
- Kaydedilmiş beş kartlı yorumun 320×568'deki 29 ve 1440×900'deki 4 sayfası okundu. Boşluklar normalize edildiğinde bütün metinler aynı; hiçbir yorum sayfasında yatay veya dikey içerik taşması yok.
- Gerçek karar formuyla uzun, boşluksuz seçenek denendi. 320×568'deki 47 ve 1440×900'deki 4 sayfanın bütün metni aynı; tam seçenek metni korunuyor ve sayfalarda taşma yok.
- 320×568'de kariyer kart satırının son kartına Tab ile ulaşıldı; Enter kart ayrıntısını açtı. Kart penceresi çubuksuz, kaydırılabilir ve Escape ile kapanıyor. Günlük okuma kayıtları korunuyor.
- 165 test başarılı; üretim derlemesi ve değişiklik biçim kontrolü başarılı. Bağımsız son kod incelemesinde kritik veya önemli sorun kalmadı.

Bu düzeltme kullanıcı tarafından yayın için yetkilendirilmiştir. GitHub main ve Vercel yayınının sonucu, yeni sürümün canlı dosya karşılaştırması ve ekran kanıtı çalışma alanının ayrı yayın kaydına yazılır.

## Sınırlar

Bu yayın yapay zekasızdır. Gerçek Qwen metni, sağlayıcı erişimi ve canlı Redis doğrulanmış özellik olarak sunulmaz. Tarayıcı boyutu kontrolleri fiziksel cihaz testinin yerine geçmez. Küresel benzersizlik ve cihazlar arası geçmiş eşitlemesi vaat edilmez.
