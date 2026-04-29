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
  { id: "operations", label: "Operasyon", order: 1 },
  { id: "organization", label: "Yonetim ve kisiler", order: 2 },
  { id: "content", label: "Icerik ve iletisim", order: 3 },
  { id: "system", label: "Sistem", order: 4 },
  { id: "account", label: "Hesap", order: 5 },
];

export const unifiedPanelMenu: PanelMenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/panel/dashboard",
    icon: Activity,
    anyPermissions: ["dashboard.admin.view", "dashboard.coordinator.view", "dashboard.staff.view"],
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
    id: "announcements",
    label: "Duyurular",
    href: "/panel/announcements",
    icon: Bell,
    permission: "announcements.view",
    sectionId: "content",
    order: 30,
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
  if (item.id === "my-project") return shouldShowMyProjectNav(user, hasPermission);
  return true;
}

/** Sidebar: izinlere göre filtrelenmiş, bölüm ve sıraya göre gruplanmış menü */
export function getVisiblePanelMenuGrouped(
  hasPermission: (permission: string) => boolean,
  hasAnyPermission: (permissions: string[]) => boolean,
  user: PanelNavUser | null
): Array<{ section: PanelMenuSectionDef; items: PanelMenuItem[] }> {
  const visible = unifiedPanelMenu.filter((item) => itemIsVisible(item, hasPermission, hasAnyPermission, user));

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

  return PANEL_MENU_SECTIONS.filter((s) => bySection.has(s.id))
    .sort((a, b) => a.order - b.order)
    .map((section) => ({
      section: sectionById.get(section.id) ?? section,
      items: bySection.get(section.id) ?? [],
    }));
}
