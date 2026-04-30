import { unifiedPanelMenu } from "@/lib/panel-menu";
import type { PanelNavUser } from "@/lib/panel-scope";
import { shouldShowMyProjectNav, shouldShowProjectsListNav } from "@/lib/panel-scope";

function normalizePanelPath(pathname: string): string {
  const withoutQuery = pathname.split("?")[0] ?? pathname;
  const trimmed = withoutQuery.endsWith("/") && withoutQuery.length > 1 ? withoutQuery.slice(0, -1) : withoutQuery;
  return trimmed || "/";
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

  const menuMatch = unifiedPanelMenu.find((item) => item.href === normalized);
  if (menuMatch) {
    if (menuMatch.anyPermissions?.length) return hasAnyPermission(menuMatch.anyPermissions);
    if (!menuMatch.permission) return true;
    return hasPermission(menuMatch.permission);
  }

  if (/^\/panel\/projects\/[^/]+$/.test(normalized)) return hasPermission("projects.view");
  if (/^\/panel\/projects\/[^/]+\/content$/.test(normalized)) return hasPermission("projects.view");
  if (/^\/panel\/programs\/[^/]+\/qr$/.test(normalized)) return hasPermission("programs.view");
  if (normalized === "/panel/periods/form-builder") {
    return hasPermission("projects.application_form.update") || hasPermission("periods.view");
  }
  if (normalized === "/panel/members") return hasPermission("staff.view");

  return false;
}
