"use client";

import CoordinatorProfilePage from "@/features/panel/pages/coordinator/profile/page";
import StaffProfilePage from "@/features/panel/pages/staff/profile/page";
import { useAuth } from "@/store/useAuth";

export default function PanelProfilePage() {
  const role = useAuth((s) => s.user?.role);
  if (role === "coordinator") return <CoordinatorProfilePage />;
  return <StaffProfilePage />;
}
