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
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  permission,
  permissions = [],
  require = "all",
  requireProjectAccess,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission } = useAuth();
  const { canAccessProject } = usePermissions();
  const checks = permission ? [permission, ...permissions] : permissions;

  if (checks.length === 0 && !requireProjectAccess) {
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

  const isAllowed = permissionOk && projectOk;

  return isAllowed ? <>{children}</> : <>{fallback}</>;
}
