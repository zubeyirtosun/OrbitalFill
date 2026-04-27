# OrbitalFill v1.6.8

OrbitalFill, web tarayıcıları için geliştirilmiş, dairesel kullanıcı arayüzü (Radial UI) tabanlı bir veri giriş ve şablon yönetim otomasyonudur. Uygulama, yüksek verimlilik odaklı veri girişi senaryoları için tasarlanmıştır.

## Mimari ve Sistem Özellikleri

- **Radial Menu Engine:** Kullanıcı etkileşimini optimize eden, 4 ana eksen üzerinde konumlandırılmış slot tabanlı şablon erişim sistemi.
- **Context-Aware Triggering:** Veri giriş alanlarını ve metin seleksiyonlarını otomatik algılayan bağlamsal tetikleme mekanizması.
- **Dynamic Slot Allocation:** Kullanıcı tanımlı statik slot (N1, E2 vb.) veya kullanım sıklığına göre dinamik veri yerleştirme algoritması.
- **Integrated Search UI:** Menü içerisinde gerçek zamanlı şablon arama ve kategori bazlı filtreleme katmanı.
- **Styling Isolation:** Shadow DOM mimarisi kullanılarak ana sayfa CSS kurallarıyla çakışmayan izole arayüz katmanı.

## Yapılandırma Seçenekleri

- **Trigger Position:** Fare koordinatlı (Mouse Follow) veya girdi alanı bazlı (Input Anchor) konumlandırma seçimi.
- **Visual Feedback:** Aktif öğe üzerinde 45 derecelik açıyla hareket eden lineer gold gradiyent efekti.
- **Theme Support:** Indigo, Dark, Emerald ve Rose renk şemaları üzerinden CSS değişken tabanlı tema yönetimi.

## Gereksinimler ve Kurulum

1. Kaynak dosyaları yerel depolama birimine aktarın.
2. Tarayıcı uzantı yönetim panelini (chrome://extensions) açın.
3. Geliştirici Modunu aktif hale getirin.
4. "Paketlenmemiş öğe yükle" seçeneği ile proje ana dizinini sisteme dahil edin.

## Teknik Standartlar

- Manifest V3 API standartlarına tam uyumluluk.
- chrome.storage API üzerinden asenkron veri persistansı.
- Vanilla JavaScript ve CSS3 implementasyonu.

## Kullanıcı Kontrolleri

- Alt + A : Manuel giriş tetikleme.
- Sağ Tık : Aktif menü üzerinde kategorik geçiş.
