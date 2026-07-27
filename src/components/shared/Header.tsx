"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { PublicButton } from "@/components/public";
import { getCachedPublicProjects, getCachedSiteConfig } from "@/lib/public-api-cache";
import { homePathForUser } from "@/lib/role-home";
import { defaultSiteSettings, SiteSettingsPayload, SiteSettingsResponse } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/useAuth";

interface HeaderProject {
  id: number;
  name: string;
  slug: string;
}

/** Panel workspace routes: unified `/panel/*` and legacy role-prefixed paths. */
export function isPanelPath(path: string) {
  return /^\/panel(\/|$)/.test(path) || /^\/(admin|coordinator|staff|student|alumni)(\/|$)/.test(path);
}

export function Header() {
  const pathname = usePathname() || "";
  const panel = isPanelPath(pathname);
  const { isAuthenticated, user, logout } = useAuth();
  const [siteSettings, setSiteSettings] = useState<SiteSettingsPayload | null>(null);
  const [projects, setProjects] = useState<HeaderProject[]>([]);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY.current;

      setScrolled(currentScrollY > 24);
      setHeaderHidden(currentScrollY > 120 && scrollingDown);
      lastScrollY.current = currentScrollY;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const loadSiteConfig = async () => {
      try {
        const configResponse: SiteSettingsResponse = await getCachedSiteConfig();
        setSiteSettings(configResponse.settings ?? null);

        if (isPanelPath(pathname)) return;

        const projectsResponse = await getCachedPublicProjects().catch(() => [] as HeaderProject[]);
        setProjects(projectsResponse);
      } catch (error) {
        console.error("Header verileri yüklenemedi", error);
      }
    };

    void loadSiteConfig();
  }, [pathname]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMobileMenuOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const getDashboardLink = () => homePathForUser(user);
  const navLinks = (siteSettings?.navigation.header_links ?? defaultSiteSettings.navigation.header_links).filter((item) => item.href !== "/projects");
  const aboutIndex = navLinks.findIndex((item) => item.href === "/about");
  const loginLabel = siteSettings?.navigation.header_login_label || defaultSiteSettings.navigation.header_login_label;
  const registerLabel = siteSettings?.navigation.header_register_label || defaultSiteSettings.navigation.header_register_label;
  const siteName = siteSettings?.general.site_name || "KADEME";
  const dropdownProjects = projects.slice(0, 6);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  const closeProjects = () => setProjectsOpen(false);
  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  if (panel) return null;

  const shouldHideHeader = headerHidden && !mobileMenuOpen && !projectsOpen;

  const navItemClass = (active: boolean) => cn(
    "kdm-public-nav-link relative flex rounded-full px-3.5 py-2 text-[15px] font-semibold leading-6 text-[#09090b] transition hover:text-[#fd3a25]",
    active && "active text-[#fd3a25] after:scale-x-100",
  );

  const projectButtonClass = cn(
    "kdm-public-nav-link relative flex items-center gap-1 rounded-full px-3.5 py-2 text-[15px] font-semibold leading-6 text-[#09090b] transition hover:text-[#fd3a25]",
    pathname.startsWith("/projects") && "active text-[#fd3a25]",
  );

  const projectsMenu = (
    <div className={cn("kdm-public-sub-menu absolute left-1/2 top-full z-50 w-[17rem] -translate-x-1/2 pt-4", projectsOpen ? "pointer-events-auto visible translate-y-0 opacity-100" : "pointer-events-none invisible translate-y-3 opacity-0")}>
      <div className="overflow-hidden rounded-lg border border-black/5 bg-[#f4f4f5] p-2 text-[#09090b] shadow-[0_18px_44px_rgba(9,9,11,0.12)] backdrop-blur-2xl">
        <div className="grid gap-1">
          {dropdownProjects.length > 0 ? (
            dropdownProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                onClick={closeProjects}
                className="group flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-zinc-700 transition duration-200 hover:bg-white hover:text-[#fd3a25]"
              >
                <span className="truncate">{project.name}</span>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 transition group-hover:bg-[#fd3a25]" />
              </Link>
            ))
          ) : (
            <div className="px-4 py-5 text-sm text-zinc-500">Proje bulunamadı.</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 px-4 pt-5 font-[var(--font-urbanist)] transition-all duration-500 ease-out sm:pt-7 lg:pt-9", shouldHideHeader ? "pointer-events-none -translate-y-[calc(100%+2rem)] opacity-0" : "translate-y-0 opacity-100")}>
      <div
        className={cn(
          "mx-auto flex h-[86px] max-w-[1296px] items-center justify-between gap-4 rounded-full border px-5 transition-all duration-300 backdrop-blur-2xl min-[1180px]:px-8",
          scrolled
            ? "border-white/80 bg-white/92 shadow-[0_10px_32px_rgba(9,9,11,0.14),inset_0_1px_0_rgba(255,255,255,0.95)]"
            : "border-white/70 bg-white/55 shadow-[0_18px_52px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.95)]",
        )}
      >
        <Link href="/" className="group flex shrink-0 items-center gap-3 transition-transform duration-300 hover:-translate-y-px">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(9,9,11,0.12),inset_0_-2px_0_rgba(9,9,11,0.06)] transition group-hover:-translate-y-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/kademe-logo-turuncu.svg" alt="KADEME" className="h-9 w-auto" width={120} height={36} />
          </span>
          <span className="hidden sm:block">
            <span className="block text-2xl font-black tracking-tight text-[#3b3f43]">{siteName}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 min-[1180px]:flex">
          {navLinks.map((item, index) => (
            <div key={`${item.label}-${item.href}`} className="contents">
              <Link href={item.href} className={navItemClass(isActive(item.href))}>
                {item.label}
              </Link>
              {index === aboutIndex ? (
                <div className="relative" onMouseEnter={() => setProjectsOpen(true)} onMouseLeave={() => setProjectsOpen(false)}>
                  <Link href="/projects" onClick={closeProjects} className={projectButtonClass} aria-expanded={projectsOpen}>
                    Projelerimiz
                    <ChevronDown className={cn("h-4 w-4 transition", projectsOpen && "rotate-180")} />
                  </Link>
                  {projectsMenu}
                </div>
              ) : null}
            </div>
          ))}

          {aboutIndex === -1 ? (
            <div className="relative" onMouseEnter={() => setProjectsOpen(true)} onMouseLeave={() => setProjectsOpen(false)}>
              <Link href="/projects" onClick={closeProjects} className={projectButtonClass} aria-expanded={projectsOpen}>
                Projelerimiz
                <ChevronDown className={cn("h-4 w-4 transition", projectsOpen && "rotate-180")} />
              </Link>
              {projectsMenu}
            </div>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white text-[#09090b] shadow-sm transition hover:bg-[#f4f4f5] min-[1180px]:hidden"
            aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden items-center gap-2 min-[1180px]:flex">
            {isAuthenticated ? (
              <>
                <PublicButton href={getDashboardLink()} variant="secondary" size="sm" icon={<LayoutDashboard className="h-4 w-4" />} iconPosition="left">
                  Panelim
                </PublicButton>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white text-zinc-600 shadow-sm transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Çıkış yap"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <PublicButton href="/auth/login" variant="secondary" size="sm">
                  {loginLabel}
                </PublicButton>
                <PublicButton href="/auth/register" variant="dark" size="sm">
                  {registerLabel}
                </PublicButton>
              </>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="mx-auto mt-3 max-h-[calc(100dvh-7rem)] max-w-[1296px] overflow-y-auto rounded-[1.5rem] border border-white/70 bg-white/94 p-3 pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur-2xl min-[1180px]:hidden">
          <nav className="flex flex-col gap-2">
            {navLinks.map((item) => (
              <Link
                key={`mobile-${item.label}-${item.href}`}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm font-bold text-zinc-700 transition hover:bg-[#f4f4f5] hover:text-[#fd3a25]",
                  isActive(item.href) && "bg-[#f4f4f5] text-[#fd3a25]",
                )}
              >
                {item.label}
              </Link>
            ))}

            <div className="rounded-3xl border border-black/10 bg-[#f4f4f5]/80 p-2">
              <Link
                href="/projects"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-black text-[#09090b] transition hover:bg-white",
                  pathname.startsWith("/projects") && "bg-white text-[#fd3a25] shadow-sm",
                )}
              >
                Projelerimiz
                <ChevronDown className="h-4 w-4 -rotate-90 text-[#fd3a25]" />
              </Link>
              {dropdownProjects.length > 0 ? (
                <div className="mt-1 grid gap-1">
                  {dropdownProjects.map((project) => (
                    <Link
                      key={`mobile-project-${project.id}`}
                      href={`/projects/${project.slug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-white hover:text-[#fd3a25]"
                    >
                      {project.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-2 grid gap-2 border-t border-black/10 pt-4">
              {isAuthenticated ? (
                <>
                  <PublicButton href={getDashboardLink()} variant="dark" icon={<LayoutDashboard className="h-4 w-4" />} iconPosition="left" onClick={() => setMobileMenuOpen(false)}>
                    Panelim
                  </PublicButton>
                  <button type="button" onClick={handleLogout} className="flex h-12 items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-700 transition hover:bg-red-100">
                    <LogOut className="h-4 w-4" />
                    Çıkış Yap
                  </button>
                </>
              ) : (
                <>
                  <PublicButton href="/auth/login" variant="secondary" onClick={() => setMobileMenuOpen(false)}>
                    {loginLabel}
                  </PublicButton>
                  <PublicButton href="/auth/register" variant="dark" onClick={() => setMobileMenuOpen(false)}>
                    {registerLabel}
                  </PublicButton>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
