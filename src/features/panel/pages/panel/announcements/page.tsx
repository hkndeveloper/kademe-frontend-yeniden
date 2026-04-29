"use client";

import AdminAnnouncementsPage from "@/features/panel/pages/admin/announcements/page";
import StaffAnnouncementsPage from "@/features/panel/pages/staff/announcements/page";
import { useAuth } from "@/store/useAuth";

/**
 * Announcements domain tek panel girisi:
 * - staff: salt-okuma odakli duyuru ekrani
 * - diger roller: yonetim ekrani (liste + olusturma)
 */
export default function PanelAnnouncementsPage() {
  const role = useAuth((s) => s.user?.role);
  if (role === "staff") {
    return <StaffAnnouncementsPage />;
  }
  return <AdminAnnouncementsPage />;
}
