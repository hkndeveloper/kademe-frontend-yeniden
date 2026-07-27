"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Briefcase, Camera, Loader2, Mail, MapPin, Phone, PlayCircle, Send, Sparkles, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { PublicBadge, PublicCard, PublicGradientTitle, PublicHeroSection } from "@/components/public";
import api from "@/lib/api/axios";
import { defaultSiteSettings, SiteSettingsPayload, SiteSettingsResponse } from "@/lib/site-config";
import { useAuth } from "@/store/useAuth";

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
  const [attachment, setAttachment] = useState<File | null>(null);

  const requiresAttachment = form.category === "official_document";

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
        console.error("İletişim sayfası verileri yüklenemedi", configError);
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

    if (requiresAttachment && !attachment) {
      setError("Resmi evrak kategorisi için dosya eki zorunludur.");
      setLoading(false);
      return;
    }

    try {
      if (isAuthenticated) {
        const formData = new FormData();
        formData.append("subject", form.subject || "İletişim Formu");
        formData.append("category", form.category);
        if (form.project_id) formData.append("project_id", form.project_id);
        formData.append("message", form.message);
        if (attachment) formData.append("attachment", attachment);
        await api.post("/tickets", formData, { headers: { "Content-Type": "multipart/form-data" } });
        setSuccess("Mesajınız destek talebi olarak alındı.");
      } else {
        const formData = new FormData();
        formData.append("name", form.name);
        formData.append("email", form.email);
        formData.append("subject", form.subject || "İletişim Formu");
        formData.append("category", form.category);
        if (form.project_id) formData.append("project_id", form.project_id);
        formData.append("message", form.message);
        if (attachment) formData.append("attachment", attachment);
        await api.post("/contact", formData, { headers: { "Content-Type": "multipart/form-data" } });
        setSuccess("Mesajınız başarıyla alındı.");
      }

      setForm((current) => ({
        ...current,
        subject: "",
        category: "general",
        project_id: "",
        message: "",
      }));
      setAttachment(null);
    } catch (submitError) {
      console.error("İletişim formu gönderilemedi", submitError);
      setError("Mesaj gönderilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const resolved = siteSettings ?? defaultSiteSettings;
  const socialLinks = [
    { href: siteSettings?.social_media.instagram_url, icon: Camera, label: "Instagram" },
    { href: siteSettings?.social_media.twitter_url, icon: Send, label: "X" },
    { href: siteSettings?.social_media.youtube_url, icon: PlayCircle, label: "YouTube" },
    { href: siteSettings?.social_media.linkedin_url, icon: Briefcase, label: "LinkedIn" },
  ].filter((item) => Boolean(item.href));

  const labelClass = "block mb-2" + " text-[12px] font-bold uppercase tracking-[0.12em] text-[#71717a]";

  return (
    <main className="kdm-public-shell relative min-h-screen overflow-hidden bg-[#edecec] pb-24">
      {/* ─── HERO ─── */}
      <PublicHeroSection
        align="center"
        badge={
          <PublicBadge>
            <Sparkles className="h-3.5 w-3.5" />
            İletişim Merkezi
          </PublicBadge>
        }
        title={
          <h1 className="kdm-public-heading-title text-balance" style={{ animation: "kdm-fade-rotate-x 0.65s cubic-bezier(0.22,1,0.36,1) both" }}>
            İletişim
          </h1>
        }
        description={
          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-[#3f4653] sm:text-lg">
            Merak ettiğiniz her şey için bize ulaşabilir veya ofisimizde bizi ziyaret edebilirsiniz.
          </p>
        }
      />

      {/* ─── İÇERİK ─── */}
      <section className="container mx-auto px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-10">

          {/* Sol: Resim + İletişim Bilgileri + Sosyal Medya */}
          <div className="space-y-5">
            {/* Büyük resim kartı */}
            <div className="kdm-public-media-frame relative overflow-hidden rounded-[2rem] border-[10px] border-[#09090b] bg-[#09090b] kdm-public-dark-gradient shadow-[0_34px_90px_rgba(9,9,11,0.28)]">
              <div className="relative aspect-[16/13] min-h-[360px] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(253,58,37,0.42),transparent_18rem),radial-gradient(circle_at_78%_12%,rgba(255,255,255,0.13),transparent_16rem),linear-gradient(135deg,#09090b_0%,#171717_54%,#2b1a18_100%)]" />
                <div className="absolute left-6 top-6 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-orange-100 backdrop-blur">
                  İletişim
                </div>
                <div className="absolute right-8 top-12 h-28 w-28 rounded-full border border-white/10" />
                <div className="absolute -right-8 bottom-10 h-40 w-40 rounded-full border border-orange-300/20" />
                <div className="absolute bottom-5 left-5 right-5 rounded-[1.5rem] border border-white/15 bg-white/12 p-5 text-white backdrop-blur">
                  <Mail className="mb-4 h-10 w-10 text-orange-200" />
                  <h2 className="text-2xl font-black">KADEME ile bağlantıda kalın</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-100">
                    Başvuru, proje, faaliyet ve destek talepleriniz tek yerden ekibe ulaşır.
                  </p>
                </div>
              </div>
            </div>

            {/* İletişim bilgileri — Aigocy tarzı geniş info kartlar */}
            <div className="grid gap-4">
              {[
                {
                  icon: MapPin,
                  label: "Adres",
                  value: settingsLoading ? "Yükleniyor..." : resolved.contact.contact_address,
                  dark: true,
                },
                {
                  icon: Phone,
                  label: "Telefon",
                  value: settingsLoading ? "Yükleniyor..." : resolved.contact.contact_phone,
                  dark: false,
                },
                {
                  icon: Mail,
                  label: "E-posta",
                  value: settingsLoading ? "Yükleniyor..." : resolved.contact.contact_email,
                  dark: true,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-5 rounded-[1.75rem] border border-[#d4d4d8] bg-white p-5 shadow-[0px_7.77px_16px_rgba(0,0,0,0.06),0px_-3px_0px_rgba(0,0,0,0.04)_inset]"
                >
                  <span
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white"
                    style={item.dark
                      ? { background: 'linear-gradient(180deg, #272727 0%, #09090B 100%)', boxShadow: '0px -3px 0px 0px #080808 inset, 0px 12px 28px rgba(9,9,11,0.22)' }
                      : { background: 'linear-gradient(180deg, #FF3B26 0%, #EA2B16 100%)', boxShadow: '0px -3px 0px 0px #B81E0D inset, 0px 12px 28px rgba(253,58,37,0.30)' }
                    }
                  >
                    <item.icon className="h-6 w-6" />
                  </span>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#71717a]">
                      {item.label}
                    </div>
                    <div className="mt-1 text-base font-bold text-[#09090b]">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sosyal medya */}
            <PublicCard className="p-6">
              <h2 className="font-black text-slate-950">Sosyal Medya</h2>
              <div className="mt-5 flex flex-wrap gap-3">
                {socialLinks.length > 0
                  ? socialLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          href={item.href || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={item.label}
                          className="kdm-public-social-btn"
                        >
                          <Icon className="h-5 w-5" />
                        </Link>
                      );
                    })
                  : <p className="text-sm leading-7 text-slate-600">Sosyal medya linkleri admin ayarlarından canlı olarak okunur.</p>}
              </div>
            </PublicCard>
          </div>

          {/* Sağ: Form */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
          >
            <PublicCard className="p-5 sm:p-8 lg:p-10">
              <div className="mb-8">
                <PublicBadge className="mb-4">Mesaj Formu</PublicBadge>
                <h2 style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 700, fontSize: '36px', letterSpacing: '0', color: '#09090B', marginTop: '8px' }}>Bize Mesaj Gönderin</h2>
                <p className="mt-3 text-sm leading-7 text-[#52525b]">
                  {isAuthenticated
                    ? "Mesajınız destek talebi olarak oluşturulur."
                    : "Mesajınız iletişim formu üzerinden ekibe iletilir."}
                </p>

              </div>

              {success ? (
                <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
                  {success}
                </div>
              ) : null}
              {error ? (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                  {error}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <label className="space-y-0">
                    <span className={labelClass}>Ad Soyad</span>
                    <input
                      name="name"
                      required
                      type="text"
                      value={form.name}
                      onChange={(event) => handleChange("name", event.target.value)}
                      className="kdm-public-input"
                      placeholder="Adınız Soyadınız"
                    />
                  </label>
                  <label className="space-y-0">
                    <span className={labelClass}>E-posta</span>
                    <input
                      name="email"
                      required
                      type="email"
                      value={form.email}
                      onChange={(event) => handleChange("email", event.target.value)}
                      className="kdm-public-input"
                      placeholder="email@ornek.com"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className={labelClass}>Başlık</span>
                  <input
                    name="subject"
                    type="text"
                    value={form.subject}
                    onChange={(event) => handleChange("subject", event.target.value)}
                    className="kdm-public-input"
                    placeholder="Mesaj başlığı"
                  />
                </label>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Konu</span>
                    <select
                      name="category"
                      value={form.category}
                      onChange={(event) => handleChange("category", event.target.value)}
                      className="kdm-public-select"
                    >
                      <option value="general">Genel Bilgi</option>
                      <option value="applications">Başvurular Hakkında</option>
                      <option value="official_document">Resmi Evrak Talebi</option>
                      <option value="technical">Hata Bildirimi</option>
                      <option value="accommodation">Konaklama / Ulaşım</option>
                      <option value="other">Diğer</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelClass}>İlgili Proje</span>
                    <select
                      name="project_id"
                      value={form.project_id}
                      onChange={(event) => handleChange("project_id", event.target.value)}
                      className="kdm-public-select"
                    >
                      <option value="">Genel Başvuru</option>
                      {projects.map((project) => (
                        <option key={project.id} value={String(project.id)}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className={labelClass}>Mesajınız</span>
                  <textarea
                    name="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={(event) => handleChange("message", event.target.value)}
                    className="kdm-public-textarea"
                    placeholder="Size nasıl yardımcı olabiliriz?"
                  />
                </label>

                <label className="block">
                  <span className={labelClass}>
                    Dosya Eki{" "}
                    {requiresAttachment ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="font-normal normal-case tracking-normal text-slate-400">(İsteğe bağlı)</span>
                    )}
                  </span>
                  <span className="kdm-public-file-drop">
                    <input
                      name="attachment"
                      type="file"
                      className="hidden"
                      onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
                    />
                    <Upload className="h-5 w-5 shrink-0 text-orange-600" />
                    <span className="text-sm font-semibold text-slate-600">
                      {attachment
                        ? attachment.name
                        : requiresAttachment
                          ? "Resmi evrak için dosya ekleyin..."
                          : "Dosya seç (isteğe bağlı)"}
                    </span>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="kdm-public-btn-shine kdm-public-btn-brand flex w-full items-center justify-center gap-3 rounded-full py-4 font-black text-white shadow-[0_16px_36px_rgba(253,58,37,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(253,58,37,0.38)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Send className="h-5 w-5" />Gönder</>}
                </button>
              </form>
            </PublicCard>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
