"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/store/useAuth";
import { homePathForRole } from "@/lib/role-home";
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

  useEffect(() => {
    const checkAuth = async () => {
      if (!_hasHydrated) return;
      if (!isAuthenticated) {
        router.replace("/auth/login");
        return;
      }

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
        router.replace(homePathForRole(user.role));
        return;
      }

      setLoading(false);
    };

    void checkAuth();
  }, [isAuthenticated, fetchProfile, router, _hasHydrated, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-100">
        <Loader2 className="h-10 w-10 animate-spin text-[#FF6B00]" />
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

