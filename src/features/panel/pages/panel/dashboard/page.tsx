"use client";

import AdminDashboardPage from "@/features/panel/pages/admin/dashboard/page";
import CoordinatorDashboardPage from "@/features/panel/pages/coordinator/dashboard/page";
import StaffDashboardPage from "@/features/panel/pages/staff/dashboard/page";
import { useAuth } from "@/store/useAuth";

export default function PanelDashboardPage() {
  const role = useAuth((s) => s.user?.role);
  if (role === "staff") return <StaffDashboardPage />;
  if (role === "coordinator") return <CoordinatorDashboardPage />;
  return <AdminDashboardPage />;
}
