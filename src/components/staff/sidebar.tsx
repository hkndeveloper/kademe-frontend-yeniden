"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Briefcase,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Database,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Settings,
  UserCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/useAuth";
import { PanelBrandBlock } from "@/components/shared/PanelBrandBlock";

type StaffMenuItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  permission?: string;
  anyPermissions?: string[];
};

const menuItems: StaffMenuItem[] = [
  {
    icon: LayoutDashboard,
    label: "Panel Ozet",
    href: "/staff/dashboard",
    anyPermissions: ["dashboard.staff.view", "dashboard.admin.view", "dashboard.coordinator.view"],
  },
  { icon: Briefcase, label: "Projem", href: "/staff/my-project", permission: "projects.view" },
  { icon: CalendarDays, label: "Takvim", href: "/staff/calendar", permission: "calendar.view" },
  { icon: ClipboardList, label: "Basvurular", href: "/staff/applications", permission: "applications.view" },
  { icon: FileText, label: "Talepler", href: "/staff/requests", permission: "requests.view" },
  { icon: Users, label: "Personel Listesi", href: "/staff/members", permission: "staff.view" },
  { icon: Bell, label: "Duyurular", href: "/staff/announcements", permission: "announcements.view" },
  { icon: LifeBuoy, label: "Destek Merkezi", href: "/staff/support", permission: "support.view" },
  { icon: Database, label: "Icerik", href: "/staff/content", permission: "content.view" },
  { icon: Settings, label: "Ayarlar", href: "/staff/settings", permission: "settings.view" },
  { icon: UserCircle, label: "Profilim", href: "/staff/profile" },
];

const navItemBase = "group flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";
const navActive = "bg-[#FF6B00] text-white shadow-sm";
const navIdle = "text-slate-400 hover:bg-white/[0.04] hover:text-white";

export function StaffSidebar() {
  const pathname = usePathname();
  const { logout, user, hasPermission } = useAuth();
  const visibleMenuItems = menuItems.filter((item) => {
    if (item.anyPermissions?.length) {
      return item.anyPermissions.some((p) => hasPermission(p));
    }
    if (!item.permission) {
      return true;
    }
    return hasPermission(item.permission);
  });

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-72 flex-col border-r border-white/[0.06] bg-[#0a0b14]">
      <PanelBrandBlock roleLabel="PERSONEL PANELI" />

      <nav className="mt-1 flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {visibleMenuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(navItemBase, isActive ? navActive : navIdle)}
            >
              <div className="flex min-w-0 items-center gap-3">
                <item.icon
                  className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-500 group-hover:text-white")}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {isActive && <ChevronRight className="h-4 w-4 shrink-0 text-white/90" />}
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
            <p className="truncate text-[10px] uppercase text-slate-500">
              {user?.role || "PERSONEL"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Cikis Yap
        </button>
      </div>
    </aside>
  );
}
