# Yerel yorum çeşitliliği — 8 Ekim 2026

Yeni yorum motoru kartın düz/ters anlamını, seçilen kategoriyi ve açılımdaki konumları birlikte kullanır. 156 yön için ayrı odak, küçük adım, ilişki ve iş metni vardır. Birlikte gelen kartlar, konum ve tema ilişkileriyle okunur. Son 20 kayıtla karşılaştırılan adaylar arasından daha az tekrar eden tam açılım seçilir. Tamamlanmış, geçerli eski kayıtlar tekrar açıldığında korunur.

## Doğrulanan sayımlar

Gerçekten üretilip sayılan envanter örneklerinin ortak toplamı **90.112 ayrı tam metin**: 79.872 günlük metin ve beş çok kartlı açılımdaki sabit örnekler için 10.240 metin. Açılım türleri arasında da tam metin tekrarları çıkarılarak sayıldı. Bu, motorun bütün kapasitesi için bir alt sınırdır; çok kartlı açılımların diğer kart dizilimleri bu sayıya dahil değildir.

- Günlük: 78 kart × 2 yön × 512 anlatım düzeni = **79.872 farklı tam metin**. Her yön için gerçek üreticiye farklı okuma kimlikleri verilip 512 farklı çıktı sayıldı. Kartın doğru yöndeki anlamı bütün bu çıktılarda korundu.
- Çok kartlı açılımlarda: 8 giriş × 32 geliştirme × 8 kapanış = **2.048 anlatım düzeni**. Beş açılım türünün her biri için sabit bir örnek dizilimde 2.048 ayrı gerçek çıktı doğrulandı. Bütün olası dizilimler tek tek üretilmedi.
- Aynı günlük kart için geçmişsiz 100 farklı okuma kimliği: önce **10**, sonra **86** farklı metin. Bu sonuç, farklı kişiler için küresel benzersizlik garantisi olmadığını da gösterir.
- Önceki kayıtları kullanan 1.000 sabit örnek açılım: iki sürümde de 1.000 farklı tam metin. Eski sürümde aynı giriş ve son cümle en çok **833** kez, yeni sürümde en çok **5** kez tekrarlandı. Yeni yorumların tamamında seçilen bütün kartlar yer aldı.

## Teorik metin kapasitesi

Sıralı, tekrar etmeyen kart seçimi ve düz/ters yön için hesap: `78 × 77 × … × (78−n+1) × 2ⁿ`. Bu sayı anlatım düzeni sayısıyla çarpılır. Sorular, kişi adları, seçenek metinleri ve tekrar sayıları bu hesaba eklenmez.

| Açılım | Teorik metin varyasyonu |
| --- | ---: |
| Günlük | 79.872 — gerçek metin sayımıyla doğrulandı |
| Üç kart | 7.478.575.104 |
| İlişki | 166.024.367.308.800 |
| İş / Para | 166.024.367.308.800 |
| Karar | 166.024.367.308.800 |
| Kelt Haçı | 9.575.967.164.608.731.414.528.000 |

Teorik toplam: **9.575.967.165.106.811.995.109.376**, yaklaşık **9,58 × 10²⁴**. Bu, bütün kart dizilimlerinin her anlatım düzeniyle kullanılmasına dayanan kombinasyon hesabıdır. Hazır yazılmış özgün hikâye sayısı veya birbirinden bütünüyle farklı anlamlar sayısı değildir; bütün kapasite tek tek üretilip sayılmadı.

## Kontroller ve sınırlar

165 uygulama testi ve üretim derlemesi başarılı. Ücretli model veya ağ çağrısı yapılmadan sayım gerçekleştirildi. Aynı cihazdaki son kayıtlar tekrar kontrolü sağlar; cihazlar arasında ortak geçmiş bulunmadığı için herkese her zaman ayrı yorum garantisi verilmez. Edebi kalite ve kullanıcı memnuniyeti, kombinasyon sayısından ayrı değerlendirilmelidir.

Yeniden ölçüm: `node scripts/audit-local-readings.cjs docs/local-reading-variety-audit.json`. Ham sonuçlar aynı dizindeki JSON dosyasında bulunur. Karşılaştırma sürümü `77601d2`.

Bu rapor 8 Ekim 2026 yayın adayında yapılan ölçümleri kaydeder. Yayın öncesi kontroller `production-check-2026-10-08.md` dosyasındadır.
