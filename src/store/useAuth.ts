import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AxiosError } from "axios";
import api from "@/lib/api/axios";

interface User {
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
    manageable_project_ids?: number[];
    manageable_unit?: string | null;
  };
  must_change_password?: boolean | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  setHasHydrated: (state: boolean) => void;
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

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
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
          set({
            user: response.data.user,
            isAuthenticated: true,
          });
        } catch (error: unknown) {
          console.error("Profil guncellenemedi:", error);
          const axiosError = error as AxiosError;
          if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
            set({ isAuthenticated: false, user: null, token: null });
          }
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
