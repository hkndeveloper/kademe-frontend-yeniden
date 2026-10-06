"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { defaultSiteSettings } from "@/lib/site-config";
import { getCachedSiteConfig } from "@/lib/public-api-cache";
import { safeHref } from "@/lib/aigocy";

export function ThemeFooter() {
  const [settings, setSettings] = useState(defaultSiteSettings);
  useEffect(() => {
    let active = true;
    void getCachedSiteConfig()
      .then((data) => {
        if (active) setSettings(data.settings || defaultSiteSettings);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const icons: Record<string, string> = {
    twitter_url: "twitter-x",
    instagram_url: "instagram",
    linkedin_url: "linkedin-in",
    youtube_url: "youtube",
    facebook_url: "facebook-f",
  };
  return (
    <footer className="theme-original-footer">
      <div className="footer-image" aria-hidden="true">
        <span className="theme-footer-display">kademe</span>
      </div>
      <div className="container">
        <div className="footer-content">
          <Link href="/" className="footer-logo theme-footer-brand">
            kademe<span className="text-brand">.</span>
          </Link>
          <div className="title h6 fw-semibold">
            KADEME ile
            <br />
            bağlantıda kalın
          </div>
          <div className="text">{settings.homepage.footer_description}</div>
          <div className="tf-social-1 justify-content-center">
            {Object.entries(settings.social_media)
              .filter(([key, value]) => icons[key] && value)
              .map(([key, value]) => (
                <a
                  key={key}
                  href={safeHref(value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body-1 fw-semibold"
                >
                  {key === "twitter_url"
                    ? "Twitter / X"
                    : (
                        {
                          instagram_url: "Instagram",
                          facebook_url: "Facebook",
                          linkedin_url: "LinkedIn",
                          youtube_url: "YouTube",
                        } as Record<string, string>
                      )[key] || key.replace("_url", "")}
                  <div className="social-item">
                    <i
                      className={`icon icon-${icons[key]}`}
                      aria-hidden="true"
                    />
                  </div>
                </a>
              ))}
          </div>
        </div>
        <div className="footer-bottom">
          <ul className="footer-links d-flex gap-24 align-items-center">
            {[
              ...settings.navigation.footer_quick_links,
              ...settings.navigation.footer_project_links,
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={safeHref(link.href)}
                  className="fw-semibold link-underline link1"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-secondary coppy-rights text-center">
            {/YÖNETİM SİSTEMİ|TÜM HAKLARI SAKLIDIR/i.test(settings.homepage.footer_copyright) ? "2026 KADEME" : settings.homepage.footer_copyright}
          </p>
          <a
            href="#"
            className="action-go-top d-flex gap-8 align-items-center justify-content-end link1"
          >
            <span className="fw-semibold">Başa dön</span>
            <i
              className="icon icon-long-arrow-alt-up-solid fs-20"
              aria-hidden="true"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
