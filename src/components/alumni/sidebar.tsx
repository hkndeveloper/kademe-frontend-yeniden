"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Award,
  Bell,
  BookOpen,
  BrainCircuit,
  Briefcase,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileCheck,
  FileSpreadsheet,
  HeartHandshake,
  Handshake,
  Home,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Megaphone,
  MessagesSquare,
  QrCode,
  Star,
  UserCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/useAuth";
import { PanelBrandBlock } from "@/components/shared/PanelBrandBlock";

const menuItems = [
  { icon: LayoutDashboard, label: "Panel Ozet", href: "/alumni/dashboard" },
  { icon: Briefcase, label: "Mezun Projem", href: "/alumni/my-project" },
  { icon: CalendarDays, label: "Program Gecmisim", href: "/alumni/programs" },
  { icon: QrCode, label: "QR Yoklama", href: "/alumni/qr-scan" },
  { icon: ClipboardList, label: "Basvurularim", href: "/alumni/applications" },
  { icon: Megaphone, label: "Mesaj Kutusu", href: "/alumni/inbox" },
  { icon: Bell, label: "Duyurular", href: "/alumni/announcements" },
  { icon: Handshake, label: "Kariyer Firsatlari", href: "/alumni/opportunities" },
  { icon: MessagesSquare, label: "Forum", href: "/alumni/forum" },
  { icon: FileSpreadsheet, label: "Ozgecmis Havuzu", href: "/alumni/resume" },
  { icon: BookOpen, label: "Dijital Bohca", href: "/alumni/bohca" },
  { icon: FileCheck, label: "Odevlerim", href: "/alumni/assignments" },
  { icon: Star, label: "Degerlendirme", href: "/alumni/evaluate" },
  { icon: Award, label: "Sertifikalarim", href: "/alumni/certificates" },
  { icon: HeartHandshake, label: "Gonullu Basvurusu", href: "/alumni/volunteer" },
  { icon: LifeBuoy, label: "Destek Talebi", href: "/alumni/support" },
  { icon: BrainCircuit, label: "Kisilik Analizi", href: "/alumni/personality" },
  { icon: UserCircle, label: "Profilim", href: "/alumni/profile" },
];

const navItemBase = "group flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";
const navActive = "bg-[#FF6B00] text-white shadow-sm";
const navIdle = "text-slate-400 hover:bg-white/[0.04] hover:text-white";

export function AlumniSidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <aside className="peer group/sidebar fixed left-0 top-0 z-40 hidden h-screen w-20 flex-col border-r border-white/[0.06] bg-[#0a0b14] transition-[width] duration-300 hover:w-72 focus-within:w-72 lg:flex">
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

export function AlumniMobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout, user } = useAuth();
  const activeItem = menuItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const primaryItems = menuItems.slice(0, 4);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/alumni/dashboard" className="flex min-w-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/kademe-logo-turuncu.svg" alt="KADEME" className="h-8 w-auto" width={96} height={30} />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900">Mezun Paneli</p>
              <p className="truncate text-xs text-slate-500">{activeItem?.label ?? user?.name ?? "Panel"}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
            aria-label="Mezun menusu"
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
              <Link key={item.href} href={item.href} className={cn("flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold transition", isActive ? "bg-[#FF6B00] text-white" : "text-slate-500 hover:bg-slate-100")}>
                <item.icon className="h-4 w-4" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold text-slate-500 transition hover:bg-slate-100"
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
                <p className="truncate text-sm font-black text-slate-900">Mezun menusu</p>
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
              <div className="grid gap-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
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
                Cikis yap
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
