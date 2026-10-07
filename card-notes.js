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

  // Editoryal okuma katmanı: her yönün kendi odağı, somut adımı ve kategori karşılığı.
  // Sıra: tema ailesi | odak | küçük adım | ilişki bağlamı | iş bağlamı.
  // Bunlar olgu veya kehanet değil; kartın geleneksel anlamına dayanan okuma önerileridir.
  const READINGS = {
    major: [
      ['initiative|yeni bir başlangıç|İlk adımı küçük ve geri alınabilir tut.|Yakınlığa açık olmak, sınırlarını unutmayı gerektirmez.|Yeni fikri büyük bir taahhütten önce küçük bir denemeyle sınayabilirsin.', 'constraint|hesapsız risk ya da adım atma korkusu|Cesaretle tedbirsizliği birbirinden ayır.|İlişkide aceleyle açılmak kadar tamamen kapanmak da bağ kurmayı zorlaştırabilir.|Başlamadan önce eksik planı ve gerçek riski belirginleştirebilirsin.'],
      ['initiative|niyeti eyleme dönüştürmek|Elindeki bir beceriyi görünür bir adımda kullan.|İletişimde niyetini açık bir davranışla göstermek yakınlığı destekleyebilir.|Becerini somut bir örnekle ortaya koymak, fikrini yalnızca anlatmaktan güçlü olabilir.', 'uncertainty|boş vaat ya da kullanılmayan beceri|Söylenenle yapılanı yan yana koy.|Güven, etkileyici sözlerle birlikte tutarlı davranış da ister.|Dağınık yetenekleri tek bir hedefte toplamak çalışma yönünü netleştirebilir.'],
      ['rest|sessiz gözlem ve sezgi|Karar vermeden önce henüz bilmediğin ayrıntıyı not et.|Söylenmemiş duyguları varsaymak yerine iletişim için alan bırakabilirsin.|Bilgi toplamak, henüz hazır olmayan bir planı açıklamaktan daha yararlı olabilir.', 'uncertainty|bastırılan iç ses ve eksik bilgi|Sezginin dayandığı gözlemle varsayımı ayır.|Suskunlukta kendi ihtiyacını da duyabilmek ilişkiyi daha açık okuyabilmeni sağlar.|Eksik bilgiyi fark etmek, belirsizliği tahminlerle doldurmaktan daha sağlamdır.'],
      ['support|beslemek ve büyütmek|Büyümesini istediğin bir şeye düzenli özen ayır.|Şefkatin karşılıklı olarak yaşanabildiği bir bağ öne çıkıyor.|Yaratıcı bir işi besleyen koşulları kurmak, yalnızca sonuç beklemekten daha verimli olabilir.', 'burden|özen eksikliği ya da aşırı korumacılık|Verdiğin özenin içinde kendine kalan yeri fark et.|Sürekli bakım veren kişi olmak, kendi ihtiyacını görünmez kılabilir.|Üretkenlik için dinlenme ve kaynak ihtiyacını da hesaba katabilirsin.'],
      ['control|sağlam yapı ve sınırlar|Bir sorumluluğun sınırını açıkça tanımla.|Güven veren düzen ile kontrol etme isteği arasındaki fark önem kazanıyor.|Görev ve yetkilerin netliği sağlam bir çalışma zemini kurabilir.', 'control|katılık ya da düzen eksikliği|Bir kuralın hâlâ işe yarayıp yaramadığını gözden geçir.|İlişkide sınır koymak, karşı tarafın seçimlerini yönetmek değildir.|Kontrolü artırmak yerine aksayan yapıyı ve yetki paylaşımını inceleyebilirsin.'],
      ['support|ortak değerler ve öğrenme|Güvendiğin bir kaynakla bildiklerini karşılaştır.|Bağlılık beklentilerinizin gerçekten ortak olup olmadığını konuşabilirsin.|Mentorluk ve öğrenme, işte bir sonraki adımı sağlamlaştırabilir.', 'independence|kalıpları sorgulamak|Sürdürdüğün bir kuralın sana neden uyduğunu tart.|Dış beklentilerle kendi ilişki anlayışın arasındaki mesafe belirginleşebilir.|Alışılmış yöntemi sorgulamak, işe yarayan parçalarını atmayı gerektirmez.'],
      ['bond|değerlerle uyumlu yakınlık|Bir seçimde senin için vazgeçilmez değeri adlandır.|Yakınlık, karşılıklı çekimin yanında bilinçli bir bağlılık seçimini de içeriyor.|Ortaklık veya kararın kendi değerlerinle uyumunu değerlendirebilirsin.', 'choice|değer çatışması ve kararsızlık|Uyuşmayan beklentileri ayrı ayrı yaz.|Çekim sürse bile beklentilerdeki ayrılık konuşulmayı bekliyor olabilir.|İki seçeneği yalnızca kazançlarıyla değil, değerlerinle uyumlarıyla karşılaştırabilirsin.'],
      ['initiative|farklı güçleri tek yöne toplamak|Hedefini ve bugün kontrol edebildiğin adımı ayır.|İlişkide ilerlemek, iki kişinin iradesine birlikte yer vermeyi ister.|Dağınık çabaları tek bir hedefte toplamak ilerlemeyi görünür kılabilir.', 'conflict|farklı yönlere çekilmek|Hızlanmadan önce yönünü yeniden belirle.|Zorlayarak ilerlemek, ortak yön bulma ihtiyacını örtebilir.|Hız ve baskı artarken hedefin hâlâ net olup olmadığını kontrol edebilirsin.'],
      ['balance|sabırlı cesaret|Zor bir tepkiye sakin bir sınırla karşılık ver.|Şefkat ile öz saygıyı birlikte korumak bağın dayanıklılığını destekleyebilir.|Baskı altında sakin kalmak, becerini kullanman için alan açabilir.', 'constraint|öz şüphe ve taşan tepki|Kendine yüklediğin beklentiyi daha gerçekçi bir adıma indir.|Kırılganlığı saklamak yerine ihtiyacını ölçülü biçimde dile getirebilirsin.|Öz güven eksikliği ile gerçek beceri açığını birbirinden ayırabilirsin.'],
      ['rest|içe dönerek anlam aramak|Kendi düşünceni duymak için kısa bir sessiz alan aç.|Mesafe bazen duyguyu anlamaya alan açar; süresiz suskunlukla aynı şey değildir.|Araştırma ve derin çalışma için dikkatini dağıtan şeyi azaltabilirsin.', 'constraint|izolasyon ya da içe bakmaktan kaçış|Yalnızlık ihtiyacınla kopma isteğini ayır.|Geri çekilmenin iletişimi tamamen kesip kesmediğini fark edebilirsin.|Tek başına çözmeye çalıştığın işte ne zaman destek gerektiğini değerlendirebilirsin.'],
      ['change|değişen koşullar ve döngüler|Değişen bir koşula göre planını küçükçe güncelle.|Bağın ritmi değişirken eski beklentileri otomatik sürdürmek zorunda değilsin.|Koşullardaki değişim, esnek bir planı katı beklentiden daha değerli kılabilir.', 'constraint|tekrarlayan aksaklık ve değişime direnç|Tekrar eden sorunda değiştirebildiğin parçayı belirle.|Aynı ilişki döngüsünde senin tutumunun payını inceleyebilirsin.|Aksayan süreci yeniden değerlendirirken şansla kontrolünü birbirinden ayırabilirsin.'],
      ['clarity|denge ve sorumluluk|Bir konuda hem kendi payını hem karşılıklı sorumluluğu yaz.|İlişkide adil olmak, iki tarafın ihtiyacını aynı dikkatle ele almayı ister.|Sözleşme, görev veya değerlendirmede açıklık ve tutarlılık öne çıkıyor.', 'uncertainty|adaletsizlik ya da sorumluluktan kaçış|Yargıya varmadan önce eksik bilgiyi tamamla.|Suçlamakla sorumluluk paylaşmak arasındaki fark bağ için önemli olabilir.|Haksızlık hissini somut olay ve ölçütlerle ele alabilirsin.'],
      ['rest|bekleyerek bakış açısını değiştirmek|Hemen çözmek yerine soruna başka bir açıdan bak.|Bir duraklama, kimin neyi beklediğini anlamak için alan açabilir.|İlerlemenin yavaşladığı yerde yöntemi değiştirmek düşünülebilir.', 'constraint|sonuçsuz bekleyiş ve direnç|Bekleyişin hangi koşulda biteceğini kendin için tanımla.|Süresiz fedakârlıkla bilinçli beklemeyi birbirinden ayırabilirsin.|Aynı yöntemi sürdürmenin bedelini küçük bir değerlendirmeyle görünür kılabilirsin.'],
      ['change|bir dönemi kapatmak|İşlevini yitirmiş bir alışkanlığa küçük bir kapanış ver.|İlişkinin eski biçimini bırakmak, yeni ihtiyacı görmene alan açabilir.|Tamamlanmış veya tükenmiş bir süreci sürdürme nedenini sorgulayabilirsin.', 'attachment|bitmiş olana tutunmak|Bırakmakta zorlandığın şeyin neyi koruduğunu adlandır.|Bağı sürdürme isteğiyle değişim korkusu birbirine karışmış olabilir.|Eski bir çalışma biçimine tutunmanın yeni adımı nasıl geciktirdiğine bakabilirsin.'],
      ['balance|ölçülü uyum ve sabır|İki uç arasında sürdürülebilir bir ritim dene.|Farklı ihtiyaçlar, karşılıklı ayarla aynı bağ içinde yer bulabilir.|Tempo ve kaynakları uyumlamak istikrarlı ilerlemeyi destekleyebilir.', 'conflict|ölçünün kaçması ve uyumsuz ritim|Fazla ve eksik kalan tarafı ayrı ayrı belirle.|Bir tarafın hızına sürekli uymak, kendi ihtiyacını geride bırakabilir.|Çalışma temposundaki dengesizliği küçük bir düzenlemeyle ele alabilirsin.'],
      ['attachment|bağımlı tutunma ve güç ilişkisi|Seni bağlayan alışkanlığın kısa vadeli kazancını ve bedelini yaz.|Yoğun çekimle özgürce seçilmiş yakınlığı birbirinden ayırabilirsin.|Başarı isteğinin seni hangi zorlayıcı alışkanlığa bağladığını fark edebilirsin.', 'independence|bağlayıcı bir örüntüyü gevşetmek|Seni kısıtlayan bir alışkanlıkta küçük bir sınır dene.|Yakınlığı korurken kendi seçim alanını geri kazanmak mümkün olabilir.|Zorlayıcı çalışma örüntüsünden çıkış için uygulanabilir bir sınır belirleyebilirsin.'],
      ['change|sarsılan bir yapı|Sarsıntıdan sonra önce hangi zeminin hâlâ sağlam olduğunu belirle.|Kırılan bir beklenti, bağın gerçek koşullarını daha açık görmeyi sağlayabilir.|Bir planın aksaması, dayandığı varsayımı yeniden incelemeyi gerektirebilir.', 'attachment|ertelenen yüzleşme|Görmezden geldiğin bir sorunu küçük ve somut biçimde ele al.|Gerginliği bastırmak, konuşulması gereken ihtiyacı ortadan kaldırmaz.|Ertelenen yapısal sorunu erken fark etmek sonraki yükü azaltabilir.'],
      ['hope|yenilenen umut|Umudunu destekleyen küçük bir davranışı sürdür.|İyileşme ve güven, yavaşça yeniden kurulabilecek alanlar olarak görünüyor.|Uzun hedefinle bugün yapabileceğin küçük işi birbirine bağlayabilirsin.', 'constraint|umuda erişmekte zorlanmak|Yüksek beklentiyi bugün yapılabilir bir adıma indir.|Hayal kırıklığı, ihtiyacını değersiz kılmadan ele alınabilir.|Motivasyon düşerken hedefin anlamını ve çalışma yükünü yeniden tartabilirsin.'],
      ['uncertainty|belirsizlik ve sezgisel korku|Bildiklerinle tahminlerini iki ayrı sütuna yaz.|Belirsizlikte karşı tarafın niyetini varsaymak yerine açıklık isteyebilirsin.|Kesinleşmemiş bilgiyi, kararını dayandırdığın gerçeklerden ayırabilirsin.', 'clarity|sis dağılırken kalan kuşku|Netleşen bir bilgiyi ve hâlâ açık olan soruyu ayır.|Kuşku azalırken güveni davranışlarla yeniden değerlendirebilirsin.|Belirsizliğin hangi kısmının çözüldüğünü somut bilgiyle kontrol edebilirsin.'],
      ['hope|açıklık ve görünür sevinç|İyi giden bir şeyin nedenini fark edip ona yer aç.|Duyguların açıkça paylaşılabildiği bir yakınlık öne çıkıyor.|Ürettiğin değeri görünür kılmak çalışma güvenini destekleyebilir.', 'constraint|sevince ulaşmayı zorlaştıran beklenti|İyi giden şeyi kusursuzluk beklentisinden ayır.|Yakınlığın iyi tarafını, ideal bir ilişki ölçüsüyle gölgelememeye dikkat edebilirsin.|Geciken takdir ile gerçek ilerleme aynı şey değildir.'],
      ['change|yeniden değerlendirme ve çağrı|Geçmiş bir karardan öğrendiğin şeyi bugünkü seçimine kat.|Eski bir ilişki örüntüsünü fark etmek farklı davranmaya alan açabilir.|Deneyimini yeniden değerlendirmek sonraki yönünü belirginleştirebilir.', 'constraint|kendini yargılamak ve çağrıyı ertelemek|Kendine verdiğin hükmü bir öğrenme cümlesine dönüştür.|Geçmişi sürekli yargılamak, bugünkü bağa yer bırakmayabilir.|Öz eleştiriyle öğrenme arasındaki farkı gözeterek bir sonraki adımı seçebilirsin.'],
      ['completion|tamamlanan bir döngü|Bitirdiğin işin ardından neyi koruyacağını belirle.|Bağın geldiği noktayı görmek, sonraki beklentiyi birlikte konuşmaya alan açabilir.|Bir işi tamamlamak, sonucu değerlendirmek için iyi bir durak olabilir.', 'constraint|tamamlanmadan kalan süreç|Kapanış için eksik kalan tek parçayı belirle.|Ucu açık kalan bir konu, bağın ilerleyişini meşgul ediyor olabilir.|Bitirmeyi zorlaştıran ayrıntıyı yeni işlere başlamadan önce ele alabilirsin.'],
    ],
    wands: [
      ['initiative|canlanan istek|Heyecanını küçük bir başlangıca dönüştür.|Çekimin yanında birbirinizi tanımaya da alan ayırabilirsin.|Yeni fikir, kısa bir denemeyle çalışma yönüne dönüşebilir.', 'constraint|sönük istek ve geciken başlangıç|Başlamayı zorlaştıran somut engeli ayır.|İstek eksikliğiyle zamanlama sorununu aynı şey saymamak yararlı olabilir.|Fikrin mi koşulların mı hazır olmadığını değerlendirebilirsin.'],
      ['choice|ufku genişletme kararı|Bir planı gerçek koşullarla karşılaştır.|Bağın geleceği için beklentilerinizi açıkça konuşabilirsiniz.|Genişleme fikrini kaynak ve zaman açısından değerlendirebilirsin.', 'constraint|konfor alanına tutunmak|Korktuğun değişimin hangi kısmının gerçek risk olduğunu yaz.|Belirsiz bir gelecek konuşması yakınlığı askıda tutabilir.|Plan eksikliği ile değişim korkusunu birbirinden ayırabilirsin.'],
      ['hope|ilk sonuçlar ve genişleyen ufuk|İlerlemeyi gösteren küçük bir sonucu kaydet.|Bağın gelişmesi için karşılıklı çabayı görünür kılabilirsin.|İlk geri bildirime göre sonraki adımı ayarlayabilirsin.', 'constraint|beklenen dönüşün gecikmesi|Beklentinin dayandığı süreyi ve bilgiyi yeniden kontrol et.|Geciken karşılığı hemen ilgisizlik olarak okumak zorunda değilsin.|Gecikmenin planını hangi ölçüde etkilediğini somutlaştırabilirsin.'],
      ['support|paylaşılan sevinç ve sağlam zemin|Birlikte iyi giden bir şeyi açıkça takdir et.|Güven ve ortak yaşam hissi bağın güçlü tarafı olabilir.|Ekip veya çalışma ortamındaki sağlam temeli koruyabilirsin.', 'conflict|ortak zeminde huzursuzluk|Ortak beklentide uyuşmayan ayrıntıyı konuş.|Birlikte olma beklentisiyle yaşanan gerçek arasındaki fark önemli olabilir.|Uyum sorununu görünür görev ve beklentiler üzerinden ele alabilirsin.'],
      ['conflict|farklı isteklerin rekabeti|Tartışmada ortak hedefi yeniden adlandır.|Farklı ihtiyaçlar, kimin kazanacağından önce anlaşılmayı bekliyor.|Rekabeti işin ölçütlerine bağlamak kişisel gerilimi azaltabilir.', 'balance|çatışmayı yatıştırmak ya da bastırmak|Sakinleşen konuda gerçekten uzlaşılan parçayı ayır.|Susmakla anlaşmak arasındaki farkı açık bir konuşma gösterebilir.|Rekabet azalsa bile ertelenen anlaşmazlığı gözden kaçırmayabilirsin.'],
      ['hope|görünür başarı ve takdir|Başarını destekleyen gerçek emeği adlandır.|Takdir ve görülme ihtiyacını ölçülü biçimde paylaşabilirsin.|Başarının ardındaki yöntemi fark etmek onu sürdürülebilir kılabilir.', 'constraint|takdire bağımlılık|Değerini yalnızca dış tepkiyle ölçtüğün yeri fark et.|İlgi görme ihtiyacının bağdaki karşılıklılığı gölgeleyip gölgelemediğine bakabilirsin.|Görünür sonuçla gerçek katkını ayrı ayrı değerlendirebilirsin.'],
      ['boundary|yerini savunmak|Koruduğun sınırı kısa ve açık bir cümleyle belirt.|Bağı korumak için kendi sınırını da koruyabilirsin.|Önceliğini savunurken hangi talebi üstlenmeyeceğini belirleyebilirsin.', 'burden|savunmaktan yorulmak|Hangi mücadeleye enerji vermeyeceğini seç.|Sürekli kendini açıklamak yakınlık yerine yorgunluk üretiyor olabilir.|Her talebe karşı koymak yerine enerjini önemli işe ayırabilirsin.'],
      ['initiative|hızlanan iletişim|Hızlı gelen bilgiyi öncelik sırasına koy.|İletişim hızlanırken söylenenin gerçekten anlaşılmasına alan bırakabilirsin.|Hızlı ilerlemeyi küçük kontrollerle destekleyebilirsin.', 'constraint|iletişimde gecikme|Eksik veya geciken mesajı net bir soruyla tamamla.|Mesajın gecikmesini tek başına duygusal bir hükme dönüştürmeyebilirsin.|Bilgi akışındaki tıkanmayı somut bir noktadan çözmeye başlayabilirsin.'],
      ['boundary|yorgun ama dayanıklı kalmak|Sınırını korurken dinlenme payını da belirle.|Geçmiş kırgınlık bugünkü yakınlığa karşı fazla savunma yaratıyor olabilir.|Dayanıklılık, her yükü sürekli taşımak anlamına gelmez.', 'burden|tükenen dayanıklılık|Bir yükü paylaşmak için açık bir talepte bulun.|Savunmayı sürdürmenin duygusal bedelini fark edebilirsin.|Daha fazla zorlamadan önce yük ve kaynak dengesini değerlendirebilirsin.'],
      ['burden|fazla sorumluluk taşımak|Üstlendiğin bir işi paylaşmanın yolunu ara.|Bağın bütün yükünü tek başına taşıyıp taşımadığını değerlendirebilirsin.|Sorumlulukları görünür kılmak, paylaşılabilecek yükü ortaya çıkarabilir.', 'repair|yükü bırakmak ya da ondan kaçmak|Bıraktığın sorumluluğun nasıl devredileceğini netleştir.|Yükü azaltmakla karşılıklı sorumluluktan uzaklaşmak arasındaki fark önemlidir.|İşi bırakmak yerine yükün yönetimini değiştirmek düşünülebilir.'],
      ['initiative|merak ve ilk kıvılcım|Merak ettiğin konuyu küçük bir deneyle keşfet.|Yeni yakınlıkta heyecanla birlikte meraka da yer verebilirsin.|Öğrenmek istediğin fikri küçük bir uygulamada sınayabilirsin.', 'uncertainty|dağınık heves|Bir fikri seçip ilk adımını sınırla.|Heyecanın tutarlı iletişime dönüşüp dönüşmediğini gözlemleyebilirsin.|Birçok fikir yerine tamamlanabilir tek bir deneme seçebilirsin.'],
      ['initiative|cesur hareket ve güçlü istek|Hızın yanında sürdürülebilirliği de düşün.|Çekim güçlü olsa bile bağın ritmini birlikte belirlemek önemlidir.|Girişkenlik, plan ve takip ile daha sağlam hale gelebilir.', 'conflict|aceleci ve düzensiz hareket|Tepki vermeden önce amacını bir cümlede netleştir.|Ani yakınlaşma ve uzaklaşmalar bağda güvensizlik yaratabilir.|Hızlı hareketin yarım bıraktığı işi fark edebilirsin.'],
      ['hope|sıcak özgüven|Kendi isteğini açık ve ölçülü biçimde ifade et.|Kendin olarak görünmek, bağda karşılıklı alanı destekleyebilir.|Yaratıcı gücünü görünür bir katkıya dönüştürebilirsin.', 'constraint|öz güvenin gölgelenmesi|Kendini karşılaştırdığın ölçütü sorgula.|Kıskançlık veya geri çekilme, dile gelmeyen ihtiyacını örtebilir.|Öz şüphe ile başkasının beklentisini kendi ölçütünden ayırabilirsin.'],
      ['control|yön veren irade|Hedefini paylaşırken diğerlerinin katkısına alan aç.|İsteklerini açıkça ortaya koymakla bağı yönetmek farklı şeylerdir.|Liderlik, yön kadar başkalarının katkısını da gözetmeyi ister.', 'control|dayatılan yön ve sabırsızlık|Haklı olma isteğinle ortak hedefi ayır.|Baskı kurmak, karşılıklı yakınlık ihtiyacını karşılamaz.|Kararı hızlandırma isteğinin ekipteki geri bildirimi susturup susturmadığına bakabilirsin.'],
    ],
    cups: [
      ['bond|duygusal açıklık|Bir duyguyu küçük ve dürüst bir cümleyle paylaş.|Yeni veya yenilenen yakınlık için duyguyu görünür kılmak alan açabilir.|Yaratıcı isteğinle çalışma hedefin arasında bir bağ kurabilirsin.', 'constraint|içeride tutulan duygu|Hissettiğinle göstermekte zorlandığın şeyi ayır.|Duygu vardır diye ifade edildiğini varsaymak zorunda değilsin.|Yaratıcı tıkanıklığın hangi ihtiyaca işaret ettiğini fark edebilirsin.'],
      ['bond|karşılıklı yakınlık|Karşılıklı verilen emeği açıkça fark et.|Yakınlık, iki kişinin de duyulduğu bir alışverişle güçlenebilir.|İşbirliğinde karşılıklı beklenti ve katkı önem kazanıyor.', 'conflict|bağda dengesizlik|Verilenle alınan arasındaki farkı yargılamadan konuş.|Çekimin yanında karşılıklılıkta aksayan bir alan olabilir.|Ortaklıkta rol ve katkı dengesini yeniden değerlendirebilirsin.'],
      ['support|paylaşılan neşe ve dostluk|İyi gelen bir desteğe karşılık ver.|Sosyal destek ve paylaşım, bağı besleyen bir alan olabilir.|Ekipteki güven ve ortak sevinç çalışma ritmini destekleyebilir.', 'conflict|paylaşımda dışlanma ya da fazlalık|Birliktelikte kendini nasıl hissettiğini adlandır.|Sosyal çevre veya üçüncü kişilere ilişkin kaygıyı varsayımla büyütmeyebilirsin.|Ekip aidiyetinde aksayan noktayı somut bir örnekle ele alabilirsin.'],
      ['rest|ilgisizlik ve içe çekilme|Önündeki küçük olanağa dikkatle yeniden bak.|Duygusal geri çekilmenin ihtiyacını duymaya çalışabilirsin.|Motivasyon eksikliğinde yeni fırsatı hemen reddetmeden değerlendirebilirsin.', 'initiative|duygusal uyanış|Yeniden ilgi duyduğun şeyi küçük bir adımla yokla.|Yakınlığa yeniden açılmak, eski isteksizliği fark etmeyi sağlayabilir.|İlgini canlandıran bir işe küçük bir deneme ayırabilirsin.'],
      ['loss|kayba odaklanmak|Kaybettiğin şeyin yanında hâlâ kalan desteği adlandır.|Kırgınlık, bağın mevcut iyi taraflarını görünmez kılıyor olabilir.|Bir aksiliği değerlendirirken kalan kaynakları da hesaba katabilirsin.', 'repair|kaybı kabullenerek toparlanmak|Yeniden temas edebildiğin bir desteği kullan.|Kırgınlığın hafiflemesi, yakınlığı yeniden değerlendirmeye alan açabilir.|Geçmiş aksilikten sonra işe yarayan parçayı sürdürmeyi seçebilirsin.'],
      ['attachment|geçmişten gelen sıcaklık|Eski bir hatıranın bugün sana ne söylediğini ayır.|Tanıdık duygular, bugünkü kişinin ve bağın gerçek koşullarıyla birlikte okunabilir.|Geçmiş deneyimin hangi kısmının bugünkü işte hâlâ işe yaradığını tartabilirsin.', 'attachment|geçmişi idealize etmek|Hatırladığınla bugün gerçekten yaşananı karşılaştır.|Eski yakınlığı idealize etmek, bugünkü ihtiyacı geri plana itebilir.|Eski başarıyı tekrarlamak yerine bugünkü koşulları değerlendirebilirsin.'],
      ['uncertainty|çok seçenek ve bulanık istek|Bir seçeneğin gerçek koşulunu öğren.|Hayal edilen ilişkiyle karşılıklı yaşanan bağı ayırabilirsin.|Fikirleri çekicilikleriyle değil, uygulanabilirlikleriyle de değerlendirebilirsin.', 'choice|netleşme ya da hayale kaçış|Somut bilgiyi desteklenmeyen beklentiden ayır.|Ne istediğini netleştirmek, belirsiz beklentiyi azaltabilir.|Seçenekleri elemek için gerçekçi bir ölçüt belirleyebilirsin.'],
      ['change|anlamını yitirmiş olandan ayrılmak|Sürdürdüğün şeyin bugün sana ne verdiğini tart.|Mesafe isteğinin nedenini kendi ihtiyacın üzerinden değerlendirebilirsin.|Bir işin artık taşımadığı anlamı fark etmek yönünü yeniden düşünmeye alan açabilir.', 'attachment|kalmakla gitmek arasında sıkışmak|Kalma ve ayrılma gerekçelerini ayrı ayrı yaz.|Kaybetme korkusu ile bağda kalma isteğini ayırabilirsin.|Değişim korkusuyla mevcut işin gerçek değerini birbirine karıştırmayabilirsin.'],
      ['hope|tatmin ve kişisel sevinç|İyi gelen şeyi ölçülü biçimde hayatına kat.|Kendi mutluluğunun bağdaki karşılıklı ihtiyaca da yer bırakması önemlidir.|Ulaştığın sonucu takdir ederken onu sürdüren koşulları fark edebilirsin.', 'constraint|tatmin etmeyen beklenti|İstediğin sonuçla gerçek ihtiyacını ayır.|Beklentinin karşılanmasıyla duygusal doyum aynı şey olmayabilir.|Başarı ölçütünün seni neden tatmin etmediğini yeniden değerlendirebilirsin.'],
      ['bond|duygusal uyum ve ortak yaşam|Ortak huzuru destekleyen bir davranışı sürdür.|Paylaşılan güven ve aidiyet, bağın besleyici tarafı olarak okunabilir.|Uyumlu ekip ve uzun vadeli amaç çalışma doyumunu destekleyebilir.', 'conflict|ideal birliktelikle gerçek arasındaki fark|Ortak beklentide uyuşmayan parçayı konuş.|Mutlu görünme baskısı, gerçek duygulara yer bırakmayabilir.|Uyum görüntüsünün altında konuşulmayan iş sorununu fark edebilirsin.'],
      ['bond|hassas bir duygusal açılım|Bir duyguyu beklenti yüklemeden dile getir.|Nazik bir iletişim, yeni yakınlık için alan açabilir.|Yaratıcı fikri veya sezgiyi küçük bir çalışmada sınayabilirsin.', 'constraint|kırılgan beklenti ve tıkanıklık|Beklentini açık ve gerçekçi bir dile çevir.|Hayal kırıklığı, ifade edilmemiş isteğinle bağlantılı olabilir.|Yaratıcı isteği zorlamak yerine hangi koşulun eksik olduğunu fark edebilirsin.'],
      ['bond|duyguyu izleyen yaklaşım|İsteğini davranışla destekleyebileceğin ölçüde ifade et.|Romantik yakınlık, samimiyet ile tutarlılık birlikte olduğunda güçlenebilir.|Anlamlı bulduğun fikri somut bir çalışma adımına bağlayabilirsin.', 'uncertainty|duygusal beklentiyle gerçeğin ayrılması|Güzel sözü tutarlı davranışla birlikte değerlendir.|Yoğun duygu, karşılıklı güvenin yerine tek başına geçmez.|Çekici bir fikrin gerçek koşullarını heyecandan ayrı değerlendirebilirsin.'],
      ['support|empati ve duygusal güven|Dinlerken kendi duyguna da yer bırak.|Şefkat, iki kişinin de duygusunun duyulduğu bir bağ kurabilir.|Empati ve dikkat, birlikte çalışmanın güçlü bir kaynağı olabilir.', 'burden|başkasını gözetirken kendini unutmak|Kendi ihtiyacını bir sınırla görünür kıl.|Yakınlığın içinde kendine ait alanı kaybetmemek önem kazanıyor.|Destek verirken üstlendiğin duygusal yükü fark edebilirsin.'],
      ['balance|olgun duygu ve sakin iletişim|Duygunu bastırmadan ölçülü bir biçimde paylaş.|Sakin iletişim, zor duyguların bağ içinde taşınabilmesine yardım edebilir.|Diplomasi, ihtiyacını saklamadan anlaşmaya alan açabilir.', 'conflict|bastırılmış ya da yönetilen duygu|Duyguyu kontrol etme isteğinle ifade etme ihtiyacını ayır.|Ruh hali ve baskı, karşılıklı güveni zorlayabilir.|Duygusal gerilimi görev ve beklentiye ilişkin açık bir konuşmayla ele alabilirsin.'],
    ],
    swords: [
      ['clarity|netleşen düşünce|Düşünceni açık ama incitmeyen bir cümleyle ifade et.|Dürüst iletişim, belirsiz kalan ihtiyacı görünür kılabilir.|Sorunu açık tanımlamak doğru çalışma adımını seçmeyi kolaylaştırabilir.', 'uncertainty|karışık bilgi ve kırıcı söz|Kararını dayandırdığın bilgiyi kontrol et.|Netlik isteğiyle sert konuşmak arasındaki farkı gözetebilirsin.|Yanlış veya eksik bilgiyle acele karar vermeden durumu yeniden tartabilirsin.'],
      ['choice|ertelenen karar|Kaçındığın konuda eksik olan bilgiyi açıkça sor.|Konuşulması ertelenen karar, yakınlığı belirsizlikte tutabilir.|Kararsızlıkta eksik bilgiyle yüzleşmek, seçenekleri daha açık görmeni sağlayabilir.', 'clarity|kararsızlıktan çıkarken zihinsel yük|Gelen bilgiyi tek bir ölçütle sırala.|Belirsizlik azalırken yeni bilgiyi sindirmeye de alan bırakabilirsin.|Her ayrıntıyı aynı anda çözmek yerine karar ölçütünü netleştirebilirsin.'],
      ['loss|acı bir gerçek ve kırgınlık|Kırgınlığını kendini zorlamadan adlandır.|İncinme, bağdaki gerçeğin şefkatle ele alınmasını gerektirebilir.|Hayal kırıklığını çalışma değerinin tamamına yaymadan inceleyebilirsin.', 'repair|iyileşme ya da içeride kalan acı|Hafifleyen ve hâlâ zorlayan duyguyu ayrı ayrı fark et.|Affetmek veya iyileşmek, kırgınlığı yok saymayı gerektirmez.|Geçmiş bir aksiliğin hâlâ etkileyen kısmını somutlaştırabilirsin.'],
      ['rest|durup toparlanmak|Kısa bir dinlenme aralığını gerçekten koru.|Bir ara vermek, duyguyu daha sakin bir yerden ele almayı sağlayabilir.|Dinlenme ve değerlendirme, sonraki adımın niteliğini destekleyebilir.', 'burden|dinlenememek ya da harekete dönüş|Enerjinin hangi işi taşıyabildiğini gerçekçi biçimde tart.|Huzursuzluğu ilişkiye yüklemeden kendi dinlenme ihtiyacını fark edebilirsin.|Yeniden hızlanmadan önce kapasiteni ve bekleyen işi dengeleyebilirsin.'],
      ['conflict|haklı çıkmanın bedeli|Tartışmada kazanmanın senden ne götürdüğünü fark et.|Haklı çıkma çabası, anlaşılma ve bağ kurma ihtiyacını zedeleyebilir.|Rekabette sonucun yanında ekip güveninin bedelini de tartabilirsin.', 'repair|uzlaşma ihtimali ve kalan kırgınlık|Uzlaşmanın somut koşulunu açıkça belirt.|Barışmak, geçmişin etkisini bir anda silmek zorunda değildir.|Gerilimi azaltırken tekrarını önleyecek çalışma koşulunu netleştirebilirsin.'],
      ['change|daha sakin bir zemine geçiş|Geçişi kolaylaştıran küçük bir desteği kullan.|Zor bir dönemden uzaklaşmak, bağın yeni ritmini kurmaya alan açabilir.|Yeni çalışma düzenine geçerken yanında taşıdığın deneyimi fark edebilirsin.', 'attachment|tamamlanamayan geçiş|Geride kalan hangi işin seni tuttuğunu belirle.|Uzaklaşma isteğiyle bitmemiş duyguyu birlikte ele alabilirsin.|Geçişi geciktiren eksik işi veya belirsiz koşulu netleştirebilirsin.'],
      ['uncertainty|gizlilik ve dolaylı hareket|Neyi sakladığını ve nedenini kendin için açıklaştır.|Belirsiz davranışı aldatma kanıtı saymadan güven ihtiyacını konuşabilirsin.|Tek başına yürüttüğün yöntemin ekip güvenine etkisini tartabilirsin.', 'clarity|dürüst yüzleşme|Kendine anlattığın hikâyeyi somut gerçekle karşılaştır.|Açıklık, saklanan veya dolaylı kalan konuyu konuşmaya alan açabilir.|Hatanın veya eksik bilginin kabulü, çalışma yolunu düzeltmeye yardımcı olabilir.'],
      ['constraint|zihinde büyüyen kısıt|Gerçek engelle korkunun çizdiği sınırı ayır.|Sıkışmışlık hissinde kendi seçim alanını yeniden fark edebilirsin.|Yapılamaz görünen işin gerçek koşullarını tek tek inceleyebilirsin.', 'independence|sınırlayıcı düşünceden çıkış|Yeni fark ettiğin seçeneği küçük bir adımda dene.|Kendi alanını geri kazanmak, bağa daha açık bir yerden yaklaşmanı sağlayabilir.|Kısıtlayan varsayımı bırakmak yeni bir çalışma yolu gösterebilir.'],
      ['uncertainty|büyüyen kaygı|Korktuğun şeyle şu an bildiğin şeyi ayır.|Endişe, karşı tarafın gerçek davranışından daha büyük bir hikâye kuruyor olabilir.|Kaygının kararına hangi varsayımı taşıdığını fark edebilirsin.', 'repair|hafifleyen kaygı ya da saklı korku|Destek istemeyi küçük ve açık bir taleple başlat.|Rahatlama, dile gelmeyen korkuya da şefkatle bakmaya alan açabilir.|Tek başına taşıdığın kaygıda destek ihtiyacını görünür kılabilirsin.'],
      ['loss|zor bir kapanış|Bitmiş bir süreci bütün değerine yaymadan ele al.|Bir kırılma, tüm yakınlık ihtimalinin sonu olarak okunmak zorunda değildir.|Aksayan veya biten işi, becerinin tamamından ayrı değerlendirebilirsin.', 'repair|toparlanmak ya da sonu uzatmak|Toparlanmayı destekleyen tek bir koşulu belirle.|Yeni bir zemin kurmakla bitmiş olana tutunmayı birbirinden ayırabilirsin.|Yeniden başlamak için neyi kapatman gerektiğini gözden geçirebilirsin.'],
      ['clarity|merak ve dikkatli gözlem|Bir varsayımı doğrudan bir soruyla sınayabilirsin.|Merakla soru sormak, karşı tarafın zihnini tahmin etmekten daha açık olabilir.|İlk bilgi veya fikri güvenilir bir kaynakla karşılaştırabilirsin.', 'uncertainty|kontrolsüz söz ve kuşku|Paylaşacağın bilginin doğruluğunu önce kontrol et.|Kuşku veya dolaylı soru, açık iletişimi zorlaştırabilir.|Duyumla doğrulanmış bilgiyi ayırmak çalışma güvenini koruyabilir.'],
      ['initiative|hızlı ve doğrudan düşünce|Net fikrini dinlemeye de alan bırakarak paylaş.|Dürüstlük, karşı tarafın ritmine dikkat edildiğinde daha iyi duyulabilir.|Hızlı çözümü küçük bir kontrolle destekleyebilirsin.', 'conflict|acele ve sert iletişim|Tepki vermeden önce cümlenin amacını kontrol et.|Sertlik, anlaşılma isteğini geri plana itiyor olabilir.|Hızlı kararın ekip iletişimine ve işin niteliğine etkisini tartabilirsin.'],
      ['boundary|dürüst sınır ve bağımsızlık|İhtiyacını açık ama ölçülü bir sınırla belirt.|Yakınlık ve bağımsızlık aynı bağın içinde birlikte korunabilir.|Net ölçüt ve sınır, çalışma ilişkisini daha tutarlı hale getirebilir.', 'conflict|duygudan kopan sertlik|Sınırını korurken kullandığın dili yumuşat.|Mesafe korumakla incitmek arasındaki ayrımı gözetebilirsin.|Eleştiriyi kişinin değeri yerine somut işe yöneltebilirsin.'],
      ['clarity|etik ve analitik karar|Kararının ölçütünü ve gerekçesini açıkça yaz.|Netlik, duyguyu dışlamadan sorumluluk paylaşımına alan açabilir.|Tutarlı ölçütlerle karar almak, yetkiyi daha anlaşılır kılabilir.', 'control|bilgiyi baskı için kullanmak|Haklılık iddianı somut ölçütle yeniden tart.|Akıl yürütmek, karşı tarafın deneyimini geçersiz kılmak değildir.|Uzmanlık veya yetkinin başkalarını susturmak için kullanılıp kullanılmadığına bakabilirsin.'],
    ],
    pentacles: [
      ['initiative|somut bir fırsat|Bir fırsatın gerçek koşullarını öğren.|Güven ve özen, küçük somut davranışlarla kurulabilir.|Yeni iş veya üretim olanağını kaynak ve koşullarla birlikte değerlendirebilirsin.', 'constraint|hazırlıksız veya kaçan fırsat|Başlamak için eksik olan hazırlığı belirle.|Bağı besleyen somut emek, niyetin yanında önem kazanıyor.|Plan eksikliğini fark etmek fırsata daha sağlam yaklaşmanı sağlayabilir.'],
      ['balance|birden fazla ihtiyacı dengelemek|Bugün öncelikli olan iki işi sırala.|Birlikte zaman ile kişisel sorumluluk arasında ayar gerekebilir.|Esneklik, işlerin hepsine aynı anda yüklenmek yerine öncelik kurmayı destekler.', 'burden|dağılan denge ve fazla yük|Üstlenemeyeceğin bir talebi açıkça sınırla.|Zaman veya emek dengesizliği yakınlığı yoruyor olabilir.|Yükü azaltmak, çalışma düzenini yeniden kurmak için alan açabilir.'],
      ['craft|ortak emek ve öğrenme|Katkını ve ihtiyaç duyduğun desteği netleştir.|Bağ, iki kişinin de emek ve öğrenmeye yer verdiği bir süreç olabilir.|İşbirliği ve geri bildirim, ürettiğin işin niteliğini geliştirebilir.', 'conflict|uyumsuz işbirliği|Görev ve beklentide uyuşmayan noktayı konuş.|Birlikte çabalarken neyin eksik kaldığını somutlaştırabilirsin.|İletişim veya rol eksikliği, ortak işin kalitesini zorlayabilir.'],
      ['control|güven için sıkı tutunmak|Koruduğun şeyin yanında hangi alanı daralttığını fark et.|Güven ihtiyacı, yakınlığı kontrol etme isteğine dönüşebilir.|Kaynak korumakla değişime tamamen kapanmayı birbirinden ayırabilirsin.', 'balance|tutunmayı gevşetmek ya da ölçüyü kaybetmek|Bırakacağın kontrolün sınırını bilinçli belirle.|Alan açmak, güven ihtiyacını yok saymayı gerektirmez.|Kaynak yönetiminde sıkı tutma ve dağılma uçlarını birlikte değerlendirebilirsin.'],
      ['scarcity|yoksunluk ve dışarıda kalma hissi|Yakınındaki ulaşılabilir desteği adlandır.|Yalnız veya desteksiz hissetmek, yardımın hiç olmadığı anlamına gelmeyebilir.|Eksik kaynak karşısında destek ve alternatifleri somutlaştırabilirsin.', 'repair|desteği kabul ederek toparlanmak|Kullanabileceğin bir desteğe açık bir talepte bulun.|Yardım kabul etmek, bağda karşılıklılığa yeniden alan açabilir.|Toparlanmayı destekleyen küçük bir kaynağı değerlendirebilirsin.'],
      ['support|verme ve alma dengesi|Alışverişte iki tarafın ihtiyacını da görünür kıl.|Özenin karşılıklı yaşanması bağın dengesini destekleyebilir.|Destek ve katkının koşullarını açık tutmak işbirliğini güçlendirebilir.', 'control|koşullu veya tek taraflı destek|Verilen desteğin senden ne beklediğini netleştir.|Yardımın bir güç ilişkisine dönüşüp dönüşmediğini değerlendirebilirsin.|Katkı veya desteğin koşullarını örtük bırakmadan konuşabilirsin.'],
      ['craft|sabırla emeği değerlendirmek|İlerlemeni küçük bir ölçütle gözden geçir.|Bağın gelişmesi için zaman kadar karşılıklı emek de önemlidir.|Uzun süren çalışmada neyin ilerlediğini ara değerlendirmeyle görebilirsin.', 'constraint|emeğin karşılığında hayal kırıklığı|Beklenen sonuçla gerçek ilerlemeyi ayrı ölç.|Bekleyişin iki taraf için ne anlama geldiğini konuşabilirsin.|Sürdürmekle yöntemi değiştirmek arasında somut bir değerlendirme yapabilirsin.'],
      ['craft|özenle ustalaşmak|Bir beceriyi küçük ve düzenli bir pratikle geliştir.|Sevgi, günlük küçük özenlerle görünür hale gelebilir.|Ustalaşma, çalışmanın niteliğine düzenli dikkat vermeyi ister.', 'constraint|kusursuzluk baskısı ve yönsüz emek|Yeterince iyi olan işin bitiş ölçütünü belirle.|İlişkiyi kusursuz yapma çabası doğal yakınlığı zorlayabilir.|Emek verirken hedefin ve bitiş ölçütünün net olması önem kazanıyor.'],
      ['independence|kendi emeğinin verdiği güven|Emekle kurduğun bir alanın değerini fark et.|Bağ içinde kişisel alanını korumak karşılıklı saygıyı destekleyebilir.|Kendi emeğinin sonucunu görmek çalışma güvenini besleyebilir.', 'burden|konforun ardındaki kırılganlık|Görünen başarıyla taşıdığın yükü ayrı değerlendir.|Bağımsız görünmek, destek ihtiyacını saklamayı gerektirmez.|Aşırı çalışmanın sağladığı konforla götürdüğü zamanı birlikte tartabilirsin.'],
      ['completion|kalıcı zemin ve ortak güven|Uzun vadede korumak istediğin temeli adlandır.|Ortak yaşam ve aidiyet, paylaşılan değerlerle desteklenebilir.|Kalıcı yapı ve sürdürülebilir emek çalışma yönüne zemin olabilir.', 'conflict|ortak güvenlikte anlaşmazlık|Ortak sorumluluğun koşullarını açıkça konuş.|Aile veya ortak kaynak beklentilerindeki ayrılık bağı etkileyebilir.|Uzun vadeli yapıdaki uyuşmazlığı somut görev ve beklentilere ayırabilirsin.'],
      ['craft|öğrenerek somut hedefe yaklaşmak|Bir hedef için öğrenmen gereken küçük beceriyi seç.|Bağı tanımak, düzenli ilgi ve öğrenmeyle ilerleyen bir süreç olabilir.|Küçük bir öğrenme adımı, hedefini daha uygulanabilir kılabilir.', 'constraint|uygulamaya geçmeyen hedef|İlerlemeyen planda ilk somut işi belirle.|Niyetin davranışa dönüşmediği alanı fark edebilirsin.|Öğrenmekle ertelemek arasındaki ayrımı küçük bir uygulama gösterebilir.'],
      ['craft|istikrarlı sorumluluk|Sürdürülebilir bir rutini küçük bir adımla koru.|Güven, tutarlı ve sakin emekle kurulabilir.|Düzenli çalışma, yavaş ilerlemeyi de görünür bir katkıya dönüştürebilir.', 'constraint|durgun veya aşırı çalışma ritmi|Rutinin hangi kısmının artık işe yaramadığını gözden geçir.|Güven veren düzen ile bağı cansızlaştıran alışkanlığı ayırabilirsin.|Sürekli çalışmakla verimli ilerlemeyi aynı şey saymamak yararlı olabilir.'],
      ['support|pratik özen ve denge|Kendine verdiğin özeni günlük bir işe kat.|Bağda bakım verirken kendi ihtiyacına da yer açabilirsin.|Ev ve iş arasında sürdürülebilir bir bakım ritmi önem kazanıyor.', 'burden|özen verirken kendini ihmal etmek|Kendi ihtiyaçlarından birini bugünkü önceliğine al.|Sürekli destek olmak, kişisel alanını eritiyor olabilir.|İş ve yaşam dengesinde kendine kalan zamanı değerlendirebilirsin.'],
      ['control|sağlam ve güvenilir yönetim|Kurduğun düzenin kime nasıl yarar sağladığını değerlendir.|Güven, istikrarın yanında karşılıklı alan da ister.|Sorumlu yönetim, kaynak ve katkıları birlikte gözetebilir.', 'attachment|başarı ve güvenliğe aşırı tutunmak|Sonucun yanında onu elde etmenin bedelini tart.|Maddi veya somut güven, duygusal yakınlığın tamamı değildir.|Başarı ölçütünün diğer değerlerini geri plana itip itmediğini değerlendirebilirsin.'],
    ],
  };
  for (const [suit, rows] of Object.entries(READINGS)) rows.forEach((directions, index) => {
    const id = `${suit}-${String(suit === 'major' ? index : index + 1).padStart(2, '0')}`;
    NOTES[id].reading = Object.fromEntries(directions.map((line, i) => {
      const [family, focus, action, love, work] = line.split('|');
      return [i ? 'reversed' : 'upright', { family, focus, action, love, work }];
    }));
  });

  function noteOf(id) { return NOTES[id] || null; }

  function readingOf(id, reversed) { return noteOf(id)?.reading[reversed ? 'reversed' : 'upright'] || null; }
  function contextOf(id, reversed, spreadId) {
    const profile = readingOf(id, reversed);
    return profile ? spreadId === 'relationship' ? profile.love : spreadId === 'career' ? profile.work : '' : '';
  }

  const SYNTHESIS = {
    'bond|choice': 'Yakınlığı güçlendirmek için, ertelenen kararı konuşmak daha fazla ilgi göstermekten önce gelebilir.',
    'bond|uncertainty': 'Bağ kurma isteği ile belirsizlik yan yana; varsayım yerine açık iletişim güvene alan açabilir.',
    'bond|control': 'Yakınlık arayışı, kontrol arttığında daralabilir; güven ile kişisel alanı birlikte gözetmek önem kazanıyor.',
    'bond|conflict': 'Bağı sürdürme isteği, uyuşmayan ihtiyacı yok saymayı gerektirmiyor; karşılıklılık açık konuşmayla sınanabilir.',
    'bond|boundary': 'Yakınlık ile sınır birbirini dışlamıyor; kişisel alanı açıkça ifade etmek bağın güvenini destekleyebilir.',
    'burden|rest': 'Yükü taşımakla durup toparlanmak arasında ayar gerekiyor; dinlenme, emeğin devamı için yer açabilir.',
    'burden|support': 'Tek başına taşınan sorumluluk, destek paylaşıldığında daha yönetilebilir bir hale gelebilir.',
    'craft|hope': 'Görünür sonuç veya umut, düzenli emeğe dayandığında daha sağlam bir zemine oturabilir.',
    'craft|constraint': 'Emek verme isteği sürerken ilerleme daralıyor olabilir; daha çok çalışmadan önce yöntemin ve hedefin netliği değerlendirilebilir.',
    'clarity|uncertainty': 'Netlik arayışı ile eksik bilgi karşı karşıya; bilinenle tahmin edileni ayırmak kararın zeminini güçlendirebilir.',
    'change|attachment': 'Yeni bir yöne geçme ihtiyacı, tanıdık olana tutunmayla geriliyor; neyi koruyup neyi bırakacağını ayırmak yararlı olabilir.',
    'constraint|initiative': 'Hareket isteği ile kısıt aynı yerde; büyük bir sıçrama yerine uygulanabilir küçük bir deneme düşünülebilir.',
    'loss|repair': 'Kırılma ile toparlanma birlikte okunuyor; geride kalanı inkâr etmeden yeni bir zemin kurulabilir.',
    'scarcity|support': 'Eksik kaynak hissinin yanında destek ihtimali de var; erişilebilir yardımın koşullarını açıklaştırmak işe yarayabilir.',
    'control|independence': 'Düzen veya güven ihtiyacı ile özgür alan talebi arasında ayar gerekiyor; sınırları açıkça konuşmak bu gerilimi görünür kılabilir.',
  };
  const SHADOW = {
    hope: 'olumlu beklentinin görülmesi gereken sorunu örtmesi',
    bond: 'uyumu koruma isteğinin gerekli konuşmayı ertelemesi',
    support: 'destek arayışının kendi sorumluluğuna yer bırakmaması',
    initiative: 'hareket isteğinin hazırlığı geride bırakması',
    clarity: 'kesinlik ihtiyacının başka bir bakışı kapatması',
    craft: 'daha iyi yapma çabasının işi tamamlamayı geciktirmesi',
    rest: 'dinlenme veya bekleme ihtiyacının süresiz bir ertelemeye dönüşmesi',
    balance: 'dengeyi koruma isteğinin gerekli değişimi geciktirmesi',
    control: 'güven arayışının fazla kontrole dönüşmesi',
    independence: 'tek başına yeterli olma isteğinin destek kabul etmeyi zorlaştırması',
    completion: 'bir konuyu tamamlanmış sayarken eksik ihtiyacı gözden kaçırmak',
    change: 'yeni yön ararken gerekli hazırlığa yeterince yer bırakmamak',
    repair: 'toparlanma beklentisinin hâlâ ilgilenilmesi gereken kısmı örtmesi',
    boundary: 'sınırı korurken iletişim alanının daralması',
    attachment: 'tanıdık olana tutunurken bugünkü ihtiyacın geride kalması',
  };
  function connectionOf(a, b, spreadId, variant = 0) {
    const pa = readingOf(a.cardId, a.reversed), pb = readingOf(b.cardId, b.reversed);
    if (!pa || !pb) return '';
    const af = pa.focus, bf = pb.focus;
    const openings = [
      `${a.name} (${a.label}) ile ${b.name} (${b.label}) birlikte okunduğunda, ${af} ile ${bf} yan yana geliyor.`,
      `${a.label} yerindeki ${a.name}, ${af} üzerinden okunuyor; ${b.label} yerindeki ${b.name} bu tabloya ${bf} ekliyor.`,
      `${a.name} için ${af}, ${b.name} için ${bf} öne çıkıyor. ${a.label} ve ${b.label} arasındaki bağ burada belirginleşiyor.`,
      `${a.label}: ${a.name}, ${af}. ${b.label}: ${b.name}, ${bf}. Bu iki konum aynı konunun farklı taraflarını açıyor.`,
      `${a.name} ile başlayan ${af} teması, ${b.label} yerindeki ${b.name} ve onun ${bf} yönüyle birlikte değerlendirilebilir.`,
      `${a.label} ve ${b.label} arasında ${a.name} ile ${b.name} karşılaşıyor: bir tarafta ${af}, diğer tarafta ${bf} var.`,
      `${a.name} (${a.label}) odağı ${af} tarafına çekiyor. ${b.name} (${b.label}) ise ${bf} ile bu odağı yeniden düşünmeye alan açıyor.`,
      `${a.name} kartının ${af} yönünü ${b.name} kartındaki ${bf} ile birlikte ele al. Açılımda biri ${a.label}, diğeri ${b.label} yerinde.`,
    ];
    let synthesis = SYNTHESIS[`${pa.family}|${pb.family}`] || SYNTHESIS[`${pb.family}|${pa.family}`];
    if (['obstacle','challenge'].includes(b.positionKey) && b.tone === 'soft') {
      synthesis = `Bu kartın olumlu yönü burada engel konumunda okunuyor; ${SHADOW[pb.family] || 'iyi gelen bir tutumun ölçüsünün kaçması'} bir olasılık olarak değerlendirilebilir. Bu, ${b.name} kartının kötü bir anlam taşıdığı demek değildir.`;
    }
    if (a.positionKey.endsWith('_path') && b.positionKey.endsWith('_path')) {
      synthesis = `İki yolun süreçleri farklı ihtiyaçlar vurguluyor; biri diğerinin sonucu değildir. ${synthesis || `${pa.action} ${pb.action}`}`;
    }
    if (!synthesis) {
      if (b.positionKey === 'obstacle' || b.positionKey === 'challenge') synthesis = `Bu eşik, ${af} konusunu ele alırken ${bf} tarafını da hesaba katmayı gerektirebilir. ${pb.action}`;
      else if (a.positionKey === 'past' && ['present', 'future'].includes(b.positionKey)) synthesis = `Geçmişte öne çıkan ${af}, bugünkü ya da ilerideki ${bf} ile aynı deneyim değildir; değişen ihtiyacı ayırmak bu geçişi daha açık kılar.`;
      else if (a.positionKey.endsWith('_path') && b.positionKey === a.positionKey.replace('_path','_outcome')) synthesis = `Bu yolun süreci ile olası karşılığı farklı konuları vurguluyor. ${pa.action} ${pb.action}`;
      else if (pa.family === pb.family) synthesis = `İki kartta aynı tema ailesi tekrar ediyor; ${af} ile ${bf} arasındaki ayrıntı farkı, bu konunun nasıl yaşandığını belirginleştiriyor.`;
      else synthesis = `${af.charAt(0).toLocaleUpperCase('tr') + af.slice(1)} tek başına bütün tabloyu açıklamıyor; ${bf} ikinci bir ihtiyacı görünür kılıyor. ${pb.action}`;
    }
    return `${openings[variant % openings.length]} ${synthesis}`;
  }

  const api = { NOTES, noteOf, readingOf, contextOf, connectionOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TAROT_NOTES = api;
})(typeof window !== 'undefined' ? window : globalThis);
