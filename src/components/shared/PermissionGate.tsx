"use client";

import { ReactNode } from "react";
import { useAuth } from "@/store/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGateProps {
  permission?: string;
  permissions?: string[];
  require?: "all" | "any";
  /** Granular izin + proje kapsami (PermissionResolver ile uyumlu). */
  requireProjectAccess?: { permission: string; projectId: number };
  /** Granular izin + birim kapsami (PermissionResolver ile uyumlu). */
  requireUnitAccess?: { permission: string; unit: string | null | undefined };
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  permission,
  permissions = [],
  require = "all",
  requireProjectAccess,
  requireUnitAccess,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission } = useAuth();
  const { canAccessProject, canAccessUnit } = usePermissions();
  const checks = permission ? [permission, ...permissions] : permissions;

  if (checks.length === 0 && !requireProjectAccess && !requireUnitAccess) {
    return <>{children}</>;
  }

  const permissionOk =
    checks.length === 0
      ? true
      : require === "any"
        ? checks.some((item) => hasPermission(item))
        : checks.every((item) => hasPermission(item));

  const projectOk =
    !requireProjectAccess ||
    canAccessProject(requireProjectAccess.permission, requireProjectAccess.projectId);
  const unitOk =
    !requireUnitAccess ||
    canAccessUnit(requireUnitAccess.permission, requireUnitAccess.unit);

  const isAllowed = permissionOk && projectOk && unitOk;

  return isAllowed ? <>{children}</> : <>{fallback}</>;
}
