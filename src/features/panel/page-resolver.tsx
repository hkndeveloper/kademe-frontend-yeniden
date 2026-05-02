"use client";

import type { ComponentType } from "react";
import AdminUsersPage from "@/features/panel/pages/admin/users/page";
import PermissionsPage from "@/features/panel/pages/admin/users/permissions/page";
import AdminStaffPage from "@/features/panel/pages/admin/staff/page";
import AdminPeriodsPage from "@/features/panel/pages/admin/periods/page";
import AdminNewsletterPage from "@/features/panel/pages/admin/newsletter/page";
import AdminLogsPage from "@/features/panel/pages/admin/logs/page";
import AdminCertificatesPage from "@/features/panel/pages/admin/certificates/page";
import PanelProgramsPage from "@/features/panel/pages/panel/programs/page";
import PanelParticipantsPage from "@/features/panel/pages/panel/participants/page";
import PanelProgramQrPage from "@/features/panel/pages/panel/programs/[id]/qr/page";
import PanelMyProjectPage from "@/features/panel/pages/panel/my-project/page";
import PanelMembersPage from "@/features/panel/pages/panel/members/page";
import PanelSharedRequestsPage from "@/features/panel/pages/panel/requests/page";
import PanelUnifiedProjectDetailPage from "@/features/panel/pages/panel/projects/[id]/page";
import PanelUnifiedProjectContentPage from "@/features/panel/pages/panel/projects/[id]/content/page";
import PanelAnnouncementsPage from "@/features/panel/pages/panel/announcements/page";
import PanelSupportPage from "@/features/panel/pages/panel/support/page";
import PanelContentPage from "@/features/panel/pages/panel/content/page";
import PanelSettingsPage from "@/features/panel/pages/panel/settings/page";
import PanelApplicationsPage from "@/features/panel/pages/panel/applications/page";
import PanelVolunteerPage from "@/features/panel/pages/panel/volunteer/page";
import PanelCalendarPage from "@/features/panel/pages/panel/calendar/page";
import PanelDashboardPage from "@/features/panel/pages/panel/dashboard/page";
import PanelChatbotPage from "@/features/panel/pages/panel/chatbot/page";
import PanelProfilePage from "@/features/panel/pages/panel/profile/page";
import PanelFinancialsPage from "@/features/panel/pages/panel/financials/page";
import PanelProjectsPage from "@/features/panel/pages/panel/projects/page";
import PanelDigitalBohcaPage from "@/features/panel/pages/panel/digital-bohca/page";
import PanelAssignmentsPage from "@/features/panel/pages/panel/assignments/page";
import AdminPeriodFormBuilderPage from "@/features/panel/pages/admin/periods/form-builder/page";

function NotFoundPanelPage() {
  return (
    <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8 text-amber-100">
      Bu panel sayfasi henuz tasinmadi veya yetkiniz bulunmuyor.
    </div>
  );
}

const PANEL_ROUTE_COMPONENTS: Record<string, ComponentType> = {
  dashboard: PanelDashboardPage,
  applications: PanelApplicationsPage,
  volunteer: PanelVolunteerPage,
  programs: PanelProgramsPage,
  projects: PanelProjectsPage,
  participants: PanelParticipantsPage,
  "my-project": PanelMyProjectPage,
  calendar: PanelCalendarPage,
  financials: PanelFinancialsPage,
  "digital-bohca": PanelDigitalBohcaPage,
  assignments: PanelAssignmentsPage,
  requests: PanelSharedRequestsPage,
  support: PanelSupportPage,
  users: AdminUsersPage,
  "users/permissions": PermissionsPage,
  staff: AdminStaffPage,
  members: PanelMembersPage,
  certificates: AdminCertificatesPage,
  periods: AdminPeriodsPage,
  "periods/form-builder": AdminPeriodFormBuilderPage,
  announcements: PanelAnnouncementsPage,
  content: PanelContentPage,
  newsletter: AdminNewsletterPage,
  logs: AdminLogsPage,
  chatbot: PanelChatbotPage,
  profile: PanelProfilePage,
  settings: PanelSettingsPage,
  "projects/[id]": PanelUnifiedProjectDetailPage,
  "projects/[id]/content": PanelUnifiedProjectContentPage,
  "programs/[id]/qr": PanelProgramQrPage,
};

export function PanelRouteContent({ routeKey }: { routeKey: string }) {
  const Component = PANEL_ROUTE_COMPONENTS[routeKey];
  if (!Component) return <NotFoundPanelPage />;
  return <Component />;
}
