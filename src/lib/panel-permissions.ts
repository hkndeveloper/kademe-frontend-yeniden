import { unifiedPanelMenu } from "@/lib/panel-menu";
import type { PanelNavUser } from "@/lib/panel-scope";
import { shouldShowMyProjectNav, shouldShowProjectsListNav } from "@/lib/panel-scope";

function normalizePanelPath(pathname: string): string {
  const withoutQuery = pathname.split("?")[0] ?? pathname;
  const trimmed = withoutQuery.endsWith("/") && withoutQuery.length > 1 ? withoutQuery.slice(0, -1) : withoutQuery;
  return trimmed || "/";
}

function canAccessProjectFromUser(user: PanelNavUser | null, permission: string, projectId: number): boolean {
  const scope = user?.permission_scopes?.[permission];
  if (!scope) return false;
  if (scope.scope_type === "all") return true;
  if (["own_projects", "assigned_projects", "selected_projects"].includes(scope.scope_type)) {
    const ids = Array.isArray(scope.scope_payload?.project_ids) ? scope.scope_payload.project_ids : [];
    return ids.map((id) => Number(id)).filter((id) => Number.isFinite(id)).includes(projectId);
  }
  return false;
}

function hasGlobalScopeFromUser(user: PanelNavUser | null, permission: string): boolean {
  return user?.permission_scopes?.[permission]?.scope_type === "all";
}

export function canAccessPanelPath(
  pathname: string,
  hasPermission: (permission: string) => boolean,
  hasAnyPermission: (permissions: string[]) => boolean,
  user: PanelNavUser | null
): boolean {
  const normalized = normalizePanelPath(pathname);
  if (!normalized.startsWith("/panel")) return true;

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
    return hasPermission("newsletter.view") && hasGlobalScopeFromUser(user, "newsletter.view");
  }
  if (normalized === "/panel/chatbot") {
    return (
      (hasPermission("chatbot.view") && hasGlobalScopeFromUser(user, "chatbot.view")) ||
      (hasPermission("chatbot.manage") && hasGlobalScopeFromUser(user, "chatbot.manage"))
    );
  }

  const menuMatch = unifiedPanelMenu.find((item) => item.href === normalized);
  if (menuMatch) {
    if (menuMatch.anyPermissions?.length) return hasAnyPermission(menuMatch.anyPermissions);
    if (!menuMatch.permission) return true;
    if (["content.view", "settings.view", "permissions.matrix.view", "newsletter.view", "chatbot.view"].includes(menuMatch.permission)) {
      return hasPermission(menuMatch.permission) && hasGlobalScopeFromUser(user, menuMatch.permission);
    }
    return hasPermission(menuMatch.permission);
  }

  const projectDetail = normalized.match(/^\/panel\/projects\/(\d+)$/);
  if (projectDetail) {
    return hasPermission("projects.view") && canAccessProjectFromUser(user, "projects.view", Number(projectDetail[1]));
  }
  const projectContent = normalized.match(/^\/panel\/projects\/(\d+)\/content$/);
  if (projectContent) {
    return hasPermission("projects.view") && canAccessProjectFromUser(user, "projects.view", Number(projectContent[1]));
  }
  if (/^\/panel\/programs\/[^/]+\/qr$/.test(normalized)) return hasPermission("programs.view");
  if (normalized === "/panel/periods/form-builder") {
    return hasPermission("projects.application_form.update") || hasPermission("periods.view");
  }
  return false;
}
