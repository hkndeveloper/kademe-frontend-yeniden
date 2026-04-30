"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "@/store/useAuth";
import api from "@/lib/api/axios";
import { homePathForRole } from "@/lib/role-home";
import { defaultSiteSettings, SiteSettingsPayload, SiteSettingsResponse } from "@/lib/site-config";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    const loadSiteConfig = async () => {
      try {
        const configResponse = await api.get<SiteSettingsResponse>("/site-config");
        setSiteSettings(configResponse.data.settings ?? null);

        if (isPanelPath(pathname)) {
          return;
        }

        const projectsResponse = await api
          .get<{ projects: HeaderProject[] }>("/projects")
          .catch(() => ({ data: { projects: [] as HeaderProject[] } }));
        setProjects(projectsResponse.data.projects ?? []);
      } catch (error) {
        console.error("Header verileri yuklenemedi", error);
      }
    };

    void loadSiteConfig();
  }, [pathname]);

  const getDashboardLink = () => homePathForRole(user?.role);
  const navLinks = (siteSettings?.navigation.header_links ?? []).filter((item) => item.href !== "/projects");
  const aboutIndex = navLinks.findIndex((item) => item.href === "/about");

  if (panel) {
    return null;
  }

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full border-b",
        "border-slate-200/90 bg-white/90 shadow-md shadow-slate-900/5 backdrop-blur-xl supports-[backdrop-filter]:bg-white/85",
      )}
    >
      <div className="container mx-auto flex h-20 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/branding/kademe-logo-turuncu.svg"
            alt="KADEME"
            className="h-9 w-auto"
            width={120}
            height={36}
          />
          <span className="text-xl font-bold tracking-tight text-slate-800">{siteSettings?.general.site_name || "KADEME"}</span>
        </Link>

        <nav className="hidden gap-8 text-sm font-medium text-slate-600 md:flex md:items-center">
          {navLinks.map((item, index) => (
            <div key={`${item.label}-${item.href}`} className="contents">
              <Link href={item.href} className="relative transition-colors duration-300 hover:text-primary after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full">
                {item.label}
              </Link>
              {index === aboutIndex ? (
                <div className="relative group" onMouseEnter={() => setProjectsOpen(true)} onMouseLeave={() => setProjectsOpen(false)}>
                  <button className="flex items-center gap-1 transition-colors hover:text-primary">
                    Projelerimiz
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {projectsOpen && (
                    <div className="absolute left-0 top-full pt-4">
                      <div className="w-56 overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-slate-800 shadow-xl">
                        {projects.length > 0 ? (
                          projects.map((p) => (
                            <Link
                              key={p.id}
                              href={`/projects/${p.slug}`}
                              onClick={() => setProjectsOpen(false)}
                              className="block px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary"
                            >
                              {p.name}
                            </Link>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-slate-500">Proje bulunamadi.</div>
                        )}
                        <Link
                          href="/projects"
                          onClick={() => setProjectsOpen(false)}
                          className="block border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary hover:bg-slate-100"
                        >
                          Tum Projeler
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ))}

          {aboutIndex === -1 ? (
            <div className="relative group" onMouseEnter={() => setProjectsOpen(true)} onMouseLeave={() => setProjectsOpen(false)}>
            <button className="flex items-center gap-1 transition-colors hover:text-primary">
              Projelerimiz
              <ChevronDown className="h-4 w-4" />
            </button>

            {projectsOpen && (
              <div className="absolute left-0 top-full pt-4">
                <div className="w-56 overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-slate-800 shadow-xl">
                  {projects.length > 0 ? (
                    projects.map((p) => (
                      <Link
                        key={p.id}
                        href={`/projects/${p.slug}`}
                        onClick={() => setProjectsOpen(false)}
                        className="block px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary"
                      >
                        {p.name}
                      </Link>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-500">Proje bulunamadi.</div>
                  )}
                  <Link
                    href="/projects"
                    onClick={() => setProjectsOpen(false)}
                    className="block border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary hover:bg-slate-100"
                  >
                    Tum Projeler
                  </Link>
                </div>
              </div>
            )}
          </div>
          ) : null}
        </nav>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                href={getDashboardLink()}
                className="flex items-center gap-2 rounded-full bg-primary/10 px-6 py-2 text-sm font-bold text-primary transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/25"
              >
                <LayoutDashboard className="h-4 w-4" />
                Panelim
              </Link>
              <button
                onClick={() => {
                  logout();
                  window.location.href = "/";
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600 hover:shadow-md"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-full border border-slate-300 px-6 py-2 text-sm font-medium text-slate-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md"
              >
                {siteSettings?.navigation.header_login_label || defaultSiteSettings.navigation.header_login_label}
              </Link>
              <Link
                href="/auth/register"
                className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30"
              >
                {siteSettings?.navigation.header_register_label || defaultSiteSettings.navigation.header_register_label}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
