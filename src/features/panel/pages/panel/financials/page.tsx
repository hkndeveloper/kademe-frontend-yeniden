"use client";

import AdminFinancialsPage from "@/features/panel/pages/admin/financials/page";
import CoordinatorFinancialsPage from "@/features/panel/pages/coordinator/financials/page";
import { useAuth } from "@/store/useAuth";

export default function PanelFinancialsPage() {
  const role = useAuth((s) => s.user?.role);
  if (role === "coordinator") return <CoordinatorFinancialsPage />;
  return <AdminFinancialsPage />;
}
