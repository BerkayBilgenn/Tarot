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

Önce ana adrese geçirilmeden üretim adayı hazırlanır. Hazır olduğunda dosyalar derlemeyle karşılaştırılır ve özel dosya yollarının erişilemediği doğrulanır. Kullanıcının yetkilendirdiği GitHub main yayını ve canlı adrese geçiş bundan sonra yapılır; sonuç ayrı yayın kaydına yazılır.

## Sınırlar

Bu yayın yapay zekasızdır. Gerçek Qwen metni, sağlayıcı erişimi ve canlı Redis doğrulanmış özellik olarak sunulmaz. Tarayıcı boyutu kontrolleri fiziksel cihaz testinin yerine geçmez. Küresel benzersizlik ve cihazlar arası geçmiş eşitlemesi vaat edilmez.
