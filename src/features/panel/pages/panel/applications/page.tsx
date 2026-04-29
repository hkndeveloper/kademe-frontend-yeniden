"use client";

import AdminApplicationsPage from "@/features/panel/pages/admin/applications/page";
import CoordinatorApplicationsPage from "@/features/panel/pages/coordinator/applications/page";
import StaffApplicationsPage from "@/features/panel/pages/staff/applications/page";
import { useAuth } from "@/store/useAuth";

export default function PanelApplicationsPage() {
  const role = useAuth((s) => s.user?.role);
  if (role === "staff") return <StaffApplicationsPage />;
  if (role === "coordinator") return <CoordinatorApplicationsPage />;
  return <AdminApplicationsPage />;
}
