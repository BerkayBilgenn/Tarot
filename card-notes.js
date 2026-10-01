// Kartın görseli ve kendine sorulacak soru. Yorumda kullanıcının ne çektiğini anlaması için:
// scene kartın üzerinde görüneni anlatır; ask düz, askReversed ters gelişte kendine soracağı soru.
(function (root) {
  'use strict';

  const NOTES = {
    // Major Arcana
    'major-00': {
      scene: 'Genç bir yolcu, omzundaki değneğe bağlı çıkınıyla uçurumun kenarına adım atıyor; elinde beyaz bir gül, ayağının dibinde sıçrayan beyaz bir köpek var. Başı göğe dönük, arkasında karlı dağlar yükseliyor.',
      ask: 'Her şeyi bilmeden atmaya hazır olduğun adım hangisi?',
      askReversed: 'Hangi riski hesapsızca alıyorsun, hangisinden korkup kaçıyorsun?',
    },
    'major-01': {
      scene: 'Kırmızı pelerinli bir adam bir elindeki beyaz asayı göğe kaldırmış, öbür eliyle yeri gösteriyor. Başının üstünde sonsuzluk işareti, önündeki masada kupa, kılıç, asa ve tılsım duruyor; etrafı gül ve zambaklarla çevrili.',
      ask: 'Elindeki hangi beceriyi artık eyleme dökmek istiyorsun?',
      askReversed: 'Sözlerinle eylemlerin arasında nerede bir boşluk açılıyor?',
    },
    'major-02': {
      scene: 'Başında ay tacı olan mavi giysili bir kadın, siyah B ve beyaz J sütunlarının arasında oturuyor; kucağında bir parşömen, ayağının dibinde hilal var. Arkasındaki narlı perde ötesini saklıyor.',
      ask: 'Sessizce dinlediğinde iç sesin sana ne söylüyor?',
      askReversed: 'İçinden bildiğin halde duymazdan geldiğin şey ne?',
    },
    'major-03': {
      scene: 'Yıldız taçlı bir kadın, nar desenli elbisesiyle yumuşak minderlere yaslanmış oturuyor; elinde bir asa, yanındaki kalpli kalkanda Venüs işareti var. Önünde olgun buğdaylar, arkasında orman ve akan bir şelale.',
      ask: 'Şu sıralar neyi sabırla besleyip büyütüyorsun?',
      askReversed: 'Başkalarını beslerken kendini nerede ihmal ediyorsun?',
    },
    'major-04': {
      scene: 'Uzun beyaz sakallı, taçlı bir adam koç başlarıyla süslü taş bir tahtta oturuyor. Kırmızı pelerininin altından zırhı görünüyor; bir elinde ankh asası, öbüründe küre var, arkasında çıplak dağlar yükseliyor.',
      ask: 'Hayatında hangi alana sağlam bir düzen kurmak istiyorsun?',
      askReversed: 'Kontrolü nerede fazla sıkı tutuyor, nerede tamamen bırakıyorsun?',
    },
    'major-05': {
      scene: 'Üç katlı taç takmış bir din adamı iki gri sütunun arasında oturuyor; bir elini kutsar gibi kaldırmış, öbüründe üç haçlı bir asa tutuyor. Önünde diz çökmüş iki keşiş ve çapraz iki anahtar var.',
      ask: 'Kimden ya da hangi gelenekten öğrenmeye açıksın?',
      askReversed: 'Hangi kurala sorgulamadan uyuyor, hangisini artık bırakmak istiyorsun?',
    },
    'major-06': {
      scene: 'Çıplak bir kadınla erkek karşılıklı duruyor; yukarıda, büyük bir güneşin önünde kanatlı bir melek onları kutsuyor. Kadının ardında yılanlı bir elma ağacı, erkeğin ardında alevli bir ağaç, aralarında bir dağ var.',
      ask: 'Değerlerinle gerçekten uyumlu olan seçim hangisi?',
      askReversed: 'Ertelediğin seçim, hangi değerinle çatıştığı için bu kadar zor?',
    },
    'major-07': {
      scene: 'Yıldızlı bir gölgeliğin altında zırhlı, taçlı bir genç arabasında dimdik duruyor, elinde bir asa var. Arabanın önünde biri siyah, biri beyaz iki sfenks oturuyor; arkada bir şehrin surları görünüyor.',
      ask: 'İçindeki zıt güçleri hangi hedefte bir araya getirebilirsin?',
      askReversed: 'Seni aynı anda farklı yönlere çeken şeyler neler?',
    },
    'major-08': {
      scene: 'Beyaz giysili, çiçek taçlı bir kadın bir aslanın çenesini yumuşacık elleriyle tutuyor. Başının üstünde sonsuzluk işareti var; aslan ona boyun eğmiş, uzakta mavi bir dağ görünüyor.',
      ask: 'Hangi zorluğa sertlik yerine şefkatle yaklaşabilirsin?',
      askReversed: 'Öfken ya da korkun sana şu an ne anlatmaya çalışıyor?',
    },
    'major-09': {
      scene: 'Gri kukuletalı, beyaz sakallı yaşlı bir adam karlı bir zirvede yalnız duruyor. Bir elinde içinde altı köşeli bir yıldız parlayan fener, öbüründe uzun sarı bir asa tutuyor; başı öne eğik.',
      ask: 'Biraz geri çekildiğinde kendi içinde hangi ışığı buluyorsun?',
      askReversed: 'Kendini dünyadan ya da kendinden neden bu kadar uzak tutuyorsun?',
    },
    'major-10': {
      scene: 'Bulutların ortasında harfler ve simgelerle dolu büyük turuncu bir çark dönüyor. Tepesinde kılıçlı bir sfenks, bir yanında aşağı kıvrılan bir yılan, öbür yanında yükselen kırmızı bir figür, köşelerde kitap okuyan dört kanatlı varlık var.',
      ask: 'Kontrolünün dışında dönen bu değişime nasıl ayak uydurabilirsin?',
      askReversed: 'Hangi döngüyü tekrar tekrar yaşıyorsun ve onu ne besliyor?',
    },
    'major-11': {
      scene: 'Kırmızı cübbeli, taçlı bir figür iki gri sütunun arasında oturuyor. Bir elinde dik tuttuğu iki ağızlı bir kılıç, öbür elinde bir terazi var; arkasında mor bir perde asılı.',
      ask: 'Geçmişte ektiğin hangi şeyin sonucunu bugün görüyorsun?',
      askReversed: 'Hangi konuda kendine ya da başkasına tam dürüst davranmıyorsun?',
    },
    'major-12': {
      scene: 'Bir adam yapraklı, T biçimli bir ağaca tek ayağından baş aşağı asılı; öbür bacağını arkaya kıvırmış, elleri arkasında. Yüzü sakin, başının çevresinde sarı bir ışık halesi parlıyor.',
      ask: 'Bu duruma tersinden baktığında neyi farklı görüyorsun?',
      askReversed: 'Neyi bekleyerek ya da feda ederek kendini askıda tutuyorsun?',
    },
    'major-13': {
      scene: 'Siyah zırhlı bir iskelet, beyaz güllü siyah bir bayrakla beyaz atının üstünde ilerliyor; önünde bir kral yerde, bir din adamı, bir kadın ve bir çocuk onu karşılıyor. Ufukta iki kule arasında güneş doğuyor.',
      ask: 'Yeniye yer açmak için neyi geride bırakmaya hazırsın?',
      askReversed: 'Bitmesi gerektiğini bildiğin neye hâlâ tutunuyorsun?',
    },
    'major-14': {
      scene: 'Kanatlı bir melek, bir ayağı suda bir ayağı karada, iki altın kupa arasında su aktarıyor. Göğsünde bir üçgen, yanında sarı süsenler var; arkasındaki patika ufuktaki ışığa uzanıyor.',
      ask: 'Hayatındaki hangi iki şeyi daha uyumlu karıştırabilirsin?',
      askReversed: 'Hayatının hangi alanında ölçüyü kaçırıp acele ediyorsun?',
    },
    'major-15': {
      scene: 'Boynuzlu, yarasa kanatlı bir figür siyah bir kaidenin üstünde oturuyor; bir elini kaldırmış, öbüründe aşağı dönük bir meşale tutuyor. Önünde boyunlarından gevşek zincirlerle kaideye bağlı çıplak bir kadınla erkek duruyor.',
      ask: 'Gevşek olduğu halde seni hâlâ tutan bağ ne?',
      askReversed: 'Hangi bağı çözmeye başladın, neyi hâlâ derine itiyorsun?',
    },
    'major-16': {
      scene: 'Kayalık bir tepedeki yüksek kuleye yıldırım düşmüş, tepesindeki taç yerinden fırlıyor. Pencerelerden alevler çıkıyor, iki kişi boşluğa savruluyor; kara gökyüzünden sarı kıvılcımlar yağıyor.',
      ask: 'Sarsılan hangi temel aslında hiç sağlam değildi?',
      askReversed: 'Kaçınılmaz olduğunu hissettiğin hangi değişimi erteliyorsun?',
    },
    'major-17': {
      scene: 'Çıplak bir kadın bir göletin kenarında diz çökmüş, iki testiden birini suya, öbürünü toprağa döküyor. Üstünde büyük sarı bir yıldız ve yedi küçük beyaz yıldız parlıyor, ağaçta bir kuş duruyor.',
      ask: 'Seni yeniden umutla dolduran şey ne?',
      askReversed: 'Kendinle bağını yeniden kurmak için neye ihtiyacın var?',
    },
    'major-18': {
      scene: 'Yüzlü büyük bir ay, iki kule arasından uzaklara uzanan yolun üstünde parlıyor ve damlalar döküyor. Bir köpekle bir kurt ona uluyor, öndeki göletten bir kerevit sürünerek çıkıyor.',
      ask: 'Henüz net görmediğin durumda sezgin sana ne fısıldıyor?',
      askReversed: 'Hangi korkunun gerçek olmadığını yavaş yavaş fark ediyorsun?',
    },
    'major-19': {
      scene: 'Yüzlü büyük bir güneşin altında, başında çiçek taç olan çıplak bir çocuk beyaz bir atın sırtında kollarını açıyor. Elinde kırmızı bir sancak dalgalanıyor, arkadaki duvarın üstünde ayçiçekleri var.',
      ask: 'Seni içtenlikle sevindiren ve canlandıran şey ne?',
      askReversed: 'Ertelenen hangi sevinci bugün küçük de olsa yaşayabilirsin?',
    },
    'major-20': {
      scene: 'Bulutların arasından kanatlı bir melek, kırmızı haçlı bayrağı asılı borusunu çalıyor. Aşağıda açılan tabutlardan doğrulan çıplak insanlar kollarını ona açıyor; arkada su ve karlı dağlar var.',
      ask: 'Uzun zamandır içinde yankılanan çağrı seni nereye yöneltiyor?',
      askReversed: 'Geçmişteki hangi şey için kendini hâlâ yargılıyorsun?',
    },
    'major-21': {
      scene: 'Mor bir kumaşa sarılı bir figür, kırmızı kurdelelerle bağlı yeşil bir defne çelenginin içinde iki asa tutarak dans ediyor. Dört köşede bulutların içinden bir insan, bir kartal, bir boğa ve bir aslan bakıyor.',
      ask: 'Tamamladığın bu döngüden yanında ne götürüyorsun?',
      askReversed: 'Kapanması için son adımı bekleyen iş hangisi?',
    },

    // Asalar
    'wands-01': {
      scene: 'Bir buluttan uzanan el, yeni yapraklar süren kalın bir asayı sıkıca kavramış; birkaç yaprak havada süzülüyor. Aşağıda bir nehir, ağaçlar ve tepede bir kale uzanıyor.',
      ask: 'İçinde yeni yeni kıpırdayan hangi heves var?',
      askReversed: 'Başlayıp yarıda bıraktığın hangi fikir hâlâ seni çağırıyor?',
    },
    'wands-02': {
      scene: 'Kırmızı şapkalı bir adam bir kalenin surunda duruyor; bir elinde küçük bir dünya küresi, öbüründe bir asa var, ikinci asa duvara sabitlenmiş. Gözü önünde uzanan denize ve topraklara dönük.',
      ask: 'Önündeki ufka baktığında gerçekten nereye gitmek istiyorsun?',
      askReversed: 'Konfor alanında kalmak sana neyi kaçırtıyor?',
    },
    'wands-03': {
      scene: 'Kırmızı pelerinli bir adam sırtı bize dönük bir tepede, toprağa dikili üç asadan birine tutunmuş duruyor. Altın rengi denizde süzülen küçük gemileri izliyor.',
      ask: 'Yola çıkardığın planlardan ilk hangi sonuçları görmeye başladın?',
      askReversed: 'Beklediğin dönüş gecikirken planında neyi gözden kaçırmış olabilirsin?',
    },
    'wands-04': {
      scene: 'Dört asanın arasına çiçek ve meyvelerden bir çelenk gerilmiş. Arkada iki kişi ellerindeki buketleri sevinçle havaya kaldırıyor; onların ardında bir kale ve toplanmış insanlar görünüyor.',
      ask: 'Kendini evinde hissettiğin yerde neyi kutlamak istiyorsun?',
      askReversed: 'Kendini nerede ya da kimlerin yanında tam ait hissetmiyorsun?',
    },
    'wands-05': {
      scene: 'Farklı renklerde giyinmiş beş genç, ellerindeki asaları havada birbirine doğru savuruyor. Sahne gerçek bir kavgadan çok bir oyuna ya da güç gösterisine benziyor.',
      ask: 'Bu rekabetten ya da tartışmadan ne öğrenebilirsin?',
      askReversed: 'Çatışmadan kaçarken içinde hangi öfkeyi bastırıyorsun?',
    },
    'wands-06': {
      scene: 'Başında defne tacı olan bir adam beyaz bir atın üstünde ilerliyor; elindeki asanın ucunda da bir defne çelengi var. Asalarını kaldırmış bir kalabalık yürüyerek ona eşlik ediyor.',
      ask: 'Hangi başarını utanmadan, gönül rahatlığıyla sahiplenebilirsin?',
      askReversed: 'Takdir görmediğinde kendi değerini neye göre ölçüyorsun?',
    },
    'wands-07': {
      scene: 'Bir tepenin üstündeki genç adam, aşağıdan yükselen altı asaya karşı elindeki asayla kendini savunuyor. Ayaklarındaki ayakkabılar birbirinden farklı; sanki aceleyle hazırlanmış.',
      ask: 'Hangi ilkeni ya da yerini korumaya değer buluyorsun?',
      askReversed: 'Neyi savunmaktan yoruldun, nerede gereksiz yere kalkan kaldırıyorsun?',
    },
    'wands-08': {
      scene: 'Sekiz asa açık gökyüzünde çapraz bir çizgide hızla süzülüyor, uçları yere doğru iniyor. Altlarında bir nehir, yeşil tepeler ve uzakta bir ev görünüyor.',
      ask: 'İşler hızlandığında sen neye odaklanmak istiyorsun?',
      askReversed: 'Aceleyle attığın hangi adım enerjini boşa harcatıyor?',
    },
    'wands-09': {
      scene: 'Başı sargılı bir adam asasına tutunmuş, tetikte bekliyor; arkasında sekiz asa bir çit gibi dizilmiş. Yorgun görünüyor ama geri çekilmeye niyeti yok.',
      ask: 'Bitişe bu kadar yakınken seni ayakta tutan ne?',
      askReversed: 'Tükenmişken hâlâ kime ya da neye karşı nöbet tutuyorsun?',
    },
    'wands-10': {
      scene: 'Bir adam on asayı kucaklamış, yükün altında öne eğilerek yürüyor; asalar önünü görmesini engelliyor. Uzakta, varmaya çalıştığı küçük bir köy ve evler görünüyor.',
      ask: 'Taşıdığın yüklerden hangisi aslında sana ait değil?',
      askReversed: 'Hangi yükü bırakmak ya da paylaşmak seni hafifletir?',
    },
    'wands-11': {
      scene: 'Tüylü şapkalı, semender desenli sarı tunikli bir genç çölde duruyor. İki eliyle tuttuğu uzun asanın yapraklanan ucuna merakla bakıyor; arkada piramitler var.',
      ask: 'Seni heyecanlandıran yeni fikir seni nereye çağırıyor?',
      askReversed: 'Hangi hevesini, bitirmeden bir sonrakine geçerek yarım bırakıyorsun?',
    },
    'wands-12': {
      scene: 'Alev gibi tüylü miğferli, semender desenli tunikli bir şövalye şaha kalkmış atının üstünde asasını kaldırıyor. Arkasında çöl ve piramitler uzanıyor.',
      ask: 'Bu enerjiyle hangi maceraya atılmak istiyorsun?',
      askReversed: 'Öfken ya da acelen seni hangi işte yarı yolda bırakıyor?',
    },
    'wands-13': {
      scene: 'Sarı giysili bir kraliçe aslan başlı bir tahtta oturuyor; bir elinde asa, öbüründe ayçiçeği tutuyor. Ayaklarının dibinde siyah bir kedi var, arkasındaki perdede aslanlar işli.',
      ask: 'Kendi ışığını hangi ortamda daha cesurca gösterebilirsin?',
      askReversed: 'Kıskançlık hissettiğinde aslında kendinde neyi özlüyorsun?',
    },
    'wands-14': {
      scene: 'Kırmızı cübbeli, yeşil pelerinli bir kral aslan ve semenderlerle süslü tahtında oturuyor, elinde filizlenen bir asa var. Ayağının dibinde küçük bir semender duruyor; bakışı uzağa dönük.',
      ask: 'Büyük resme baktığında hangi cesur kararı vermeye hazırsın?',
      askReversed: 'Hangi hedefini plan yapmadan, sadece dürtüyle zorluyorsun?',
    },

    // Kupalar
    'cups-01': {
      scene: 'Bir buluttan uzanan el taşan altın bir kupa tutuyor; kupadan beş su akıntısı nilüferli bir göle dökülüyor. Yukarıdan inen beyaz bir güvercin, haç işaretli küçük bir yuvarlağı kupaya bırakıyor.',
      ask: 'Kalbinde yeni açılan duyguya nasıl yer açabilirsin?',
      askReversed: 'İçinde tuttuğun hangi duygu dışarı akmak istiyor?',
    },
    'cups-02': {
      scene: 'Başlarında çelenk olan genç bir kadınla erkek karşılıklı durup kupalarını birbirine uzatıyor. Aralarında iki yılanlı bir asa ve onun üstünde kanatlı bir aslan başı yükseliyor; arkada tepede bir ev var.',
      ask: 'Bu bağda karşılıklı olarak neyi paylaşmak istiyorsun?',
      askReversed: 'Aranızdaki güven ve iletişim nerede kırılmaya başladı?',
    },
    'cups-03': {
      scene: 'Başlarında çiçek ve yapraklardan taçlar olan üç kadın bir halka oluşturup kupalarını göğe kaldırarak dans ediyor. Ayaklarının dibinde üzümler, meyveler ve bir kabak var.',
      ask: 'Sevincini kimlerle paylaştığında daha çok büyüyor?',
      askReversed: 'Hangi ortamda kendini kalabalığın içinde bile yalnız hissediyorsun?',
    },
    'cups-04': {
      scene: 'Genç bir adam ağacın altında kollarını kavuşturmuş oturuyor, önündeki üç kupaya bakıyor. Buluttan uzanan bir el ona dördüncü kupayı sunuyor ama o bunu fark etmiyor gibi.',
      ask: 'Önünde duran hangi fırsatı henüz görmüyorsun?',
      askReversed: 'Uzun süredir içine kapandığın yerden çıkınca neyi fark ediyorsun?',
    },
    'cups-05': {
      scene: 'Siyah pelerinli bir figür başını eğmiş, önünde devrilmiş üç kupaya bakıyor; arkasında ayakta duran iki kupa var. Ötede bir nehir, bir köprü ve uzakta bir kale görünüyor.',
      ask: 'Kaybına bakarken arkanda hâlâ duran ne var?',
      askReversed: 'Kabullendiğin kayıptan sonra yüzünü nereye çevirmek istiyorsun?',
    },
    'cups-06': {
      scene: 'Kırmızı başlıklı bir çocuk, beyaz çiçeklerle dolu bir kupayı kendinden küçük bir kıza uzatıyor. Etraflarında çiçekli altı kupa, arkalarında eski bir köy meydanı ve evler var.',
      ask: 'Geçmişinden hangi masum sevinci bugüne taşıyabilirsin?',
      askReversed: 'Geçmişi hangi yönüyle olduğundan daha güzel hatırlıyorsun?',
    },
    'cups-07': {
      scene: 'Karanlık bir siluet, bulutların içinde süzülen yedi kupaya bakıyor. Kupalarda bir yüz, parlayan örtülü bir figür, bir yılan, bir kule, mücevherler, bir defne çelengi ve bir ejderha var.',
      ask: 'Bu seçeneklerden hangisi gerçekten elle tutulur?',
      askReversed: 'Hayallerin arasından seçtiğinde elinde kalan asıl istek ne?',
    },
    'cups-08': {
      scene: 'Kırmızı pelerinli bir adam asasına dayanarak, üst üste dizilmiş sekiz kupayı arkasında bırakıp dağlara doğru yürüyor. Gece gökyüzünde yüzlü bir ay onu izliyor.',
      ask: 'Artık anlamını yitirmiş neyi geride bırakmaya hazırsın?',
      askReversed: 'Kalmakla gitmek arasında seni asıl ne tutuyor?',
    },
    'cups-09': {
      scene: 'Kırmızı şapkalı, memnun görünen bir adam tahta bir bankta kollarını kavuşturmuş oturuyor. Arkasındaki mavi örtülü rafta dokuz kupa bir yay gibi dizilmiş.',
      ask: 'Elindekilerden hangisinin tadını gönül rahatlığıyla çıkarabilirsin?',
      askReversed: 'Elindekiler yetmiyormuş gibi hissettiğinde aslında neyin eksikliğini duyuyorsun?',
    },
    'cups-10': {
      scene: 'Birbirine sarılmış bir çift kollarını gökteki on kupalı gökkuşağına açıyor; yanlarında iki çocuk el ele dans ediyor. Önlerinde yeşil bir vadi, bir dere ve bir ev var.',
      ask: 'Sana gerçekten yuva hissini veren kimler ve neler?',
      askReversed: 'Hayalindeki aile ile yaşadığın gerçek arasında ne fark var?',
    },
    'cups-11': {
      scene: 'Çiçek desenli mavi tunikli, başı sarıklı bir genç, elindeki kupadan başını uzatan küçük bir balığa şaşkın bir sevinçle bakıyor. Arkasında dalgalı bir deniz uzanıyor.',
      ask: 'İçinden gelen hangi yumuşak mesajı ciddiye alabilirsin?',
      askReversed: 'Duygularına tepki verirken içindeki çocuk neye ihtiyaç duyuyor?',
    },
    'cups-12': {
      scene: 'Kanatlı miğferli bir şövalye beyaz atının üstünde ağır ağır ilerliyor, bir kupayı önüne uzatmış. Arkasında kıvrılan bir dere ve yamaçlar uzanıyor.',
      ask: 'Kalbinin sesini izlersen kime neyi sunmak istersin?',
      askReversed: 'Hangi ilişkide gerçeği değil, kafandaki masalı izliyorsun?',
    },
    'cups-13': {
      scene: 'Bir kraliçe deniz kıyısındaki tahtında oturmuş, elindeki melek kulplu, kapaklı süslü kupaya dikkatle bakıyor. Tahtı küçük su perileriyle işli, ayaklarının dibinde çakıllar ve su var.',
      ask: 'Sezgin bu konuda sana hangi duyguyu gösteriyor?',
      askReversed: 'Başkalarının duygularını taşırken kendi duygularını nerede unutuyorsun?',
    },
    'cups-14': {
      scene: 'Bir kral dalgalı denizin ortasındaki taş tahtında sakince oturuyor; bir elinde kupa, öbüründe kısa bir asa var. Boynunda balık biçimli bir kolye, arkada bir gemi ve sıçrayan bir balık görünüyor.',
      ask: 'Dalgalar yükseldiğinde sakinliğini nasıl koruyorsun?',
      askReversed: 'Sakin görünürken içinde bastırdığın duygu ne?',
    },

    // Kılıçlar
    'swords-01': {
      scene: 'Bir buluttan uzanan el dik bir kılıcı sıkıca kavramış; kılıcın ucunda, zeytin ve palmiye dalları sarkan bir taç var. Altta sarı damlalar ve çıplak dağlar görünüyor.',
      ask: 'Kafandaki sisi dağıtan açık gerçek ne?',
      askReversed: 'Hangi eksik bilgi ya da sert söz kafanı karıştırıyor?',
    },
    'swords-02': {
      scene: 'Gözleri bağlı, beyaz giysili bir kadın taş bir bankta oturmuş, kollarını göğsünde çaprazlayıp iki kılıcı omuzlarında tutuyor. Arkasında kayalıklı bir deniz, gökte ince bir hilal var.',
      ask: 'Karar vermemek için neyi görmezden geliyorsun?',
      askReversed: 'Bunca bilginin içinde asıl dinlemen gereken ses hangisi?',
    },
    'swords-03': {
      scene: 'Kırmızı bir kalbi üç kılıç delip geçiyor. Arkada gri bulutlardan yoğun bir yağmur yağıyor; kart, acıyı süslemeden, olduğu gibi gösteriyor.',
      ask: 'Kırılan kalbin sana hangi gerçeği anlatıyor?',
      askReversed: 'Hangi acıyı bırakmaya ya da nihayet hissetmeye hazırsın?',
    },
    'swords-04': {
      scene: 'Bir şövalye heykeli, elleri dua eder gibi birleşmiş halde taş bir sandukanın üstünde uzanıyor. Duvarda üç kılıç asılı, dördüncüsü sandukanın yanında duruyor; köşede renkli bir vitray var.',
      ask: 'Gerçekten dinlenmek için neye izin vermen gerekiyor?',
      askReversed: 'Bu kadar yorgunken durmanı engelleyen ne?',
    },
    'swords-05': {
      scene: 'Kızıl saçlı bir genç üç kılıcı toplamış, gülümseyerek omzunun üstünden bakıyor; yerde iki kılıç daha var. Uzakta iki kişi başları önde kıyıya doğru uzaklaşıyor, gökte yırtık bulutlar var.',
      ask: 'Haklı çıkmak sana neye mal oluyor?',
      askReversed: 'Kimle barışmak ya da hangi kini bırakmak istiyorsun?',
    },
    'swords-06': {
      scene: 'Bir kayıkçı, başı örtülü bir kadınla bir çocuğu taşıyan kayığı sırıkla karşı kıyıya itiyor. Kayığın içinde altı kılıç dik duruyor; bir yanda dalgalı, önde sakin su var.',
      ask: 'Zor bir yerden uzaklaşırken yanında ne götürmek istiyorsun?',
      askReversed: 'Geçmeni engelleyen hangi bitmemiş iş seni kıyıda tutuyor?',
    },
    'swords-07': {
      scene: 'Bir adam kollarında beş kılıçla parmak uçlarında bir ordugâhtan uzaklaşıyor, omzunun üstünden geriye bakıyor. Arkasında yere saplı iki kılıç ve çadırlar kalmış.',
      ask: 'Neyi kimseye söylemeden, tek başına halletmeye çalışıyorsun?',
      askReversed: 'Kendine itiraf etmekten kaçındığın gerçek ne?',
    },
    'swords-08': {
      scene: 'Gözleri bağlı, bedeni gevşekçe sarılmış bir kadın, çamurlu bir zeminde etrafına saplanmış sekiz kılıcın arasında duruyor. Önü açık; arkada tepede bir kale görünüyor.',
      ask: 'Hangi düşünce seni aslında olmayan bir kafese kapatıyor?',
      askReversed: 'Gözündeki bağı çözdüğünde önünde hangi yolu görüyorsun?',
    },
    'swords-09': {
      scene: 'Bir kişi gece yatağında doğrulmuş, yüzünü ellerinin arasına almış. Arkasındaki karanlık duvarda dokuz kılıç yan yana uzanıyor; yorganında güller ve burç işaretleri var.',
      ask: 'Gece büyüyen korkun gün ışığında nasıl görünüyor?',
      askReversed: 'Bu yükü paylaşmak için kime ulaşabilirsin?',
    },
    'swords-10': {
      scene: 'Kırmızı örtülü bir figür yüzüstü yerde uzanıyor, sırtında on kılıç var. Üstünde kara bir gökyüzü duruyor ama ufukta, sakin suyun üzerinde sarı bir şafak sökülüyor.',
      ask: 'Bu sonun ardından hangi yeni sabahı karşılamak istiyorsun?',
      askReversed: 'Toparlanırken hangi sonu artık kabullenmeye hazırsın?',
    },
    'swords-11': {
      scene: 'Rüzgârlı bir tepede duran genç, kılıcını iki eliyle yukarı kaldırmış, tetikte bir yana bakıyor. Gökte kuşlar uçuşuyor, bulutlar hareketli.',
      ask: 'Merakla gözlemlediğinde bu durumda neyi yeni fark ediyorsun?',
      askReversed: 'Düşünmeden söylediğin sözler kimi ya da neyi etkiliyor?',
    },
    'swords-12': {
      scene: 'Zırhlı bir şövalye beyaz atıyla dörtnala ileri atılıyor, kılıcını havaya kaldırmış. Kırmızı pelerini uçuşuyor; parçalı bulutlar ve eğilen ağaçlar sert bir rüzgârı gösteriyor.',
      ask: 'Hedefine doğru koşarken hangi netlik seni güçlü kılıyor?',
      askReversed: 'Acele ederken kimin sesini ya da hangi ayrıntıyı eziyorsun?',
    },
    'swords-13': {
      scene: 'Bir kraliçe kelebek oymalı taş tahtında yandan görünüyor; bir elinde dik bir kılıç tutuyor, öbür elini ileri uzatmış. Bulutların üstünde tek bir kuş süzülüyor.',
      ask: 'Hangi konuda açık ve dürüst bir sınır çizmek istiyorsun?',
      askReversed: 'Kendini korurken hangi sözlerin gereğinden keskin çıkıyor?',
    },
    'swords-14': {
      scene: 'Mavi cüppeli bir kral tahtında karşıdan bakarak oturuyor, elinde dik bir kılıç tutuyor. Tahtın arkası kelebeklerle süslü; gökte kuşlar, iki yanda ağaçlar var.',
      ask: 'Bu durumda aklının ve vicdanının ortak kararı ne?',
      askReversed: 'Bildiklerini nerede birine üstünlük kurmak için kullanıyorsun?',
    },

    // Tılsımlar
    'pentacles-01': {
      scene: 'Bir buluttan uzanan el, avucunda büyük altın bir tılsım tutuyor. Aşağıda zambaklı bir bahçe ve çiçekli bir kemere uzanan patika var; kemerin ardında dağlar görünüyor.',
      ask: 'Önüne gelen hangi somut fırsatı toprağa ekmek istiyorsun?',
      askReversed: 'Hangi fırsatı plansızlık yüzünden elinden kaçırıyorsun?',
    },
    'pentacles-02': {
      scene: 'Uzun kırmızı şapkalı bir genç, sonsuzluk biçimli yeşil bir kurdeleyle birbirine bağlı iki tılsımı dans eder gibi çeviriyor. Arkasında yüksek dalgaların üstünde iki gemi inip çıkıyor.',
      ask: 'Aynı anda çevirdiğin işler arasında dengeyi nasıl kuruyorsun?',
      askReversed: 'Fazla yüklendiğin işlerden hangisini bırakmak sana nefes aldırır?',
    },
    'pentacles-03': {
      scene: 'Bir taş ustası tahta bir bankın üstünde durmuş, bir katedral kemerinde çalışıyor. Bir keşiş ve desenli pelerinli biri ellerinde planlarla onunla konuşuyor; kemerde üç tılsım oyulmuş.',
      ask: 'Bu işte kimlerle omuz omuza çalışmak seni büyütür?',
      askReversed: 'Ekipte ya da ortak işte hangi konuşma eksik kalıyor?',
    },
    'pentacles-04': {
      scene: 'Taçlı bir adam bir tılsımı iki koluyla göğsüne bastırmış oturuyor; biri tacının üstünde, ikisi ayaklarının altında duruyor. Arkasında bir şehrin binaları uzanıyor.',
      ask: 'Kaybetmekten korktuğun için neyi bu kadar sıkı tutuyorsun?',
      askReversed: 'Tuttuğun şeyi biraz gevşettiğinde neye yer açılıyor?',
    },
    'pentacles-05': {
      scene: 'Yırtık giysili iki kişi karda yürüyor; biri koltuk değnekleriyle ilerliyor, öbürü şalına sarınmış. Yanlarından geçtikleri duvarda beş tılsımlı, ışıklı bir vitray pencere parlıyor.',
      ask: 'Zor anında yanı başındaki hangi yardımı görmüyorsun?',
      askReversed: 'Uzatılan yardımı kabul etmeni ne zorlaştırıyor?',
    },
    'pentacles-06': {
      scene: 'Kırmızı pelerinli, varlıklı görünen bir adam bir elinde terazi tutarken, önünde diz çökmüş iki kişiden birine para veriyor. Yukarıda altı tılsım asılı gibi duruyor.',
      ask: 'Verme ve alma arasındaki dengen şu sıralar nasıl?',
      askReversed: 'Hangi ilişkide yardım bir koşula ya da borca dönüşüyor?',
    },
    'pentacles-07': {
      scene: 'Genç bir çiftçi çapasına yaslanmış, üzerinde altı tılsım büyüyen yeşil bir çalıya düşünceli gözlerle bakıyor. Yedinci tılsım ayaklarının dibinde duruyor.',
      ask: 'Emek verdiğin şeyde şimdiye kadar neler filizlendi?',
      askReversed: 'Emeğinin karşılığını beklerken sabrını ne tüketiyor?',
    },
    'pentacles-08': {
      scene: 'Bir zanaatkâr tezgâhında oturmuş, çekiç ve keskiyle bir tılsımı oyuyor. Bitirdiği altı tılsım yanındaki direğe asılı, biri yerde duruyor; uzakta bir kasaba görünüyor.',
      ask: 'Hangi beceriyi her gün biraz daha ustalaştırmak istiyorsun?',
      askReversed: 'Mükemmeli beklerken hangi işin anlamını kaybediyorsun?',
    },
    'pentacles-09': {
      scene: 'Çiçek desenli zarif bir elbise giymiş bir kadın, üzümlerle dolu bir bağda duruyor; eldivenli elinde başlıklı bir şahin var. Öbür eli yanındaki tılsımlara dokunuyor; etrafında dokuz tılsım yer alıyor.',
      ask: 'Kendi emeğinle kurduğun hayatta neyin tadını çıkarıyorsun?',
      askReversed: 'Bu konforu korumak için kendinden neyi eksiltiyorsun?',
    },
    'pentacles-10': {
      scene: 'Bir kemerin altında yaşlı bir adam iki beyaz köpeğiyle oturuyor, yanında bir çift ve bir çocuk duruyor. Sahnenin üstüne on tılsım dağılmış; arkada bir kale ve kasaba görünüyor.',
      ask: 'Kuşaktan kuşağa taşımak istediğin değer ne?',
      askReversed: 'Ailende paylaşım konusunda hangi konuşma ertelenmiş duruyor?',
    },
    'pentacles-11': {
      scene: 'Yeşil tunikli, kırmızı başlıklı bir genç çiçekli bir çayırda duruyor; iki eliyle havaya kaldırdığı tılsıma dikkatle bakıyor. Arkada ağaçlar, sürülmüş bir tarla ve bir dağ var.',
      ask: 'Öğrenmek istediğin şey için ilk somut adım ne?',
      askReversed: 'Başlamayı ertelediğin hedef için seni ne oyalıyor?',
    },
    'pentacles-12': {
      scene: 'Zırhlı bir şövalye kıpırdamadan duran siyah bir atın üstünde, elindeki tılsıma bakıyor. Miğferinde yeşil yapraklar var, arkasında sürülmüş bir tarla uzanıyor.',
      ask: 'Yavaş ama emin adımlarla hangi işi büyütüyorsun?',
      askReversed: 'Rutinin seni nerede besliyor, nerede yerinde saydırıyor?',
    },
    'pentacles-13': {
      scene: 'Bir kraliçe çiçekli bir bahçedeki oymalı taş tahtında oturuyor, kucağındaki tılsıma şefkatle bakıyor. Üstünde güllerden bir kemer, köşede küçük bir tavşan var.',
      ask: 'Kendine ve evine bugün nasıl özen gösterebilirsin?',
      askReversed: 'İş ve ev arasında koşarken kendin için ne kalıyor?',
    },
    'pentacles-14': {
      scene: 'Üzüm ve asma desenli cübbeli bir kral, boğa başlarıyla süslü tahtında oturuyor; bir elinde tılsım, öbüründe asa tutuyor. Çevresi asmalarla sarılı, arkasında bir kale yükseliyor.',
      ask: 'Kurduğun bolluğu nasıl sağlam ve cömert biçimde yönetiyorsun?',
      askReversed: 'Başarının peşinde hangi değerini gözden kaçırıyorsun?',
    },
  };

  function noteOf(id) { return NOTES[id] || null; }

  const api = { NOTES, noteOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TAROT_NOTES = api;
})(typeof window !== 'undefined' ? window : globalThis);
