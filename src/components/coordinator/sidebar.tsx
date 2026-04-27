"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BarChart3,
  Bell,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Database,
  Layers,
  LogOut,
  MessageSquare,
  Settings,
  Sparkles,
  UserCircle,
  UserCog,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/useAuth";
import { PanelBrandBlock } from "@/components/shared/PanelBrandBlock";

type CoordinatorMenuItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  permission?: string;
  anyPermissions?: string[];
};

const menuItems: CoordinatorMenuItem[] = [
  {
    icon: BarChart3,
    label: "Dashboard",
    href: "/coordinator/dashboard",
    anyPermissions: ["dashboard.coordinator.view", "dashboard.admin.view", "dashboard.staff.view"],
  },
  { icon: ClipboardCheck, label: "Basvurular", href: "/coordinator/applications", permission: "applications.view" },
  { icon: Calendar, label: "Programlar", href: "/coordinator/programs", permission: "programs.view" },
  { icon: Calendar, label: "Takvim", href: "/coordinator/calendar", permission: "calendar.view" },
  { icon: Layers, label: "Proje Icerigi", href: "/coordinator/projects", permission: "projects.view" },
  { icon: Users, label: "Katilimci Ozet", href: "/coordinator/participants", permission: "projects.participants.view" },
  { icon: CreditCard, label: "Mali Islemler", href: "/coordinator/financials", permission: "financial.view" },
  { icon: MessageSquare, label: "Talepler", href: "/coordinator/requests", permission: "requests.view" },
  { icon: Bell, label: "Duyurular", href: "/coordinator/announcements", permission: "announcements.view" },
  { icon: MessageSquare, label: "Destek", href: "/coordinator/support", permission: "support.view" },
  { icon: UserCog, label: "Sistem Kullanicilari", href: "/admin/users", permission: "users.view" },
  { icon: Database, label: "Icerik Yonetimi", href: "/admin/content", permission: "content.view" },
  { icon: Award, label: "Sertifikalar", href: "/admin/certificates", permission: "certificates.view" },
  { icon: Sparkles, label: "Veri Asistani", href: "/coordinator/chatbot", permission: "chatbot.view" },
  { icon: Users, label: "Personel", href: "/coordinator/staff", permission: "staff.view" },
  { icon: UserCircle, label: "Profilim", href: "/coordinator/profile" },
  { icon: Settings, label: "Ayarlar", href: "/coordinator/settings", permission: "settings.view" },
];

const navItemBase = "group flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";
const navActive = "bg-[#FF6B00] text-white shadow-sm";
const navIdle = "text-slate-400 hover:bg-white/[0.04] hover:text-white";

export function CoordinatorSidebar() {
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
      <PanelBrandBlock roleLabel="KOORDINATOR PANELI" />

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
            <p className="truncate text-[10px] uppercase text-slate-500">{user?.role?.replace(/_/g, " ")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Oturumu Kapat
        </button>
      </div>
    </aside>
  );
}
