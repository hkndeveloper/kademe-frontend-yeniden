/**
 * `projects.view` icin panel navigasyonu: PermissionResolver’daki `permission_scopes['projects.view']`
 * ve `authorization_context.manageable_project_ids` ile uyumlu.
 * Personel: tek (veya sifir) yonetilebilir projede tam liste yerine yalnizca "Projem" gosterilir.
 */
export type PanelNavUser = {
  role?: string;
  permission_scopes?: Record<string, { scope_type: string; scope_payload: Record<string, unknown> }>;
  authorization_context?: {
    manageable_project_ids?: number[];
    project_ids_by_special_module?: Record<string, number[]>;
    user_special_modules?: string[];
  };
};

export function manageableProjectCount(user: PanelNavUser | null | undefined): number {
  return user?.authorization_context?.manageable_project_ids?.length ?? 0;
}

function selectedProjectCount(user: PanelNavUser | null | undefined): number {
  const ids = user?.permission_scopes?.["projects.view"]?.scope_payload?.project_ids;
  if (!Array.isArray(ids)) return 0;
  return ids.map((id) => Number(id)).filter((id) => Number.isFinite(id)).length;
}

export function shouldShowProjectsListNav(
  user: PanelNavUser | null | undefined,
  hasPermission: (p: string) => boolean
): boolean {
  if (!hasPermission("projects.view")) return false;

  const scope = user?.permission_scopes?.["projects.view"];
  if (scope?.scope_type === "self") return false;
  if (scope?.scope_type === "all") return true;
  if (scope?.scope_type === "selected_projects") return selectedProjectCount(user) > 1;

  if (["own_projects", "assigned_projects"].includes(scope?.scope_type ?? "")) {
    return manageableProjectCount(user) > 1;
  }

  return manageableProjectCount(user) > 1;
}

/** Personel + tek/ sifir proje baglami: "Projem" kisayolu */
export function shouldShowMyProjectNav(
  user: PanelNavUser | null | undefined,
  hasPermission: (p: string) => boolean
): boolean {
  if (!hasPermission("projects.view")) return false;
  const scope = user?.permission_scopes?.["projects.view"];
  if (scope?.scope_type === "all") return false;
  if (scope?.scope_type === "self") return true;
  if (scope?.scope_type === "selected_projects") return selectedProjectCount(user) <= 1;
  return manageableProjectCount(user) <= 1;
}
