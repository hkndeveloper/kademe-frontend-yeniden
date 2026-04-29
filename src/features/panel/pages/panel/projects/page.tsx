"use client";

import AdminProjectsPage from "@/features/panel/pages/admin/projects/page";
import CoordinatorProjectsPage from "@/features/panel/pages/coordinator/projects/page";
import { useAuth } from "@/store/useAuth";

export default function PanelProjectsPage() {
  const role = useAuth((s) => s.user?.role);
  if (role === "staff" || role === "coordinator") return <CoordinatorProjectsPage />;
  return <AdminProjectsPage />;
}
