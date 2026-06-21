"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  History,
  KeyRound,
  Loader2,
  Plus,
  Save,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import api from "@/lib/api/axios";
import { homePathForUser } from "@/lib/role-home";
import { useAuth } from "@/store/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

interface RoleItem {
  id: number;
  name: string;
  label: string;
  user_count: number;
  permissions: string[];
  /** legacy_map genisletmesiyle hesaplanan islem bazli izinler */
  granular_effective?: string[];
}

interface PermissionItem {
  id?: number;
  name: string;
  label: string;
  group: string;
  description: string;
}

interface PermissionMatrixResponse {
  roles: RoleItem[];
  permission_groups: Record<string, PermissionItem[]>;
  granular_matrix_groups: Record<string, PermissionItem[]>;
  granular_permission_groups: Record<string, string[]>;
  permission_domains?: Record<string, { domain: "authority" | "participant"; permissions: Record<string, "authority" | "participant"> }>;
  role_permission_compatibility?: Record<string, Record<string, boolean>>;
  role_permission_scopes?: Record<string, Record<string, { scope_type: ScopeType; scope_payload: Record<string, unknown> }>>;
  role_scope_storage_ready?: boolean;
  supported_scope_options?: ScopeOptionsMap;
  default_role_scopes?: DefaultRoleScopes;
}

type MatrixState = Record<string, Set<string>>;
type ScopeType = "all" | "own_projects" | "assigned_projects" | "own_unit" | "selected_projects" | "self" | "none";
type RoleScopeState = Record<string, Record<string, { scope_type: ScopeType; scope_payload: Record<string, unknown> }>>;
type ScopeOptionsMap = Record<string, ScopeType[]>;
type DefaultRoleScopes = Record<string, Record<string, ScopeType>>;
type PermissionDomainFilter = "all" | "authority" | "participant";
const VALID_SCOPE_TYPES: ScopeType[] = [
  "all",
  "own_projects",
  "assigned_projects",
  "own_unit",
  "selected_projects",
  "self",
  "none",
];

function scopeOptionsFor(roleName: string, permissionName: string, supportedScopeOptions: ScopeOptionsMap = {}): ScopeType[] {
  if (roleName === "super_admin") return ["all"];
  if (roleName === "student" || roleName === "alumni") return ["self", "none"];
  const backendOptions = supportedScopeOptions[permissionName]?.filter((option): option is ScopeType =>
    VALID_SCOPE_TYPES.includes(option)
  );
  if (backendOptions?.length) return backendOptions;
  if (permissionName === "calendar.view" && ["coordinator", "staff"].includes(roleName)) {
    return ["all", "own_projects", "assigned_projects", "selected_projects", "none"];
  }
  if (permissionStartsWith(permissionName, ["users.", "staff."])) {
    return ["all", "own_unit", "self", "none"];
  }
  if (permissionStartsWith(permissionName, ["permissions.", "settings.", "logs.", "newsletter.", "chatbot."])) {
    return ["all", "none"];
  }
  if (permissionStartsWith(permissionName, ["dashboard."])) {
    return ["all", "own_projects", "assigned_projects", "selected_projects", "own_unit", "none"];
  }
  return ["all", "own_projects", "assigned_projects", "selected_projects", "none"];
}

function permissionStartsWith(permissionName: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => permissionName.startsWith(prefix));
}

function defaultScopeForRole(
  roleName: string,
  permissionName: string,
  defaultRoleScopes: DefaultRoleScopes = {},
  supportedScopeOptions: ScopeOptionsMap = {}
): ScopeType {
  if (roleName === "super_admin") return "all";
  const options = scopeOptionsFor(roleName, permissionName, supportedScopeOptions);
  const backendDefault = defaultRoleScopes[roleName]?.[permissionName];
  if (backendDefault && options.includes(backendDefault)) return backendDefault;
  if (permissionName === "calendar.view" && ["coordinator", "staff"].includes(roleName)) return "all";

  if (roleName === "coordinator") {
    if (
      permissionStartsWith(permissionName, [
        "projects.",
        "periods.",
        "programs.",
        "calendar.",
        "applications.",
        "volunteer.",
        "financial.",
        "support.",
        "requests.",
        "announcements.",
        "content.",
        "certificates.",
        "digital_bohca.",
        "assignments.",
        "kpd.",
      ])
    ) {
      return options.includes("own_projects") ? "own_projects" : "none";
    }
    if (permissionStartsWith(permissionName, ["staff.", "users."])) return options.includes("own_unit") ? "own_unit" : "none";
  }

  if (roleName === "staff") {
    if (
      permissionStartsWith(permissionName, [
        "requests.",
        "support.",
        "applications.",
        "volunteer.",
        "projects.",
        "programs.",
        "periods.",
        "calendar.",
        "announcements.",
        "content.",
        "certificates.",
        "digital_bohca.",
        "assignments.",
        "kpd.",
      ])
    ) {
      return options.includes("assigned_projects") ? "assigned_projects" : "none";
    }
    if (permissionStartsWith(permissionName, ["staff.", "users."])) return options.includes("own_unit") ? "own_unit" : "none";
  }

  if (roleName === "student" || roleName === "alumni") return "self";
  return "none";
}

function scopeLabel(scopeType: string | null | undefined): string {
  const labels: Record<string, string> = {
    all: "Tum sistem",
    own_projects: "Kendi projeleri",
    assigned_projects: "Atanmis projeler",
    own_unit: "Kendi birimi",
    selected_projects: "Secili projeler",
    self: "Kendi kaydi",
    none: "Kapali",
  };

  return scopeType ? labels[scopeType] ?? scopeType : "Scope yok";
}

function permissionDomainLabel(domain?: "authority" | "participant"): string {
  return domain === "participant" ? "Ogrenci-Mezun Portali" : "Yetkili Panel";
}

function isParticipantRole(roleName?: string | null): boolean {
  return roleName === "student" || roleName === "alumni";
}

function isPermissionCompatibleForRole(
  roleName: string | undefined,
  permissionName: string,
  rolePermissionCompatibility: Record<string, Record<string, boolean>>,
  permissionDomainByName: Record<string, "authority" | "participant">
): boolean {
  if (!roleName) return false;

  const compatibility = rolePermissionCompatibility[roleName]?.[permissionName];
  if (compatibility !== undefined) {
    return compatibility;
  }

  const domain = permissionDomainByName[permissionName];
  if (!domain) return true;

  return isParticipantRole(roleName) ? domain === "participant" : domain === "authority";
}
interface ManagedUser {
  id: number;
  name: string;
  surname: string;
  email: string;
  role: string;
  roles: string[];
  unit?: string | null;
  title?: string | null;
}

interface UserOverrideItem {
  id?: number;
  permission_name: string;
  effect: "allow" | "deny";
  scope_type?: string | null;
  scope_payload?: Record<string, unknown>;
}

interface UserOverrideResponse {
  user: ManagedUser;
  overrides: UserOverrideItem[];
  resolved: {
    role_permissions: string[];
    effective_permissions: string[];
    scopes: Record<string, { scope_type: string; scope_payload: Record<string, unknown> }>;
  };
  granular_permission_groups: Record<string, string[]>;
}

interface PermissionAuditLog {
  id: number;
  description: string;
  created_at: string | null;
  causer: { id: number; name: string; role: string } | null;
  subject_id: number | null;
  subject_type: string | null;
  properties: Record<string, unknown>;
}

interface RoleCatalogItem {
  id: number;
  name: string;
  label: string;
  is_system: boolean;
  permission_count: number;
  permissions: string[];
  user_count: number;
}

export default function PermissionsPage() {
  const router = useRouter();
  const authUser = useAuth((state) => state.user);
  const authUserId = useAuth((state) => state.user?.id);
  const refreshAuthProfile = useAuth((state) => state.fetchProfile);
  const { hasGlobalScope } = usePermissions();
  const canViewMatrix = hasGlobalScope("permissions.matrix.view");
  const canUpdateMatrix = hasGlobalScope("permissions.matrix.update");
  const canViewUserOverrides = hasGlobalScope("permissions.user_override.view");
  const canUpdateUserOverrides = hasGlobalScope("permissions.user_override.update");
  const canViewAudit = canViewMatrix || hasGlobalScope("logs.view");
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [granularMatrixGroups, setGranularMatrixGroups] = useState<Record<string, PermissionItem[]>>({});
  const [granularPermissionGroups, setGranularPermissionGroups] = useState<Record<string, string[]>>({});
  const [granularMatrix, setGranularMatrix] = useState<MatrixState>({});
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [userOverrides, setUserOverrides] = useState<UserOverrideItem[]>([]);
  const [resolvedPermissions, setResolvedPermissions] = useState<string[]>([]);
  const [userScopePreview, setUserScopePreview] = useState<Record<string, { scope_type: string; scope_payload: Record<string, unknown> }>>({});
  const [loadingUserOverrides, setLoadingUserOverrides] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<PermissionAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [roleCatalog, setRoleCatalog] = useState<RoleCatalogItem[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<number | null>(null);
  const [deletingRoleId, setDeletingRoleId] = useState<number | null>(null);
  const [roleAssignments, setRoleAssignments] = useState<string[]>([]);
  const [savingRoleAssignment, setSavingRoleAssignment] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [changedOnly, setChangedOnly] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [rolePermissionScopes, setRolePermissionScopes] = useState<RoleScopeState>({});
  const [roleScopeStorageReady, setRoleScopeStorageReady] = useState(true);
  const [supportedScopeOptions, setSupportedScopeOptions] = useState<ScopeOptionsMap>({});
  const [defaultRoleScopes, setDefaultRoleScopes] = useState<DefaultRoleScopes>({});
  const [permissionDomains, setPermissionDomains] = useState<PermissionMatrixResponse["permission_domains"]>({});
  const [rolePermissionCompatibility, setRolePermissionCompatibility] = useState<Record<string, Record<string, boolean>>>({});
  const [activeSection, setActiveSection] = useState<"matrix" | "roles" | "users" | "audit">("matrix");
  const [domainFilter, setDomainFilter] = useState<PermissionDomainFilter>("all");

  const loadAudit = useCallback(async () => {
    if (!canViewAudit) {
      setAuditLogs([]);
      return;
    }

    setAuditLoading(true);
    try {
      const response = await api.get<{ logs: PermissionAuditLog[]; warning?: string }>("/panel/permissions-matrix/audit");
      setAuditLogs(response.data.logs ?? []);
    } catch (error) {
      console.error("Yetki audit kayitlari yuklenemedi", error);
    } finally {
      setAuditLoading(false);
    }
  }, [canViewAudit]);

  const loadData = useCallback(async () => {
    if (!canViewMatrix) {
      setErrorMessage("Yetki matrisini goruntulemek icin tum sistem kapsami gerekir.");
      setLoading(false);
      return;
    }

    try {
      const [response, userResponse, roleResponse] = await Promise.all([
        api.get<PermissionMatrixResponse>("/panel/permissions-matrix"),
        canViewUserOverrides
          ? api.get<{ users: ManagedUser[] }>("/panel/permissions-matrix/users")
          : Promise.resolve({ data: { users: [] } }),
        api.get<{ roles: RoleCatalogItem[] }>("/panel/permissions-matrix/roles"),
      ]);
      const nextRoles = response.data.roles ?? [];
      const nextGranularMatrixGroups = response.data.granular_matrix_groups ?? {};
      const nextGranularGroups = response.data.granular_permission_groups ?? {};
      const nextCompatibility = response.data.role_permission_compatibility ?? {};

      setRoles(nextRoles);
      setGranularMatrixGroups(nextGranularMatrixGroups);
      setGranularPermissionGroups(nextGranularGroups);
      setPermissionDomains(response.data.permission_domains ?? {});
      setRolePermissionCompatibility(nextCompatibility);
      setRolePermissionScopes(response.data.role_permission_scopes ?? {});
      setRoleScopeStorageReady(response.data.role_scope_storage_ready ?? true);
      setSupportedScopeOptions(response.data.supported_scope_options ?? {});
      setDefaultRoleScopes(response.data.default_role_scopes ?? {});
      setManagedUsers(userResponse.data.users ?? []);
      setRoleCatalog(roleResponse.data.roles ?? []);
      setGranularMatrix(
        nextRoles.reduce<MatrixState>((accumulator, role) => {
          const effective = role.granular_effective?.length ? role.granular_effective : role.permissions ?? [];
          accumulator[role.name] = new Set(effective.filter((permission) => nextCompatibility[role.name]?.[permission] ?? true));
          return accumulator;
        }, {})
      );
      setExpandedGroups((current) => {
        if (Object.keys(current).length > 0) return current;
        return Object.keys(nextGranularMatrixGroups).reduce<Record<string, boolean>>((acc, group) => {
          acc[group] = false;
          return acc;
        }, {});
      });
    } catch (error) {
      console.error("Yetki matrisi yuklenemedi", error);
      if (isAxiosError(error) && error.response?.status === 403) {
        setErrorMessage("Bu ekrani goruntuleme yetkiniz artik yok. Panele yonlendiriliyorsunuz.");
        await refreshAuthProfile();
        router.replace(homePathForUser(useAuth.getState().user ?? authUser));
        return;
      }
      setErrorMessage("Yetki matrisi yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [authUser, canViewMatrix, canViewUserOverrides, refreshAuthProfile, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
      void loadAudit();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAudit, loadData]);

  const permissionCount = useMemo(
    () => Object.values(granularMatrixGroups).reduce((total, group) => total + group.length, 0),
    [granularMatrixGroups]
  );

  const granularPermissionCount = useMemo(
    () => Object.values(granularPermissionGroups).reduce((total, group) => total + group.length, 0),
    [granularPermissionGroups]
  );

  const changedPermissionCount = useMemo(() => {
    return Object.values(granularMatrixGroups).reduce((total, permissions) => {
      return total + permissions.filter((permission) =>
        roles.some((role) => {
          const baseline = role.granular_effective ?? role.permissions ?? [];
          const currentAllowed = granularMatrix[role.name]?.has(permission.name) ?? false;
          return currentAllowed !== baseline.includes(permission.name);
        })
      ).length;
    }, 0);
  }, [granularMatrixGroups, granularMatrix, roles]);

  const rolePermissionTotals = useMemo(() => {
    return roles.reduce<Record<string, number>>((acc, role) => {
      acc[role.name] = role.name === "super_admin" ? permissionCount : granularMatrix[role.name]?.size ?? 0;
      return acc;
    }, {});
  }, [granularMatrix, permissionCount, roles]);

  const visibleRoles = useMemo(() => {
    if (domainFilter === "participant") {
      return roles.filter((role) => role.name === "student" || role.name === "alumni");
    }

    if (domainFilter === "authority") {
      return roles.filter((role) => role.name !== "student" && role.name !== "alumni" && role.name !== "visitor");
    }

    return roles;
  }, [domainFilter, roles]);

  const domainCounts = useMemo(() => {
    return Object.entries(granularMatrixGroups).reduce(
      (acc, [group, permissions]) => {
        const domain = permissionDomains?.[group]?.domain === "participant" ? "participant" : "authority";
        acc[domain] += permissions.length;
        acc.all += permissions.length;
        return acc;
      },
      { all: 0, authority: 0, participant: 0 } as Record<PermissionDomainFilter, number>
    );
  }, [granularMatrixGroups, permissionDomains]);

  const permissionDomainByName = useMemo(() => {
    return Object.values(permissionDomains ?? {}).reduce<Record<string, "authority" | "participant">>((acc, group) => {
      Object.entries(group.permissions ?? {}).forEach(([permissionName, domain]) => {
        acc[permissionName] = domain;
      });
      return acc;
    }, {});
  }, [permissionDomains]);

  const overridePermissionGroups = useMemo(() => {
    const roleName = selectedUser?.role;
    return Object.entries(granularPermissionGroups).reduce<Record<string, string[]>>((acc, [group, permissions]) => {
      const compatiblePermissions = permissions.filter((permissionName) =>
        isPermissionCompatibleForRole(roleName, permissionName, rolePermissionCompatibility, permissionDomainByName)
      );

      if (compatiblePermissions.length > 0) {
        acc[group] = compatiblePermissions;
      }

      return acc;
    }, {});
  }, [granularPermissionGroups, permissionDomainByName, rolePermissionCompatibility, selectedUser?.role]);

  const loadUserOverrides = useCallback(async (userId: string) => {
    if (!canViewUserOverrides) {
      setSelectedUser(null);
      setUserOverrides([]);
      setResolvedPermissions([]);
      setUserScopePreview({});
      setRoleAssignments([]);
      return;
    }

    if (!userId) {
      setSelectedUser(null);
      setUserOverrides([]);
      setResolvedPermissions([]);
      setUserScopePreview({});
      return;
    }

    setLoadingUserOverrides(true);
    setErrorMessage(null);

    try {
      const response = await api.get<UserOverrideResponse>(`/panel/permissions-matrix/users/${userId}`);
      setSelectedUser(response.data.user);
      setUserOverrides(response.data.overrides ?? []);
      setResolvedPermissions(response.data.resolved?.effective_permissions ?? []);
      setUserScopePreview(response.data.resolved?.scopes ?? {});
      setRoleAssignments(response.data.user.roles ?? []);
    } catch (error) {
      console.error("Kullanici override bilgileri yuklenemedi", error);
      setErrorMessage("Kullaniciya ozel yetki bilgileri yuklenemedi.");
      setSelectedUser(null);
      setUserOverrides([]);
      setResolvedPermissions([]);
      setUserScopePreview({});
      setRoleAssignments([]);
    } finally {
      setLoadingUserOverrides(false);
    }
  }, [canViewUserOverrides]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUserOverrides(selectedUserId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selectedUserId, loadUserOverrides]);

  const toggleGranularPermission = (roleName: string, permissionName: string) => {
    if (!canUpdateMatrix) {
      return;
    }

    if (roleName === "super_admin") {
      return;
    }

    if (rolePermissionCompatibility[roleName]?.[permissionName] === false) {
      return;
    }

    const currentlyEnabled = granularMatrix[roleName]?.has(permissionName) ?? false;
    if (currentlyEnabled) {
      setRolePermissionScopes((scopeState) => {
        const nextScopes = { ...scopeState };
        const roleScopes = { ...(nextScopes[roleName] ?? {}) };
        delete roleScopes[permissionName];
        nextScopes[roleName] = roleScopes;
        return nextScopes;
      });
    }

    setGranularMatrix((current) => {
      const next = { ...current };
      const permissions = new Set(next[roleName] ?? []);

      if (permissions.has(permissionName)) {
        permissions.delete(permissionName);
      } else {
        permissions.add(permissionName);
      }

      next[roleName] = permissions;
      return next;
    });
  };

  const updateRoleScopeType = (roleName: string, permissionName: string, scopeType: ScopeType) => {
    if (!canUpdateMatrix) {
      return;
    }

    setRolePermissionScopes((current) => ({
      ...current,
      [roleName]: {
        ...(current[roleName] ?? {}),
        [permissionName]: {
          scope_type: scopeType,
          scope_payload: current[roleName]?.[permissionName]?.scope_payload ?? {},
        },
      },
    }));
  };

  const updateRoleScopePayload = (roleName: string, permissionName: string, scopePayload: Record<string, unknown>) => {
    if (!canUpdateMatrix) {
      return;
    }

    setRolePermissionScopes((current) => ({
      ...current,
      [roleName]: {
        ...(current[roleName] ?? {}),
        [permissionName]: {
          scope_type: current[roleName]?.[permissionName]?.scope_type ?? "all",
          scope_payload: scopePayload,
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!canUpdateMatrix) return;

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await api.put("/panel/permissions-matrix", {
        granular_matrix: roles.map((role) => ({
          role: role.name,
          permissions: Array.from(granularMatrix[role.name] ?? [])
            .filter((permission) => rolePermissionCompatibility[role.name]?.[permission] ?? true),
        })),
        granular_scopes: roles.map((role) => ({
          role: role.name,
          scopes: Object.entries(rolePermissionScopes[role.name] ?? {})
            .filter(([permission_name]) => role.name === "super_admin" || (granularMatrix[role.name]?.has(permission_name) ?? false))
            .filter(([permission_name]) => rolePermissionCompatibility[role.name]?.[permission_name] ?? true)
            .filter(([permission_name, scope]) => scopeOptionsFor(role.name, permission_name, supportedScopeOptions).includes(scope.scope_type))
            .map(([permission_name, scope]) => ({
              permission_name,
              scope_type: scope.scope_type,
              scope_payload: scope.scope_payload ?? {},
            })),
        })),
      });

      setSuccessMessage("Granular yetki matrisi guncellendi.");
      await loadData();
      await loadAudit();
      await refreshAuthProfile();
    } catch (error) {
      console.error("Yetki matrisi kaydedilemedi", error);
      setErrorMessage("Yetki matrisi kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const addOverride = () => {
    if (!canUpdateUserOverrides) return;

    const firstPermission = Object.values(overridePermissionGroups)[0]?.[0];
    if (!firstPermission) return;

    const scopeType = selectedUser
      ? defaultScopeForRole(selectedUser.role, firstPermission, defaultRoleScopes, supportedScopeOptions)
      : "all";

    setUserOverrides((current) => [
      ...current,
      {
        permission_name: firstPermission,
        effect: "allow",
        scope_type: scopeType,
        scope_payload: {},
      },
    ]);
  };

  const updateOverride = (index: number, patch: Partial<UserOverrideItem>) => {
    setUserOverrides((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    );
  };

  const removeOverride = (index: number) => {
    setUserOverrides((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSaveOverrides = async () => {
    if (!selectedUserId || !canUpdateUserOverrides) return;

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const normalizedOverrides = userOverrides
        .map((override) => {
          const permissionName = String(override.permission_name ?? "").trim();
          const effect = override.effect === "deny" ? "deny" : "allow";
          const rawScopeType = (override.scope_type ?? "") as ScopeType | "";
          const allowedScopeOptions = selectedUser
            ? scopeOptionsFor(selectedUser.role, permissionName, supportedScopeOptions)
            : VALID_SCOPE_TYPES;
          const scopeType = VALID_SCOPE_TYPES.includes(rawScopeType as ScopeType) && allowedScopeOptions.includes(rawScopeType as ScopeType)
            ? rawScopeType
            : null;

          let scopePayload: Record<string, unknown> = {};
          if (scopeType === "selected_projects") {
            const projectIds = Array.isArray(override.scope_payload?.project_ids)
              ? (override.scope_payload?.project_ids as unknown[])
                  .map((item) => Number(item))
                  .filter((item) => Number.isFinite(item) && item > 0)
              : [];
            scopePayload = { project_ids: projectIds };
          } else if (scopeType === "own_unit") {
            scopePayload = { unit: String(override.scope_payload?.unit ?? "").trim() };
          }

          return {
            permission_name: permissionName,
            effect,
            scope_type: scopeType,
            scope_payload: scopePayload,
          };
        })
        .filter((override) => override.permission_name.length > 0)
        .filter((override) =>
          isPermissionCompatibleForRole(
            selectedUser?.role,
            override.permission_name,
            rolePermissionCompatibility,
            permissionDomainByName
          )
        );

      await api.put(`/panel/permissions-matrix/users/${selectedUserId}`, {
        overrides: normalizedOverrides,
      });

      setSuccessMessage("Kullaniciya ozel yetkiler guncellendi.");
      await loadUserOverrides(selectedUserId);
      await loadAudit();
      if (Number(selectedUserId) === authUserId) {
        await refreshAuthProfile();
      }
    } catch (error) {
      console.error("Kullanici override kaydedilemedi", error);
      const fallbackMessage = "Kullaniciya ozel yetkiler kaydedilemedi.";
      if (isAxiosError(error)) {
        const payload = error.response?.data as
          | { message?: string; errors?: Record<string, string[] | string> }
          | undefined;
        const validationMessages = Object.values(payload?.errors ?? {})
          .flatMap((value) => (Array.isArray(value) ? value : [value]))
          .filter(Boolean)
          .join(" | ");
        const responseMessage = validationMessages || payload?.message || fallbackMessage;
        setErrorMessage(responseMessage);
      } else {
        setErrorMessage(fallbackMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!canUpdateMatrix) return;

    const name = newRoleName
      .trim()
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!name) return;

    setCreatingRole(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await api.post("/panel/permissions-matrix/roles", { name, permissions: [] });
      setNewRoleName("");
      setSuccessMessage("Yeni ozel rol olusturuldu.");
      await loadData();
    } catch (error) {
      console.error("Rol olusturulamadi", error);
      setErrorMessage("Rol olusturulamadi.");
    } finally {
      setCreatingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!canUpdateMatrix) return;

    setDeletingRoleId(roleId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await api.delete(`/panel/permissions-matrix/roles/${roleId}`);
      setSuccessMessage("Rol silindi.");
      await loadData();
    } catch (error) {
      console.error("Rol silinemedi", error);
      setErrorMessage("Rol silinemedi.");
    } finally {
      setDeletingRoleId(null);
    }
  };

  const handleSyncRolePermissions = async (role: RoleCatalogItem) => {
    if (!canUpdateMatrix) return;

    const permissions = Array.from(granularMatrix[role.name] ?? []);
    const scopes = Object.entries(rolePermissionScopes[role.name] ?? {}).map(([permission_name, scope]) => ({
      permission_name,
      scope_type: scope.scope_type,
      scope_payload: scope.scope_payload ?? {},
    })).filter((scope) => role.name === "super_admin" || permissions.includes(scope.permission_name));
    setUpdatingRoleId(role.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await api.put(`/panel/permissions-matrix/roles/${role.id}`, { permissions, scopes });
      setSuccessMessage(`${role.label} rol izinleri guncellendi.`);
      await loadData();
    } catch (error) {
      console.error("Rol izinleri kaydedilemedi", error);
      setErrorMessage("Rol izinleri kaydedilemedi.");
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleSaveUserRoles = async () => {
    if (!selectedUserId || roleAssignments.length === 0 || !canUpdateUserOverrides) return;

    setSavingRoleAssignment(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await api.put(`/panel/permissions-matrix/users/${selectedUserId}/roles`, {
        roles: roleAssignments,
        primary_role: selectedUser?.role,
      });
      setSuccessMessage("Kullanici rolleri guncellendi.");
      await loadUserOverrides(selectedUserId);
      await loadData();
      await loadAudit();
      if (Number(selectedUserId) === authUserId) {
        await refreshAuthProfile();
      }
    } catch (error) {
      console.error("Kullanici rolleri kaydedilemedi", error);
      setErrorMessage("Kullanici rolleri kaydedilemedi.");
    } finally {
      setSavingRoleAssignment(false);
    }
  };

  const filteredGroups = useMemo(() => {
    const q = permissionSearch.trim().toLowerCase();
    return Object.entries(granularMatrixGroups).reduce<Record<string, PermissionItem[]>>((acc, [group, permissions]) => {
      const groupDomain = permissionDomains?.[group]?.domain === "participant" ? "participant" : "authority";
      if (domainFilter !== "all" && groupDomain !== domainFilter) {
        return acc;
      }

      const inGroup = permissions.filter((permission) => {
        const changed = roles.some((role) => {
          const baseline = role.granular_effective ?? role.permissions ?? [];
          const currentAllowed = granularMatrix[role.name]?.has(permission.name) ?? false;
          return currentAllowed !== baseline.includes(permission.name);
        });
        if (changedOnly && !changed) return false;
        if (!q) return true;
        return (
          group.toLowerCase().includes(q) ||
          permission.name.toLowerCase().includes(q) ||
          (permission.description ?? "").toLowerCase().includes(q)
        );
      });
      if (inGroup.length > 0) {
        acc[group] = inGroup;
      }
      return acc;
    }, {});
  }, [permissionSearch, changedOnly, granularMatrixGroups, roles, granularMatrix, permissionDomains, domainFilter]);

  const allVisibleGroupsExpanded = useMemo(() => {
    const groups = Object.keys(filteredGroups);
    return groups.length > 0 && groups.every((group) => expandedGroups[group]);
  }, [expandedGroups, filteredGroups]);

  const selectablePermissionNames = useMemo(
    () => new Set(Object.values(overridePermissionGroups).flat()),
    [overridePermissionGroups]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Shield className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">Yetki Matrisi</h1>
              <p className="mt-1 text-sm font-bold uppercase tracking-widest text-slate-500">
                Islem bazli rol izinleri, scope atamalari ve kullanici override yonetimi
              </p>
            </div>
          </div>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !canUpdateMatrix}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : successMessage ? <CheckCircle2 className="h-5 w-5" /> : <Save className="h-5 w-5" />}
            Degisiklikleri Kaydet
          </button>
        </div>
      </div>

      {(successMessage || errorMessage) && (
        <div className={`rounded-2xl px-4 py-3 text-sm ${successMessage ? "border border-green-500/20 bg-green-500/10 text-green-400" : "border border-red-500/20 bg-red-500/10 text-red-400"}`}>
          {successMessage || errorMessage}
        </div>
      )}

      {!roleScopeStorageReady ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          Role-scope depolama tablosu hazir degil. Scope secimleri kalici uygulanmayabilir (backend migration gerekli).
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Rol sayisi</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{roles.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Yetki sayisi</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{permissionCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Kullanicilar</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{roles.reduce((total, role) => total + role.user_count, 0)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Detayli izin</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{granularPermissionCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Kaydedilmemis</p>
          <p className="mt-2 text-3xl font-black text-amber-900">{changedPermissionCount}</p>
        </div>
      </div>

      <div className="sticky top-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            { key: "matrix", label: "Matris", icon: KeyRound },
            { key: "roles", label: "Roller", icon: Shield },
            { key: "users", label: "Kullanici Override", icon: Users },
            { key: "audit", label: "Gecmis", icon: History },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSection(item.key as typeof activeSection)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${activeSection === "roles" ? "block" : "hidden"} space-y-5 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm`}>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900">Rol Katalogu (Sistem + Ozel)</h2>
            <p className="text-sm text-muted-foreground">
              Sistem rolleri korunur; ozel roller panelden olusturulup izin matrisi ile senkronlanir.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={newRoleName}
              onChange={(event) => setNewRoleName(event.target.value)}
              placeholder="orn: sosyal_medya_koordinatoru"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400"
            />
            <button
              type="button"
              onClick={() => void handleCreateRole()}
              disabled={creatingRole || !newRoleName.trim() || !canUpdateMatrix}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
            >
              {creatingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Rol Ekle
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roleCatalog.map((role) => (
            <div key={role.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">{role.label}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase text-slate-500">{role.name}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    {role.user_count} kullanici • {role.permission_count} izin
                  </div>
                </div>
                {!role.is_system ? (
                  <button
                    type="button"
                    onClick={() => void handleDeleteRole(role.id)}
                    disabled={deletingRoleId === role.id || !canUpdateMatrix}
                    className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 disabled:opacity-50"
                  >
                    {deletingRoleId === role.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                ) : (
                  <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                    sistem
                  </span>
                )}
              </div>
              {!role.is_system ? (
                <button
                  type="button"
                  onClick={() => void handleSyncRolePermissions(role)}
                  disabled={updatingRoleId === role.id || !canUpdateMatrix}
                  className="mt-4 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold uppercase tracking-widest text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                >
                  {updatingRoleId === role.id ? "Kaydediliyor..." : "Matristeki izinleri role uygula"}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className={`${activeSection === "matrix" ? "block" : "hidden"} space-y-4 overflow-hidden rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">Rol Yetki Matrisi (Moduler)</h3>
            <p className="text-xs text-slate-500">Roller kolonlarda, izinler satirlarda. Scope secimleri mevcut backend mantigina aynen gider.</p>
          </div>
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <div className="grid grid-cols-3 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {[
                { key: "all", label: "Tumu", count: domainCounts.all },
                { key: "authority", label: "Yetkili", count: domainCounts.authority },
                { key: "participant", label: "Ogrenci-Mezun", count: domainCounts.participant },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setDomainFilter(item.key as PermissionDomainFilter)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                    domainFilter === item.key
                      ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                  <span className="ml-1 font-mono text-[10px] opacity-70">{item.count}</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={permissionSearch}
                onChange={(event) => setPermissionSearch(event.target.value)}
                placeholder="Yetki ara: financial.view"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-400 xl:w-72"
              />
            </div>
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-600">
              <input type="checkbox" checked={changedOnly} onChange={(event) => setChangedOnly(event.target.checked)} />
              Degisenler
            </label>
            <button
              type="button"
              onClick={() => {
                const next = !allVisibleGroupsExpanded;
                setExpandedGroups((current) => ({
                  ...current,
                  ...Object.keys(filteredGroups).reduce<Record<string, boolean>>((acc, group) => {
                    acc[group] = next;
                    return acc;
                  }, {}),
                }));
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-700 transition hover:bg-slate-100"
            >
              {allVisibleGroupsExpanded ? "Tumunu Daralt" : "Tumunu Genislet"}
            </button>
          </div>
        </div>

        {Object.entries(filteredGroups).map(([group, permissions]) => (
          <div key={group} className="rounded-2xl border border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={() => setExpandedGroups((current) => ({ ...current, [group]: !current[group] }))}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-700">
                {expandedGroups[group] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {group} ({permissions.length})
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-500 ring-1 ring-slate-200">
                  {permissionDomains?.[group]?.domain === "participant" ? "Ogrenci-Mezun Portali" : "Yetkili Panel"}
                </span>
              </span>
              <span className="text-xs text-slate-500">
                {permissions.reduce((total, permission) => {
                  return total + visibleRoles.filter((role) => role.name === "super_admin" || granularMatrix[role.name]?.has(permission.name)).length;
                }, 0)} aktif secim
              </span>
            </button>

            {expandedGroups[group] ? (
              <div className="border-t border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-[1] bg-slate-100">
                      <tr>
                        <th className="sticky left-0 z-[2] w-80 border-b border-r border-slate-200 bg-slate-100 p-3 text-xs font-black uppercase tracking-widest text-slate-600">
                          Izin
                        </th>
                        {visibleRoles.map((role) => (
                          <th key={`${group}-${role.name}`} className="min-w-56 border-b border-slate-200 p-3 align-top">
                            <div className="text-xs font-black text-slate-900">{role.label}</div>
                            <div className="mt-1 font-mono text-[10px] uppercase text-slate-500">
                              {rolePermissionTotals[role.name] ?? 0}/{permissionCount}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {permissions.map((permission) => (
                        <tr key={permission.name} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="sticky left-0 z-[1] w-80 border-r border-slate-200 bg-white p-3 align-top">
                            <div className="font-mono text-xs font-black text-slate-900">{permission.name}</div>
                            {permission.description ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{permission.description}</p> : null}
                          </td>
                          {visibleRoles.map((role) => {
                            const compatible = rolePermissionCompatibility[role.name]?.[permission.name] ?? true;
                            const checked = compatible && (role.name === "super_admin" || (granularMatrix[role.name]?.has(permission.name) ?? false));
                            const scope = rolePermissionScopes[role.name]?.[permission.name];
                            const hasStoredScope = Boolean(scope);
                            const scopeType: ScopeType = scope?.scope_type ?? defaultScopeForRole(role.name, permission.name, defaultRoleScopes, supportedScopeOptions);
                            const projectPayload = String((scope?.scope_payload?.project_ids as number[] | undefined)?.join(",") ?? "");
                            const unitPayload = String((scope?.scope_payload?.unit as string | undefined) ?? "");
                            const baseline = role.granular_effective ?? role.permissions ?? [];
                            const changed = checked !== baseline.includes(permission.name);
                            const scopeOptions = scopeOptionsFor(role.name, permission.name, supportedScopeOptions);
                            const displayedScopeType = scopeOptions.includes(scopeType) ? scopeType : scopeOptions[0] ?? "none";

                            return (
                              <td key={`${permission.name}-${role.name}`} className="min-w-56 p-3 align-top">
                                <div className={`rounded-xl border p-3 ${checked ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"} ${changed ? "ring-2 ring-amber-300" : ""} ${compatible ? "" : "bg-slate-100 opacity-70"}`}>
                                  <label className="flex items-center justify-between gap-2">
                                    <span className={`text-xs font-black uppercase tracking-widest ${checked ? "text-indigo-700" : "text-slate-500"}`}>
                                      {!compatible ? "Alan disi" : checked ? "Acik" : "Kapali"}
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleGranularPermission(role.name, permission.name)}
                                      disabled={!compatible || role.name === "super_admin" || saving || !canUpdateMatrix}
                                      className="h-4 w-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-0 focus:ring-offset-0"
                                    />
                                  </label>
                                  <select
                                    value={displayedScopeType}
                                    onChange={(event) => updateRoleScopeType(role.name, permission.name, event.target.value as ScopeType)}
                                    disabled={!compatible || !checked || saving || !canUpdateMatrix}
                                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                                  >
                                    {scopeOptions.map((option) => (
                                      <option key={`${permission.name}-${role.name}-${option}`} value={option}>
                                        {scopeLabel(option)}
                                      </option>
                                    ))}
                                  </select>
                                  {!compatible ? (
                                    <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                      Bu izin bu rol alanina atanamaz
                                    </div>
                                  ) : checked ? (
                                    <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                      {hasStoredScope ? "Kayitli scope" : "Varsayilan scope"}
                                    </div>
                                  ) : null}
                                  {displayedScopeType === "selected_projects" ? (
                                    <input
                                      value={projectPayload}
                                      onChange={(event) => {
                                        const projectIds = event.target.value
                                          .split(",")
                                          .map((item) => Number(item.trim()))
                                          .filter((item) => Number.isFinite(item) && item > 0);
                                        updateRoleScopePayload(role.name, permission.name, { project_ids: projectIds });
                                      }}
                                      disabled={!compatible || !checked || saving || !canUpdateMatrix}
                                      placeholder="Proje ID: 1,2,3"
                                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none disabled:bg-slate-100"
                                    />
                                  ) : null}
                                  {displayedScopeType === "own_unit" ? (
                                    <input
                                      value={unitPayload}
                                      onChange={(event) => updateRoleScopePayload(role.name, permission.name, { unit: event.target.value })}
                                      disabled={!compatible || !checked || saving || !canUpdateMatrix}
                                      placeholder="Birim"
                                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none disabled:bg-slate-100"
                                    />
                                  ) : null}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {Object.keys(filteredGroups).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Arama veya filtreye uygun yetki bulunamadi.
          </div>
        ) : null}
      </div>

      <div className={`${activeSection === "users" ? "block" : "hidden"} space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm`}>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <UserCog className="h-6 w-6 text-indigo-400" />
            <div>
              <h2 className="text-xl font-black text-slate-900">Kullaniciya Ozel Yetki Override</h2>
              <p className="text-sm text-muted-foreground">Rol izinlerinin ustune tek tek kisi bazli allow / deny ve scope tanimla.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={addOverride}
              type="button"
              disabled={!selectedUserId || !canUpdateUserOverrides}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Override Ekle
            </button>
            <button
              onClick={() => void handleSaveOverrides()}
              type="button"
              disabled={!selectedUserId || saving || !canUpdateUserOverrides}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kullanici Yetkilerini Kaydet
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">Kullanici sec</label>
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
            >
              <option value="">Kullanici secin</option>
              {managedUsers.map((user) => (
                <option key={user.id} value={String(user.id)}>
                  {user.name} {user.surname} - {user.role}
                </option>
              ))}
            </select>

            {selectedUser ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                <div className="font-bold text-slate-900">{selectedUser.name} {selectedUser.surname}</div>
                <div className="mt-1">{selectedUser.email}</div>
                <div className="mt-2 text-xs uppercase tracking-widest text-indigo-400">{selectedUser.role}</div>
                {selectedUser.unit ? <div className="mt-2 text-xs">Birim: {selectedUser.unit}</div> : null}
              </div>
            ) : null}

            {selectedUser ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Kullanici rolleri</div>
                <div className="space-y-2">
                  {roleCatalog.map((role) => {
                    const checked = roleAssignments.includes(role.name);
                    return (
                      <label key={`assign-${role.name}`} className="flex items-center gap-2 text-xs text-slate-900">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canUpdateUserOverrides}
                          onChange={(event) => {
                            const nextChecked = event.target.checked;
                            setRoleAssignments((current) => {
                              if (nextChecked) return Array.from(new Set([...current, role.name]));
                              const next = current.filter((item) => item !== role.name);
                              return next.length === 0 ? current : next;
                            });
                          }}
                        />
                        <span>{role.label}</span>
                      </label>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => void handleSaveUserRoles()}
                  disabled={savingRoleAssignment || roleAssignments.length === 0 || !canUpdateUserOverrides}
                  className="mt-3 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold uppercase tracking-widest text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                >
                  {savingRoleAssignment ? "Kaydediliyor..." : "Rolleri Kaydet"}
                </button>
              </div>
            ) : null}

            {selectedUser ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Efektif izin ozet</div>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {resolvedPermissions.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Henuz efektif izin bulunmuyor.</div>
                  ) : (
                    resolvedPermissions.map((permission) => (
                      <div key={permission} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-900">
                        <div className="font-bold">{permission}</div>
                        {userScopePreview[permission] ? (
                          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                            Scope: {userScopePreview[permission].scope_type}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {!selectedUserId ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                Override duzenlemek icin bir kullanici secin.
              </div>
            ) : loadingUserOverrides ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-200 bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {userOverrides.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
                    Bu kullanici icin henuz ozel override tanimli degil.
                  </div>
                ) : null}

                {userOverrides.map((override, index) => {
                  const overrideScopeOptions = selectedUser
                    ? scopeOptionsFor(selectedUser.role, override.permission_name, supportedScopeOptions)
                    : scopeOptionsFor("staff", override.permission_name, supportedScopeOptions);
                  const overrideScopeValue = override.scope_type && overrideScopeOptions.includes(override.scope_type as ScopeType)
                    ? override.scope_type
                    : "";

                  return (
                  <div key={`${override.permission_name}-${index}`} className="grid grid-cols-1 gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1fr_auto]">
                    <select
                      value={override.permission_name}
                      onChange={(event) => updateOverride(index, { permission_name: event.target.value, scope_type: selectedUser ? defaultScopeForRole(selectedUser.role, event.target.value, defaultRoleScopes, supportedScopeOptions) : null, scope_payload: {} })}
                      disabled={!canUpdateUserOverrides}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
                    >
                      {!selectablePermissionNames.has(override.permission_name) ? (
                        <option value={override.permission_name}>
                          {override.permission_name} (legacy)
                        </option>
                      ) : null}
                      {Object.entries(overridePermissionGroups).map(([group, permissions]) => (
                        <optgroup key={group} label={`${group} / ${permissionDomainLabel(permissionDomains?.[group]?.domain)}`}>
                          {permissions.map((permission) => (
                            <option key={permission} value={permission}>
                              {permission}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>

                    <select
                      value={override.effect}
                      onChange={(event) => updateOverride(index, { effect: event.target.value as "allow" | "deny" })}
                      disabled={!canUpdateUserOverrides}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
                    >
                      <option value="allow">allow</option>
                      <option value="deny">deny</option>
                    </select>

                    <select
                      value={overrideScopeValue}
                      onChange={(event) => updateOverride(index, { scope_type: event.target.value || null })}
                      disabled={!canUpdateUserOverrides}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
                    >
                      <option value="">scope yok</option>
                      {overrideScopeOptions.map((option) => (
                        <option key={`${override.permission_name}-${option}`} value={option}>
                          {scopeLabel(option)}
                        </option>
                      ))}
                    </select>

                    <input
                      value={
                        override.scope_type === "selected_projects"
                          ? String((override.scope_payload?.project_ids as number[] | undefined)?.join(",") ?? "")
                          : override.scope_type === "own_unit"
                            ? String((override.scope_payload?.unit as string | undefined) ?? "")
                            : ""
                      }
                      onChange={(event) => {
                        const rawValue = event.target.value;
                        if (override.scope_type === "selected_projects") {
                          const projectIds = rawValue
                            .split(",")
                            .map((item) => Number(item.trim()))
                            .filter((item) => Number.isFinite(item) && item > 0);
                          updateOverride(index, { scope_payload: { project_ids: projectIds } });
                          return;
                        }

                        if (override.scope_type === "own_unit") {
                          updateOverride(index, { scope_payload: { unit: rawValue } });
                          return;
                        }

                        updateOverride(index, { scope_payload: {} });
                      }}
                      disabled={!canUpdateUserOverrides}
                      placeholder={
                        override.scope_type === "selected_projects"
                          ? "Proje ID'leri: 1,2,3"
                          : override.scope_type === "own_unit"
                            ? "Birim adi"
                            : "Scope alani"
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
                    />

                    <button
                      type="button"
                      onClick={() => removeOverride(index)}
                      disabled={!canUpdateUserOverrides}
                      className="inline-flex items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-red-400 transition hover:bg-red-500 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`${activeSection === "audit" ? "block" : "hidden"} space-y-4 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm`}>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-indigo-400" />
            <div>
              <h2 className="text-xl font-black text-slate-900">Yetki Degisiklik Gecmisi</h2>
              <p className="text-sm text-slate-500">
                Rol matrisi ve kullanici override kayitlari (son 50 islem, activity log).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadAudit()}
            disabled={auditLoading}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
          >
            {auditLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yenile"}
          </button>
        </div>
        {auditLoading && auditLogs.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : auditLogs.length === 0 ? (
          <p className="text-sm text-slate-500">Henuz kayit yok veya log tablosu kullanilamiyor.</p>
        ) : (
          <div className="max-h-80 overflow-auto rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-slate-100">
                <tr className="border-b border-slate-200">
                  <th className="p-3 text-xs font-bold uppercase tracking-widest text-slate-500">Tarih</th>
                  <th className="p-3 text-xs font-bold uppercase tracking-widest text-slate-500">Islem</th>
                  <th className="p-3 text-xs font-bold uppercase tracking-widest text-slate-500">Yapan</th>
                  <th className="p-3 text-xs font-bold uppercase tracking-widest text-slate-500">Hedef</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="whitespace-nowrap p-3 text-xs text-slate-500">
                      {log.created_at ? new Date(log.created_at).toLocaleString("tr-TR") : "-"}
                    </td>
                    <td className="p-3 text-xs font-bold text-slate-900">{log.description}</td>
                    <td className="p-3 text-xs text-slate-500">
                      {log.causer ? `${log.causer.name} (${log.causer.role})` : "Sistem"}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {log.subject_type && log.subject_id ? `${log.subject_type} #${log.subject_id}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-start gap-4 rounded-3xl border border-indigo-600/20 bg-indigo-600/5 p-6">
        <ShieldAlert className="mt-1 h-6 w-6 shrink-0 text-indigo-400" />
        <div>
          <h4 className="mb-1 text-sm font-bold text-slate-900">Dikkat: Yetki Degisiklikleri</h4>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Kayit islem bazli (granular) izin adlarini rolere yazar; legacy paket isimleri yerine noktali izinler
            kullanilir. Super admin her zaman tum izinlere sahiptir; diger kullanicilar yeni oturumda guncel listeyi
            alir.
          </p>
        </div>
      </div>
    </div>
  );
}
