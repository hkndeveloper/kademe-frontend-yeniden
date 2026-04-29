"use client";

import AdminSettingsPage from "@/features/panel/pages/admin/settings/page";
import CoordinatorSettingsPage from "@/features/panel/pages/coordinator/settings/page";
import StaffSettingsPage from "@/features/panel/pages/staff/settings/page";
import { useAuth } from "@/store/useAuth";

export default function PanelSettingsPage() {
  const role = useAuth((s) => s.user?.role);
  if (role === "staff") return <StaffSettingsPage />;
  if (role === "coordinator") return <CoordinatorSettingsPage />;
  return <AdminSettingsPage />;
}
