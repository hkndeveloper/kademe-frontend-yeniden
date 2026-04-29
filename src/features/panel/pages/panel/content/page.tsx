"use client";

import AdminContentPage from "@/features/panel/pages/admin/content/page";
import StaffContentPage from "@/features/panel/pages/staff/content/page";
import { useAuth } from "@/store/useAuth";

export default function PanelContentPage() {
  const role = useAuth((s) => s.user?.role);
  if (role === "staff") return <StaffContentPage />;
  return <AdminContentPage />;
}
