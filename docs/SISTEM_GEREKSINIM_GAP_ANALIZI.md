# KADEME Platformu — Gereksinim Karşılaştırması ve Sistem Tarama Raporu

**Hazırlanma:** 5 Mayıs 2026  
**Kapsam:** `frontend/` (Next.js) ve `backend/` (Laravel API) kod tabanı; paylaşılan “İstenenler” metni ile karşılaştırma.  
**Yöntem:** Statik kod incelemesi, API rotaları, izin kataloğu, panel menü/permission eşlemesi ve temsilî uç noktaların okunması. Çalışan ortamda uçtan uca test iddiası taşımaz; üretim yapılandırması (Netgsm, Google OAuth, R2, kuyruk) ayrıca doğrulanmalıdır.

---

## 1. Yönetici özeti

Sistem, **tek birleşik personel paneli** (`/panel/*`) altında **granüler izinler (action)** ve **kapsam (scope)** ile yönetilecek şekilde tasarlanmış; `panel-menu.ts`, `panel-scope.ts`, `panel-permissions.ts` ve backend `PermissionResolver` bu mimariyi destekliyor. **Öğrenci** (`/student/*`) ve **mezun** (`/alumni/*`) panelleri ayrı layout ve sidebar ile aynı API’ye bağlı.

Güçlü taraflar: site ayarları ve anasayfa blokları için zengin şema (`site-config`), başvuru formu form-builder, QR yoklama + konum doğrulama, mali işlemlerde onay akışı ve filtreler, destek taleplerinde kısmi otomatik atama, Google Calendar senkronu için backend altyapısı, aktivite logları ve panel içi “veri asistanı” chatbot.

Önemli boşluklar: **SMS ve e-posta gönderimi fiilen kuyruk/log seviyesinde stub**; **YÖK/TC doğrulama alanları veritabanında var ancak iş mantığı görünmüyor**; **öğrenci panosunda rozetler Kademe Plus ile sınırlı değil**; **“Ayın Pergellisi / Ayın Konuşmacısı” gibi ünvanlar yok**; **anasayfada sertifika kamusal sorgu** entegrasyonu yok; **sosyal medya koordinatörü** ayrı rol olarak yok (medya birimi `staffProfile.unit` üzerinden kısmen modellenmiş). İstenen metinde **ChatBot** maddesiyle **İşlem Logları** maddesi karışık yazılmış; kodda chatbot veri sorgusu, loglar ise audit/activity ayrı modül.

---

## 2. Mimari: Tek panel, action + scope

### 2.1 Mevcut durum

- Birleşik panel layout: `frontend/src/app/panel/layout.tsx` — oturum, `canAccessPanelPath` ile deep-link koruması.
- Menü ve izin eşlemesi: `frontend/src/lib/panel-menu.ts`, `frontend/docs/panel_menu_action_matrix.md`.
- Kapsam kuralları (ör. `content.view`, `settings.view`, `staff.view` için global scope): `frontend/src/lib/panel-scope.ts`, `panel-permissions.ts` içinde `/panel/staff` vs `/panel/members` ayrımı.
- Backend rol ve varsayılan yetkiler: `backend/config/permission_catalog.php` — roller: `super_admin`, `coordinator`, `staff`, `student`, `alumni`, `visitor`. **“Sosyal medya koordinatörü” ayrı rol yok**; medya/ içerik birimi için `media_unit_markers` ve proje kapsamı genişletme mantığı var.

### 2.2 Dinamik olmayan / sıkılaştırılması gereken noktalar

- Koordinatör ve personel **aynı dashboard bileşenini** kullanıyor olabilir: `frontend/src/features/panel/pages/panel/dashboard/page.tsx` doğrudan `AdminDashboardPage` döndürüyor. İstenen metinde koordinatör ve üst admin KPI’ları farklı; **rol bazlı dashboard içerik ayrımı** kodda açıkça ayrışmıyorsa gereksinimle sapma oluşur (veri tarafı scope ile kısıtlanıyor olabilir; UI metinleri ve kartlar yine de admin odaklı kalabilir).
- Bazı sayfalar “wrapper”: ör. `panel/calendar` → `AdminCalendarPage`. Bu iyi bir birleştirme; ancak **personel duyuru filtresi** (sadece birim kullanıcıları) istenen metinde ayrı — bunun `announcements` API ve UI’da tutarlı uygulanıp uygulanmadığı ayrı satır satır kontrol gerektirir.

---

## 3. Kamusal web sitesi (Home, Hakkımızda, Projeler, Faaliyetler, Blog, SSS, İletişim)

### 3.1 Anasayfa

- `frontend/src/app/page.tsx` `/projects`, `/blogs`, `/activities`, `/site-config` ile veri çekiyor; istatistikler `stats_mode === "auto"` iken `computed_homepage_stats`, değilse manuel `homepage.stats` — **istenilen “DB’den dinamik + admin elle müdahale”** ile uyumlu.
- Site ayar şeması: `frontend/src/lib/site-config.ts` — hero, intro kartları, öne çıkan proje/blog slug’ları, blok görünürlüğü ve sırası. **Büyük ölçüde dinamik.**

**Eksik / zayıf:**

- İstenen: **Sertifikaların ziyaretçi tarafından anasayfada ID ile sorgulanması.** `frontend/src/app/certificates/verify/page.tsx` mevcut; fakat `page.tsx` içinde bu modüle **ön yüz CTA / arama kutusu** bulunmuyor (grep ile doğrulandı).
- “Sosyal medya hesapları” footer/header ile `site-config` üzerinden bağlanıyor; **otomatik feed çekme** değil, link yönetimi — gereksinimle uyumlu sayılır.

### 3.2 Hakkımızda, Faaliyetler, Blog, SSS, İletişim

- Sayfalar mevcut: `about`, `activities`, `blog`, `faq`, `contact`.
- İletişim: `contact/page.tsx` girişli kullanıcıda `/tickets`, ziyaretçide `/contact` — `SupportTicketController::storePublic` ile destek kaydına düşüyor. **Ziyaretçi talepleri panel destek merkezine bağlanıyor.**

**Eksik / kontrol listesi:**

- Faaliyetler sayfasında **proje kategorisi + kelime araması** istenmiş; `activities/page.tsx` filtre mantığı gereksinimle tam örtüşmüyorsa ince ayar gerekir (sayfa var, detay seviyesi bu raporda her alt filtre için doğrulanmadı).
- Proje detay: `projects/[slug]/page.tsx` mülakat bilgisi (`has_interview`) gösteriyor — başvuru akışı ile uyumlu.

---

## 4. Panel: Üst admin, koordinatör ve personel modülleri

Aşağıdaki tablo, istenen başlıklar ile kodda görülen durumu özetler.

| İstenen modül | Kodda görünüm | Not |
|---------------|---------------|-----|
| Dashboard (3 sütun, KPI, doluluk, SMS, takvim özeti, hızlı duyuru) | `admin/dashboard/page.tsx`, `AdminDashboardController` | KPI ve SMS sayımı var; **SMS gerçek gönderim** ayrı konu (bkz. §6). |
| Mali işlemler (Excel, filtre, toplam, kategori/proje grafik, fatura yükleme, onay) | `admin/financials`, `FinancialTransactionController` | Akış ve indirme var; admin **fatura dosyasını indirir**; “PDF önizleme” tarayıcıda dosya tipine bağlı. |
| Personel (puantaj, özlük, belgeler, aktif/izinli, liste) | `admin/staff`, profil self-service | Puantaj için **harici link** (`kademepuantaj.com`), entegre API yok. |
| Projeler (takvim, katılımcı, yoklama, CV, mezun, gönüllü) | `panel/programs`, `participants`, `volunteer`, proje detay | Geniş kapsamlı. |
| Proje özel modüller (Diplomasi360, Pergel, KPD, Plus, Eurodesk) | `special-modules/page.tsx`, backend özel uçlar | **KPD** ayrıca `panel/kpd`, `student/kpd`. |
| Talep yönetimi | `panel/requests` | Var; birim/personel hedefli kart akışı için derin doğrulama ayrı teste bağlı. |
| Sistem kullanıcıları (filtre, dosyalar, Excel) | `admin/users` | Export bileşeni çok formatlı (bkz. §7). |
| Takvim (Google, gün/hafta/ay, atama, dashboard sayıları) | `admin/calendar`, `CalendarController`, program senkron | Backend Google servisi program CRUD’da çağrılıyor; **panel takviminin tüm istenen UX detayları** tek okumada doğrulanamadı. |
| Duyurular (SMS + e-posta, güçlü filtre, ek dosya) | `admin/announcements`, `AnnouncementController` | UI ve log var; **gerçek SMS/e-posta** stub (§6). |
| Destek merkezi (atama, yanıt, ek) | `admin/support`, `SupportTicketController` | **Otomatik atama:** proje koordinatörü veya kategori-keyword ile birim eşlemesi (`resolveAutoAssignee`). |
| Başvurular (durum, mülakat) | `admin/applications`, `AdminApplicationController` | Mülakatlı/ mülakatsız geçişler kodlanmış. |
| Yetki matrisi | `users/permissions` | Var. |
| İçerik yönetimi (web, blog, SSS) | `admin/content` | Blog + SSS; **sosyal medya “paylaşım aracı”** ayrı ürün özelliği olarak görünmüyor (link/content düzeyi). |
| Sistem ayarları | `admin/settings`, `SiteSettingsController` | Header/footer/sosyal linkler şemada. |
| İşlem logları | `admin/logs`, `AuditAdminActions`, `activity-logs` | Var; gerçek zamanlılık kullanıcı deneyimine bağlı. |
| ChatBot | `admin/chatbot`, `AdminChatbotPanel`, `AdminChatbotService` | **Veri tabanı sorgu asistanı**; istenen metinde chatbot maddesi log metniyle kopya hatalı. |

---

## 5. Öğrenci ve mezun panelleri

### 5.1 Öğrenci

Menü: `student/sidebar.tsx` — panel özeti, proje, programlar, başvurular, CV, ödevler, QR, değerlendirme, dijital bohça, KPD, sertifikalar, gönüllü, kişilik testi, destek, profil.

**Uyumlu görülenler:**

- QR yoklama + konum: `student/qr-scan`, `AttendanceController::markQrAttendance` — program `latitude/longitude/radius_meters` ile geofence.
- Değerlendirme ve kredi: `student/evaluate`, `FeedbackController` — anonim ID ve kredi geri yükleme mantığı API tarafında işleniyor.
- Dijital bohça, ödev gönderimi, destek, sertifikalar sayfaları mevcut.

**Gereksinimden sapmalar:**

1. **Dashboard ilk sütun:** İstenen: krediler + **yalnızca Kademe Plus için rozetler** + “Ayın Pergellisi / Ayın Konuşmacısı” ünvanları. Kod: `StudentDashboardController::summary` rozetleri `$user->badges()` ile **projeye göre filtrelemeden** döndürüyor; ünvanlar için model/UI **bulunamadı**.
2. **Motivasyon mesajı:** Kullanıcı profilinde `motivation_message` alanı kullanılıyor; “aylık motivasyon mesajı” iş kuralı (admin takvimi, dönemsel içerik) net değil.
3. **Özgeçmiş:** `cv-builder` Kariyer.net benzeri **otomatik tasarım + indirilebilir PDF** iddiasını tam karşılamıyor; sayfa önizleme ve yazdırma odaklı form + HTML önizleme görünüyor (PDF export entegrasyonu bu raporda doğrulanmadı).
4. **YÖK ve TC doğrulama:** `users` tablosunda `yok_verified`, `tc_verified`, şifreli `tc_no` var; fakat bu alanları set eden **doğrulama servisi / API** kod aramasında görülmedi — **kritik eksik** (KVKK ile birlikte süreç tasarlanmalı).

### 5.2 Mezun

Layout ve sayfalar: `alumni/*` — dashboard, bohça, ödev, sertifikalar, destek, gönüllü, portfolio vb. Öğrenci ile paralel özellik seti büyük ölçüde mevcut; aynı **YÖK/TC** ve **rozet kısıtı** maddeleri mezun için de geçerli.

---

## 6. Entegrasyonlar ve dış sistemler

### 6.1 Google Takvim

- Program oluşturma/güncellemede `GoogleCalendarService` kullanımı (`AdminProgramController`).
- Panelde bağlantı ve senkron uçları: `api.php` içinde `calendar/google/*`, atamalar `updateAssignments`.

**Risk:** OAuth yapılandırması ve production credential yönetimi bu raporun dışında; kod yolu mevcut.

### 6.2 SMS ve e-posta

- `AnnouncementController::dispatchSms` ve `dispatchEmail`: açıkça **“Faz 5’te Netgsm / Laravel Mail + queue”** notu ile **CommunicationLog kaydı** ve `queued` durumu.
- Sonuç: Panelden SMS/e-posta tetiklenebilir görünür ancak **gerçek iletişim altyapısı tamamlanmamış**; dashboard’daki SMS sayıları log/queued mantığına bağlı kalabilir.

### 6.3 Puantaj (kademepuantaj.com)

- Sadece **harici link** (`staff/page.tsx`, `self-service-page.tsx`). **API entegrasyonu yok.**

---

## 7. Dışa aktarım formatları

- `ExportButtons` bileşeni: `xlsx`, `docx`, `pdf`, `csv` isteklerini backend’e `format` parametresi ile iletiyor.
- Site genelinde her tablonun tüm formatları desteklediği garanti değil; **her endpoint’in `AdminExportResponder` veya eşdeğeri** ile uyumu tek tek test edilmeli.

---

## 8. Başvuru formları ve mülakat akışı

- Dinamik sorular: `periods/form-builder` ve backend form kayıtları.
- Proje bazında `has_interview`: `ProjectContentController`, herkese açık proje detayında gösterim.
- Başvuru durum geçişleri: `AdminApplicationController` içinde mülakat planlama ve sonuç durumları.

Bu bölüm **istenilen iş kurallarıyla genel olarak uyumlu** görünüyor; kenar durumlar (ör. çoklu proje başvurusu, form sürümleme) için ek test önerilir.

---

## 9. Önceliklendirilmiş bulgu listesi (backlog önerisi)

Aşağıdaki sıra, iş etkisi ve uyumluluk riskine göre öneridir.

1. **SMS / e-posta gerçek gönderim** — Netgsm, SMTP veya transactional provider; kuyruk, yeniden deneme, iletişim log durumlarının `sent/failed` ile güncellenmesi.
2. **YÖK ve TC doğrulama süreci** — Yasal/API erişimi, doğrulama sonrası `tc_verified` / `yok_verified` kilidi, profil güncellemede immutable alanların zorlanması.
3. **Öğrenci panosu rozet mantığı** — Rozetleri yalnızca `kademe_plus` (veya tanımlı tip) katılımı olan öğrencilere gösterme; diğer projelerde gizleme.
4. **“Ayın Pergellisi / Ayın Konuşmacısı”** — Veri modeli (aylık seçim, program/oturum bağlantısı), koordinatör atama UI, öğrenci dashboard’da gösterim.
5. **Anasayfa sertifika doğrulama CTA** — `/certificates/verify` için hero veya footer blok; SEO ve güven mesajı.
6. **Rol bazlı dashboard ayrımı** — Üst admin vs koordinatör vs personel kartları ve metinleri; medya birimine “tüm projeler” özetinin doğrulanması.
7. **Sosyal medya koordinatörü rolü veya izin seti** — İstenen organigram ile `permission_catalog` ve varsayılan scope’ların yeniden düzenlenmesi.
8. **İçerik yönetiminde sosyal paylaşım** — Metada istenen “paylaşım aracı”: entegrasyon (Meta/Twitter API) veya yönetimsel iş akışı (taslak → onay → yayın).
9. **Puantaj sistemi entegrasyonu** — OAuth/webhook veya CSV içe aktarma; tek yönlü senkron tasarımı.
10. **Gereksinim metnindeki ChatBot maddesinin düzeltilmesi** — İş gereksinimi dokümanında log ile karışıklık giderilmeli; ürün ekibinde tek tanım.

---

## 10. Sonuç

Kod tabanı, **birleşik personel paneli + izin/scope** yaklaşımı ve **ayrı öğrenci/mezun deneyimi** hedefiyle büyük ölçüde hizalı; birçok operasyonel modül (mali, destek, başvuru, özel proje modülleri, QR, değerlendirme) **üretilebilir durumda** görünüyor. En kritik boşluklar **iletişim kanallarının gerçek implementasyonu**, **YÖK/TC doğrulama iş mantığının eksikliği**, **öğrenci panosundaki proje-özel rozet/ünvan gereksinimleri** ve **kamusal sertifika sorgusunun anasayfada görünür olmamasıdır**. Bu rapor, QA ve ürün önceliklendirmesi için başlangıç kontrol listesi olarak kullanılabilir; her madde için kabul kriteri ve test senaryosu ayrı yazılmalıdır.

---

## Ek A: Önemli dosya referansları (hızlı navigasyon)

- Panel menü / scope: `frontend/src/lib/panel-menu.ts`, `frontend/src/lib/panel-scope.ts`, `frontend/src/lib/panel-permissions.ts`
- Rol yönlendirme: `frontend/src/lib/role-home.ts`
- Anasayfa: `frontend/src/app/page.tsx`, `frontend/src/lib/site-config.ts`
- SMS/e-posta stub: `backend/app/Http/Controllers/Api/AnnouncementController.php` (`dispatchSms`, `dispatchEmail`)
- Öğrenci özet API: `backend/app/Http/Controllers/Api/StudentDashboardController.php`
- Destek otomatik atama: `backend/app/Http/Controllers/Api/SupportTicketController.php` (`resolveAutoAssignee`)
- QR yoklama: `backend/app/Http/Controllers/Api/AttendanceController.php`, `frontend/src/app/student/qr-scan/page.tsx`
- Mali işlemler: `backend/app/Http/Controllers/Api/FinancialTransactionController.php`, `frontend/src/features/panel/pages/admin/financials/page.tsx`
- Google Calendar: `backend/app/Services/GoogleCalendarService.php`, `backend/app/Http/Controllers/Api/AdminProgramController.php`
- Aktivite logları: `backend/app/Http/Middleware/AuditAdminActions.php`, `frontend/src/features/panel/pages/admin/logs/page.tsx`
- Panel veri asistanı: `frontend/src/components/admin/AdminChatbotPanel.tsx`, `backend/app/Services/AdminChatbotService.php`

---

*Belge uzunluğu hedefi: yazdırıldığında veya PDF’e aktarıldığında yaklaşık 5–7 sayfa (standart A4, 11pt, normal marj). İçerik güncellemeleri için bu dosya versiyon kontrolünde tutulmalıdır.*
