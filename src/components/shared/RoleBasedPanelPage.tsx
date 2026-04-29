"use client";

import type { ComponentType } from "react";
import { useAuth } from "@/store/useAuth";

type RoleBasedPanelPageProps = {
  admin: ComponentType;
  coordinator?: ComponentType;
  staff?: ComponentType;
};

/**
 * Ortak `/panel/*` icinde eski rol-bazli sayfa varyantlarini tek yerden secmek icin.
 * Varyant yoksa admin bileşeni kullanilir (koordinator/personel sayfasi henuz yoksa).
 */
export function RoleBasedPanelPage({ admin: Admin, coordinator: Coordinator, staff: Staff }: RoleBasedPanelPageProps) {
  const role = useAuth((s) => s.user?.role);

  if (role === "staff" && Staff) {
    return <Staff />;
  }
  if (role === "coordinator" && Coordinator) {
    return <Coordinator />;
  }
  return <Admin />;
}
