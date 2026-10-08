# Miloruna arama görünürlüğü: ölçüm ve yeniden tarama

Bu çalışma arama motorlarının ve yapay zekâ aramasının okuyabildiği özgün içerik, marka bilgisi ve iç bağlantılar sağlar. Sıralama ya da alıntılanma garantisi vermez.

## Google'da eski başlık ve simge

Canlı sayfanın başlığı `Miloruna | Ücretsiz Online Tarot ve Kart Açılımları`; arama sonucunda eski `kendine dön · Tarot okuması` görünebilir. Güncel PNG ve ICO ikonları erişilebilir; aynı stabil adresler korunur. Google'ın son taraması ve seçtiği arama görünümü Search Console'da incelenmelidir. Tarayıcıda favicon görünmesi, arama sonucunun da güncellenmiş olduğunu kanıtlamaz.

Alan adı doğrulanmışsa:

1. Search Console'da doğru `miloruna.com` alan adı veya `https://www.miloruna.com/` URL mülkünü seç.
2. URL denetiminde ana sayfayı kontrol et: son tarama, Google'ın seçtiği canonical ve indeks durumunu kaydet.
3. Canlı URL testiyle güncel sayfanın erişilebilirliğini doğrula. Ana sayfa için indeksleme isteği gönder.
4. Site haritalarında `https://www.miloruna.com/sitemap.xml` adresinin başarıyla okunup okunmadığını kontrol et. Yeni içerikleri içeren haritayı gerekirse bir kez gönder.
5. Yeni rehberlerden ve kart sayfalarından örnek URL'leri kontrol et. Aynı URL'yi sürekli tekrar göndermek yeniden taramayı hızlandırmaz.

Bu repo Search Console doğrulama kodu veya DNS kaydı uydurmaz. Hesap erişimi ve gerekirse kullanıcıdan verilen gerçek doğrulama kaydı gerekir. Bunlar uygulanmadan 'Google'a gönderildi' denmez. Genel URL'leri bildirmenin bir indeks garantisi olmadığı göz önünde tutulur.

## Başlangıç ölçümü

Search Console performans raporundan ülke, cihaz ve tarih filtresini not ederek sorgu ve sayfa verisini dışa aktar. İlk kayıt, uygun veri varsa son 28 tam günü kapsasın. Sonraki değerlendirme aynı filtrelerle eşit uzunlukta dönemleri karşılaştırsın. Yeni sitelerde veri az olduğunda bir iki günlük değişim kesin etki diye sunulmaz.

| Sorgu grubu | Örnek sorgu | İncelenecek sayfalar |
| --- | --- | --- |
| Marka | miloruna, miloruna tarot | Ana sayfa |
| Açılım yapma | ücretsiz online tarot, aşk tarot, kariyer tarot | Ana sayfa ve 6 açılım sayfası |
| Kart anlamı | ay tarot anlamı, aşıklar tarot ters | 78 kart sayfası |
| Öğrenme | tarot nasıl yorumlanır, tarot kombinasyonları | 13 rehber |
| Somut sorular | aşk tarot soruları, iş için tarot soruları | İlgili yeni rehberler |

Her grup için gösterim, tıklama, tıklama oranı ve ortalama konumu kaydet. Sorgulara bağlanan gerçek URL'leri kontrol et; aynı konuya ait sayfaların farklı niyetleri olup olmadığına bak. İndeks sayısı ile site haritası sayısı ayrı ölçümlerdir.

Analytics'te rehberden açılıma geçişi mevcut `guide_reading_click`, tamamlanmayı `reading_complete` etkinliğiyle izle. Bunlar yalnız izin verilen açılım kimliğini taşır; soru, kişi adı ve yorum metni eklenmez. ChatGPT yönlendirmeleri kaynak ve varsa `utm_source=chatgpt.com` bilgisi üzerinden görülebilir. ChatGPT/Gemini yanıtlarında görünürlük yalnız gerçek gözlemle raporlanır; bot erişimi bunu kanıtlamaz.

## Yayın disiplini

- Yeni veya değişen sayfaya gerçek yayın/değişiklik tarihi ver; derleme gününü bütün sayfalara yazma.
- İndekslenebilir URL'yi rehberden bağla ve site haritasına ekle.
- Kaynak ve yazar/yayıncı bilgilerini gerçek içerikle tutarlı tut. Öğretici örnekleri yaşanmış kullanıcı sonucu gibi sunma.
- Yeni konuları gerçek arama sorguları ve içerik boşluklarına göre seç; aynı anahtar kelime için çok sayıda benzer sayfa açma.
- OAI-SearchBot dahil arama botlarının kamu sayfalarına erişimini kontrol et. Arama erişimi ile model eğitimi tercihleri ayrı tutulur; bu yayın GPTBot politikasını değiştirmez.

## Resmî kaynaklar

- https://developers.google.com/search/docs/appearance/favicon-in-search
- https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping
- https://help.openai.com/en/articles/12627856-publishers-and-developers-faq
