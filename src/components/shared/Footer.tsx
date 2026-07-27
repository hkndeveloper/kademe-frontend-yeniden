"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUp, Briefcase, Camera, Mail, MapPin, Phone, PlayCircle, Send } from "lucide-react";
import { getCachedPublicProjects, getCachedSiteConfig } from "@/lib/public-api-cache";
import { defaultSiteSettings, SiteSettingsPayload } from "@/lib/site-config";

interface FooterProject {
  id: number;
  name: string;
  slug: string;
}

export function Footer() {
  const [settings, setSettings] = useState<SiteSettingsPayload | null>(null);
  const [projects, setProjects] = useState<FooterProject[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [configRes, projectsRes] = await Promise.all([
          getCachedSiteConfig(),
          getCachedPublicProjects().catch(() => [] as FooterProject[]),
        ]);
        setSettings(configRes.settings ?? null);
        setProjects(projectsRes);
      } catch {
        // Defaults render when public settings cannot be loaded.
      }
    };
    void load();
  }, []);

  const resolved = settings ?? defaultSiteSettings;

  const footerLinks = useMemo(() => {
    const baseLinks = resolved.navigation.footer_quick_links.length > 0
      ? resolved.navigation.footer_quick_links
      : [
          { label: "Hakkımızda", href: "/about" },
          { label: "Projelerimiz", href: "/projects" },
          { label: "Faaliyetler", href: "/activities" },
          { label: "İletişim", href: "/contact" },
        ];

    const projectLinks = resolved.navigation.footer_project_links.length > 0
      ? resolved.navigation.footer_project_links
      : projects.slice(0, 2).map((project) => ({ label: project.name, href: `/projects/${project.slug}` }));
    return [...baseLinks, ...projectLinks].slice(0, 6);
  }, [projects, resolved.navigation.footer_project_links, resolved.navigation.footer_quick_links]);

  const socialLinks = [
    { href: resolved.social_media.twitter_url, icon: Send, label: "Twitter / X" },
    { href: resolved.social_media.instagram_url, icon: Camera, label: "Instagram" },
    { href: resolved.social_media.youtube_url, icon: PlayCircle, label: "YouTube" },
    { href: resolved.social_media.linkedin_url, icon: Briefcase, label: "LinkedIn" },
  ].filter((item) => Boolean(item.href));

  const visibleSocialLinks = socialLinks.length > 0
    ? socialLinks
    : [
        { href: "/contact", icon: Send, label: "İletişim" },
        { href: "/projects", icon: Briefcase, label: "Projeler" },
      ];

  return (
    <footer className="relative overflow-hidden bg-[#edecec] px-4 pb-0 pt-10 font-[var(--font-urbanist)] text-[#09090b] sm:px-6">
      {/* Tipografik watermark arkaplan */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none" aria-hidden="true">
        <span className="text-[10rem] font-black uppercase tracking-widest text-[#09090b]/[0.035] sm:text-[14rem]">
          KADEME
        </span>
      </div>

      <div className="container relative z-10 mx-auto">
        <div className="grid gap-8 rounded-[2rem] border border-white/70 bg-white/76 p-5 shadow-[0_22px_70px_rgba(9,9,11,0.10),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <Link href="/" className="mb-6 inline-flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(9,9,11,0.12),inset_0_-2px_0_rgba(9,9,11,0.06)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/branding/kademe-logo-turuncu.svg" alt={resolved.general.site_name} className="h-10 w-auto" width={120} height={52} />
              </span>
              <span>
                <span className="block text-2xl font-black tracking-tight text-[#292c2e]">{resolved.general.site_name}</span>
                <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.18em] text-[#71717a]">{resolved.general.site_tagline}</span>
              </span>
            </Link>

            <p className="max-w-2xl text-sm font-semibold leading-7 text-[#71717a] sm:text-base">
              {resolved.homepage.footer_description}
            </p>
          </div>

          <div className="grid gap-5 lg:justify-items-end">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-black text-[#09090b] lg:justify-end">
              {footerLinks.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link href={link.href} className="link-underline transition hover:text-[#fd3a25]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Aigocy tarzı geniş pill sosyal butonlar */}
            <div className="grid w-full grid-cols-2 gap-3 lg:w-auto lg:grid-cols-2">
              {visibleSocialLinks.map((item) => {
                const Icon = item.icon;
                const external = Boolean(item.href?.startsWith("http"));
                return (
                  <Link
                    key={`${item.label}-${item.href}`}
                    href={item.href || "#"}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="group flex items-center justify-between gap-3 rounded-full border border-[#d4d4d8] bg-white px-5 py-3.5 text-sm font-bold text-[#09090b] shadow-[0px_7.77px_16px_rgba(0,0,0,0.06),0px_-3px_0px_rgba(0,0,0,0.04)_inset] transition hover:-translate-y-0.5 hover:border-[#fd3a25]/30 hover:shadow-[0_16px_36px_rgba(9,9,11,0.12)]"
                    aria-label={item.label}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#09090b] text-white shadow-[0_-2px_0_rgba(0,0,0,0.28)_inset] transition group-hover:bg-[#fd3a25]">
                      <Icon className="h-4 w-4" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-4 py-8 text-sm font-semibold text-[#71717a] lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-[#fd3a25]" />{resolved.contact.contact_email}</span>
            <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-[#fd3a25]" />{resolved.contact.contact_phone}</span>
          </div>

          <p className="text-center text-xs uppercase tracking-[0.12em]">{resolved.homepage.footer_copyright}</p>

          <div className="flex items-center justify-start gap-4 lg:justify-end">
            <span className="hidden max-w-xs items-center gap-2 truncate text-right lg:inline-flex"><MapPin className="h-4 w-4 shrink-0 text-[#fd3a25]" />{resolved.contact.contact_address}</span>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex items-center justify-end gap-2 text-[#09090b] transition hover:text-[#fd3a25]"
            >
              <span>Yukarı dön</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#09090b] text-white shadow-[0_-2px_0_rgba(0,0,0,0.28)_inset] transition hover:bg-[#fd3a25]">
                <ArrowUp className="h-4 w-4" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );

}
