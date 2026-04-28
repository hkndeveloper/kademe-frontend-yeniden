"use client";

import { useEffect, useState } from "react";
import { AdminSidebar, getAdminShellPermissionKeys } from "@/components/admin/sidebar";
import { homePathForRole } from "@/lib/role-home";
import { useAuth } from "@/store/useAuth";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, fetchProfile, _hasHydrated } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!_hasHydrated) return;

      if (!isAuthenticated) {
        router.replace("/auth/login");
        return;
      }

      await fetchProfile();

      const u = useAuth.getState().user;
      if (!u) {
        router.replace("/auth/login");
        return;
      }

      if (u.role === "coordinator" || u.role === "staff") {
        const keys = getAdminShellPermissionKeys();
        if (!useAuth.getState().hasAnyPermission(keys)) {
          router.replace(u.role === "coordinator" ? "/coordinator/dashboard" : "/staff/dashboard");
          return;
        }
        setLoading(false);
        return;
      }

      if (u.role !== "super_admin") {
        router.replace(homePathForRole(u.role));
        return;
      }

      setLoading(false);
    };

    checkAdmin();
  }, [isAuthenticated, router, fetchProfile, _hasHydrated]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-100">
        <Loader2 className="h-10 w-10 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="panel-workspace min-h-screen w-full">
      <AdminSidebar />
      <div className="ml-72 min-h-screen border-l border-slate-200/60 bg-slate-100/95">
        <main className="min-h-screen p-6 sm:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
