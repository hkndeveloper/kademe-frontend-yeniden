/**
 * `projects.view` icin panel navigasyonu: PermissionResolver’daki `permission_scopes['projects.view']`
 * ve `authorization_context.manageable_project_ids` ile uyumlu.
 * Personel: tek (veya sifir) yonetilebilir projede tam liste yerine yalnizca "Projem" gosterilir.
 */
export type PanelNavUser = {
  role?: string;
  permission_scopes?: Record<string, { scope_type: string; scope_payload: Record<string, unknown> }>;
  authorization_context?: { manageable_project_ids?: number[] };
};

export function manageableProjectCount(user: PanelNavUser | null | undefined): number {
  return user?.authorization_context?.manageable_project_ids?.length ?? 0;
}

export function shouldShowProjectsListNav(
  user: PanelNavUser | null | undefined,
  hasPermission: (p: string) => boolean
): boolean {
  if (!hasPermission("projects.view")) return false;

  const scope = user?.permission_scopes?.["projects.view"];
  if (scope?.scope_type === "self") return false;
  if (scope?.scope_type === "all") return true;

  if (["own_projects", "assigned_projects", "selected_projects"].includes(scope?.scope_type ?? "")) {
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
  return manageableProjectCount(user) <= 1;
}
