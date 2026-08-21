import { unifiedPanelMenu } from "@/lib/panel-menu";
import type { PanelNavUser } from "@/lib/panel-scope";
import { shouldShowMyProjectNav, shouldShowProjectsListNav } from "@/lib/panel-scope";
import type { PanelModule } from "@/store/useAuth";

function normalizePanelPath(pathname: string): string {
  const withoutQuery = pathname.split("?")[0] ?? pathname;
  const trimmed = withoutQuery.endsWith("/") && withoutQuery.length > 1 ? withoutQuery.slice(0, -1) : withoutQuery;
  return trimmed || "/";
}

function canAccessProjectFromUser(user: PanelNavUser | null, permission: string, projectId: number): boolean {
  const scope = user?.permission_scopes?.[permission];
  if (!scope) return false;
  if (scope.scope_type === "all") return true;
  if (["own_projects", "assigned_projects"].includes(scope.scope_type)) {
    const ids = Array.isArray(user?.authorization_context?.manageable_project_ids)
      ? user.authorization_context.manageable_project_ids
      : [];
    return ids.map((id) => Number(id)).filter((id) => Number.isFinite(id)).includes(projectId);
  }
  if (scope.scope_type === "selected_projects") {
    const ids = Array.isArray(scope.scope_payload?.project_ids) ? scope.scope_payload.project_ids : [];
    return ids.map((id) => Number(id)).filter((id) => Number.isFinite(id)).includes(projectId);
  }
  if (scope.scope_type === "self") {
    const ids = Array.isArray(user?.authorization_context?.manageable_project_ids)
      ? user.authorization_context.manageable_project_ids
      : [];
    return ids.map((id) => Number(id)).filter((id) => Number.isFinite(id)).includes(projectId);
  }
  return false;
}

function hasGlobalScopeFromUser(user: PanelNavUser | null, permission: string): boolean {
  return user?.permission_scopes?.[permission]?.scope_type === "all";
}

function canAccessProjectWithAnyPermission(
  user: PanelNavUser | null,
  hasPermission: (permission: string) => boolean,
  permissions: string[],
  projectId: number
): boolean {
  return permissions.some((permission) => (
    hasPermission(permission) && canAccessProjectFromUser(user, permission, projectId)
  ));
}

function hasSettingsAccess(
  user: PanelNavUser | null,
  hasPermission: (permission: string) => boolean
): boolean {
  return (
    (hasPermission("settings.view") && hasGlobalScopeFromUser(user, "settings.view")) ||
    (hasPermission("content.site_settings.update") && hasGlobalScopeFromUser(user, "content.site_settings.update"))
  );
}

function hasScopedPermission(
  user: PanelNavUser | null,
  hasPermission: (permission: string) => boolean,
  permission: string
): boolean {
  return hasPermission(permission) && !!user?.permission_scopes?.[permission];
}

function hasAnyScopedPermission(
  user: PanelNavUser | null,
  hasPermission: (permission: string) => boolean,
  permissions: string[]
): boolean {
  return permissions.some((permission) => hasScopedPermission(user, hasPermission, permission));
}

function hasKpdAccess(
  user: PanelNavUser | null,
  hasPermission: (permission: string) => boolean
): boolean {
  const kpdPermissions = [
    "kpd.appointments.view",
    "kpd.reports.view",
    "kpd.appointments.manage",
    "kpd.reports.create",
    "kpd.reports.delete",
  ];

  if (!hasAnyScopedPermission(user, hasPermission, kpdPermissions)) return false;

  const hasGlobalKpdScope = kpdPermissions.some((permission) => hasGlobalScopeFromUser(user, permission));
  if (hasGlobalKpdScope) return true;

  const kpdProjectIds = user?.authorization_context?.project_ids_by_special_module?.kpd_appointments ?? [];
  const manageableProjectIds = user?.authorization_context?.manageable_project_ids ?? [];

  return manageableProjectIds
    .map((projectId) => Number(projectId))
    .filter((projectId) => Number.isFinite(projectId))
    .some((projectId) => kpdProjectIds.map(Number).includes(projectId));
}


function hasProjectFamilyAccess(
  user: PanelNavUser | null,
  hasPermission: (permission: string) => boolean,
  permissions: string[],
  specialModuleKeys: string[]
): boolean {
  if (!hasAnyScopedPermission(user, hasPermission, permissions)) return false;

  const hasGlobalScope = permissions.some((permission) => hasGlobalScopeFromUser(user, permission));
  const projectIdsBySpecialModule = user?.authorization_context?.project_ids_by_special_module ?? {};
  const familyProjectIds = specialModuleKeys
    .flatMap((key) => projectIdsBySpecialModule[key] ?? [])
    .map((projectId) => Number(projectId))
    .filter((projectId, index, all) => Number.isFinite(projectId) && all.indexOf(projectId) === index);

  if (familyProjectIds.length === 0) return false;
  if (hasGlobalScope) return true;

  const manageableProjectIds = (user?.authorization_context?.manageable_project_ids ?? [])
    .map((projectId) => Number(projectId))
    .filter((projectId) => Number.isFinite(projectId));

  return manageableProjectIds.some((projectId) => familyProjectIds.includes(projectId));
}

export function canAccessPanelPath(
  pathname: string,
  hasPermission: (permission: string) => boolean,
  hasAnyPermission: (permissions: string[]) => boolean,
  user: PanelNavUser | null,
  panelModules: PanelModule[] = []
): boolean {
  const normalized = normalizePanelPath(pathname);
  if (!normalized.startsWith("/panel")) return true;

  const moduleMatch = panelModules.find((module) => module.panel_type === "authority" && module.href === normalized);
  if (moduleMatch) {
    return true;
  }

  if (normalized === "/panel/projects") {
    return shouldShowProjectsListNav(user, hasPermission);
  }
  if (normalized === "/panel/my-project") {
    return shouldShowMyProjectNav(user, hasPermission);
  }
  if (normalized === "/panel/staff") {
    return hasPermission("staff.view") && user?.permission_scopes?.["staff.view"]?.scope_type === "all";
  }
  if (normalized === "/panel/members") {
    return hasPermission("staff.view") && user?.permission_scopes?.["staff.view"]?.scope_type !== "all";
  }
  if (normalized === "/panel/users/permissions") {
    return hasPermission("permissions.matrix.view") && hasGlobalScopeFromUser(user, "permissions.matrix.view");
  }
  if (normalized === "/panel/newsletter") {
    return hasScopedPermission(user, hasPermission, "newsletter.view");
  }
  if (normalized === "/panel/trainers") {
    return hasScopedPermission(user, hasPermission, "trainers.view");
  }
  if (normalized === "/panel/chatbot") {
    return hasAnyScopedPermission(user, hasPermission, ["chatbot.view", "chatbot.manage"]);
  }
  if (normalized === "/panel/settings") {
    return hasSettingsAccess(user, hasPermission);
  }
  if (normalized === "/panel/content") {
    return hasScopedPermission(user, hasPermission, "content.view");
  }
  if (normalized === "/panel/motivation") {
    return hasAnyScopedPermission(user, hasPermission, ["motivation.view", "motivation.manage"]);
  }
  if (normalized === "/panel/diplomasi360") {
    return hasProjectFamilyAccess(user, hasPermission, ["projects.internships.view", "projects.internships.manage"], ["internships", "uploaded_files"]);
  }
  if (normalized === "/panel/pergel") {
    return hasProjectFamilyAccess(user, hasPermission, ["projects.mentors.view", "projects.mentors.manage"], ["mentors"]);
  }
  if (normalized === "/panel/eurodesk") {
    return hasProjectFamilyAccess(user, hasPermission, ["projects.eurodesk.view", "projects.eurodesk.manage"], ["eurodesk_projects"]);
  }
  if (normalized === "/panel/kademe-plus") {
    return hasProjectFamilyAccess(user, hasPermission, ["projects.rewards.view", "projects.rewards.manage"], ["badges", "reward_tiers", "participants_by_module"]);
  }
  if (normalized === "/panel/zirve-kademe") {
    return hasProjectFamilyAccess(user, hasPermission, ["projects.rewards.view", "projects.rewards.manage"], ["badges", "reward_tiers", "participants_by_module"]);
  }
  if (normalized === "/panel/kpd") {
    return hasKpdAccess(user, hasPermission);
  }

  const menuMatch = unifiedPanelMenu.find((item) => item.href === normalized);
  if (menuMatch) {
    if (menuMatch.anyPermissions?.length) return hasAnyPermission(menuMatch.anyPermissions);
    if (!menuMatch.permission) return true;
    if (["permissions.matrix.view"].includes(menuMatch.permission)) {
      return hasPermission(menuMatch.permission) && hasGlobalScopeFromUser(user, menuMatch.permission);
    }
    if (menuMatch.permission === "settings.view") {
      return hasSettingsAccess(user, hasPermission);
    }
    return hasPermission(menuMatch.permission);
  }

  const projectDetail = normalized.match(/^\/panel\/projects\/(\d+)$/);
  if (projectDetail) {
    return hasPermission("projects.view") && canAccessProjectFromUser(user, "projects.view", Number(projectDetail[1]));
  }
  const projectContent = normalized.match(/^\/panel\/projects\/(\d+)\/content$/);
  if (projectContent) {
    const pid = Number(projectContent[1]);
    return (
      (hasPermission("projects.view") && canAccessProjectFromUser(user, "projects.view", pid)) ||
      (hasPermission("projects.content.update") && canAccessProjectFromUser(user, "projects.content.update", pid))
    );
  }
  const projectSpecialModules = normalized.match(/^\/panel\/projects\/(\d+)\/special-modules$/);
  if (projectSpecialModules) {
    return canAccessProjectWithAnyPermission(
      user,
      hasPermission,
      [
        "projects.internships.view",
        "projects.internships.manage",
        "projects.mentors.view",
        "projects.mentors.manage",
        "projects.eurodesk.view",
        "projects.eurodesk.manage",
        "projects.rewards.view",
        "projects.rewards.manage",
      ],
      Number(projectSpecialModules[1])
    );
  }
  const projectApplications = normalized.match(/^\/panel\/projects\/(\d+)\/applications$/);
  if (projectApplications) {
    return canAccessProjectWithAnyPermission(
      user,
      hasPermission,
      ["applications.intake.view", "applications.intake.manage"],
      Number(projectApplications[1])
    );
  }
  const programDetail = normalized.match(/^\/panel\/programs\/(\d+)$/);
  if (programDetail) {
    // URL'deki kimlik program kimligidir; proje kapsami bu katmanda guvenilir
    // bicimde cikarilamaz. Kesin programs.view + project scope kontrolu detay
    // API'sinde programin project_id degeri uzerinden yapilir.
    return hasPermission("programs.view");
  }
  const programQr = normalized.match(/^\/panel\/programs\/(\d+)\/qr$/);
  if (programQr) {
    return hasPermission("programs.qr.manage");
  }
  const periodDetail = normalized.match(/^\/panel\/periods\/(\d+)$/);
  if (periodDetail) {
    // URL period kimligi tasir; kesin project scope kontrolu period detay
    // API'sinde period.project_id uzerinden yapilir.
    return hasPermission("periods.view");
  }
  if (normalized === "/panel/periods/form-builder") {
    return hasPermission("projects.application_form.update");
  }
  return false;
}
