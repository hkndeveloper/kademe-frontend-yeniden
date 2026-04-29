# Panel Cleanup Final State

Last updated: 2026-04-29

Bu dosya final temizlik sonrasi kalan teknik durumu ozetler.

## 1) Kalan role klasoru bagimliliklari (bilincli)

Asagidaki dosyalar `src/features/panel/page-resolver.tsx` tarafinda halen dogrudan kullanilir:

- `src/features/panel/pages/admin/users/page.tsx`
- `src/features/panel/pages/admin/users/permissions/page.tsx`
- `src/features/panel/pages/admin/staff/page.tsx`
- `src/features/panel/pages/admin/periods/page.tsx`
- `src/features/panel/pages/admin/periods/form-builder/page.tsx`
- `src/features/panel/pages/admin/newsletter/page.tsx`
- `src/features/panel/pages/admin/logs/page.tsx`
- `src/features/panel/pages/admin/certificates/page.tsx`
- `src/features/panel/pages/coordinator/programs/page.tsx`
- `src/features/panel/pages/coordinator/programs/[id]/qr/page.tsx`
- `src/features/panel/pages/coordinator/participants/page.tsx`
- `src/features/panel/pages/staff/my-project/page.tsx`
- `src/features/panel/pages/staff/members/page.tsx`

Not: Bunlar panel route map'inde ayri domain davranisi oldugu icin su an korunuyor.

## 2) Silinen legacy katmanlar

- `src/app/admin/*` route agaci kaldirildi.
- `src/app/coordinator/*` route agaci kaldirildi.
- `src/app/staff/*` route agaci kaldirildi.
- `middleware.ts` kaldirildi.
- `src/lib/panel-route-map.ts` kaldirildi.

## 3) Sistem sozlesmesi (guncel)

1. Navigasyon ve route girisi yalnizca `/panel/*`.
2. Legacy URL'lerin calismamasi beklenen final davranistir.
3. Kalan role dosyalari yalnizca panel icindeki domain varyasyonlari icin kullanilir.
