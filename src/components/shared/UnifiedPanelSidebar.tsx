"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Home, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/store/useAuth";
import { cn } from "@/lib/utils";
import { getVisiblePanelMenuGrouped } from "@/lib/panel-menu";
import { PanelBrandBlock } from "@/components/shared/PanelBrandBlock";
import { NotificationBell } from "@/components/shared/NotificationBell";

const navItemBase =
  "group relative flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 focus-visible:ring-[#FF6B00]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-[0.98]";
const navActive =
  "bg-gradient-to-r from-[#FF6B00] to-[#e85d00] text-white shadow-lg shadow-[#FF6B00]/25 ring-1 ring-white/15";
const navIdle =
  "text-slate-400 hover:bg-white/[0.07] hover:text-white hover:shadow-sm hover:shadow-black/20 hover:translate-x-1";

export function UnifiedPanelSidebar() {
  const pathname = usePathname();
  const { logout, user, hasPermission, hasAnyPermission, panelModules, panelModulesLoaded } = useAuth();

  const grouped = getVisiblePanelMenuGrouped(
    hasPermission,
    hasAnyPermission,
    user,
    panelModulesLoaded ? panelModules : undefined
  );

  return (
    <aside className="peer group/sidebar fixed left-0 top-0 z-40 hidden h-screen w-20 flex-col border-r border-white/[0.08] bg-gradient-to-b from-slate-900 via-[#0a1020] to-[#05070c] shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)] transition-[width] duration-300 hover:w-72 focus-within:w-72 lg:flex">
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
        <div className="mb-2 flex justify-center group-hover/sidebar:justify-end group-focus-within/sidebar:justify-end">
          <NotificationBell />
        </div>
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

export function MobilePanelNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout, user, hasPermission, hasAnyPermission, panelModules, panelModulesLoaded } = useAuth();
  const grouped = getVisiblePanelMenuGrouped(
    hasPermission,
    hasAnyPermission,
    user,
    panelModulesLoaded ? panelModules : undefined
  );
  const allItems = grouped.flatMap((group) => group.items);
  const primaryItems = allItems.slice(0, 4);
  const activeItem = allItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/panel" className="flex min-w-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/kademe-logo-turuncu.svg" alt="KADEME" className="h-8 w-auto" width={96} height={30} />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900">Ortak Panel</p>
              <p className="truncate text-xs text-slate-500">{activeItem?.label ?? user?.role ?? "Panel"}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
            aria-label="Panel menusu"
            aria-expanded={menuOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {primaryItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold transition",
                  isActive ? "bg-[#FF6B00] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Menu className="h-4 w-4" />
            <span className="max-w-full truncate">Menu</span>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Menuyu kapat"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setMenuOpen(false)}
          />
          <section className="absolute inset-x-3 bottom-3 top-3 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">Tum panel menusu</p>
                <p className="truncate text-xs text-slate-500">{user?.name} {user?.surname}</p>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
                aria-label="Menuyu kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="mb-3 flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50 px-3 py-3 text-sm font-bold text-orange-700"
              >
                <Home className="h-5 w-5" />
                Ana siteye don
              </Link>
              {grouped.map(({ section, items }) => (
                <div key={section.id} className="mb-4">
                  <p className="px-2 pb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">{section.label}</p>
                  <div className="grid gap-1">
                    {items.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition",
                            isActive ? "bg-[#FF6B00] text-white shadow-sm" : "text-slate-700 hover:bg-slate-100",
                          )}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 p-3">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm font-bold text-red-700"
              >
                <LogOut className="h-4 w-4" />
                Guvenli cikis
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

