# Miloruna — tarot web arayüzü

Bu klasörü Cursor'da proje olarak açın. `index.html` başlangıç dosyasıdır; derleme veya paket kurulumu gerekmez. Görsellerin yolları görecelidir, bu yüzden dosyaları birlikte tutun.

## Dosyalar

- `index.html`: kart seçimi ve örnek yorum ekranı
- `styles.css`: tasarım ve dar ekran yerleşimi
- `cards.js`: 78 kartlık RWS destesinin verisi (Tarot Rehberi yapısı: suit/element tablosu, sayı temaları, court rolleri; her kart için İngilizce/Türkçe ad, astroloji ya da Golden Dawn başlığı + dekan, anahtar kelimeler, düz / aşk-iş / ters anlam, görsel yolu)
- `assets/cards/`: 78 kart yüzü, `<sıra>-<suit>-<no>-<slug>.jpg` (RWS 1909, kamu malı)
- `tarot.js`: 78 karttan 9 kapalı kart çekme, üç kart seçme, kaldırma, karıştırma, seçilen kartlara göre yorum ekranını doldurma ve not kaydetme
- `01-kart-secim-ekrani.png`, `02-yorumlama-ekrani.png`: onaylanan görsel mockup'lar ve prototipin kullandığı görsel kaynaklar
- `tarot-tasarim-promptlari.txt`: görsel tasarımın üretim promptları
- `tests/tarot.test.cjs`: kart seçimi davranış testleri

Tarayıcıda `index.html` dosyasını açın. Testler için proje klasöründe `node --test tests/tarot.test.cjs` çalıştırın.

## Mevcut kapsam

Arayüz 1917×993 ekran referansına uygun, geniş ekranda ortalanmış bir sahne kullanır ve telefonda yeniden yerleşir. Her karıştırmada 78 kartlık desteden 9 kapalı kart masaya serilir; üç kart seçimi çalışır. Üçüncü seçimden sonra yorum ekranı açılır ve seçilen kartların gerçek RWS yüzlerini, Türkçe adlarını, künyesini (Major: numara + astroloji; Minor: Golden Dawn başlığı + dekan ya da court rolü), anahtar kelimelerini ve rehberdeki düz anlamlarını gösterir. Not alanı yazılan metni yalnızca aynı tarayıcının `localStorage` alanına kaydeder.

Kapalı kart arkası `index.html` içindeki `#card-back` SVG sembolüdür. Kart verisi `cards.js` içinde ters anlamları da taşır; arayüz şimdilik yalnızca düz okuma yapar. Görsel çizgiyi değiştirirken onaylanan kâğıt, kobalt, kolaj ve tipografi çizgisini koruyun.
