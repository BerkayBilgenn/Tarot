# Miloruna: arama sayfalarına erişim iyileştirmesi

13 Ekim 2026 · https://www.miloruna.com/

Çalışma, GitHub main dalındaki `e94d8b56702c2be47936abb63f0a3abed3427699` sürümünden ayrı bir dalda hazırlandı. Bu sürümün ana sayfa SHA-256 özeti canlı ana sayfayla eşleşti. Önceki yerel rehber ve performans çalışmalarının üzerine yazılmadı.

## Canlı başlangıç kontrolü

Ana sayfa, robots.txt, sitemap.xml, aşk açılımı, kart dizini ve aşk soruları rehberi 200 yanıtı verdi. Site haritasında 107 adres bulunuyor. Ana sayfanın canonical adresi doğru ve genel taramaya izin veriliyor. Bu HTTP kontrolleri, Google'ın bütün adresleri indekslediği anlamına gelmez.

Ana sayfanın statik HTML'si yalnız genel rehber dizinine bağlantı veriyordu. Aşk açılımı genel soru rehberine gidiyor; aşk soruları rehberi ilgili açılım açıklamasına bağlanmıyordu.

## Uygulanan değişiklikler

| Başlangıç hedefi | Mevcut adres | İyileştirme |
| --- | --- | --- |
| Ücretsiz online tarot | / | Ücretsiz kullanım ve okuma adımları hakkında kısa, görünür açıklama; altı açılım, kart dizini ve çalışma yöntemi rehberine doğrudan bağlantılar |
| Aşk ve kariyer tarot | /ask-tarot/, /kariyer-tarot/ | Konuya özel soru rehberlerine bağlantılar; rehberlerde ilgili açılım açıklamasına geri bağlantı |
| Tarot kartlarının anlamları | /tarot-kartlari/ | Kartın anlamını konum ve soruyla birlikte okuma açıklaması; yorumlama ve ters kart rehberlerine bağlantılar |

Başlangıç hedefi Türkiye ve Türkçe olarak varsayıldı. Sorgu hacmi veya mevcut Google sıralaması ölçülmüş gibi sunulmadı.

Sekiz konu rehberi kendi açılım açıklamasına bağlanıyor. Mevcut uygulama bağlantıları doğru açılımı açmaya devam ediyor. Yeni içerik adresi oluşturulmadı. Yalnız değişen ana sayfa ve 11 içerik sayfasının güncelleme tarihleri 13 Ekim olarak işaretlendi; diğer sayfaların tarihleri korundu.

Ana sayfanın kaynak bölümü ilk okuma ekranının ardından erişilebilir. Okuma başladıktan sonra bölüm görünmez. Kaydırılmış kaynak bölümünden logo veya ana menü ile dönüldüğünde gerçek kaydırma alanı sıfırlanır; devam eden okumadan ayrılma onayı korunur.

## Doğrulama

- Tam test paketi: 174 test, 174 başarılı, sıfır hata.
- Yayın derlemesi başarılı; bütün statik sayfalar için mevcut canonical, başlık, kaynak ve bağlantı kontrolleri geçti.
- Yeni bağlantı testleri önce eksik bağlantılar nedeniyle başarısız oldu, değişikliklerden sonra geçti.
- Kaydırma sorunu gerçek tarayıcıda ve otomatik testte tekrarlandı; düzeltmeden sonra açılım ekranına dönüş kaydırmayı sıfırladı.
- 390 × 844 telefon görünümünde kaynak bölümü erişilebilir ve yatay taşma yok. Masaüstü kontrolünde de yatay taşma yok.
- Aşk sayfasından soru rehberine geçiş ve rehberdeki geri bağlantı tarayıcıda doğrulandı. Aşk açılımının başlangıcı çalıştı; kaynak bölümü okuma sırasında kapandı.
- Bağımsız kod incelemesinde kalan engelleyici bulgu yok.

## Search Console ile sonraki değerlendirme

Site sahibi Search Console'un kurulu olduğunu doğruladı. Bu tarayıcı oturumunda hesap raporlarına erişilemedi. Son 28 günlük sorgu ve sayfa raporu; gösterim, tıklama, tıklama oranı ve ortalama konumla, aynı ülke/cihaz filtreleri korunarak incelenmeli. İndeks kapsamı, Google'ın seçtiği canonical ve site haritasının okunma durumu ayrıca kontrol edilmeli.

Bu değişiklikler içerik keşfini ve ilgili sayfalara geçişi iyileştirir. Google sıralamasındaki etki ancak yayın ve yeniden tarama sonrasında gerçek raporlarla değerlendirilir.

Kaynaklar: [Google'ın bağlantı rehberi](https://developers.google.com/search/docs/crawling-indexing/links-crawlable), [Google SEO başlangıç rehberi](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).
