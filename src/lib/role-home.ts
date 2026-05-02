type HomePathUser = {
  role?: string;
  effective_permissions?: string[];
  permission_scopes?: Record<string, { scope_type: string; scope_payload: Record<string, unknown> }>;
  authorization_context?: { manageable_project_ids?: number[] };
};

const panelHomePermissions = [
  "dashboard.admin.view",
  "dashboard.coordinator.view",
  "dashboard.staff.view",
  "programs.view",
  "applications.view",
  "volunteer.view",
  "financial.view",
  "digital_bohca.view",
  "assignments.view",
  "support.view",
  "certificates.view",
  "projects.view",
  "calendar.view",
  "requests.view",
  "users.view",
  "permissions.matrix.view",
  "staff.view",
  "content.view",
  "settings.view",
  "logs.view",
  "chatbot.view",
];

export function hasPanelHomeAccess(user: HomePathUser | null | undefined): boolean {
  const permissions = user?.effective_permissions ?? [];
  if (permissions.includes("*")) return true;
  return panelHomePermissions.some((permission) => {
    if (!permissions.includes(permission)) return false;
    if (permission === "content.view" || permission === "settings.view") {
      return user?.permission_scopes?.[permission]?.scope_type === "all";
    }
    return true;
  });
}

export function homePathForUser(user: HomePathUser | null | undefined): string {
  const permissions = user?.effective_permissions ?? [];
  const has = (permission: string) => permissions.includes("*") || permissions.includes(permission);
  const hasAny = (items: string[]) => permissions.includes("*") || items.some((permission) => permissions.includes(permission));
  const hasGlobal = (permission: string) => permissions.includes("*") || user?.permission_scopes?.[permission]?.scope_type === "all";

  if (permissions.includes("*")) return "/panel/dashboard";
  if (hasAny(["dashboard.admin.view", "dashboard.coordinator.view", "dashboard.staff.view"])) return "/panel/dashboard";
  if (hasAny(["programs.view", "applications.view", "volunteer.view", "financial.view", "support.view", "certificates.view"])) {
    return "/panel/dashboard";
  }
  if (has("projects.view")) {
    const scope = user?.permission_scopes?.["projects.view"];
    const projectCount = user?.authorization_context?.manageable_project_ids?.length ?? 0;
    return scope?.scope_type === "self" || (scope?.scope_type !== "all" && projectCount <= 1)
      ? "/panel/my-project"
      : "/panel/projects";
  }
  if (has("calendar.view")) return "/panel/calendar";
  if (has("digital_bohca.view")) return "/panel/digital-bohca";
  if (has("assignments.view")) return "/panel/assignments";
  if (has("requests.view")) return "/panel/requests";
  if (has("users.view")) return "/panel/users";
  if (has("permissions.matrix.view")) return "/panel/users/permissions";
  if (has("staff.view")) {
    return user?.permission_scopes?.["staff.view"]?.scope_type === "all" ? "/panel/staff" : "/panel/members";
  }
  if (has("periods.view")) return "/panel/periods";
  if (has("announcements.view")) return "/panel/announcements";
  if (has("content.view") && hasGlobal("content.view")) return "/panel/content";
  if (has("newsletter.view")) return "/panel/newsletter";
  if (has("logs.view")) return "/panel/logs";
  if (has("chatbot.view")) return "/panel/chatbot";
  if (has("settings.view") && hasGlobal("settings.view")) return "/panel/settings";

  return homePathForRole(user?.role);
}

/** Geriye uyumluluk: kullanici objesi olmayan eski cagri noktalarinda rol fallback'i. */
export function homePathForRole(role: string | undefined): string {
  switch (role) {
    case "super_admin":
    case "coordinator":
    case "staff":
      return "/panel/dashboard";
    case "alumni":
      return "/alumni/dashboard";
    case "student":
      return "/student/dashboard";
    default:
      return "/";
  }
}
