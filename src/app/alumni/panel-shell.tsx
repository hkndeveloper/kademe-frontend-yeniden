"use client";

import { useEffect, useState } from "react";
import { AlumniMobileNav, AlumniSidebar } from "@/components/alumni/sidebar";
import { homePathForUser } from "@/lib/role-home";
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
      const user = useAuth.getState().user;
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      if (user.role !== "alumni") {
        router.replace(homePathForUser(user));
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
      <AlumniMobileNav />
      <div className="min-h-screen bg-slate-100/95 transition-[margin-left] duration-300 lg:ml-20 lg:border-l lg:border-slate-200/60 lg:peer-hover:ml-72 lg:peer-focus-within:ml-72">
        <main className="min-h-screen px-4 pb-24 pt-4 sm:px-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
