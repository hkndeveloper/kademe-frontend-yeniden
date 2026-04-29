"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { useAuth } from "@/store/useAuth";
import { cn } from "@/lib/utils";
import { getVisiblePanelMenuGrouped } from "@/lib/panel-menu";
import { PanelBrandBlock } from "@/components/shared/PanelBrandBlock";

const navItemBase = "group flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";
const navActive = "bg-[#FF6B00] text-white shadow-sm";
const navIdle = "text-slate-400 hover:bg-white/[0.04] hover:text-white";

export function UnifiedPanelSidebar() {
  const pathname = usePathname();
  const { logout, user, hasPermission, hasAnyPermission } = useAuth();

  const grouped = getVisiblePanelMenuGrouped(hasPermission, hasAnyPermission, user);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-72 flex-col border-r border-white/[0.06] bg-[#0a0b14]">
      <PanelBrandBlock roleLabel="ORTAK PANEL" />

      <nav className="mt-1 flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {grouped.map(({ section, items }) => (
          <div key={section.id} className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{section.label}</p>
            {items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.id} href={item.href} className={cn(navItemBase, isActive ? navActive : navIdle)}>
                  <div className="flex items-center gap-3">
                    <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-500 group-hover:text-white")} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-white/90" />}
                </Link>
              );
            })}
          </div>
        ))}
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
            <p className="truncate text-[10px] uppercase text-slate-500">{user?.roles?.[0]?.name ?? user?.role}</p>
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

