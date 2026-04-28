"use client";

import { useEffect, useState } from "react";
import { Settings, ShieldAlert, Sliders } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api/axios";
import { defaultSiteSettings, type SiteSettingsResponse } from "@/lib/site-config";

export default function StaffSettingsPage() {
  const [settings, setSettings] = useState<SiteSettingsResponse["settings"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const loadSettings = async () => {
        try {
          const response = await api.get<SiteSettingsResponse>("/site-config");
          if (response.data?.settings) {
            setSettings(response.data.settings);
          }
        } catch (error) {
          console.error("Staff settings gorunumu yuklenemedi", error);
        } finally {
          setLoading(false);
        }
      };

      void loadSettings();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
          <Settings className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sistem Ayarlari</h1>
          <p className="text-sm text-muted-foreground">Genel sistem parametreleri ve konfigurasyonun read-only gorunumu</p>
        </div>
      </div>

      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6 text-sm text-amber-200">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <p>
            Sistem ayarlarini degistirme yetkiniz bulunmamaktadir. Aasagidaki alanlar yalnizca ust admin tarafindan
            yonetilen canli site ayarlarinin goruntusudur.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-8">
          <div className="mb-4 flex items-center gap-2 text-indigo-400">
            <Sliders className="h-5 w-5" />
            <h2 className="text-lg font-bold text-slate-900">Genel Sistem</h2>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Ayarlar yukleniyor...</div>
          ) : (
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                Site Adi: <span className="font-bold text-slate-900">{settings?.general.site_name || "Veri alinamadi"}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                Slogan: <span className="font-bold text-slate-900">{settings?.general.site_tagline || "-"}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                Iletisim E-postasi: <span className="font-bold text-slate-900">{settings?.contact.contact_email || "-"}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                Telefon: <span className="font-bold text-slate-900">{settings?.contact.contact_phone || "-"}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                Adres: <span className="font-bold text-slate-900">{settings?.contact.contact_address || "-"}</span>
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel rounded-3xl p-8">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Sosyal ve Navigasyon</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">Ayarlar yukleniyor...</div>
          ) : (
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                Instagram: <span className="font-bold text-slate-900">{settings?.social_media.instagram_url || "-"}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                X / Twitter: <span className="font-bold text-slate-900">{settings?.social_media.twitter_url || "-"}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                YouTube: <span className="font-bold text-slate-900">{settings?.social_media.youtube_url || "-"}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                LinkedIn: <span className="font-bold text-slate-900">{settings?.social_media.linkedin_url || "-"}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                Header Link Sayisi:{" "}
                <span className="font-bold text-slate-900">{settings?.navigation.header_links.length ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-8 text-center text-muted-foreground">
        <Sliders className="mx-auto mb-4 h-12 w-12 opacity-20" />
        <h3 className="mb-2 text-lg font-bold text-slate-900">Kisisel Ayarlar Icin Profil Sayfasi</h3>
        <p className="mb-6 text-sm">
          Genel site ayarlari ust admin tarafindan yonetilir. Kendi hesap ve izin akisinizi profil ekranindan takip
          edebilirsiniz.
        </p>
        <Link href="/staff/profile" className="rounded-xl bg-white/10 px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-white/20">
          Kisisel Profilime Git
        </Link>
      </div>
    </div>
  );
}
