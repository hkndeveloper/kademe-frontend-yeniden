export type ManifestPanelModule = {
  id: string;
  panel_type: string;
  href: string | null;
  entry_permissions?: string[];
  view_permissions?: string[];
  enabled_actions?: string[];
  always_visible?: boolean;
  context_mode?: string;
  matched_project_ids?: number[];
};

export function entryPermissionsForModule(module: ManifestPanelModule): string[] {
  return module.entry_permissions ?? module.view_permissions ?? [];
}

export function normalizePanelPath(pathname: string): string {
  const withoutQuery = pathname.split("?")[0] ?? pathname;
  const trimmed = withoutQuery.endsWith("/") && withoutQuery.length > 1
    ? withoutQuery.slice(0, -1)
    : withoutQuery;
  return trimmed || "/";
}

function projectIdFrom(pathname: string, suffix = ""): number | null {
  const escapedSuffix = suffix.replaceAll("/", "\\/");
  const match = pathname.match(new RegExp(`^/panel/projects/(\\d+)${escapedSuffix}$`));
  return match ? Number(match[1]) : null;
}

export function moduleForPanelPath<T extends ManifestPanelModule>(
  pathname: string,
  modules: T[],
): T | null {
  const normalized = normalizePanelPath(pathname);
  const exact = modules.find((module) => module.panel_type === "authority" && module.href === normalized);
  if (exact) return exact;

  if (/^\/panel\/programs\/\d+(?:\/qr)?$/.test(normalized)) {
    return modules.find((module) => module.id === "programs") ?? null;
  }
  if (/^\/panel\/periods\/\d+$/.test(normalized)) {
    return modules.find((module) => module.id === "periods") ?? null;
  }
  if (normalized === "/panel/periods/form-builder") {
    return modules.find((module) => module.id === "projects") ?? null;
  }

  const applicationProjectId = projectIdFrom(normalized, "/applications");
  if (applicationProjectId !== null) {
    return modules.find((module) => module.id === "applications") ?? null;
  }

  const specialProjectId = projectIdFrom(normalized, "/special-modules");
  if (specialProjectId !== null) {
    return modules.find((module) =>
      module.context_mode === "project_family"
      && (module.matched_project_ids ?? []).includes(specialProjectId)
    ) ?? null;
  }

  if (projectIdFrom(normalized, "/content") !== null || projectIdFrom(normalized) !== null) {
    return modules.find((module) => module.id === "projects" || module.id === "my_project") ?? null;
  }

  return null;
}

function requiredActionsForPanelPath(pathname: string): string[] {
  const normalized = normalizePanelPath(pathname);
  if (/^\/panel\/programs\/\d+\/qr$/.test(normalized)) return ["programs.qr.manage"];
  if (normalized === "/panel/periods/form-builder") return ["projects.application_form.update"];
  if (projectIdFrom(normalized, "/applications") !== null) {
    return ["applications.intake.view", "applications.intake.manage"];
  }
  return [];
}

export function panelPathAllowedByManifest(
  pathname: string,
  modules: ManifestPanelModule[],
): boolean {
  const normalized = normalizePanelPath(pathname);
  if (!normalized.startsWith("/panel")) return true;
  if (normalized === "/panel") return true;

  const selectedModule = moduleForPanelPath(normalized, modules);
  if (!selectedModule) return false;

  const requiredActions = requiredActionsForPanelPath(normalized);
  if (requiredActions.length === 0) return true;
  const enabledActions = selectedModule.enabled_actions ?? [];
  return requiredActions.some((permission) => enabledActions.includes(permission));
}
