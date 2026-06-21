import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Award,
  Bell,
  Briefcase,
  CalendarDays,
  CreditCard,
  Database,
  FileStack,
  Handshake,
  HeartPulse,
  Layers,
  LifeBuoy,
  Mail,
  ScrollText,
  Settings,
  ShieldAlert,
  Sparkles,
  UserCog,
  UserRoundCog,
  UserCircle,
  Users,
} from "lucide-react";

import { shouldShowMyProjectNav, shouldShowProjectsListNav, type PanelNavUser } from "@/lib/panel-scope";
import type { PanelModule } from "@/store/useAuth";

/**
 * Panel menü tek kaynağı. Görünürlük `useAuth().hasPermission` ile belirlenir; bu liste
 * `user.effective_permissions` üzerinden çalışır. Backend, atanmış rol(ler)in varsayılan
 * action'ları ile yetki matrisinden eklenen ek action'ları birleştirip `/auth/me` ile döner.
 * `projects` / `Projem` satırları ek olarak `permission_scopes` + `manageable_project_ids`
 * ile süzülür (`@/lib/panel-scope`).
 */
export type PanelMenuSectionDef = {
  id: string;
  label: string;
  /** Sidebar’da bölümlerin üst üste sırası (küçük önce) */
  order: number;
};

export type PanelMenuItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  anyPermissions?: string[];
  /** `PANEL_MENU_SECTIONS` içinden bir id */
  sectionId: string;
  /** Aynı bölüm içindeki sıra (küçük önce) */
  order: number;
};

export const PANEL_MENU_SECTIONS: PanelMenuSectionDef[] = [
  { id: "overview", label: "Ozet", order: 0 },
  { id: "projects", label: "Projeler ve programlar", order: 1 },
  { id: "operations", label: "Operasyon", order: 2 },
  { id: "people", label: "Yonetim ve kisiler", order: 3 },
  { id: "organization", label: "Yonetim ve kisiler", order: 3 },
  { id: "communication", label: "Icerik ve iletisim", order: 4 },
  { id: "content", label: "Icerik ve iletisim", order: 4 },
  { id: "system", label: "Sistem", order: 5 },
  { id: "account", label: "Hesap", order: 6 },
];

export const unifiedPanelMenu: PanelMenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/panel/dashboard",
    icon: Activity,
    anyPermissions: [
      "dashboard.admin.view",
      "dashboard.coordinator.view",
      "dashboard.staff.view",
      "programs.view",
      "applications.view",
      "financial.view",
      "support.view",
      "certificates.view",
    ],
    sectionId: "overview",
    order: 10,
  },
  {
    id: "applications",
    label: "Basvurular",
    href: "/panel/applications",
    icon: FileStack,
    permission: "applications.view",
    sectionId: "operations",
    order: 10,
  },
  {
    id: "volunteer",
    label: "Gonullu Basvurulari",
    href: "/panel/volunteer",
    icon: UserCog,
    permission: "volunteer.view",
    sectionId: "operations",
    order: 15,
  },
  {
    id: "programs",
    label: "Programlar",
    href: "/panel/programs",
    icon: CalendarDays,
    permission: "programs.view",
    sectionId: "operations",
    order: 20,
  },
  {
    id: "projects",
    label: "Projeler",
    href: "/panel/projects",
    icon: Layers,
    permission: "projects.view",
    sectionId: "operations",
    order: 30,
  },
  {
    id: "participants",
    label: "Katilimci Ozet",
    href: "/panel/participants",
    icon: Users,
    permission: "projects.participants.view",
    sectionId: "operations",
    order: 40,
  },
  {
    id: "digital-bohca",
    label: "Dijital Bohca",
    href: "/panel/digital-bohca",
    icon: Database,
    permission: "digital_bohca.view",
    sectionId: "operations",
    order: 45,
  },
  {
    id: "assignments",
    label: "Odevler",
    href: "/panel/assignments",
    icon: FileStack,
    permission: "assignments.view",
    sectionId: "operations",
    order: 46,
  },
  {
    id: "kpd",
    label: "KPD",
    href: "/panel/kpd",
    icon: HeartPulse,
    anyPermissions: [
      "kpd.appointments.view",
      "kpd.reports.view",
      "kpd.appointments.manage",
      "kpd.reports.create",
      "kpd.reports.delete",
    ],
    sectionId: "operations",
    order: 47,
  },
  {
    id: "my-project",
    label: "Projem",
    href: "/panel/my-project",
    icon: Briefcase,
    permission: "projects.view",
    sectionId: "operations",
    order: 50,
  },
  {
    id: "calendar",
    label: "Takvim",
    href: "/panel/calendar",
    icon: CalendarDays,
    permission: "calendar.view",
    sectionId: "operations",
    order: 60,
  },
  {
    id: "financials",
    label: "Mali Islemler",
    href: "/panel/financials",
    icon: CreditCard,
    permission: "financial.view",
    sectionId: "operations",
    order: 70,
  },
  {
    id: "requests",
    label: "Talepler",
    href: "/panel/requests",
    icon: UserCog,
    permission: "requests.view",
    sectionId: "operations",
    order: 80,
  },
  {
    id: "support",
    label: "Destek",
    href: "/panel/support",
    icon: LifeBuoy,
    permission: "support.view",
    sectionId: "operations",
    order: 90,
  },
  {
    id: "users",
    label: "Kullanicilar",
    href: "/panel/users",
    icon: Users,
    permission: "users.view",
    sectionId: "organization",
    order: 10,
  },
  {
    id: "permission-matrix",
    label: "Yetki Matrisi",
    href: "/panel/users/permissions",
    icon: ShieldAlert,
    permission: "permissions.matrix.view",
    sectionId: "organization",
    order: 20,
  },
  {
    id: "staff",
    label: "Personel",
    href: "/panel/staff",
    icon: UserRoundCog,
    permission: "staff.view",
    sectionId: "organization",
    order: 30,
  },
  {
    id: "members",
    label: "Birim uyeleri",
    href: "/panel/members",
    icon: Users,
    permission: "staff.view",
    sectionId: "organization",
    order: 40,
  },
  {
    id: "certificates",
    label: "Sertifikalar",
    href: "/panel/certificates",
    icon: Award,
    permission: "certificates.view",
    sectionId: "content",
    order: 10,
  },
  {
    id: "periods",
    label: "Donemler",
    href: "/panel/periods",
    icon: Database,
    permission: "periods.view",
    sectionId: "content",
    order: 20,
  },
  {
    id: "inbox",
    label: "Mesaj Kutusu",
    href: "/panel/inbox",
    icon: Bell,
    permission: "announcements.view",
    sectionId: "content",
    order: 25,
  },
  {
    id: "announcements",
    label: "Duyurular",
    href: "/panel/announcements",
    icon: Bell,
    permission: "announcements.view",
    sectionId: "content",
    order: 30,
  },
  {
    id: "alumni-opportunities",
    label: "Kariyer firsatlari",
    href: "/panel/alumni-opportunities",
    icon: Handshake,
    permission: "announcements.view",
    sectionId: "content",
    order: 35,
  },
  {
    id: "content",
    label: "Icerik",
    href: "/panel/content",
    icon: Database,
    permission: "content.view",
    sectionId: "content",
    order: 40,
  },
  {
    id: "motivation",
    label: "Motivasyon",
    href: "/panel/motivation",
    icon: Sparkles,
    anyPermissions: ["motivation.view", "motivation.manage"],
    sectionId: "content",
    order: 45,
  },
  {
    id: "newsletter",
    label: "E-Bulten",
    href: "/panel/newsletter",
    icon: Mail,
    permission: "newsletter.view",
    sectionId: "content",
    order: 50,
  },
  {
    id: "logs",
    label: "Loglar",
    href: "/panel/logs",
    icon: ScrollText,
    permission: "logs.view",
    sectionId: "system",
    order: 10,
  },
  {
    id: "assistant",
    label: "Veri Asistani",
    href: "/panel/chatbot",
    icon: Sparkles,
    permission: "chatbot.view",
    sectionId: "system",
    order: 20,
  },
  {
    id: "kvkk-forget",
    label: "KVKK Unutulma",
    href: "/panel/kvkk-forget",
    icon: ShieldAlert,
    permission: "users.update",
    sectionId: "system",
    order: 25,
  },
  {
    id: "settings",
    label: "Ayarlar",
    href: "/panel/settings",
    icon: Settings,
    permission: "settings.view",
    sectionId: "system",
    order: 30,
  },
  {
    id: "profile",
    label: "Profilim",
    href: "/panel/profile",
    icon: UserCircle,
    sectionId: "account",
    order: 10,
  },
];

function itemIsVisible(
  item: PanelMenuItem,
  hasPermission: (permission: string) => boolean,
  hasAnyPermission: (permissions: string[]) => boolean,
  user: PanelNavUser | null
): boolean {
  let allowed: boolean;
  if (item.anyPermissions?.length) {
    allowed = hasAnyPermission(item.anyPermissions);
  } else if (!item.permission) {
    allowed = true;
  } else {
    allowed = hasPermission(item.permission);
  }

  if (!allowed) return false;
  if (item.id === "projects") return shouldShowProjectsListNav(user, hasPermission);
  if (item.id === "my-project" || item.id === "my_project") return shouldShowMyProjectNav(user, hasPermission);
  if (item.id === "staff") return user?.permission_scopes?.["staff.view"]?.scope_type === "all";
  if (item.id === "members") return user?.permission_scopes?.["staff.view"]?.scope_type !== "all";
  if (item.id === "permission-matrix" || item.id === "permission_matrix") return user?.permission_scopes?.["permissions.matrix.view"]?.scope_type === "all";
  if (item.id === "content") return !!user?.permission_scopes?.["content.view"];
  if (item.id === "motivation") return !!user?.permission_scopes?.["motivation.view"] || !!user?.permission_scopes?.["motivation.manage"];
  if (item.id === "settings") {
    return (
      user?.permission_scopes?.["settings.view"]?.scope_type === "all" ||
      user?.permission_scopes?.["content.site_settings.update"]?.scope_type === "all"
    );
  }
  if (item.id === "newsletter") return !!user?.permission_scopes?.["newsletter.view"];
  if (item.id === "kvkk-forget" || item.id === "kvkk_forget") return user?.permission_scopes?.["users.update"]?.scope_type === "all";
  if (item.id === "assistant" || item.id === "chatbot") return !!user?.permission_scopes?.["chatbot.view"] || !!user?.permission_scopes?.["chatbot.manage"];
  if (item.id === "kpd") {
    const kpdProjectIds = user?.authorization_context?.project_ids_by_special_module?.kpd_appointments ?? [];
    const hasGlobalKpdScope =
      user?.permission_scopes?.["kpd.appointments.view"]?.scope_type === "all" ||
      user?.permission_scopes?.["kpd.reports.view"]?.scope_type === "all" ||
      user?.permission_scopes?.["kpd.appointments.manage"]?.scope_type === "all" ||
      user?.permission_scopes?.["kpd.reports.create"]?.scope_type === "all" ||
      user?.permission_scopes?.["kpd.reports.delete"]?.scope_type === "all";
    const hasKpdProjectScope =
      hasGlobalKpdScope ||
      (user?.authorization_context?.manageable_project_ids ?? []).some((projectId) => kpdProjectIds.includes(Number(projectId)));

    return (
      hasKpdProjectScope &&
      (
        !!user?.permission_scopes?.["kpd.appointments.view"] ||
        !!user?.permission_scopes?.["kpd.reports.view"] ||
        !!user?.permission_scopes?.["kpd.appointments.manage"] ||
        !!user?.permission_scopes?.["kpd.reports.create"] ||
        !!user?.permission_scopes?.["kpd.reports.delete"]
      )
    );
  }
  return true;
}

/** Sidebar: izinlere göre filtrelenmiş, bölüm ve sıraya göre gruplanmış menü */
const iconByManifestName: Record<string, LucideIcon> = {
  "layout-dashboard": Activity,
  "folder-kanban": Layers,
  "calendar-range": Database,
  "calendar-days": CalendarDays,
  calendar: CalendarDays,
  "clipboard-list": FileStack,
  "heart-handshake": Handshake,
  wallet: CreditCard,
  inbox: Mail,
  "life-buoy": LifeBuoy,
  "file-check": FileStack,
  archive: Database,
  "badge-check": Award,
  megaphone: Bell,
  newspaper: Database,
  users: Users,
  "user-cog": UserCog,
  "shield-check": ShieldAlert,
  settings: Settings,
  "list-checks": ScrollText,
  bot: Sparkles,
  stethoscope: HeartPulse,
  "briefcase-business": Briefcase,
  "folder-open": Layers,
  "id-card": UserCircle,
  mail: Mail,
  "messages-square": Mail,
  "shield-alert": ShieldAlert,
  sparkles: Sparkles,
  "user-circle": UserCircle,
};

function sectionForManifest(section: string): PanelMenuSectionDef {
  return PANEL_MENU_SECTIONS.find((item) => item.id === section) ?? {
    id: section,
    label: section.replaceAll("_", " "),
    order: 99,
  };
}

function panelModuleToMenuItem(module: PanelModule): PanelMenuItem | null {
  if (module.panel_type !== "authority" || !module.href) {
    return null;
  }

  const viewPermissions = module.view_permissions ?? [];

  return {
    id: module.id,
    label: module.label,
    href: module.href,
    icon: iconByManifestName[module.icon ?? ""] ?? Activity,
    permission: viewPermissions.length === 1 ? viewPermissions[0] : undefined,
    anyPermissions: viewPermissions.length > 1 ? viewPermissions : undefined,
    sectionId: module.section,
    order: module.order,
  };
}

export function getVisiblePanelMenuGrouped(
  hasPermission: (permission: string) => boolean,
  hasAnyPermission: (permissions: string[]) => boolean,
  user: PanelNavUser | null,
  panelModules?: PanelModule[]
): Array<{ section: PanelMenuSectionDef; items: PanelMenuItem[] }> {
  const sourceItems = panelModules
    ? panelModules
        .map(panelModuleToMenuItem)
        .filter((item): item is PanelMenuItem => item !== null)
    : unifiedPanelMenu;
  const visible = sourceItems.filter((item) => itemIsVisible(item, hasPermission, hasAnyPermission, user));

  const bySection = new Map<string, PanelMenuItem[]>();
  for (const item of visible) {
    const list = bySection.get(item.sectionId) ?? [];
    list.push(item);
    bySection.set(item.sectionId, list);
  }

  for (const [, items] of bySection) {
    items.sort((a, b) => a.order - b.order);
  }

  const sectionById = new Map(PANEL_MENU_SECTIONS.map((s) => [s.id, s]));
  const sections = Array.from(bySection.keys())
    .map((sectionId) => sectionById.get(sectionId) ?? sectionForManifest(sectionId))
    .sort((a, b) => a.order - b.order);

  return sections.map((section) => ({
    section: sectionById.get(section.id) ?? section,
    items: bySection.get(section.id) ?? [],
  }));
}
