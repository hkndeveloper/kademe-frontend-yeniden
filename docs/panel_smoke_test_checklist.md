# Unified Panel Smoke Test Checklist

Last updated: 2026-04-29

## Core access and guard checks

- [ ] Unauthenticated user opening `/panel/dashboard` is redirected to `/auth/login`.
- [ ] Authenticated user without required permission is redirected from restricted `/panel/*` page to role home.
- [ ] User with `dashboard.*.view` can open `/panel/dashboard`.
- [ ] Unknown `/panel/*` path shows the fallback "not migrated or no permission" panel state.

## Unified panel static routes

- [ ] `/panel/dashboard`
- [ ] `/panel/applications`
- [ ] `/panel/programs`
- [ ] `/panel/projects`
- [ ] `/panel/participants`
- [ ] `/panel/my-project`
- [ ] `/panel/calendar`
- [ ] `/panel/financials`
- [ ] `/panel/requests`
- [ ] `/panel/support`
- [ ] `/panel/users`
- [ ] `/panel/users/permissions`
- [ ] `/panel/staff`
- [ ] `/panel/members`
- [ ] `/panel/certificates`
- [ ] `/panel/periods`
- [ ] `/panel/periods/form-builder`
- [ ] `/panel/announcements`
- [ ] `/panel/content`
- [ ] `/panel/newsletter`
- [ ] `/panel/logs`
- [ ] `/panel/chatbot`
- [ ] `/panel/profile`
- [ ] `/panel/settings`

## Unified panel dynamic routes

- [ ] `/panel/projects/:id`
- [ ] `/panel/projects/:id/content`
- [ ] `/panel/programs/:id/qr`

## Legacy-to-panel compatibility checks

- [ ] `/admin/*` routes still redirect or land on equivalent `/panel/*` route.
- [ ] `/coordinator/*` routes still redirect or land on equivalent `/panel/*` route.
- [ ] `/staff/*` routes still redirect or land on equivalent `/panel/*` route.
- [ ] Root legacy routes (`/admin`, `/coordinator`, `/staff`) land on `/panel/dashboard`.
- [ ] Back/forward browser navigation works correctly after redirect.

## Scope-specific checks

- [ ] Staff + tek/sifir `manageable_project_ids` durumunda `Projeler` gizli, `Projem` gorunur.
- [ ] Staff + birden fazla `manageable_project_ids` durumunda `Projeler` gorunur.
- [ ] `/panel/projects` deep-link guard sonucu menu kurallariyla ayni davranir.

## Critical actions

- [ ] Save/update action works in Settings.
- [ ] Listing/filtering works in Projects, Users, and Logs.
- [ ] Export buttons work where available.
- [ ] Dynamic content editor (`/panel/projects/:id/content`) opens and saves.
- [ ] Program QR flow (`/panel/programs/:id/qr`) loads and refreshes.

