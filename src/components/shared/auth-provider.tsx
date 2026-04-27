"use client";

import { useEffect } from "react";
import { useAuth } from "@/store/useAuth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { fetchProfile, isAuthenticated, token } = useAuth();

  useEffect(() => {
    // Sayfa yenilendiğinde eğer token varsa kullanıcı verilerini backend'den tazele
    if (token && !isAuthenticated) {
        fetchProfile();
    }
  }, [token, isAuthenticated, fetchProfile]);

  return <>{children}</>;
}
