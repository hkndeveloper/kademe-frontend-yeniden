"use client";

import AdminSupportPage from "@/features/panel/pages/admin/support/page";
import CoordinatorSupportPage from "@/features/panel/pages/coordinator/support/page";
import StaffSupportPage from "@/features/panel/pages/staff/support/page";
import { useAuth } from "@/store/useAuth";

/**
 * Support domain tek panel girisi.
 * Role'a gore mevcut ekran varyantini secer.
 */
export default function PanelSupportPage() {
  const role = useAuth((s) => s.user?.role);
  if (role === "staff") return <StaffSupportPage />;
  if (role === "coordinator") return <CoordinatorSupportPage />;
  return <AdminSupportPage />;
}
