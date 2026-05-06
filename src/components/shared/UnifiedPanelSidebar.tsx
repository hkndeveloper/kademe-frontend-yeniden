"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { useAuth } from "@/store/useAuth";
import { cn } from "@/lib/utils";
import { getVisiblePanelMenuGrouped } from "@/lib/panel-menu";
import { PanelBrandBlock } from "@/components/shared/PanelBrandBlock";

const navItemBase =
  "group relative flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 focus-visible:ring-[#FF6B00]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-[0.98]";
const navActive =
  "bg-gradient-to-r from-[#FF6B00] to-[#e85d00] text-white shadow-lg shadow-[#FF6B00]/25 ring-1 ring-white/15";
const navIdle =
  "text-slate-400 hover:bg-white/[0.07] hover:text-white hover:shadow-sm hover:shadow-black/20 hover:translate-x-1";

export function UnifiedPanelSidebar() {
  const pathname = usePathname();
  const { logout, user, hasPermission, hasAnyPermission } = useAuth();

  const grouped = getVisiblePanelMenuGrouped(hasPermission, hasAnyPermission, user);

  return (
    <aside className="peer group/sidebar fixed left-0 top-0 z-40 flex h-screen w-20 flex-col border-r border-white/[0.08] bg-gradient-to-b from-slate-900 via-[#0a1020] to-[#05070c] shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)] transition-[width] duration-300 hover:w-72 focus-within:w-72">
      <PanelBrandBlock roleLabel="ORTAK PANEL" />

      <nav className="mt-1 flex-1 space-y-5 overflow-y-auto px-3 py-2 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin]">
        {grouped.map(({ section, items }) => (
          <div key={section.id} className="space-y-1">
            <p className="h-4 overflow-hidden px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
              {section.label}
            </p>
            {items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(navItemBase, isActive ? navActive : navIdle, "justify-center group-hover/sidebar:justify-between group-focus-within/sidebar:justify-between")}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-transform duration-300 ease-out",
                        isActive ? "text-white" : "text-slate-500 group-hover:scale-110 group-hover:text-white",
                      )}
                    />
                    <span className="w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 group-focus-within/sidebar:w-auto group-focus-within/sidebar:opacity-100">
                      {item.label}
                    </span>
                  </div>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-white/90 opacity-0 transition-opacity duration-200 motion-safe:animate-panel-sidebar-chevron group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.08] bg-black/15 p-3 backdrop-blur-[2px]">
        <div className="mb-3 flex items-center justify-center gap-3 rounded-xl bg-white/[0.05] p-2.5 ring-1 ring-white/[0.06] transition-shadow duration-300 hover:bg-white/[0.07] group-hover/sidebar:justify-start group-focus-within/sidebar:justify-start">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-bold text-white transition-transform duration-300 hover:scale-105">
            {user?.name?.[0]}
            {user?.surname?.[0]}
          </div>
          <div className="min-w-0 flex-1 w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 group-focus-within/sidebar:w-auto group-focus-within/sidebar:opacity-100">
            <p className="truncate text-sm font-semibold text-white">
              {user?.name} {user?.surname}
            </p>
            <p className="truncate text-[10px] uppercase text-slate-500">{user?.roles?.[0]?.name ?? user?.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="group flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-slate-300 transition-all duration-300 ease-out hover:translate-y-[-1px] hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200 hover:shadow-md hover:shadow-red-900/20 active:translate-y-0 active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
          <span className="w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/sidebar:w-auto group-hover/sidebar:opacity-100 group-focus-within/sidebar:w-auto group-focus-within/sidebar:opacity-100">
            Guvenli Cikis
          </span>
        </button>
      </div>
    </aside>
  );
}

