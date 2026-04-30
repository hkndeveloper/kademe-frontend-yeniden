"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/store/useAuth";
import { homePathForUser } from "@/lib/role-home";
import { canAccessPanelPath } from "@/lib/panel-permissions";
import { shouldShowMyProjectNav } from "@/lib/panel-scope";
import { UnifiedPanelSidebar } from "@/components/shared/UnifiedPanelSidebar";

export default function UnifiedPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, fetchProfile, _hasHydrated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const runAuthCheck = useCallback(
    async (showLoading = false) => {
      if (!_hasHydrated) return;
      if (showLoading) setLoading(true);
      if (!isAuthenticated) {
        router.replace("/auth/login");
        return;
      }
      setLoadError(null);

      try {
        await fetchProfile();
        const state = useAuth.getState();
        const user = state.user;
        if (!user) {
          router.replace("/auth/login");
          return;
        }

        const allowed = canAccessPanelPath(pathname, state.hasPermission, state.hasAnyPermission, user);

        if (!allowed) {
          if (
            pathname.split("?")[0]?.replace(/\/$/, "") === "/panel/projects" &&
            shouldShowMyProjectNav(user, state.hasPermission)
          ) {
            router.replace("/panel/my-project");
            return;
          }
          router.replace(homePathForUser(user));
          return;
        }
      } catch (error) {
        console.error("Panel auth kontrolu basarisiz:", error);
        setLoadError("Panel verileri yuklenemedi. Lutfen baglantiyi kontrol edip sayfayi yenileyin.");
      } finally {
        setLoading(false);
      }
    },
    [_hasHydrated, isAuthenticated, fetchProfile, pathname, router]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runAuthCheck(true);
  }, [runAuthCheck]);

  useEffect(() => {
    const onFocus = () => {
      void runAuthCheck(false);
    };

    const onVisibilityChange = () => {
      if (!document.hidden) {
        void runAuthCheck(false);
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [runAuthCheck]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-100">
        <Loader2 className="h-10 w-10 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <p className="text-sm font-medium">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-workspace min-h-screen w-full">
      <UnifiedPanelSidebar />
      <div className="ml-72 min-h-screen border-l border-slate-200/60 bg-slate-100/95">
        <main className="min-h-screen p-6 sm:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}

