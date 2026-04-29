"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, History, Loader2, Plus, Save, Shield, ShieldAlert, Trash2, UserCog, X } from "lucide-react";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import api from "@/lib/api/axios";
import { homePathForRole } from "@/lib/role-home";
import { useAuth } from "@/store/useAuth";

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
  role_permission_scopes?: Record<string, Record<string, { scope_type: ScopeType; scope_payload: Record<string, unknown> }>>;
}

type MatrixState = Record<string, Set<string>>;
type ScopeType = "all" | "own_projects" | "assigned_projects" | "own_unit" | "selected_projects" | "self" | "none";
type RoleScopeState = Record<string, Record<string, { scope_type: ScopeType; scope_payload: Record<string, unknown> }>>;

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
  const authRole = useAuth((state) => state.user?.role);
  const authUserId = useAuth((state) => state.user?.id);
  const refreshAuthProfile = useAuth((state) => state.fetchProfile);
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

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const response = await api.get<{ logs: PermissionAuditLog[]; warning?: string }>("/panel/permissions-matrix/audit");
      setAuditLogs(response.data.logs ?? []);
    } catch (error) {
      console.error("Yetki audit kayitlari yuklenemedi", error);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const loadData = async () => {
    try {
      const [response, userResponse, roleResponse] = await Promise.all([
        api.get<PermissionMatrixResponse>("/panel/permissions-matrix"),
        api.get<{ users: ManagedUser[] }>("/panel/permissions-matrix/users"),
        api.get<{ roles: RoleCatalogItem[] }>("/panel/permissions-matrix/roles"),
      ]);
      const nextRoles = response.data.roles ?? [];
      const nextGranularMatrixGroups = response.data.granular_matrix_groups ?? {};
      const nextGranularGroups = response.data.granular_permission_groups ?? {};

      setRoles(nextRoles);
      setGranularMatrixGroups(nextGranularMatrixGroups);
      setGranularPermissionGroups(nextGranularGroups);
      setRolePermissionScopes(response.data.role_permission_scopes ?? {});
      setManagedUsers(userResponse.data.users ?? []);
      setRoleCatalog(roleResponse.data.roles ?? []);
      setGranularMatrix(
        nextRoles.reduce<MatrixState>((accumulator, role) => {
          const effective = role.granular_effective?.length ? role.granular_effective : role.permissions ?? [];
          accumulator[role.name] = new Set(effective);
          return accumulator;
        }, {})
      );
      setExpandedGroups((current) => {
        if (Object.keys(current).length > 0) return current;
        return Object.keys(nextGranularMatrixGroups).reduce<Record<string, boolean>>((acc, group) => {
          acc[group] = true;
          return acc;
        }, {});
      });
    } catch (error) {
      console.error("Yetki matrisi yuklenemedi", error);
      if (isAxiosError(error) && error.response?.status === 403) {
        setErrorMessage("Bu ekrani goruntuleme yetkiniz artik yok. Panele yonlendiriliyorsunuz.");
        await refreshAuthProfile();
        router.replace(homePathForRole(authRole ?? "staff"));
        return;
      }
      setErrorMessage("Yetki matrisi yuklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
      void loadAudit();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAudit]);

  const permissionCount = useMemo(
    () => Object.values(granularMatrixGroups).reduce((total, group) => total + group.length, 0),
    [granularMatrixGroups]
  );

  const granularPermissionCount = useMemo(
    () => Object.values(granularPermissionGroups).reduce((total, group) => total + group.length, 0),
    [granularPermissionGroups]
  );

  const loadUserOverrides = useCallback(async (userId: string) => {
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
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUserOverrides(selectedUserId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selectedUserId, loadUserOverrides]);

  const toggleGranularPermission = (roleName: string, permissionName: string) => {
    if (roleName === "super_admin") {
      return;
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
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await api.put("/panel/permissions-matrix", {
        granular_matrix: roles.map((role) => ({
          role: role.name,
          permissions: Array.from(granularMatrix[role.name] ?? []),
        })),
        granular_scopes: roles.map((role) => ({
          role: role.name,
          scopes: Object.entries(rolePermissionScopes[role.name] ?? {}).map(([permission_name, scope]) => ({
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
    const firstPermission = Object.values(granularPermissionGroups)[0]?.[0];
    if (!firstPermission) return;

    setUserOverrides((current) => [
      ...current,
      {
        permission_name: firstPermission,
        effect: "allow",
        scope_type: "all",
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
    if (!selectedUserId) return;

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await api.put(`/panel/permissions-matrix/users/${selectedUserId}`, {
        overrides: userOverrides.map((override) => ({
          permission_name: override.permission_name,
          effect: override.effect,
          scope_type: override.scope_type || null,
          scope_payload: override.scope_payload ?? {},
        })),
      });

      setSuccessMessage("Kullaniciya ozel yetkiler guncellendi.");
      await loadUserOverrides(selectedUserId);
      await loadAudit();
      if (Number(selectedUserId) === authUserId) {
        await refreshAuthProfile();
      }
    } catch (error) {
      console.error("Kullanici override kaydedilemedi", error);
      setErrorMessage("Kullaniciya ozel yetkiler kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    const name = newRoleName.trim().toLowerCase();
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
    const permissions = Array.from(granularMatrix[role.name] ?? []);
    setUpdatingRoleId(role.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await api.put(`/panel/permissions-matrix/roles/${role.id}`, { permissions });
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
    if (!selectedUserId || roleAssignments.length === 0) return;

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
  }, [permissionSearch, changedOnly, granularMatrixGroups, roles, granularMatrix]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
            <Shield className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Yetki Matrisi</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Islem bazli (granular) rol matrisi ve kullanici override
            </p>
          </div>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : successMessage ? <CheckCircle2 className="h-5 w-5" /> : <Save className="h-5 w-5" />}
          Degisiklikleri Kaydet
        </button>
      </div>

      {(successMessage || errorMessage) && (
        <div className={`rounded-2xl px-4 py-3 text-sm ${successMessage ? "border border-green-500/20 bg-green-500/10 text-green-400" : "border border-red-500/20 bg-red-500/10 text-red-400"}`}>
          {successMessage || errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="glass-panel rounded-3xl p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Rol sayisi</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{roles.length}</p>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Yetki sayisi</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{permissionCount}</p>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Kullanicilar</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{roles.reduce((total, role) => total + role.user_count, 0)}</p>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Detayli izin</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{granularPermissionCount}</p>
        </div>
      </div>

      <div className="glass-panel space-y-5 rounded-[40px] border border-white/5 p-8">
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
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-900"
            />
            <button
              type="button"
              onClick={() => void handleCreateRole()}
              disabled={creatingRole || !newRoleName.trim()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-900 disabled:opacity-50"
            >
              {creatingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Rol Ekle
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roleCatalog.map((role) => (
            <div key={role.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">{role.label}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">{role.name}</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {role.user_count} kullanici • {role.permission_count} izin
                  </div>
                </div>
                {!role.is_system ? (
                  <button
                    type="button"
                    onClick={() => void handleDeleteRole(role.id)}
                    disabled={deletingRoleId === role.id}
                    className="inline-flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 disabled:opacity-50"
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
                  disabled={updatingRoleId === role.id}
                  className="mt-4 w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-indigo-300 disabled:opacity-50"
                >
                  {updatingRoleId === role.id ? "Kaydediliyor..." : "Matristeki izinleri role uygula"}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel space-y-4 overflow-hidden rounded-[40px] border border-white/5 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">Rol Yetki Matrisi (Moduler)</h3>
            <p className="text-xs text-muted-foreground">Grup bazli ac/kapa, arama ve scope atama ile yonetin.</p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              value={permissionSearch}
              onChange={(event) => setPermissionSearch(event.target.value)}
              placeholder="Yetki ara (orn: financial.view)"
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-900"
            />
            <label className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <input type="checkbox" checked={changedOnly} onChange={(event) => setChangedOnly(event.target.checked)} />
              Sadece degisenler
            </label>
          </div>
        </div>

        {Object.entries(filteredGroups).map(([group, permissions]) => (
          <div key={group} className="rounded-2xl border border-white/10 bg-white/5">
            <button
              type="button"
              onClick={() => setExpandedGroups((current) => ({ ...current, [group]: !current[group] }))}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                {group} ({permissions.length})
              </span>
              <span className="text-xs text-muted-foreground">{expandedGroups[group] ? "Daralt" : "Genislet"}</span>
            </button>

            {expandedGroups[group] ? (
              <div className="space-y-3 border-t border-white/10 p-4">
                {permissions.map((permission) => (
                  <div key={permission.name} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="mb-3">
                      <div className="font-mono text-xs font-bold text-slate-900">{permission.name}</div>
                      {permission.description ? <p className="mt-1 text-xs text-muted-foreground">{permission.description}</p> : null}
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                      {roles.map((role) => {
                        const checked = role.name === "super_admin" || (granularMatrix[role.name]?.has(permission.name) ?? false);
                        const scope = rolePermissionScopes[role.name]?.[permission.name];
                        const scopeType: ScopeType = scope?.scope_type ?? "all";
                        const projectPayload = String((scope?.scope_payload?.project_ids as number[] | undefined)?.join(",") ?? "");
                        const unitPayload = String((scope?.scope_payload?.unit as string | undefined) ?? "");

                        return (
                          <div key={`${permission.name}-${role.name}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{role.label}</span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleGranularPermission(role.name, permission.name)}
                                disabled={role.name === "super_admin" || saving}
                                className="h-4 w-4 rounded border-slate-200 bg-white text-indigo-600 focus:ring-0 focus:ring-offset-0"
                              />
                            </div>
                            <select
                              value={scopeType}
                              onChange={(event) => updateRoleScopeType(role.name, permission.name, event.target.value as ScopeType)}
                              disabled={!checked || saving}
                              className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-slate-900"
                            >
                              <option value="all">all</option>
                              <option value="own_projects">own_projects</option>
                              <option value="assigned_projects">assigned_projects</option>
                              <option value="selected_projects">selected_projects</option>
                              <option value="own_unit">own_unit</option>
                              <option value="self">self</option>
                              <option value="none">none</option>
                            </select>
                            {scopeType === "selected_projects" ? (
                              <input
                                value={projectPayload}
                                onChange={(event) => {
                                  const projectIds = event.target.value
                                    .split(",")
                                    .map((item) => Number(item.trim()))
                                    .filter((item) => Number.isFinite(item) && item > 0);
                                  updateRoleScopePayload(role.name, permission.name, { project_ids: projectIds });
                                }}
                                disabled={!checked || saving}
                                placeholder="1,2,3"
                                className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-slate-900"
                              />
                            ) : null}
                            {scopeType === "own_unit" ? (
                              <input
                                value={unitPayload}
                                onChange={(event) => updateRoleScopePayload(role.name, permission.name, { unit: event.target.value })}
                                disabled={!checked || saving}
                                placeholder="Birim"
                                className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-slate-900"
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="glass-panel space-y-6 rounded-[40px] border border-white/5 p-8">
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
              disabled={!selectedUserId}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-900 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Override Ekle
            </button>
            <button
              onClick={() => void handleSaveOverrides()}
              type="button"
              disabled={!selectedUserId || saving}
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
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-900 outline-none"
            >
              <option value="">Kullanici secin</option>
              {managedUsers.map((user) => (
                <option key={user.id} value={String(user.id)}>
                  {user.name} {user.surname} - {user.role}
                </option>
              ))}
            </select>

            {selectedUser ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
                <div className="font-bold text-slate-900">{selectedUser.name} {selectedUser.surname}</div>
                <div className="mt-1">{selectedUser.email}</div>
                <div className="mt-2 text-xs uppercase tracking-widest text-indigo-400">{selectedUser.role}</div>
                {selectedUser.unit ? <div className="mt-2 text-xs">Birim: {selectedUser.unit}</div> : null}
              </div>
            ) : null}

            {selectedUser ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Kullanici rolleri</div>
                <div className="space-y-2">
                  {roleCatalog.map((role) => {
                    const checked = roleAssignments.includes(role.name);
                    return (
                      <label key={`assign-${role.name}`} className="flex items-center gap-2 text-xs text-slate-900">
                        <input
                          type="checkbox"
                          checked={checked}
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
                  disabled={savingRoleAssignment || roleAssignments.length === 0}
                  className="mt-3 w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-indigo-300 disabled:opacity-50"
                >
                  {savingRoleAssignment ? "Kaydediliyor..." : "Rolleri Kaydet"}
                </button>
              </div>
            ) : null}

            {selectedUser ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Efektif izin ozet</div>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {resolvedPermissions.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Henuz efektif izin bulunmuyor.</div>
                  ) : (
                    resolvedPermissions.map((permission) => (
                      <div key={permission} className="rounded-xl bg-black/30 px-3 py-2 text-xs text-slate-900">
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
              <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 text-sm text-muted-foreground">
                Override duzenlemek icin bir kullanici secin.
              </div>
            ) : loadingUserOverrides ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {userOverrides.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-sm text-muted-foreground">
                    Bu kullanici icin henuz ozel override tanimli degil.
                  </div>
                ) : null}

                {userOverrides.map((override, index) => (
                  <div key={`${override.permission_name}-${index}`} className="grid grid-cols-1 gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1fr_auto]">
                    <select
                      value={override.permission_name}
                      onChange={(event) => updateOverride(index, { permission_name: event.target.value })}
                      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-900 outline-none"
                    >
                      {Object.entries(granularPermissionGroups).map(([group, permissions]) => (
                        <optgroup key={group} label={group}>
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
                      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-900 outline-none"
                    >
                      <option value="allow">allow</option>
                      <option value="deny">deny</option>
                    </select>

                    <select
                      value={override.scope_type ?? ""}
                      onChange={(event) => updateOverride(index, { scope_type: event.target.value || null })}
                      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-900 outline-none"
                    >
                      <option value="">scope yok</option>
                      <option value="all">all</option>
                      <option value="own_projects">own_projects</option>
                      <option value="assigned_projects">assigned_projects</option>
                      <option value="selected_projects">selected_projects</option>
                      <option value="own_unit">own_unit</option>
                      <option value="self">self</option>
                      <option value="none">none</option>
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
                      placeholder={
                        override.scope_type === "selected_projects"
                          ? "Proje ID'leri: 1,2,3"
                          : override.scope_type === "own_unit"
                            ? "Birim adi"
                            : "Scope alani"
                      }
                      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-900 outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => removeOverride(index)}
                      className="inline-flex items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-red-400 transition hover:bg-red-500 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel space-y-4 rounded-[40px] border border-white/5 p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-indigo-400" />
            <div>
              <h2 className="text-xl font-black text-slate-900">Yetki Degisiklik Gecmisi</h2>
              <p className="text-sm text-muted-foreground">
                Rol matrisi ve kullanici override kayitlari (son 50 islem, activity log).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadAudit()}
            disabled={auditLoading}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-900 disabled:opacity-50"
          >
            {auditLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yenile"}
          </button>
        </div>
        {auditLoading && auditLogs.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : auditLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henuz kayit yok veya log tablosu kullanilamiyor.</p>
        ) : (
          <div className="max-h-80 overflow-auto rounded-2xl border border-white/10">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-zinc-950/95">
                <tr className="border-b border-white/10">
                  <th className="p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Tarih</th>
                  <th className="p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Islem</th>
                  <th className="p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Yapan</th>
                  <th className="p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Hedef</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">
                      {log.created_at ? new Date(log.created_at).toLocaleString("tr-TR") : "-"}
                    </td>
                    <td className="p-3 text-xs font-bold text-slate-900">{log.description}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {log.causer ? `${log.causer.name} (${log.causer.role})` : "Sistem"}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
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
