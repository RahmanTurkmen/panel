# Lizbon Apart Otel - Kullanıcı Rehberi

Bu belge, Lizbon otel yönetim uygulamasının günlük kullanımını ayrıntılı olarak açıklar.

Yazarı:
1. Resepsiyon / Front Office
2. İşletme Müdürü
3. Muhasebe / Kasa
4. Otel Müdürü

## 1. Genel Bakış

Uygulama, bir apart otel için temel ihtiyaçları kapsar:
1. Operasyonel gösterge paneli (doluluk, kasa, uyarılar)
2. Oda yönetimi
3. Rezervasyon yönetimi (oluşturma, düzenleme, giriş, çıkış)
4. Doluluk takvimi (Room Rack)
5. Günlük ve genel kasa
6. Kar / zarar analizi
7. İş ayarları

### Somut olarak yapabilecekleriniz

1. Odalar, tipler ve durumlar ekleyebilirsiniz
2. Şunları içeren bir rezervasyon oluşturabilirsiniz:
- misafir adı
- oda
- giriş / çıkış tarihleri
- yetişkin / çocuk sayısı
- konaklama tipi
- ödeme yöntemi
- toplam tutar, ödenen tutar, kalan ödeme
3. Giriş yapabilir sonra çıkış yapabilirsiniz
4. Takvim ızgarasında dolu/boş odaları görebilirsiniz
5. Para girişlerini/çıkışlarını ve bakiyeleri takip edebilirsiniz

## 2. Uygulamaya Erişim

### URL

Yerel Docker ortamında:
1. http://localhost:8080

### Giriş Yapma

Giriş ekranında:
1. kullanıcı adını girin
2. şifreyi girin
3. `Giriş yap` düğmesine tıklayın

Yönetici kimlik bilgileri `.env` dosyasında tanımlanır:
1. `ADMIN_USERNAME`
2. `ADMIN_PASSWORD`
3. `ADMIN_FULL_NAME`

## 3. Ekran Navigasyonu

Yan menü şu konulara erişim sağlar:
1. Gösterge Paneli / Ana Ekran
2. Rezervasyonlar
3. Yeni Rezervasyon
4. Room Rack
5. Oda Durumu
6. Günlük Kasa
7. Genel Kasa
8. Kar / Zarar
9. Tahmin
10. Oda Tanımları
11. Ayarlar

## 4. Önerilen İş Akışı (Günlük İşlemler)

Basit ve temiz akış:
1. Hizmete başlangıçta Gösterge Panelini kontrol edin
2. Bugünün giriş işlemlerini kontrol edin
3. Rezervasyonları oluşturun veya ayarlayın
4. Varışta giriş yapın
5. Ödeme alın ve kalan bakiyeyi takip edin
6. Ayrılışta çıkış yapın
7. Hizmetin sonunda günlük kasayı kontrol edin
8. Sonraki günler için room rack'i kontrol edin

## 5. Ekran Ekran

## 5.1 Gösterge Paneli

Amaç:
1. 10 saniyede otel durumunu görmek

Burada bulacaksınız:
1. özet kartları (gelir, boş odalar, vb.)
2. bugünün giriş/çıkış uyarıları
3. doluluk göstergeleri
4. mali akışların özeti

En iyi uygulamalar:
1. bekleyen giriş uyarılarını öncelikle ele alın
2. kapatılmamış çıkışları kontrol edin

## 5.2 Oda Tanımları

Amaç:
1. Oda envanterini oluşturmak ve yönetmek

Olası eylemler:
1. oda ekleyin
2. oda düzenleyin (numara, kat/grup, tip)
3. odayı silin (ilişkili rezervasyon yoksa)
4. durumu belirleyin: temiz, kirli, hizmet dışı

Önemli kurallar:
1. oda numarası benzersiz olmalıdır
2. bu oda için zaten rezervasyonlar varsa silme engellenir

## 5.3 Yeni Rezervasyon

Amaç:
1. Komple bir rezervasyon oluşturmak

Ana alanlar:
1. misafir (adı)
2. oda
3. giriş tarihi
4. çıkış tarihi
5. yetişkin / çocuk
6. konaklama tipi
7. kanal/acenta
8. ödeme yöntemi
9. toplam tutar
10. ödenen tutar
11. takvim görüntü rengi
12. not

İş mantığı:
1. sistem aynı odada tarih çakışmalarını engeller
2. `kalan ödeme` otomatik olarak hesaplanır

İpuçları:
1. oluşturma sırasında ödenen tutarı girin, temiz takip için
2. müşteri tipi/kanal başına tutarlı bir renk kullanın

## 5.4 Rezervasyonlar (Liste)

Amaç:
1. giriş/çıkış işlemlerini denetlemek, düzenlemek ve yürütmek

İşlevler:
1. dönem bazında filtrele
2. numara/misafir/oda/kanal ile ara
3. `Düzenle` açılır penceresini aç (tam düzenleme)
4. `Giriş yap` yap
5. `Çıkış yap` yap
6. rezervasyonu sil

Izgarada görecekleriniz:
1. giriş durumu
2. çıkış durumu
3. toplam tutar
4. ödenen tutar
5. kalan ödeme

Önemli kural:
1. çıkış, sadece giriş yapıldıysa izin verilir

## 5.5 Room Rack (Doluluk Takvimi)

Amaç:
1. Birden fazla gün boyunca boş/dolu odaları görmek

İşlevler:
1. tarih navigasyonu
2. -7 gün / +7 gün atlaması
3. `Bugün` düğmesi
4. dolu hücrelerde misafir adı + rezervasyon numarası görüntüsü

Renkler:
1. dolu hücre: rezervasyon rengi (veya varsayılan dolu renk)
2. boş hücre: Ayarlar'da tanımlanan boş renk

## 5.6 Oda Durumu / Temizlik

Amaç:
1. temizlik yönetimini kontrol etmek

Eylemler:
1. odayı temiz yapın
2. kirli yapın
3. hizmet dışı yapın

Önerilen kullanım:
1. çıkış ve temizlik sonrası güncelleme

## 5.7 Günlük Kasa

Amaç:
1. Günün hareketlerini kaydetmek

Tipler:
1. gelir
2. gider

Her hareket için:
1. saat
2. tutar
3. oda (isteğe bağlı)
4. ödeme kanalı
5. açıklama
6. personel

Mevcut:
1. ekleme
2. düzenleme
3. silme
4. toplam gelir / gider / günlük bakiye

## 5.8 Genel Kasa

Amaç:
1. Bir tarih aralığında akışları konsolide etmek

Veriler:
1. günlük detay
2. kanal dağılımı (nakit/kart/havale/online ayarlara göre)
3. toplam gelir
4. toplam gider
5. net

## 5.9 Kar / Zarar

Amaç:
1. dönem içinde kârlılığı takip etmek

Veriler:
1. günlük gelir
2. günlük gider
3. sonuç (kâr/zarar)
4. yüzde

## 5.10 Tahmin

Amaç:
1. doluluk yükünü önceden görmek

Veriler:
1. gün başına dolu/boş odalar
2. grafik + detay tablosu

## 5.11 Ayarlar

Amaç:
1. Uygulamanın davranışını ayarlamak

Temel ayarlar:
1. açılış sayfası
2. varsayılan giriş/çıkış saatleri
3. room rack'te gösterilen gün sayısı (öncesi/sonrası)
4. dolu/boş oda rengi

Etki:
1. ana sayfa seçime göre değişebilir
2. varsayılan saatler rezervasyon oluşturma/düzenleme sırasında yeniden kullanılır
3. room rack yapılandırılmış gün penceresine uyum sağlar

## 6. Önemli İş Kuralları

1. Bir oda aynı tarihlerde iki kez rezerve edilemez
2. Çıkış giriş yapılmasını gerektirir
3. Kalan ödeme = toplam tutar - ödenen tutar
4. Rezervasyonları olan bir oda silinemez

## 7. Baştan Sona Pratik Örnek

Akış örneği:
1. `203` odasını oluşturun
2. `Misafir A` için 12-15 tarihlerinde rezervasyon oluşturun
3. toplam `900`, ödenen `300` girin
4. sistem kalan `600`'ı gösterir
5. varış gününde `Giriş yap`'a tıklayın
6. günlük kasada ek ödemeyi alın
7. ayrılış gününde `Çıkış yap`'a tıklayın
8. room rack ve gösterge panelini kontrol edin

## 8. Operasyonel Kısayollar

1. Rezervasyonları her zaman etkin döneme göre filtreleyin (mevcut ay)
2. Sayaçta zaman kazanmak için metin aramasını kullanın
3. Room rack'te 7 günlük bloklarla gezinin
4. Gün sonunda kontrol edin:
- bekleyen girişler
- bekleyen çıkışlar
- kasa bakiyesi

## 9. Veri Kalitesi

Veri tabanını temiz tutmak için:
1. misafir adlarını standardize edin
2. kanal/acentayı sistematik olarak girin
3. gerçek ödenen tutarı girin (unutma nedeniyle `0` yazmayın)
4. ayrılışları çıkış yaparak kapatın

## 10. Sık Yapılan Hatalar ve Çözümler

1. `Bu oda bu tarihlerde dolu`
- nedeni: rezervasyon çakışması
- çözüm: odayı veya tarihleri değiştirin

2. çıkış yapılamıyor
- nedeni: giriş yapılmamış
- çözüm: önce giriş yapın

3. değişiklikten sonra stil/arayüz değişmiyor
- çözüm: yeniden derleme ile yeniden başlatın
- `docker compose up -d --build`

4. Docker Hub token / DNS hatası derleme sırasında
- nedeni: geçici ağ sorunu
- çözüm:
- `nslookup auth.docker.io` test edin
- derlemeyı yeniden başlatın

## 11. Hızlı Yerel Kurulum (Hatırlatma)

Proje klasöründen:

```bash
docker compose up -d --build
```

Doğrulayın:

```bash
docker compose ps
docker compose logs -f apart-otel
```

## 12. Veri Yedeklemesi

SQLite veritabanı Docker hacminde kalıcıdır.

Yedekleme örneği:

```bash
docker run --rm -v lizbon_apart_data:/data -v ${PWD}:/backup alpine sh -c "cp -f /data/apartotel.db /backup/apartotel-backup.db"
```

## 13. Hızlı SSS

1. Odaları ve rezervasyonları tamamen yönetebilir miyim?
- Evet, oluşturma/düzenleme/giriş/çıkış ile.

2. Kalan ödemeyi takip edebilir miyim?
- Evet, toplam tutar ve ödenen tutar üzerinden.

3. Takvimde boş/dolu odaları görebilir miyim?
- Evet, Room Rack üzerinden.

4. Kasayı yönetebilir miyim?
- Evet, günlük + genel + kar/zarar.

## 14. İşletme Önerisi

Kararlı bir işletme için:
1. her görev başlangıcında Gösterge Panelini kontrol edin
2. giriş/çıkışı geciktirmeden kapatın
3. günlük kasa doğrlaması yapın
4. düzenli olarak veritabanı yedeklemesi yapın

---

Gerekirse aşağıdaki versiyonları da sağlayabilirim:
1. `README-RECEPTION.md` (operatör modu)
2. `README-ADMIN.md` (yapılandırma/bakım modu)
3. `README-DEPLOIEMENT.md` (teknik ops modu)
