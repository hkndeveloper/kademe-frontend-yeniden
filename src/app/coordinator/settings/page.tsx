"use client";

import { FormEvent, useEffect, useState } from "react";
import { Globe2, Loader2, Save, Settings2, ShieldCheck, UserCircle } from "lucide-react";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";
import type { SiteSettingsResponse } from "@/lib/site-config";
import { defaultSiteSettings } from "@/lib/site-config";

interface ManageableProject {
  id: number;
  name: string;
}

interface SettingsForm {
  phone: string;
  address: string;
  birth_date: string;
  hometown: string;
  university: string;
  department: string;
  motivation_message: string;
  linkedin_url: string;
  github_url: string;
  instagram_url: string;
}

const initialForm: SettingsForm = {
  phone: "",
  address: "",
  birth_date: "",
  hometown: "",
  university: "",
  department: "",
  motivation_message: "",
  linkedin_url: "",
  github_url: "",
  instagram_url: "",
};

export default function CoordinatorSettingsPage() {
  const { fetchProfile } = useAuth();
  const [projects, setProjects] = useState<ManageableProject[]>([]);
  const [siteSettings, setSiteSettings] = useState(defaultSiteSettings);
  const [form, setForm] = useState<SettingsForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [profileResponse, projectResponse, siteConfigResponse] = await Promise.all([
          api.get("/user/profile"),
          api.get<{ projects: ManageableProject[] }>("/admin/projects/manageable"),
          api.get<SiteSettingsResponse>("/site-config"),
        ]);

        const nextUser = profileResponse.data.user;
        setProjects(projectResponse.data.projects ?? []);
        setSiteSettings(siteConfigResponse.data.settings ?? defaultSiteSettings);
        setForm({
          phone: nextUser.phone ?? "",
          address: nextUser.address ?? "",
          birth_date: nextUser.birth_date ?? "",
          hometown: nextUser.hometown ?? "",
          university: nextUser.university ?? "",
          department: nextUser.department ?? "",
          motivation_message: nextUser.profile?.motivation_message ?? "",
          linkedin_url: nextUser.profile?.linkedin_url ?? "",
          github_url: nextUser.profile?.github_url ?? "",
          instagram_url: nextUser.profile?.instagram_url ?? "",
        });
      } catch (error) {
        console.error("Koordinator ayarlari yuklenemedi", error);
        setErrorMessage("Ayarlar yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      void loadSettings();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await api.put("/user/profile", form);
      await fetchProfile();
      setMessage("Koordinator ayarlari guncellendi.");
    } catch (error) {
      console.error("Koordinator ayarlari guncellenemedi", error);
      setErrorMessage("Ayarlar guncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent">
          <Settings2 className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Koordinator Ayarlari</h1>
          <p className="text-sm text-muted-foreground">Kisisel hesap ayarlari, proje kapsami ve sistem baglami ayni ekranda yonetiliyor.</p>
        </div>
      </div>

      {message ? <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-200">{message}</div> : null}
      {errorMessage ? <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">{errorMessage}</div> : null}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-8">
          <div className="mb-6 flex items-center gap-3">
            <UserCircle className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-bold text-slate-900">Kisisel Ayarlar</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" placeholder="Telefon" />
            <input value={form.birth_date} onChange={(event) => setForm((current) => ({ ...current, birth_date: event.target.value }))} type="date" className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" />
            <input value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" placeholder="Birim" />
            <input value={form.hometown} onChange={(event) => setForm((current) => ({ ...current, hometown: event.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" placeholder="Sehir" />
            <input value={form.university} onChange={(event) => setForm((current) => ({ ...current, university: event.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" placeholder="Universite" />
            <input value={form.linkedin_url} onChange={(event) => setForm((current) => ({ ...current, linkedin_url: event.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" placeholder="LinkedIn URL" />
            <input value={form.github_url} onChange={(event) => setForm((current) => ({ ...current, github_url: event.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" placeholder="GitHub URL" />
            <input value={form.instagram_url} onChange={(event) => setForm((current) => ({ ...current, instagram_url: event.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" placeholder="Instagram URL" />
          </div>

          <textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className="mt-4 min-h-[100px] w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" placeholder="Adres" />
          <textarea value={form.motivation_message} onChange={(event) => setForm((current) => ({ ...current, motivation_message: event.target.value }))} className="mt-4 min-h-[120px] w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" placeholder="Kisa biyografi veya koordinasyon notu" />

          <button type="submit" disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-bold text-accent-foreground disabled:opacity-70">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Ayarlari Kaydet
          </button>
        </form>

        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent">
              <ShieldCheck className="h-4 w-4" />
              Canli Proje Kapsami
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              {projects.length === 0 ? (
                <div className="rounded-xl bg-white/5 px-4 py-3">Yonetilebilir proje bulunmuyor.</div>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="rounded-xl bg-white/5 px-4 py-3">
                    {project.name}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-8">
            <div className="mb-4 flex items-center gap-3">
              <Globe2 className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-bold text-slate-900">Genel Sistem Baglami</h2>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl bg-white/5 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Site Adi</div>
                <div className="mt-1 text-slate-900">{siteSettings.general.site_name}</div>
              </div>
              <div className="rounded-xl bg-white/5 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Iletisim</div>
                <div className="mt-1 text-slate-900">{siteSettings.contact.contact_email}</div>
                <div>{siteSettings.contact.contact_phone}</div>
              </div>
              <div className="rounded-xl bg-white/5 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sosyal Kanallar</div>
                <div className="mt-1">{siteSettings.social_media.linkedin_url || "LinkedIn linki tanimli degil"}</div>
                <div>{siteSettings.social_media.youtube_url || "YouTube linki tanimli degil"}</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Koordinator bu ekranda kisisel hesap ayarlarini kaydeder; genel site ayarlari ust admin tarafindan yonetilir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
