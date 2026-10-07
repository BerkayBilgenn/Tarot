# Miloruna yayın kurulumu

Bu branch bir yayın adayıdır; canlıya otomatik gönderilmez. Node.js 24 kullanır, uygulama ve sunucu için ek paket gerektirmez.

## Çalıştırma

```sh
npm test
npm run build
npm start
```

Önizleme `http://127.0.0.1:8769` adresinde yalnız `dist/` dosyalarını ve `/api/closing` işlevini sunar. Yerel `.env` otomatik okunmaz. Build; testleri, dokümanları, eski proxy'yi ve ortam dosyalarını yayın çıktısına almaz. Varlıklarda yalnız görsel/font dosyaları ve font lisansları kopyalanır; gizli dosyalar ve sembolik bağlantılar atlanır. GitHub CI test ve build çalıştırır.

## Vercel

Mevcut yayın projesi `berkaybilgenn/taroot`, ana adresi `https://www.miloruna.com` ve Node.js sürümü `24.x`. Yayın önce `vercel deploy --prod --skip-domain` ile hazırlanır; doğrulandıktan sonra `vercel promote` ile ana adrese geçirilir. `.vercelignore` gizli ortam dosyalarını, geliştirme proxy'sini, testleri ve tasarım/inceleme belgelerini kaynak yüklemesinden de çıkarır; font lisansları korunur.

Hobby hesabında son Git kaydının yazarı hosting sahibinin bağlı GitHub hesabıyla eşleşmelidir. Farklı bir kişisel/iş e-posta adresi kullanmak, aynı kişinin yerel kaydının hosting tarafından başka bir hesap olarak görülmesine neden olabilir. Yayın kaydında doğrulanmış proje sahibinin GitHub kimliği kullanılır; diğer projelerin genel Git ayarları değiştirilmez.

`vercel.json`, framework `Other`, build `npm run build`, output `dist` ve 30 saniyelik `/api/closing` işlevini tanımlar. Statik çıktı ve işlev aynı kökenden sunulur. Header kuralları içerik güvenliği, çerçeveleme koruması, kaynak türü kontrolü ve önbellek davranışını tanımlar. Google Analytics'in mevcut inline kodunun SHA-256 özeti CSP'de izinlidir; bu inline kod değişirse CSP özeti de güncellenmelidir.

Canlı AI isteniyorsa hosting'in server-side environment ayarlarına iki değer eklenir:

| Ad | Değer |
| --- | --- |
| `NVIDIA_API_KEY` | Hizmet hesabının gizli anahtarı |
| `NVIDIA_MODEL` | Hesabın erişebildiği geçerli model kimliği |

Anahtar frontend'e, Git'e veya yayınlanan varlıklara yazılmaz. Değerler yoksa API 503 döner; kullanıcı mevcut yerel tarot yorumunu okuyup akışı tamamlayabilir. Model yanıtı başarısız, kısa, tekrarlı veya geç gelirse aynı yerel yorum korunur. İstekler okuma sorusu, seçenekler ve seçilen kartları sağlayıcıya aktarır; cihaz kimliği, seed ve gizli deste sırası aktarılmaz. Kart anlamı ve sistem talimatı sunucuda oluşturulur; hata yanıtları anahtarı veya sağlayıcı hata içeriğini açıklamaz.

Sunucu işlevinin 16 KB gövde, 20 saniye upstream timeout ve işlev örneği başına istemci/IP için dakikada 6 istek sınırı vardır. Bu bellek sınırı farklı Vercel örnekleri arasında paylaşılmaz. Canlı AI'yi halka açarken toplam trafik/maliyet sınırını Vercel Firewall ve sağlayıcı bütçesiyle ayrıca yapılandırın; bu branch mevcut hesabın ayarlarını değiştirmez.

Yayın sonrası `/api/closing` için geçerli bir açılımda başarılı model cevabı, anahtarsız hata/fallback, herkese açık ana adres ve temel telefon akışları kontrol edilmelidir. Önceki Vercel deployment adresi giriş sayfasına yönlendiği için canlı etkileşim testi henüz doğrulanmış değildir.

## Kayıtlar ve hatırlatma

Geçmiş tarayıcının yerel depolamasındadır. Bozuk kayıtlar içinden geçerli okumalar korunur ve `kd.readings.v1.recovery` alanına kurtarma kopyası alınır. Ekrandaki indirme düğmesi bu kopyayı dışa aktarır. Yedek alınamıyorsa yeni kayıt yazımı orijinal bozuk veriyi ezmez. Dolu depolama kullanıcıya yer açıp yeniden deneme yolu sunar.

Günlük hatırlatma `.ics` takvim dosyasıdır. Kullanıcı dosyayı takviminde açıp günlük etkinliği kaydeder. Saat floating local time olarak yazılır; içe aktarıldığı takvimin yerel saat dilimi geçerlidir. Bildirimi takvim uygulaması ve izinleri yönetir. Uygulama kapalıyken web bildirimi gönderildiği iddia edilmez. Saati sonradan değiştirmek için takvim etkinliği düzenlenir; uygulamadaki saat bir sonraki dosya içindir.

## Kaynaklar

- [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel build/output ayarları](https://vercel.com/docs/builds/configure-a-build#output-directory)
- [iCalendar standardı, RFC 5545](https://www.rfc-editor.org/rfc/rfc5545)

Yayın öncesi testlerin kesin sonucu ve fiziksel cihaz/canlı hizmet sınırları ayrıca hazırlanan doğrulama raporunda bulunur.
