"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Camera, PlayCircle, Send } from "lucide-react";
import api from "@/lib/api/axios";
import { defaultSiteSettings, SiteSettingsPayload, SiteSettingsResponse } from "@/lib/site-config";

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
          api.get<SiteSettingsResponse>("/site-config"),
          api.get<{ projects: FooterProject[] }>("/projects").catch(() => ({ data: { projects: [] as FooterProject[] } })),
        ]);
        setSettings(configRes.data.settings ?? null);
        setProjects(projectsRes.data.projects ?? []);
      } catch {
        // fail silently — defaults render
      }
    };
    void load();
  }, []);

  const resolved = settings ?? defaultSiteSettings;

  const footerProjectLinks =
    resolved.navigation.footer_project_links.length > 0
      ? resolved.navigation.footer_project_links
      : projects.slice(0, 6).map((p) => ({ label: p.name, href: `/projects/${p.slug}` }));

  return (
    <footer className="border-t border-slate-200/90 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(241,245,249,0.95))] py-20 text-slate-800">
      <div className="container mx-auto mb-20 grid grid-cols-1 gap-12 px-6 md:grid-cols-4">
        {/* Branding + sosyal medya */}
        <div>
          <div className="mb-6 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/branding/kademe-logo-turuncu.svg"
              alt="KADEME"
              className="h-10 w-auto"
              width={140}
              height={40}
            />
            <span className="text-2xl font-bold tracking-tight text-slate-900">{resolved.general.site_name}</span>
          </div>
          <p className="mb-8 text-sm leading-relaxed text-slate-600">{resolved.homepage.footer_description}</p>
          <div className="flex gap-4">
            {resolved.social_media.instagram_url ? (
              <Link
                href={resolved.social_media.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary hover:shadow-md"
              >
                <Camera className="h-5 w-5" />
              </Link>
            ) : null}
            {resolved.social_media.twitter_url ? (
              <Link
                href={resolved.social_media.twitter_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary hover:shadow-md"
              >
                <Send className="h-5 w-5" />
              </Link>
            ) : null}
            {resolved.social_media.youtube_url ? (
              <Link
                href={resolved.social_media.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary hover:shadow-md"
              >
                <PlayCircle className="h-5 w-5" />
              </Link>
            ) : null}
            {resolved.social_media.linkedin_url ? (
              <Link
                href={resolved.social_media.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary hover:shadow-md"
              >
                <Briefcase className="h-5 w-5" />
              </Link>
            ) : null}
          </div>
        </div>

        {/* Kurumsal linkler */}
        <div>
          <h5 className="mb-6 text-xs font-bold uppercase tracking-widest text-primary">KURUMSAL</h5>
          <ul className="space-y-4 text-sm text-slate-600">
            {resolved.navigation.footer_quick_links.map((link) => (
              <li key={`${link.label}-${link.href}`}>
                <Link href={link.href} className="transition-colors hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Projeler */}
        <div>
          <h5 className="mb-6 text-xs font-bold uppercase tracking-widest text-primary">PROJELER</h5>
          <ul className="space-y-4 text-sm text-slate-600">
            {footerProjectLinks.length > 0 ? (
              footerProjectLinks.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link href={link.href} className="transition-colors hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))
            ) : (
              <li>Proje listesi yakinda guncellenecek.</li>
            )}
          </ul>
        </div>

        {/* İletişim */}
        <div>
          <h5 className="mb-6 text-xs font-bold uppercase tracking-widest text-primary">ILETISIM</h5>
          <p className="mb-4 text-sm text-slate-600">{resolved.contact.contact_address}</p>
          <p className="mb-2 text-sm font-bold text-slate-900">{resolved.contact.contact_email}</p>
          <p className="text-sm font-bold text-slate-900">{resolved.contact.contact_phone}</p>
        </div>
      </div>

      <div className="container mx-auto border-t border-slate-200/80 px-6 pt-10 text-center text-xs font-medium uppercase tracking-widest text-slate-500">
        {resolved.homepage.footer_copyright}
      </div>
    </footer>
  );
}
