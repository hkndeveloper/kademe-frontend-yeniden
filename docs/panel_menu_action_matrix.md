# Panel Menu Action Matrix

Bu tablo, unified panel sidebar satirlarinin hangi action/permission ile acildigini gostermek icin olusturuldu.
Kaynak: `src/lib/panel-menu.ts` + `src/lib/panel-scope.ts`.

Last updated: 2026-05-05

| Menu | Path | Action / Rule |
|---|---|---|
| Dashboard | `/panel/dashboard` | any: `dashboard.admin.view`, `dashboard.coordinator.view`, `dashboard.staff.view` |
| Basvurular | `/panel/applications` | `applications.view` |
| Programlar | `/panel/programs` | `programs.view` |
| Projeler | `/panel/projects` | `projects.view` + scope rule (`shouldShowProjectsListNav`) |
| Katilimci Ozet | `/panel/participants` | `projects.participants.view` |
| Projem | `/panel/my-project` | `projects.view` + scope rule (`shouldShowMyProjectNav`) |
| Takvim | `/panel/calendar` | `calendar.view` |
| Mali Islemler | `/panel/financials` | `financial.view` |
| Talepler | `/panel/requests` | `requests.view` |
| Destek | `/panel/support` | `support.view` |
| Kullanicilar | `/panel/users` | `users.view` |
| Yetki Matrisi | `/panel/users/permissions` | `permissions.matrix.view` |
| Personel | `/panel/staff` | `staff.view` |
| Birim uyeleri | `/panel/members` | `staff.view` |
| Sertifikalar | `/panel/certificates` | `certificates.view` |
| Donemler | `/panel/periods` | `periods.view` |
| Duyurular | `/panel/announcements` | `announcements.view` |
| Icerik | `/panel/content` | `content.view` |
| E-Bulten | `/panel/newsletter` | `newsletter.view` |
| Loglar | `/panel/logs` | `logs.view` |
| Veri Asistani | `/panel/chatbot` | `chatbot.view` (global) or `chatbot.manage` (global) |
| Ayarlar | `/panel/settings` | `settings.view` (global) or `content.site_settings.update` (global) |
| Profilim | `/panel/profile` | open (auth gerekli, ek action yok) |

## Scope Rules

- `shouldShowProjectsListNav`: Personel tek/sifir yonetilebilir projede `Projeler` satiri gizlenir.
- `shouldShowMyProjectNav`: Personel tek/sifir yonetilebilir projede `Projem` satiri gosterilir.
- Guard hizasi: `src/lib/panel-permissions.ts` ayni kurallari deep-link tarafinda da uygular.
- KPD menusu: `kpd.appointments.view`, `kpd.reports.view`, `kpd.appointments.manage`, `kpd.reports.create`, `kpd.reports.delete` yetkilerinden biri global scope ile acilir.
- Program QR deep-link: `/panel/programs/:id/qr` icin `programs.qr.manage` gerekir.
- Form builder deep-link: `/panel/periods/form-builder` icin `projects.application_form.update` gerekir.
