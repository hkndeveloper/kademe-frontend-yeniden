import type { PanelModule, User, OrganizationUnitMembership } from "@/store/useAuth";
import { entryPermissionsForModule, panelPathAllowedByManifest } from "./panel-module-contract.ts";

export function activeOrganizationMembership(
  user: User | null | undefined,
  activeUnitId: number | null
): OrganizationUnitMembership | null {
  const memberships = user?.organization_context?.unit_memberships ?? [];
  return memberships.find((membership) => membership.unit_id === activeUnitId)
    ?? memberships.find((membership) => membership.is_primary)
    ?? memberships[0]
    ?? null;
}

export function activeContextIsAuthoritative(user: User | null | undefined): boolean {
  return user?.organization_context?.authoritative === true;
}

export function permissionIsGlobal(user: User | null | undefined, permission: string): boolean {
  return user?.permission_scopes?.[permission]?.scope_type === "all";
}

export function projectIdsForActiveUnitPermission(
  user: User | null | undefined,
  activeUnitId: number | null,
  permission: string
): number[] {
  const membership = activeOrganizationMembership(user, activeUnitId);
  return (membership?.project_ids_by_permission[permission] ?? [])
    .map((projectId) => Number(projectId))
    .filter((projectId) => Number.isFinite(projectId));
}

export function permissionIsUsableInActiveUnit(
  user: User | null | undefined,
  activeUnitId: number | null,
  permission: string
): boolean {
  if (!activeContextIsAuthoritative(user)) return true;
  if (user?.organization_context?.active_unit_id === activeUnitId) {
    return (user.effective_permissions ?? []).includes("*")
      || (user.effective_permissions ?? []).includes(permission);
  }
  const membership = activeOrganizationMembership(user, activeUnitId);
  return membership?.permissions.includes(permission) ?? false;
}

export function panelModulesForActiveUnit(
  modules: PanelModule[],
  user: User | null | undefined,
  activeUnitId: number | null
): PanelModule[] {
  if (!activeContextIsAuthoritative(user)) return modules;

  return modules.filter((module) => {
    if (module.panel_type !== "authority") return true;
    if (module.always_visible || module.context_mode === "self_service") return true;
    const entryPermissions = entryPermissionsForModule(module);
    return entryPermissions.some((permission) => permissionIsGlobal(user, permission)
      || permissionIsUsableInActiveUnit(user, activeUnitId, permission));
  });
}

/**
 * Authoritative birim modelinde manifest yüklenirken legacy menüye düşülmez.
 * Özellikle üyelik değişiminde eski birimin action'larının kısa süreli görünmesini
 * engellemek için yeni manifest gelene kadar güvenli boş liste döndürülür.
 */
export function panelNavigationModules(
  modules: PanelModule[],
  user: User | null | undefined,
  activeUnitId: number | null,
  loaded: boolean,
  hasError: boolean,
): PanelModule[] | undefined {
  if (activeContextIsAuthoritative(user)) {
    return loaded ? panelModulesForActiveUnit(modules, user, activeUnitId) : [];
  }

  if (loaded) return modules;
  return hasError ? [] : undefined;
}

export function panelPathIsAvailableInActiveUnit(
  pathname: string,
  modules: PanelModule[],
  user: User | null | undefined,
  activeUnitId: number | null
): boolean {
  if (!activeContextIsAuthoritative(user)) return true;
  return panelPathAllowedByManifest(
    pathname,
    panelModulesForActiveUnit(modules, user, activeUnitId),
  );
}

export function projectIdsForModuleInActiveUnit(
  module: PanelModule | undefined,
  user: User | null | undefined,
  activeUnitId: number | null
): number[] {
  const membership = activeOrganizationMembership(user, activeUnitId);
  if (!membership) return [];
  if (!module) return membership.manageable_project_ids;

  return (module.enabled_actions ?? [])
    .flatMap((permission) => membership.project_ids_by_permission[permission] ?? [])
    .map((projectId) => Number(projectId))
    .filter((projectId, index, all) => Number.isFinite(projectId) && all.indexOf(projectId) === index);
}
