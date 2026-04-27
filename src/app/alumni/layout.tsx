"use client";

import { useEffect, useState } from "react";
import { AlumniSidebar } from "@/components/alumni/sidebar";
import { homePathForRole } from "@/lib/role-home";
import { useAuth } from "@/store/useAuth";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AlumniLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, fetchProfile, _hasHydrated } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!_hasHydrated) return;

      if (!isAuthenticated) {
        router.replace("/auth/login");
        return;
      }

      await fetchProfile();
      const role = useAuth.getState().user?.role;
      if (!role) {
        router.replace("/auth/login");
        return;
      }
      if (role !== "alumni") {
        router.replace(homePathForRole(role));
        return;
      }
      setLoading(false);
    };

    void checkAuth();
  }, [isAuthenticated, router, fetchProfile, _hasHydrated]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-100">
        <div className="text-center text-slate-600">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[#FF6B00]" />
          <p className="animate-pulse text-sm">Mezun Paneli Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-workspace min-h-screen w-full">
      <AlumniSidebar />
      <div className="ml-72 min-h-screen border-l border-slate-200/60 bg-slate-100/95">
        <main className="min-h-screen p-6 sm:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
