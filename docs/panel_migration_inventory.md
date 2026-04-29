# Panel Migration Inventory

Bu envanter, eski panel ekranlari silinmeden once yeni `/panel/*` katmanina gecisin durumunu takip eder.

Last updated: 2026-04-29

## Faz Durumu

- Faz 1 (menu sozlesmesi: section + order + tek kaynak): **Done**
- Faz 2 (scope + action uyumu; menu ve deep-link guard hizasi): **Done**
- Faz 3 (icerik birlestirme, role tabanli duplicate azaltma): **Done**
- Faz 4 (son temizlik + dokumantasyon): **Done**

## Notlar

- Legacy `/admin|/coordinator|/staff` route katmani kaldirildi.
- Legacy middleware/route-map katmani kaldirildi; sistem panel-only calisiyor.
- `projects` / `my-project` menu gorunurlugu `permission_scopes` + `manageable_project_ids` ile hizali.
- Dynamic route gecisi (`/panel/projects/:id`, `/panel/projects/:id/content`, `/panel/programs/:id/qr`) aktif.

## Admin Routes

| Legacy | New | Source Component | Status |
|---|---|---|---|
| `/admin/dashboard` | `/panel/dashboard` | `admin/dashboard/page.tsx` | Mapped |
| `/admin/applications` | `/panel/applications` | `admin/applications/page.tsx` | Mapped |
| `/admin/projects` | `/panel/projects` | `admin/projects/page.tsx` | Mapped |
| `/admin/projects/[id]` | `/panel/projects/[id]` | `admin/projects/[id]/page.tsx` | Mapped |
| `/admin/projects/[id]/content` | `/panel/projects/[id]/content` | `admin/projects/[id]/content/page.tsx` | Mapped |
| `/admin/calendar` | `/panel/calendar` | `admin/calendar/page.tsx` | Mapped |
| `/admin/financials` | `/panel/financials` | `admin/financials/page.tsx` | Mapped |
| `/admin/requests` | `/panel/requests` | `admin/requests/page.tsx` | Mapped |
| `/admin/support` | `/panel/support` | `admin/support/page.tsx` | Mapped |
| `/admin/users` | `/panel/users` | `admin/users/page.tsx` | Mapped |
| `/admin/users/permissions` | `/panel/users/permissions` | `admin/users/permissions/page.tsx` | Mapped |
| `/admin/staff` | `/panel/staff` | `admin/staff/page.tsx` | Mapped |
| `/admin/periods` | `/panel/periods` | `admin/periods/page.tsx` | Mapped |
| `/admin/periods/form-builder` | `/panel/periods/form-builder` | `admin/periods/form-builder/page.tsx` | Mapped |
| `/admin/announcements` | `/panel/announcements` | `admin/announcements/page.tsx` | Mapped |
| `/admin/content` | `/panel/content` | `admin/content/page.tsx` | Mapped |
| `/admin/certificates` | `/panel/certificates` | `admin/certificates/page.tsx` | Mapped |
| `/admin/newsletter` | `/panel/newsletter` | `admin/newsletter/page.tsx` | Mapped |
| `/admin/logs` | `/panel/logs` | `admin/logs/page.tsx` | Mapped |
| `/admin/chatbot` | `/panel/chatbot` | `admin/chatbot/page.tsx` | Mapped |
| `/admin/settings` | `/panel/settings` | `admin/settings/page.tsx` | Mapped |

## Coordinator Routes

| Legacy | New | Source Component | Status |
|---|---|---|---|
| `/coordinator/dashboard` | `/panel/dashboard` | `coordinator/dashboard/page.tsx` | Mapped |
| `/coordinator/applications` | `/panel/applications` | `coordinator/applications/page.tsx` | Mapped |
| `/coordinator/programs` | `/panel/programs` | `coordinator/programs/page.tsx` | Mapped |
| `/coordinator/programs/[id]/qr` | `/panel/programs/[id]/qr` | `coordinator/programs/[id]/qr/page.tsx` | Mapped |
| `/coordinator/calendar` | `/panel/calendar` | `coordinator/calendar/page.tsx` | Mapped |
| `/coordinator/projects` | `/panel/projects` | `coordinator/projects/page.tsx` | Mapped |
| `/coordinator/projects/[id]/content` | `/panel/projects/[id]/content` | `coordinator/projects/[id]/content/page.tsx` | Mapped |
| `/coordinator/participants` | `/panel/participants` | `coordinator/participants/page.tsx` | Mapped |
| `/coordinator/financials` | `/panel/financials` | `coordinator/financials/page.tsx` | Mapped |
| `/coordinator/requests` | `/panel/requests` | `coordinator/requests/page.tsx` | Mapped |
| `/coordinator/announcements` | `/panel/announcements` | `coordinator/announcements/page.tsx` | Mapped |
| `/coordinator/support` | `/panel/support` | `coordinator/support/page.tsx` | Mapped |
| `/coordinator/staff` | `/panel/staff` | `coordinator/staff/page.tsx` | Mapped |
| `/coordinator/chatbot` | `/panel/chatbot` | `coordinator/chatbot/page.tsx` | Mapped |
| `/coordinator/profile` | `/panel/profile` | `coordinator/profile/page.tsx` | Mapped |
| `/coordinator/settings` | `/panel/settings` | `coordinator/settings/page.tsx` | Mapped |

## Staff Routes

| Legacy | New | Source Component | Status |
|---|---|---|---|
| `/staff/dashboard` | `/panel/dashboard` | `staff/dashboard/page.tsx` | Mapped |
| `/staff/applications` | `/panel/applications` | `staff/applications/page.tsx` | Mapped |
| `/staff/calendar` | `/panel/calendar` | `staff/calendar/page.tsx` | Mapped |
| `/staff/requests` | `/panel/requests` | `staff/requests/page.tsx` | Mapped |
| `/staff/announcements` | `/panel/announcements` | `staff/announcements/page.tsx` | Mapped |
| `/staff/support` | `/panel/support` | `staff/support/page.tsx` | Mapped |
| `/staff/content` | `/panel/content` | `staff/content/page.tsx` | Mapped |
| `/staff/members` | `/panel/members` | `staff/members/page.tsx` | Mapped |
| `/staff/my-project` | `/panel/my-project` | `staff/my-project/page.tsx` | Mapped |
| `/staff/profile` | `/panel/profile` | `staff/profile/page.tsx` | Mapped |
| `/staff/settings` | `/panel/settings` | `staff/settings/page.tsx` | Mapped |

## Final State

1. Tek giris noktasi: `/panel/*`.
2. Legacy URL compatibility (`/admin/*`, `/coordinator/*`, `/staff/*`) bilincli olarak kaldirildi.
3. Kritik dinamik routelar aktif: `/panel/projects/[id]`, `/panel/projects/[id]/content`, `/panel/programs/[id]/qr`.
4. Typecheck: `npx tsc --noEmit` gecti.

