"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/store/useAuth";
import {
  activeContextIsAuthoritative,
  activeOrganizationMembership,
  permissionIsGlobal,
  permissionIsUsableInActiveUnit,
  projectIdsForActiveUnitPermission,
} from "@/lib/organization-context";

type ScopePayload = {
  project_ids?: Array<number | string>;
  unit?: string;
  user_id?: number;
};

/**
 * Sunucudaki PermissionResolver ile uyumlu: effective_permissions + permission_scopes + authorization_context.
 */
export function usePermissions() {
  const user = useAuth((s) => s.user);
  const hasPermission = useAuth((s) => s.hasPermission);
  const hasAnyPermission = useAuth((s) => s.hasAnyPermission);
  const activeUnitId = useAuth((s) => s.activeUnitId);

  const manageableProjectIds = useMemo(
    () => activeContextIsAuthoritative(user)
      ? activeOrganizationMembership(user, activeUnitId)?.manageable_project_ids ?? []
      : user?.authorization_context?.manageable_project_ids ?? [],
    [activeUnitId, user]
  );

  const projectIdsForPermission = useCallback(
    (permission: string): number[] => {
      const directAllow = user?.permission_overrides?.some((override) =>
        override.effect === "allow" && override.permission_name === permission
      );
      if (activeContextIsAuthoritative(user) && !permissionIsGlobal(user, permission) && !directAllow) {
        return projectIdsForActiveUnitPermission(user, activeUnitId, permission);
      }

      const scope = user?.permission_scopes?.[permission];
      if (scope?.scope_type === "selected_projects") {
        return ((scope.scope_payload as ScopePayload | undefined)?.project_ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id));
      }
      if (["all", "own_projects", "assigned_projects", "self"].includes(scope?.scope_type ?? "")) {
        return (user?.authorization_context?.manageable_project_ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id));
      }
      return [];
    },
    [activeUnitId, user]
  );

  const canAccessProject = useCallback(
    (permission: string, projectId: number | null | undefined): boolean => {
      if (projectId == null || Number.isNaN(Number(projectId))) {
        return false;
      }
      const pid = Number(projectId);
      if (!user) {
        return false;
      }
      const effective = user.effective_permissions ?? [];
      if (effective.includes("*")) {
        return true;
      }
      if (!hasPermission(permission)) {
        return false;
      }

      const scope = user.permission_scopes?.[permission];
      if (scope?.scope_type === "all") {
        return true;
      }
      const directAllow = user.permission_overrides?.some((override) =>
        override.effect === "allow" && override.permission_name === permission
      );
      if (activeContextIsAuthoritative(user) && !directAllow) {
        return projectIdsForActiveUnitPermission(user, activeUnitId, permission).includes(pid);
      }
      if (scope?.scope_type === "own_projects" || scope?.scope_type === "assigned_projects") {
        const ids = (user.authorization_context?.manageable_project_ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id));
        return ids.includes(pid);
      }
      if (scope?.scope_type === "selected_projects") {
        const ids = ((scope.scope_payload as ScopePayload | undefined)?.project_ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id));
        return ids.includes(pid);
      }
      if (scope?.scope_type === "self") {
        const ids = (user.authorization_context?.manageable_project_ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id));
        return ids.includes(pid);
      }

      return false;
    },
    [activeUnitId, user, hasPermission]
  );

  const canAccessUnit = useCallback(
    (permission: string, unit: string | null | undefined): boolean => {
      if (!user || !unit) {
        return false;
      }
      const effective = user.effective_permissions ?? [];
      if (effective.includes("*")) {
        return true;
      }
      if (!hasPermission(permission)) {
        return false;
      }

      const scope = user.permission_scopes?.[permission];
      if (scope?.scope_type === "all") {
        return true;
      }
      const directAllow = user.permission_overrides?.some((override) =>
        override.effect === "allow" && override.permission_name === permission
      );
      if (activeContextIsAuthoritative(user) && !directAllow) {
        const membership = activeOrganizationMembership(user, activeUnitId);
        if (!membership?.permissions.includes(permission)) return false;
        const normalizedTarget = unit.trim().toLocaleLowerCase("tr-TR");
        return [membership.unit_name, membership.unit_code]
          .some((candidate) => candidate.trim().toLocaleLowerCase("tr-TR") === normalizedTarget);
      }
      if (scope?.scope_type === "own_unit") {
        const allowedUnit = (scope.scope_payload as ScopePayload | undefined)?.unit;
        return allowedUnit?.trim().toLocaleLowerCase("tr-TR") === unit.trim().toLocaleLowerCase("tr-TR");
      }

      return false;
    },
    [activeUnitId, user, hasPermission]
  );

  const hasGlobalScope = useCallback(
    (permission: string): boolean => {
      const effective = user?.effective_permissions ?? [];
      if (effective.includes("*")) {
        return true;
      }
      if (!hasPermission(permission)) {
        return false;
      }
      return user?.permission_scopes?.[permission]?.scope_type === "all";
    },
    [user, hasPermission]
  );

  const hasScopedPermission = useCallback(
    (permission: string): boolean => {
      const effective = user?.effective_permissions ?? [];
      if (effective.includes("*")) {
        return true;
      }
      if (!hasPermission(permission)) {
        return false;
      }
      if (!permissionIsUsableInActiveUnit(user, activeUnitId, permission)) {
        return false;
      }

      const scope = user?.permission_scopes?.[permission];
      if (!scope) {
        return false;
      }

      if (scope.scope_type === "all") {
        return true;
      }

      const projectScoped = ["own_projects", "assigned_projects", "selected_projects", "self"].includes(scope.scope_type);
      if (!projectScoped) {
        return true;
      }

      if (scope.scope_type === "selected_projects") {
        if (activeContextIsAuthoritative(user)) {
          return projectIdsForActiveUnitPermission(user, activeUnitId, permission).length > 0;
        }
        const ids = ((scope.scope_payload as ScopePayload | undefined)?.project_ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id));
        return ids.length > 0;
      }

      return manageableProjectIds.length > 0;
    },
    [activeUnitId, manageableProjectIds, user, hasPermission]
  );

  const hasKpdAccess = useCallback(
    (permission: string): boolean => {
      const effective = user?.effective_permissions ?? [];
      if (effective.includes("*")) {
        return true;
      }
      if (!hasScopedPermission(permission)) {
        return false;
      }
      if (user?.permission_scopes?.[permission]?.scope_type === "all") {
        return true;
      }

      const kpdProjectIds = (user?.authorization_context?.project_ids_by_special_module?.kpd_appointments ?? [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));
      if (kpdProjectIds.length === 0) {
        return false;
      }

      return manageableProjectIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
        .some((projectId) => kpdProjectIds.includes(projectId));
    },
    [manageableProjectIds, user, hasScopedPermission]
  );

  return {
    hasPermission,
    hasAnyPermission,
    canAccessProject,
    canAccessUnit,
    hasGlobalScope,
    hasScopedPermission,
    hasKpdAccess,
    manageableProjectIds,
    projectIdsForPermission,
    activeUnitId,
  };
}
