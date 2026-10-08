'use strict';
const REVIEWED = '2026-10-07';
const SOURCE = {name:'A. E. Waite · The Pictorial Key to the Tarot',url:'https://en.wikisource.org/wiki/The_Pictorial_Key_to_the_Tarot'};
const SPREAD_CONTENT = {
  daily: {
    slug:'gunluk-tarot',title:'Günlük tarot: günün kartını çek',description:'Günün tarot kartını ücretsiz çek. Tek kartlık açılımın nasıl okunacağını öğren; günlük tema, düz ve ters anlamları birlikte keşfet.',
    summary:'Günlük tarot, tek bir kartla bugünün temasını düşünmek için yapılan kısa bir açılımdır. Miloruna’da kartını kendin seçer, düz veya ters anlamını ve sana açtığı soruyu okursun.',
    use:'Aklında tek bir mesele olmasa da günün odağını belirlemek istediğinde bu açılımı seçebilirsin. Tek kart geniş bir durumun bütün ayrıntılarını anlatmaya çalışmaz; dikkati bir temaya toplar.',
    question:'Bugün hangi konuya daha dikkatli yaklaşmak istiyorum?',
    example:'Günün kartı Ermiş ise kısa bir duraklamaya ihtiyaç duyduğun alanı düşünebilirsin. Bu, bütün gün yalnız kalman gerektiği anlamına gelmez. Günün içinde kendi düşünceni duymak için ayırabileceğin küçük bir zaman, kartın içe dönüş temasını somutlaştırabilir.',
    practice:'Kartın anahtar kelimelerinden sana yakın gelen birini seç ve gün içinde onu nerede gördüğünü not et. Akşam aynı karta dönüp sabahki yorumunun hangi deneyimle değiştiğine bakabilirsin.',
    product:'Miloruna aynı cihazda o günün okumalarını saklar. Bugün için tamamlanmış bir kartın varsa açılım bağlantısı onu açabilir; istersen uygulamadaki yeni kart seçeneğini kullanabilirsin.',
    related:['major-09','major-14','major-17'],
    questions:[['Günün kartı kaç karttan oluşur?','Tek karttan oluşur. Kart bugünün teması konumunda okunur; düz ve ters geliş için ayrı anlamlar bulunur.'],['Her gün aynı kart mı gelir?','Kartların karıştırılması ve seçimi her okumada değişebilir. Aynı kartın tekrar gelmesi, tek başına belirli bir olayın olacağına dair kanıt değildir.']]
  },
  three: {
    slug:'uc-kart-tarot',title:'Üç kart tarot: geçmiş, şimdi ve gelecek',description:'Üç kart tarot açılımını ücretsiz yap. Geçmiş, şimdi ve gelecek konumlarını, kartların birlikte nasıl yorumlandığını örneklerle öğren.',
    summary:'Üç kart tarot, bir durumu geçmiş etkiler, bugünkü tablo ve mevcut gidişat olarak okumaya yarayan kısa bir açılımdır. Kartları tek tek ezberlemek yerine aralarındaki ilişkiye bakarsın.',
    use:'Bir olayın nasıl geliştiğini anlamak veya ilk kez tarot açılımı denemek istediğinde üç kart iyi bir başlangıçtır. Soruyu daraltmak, her konumun neye karşılık geldiğini görmeyi kolaylaştırır.',
    question:'Bu projeyi buraya getiren ne, şimdi neye odaklanıyorum ve mevcut yaklaşım nereye gidiyor?',
    example:'Geçmişte Tılsım Sekizlisi, şimdi Asa İkilisi, gelecekte Savaş Arabası çıktığını düşün. Düzenli çalışma geçmiş etkidir; bugün yön seçme ihtiyacı öne çıkar; mevcut gidişat ise seçilen hedefe odaklanma temasıyla okunabilir. Aynı kartları farklı konumlara koymak, yorumun vurgusunu değiştirir.',
    practice:'Önce her kartı kendi konumunun sorusuyla bir cümlede anlat. Ardından bu üç cümlenin birbirine nasıl bağlandığına bak. Çelişki gördüğünde bir kartı silmek yerine, o çelişkinin durumunda hangi gerilimi yansıttığını düşün.',
    product:'Miloruna’nın üç kart açılımında soru yazmak isteğe bağlıdır. Genel açılımda daha geniş bir inceleme istediğinde uygulama içinden on kartlık Kelt Haçı’nı da seçebilirsin.',
    related:['pentacles-08','wands-02','major-07'],
    questions:[['Üç kart tarot geleceği kesin söyler mi?','Gelecek konumu, mevcut gidişatın olası yönünü düşünmek için kullanılır. Yeni bilgi ve seçimler bu gidişatı değiştirebilir.'],['Soru yazmadan üç kart seçebilir miyim?','Evet. Miloruna’da bu açılımın soru alanı isteğe bağlıdır; zihninde tuttuğun bir konu üzerinden de kartları okuyabilirsin.']]
  },
  relationship: {
    slug:'ask-tarot',title:'Aşk tarot: beş kartlık ilişki açılımı',description:'Ücretsiz aşk tarot açılımında beş kartla ilişkinin dinamiğine bak. Sen, karşı taraf, bağ, engel ve potansiyel konumlarını keşfet.',
    summary:'Aşk tarot açılımı, ilişkiye getirdiğin tutumu, karşı taraf için düşündüğün temaları, aradaki bağı, engeli ve olası yönü beş kartla inceleyen bir yöntemdir. Yorumun merkezinde ilişkinin dinamiği vardır.',
    use:'Bir ilişkide iletişimi, yakınlığı veya tekrar eden bir durumu düşünmek istediğinde bu açılımı seçebilirsin. Karşı taraf hakkında bildiklerinle tahminlerini ayırmak, yorumu daha açık bir zemine taşır.',
    question:'Bu ilişkide kendi ihtiyaçlarımı nasıl ifade ediyorum ve aramızdaki iletişimi ne zorlaştırıyor?',
    example:'Aradaki bağ konumunda Kupa İkilisi, engel konumunda Kılıç İkilisi olduğunu düşün. Yakınlık ve karşılıklılık isteği bulunurken bir konuda karar vermekten kaçınma teması öne çıkabilir. Buradan çıkarılabilecek somut soru, hangi konuyu birlikte konuşmayı ertelediğinizdir.',
    practice:'Sen konumunu kendi deneyiminle ilişkilendir. Karşı taraf konumunu ise onun zihnini okuyan bir sonuç gibi kullanma; sende oluşan algıyı ve konuşarak öğrenebileceğin bilgiyi ayrı tut. Engel kartından açıklanabilir bir konuşma konusu çıkar.',
    product:'Miloruna’da kişi adı ve soru alanları isteğe bağlıdır. İlişki açılımı beş kart kullanır; isim yazmadan da aynı konumları okuyabilirsin.',
    related:['cups-02','swords-02','major-06'],
    questions:[['Aşk tarot için bir isim yazmam gerekir mi?','Hayır. Kişi adı isteğe bağlıdır. İstersen yalnız ilişkinin konusu veya kendi niyetin üzerinden açılım yapabilirsin.'],['Kartlar onun ne düşündüğünü kesin olarak gösterir mi?','Hayır. Kartlar bir başkasının özel düşüncelerine erişmez. İlişki açılımını kendi algını ve iletişim ihtiyacını düşünmek için kullanabilirsin.']]
  },
  career: {
    slug:'kariyer-tarot',title:'Kariyer tarot: işine ve yönüne bak',description:'Kariyer tarot açılımını beş kartla ücretsiz yap. Mevcut durum, engel, güçlü yan, tavsiye ve gidişat konumlarını örneklerle öğren.',
    summary:'Kariyer tarot, bir iş veya proje konusunu mevcut durum, engel, güçlü yan, tavsiye ve gidişat üzerinden beş kartla ele alan bir açılımdır. Yeteneklerini ve seçeneklerini düşünmek için bir çerçeve sunar.',
    use:'Bir projede nerede takıldığını, yeni bir sorumluluğa nasıl yaklaşacağını veya çalışma biçiminde neyi değiştirmek istediğini incelemek için bu açılımı kullanabilirsin. Konuyu tek bir karar ya da süreçle sınırlamak yorumu netleştirir.',
    question:'Bu projede hangi gücüme dayanabilir ve ilerlemek için hangi yöntemi değiştirebilirim?',
    example:'Engel konumunda Asa Onlusu, güçlü yan konumunda Tılsım Üçlüsü çıktığını düşün. Yüklerin birikmesi ve ekip becerilerinin birlikte kullanılması karşı karşıya gelir. Yorum, bütün işi tek başına yapmak yerine hangi görevin paylaşılabileceğini düşünmeye açılabilir.',
    practice:'Kart yorumunu işin gerçek koşullarıyla birlikte değerlendir. Zaman, görev, deneyim ve ulaşılabilir destek gibi somut bilgileri listele. Tavsiye kartını, kendi kontrolünde olan küçük bir çalışma adımına çevirmeye çalış.',
    product:'Uygulamadaki İş / Para niyeti beş kartlık kariyer açılımına gider. Soru yazmak isteğe bağlıdır; kartlar maddi bir kazancın veya belirli bir iş sonucunun garantisi olarak sunulmaz.',
    related:['wands-10','pentacles-03','major-01'],
    questions:[['Kariyer açılımı kaç kart kullanır?','Beş kart: mevcut durum, engel, güçlü yan, tavsiye ve gidişat. Miloruna kartları bu sırayla gösterir.'],['İki iş seçeneğini karşılaştırmak için hangisini seçmeliyim?','Belirli iki yolu yan yana karşılaştırmak istiyorsan karar açılımı daha uygun bir çerçeve sunar; kariyer açılımı mevcut süreci daha genel inceler.']]
  },
  decision: {
    slug:'karar-tarot',title:'Karar tarot: iki yolu karşılaştır',description:'İki seçenek arasında kaldığında karar tarot açılımını dene. Beş kartla durumunu, A ve B yollarının süreçlerini ve olası sonuçlarını incele.',
    summary:'Karar tarot, iki seçeneği aynı sorunun içinde karşılaştıran beş kartlık bir açılımdır. Durumun özü bir kartla, her seçeneğin yolu ve olası sonucu ikişer kartla ele alınır.',
    use:'Seçeneklerin açıkça tarif edilebildiği durumlarda bu açılımı seçebilirsin. Bir kartın senin yerine seçim yapmasını beklemek yerine, yolların hangi farklı ihtiyacı veya zorluğu düşündürdüğüne bak.',
    question:'A: Mevcut projeyi geliştirmek. B: Yeni bir projeye başlamak. Bu iki yola nasıl yaklaşabilirim?',
    example:'A yolunda Tılsım Şövalyesi, B yolunda Deli çıktığını düşün. İlk yol süreklilik ve küçük adımlar; ikinci yol yeniye açıklık ve belirsizlik temasıyla okunabilir. Hangi temanın daha güzel olduğundan önce, hangi koşulları üstlenmeye hazır olduğunu sor.',
    practice:'A ve B seçeneklerini karşılaştırılabilir uzunlukta, somut ifadelerle yaz. Her yolun kartını aynı ölçütlerle ele al. Örneğin ikisini de zaman, öğrenme, destek ve kendi değerlerin açısından düşün; yalnız birini avantajlarıyla değerlendirme.',
    product:'Miloruna karar açılımında iki seçeneğin de yazılması gerekir. Soru alanı isteğe bağlıdır. Beş kartlık bu yapı, bağımsız bir evet/hayır açılımı olarak sunulmaz.',
    related:['pentacles-12','major-00','major-11'],
    questions:[['Karar açılımında neden iki seçenek yazmalıyım?','A ve B yollarının kartları, tanımladığın seçeneklerin süreç ve sonuç konumlarında okunur. İki seçenek olmadan bu karşılaştırmanın bağlamı eksik kalır.'],['Kartların seçtiği yolu izlemek zorunda mıyım?','Hayır. Kartlar sana ait kararı üstlenmez; farklı yönleri düşünmek için bir çerçeve sağlar. Gerçek koşullarını ve kendi önceliklerini birlikte değerlendir.']]
  },
  celtic: {
    slug:'kelt-haci-tarot',title:'Kelt Haçı tarot: on kartlık açılım',description:'Kelt Haçı (Celtic Cross) açılımını on kartla ücretsiz yap. Kart konumlarını, kesen kartı, geçmiş ve gidişat ilişkisini rehberden öğren.',
    summary:'Kelt Haçı, bir konuyu on farklı konumda inceleyen geniş bir tarot açılımıdır. Mevcut durum ve engelin yanında kök etkiyi, hedefi, geçmişi, yakın gidişatı, kendi tutumunu ve çevreni birlikte ele alır.',
    use:'Bir durumun birçok yönünü düşünmek için zaman ayırmak istediğinde Kelt Haçı’nı seçebilirsin. Tek bir kısa cevap arıyorsan önce üç kartla başlamak, karmaşık yorum içinde kaybolmanı önleyebilir.',
    question:'Bu değişim döneminde beni etkileyen şeyler neler ve kendi yaklaşımımı nasıl anlayabilirim?',
    example:'Mevcut durumda Asa İkilisi, kesen kartta Asılan Adam çıktığını düşün. Yön seçme isteğine bekleme veya bakış değiştirme ihtiyacı eşlik edebilir. Temel ve hedef kartlarını da okuyarak, bu beklemenin hangi geçmiş etkiden veya beklentiden beslendiğini araştırabilirsin.',
    practice:'Önce mevcut durum ile kesen kartı birlikte oku. Ardından temel/hedef ve geçmiş/yakın gelecek çiftlerine bak. Son dört konumda kendi tutumunu, dış etkileri ve beklentilerini ayır. Sonuç kartını bütün bunlardan kopuk tek bir hükme dönüştürme.',
    product:'Miloruna Kelt Haçı’nda on kart gösterir. Küçük ekranda düzen uyarlanır; kartların numaraları ve konum adları aynı kalır. İstersen yorumdaki genel bakıştan tek tek kartlara geçebilirsin.',
    related:['wands-02','major-12','major-10'],
    questions:[['Kesen kart neden yatay durur?','İkinci kart mevcut durumun üzerinden geçer ve ona karışan etkiyi temsil eder. Yerleşimdeki yatay duruş, kartın ters çekildiği anlamına gelmez.'],['Kelt Haçı açılımındaki sıra her kaynakta aynı mı?','Farklı geleneklerde konum sırası değişebilir. Bu rehber, Miloruna’nın uygulamada gösterdiği on konumu ve sıralamayı açıklar.']]
  }
};
const GUIDES = [
  {
    slug:'tarot-nedir',title:'Tarot nedir? Kartlar ve sembolik okuma',description:'Tarotun ne olduğunu, 78 kartlık destenin yapısını ve kartların konumla birlikte nasıl okunduğunu Miloruna rehberinden öğren.',
    summary:'Tarot, görselleri ve sembolleri bir soru veya konu etrafında yorumlanan bir kart destesidir. Miloruna, bu sembolleri niyetini, seçeneklerini ve kendi deneyimini düşünmek için bir okuma çerçevesi olarak kullanır.',
    sections:[
      {heading:'Tarot destesi kaç karttır?',paragraphs:['Miloruna’nın kullandığı Rider–Waite–Smith düzeninde 78 kart vardır: 22 Büyük Arkana ve 56 Küçük Arkana. Küçük Arkana, Asalar, Kupalar, Kılıçlar ve Tılsımlar olmak üzere dört seriye ayrılır. Her seride As’tan On’a kadar sayı kartları ile Prens, Şövalye, Kraliçe ve Kral bulunur.','Büyük Arkana, Deli’den Dünya’ya uzanan geniş yaşam temalarını; Küçük Arkana ise günlük deneyimlerin farklı yönlerini düşünmeye açar. Bu ayrım bir kartın diğerinden mutlaka daha önemli olduğunu söylemez.']},
      {heading:'Bir kartın anlamı nereden gelir?',paragraphs:['Kartın görseli, anahtar temaları ve açılımdaki konumu birlikte okunur. Örneğin Güç kartı güçlü yan konumunda sabrı düşündürebilir; engel konumunda aynı sabrın seni nerede zorladığını sorgulatabilir. Kartın adı değişmese de sorunun yönü yorumu değiştirir.','Düz ve ters konumlar da yoruma farklı bir vurgu katabilir. Ters kartlar otomatik olarak kötü bir sonuç değildir. Kartın enerjisinin zorlandığı, içe döndüğü veya aşırılaştığı alanı düşünmek için kullanılabilir.']},
      {heading:'Tarot ile neyi inceleyebilirim?',paragraphs:['Miloruna’da günlük tema, bir durumun gelişimi, ilişki dinamiği, çalışma biçimi ve iki seçenek arasındaki fark ele alınabilir. Açık sorular, yorumdan ne beklediğini anlamayı kolaylaştırır. “Kesin ne olacak?” yerine “Bu duruma nasıl yaklaşıyorum?” gibi bir soru, kendi hareket alanını görünür kılar.']},
      {heading:'Miloruna’da nasıl başlayabilirim?',paragraphs:['Önce sana yakın gelen niyeti seç. İlk denemede bir veya üç kartla başlamak, konum ile kart arasındaki ilişkiyi izlemeyi kolaylaştırabilir. Kartları seçtikten sonra kendi deneyiminle örtüşen noktaları düşün; bütün yorumun sana uyması gerekmez.']},
      {heading:'Görsel geleneğe bir kaynak',paragraphs:['A. E. Waite’ın The Pictorial Key to the Tarot metni, Pamela Colman Smith’in görselleriyle ilişkili tarihsel bir başvuru kaynağıdır. Miloruna’daki güncel Türkçe metinler ise sembolik bir okuma için hazırlanmıştır; kitaptan birebir çeviri oldukları iddia edilmez.']}
    ],related:['tarot-nasil-bakilir','ters-tarot-kartlari','tarot-acilimlari']
  },
  {
    slug:'tarot-nasil-bakilir',title:'Tarot nasıl bakılır? Adım adım başlangıç',description:'Niyet seçimi, kart karıştırma, konumlar ve yorum: tarot açılımını adım adım öğren. Üç kartlık somut bir okuma örneğiyle başla.',
    summary:'Tarot açılımı yapmak için önce konunu belirler, bir açılım seçer, kartlarını karıştırıp çekersin. Yoruma kartın anlamıyla birlikte bulunduğu konumdan başlarsın; ardından kartların oluşturduğu bütüne bakarsın.',
    sections:[
      {heading:'1. Konunu ve niyetini belirle',paragraphs:['Aynı anda bütün hayatını sormak yerine bir durum seç. Sorunu yazmak zorunlu değildir; fakat birkaç kelimeyle tarif etmek odağını korumayı kolaylaştırır. “İşim nasıl olacak?” yerine “Bu projede beni zorlayan çalışma biçimi ne?” gibi bir soru daha belirli bir bağlam verir.']},
      {heading:'2. Soruna uygun açılımı seç',paragraphs:['Günün odağı için tek kart, bir durumun gelişimi için üç kart kullanabilirsin. Bir ilişkiyi beş konumda, iki seçeneği A ve B yollarında incelemek için ayrı açılımlar vardır. On kartlık Kelt Haçı daha geniş bir bakış sağlar; daha fazla kart her soruya daha iyi cevap demek değildir.']},
      {heading:'3. Kartları karıştır ve seç',paragraphs:['Miloruna’da karıştırma aşamasından sonra desteden kartları kendin seçersin. Deste ve ters kart tercihlerini uygulama ayarlarından düzenleyebilirsin. Seçilen kartlar açılımdaki konumların sırasına yerleşir. Kartı açmadan önce o konumun hangi soruyu sorduğunu hatırla.']},
      {heading:'4. Kartı önce konumuyla oku',paragraphs:['Kupa İkilisi, ilişki açılımında aradaki bağ konumunda karşılıklılığı düşündürebilir. Aynı kart bir iş sorusunun güçlü yanında işbirliğine dikkat çekebilir. Tek bir kart sözlüğü cümlesini her duruma yapıştırmak yerine, kartın teması ile konumun sorusunu birleştir.','Ters gelen bir kartı yalnız düz anlamın zıddı gibi okumak zorunda değilsin. Tema kendini iç dünyanda, zorlanan bir alanda veya fazla kullanılan bir tutumda gösterebilir. Seçtiğin yorumun hangi gerçek deneyime dayandığını sor.']},
      {heading:'5. Kartların bağlantısını kur',paragraphs:['Üç kartta geçmişte Kılıç Dörtlüsü, şimdi Büyücü, gidişatta Tılsım Sekizlisi çıktığını düşün. Bir dinlenme döneminin ardından kaynaklarını kullanma ve düzenli çalışmaya geçiş temasıyla okuyabilirsin. Bu bir yaşanmış olay değil, konumların aynı yorum içinde nasıl ilişkilendirilebileceğini gösteren örnektir.']},
      {heading:'6. Yorumu kendi cümlenle tamamla',paragraphs:['Okumadan sana yakın gelen tek bir soru veya küçük bir adım seç. Neyi fark ettiğini kısa bir notla kaydetmek, daha sonra aynı kartı farklı deneyimle görmeni sağlar. Yorumla örtüşmeyen noktaları da yazabilirsin; kartlara uymak için yaşadığın durumu değiştirmene gerek yok.']}
    ],related:['tarot-sorulari','tarot-acilimlari','ters-tarot-kartlari']
  },
  {
    slug:'tarot-sorulari',title:'Tarot soruları: niyetini açıkça ifade et',description:'Tarota ne sorulur? Aşk, iş, günlük tema ve karar konuları için açık uçlu soru örneklerini ve iki seçenek yazma yöntemini öğren.',
    summary:'İyi bir tarot sorusu, incelemek istediğin durumu ve kendi bakış açını açıkça tarif eder. Açık uçlu sorular, tek bir kesin sonuç aramak yerine tutumunu, seçeneklerini ve sonraki adımını düşünmene yardımcı olur.',
    sections:[
      {heading:'Soruyu nasıl daraltabilirim?',paragraphs:['Önce bir konu seç; sonra o konuda neyi anlamak istediğini yaz. Geçmişi, mevcut durumu veya olası bir yaklaşımı aynı anda sorabilirsin, ancak tek bir cümlede birbirinden bağımsız beş konu toplamak yorumu dağıtır. Sorunun cevabında kendi seçiminin yeri olup olmadığını kontrol et.']},
      {heading:'Aşk ve ilişki için sorular',paragraphs:['Bir başkasının düşüncelerini kesin olarak öğrenme beklentisi yerine, ilişkide gördüğün ve konuşabileceğin alanlara bakabilirsin. “Beni seviyor mu?” sorusunu “Bu ilişkide yakınlık ve güveni nasıl deneyimliyorum?” diye değiştirmek kendi bağlamını görünür kılar.'],items:['Bu ilişkide hangi ihtiyacımı açıkça ifade etmiyorum?','Aramızdaki iletişimi zorlaştıran alışkanlık ne olabilir?','Bu bağda kendi sınırlarıma nasıl yaklaşabilirim?']},
      {heading:'İş ve proje için sorular',paragraphs:['Konuyu bir sonucun garanti edilmesine değil, çalışma biçimine ve kullanılabilir kaynaklara bağla. Zaman, deneyim ve işbirliği gibi somut alanlar, kart yorumunu kendi koşullarınla karşılaştırmanı kolaylaştırır.'],items:['Bu projede hangi güçlü yanıma dayanabilirim?','İlerlememi zorlaştıran çalışma biçimi ne?','Yeni bir sorumluluğa başlarken neyi netleştirmeliyim?']},
      {heading:'Günün kartı için sorular',paragraphs:['Tek kartın amacı günü bütün ayrıntılarıyla tahmin etmek değildir. Günlük bir soru, dikkatini bir temaya veya tutuma toplar.'],items:['Bugün hangi konuya daha özenli yaklaşmak istiyorum?','Günün içinde kendime hangi alanı açabilirim?','Bugün tekrar ettiğim bir tutumu nasıl fark edebilirim?']},
      {heading:'Karar açılımında A ve B nasıl yazılır?',paragraphs:['İki yolu karşılaştırılabilir biçimde tarif et. Örneğin “A: Mevcut projeyi geliştirmek” ve “B: Yeni projeye başlamak”. Bir seçeneği uzun bir avantaj listesiyle, diğerini yalnız kaygıyla yazmak karşılaştırmayı baştan yönlendirebilir. Önce iki yolu da nötr ve somut bir cümleyle adlandır.']},
      {heading:'Soru yazmak zorunlu mu?',paragraphs:['Miloruna’nın günlük açılımında soru alanı yoktur. Üç kart, ilişki, kariyer ve Kelt Haçı açılımlarında soru isteğe bağlıdır. Karar açılımında ise iki seçeneğin yazılması gerekir; genel soru yine isteğe bağlıdır.']}
    ],related:['tarot-nasil-bakilir','tarot-acilimlari','tarot-nedir']
  },
  {
    slug:'ters-tarot-kartlari',title:'Ters tarot kartları nasıl yorumlanır?',description:'Ters tarot kartlarının ne anlama geldiğini öğren. Düz anlamın zıddı, zorlanan tema ve içe dönüş gibi yorumları kart örnekleriyle incele.',
    summary:'Ters tarot kartı, kartın çekimde baş aşağı gelmesidir. Bu konum her zaman kötü bir olay veya düz anlamın tam zıddı demek değildir; kartın temasını farklı bir yönden düşünmeye açabilir.',
    sections:[
      {heading:'Düz ve ters arasındaki fark',paragraphs:['Düz konumda kartın teması daha doğrudan okunabilir. Ters konumda aynı temanın zorlandığı, geciktiği, içe döndüğü veya fazla kullanıldığı alan düşünülür. Hangi yaklaşımın anlamlı olduğunu sorunun bağlamı ve açılımdaki konum belirler. Miloruna her kart için ayrı bir ters anlam sunar.']},
      {heading:'Örnek: ters Büyücü',paragraphs:['Büyücü’nün beceri, odak ve niyeti eyleme dökme teması ters konumda da başlangıç noktasıdır. Bir proje sorusunda becerini kullanamama veya dağınıklık; bir iletişim sorusunda söz ile eylem arasındaki boşluk düşünülebilir. Bu örnek, aynı ters kartın her soruda aynı olay anlamına gelmediğini gösterir.']},
      {heading:'Örnek: ters Denge',paragraphs:['Denge kartı orta yol ve ayarlama temasını taşır. Ters gelişte acelecilik, aşırılık veya uyumsuz parçaları zorla birleştirme öne çıkabilir. Günlük bir okumada “Bugün neyi gereğinden hızlı yapıyorum?” sorusu, yorumu kendi deneyimine bağlayabilir.']},
      {heading:'Ters kartı hangi sırayla okuyabilirim?',paragraphs:['Önce konumun sorusuna bak; sonra kartın temel temasını hatırla. Ters anlamın hangi vurgusunun duruma uyduğunu düşün ve onu bir gözlemle ilişkilendir. Komşu kartlar farklı bir tema açıyorsa tek kartın tersliğini bütün açılımın sonucu sayma.']},
      {heading:'Ters kartları kullanmak zorunlu mu?',paragraphs:['Hayır. Bazı okuma yöntemleri bütün kartları düz kullanır. Miloruna’da ters kartlar ayarlardan açılıp kapatılabilir. Önemli olan seçtiğin yöntemin ne olduğunu bilmen ve aynı okuma içinde tutarlı kullanmandır.']},
      {heading:'Kelt Haçı’nın yatay kartı ters mi?',paragraphs:['Kelt Haçı’nda ikinci kart yerleşim gereği yataydır. Bu, çekimin terslik bilgisiyle aynı şey değildir. Miloruna kartın çekim yönünü ayrıca gösterir; yorumunu yalnız ekrandaki yatay yerleşimden çıkarma.']}
    ],related:['tarot-nasil-bakilir','tarot-nedir','tarot-acilimlari']
  },
  {
    slug:'tarot-acilimlari',title:'Tarot açılımları: hangi açılımı seçmeli?',description:'Günlük, üç kart, aşk, kariyer, karar ve Kelt Haçı tarot açılımlarını karşılaştır. Kart sayısı ve soru ihtiyacına göre açılımını seç.',
    summary:'Tarot açılımı, kartların hangi sorulara ve konumlara göre okunacağını belirleyen düzendir. Miloruna’da altı açılım bulunur; seçim, konunun kapsamına ve okumaya ayırmak istediğin alana göre yapılabilir.',
    sections:[
      {heading:'Kısa bir odak: günlük tarot',paragraphs:['Tek kartla günün temasına bakarsın. Kart seçimi ve okuma kısa bir başlangıç sağlar. Birçok tarafı olan büyük bir durumu tek karttan bütün ayrıntılarıyla açıklamasını beklemek yerine, sana açtığı soruyu düşün.']},
      {heading:'Durumun gelişimi: üç kart',paragraphs:['Geçmiş, şimdi ve mevcut gidişat konumlarını birlikte ele alırsın. Kartlar arasında bağlantı kurmayı öğrenmek için açık bir çerçevedir. Miloruna’da soru yazmak isteğe bağlıdır.']},
      {heading:'Bağın dinamiği: ilişki açılımı',paragraphs:['Beş kart, sen, karşı taraf, aradaki bağ, engel ve potansiyel olarak okunur. İlişkinin sende uyandırdığı tutumları ve konuşulabilecek alanları düşünmeye yarar; karşı tarafın zihnini kesin olarak açıklamaz.']},
      {heading:'Çalışma biçimi: kariyer açılımı',paragraphs:['Mevcut durum, engel, güçlü yan, tavsiye ve gidişat için beş kart kullanılır. Proje veya iş konusunda hangi kaynağa dayanabileceğini ve hangi yöntemi gözden geçirebileceğini inceleyebilirsin.']},
      {heading:'İki yol: karar açılımı',paragraphs:['Önce A ve B seçeneklerini yazarsın. Bir durum kartından sonra her yolun süreç ve olası sonuç kartı okunur. Bu yapı, iki farklı seçeneği aynı ölçütlerle incelemeye yardımcı olur; evet/hayır sonucu üretmek için tasarlanmış değildir.']},
      {heading:'Geniş bakış: Kelt Haçı',paragraphs:['On konumla durum, engel, kök etki, hedef, zaman içindeki gelişim, kendi tutumun ve çevre birlikte ele alınır. Daha uzun bir okuma için alan açar. Farklı kaynaklarda konum sırası değişebildiğinden, Miloruna’nın gösterdiği adları ve numaraları esas al.']},
      {heading:'Kararsızsan nereden başlayabilirsin?',paragraphs:['Konun belli değilse günlük kartla; bir durumun gelişimini düşünüyorsan üç kartla başlayabilirsin. Sorun iki belirli yol arasındaysa karar açılımı daha açık bir karşılaştırma sağlar. Daha çok kart seçmek yerine, seçtiğin çerçevenin soruna neden uyduğunu açıklamaya çalış.']}
    ],related:['tarot-sorulari','tarot-nasil-bakilir','tarot-nedir'],comparison:true
  }
];
const UPDATED = '2026-10-08';
const {NEW_GUIDES,GUIDE_ADDITIONS} = require('./guide-expansion.cjs');
const NEW_GUIDE_SLUGS = new Set(NEW_GUIDES.map(guide => guide.slug));
const NEW_RELATED = {
  'tarot-nedir':['online-tarot-nasil-calisir','tarot-kartlari-nasil-yorumlanir'],
  'tarot-nasil-bakilir':['tarot-kartlari-nasil-secilir','uc-kart-tarot-ornekleri'],
  'tarot-sorulari':['ask-tarot-sorulari','kariyer-tarot-sorulari'],
  'ters-tarot-kartlari':['tarot-kart-kombinasyonlari','tarot-yorumlama-hatalari'],
  'tarot-acilimlari':['uc-kart-tarot-ornekleri','tarot-kartlari-nasil-yorumlanir']
};
for (const guide of GUIDES) {
  guide.sections.push(...(GUIDE_ADDITIONS[guide.slug] || []));
  guide.related = [...new Set([...guide.related, ...NEW_RELATED[guide.slug]])];
}
GUIDES.push(...NEW_GUIDES);
module.exports={REVIEWED,UPDATED,NEW_GUIDE_SLUGS,SOURCE,SPREAD_CONTENT,GUIDES};
