"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Briefcase, Camera, Loader2, Mail, MapPin, Phone, PlayCircle, Send } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";
import { defaultSiteSettings, SiteSettingsPayload, SiteSettingsResponse } from "@/lib/site-config";

interface ProjectOption {
  id: number;
  name: string;
}

export default function ContactPage() {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettingsPayload | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    category: "general",
    project_id: "",
    message: "",
  });

  useEffect(() => {
    const loadPageData = async () => {
      try {
        const [configResponse, projectsResponse] = await Promise.all([
          api.get<SiteSettingsResponse>("/site-config"),
          api.get<{ projects: ProjectOption[] }>("/projects").catch(() => ({ data: { projects: [] as ProjectOption[] } })),
        ]);

        setSiteSettings(configResponse.data.settings ?? null);
        setProjects(projectsResponse.data.projects ?? []);
      } catch (configError) {
        console.error("Iletisim sayfasi verileri yuklenemedi", configError);
      } finally {
        setSettingsLoading(false);
      }
    };

    void loadPageData();
  }, []);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    try {
      if (isAuthenticated) {
        await api.post("/tickets", {
          subject: form.subject || "Iletisim Formu",
          category: form.category,
          project_id: form.project_id ? Number(form.project_id) : null,
          message: form.message,
        });
        setSuccess("Mesajiniz destek talebi olarak alindi.");
      } else {
        await api.post("/contact", {
          name: form.name,
          email: form.email,
          subject: form.subject || "Iletisim Formu",
          category: form.category,
          project_id: form.project_id ? Number(form.project_id) : null,
          message: form.message,
        });
        setSuccess("Mesajiniz basariyla alindi.");
      }

      setForm((current) => ({
        ...current,
        subject: "",
        category: "general",
        project_id: "",
        message: "",
      }));
    } catch (submitError) {
      console.error("Iletisim formu gonderilemedi", submitError);
      setError("Mesaj gonderilirken bir hata olustu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <section className="relative overflow-hidden border-b border-border/40 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,oklch(0.74_0.18_45/0.13),transparent_42%),radial-gradient(circle_at_85%_75%,oklch(0.56_0.12_255/0.1),transparent_45%)]" />
        <div className="container relative z-10 mx-auto px-6 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-4xl font-black md:text-6xl">
            Iletisim
          </motion.h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Merak ettiginiz her sey icin bize ulasabilir veya ofisimizde bizi ziyaret edebilirsiniz.
          </p>
        </div>
      </section>

      <div className="container mx-auto mt-20 grid grid-cols-1 gap-12 px-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-1">
          <div className="glass-panel space-y-10 rounded-3xl border border-border/60 p-8 shadow-sm">
            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <h4 className="mb-2 text-lg font-bold">Adres</h4>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {settingsLoading ? "Yukleniyor..." : siteSettings?.contact.contact_address || defaultSiteSettings.contact.contact_address}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <h4 className="mb-2 text-lg font-bold">Telefon</h4>
                <p className="text-sm text-muted-foreground">
                  {settingsLoading ? "Yukleniyor..." : siteSettings?.contact.contact_phone || defaultSiteSettings.contact.contact_phone}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h4 className="mb-2 text-lg font-bold">E-posta</h4>
                <p className="text-sm text-muted-foreground">
                  {settingsLoading ? "Yukleniyor..." : siteSettings?.contact.contact_email || defaultSiteSettings.contact.contact_email}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl border border-border/60 p-8 shadow-sm">
            <h4 className="mb-6 font-bold">Sosyal Medya</h4>
            <div className="flex gap-4">
              {siteSettings?.social_media.instagram_url ? <Link href={siteSettings.social_media.instagram_url} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-md"><Camera className="h-6 w-6" /></Link> : null}
              {siteSettings?.social_media.twitter_url ? <Link href={siteSettings.social_media.twitter_url} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-md"><Send className="h-6 w-6" /></Link> : null}
              {siteSettings?.social_media.youtube_url ? <Link href={siteSettings.social_media.youtube_url} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-md"><PlayCircle className="h-6 w-6" /></Link> : null}
              {siteSettings?.social_media.linkedin_url ? <Link href={siteSettings.social_media.linkedin_url} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-md"><Briefcase className="h-6 w-6" /></Link> : null}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Sosyal medya linkleri admin ayarlarindan canli olarak okunuyor.</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-panel rounded-[40px] border border-border/60 p-8 shadow-sm md:p-12">
            <h2 className="mb-8 text-3xl font-black">Bize Mesaj Gonderin</h2>

            {success ? <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{success}</div> : null}
            {error ? <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="ml-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Ad Soyad</label>
                  <input required type="text" value={form.name} onChange={(event) => handleChange("name", event.target.value)} className="w-full rounded-2xl border border-border bg-input px-6 py-4 outline-none transition-all duration-300 focus:ring-2 focus:ring-primary focus:shadow-md" placeholder="Adiniz Soyadiniz" />
                </div>
                <div className="space-y-2">
                  <label className="ml-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">E-posta</label>
                  <input required type="email" value={form.email} onChange={(event) => handleChange("email", event.target.value)} className="w-full rounded-2xl border border-border bg-input px-6 py-4 outline-none transition-all duration-300 focus:ring-2 focus:ring-primary focus:shadow-md" placeholder="email@ornek.com" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="ml-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Baslik</label>
                <input type="text" value={form.subject} onChange={(event) => handleChange("subject", event.target.value)} className="w-full rounded-2xl border border-border bg-input px-6 py-4 outline-none transition-all duration-300 focus:ring-2 focus:ring-primary focus:shadow-md" placeholder="Mesaj basligi" />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="ml-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Konu</label>
                  <select value={form.category} onChange={(event) => handleChange("category", event.target.value)} className="w-full appearance-none rounded-2xl border border-border bg-input px-6 py-4 outline-none transition-all duration-300 focus:ring-2 focus:ring-primary focus:shadow-md">
                    <option value="general">Genel Bilgi</option>
                    <option value="applications">Basvurular Hakkinda</option>
                    <option value="technical">Hata Bildirimi</option>
                    <option value="other">Diger</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="ml-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Ilgili Proje</label>
                  <select value={form.project_id} onChange={(event) => handleChange("project_id", event.target.value)} className="w-full appearance-none rounded-2xl border border-border bg-input px-6 py-4 outline-none transition-all duration-300 focus:ring-2 focus:ring-primary focus:shadow-md">
                    <option value="">Genel Basvuru</option>
                    {projects.map((project) => (
                      <option key={project.id} value={String(project.id)}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="ml-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Mesajiniz</label>
                <textarea required rows={5} value={form.message} onChange={(event) => handleChange("message", event.target.value)} className="w-full resize-none rounded-2xl border border-border bg-input px-6 py-4 outline-none transition-all duration-300 focus:ring-2 focus:ring-primary focus:shadow-md" placeholder="Size nasil yardimci olabiliriz?" />
              </div>

              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary py-5 font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (<><Send className="h-5 w-5" />Gonder</>)}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
