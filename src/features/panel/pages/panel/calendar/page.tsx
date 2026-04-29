"use client";

import AdminCalendarPage from "@/features/panel/pages/admin/calendar/page";
import CoordinatorCalendarPage from "@/features/panel/pages/coordinator/calendar/page";
import StaffCalendarPage from "@/features/panel/pages/staff/calendar/page";
import { useAuth } from "@/store/useAuth";

export default function PanelCalendarPage() {
  const role = useAuth((s) => s.user?.role);
  if (role === "staff") return <StaffCalendarPage />;
  if (role === "coordinator") return <CoordinatorCalendarPage />;
  return <AdminCalendarPage />;
}
