"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/store/useAuth";

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

  const manageableProjectIds = useMemo(
    () => user?.authorization_context?.manageable_project_ids ?? [],
    [user?.authorization_context?.manageable_project_ids]
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
    [user, hasPermission]
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
      if (scope?.scope_type === "own_unit") {
        const allowedUnit = (scope.scope_payload as ScopePayload | undefined)?.unit;
        return allowedUnit?.trim().toLocaleLowerCase("tr-TR") === unit.trim().toLocaleLowerCase("tr-TR");
      }

      return false;
    },
    [user, hasPermission]
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

  return {
    hasPermission,
    hasAnyPermission,
    canAccessProject,
    canAccessUnit,
    hasGlobalScope,
    manageableProjectIds,
  };
}
