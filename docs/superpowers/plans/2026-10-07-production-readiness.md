# Miloruna Production Readiness Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task. Steps use checkbox tracking.

**Goal:** İncelemede doğrulanan hataları gidererek sınanmış bir yayın adayı hazırlamak.
**Architecture:** Mevcut vanilla uygulamaya hedefli düzeltmeler uygulanır. Hatırlatma takvim dosyasıyla, AI mevcut yorum sözleşmesine bağlı sunucu işleviyle sağlanır; statik çıktı izin verilen dosyalardan oluşturulur.
**Tech Stack:** Vanilla JS/CSS, Node built-in test runner, Vercel Node functions, Playwright QA.
**Spec:** `docs/superpowers/specs/2026-10-07-production-readiness.md`

## Global Constraints
- `sources/` ve eşitlenen kaynaklar salt okunur; uygulama bu ayrı worktree'de değişir.
- Lacivert/altın tasarım, altı açılım ve yerel yorum korunur.
- Anahtar yalnız sunucu ortamında kalır; mevcut `.env` okunmaz veya taşınmaz.
- Yayın hazırlanır; canlı yayın ve anahtar yükleme yapılmaz.

## Review Focus
- Eski, kısmi veya yanlış türde kayıtlar geçerli okumaları kaybettirmemeli.
- Dolu depolama otomatik/elle karıştırma ve ayar değişiminde kilitlememeli.
- Mobil büyük kart görünürken yeniden boyutlandırma odağı gizli öğede bırakmamalı.
- Ağ kesintisi, eksik sunucu yapılandırması ve bozuk AI yanıtı yerel yorumu bozmaz.
- Kısa ekran ve tarayıcı yakınlaştırmasında başlangıç/form düğmelerine ulaşılabilmeli.

### Task 1: Kayıt dayanıklılığı
**Files:** `reading.js`, `app.js`, `index.html`, `night.css`, `tests/storage-recovery.test.cjs`.
**Interfaces:** Mevcut `createService` sözleşmesi korunur; `storageStatus()` kurtarma durumunu verir.
- [x] Yanlış JSON türü, karışık kayıt listesi ve dolu depolama davranışlarını test et; `node --test tests/storage-recovery.test.cjs` ile hata göster.
- [x] Kayıt yapısını doğrula, kurtarma kopyasını koru, okunabilir depolama hatası üret; karıştırmanın başlangıç ve bitişini hata yakalama kapsamına al.
- [x] Yeni testler ve `node --test tests/*.test.cjs` geçsin; tarayıcıda tekrar deneme çalışsın.

### Task 2: Responsive ve erişilebilir etkileşim
**Files:** `app.js`, `night.css`, tarayıcı regresyon aracı.
**Interfaces:** `scrollFanTo` kullanılır; büyük kart durumunda `reading-stage.inert` ekran boyutuyla eşlenir.
- [x] Kısa önizleme, başlangıç kırpılması, wheel, End odağı ve görünmez Tab durumlarını gerçek tarayıcıda başarısız doğrula.
- [x] Kısa masaüstü önizlemede mevcut kaydırma kuralını tüm açılımlara uygula; ana akışta gereken yükseklik için taşma erişimi bırak.
- [x] İç kaydırma tekerleği önce tüketir; klavye odağı görünür olur; küçük harita yalnız örtüldüğünde inert olur.
- [x] Karar alanlarına required ve bağlı yardım ekle; regresyonlar ve tüm testler geçsin.

### Task 3: Çalışan takvim hatırlatması
**Files:** `reminder.js`, `app.js`, `index.html`, `night.css`, `tests/reminder.test.cjs`.
**Interfaces:** `TAROT_REMINDER.calendar({time, now, url})` RFC 5545 takvim metni döndürür.
- [x] Seçilen yerel saat, günlük yineleme, sıfır süre ön alarm ve geçerli saat doğrulamasını test et; önce modül yokluğu/hatalı çıktı ile başarısız gör.
- [x] Takvim dosyası ve indirme eylemini uygula; saat geçmişse ilk etkinlik ertesi gün olsun. Yerel floating time ile seçilen saati koru; takvimin seçtiği saat diliminin geçerli olduğunu belgele.
- [x] Gün sonu ve ayarlarda açık takvim metni kullan; bildirim izni isteyen işlevsiz anahtarı kaldır. İndirilen dosyayı tarayıcıda kontrol et.

### Task 4: Production AI hizmeti
**Files:** `api/closing.js`, `server/oracle-handler.js`, `oracle.js`, `tests/closing-api.test.cjs`.
**Interfaces:** POST `{reading:{id,spreadId,cards,question,optionA,optionB,personName},attempt}` → NDJSON `{delta}` veya JSON `{error}`.
- [x] Method/origin/gövde sınırı/kart doğrulama, eksik anahtar, başarılı upstream ve başarısız upstream testlerini yaz; eksik handler nedeniyle başarısız doğrula.
- [x] Sunucuda kartları/pozisyonları doğrula ve `ORACLE.SYSTEM`/`brief` üret; 20 saniye upstream timeout, sınırlı cevap ve istek sıklığı uygula. Gizli veriyi yanıta/loga çıkarma.
- [x] İstemciyi `/api/closing` ve yapılandırılmış okuma payload'una geçir; sunucu yokluğunda mevcut yerel yorum akışını test et.
- [x] API ve tüm birim testleri geçsin; yerel gerçek HTTP sınırı ayrıca sınansın.

### Task 5: Paketleme, performans ve son doğrulama
**Files:** `package.json`, `scripts/build.cjs`, `scripts/preview.cjs`, `vercel.json`, `.gitignore`, mobil hero asset, `PRODUCTION.md`.
**Interfaces:** `npm test`, `npm run build`, `npm start`; `dist/` yalnız front-end ve varlıkları içerir.
- [x] Statik çıktıda yalnız izin verilen kaynakların olduğunu ve ortam/proxy/test dosyalarının sunulmadığını doğrula.
- [x] Mobil görseli küçültüp uygun kaynağı yükle; mevcut görsel kimliği koru. Cache sürümlerini artır ve güvenlik başlıkları ekle.
- [x] 21 boyut/altı açılım, animasyonlu akışlar, kayıtlar, rehber, paylaşım ve hataların tümünü tekrar doğrula; WebKit/Firefox mümkünse ekle.
- [x] Son değişiklikleri bağımsız gözle incelet; test/build sonucunu rapora kaydet ve branch'te commit et. Bağımsız incelemenin depolama bulguları giderildi; inceleme kullanım sınırı nedeniyle kısmen tamamlandı, kalan son inceleme ana ajan tarafından yürütüldü. Canlı yapılandırma gerekliliklerini kesin biçimde belirt.
