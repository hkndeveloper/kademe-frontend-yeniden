"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  ChevronRight,
  FileCheck,
  FileSpreadsheet,
  HeartHandshake,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Megaphone,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/useAuth";
import { PanelBrandBlock } from "@/components/shared/PanelBrandBlock";

const menuItems = [
  { icon: LayoutDashboard, label: "Panel Ozet", href: "/alumni/dashboard" },
  { icon: Megaphone, label: "Duyurular", href: "/alumni/announcements" },
  { icon: FileSpreadsheet, label: "Ozgecmis Havuzu", href: "/alumni/resume" },
  { icon: BookOpen, label: "Dijital Bohca", href: "/alumni/bohca" },
  { icon: FileCheck, label: "Odevlerim", href: "/alumni/assignments" },
  { icon: Award, label: "Sertifikalarim", href: "/alumni/certificates" },
  { icon: HeartHandshake, label: "Gonullu Basvurusu", href: "/alumni/volunteer" },
  { icon: LifeBuoy, label: "Destek Talebi", href: "/alumni/support" },
  { icon: UserCircle, label: "Profilim", href: "/alumni/profile" },
];

const navItemBase = "group flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";
const navActive = "bg-[#FF6B00] text-white shadow-sm";
const navIdle = "text-slate-400 hover:bg-white/[0.04] hover:text-white";

export function AlumniSidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <aside className="peer group/sidebar fixed left-0 top-0 z-40 flex h-screen w-20 flex-col border-r border-white/[0.06] bg-[#0a0b14] transition-[width] duration-300 hover:w-72 focus-within:w-72">
      <PanelBrandBlock roleLabel="MEZUN PANELI" />

      <nav className="mt-1 flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(navItemBase, isActive ? navActive : navIdle, "justify-center group-hover/sidebar:justify-between group-focus-within/sidebar:justify-between")}
            >
              <div className="flex min-w-0 items-center gap-3">
                <item.icon
                  className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-500 group-hover:text-white")}
                />
                <span className="w-0 overflow-hidden truncate whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 group-focus-within/sidebar:w-auto group-focus-within/sidebar:opacity-100">
                  {item.label}
                </span>
              </div>
              {isActive && (
                <ChevronRight className="h-4 w-4 shrink-0 text-white/90 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.08] p-3">
        <div className="mb-3 flex items-center justify-center gap-3 rounded-lg bg-white/[0.04] p-2.5 group-hover/sidebar:justify-start group-focus-within/sidebar:justify-start">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-bold text-white">
            {user?.name?.[0]}
            {user?.surname?.[0]}
          </div>
          <div className="min-w-0 flex-1 w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 group-focus-within/sidebar:w-auto group-focus-within/sidebar:opacity-100">
            <p className="truncate text-sm font-semibold text-white">
              {user?.name} {user?.surname}
            </p>
            <p className="truncate text-[10px] uppercase text-slate-500">
              {user?.role || "ALUMNI"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          <span className="w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 group-focus-within/sidebar:w-auto group-focus-within/sidebar:opacity-100">
            Cikis Yap
          </span>
        </button>
      </div>
    </aside>
  );
}
