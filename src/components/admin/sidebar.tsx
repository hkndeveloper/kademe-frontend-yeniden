"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Award,
  Bell,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Database,
  FileStack,
  Layers,
  LifeBuoy,
  LogOut,
  Mail,
  ScrollText,
  Settings,
  Sparkles,
  ShieldAlert,
  UserCog,
  UserRoundCog,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/useAuth";
import { PanelBrandBlock } from "@/components/shared/PanelBrandBlock";

export type AdminMenuItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  permission?: string;
  anyPermissions?: string[];
};

export const adminMenuItems: AdminMenuItem[] = [
  {
    icon: Activity,
    label: "Dashboard",
    href: "/admin/dashboard",
    anyPermissions: ["dashboard.admin.view", "dashboard.coordinator.view", "dashboard.staff.view"],
  },
  { icon: FileStack, label: "Basvurular", href: "/admin/applications", permission: "applications.view" },
  { icon: Layers, label: "Projeler", href: "/admin/projects", permission: "projects.view" },
  { icon: CalendarDays, label: "Takvim", href: "/admin/calendar", permission: "calendar.view" },
  { icon: CreditCard, label: "Mali Islemler", href: "/admin/financials", permission: "financial.view" },
  { icon: UserCog, label: "Talepler", href: "/admin/requests", permission: "requests.view" },
  { icon: LifeBuoy, label: "Destek", href: "/admin/support", permission: "support.view" },
  { icon: Users, label: "Kullanicilar", href: "/admin/users", permission: "users.view" },
  { icon: ShieldAlert, label: "Yetki Matrisi", href: "/admin/users/permissions", permission: "permissions.matrix.view" },
  { icon: UserRoundCog, label: "Personel", href: "/admin/staff", permission: "staff.view" },
  { icon: Award, label: "Sertifikalar", href: "/admin/certificates", permission: "certificates.view" },
  { icon: Database, label: "Donemler", href: "/admin/periods", permission: "periods.view" },
  { icon: Bell, label: "Duyurular", href: "/admin/announcements", permission: "announcements.view" },
  { icon: Database, label: "Icerik", href: "/admin/content", permission: "content.view" },
  { icon: Mail, label: "E-Bulten", href: "/admin/newsletter", permission: "newsletter.view" },
  { icon: ScrollText, label: "Loglar", href: "/admin/logs", permission: "logs.view" },
  { icon: Sparkles, label: "Veri Asistani", href: "/admin/chatbot", permission: "chatbot.view" },
  { icon: Settings, label: "Ayarlar", href: "/admin/settings", permission: "settings.view" },
];

export function getAdminShellPermissionKeys(): string[] {
  const keys = new Set<string>();
  for (const item of adminMenuItems) {
    if (item.permission) keys.add(item.permission);
    item.anyPermissions?.forEach((p) => keys.add(p));
  }
  return Array.from(keys);
}

const navItemBase =
  "group flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";
const navActive = "bg-[#FF6B00] text-white shadow-sm";
const navIdle = "text-slate-400 hover:bg-white/[0.04] hover:text-white";

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout, user, hasPermission } = useAuth();
  const visibleMenuItems = adminMenuItems.filter((item) => {
    if (item.anyPermissions?.length) {
      return item.anyPermissions.some((p) => hasPermission(p));
    }
    return !item.permission || hasPermission(item.permission);
  });

  const roleLabel =
    user?.role === "super_admin"
      ? "YONETIM PANELI"
      : user?.role === "staff"
        ? "PERSONEL / YONETIM"
        : "YONETIM PANELI";

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-72 flex-col border-r border-white/[0.06] bg-[#0a0b14]">
      <PanelBrandBlock roleLabel={roleLabel} />

      <nav className="mt-1 flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {visibleMenuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(navItemBase, isActive ? navActive : navIdle)}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-500 group-hover:text-white")} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="h-4 w-4 text-white/90" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.08] p-3">
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/[0.04] p-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-bold text-white">
            {user?.name?.[0]}
            {user?.surname?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {user?.name} {user?.surname}
            </p>
            <p className="truncate text-[10px] uppercase text-slate-500">{user?.role?.replace(/_/g, " ")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Guvenli Cikis
        </button>
      </div>
    </aside>
  );
}
