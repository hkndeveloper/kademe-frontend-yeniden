export interface AuthorizationManagementMetadata {
  mode: "legacy" | "shadow" | "pilot" | "enforce";
  coordinator_staff_business_source: "role_matrix" | "mixed" | "coordination_units";
  role_matrix_business_read_only: boolean;
  unit_business_roles: string[];
  protected_roles: string[];
  unit_business_groups: string[];
  unit_business_permissions: string[];
  coordination_units_path: string;
  user_override_scope: "global_across_unit_memberships" | "membership_for_business_permissions";
  business_allow_requires_acknowledgement: boolean;
  legacy_global_business_allow_effective?: boolean;
  selected_user_business_source?: "role_matrix" | "coordination_units";
}

export interface BusinessPermissionOverride {
  permission_name: string;
  effect: "allow" | "deny";
}

export function unitBusinessPermissionIsReadOnly(
  metadata: AuthorizationManagementMetadata | null | undefined,
  roleName: string,
  permissionName: string
): boolean {
  return Boolean(
    metadata?.role_matrix_business_read_only
      && metadata.protected_roles.includes(roleName)
      && metadata.unit_business_permissions.includes(permissionName)
  );
}

export function hasGlobalUnitBusinessAllow(
  metadata: AuthorizationManagementMetadata | null | undefined,
  roleName: string | null | undefined,
  overrides: BusinessPermissionOverride[]
): boolean {
  if (!metadata?.business_allow_requires_acknowledgement || !roleName) {
    return false;
  }

  if (!metadata.unit_business_roles.includes(roleName)) {
    return false;
  }

  const businessPermissions = new Set(metadata.unit_business_permissions);

  return overrides.some(
    (override) => override.effect === "allow" && businessPermissions.has(override.permission_name)
  );
}

export function businessPermissionSourceLabel(
  metadata: AuthorizationManagementMetadata | null | undefined
): string {
  if (metadata?.coordinator_staff_business_source === "coordination_units") {
    return "Koordinasyon Birimleri";
  }

  if (metadata?.coordinator_staff_business_source === "mixed") {
    return "Pilot kullanicida Koordinasyon Birimleri, diger kullanicida Rol Matrisi";
  }

  return "Rol Yetki Matrisi";
}
