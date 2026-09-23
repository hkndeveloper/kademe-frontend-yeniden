import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AxiosError } from "axios";
import api from "@/lib/api/axios";
import { activeCoordinationContextMatches } from "@/lib/coordination-context-contract";

export interface OrganizationUnitMembership {
  membership_id: number;
  unit_id: number;
  unit_code: string;
  unit_name: string;
  unit_kind: "project" | "service";
  position: "coordinator" | "staff";
  is_primary: boolean;
  project_id?: number | null;
  permissions: string[];
  project_ids_by_permission: Record<string, number[]>;
  manageable_project_ids: number[];
}

export interface OrganizationContext {
  schema_version: number;
  available: boolean;
  authorization_mode: "legacy" | "shadow" | "enforce";
  authoritative: boolean;
  context_header?: string;
  active_unit_id?: number | null;
  active_membership_id?: number | null;
  active_context_source?: "header" | "single_membership" | "primary_fallback" | "resolver_fallback" | "no_membership" | "not_authoritative" | string;
  selection_required?: boolean;
  unit_memberships: OrganizationUnitMembership[];
  primary_unit_id?: number | null;
  coordinated_unit_ids: number[];
  staffed_unit_ids: number[];
  project_ids_by_permission: Record<string, number[]>;
  manageable_project_ids: number[];
  available_project_ids?: number[];
  projects: Array<{ id: number; name: string; slug: string; status: string }>;
}

export interface User {
  id: number;
  name: string;
  surname: string;
  email: string;
  role: string;
  status: string;
  phone?: string | null;
  address?: string | null;
  birth_date?: string | null;
  university?: string | null;
  department?: string | null;
  class_year?: string | null;
  hometown?: string | null;
  tc_verified?: boolean | null;
  yok_verified?: boolean | null;
  profile?: {
    motivation_message?: string | null;
    linkedin_url?: string | null;
    github_url?: string | null;
    instagram_url?: string | null;
  } | null;
  roles?: Array<{
    id: number;
    name: string;
  }>;
  effective_permissions?: string[];
  role_permissions?: string[];
  permission_scopes?: Record<string, { scope_type: string; scope_payload: Record<string, unknown> }>;
  permission_overrides?: Array<{
    permission_name: string;
    effect: "allow" | "deny";
    scope_type?: string | null;
    scope_payload?: Record<string, unknown> | null;
  }>;
  authorization_context?: {
    active_unit_id?: number | null;
    active_membership_id?: number | null;
    active_context_source?: string | null;
    manageable_project_ids?: number[];
    project_ids_by_special_module?: Record<string, number[]>;
    user_special_modules?: string[];
    manageable_unit?: string | null;
  };
  organization_context?: OrganizationContext;
  must_change_password?: boolean | null;
}

export interface PanelModule {
  id: string;
  panel_type: "authority" | "participant" | string;
  label: string;
  section: string;
  href: string | null;
  icon?: string | null;
  order: number;
  entry_permissions: string[];
  /** Temporary backend compatibility alias; new code uses entry_permissions. */
  view_permissions?: string[];
  actions: string[];
  enabled_actions: string[];
  always_visible: boolean;
  context_mode: "organization" | "project_family" | "self_service" | "participant" | string;
  navigation_mode: "standard" | "project_list" | "single_project" | "global_staff" | "unit_members" | string;
  scope_modes: string[];
  entry_scopes: Record<string, { scope_type: string; scope_payload: Record<string, unknown> }>;
  scopes: Record<string, { scope_type: string; scope_payload: Record<string, unknown> }>;
  family_key?: string;
  required_project_types?: string[];
  required_special_modules?: string[];
  matched_project_ids?: number[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  panelModules: PanelModule[];
  panelModulesLoaded: boolean;
  panelModulesError: string | null;
  isContextSwitching: boolean;
  activeUnitId: number | null;
  activeProjectId: number | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  fetchPanelModules: () => Promise<void>;
  setHasHydrated: (state: boolean) => void;
  setActiveUnitId: (unitId: number | null) => Promise<void>;
  setActiveProjectId: (projectId: number | null) => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  getScope: (permission: string) => { scope_type: string; scope_payload: Record<string, unknown> } | null;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      panelModules: [],
      panelModulesLoaded: false,
      panelModulesError: null,
      isContextSwitching: false,
      activeUnitId: null,
      activeProjectId: null,

      setHasHydrated: (state) => {
        set({
          _hasHydrated: state,
          ...(state ? {
            panelModules: [],
            panelModulesLoaded: false,
            panelModulesError: null,
            isContextSwitching: false,
          } : {}),
        });
      },

      setAuth: (user, token) => {
        const selection = contextSelection(user, get().activeUnitId, get().activeProjectId);
        set({ user, token, isAuthenticated: true, panelModulesLoaded: false, panelModulesError: null, isContextSwitching: false, ...selection });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, panelModules: [], panelModulesLoaded: false, panelModulesError: null, isContextSwitching: false, activeUnitId: null, activeProjectId: null });
      },

      setActiveUnitId: async (unitId) => {
        const user = get().user;
        const selection = contextSelection(user, unitId, null);
        if (selection.activeUnitId === get().activeUnitId) return;

        set({
          ...selection,
          panelModules: [],
          panelModulesLoaded: false,
          panelModulesError: null,
          isContextSwitching: true,
        });
        try {
          await Promise.all([
            get().fetchProfile(),
            get().fetchPanelModules(),
          ]);
        } finally {
          set({ isContextSwitching: false });
        }
      },

      setActiveProjectId: (projectId) => {
        const membership = activeMembership(get().user, get().activeUnitId);
        const allowedIds = membership?.manageable_project_ids ?? [];
        set({ activeProjectId: projectId !== null && allowedIds.includes(projectId) ? projectId : null });
      },

      hasPermission: (permission) => {
        const currentUser = get().user;
        const permissions = currentUser?.effective_permissions ?? [];
        return permissions.includes("*") || permissions.includes(permission);
      },

      hasAnyPermission: (permissions) => {
        const currentUser = get().user;
        if (!currentUser) {
          return false;
        }
        const effective = currentUser.effective_permissions ?? [];
        if (effective.includes("*")) {
          return true;
        }
        return permissions.some((p) => effective.includes(p));
      },

      getScope: (permission) => {
        const scopes = get().user?.permission_scopes ?? {};
        return scopes[permission] ?? null;
      },

      fetchProfile: async () => {
        const token = get().token;
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const response = await api.get("/auth/me", {
            params: { t: Date.now() },
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          });
          const user = response.data.user as User;
          const selection = contextSelection(user, get().activeUnitId, get().activeProjectId);
          set({
            user,
            isAuthenticated: true,
            ...selection,
          });
        } catch (error: unknown) {
          console.error("Profil guncellenemedi:", error);
          const axiosError = error as AxiosError;
          const errorCode = (axiosError.response?.data as { error?: string } | undefined)?.error;
          if (axiosError.response?.status === 401
            || (axiosError.response?.status === 403 && errorCode !== "invalid_coordination_unit_context")) {
            set({ isAuthenticated: false, user: null, token: null });
          }
        }
      },

      fetchPanelModules: async () => {
        const token = get().token;
        if (!token) {
          set({ panelModules: [], panelModulesLoaded: false, panelModulesError: null });
          return;
        }

        try {
          const response = await api.get<{
            modules: PanelModule[];
            authorization_context?: { active_unit_id?: number | null };
          }>("/panel/modules", {
            params: { t: Date.now() },
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          });
          const backendActiveUnitId = response.data.authorization_context?.active_unit_id ?? null;
          const requestedActiveUnitId = get().activeUnitId;
          if (!activeCoordinationContextMatches(requestedActiveUnitId, backendActiveUnitId)) {
            throw new Error("Backend aktif birim baglami frontend secimiyle eslesmiyor.");
          }
          set({
            panelModules: response.data.modules ?? [],
            panelModulesLoaded: true,
            panelModulesError: null,
          });
        } catch (error: unknown) {
          console.error("Panel modulleri yuklenemedi:", error);
          set({
            panelModules: [],
            panelModulesLoaded: false,
            panelModulesError: "Panel modulleri yuklenemedi.",
          });
        }
      },
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

function activeMembership(user: User | null, unitId: number | null): OrganizationUnitMembership | null {
  const memberships = user?.organization_context?.unit_memberships ?? [];
  return memberships.find((membership) => membership.unit_id === unitId)
    ?? memberships.find((membership) => membership.is_primary)
    ?? memberships[0]
    ?? null;
}

function contextSelection(user: User | null, unitId: number | null, projectId: number | null) {
  const requestedUnitId = unitId ?? user?.organization_context?.active_unit_id ?? null;
  const membership = activeMembership(user, requestedUnitId);
  const allowedProjectIds = membership?.manageable_project_ids ?? [];

  return {
    activeUnitId: membership?.unit_id ?? null,
    activeProjectId: projectId !== null && allowedProjectIds.includes(projectId)
      ? projectId
      : allowedProjectIds[0] ?? null,
  };
}



