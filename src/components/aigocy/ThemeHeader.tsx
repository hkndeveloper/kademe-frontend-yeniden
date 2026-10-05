"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { HeaderBrand } from "@/components/shared/HeaderBrand";
import { useAuth } from "@/store/useAuth";
import { homePathForUser } from "@/lib/role-home";
import {
  getCachedSiteConfig,
  getCachedPublicProjects,
} from "@/lib/public-api-cache";
import { defaultSiteSettings } from "@/lib/site-config";
import { safeHref } from "@/lib/aigocy";
import type { ThemeProject } from "./usePublicContent";

export function ThemeHeader() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const [settings, setSettings] = useState(defaultSiteSettings);
  const [projects, setProjects] = useState<ThemeProject[]>([]);
  const [mobile, setMobile] = useState(false);
  const [dropdown, setDropdown] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([getCachedSiteConfig(), getCachedPublicProjects()])
      .then(([config, list]) => {
        if (active) {
          setSettings(config.settings || defaultSiteSettings);
          setProjects(list as ThemeProject[]);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (mobile) dialog.current?.showModal();
    else dialog.current?.close();
  }, [mobile]);
  const links = settings.navigation.header_links.filter(
    (l) => l.href !== "/projects",
  );
  const active = (href: string) =>
    pathname === href ||
    (href !== "/" && pathname?.startsWith(href + "/")) ||
    (href === "/blog" && pathname?.startsWith("/blog-"));
  return (
    <header className="tf-header header2 theme-header">
      <div className="header-inner">
        <Link
          href="/"
          className="logo-site"
          aria-label="KADEME ana sayfa"
          onClick={() => {
            setMobile(false);
            setDropdown(false);
          }}
        >
          <HeaderBrand />
        </Link>
        <nav className="box-navigation" aria-label="Ana menü">
          <ul className="nav-menu-main">
            {links.map((link) => (
              <li className="menu-item" key={link.href}>
                <Link
                  className={`item-link link1 ${active(link.href) ? "active" : ""}`}
                  href={safeHref(link.href)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li
              className={`menu-item has-child theme-projects ${dropdown ? "is-open" : ""}`}
              onMouseEnter={() => setDropdown(true)}
              onMouseLeave={() => setDropdown(false)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setDropdown(false);
                  event.currentTarget.querySelector("button")?.focus();
                }
              }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget))
                  setDropdown(false);
              }}
            >
              <button
                className={`item-link link1 ${active("/projects") ? "active" : ""}`}
                aria-expanded={dropdown}
                aria-controls="theme-project-menu"
                onClick={() => setDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setDropdown(false);
                }}
              >
                Projelerimiz
                <ChevronDown size={14} />
              </button>
              <ul
                className="sub-menu"
                id="theme-project-menu"
                inert={!dropdown}
              >
                <li className="sub-menu-item">
                  <Link
                    className="item-link"
                    href="/projects"
                    onClick={() => setDropdown(false)}
                  >
                    Tüm projeler
                  </Link>
                </li>
                {projects.map((project) => (
                  <li className="sub-menu-item" key={project.id}>
                    <Link
                      className="item-link"
                      href={`/projects/${project.slug}`}
                      onClick={() => setDropdown(false)}
                    >
                      {project.name}
                      <i
                        className="icon icon-arrow-top-right"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </nav>
        <div className="theme-header-actions">
          <Link
            className="theme-login"
            href={isAuthenticated ? homePathForUser(user) : "/auth/login"}
          >
            {isAuthenticated
              ? "Panelim"
              : settings.navigation.header_login_label}
          </Link>
          <Link href="/auth/register" className="tf-btn theme-register">
            {settings.navigation.header_register_label}
          </Link>
          <button
            type="button"
            className="tf-btn theme-mobile-trigger"
            aria-label="Menüyü aç"
            aria-controls="theme-mobile-menu"
            aria-expanded={mobile}
            onClick={() => setMobile(true)}
          >
            <Menu size={22} />
          </button>
        </div>
        <dialog
          ref={dialog}
          id="theme-mobile-menu"
          className="theme-mobile-menu"
          onCancel={() => setMobile(false)}
          onClose={() => setMobile(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobile(false);
          }}
        >
          <div className="theme-mobile-inner">
            <div className="theme-mobile-top">
              <span>KADEME</span>
              <button
                type="button"
                aria-label="Menüyü kapat"
                onClick={() => setMobile(false)}
              >
                <X size={24} />
              </button>
            </div>
            <nav aria-label="Mobil menü">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={safeHref(link.href)}
                  className={active(link.href) ? "active" : ""}
                  onClick={() => setMobile(false)}
                >
                  {link.label}
                </Link>
              ))}
              <details>
                <summary>Projelerimiz</summary>
                <Link href="/projects" onClick={() => setMobile(false)}>
                  Tüm projeler
                </Link>
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.slug}`}
                    onClick={() => setMobile(false)}
                  >
                    {p.name}
                  </Link>
                ))}
              </details>
              <Link
                href={isAuthenticated ? homePathForUser(user) : "/auth/login"}
                onClick={() => setMobile(false)}
              >
                {isAuthenticated ? "Panelim" : "Giriş yap"}
              </Link>
              <Link
                href="/auth/register"
                className="tf-btn"
                onClick={() => setMobile(false)}
              >
                Başvur
              </Link>
            </nav>
          </div>
        </dialog>
      </div>
    </header>
  );
}
