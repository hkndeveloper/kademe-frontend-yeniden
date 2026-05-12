"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Plus, Save, Settings, Trash2 } from "lucide-react";
import api from "@/lib/api/axios";
import { defaultSiteSettings, SiteSettingsPayload, SiteSettingsResponse } from "@/lib/site-config";
import { usePermissions } from "@/hooks/usePermissions";

interface ProjectOption {
  id: number;
  name: string;
  slug: string;
}

interface BlogOption {
  id: number;
  title: string;
  slug: string;
}

interface ActivityOption {
  id: number;
  title: string;
  start_at: string;
  project?: {
    name: string;
  };
}

export default function AdminSettingsPage() {
  const { hasPermission, hasGlobalScope } = usePermissions();
  const canViewSettings =
    (hasPermission("settings.view") && hasGlobalScope("settings.view")) ||
    (hasPermission("content.site_settings.update") && hasGlobalScope("content.site_settings.update"));
  const canUpdateSettings =
    (hasPermission("settings.update") && hasGlobalScope("settings.update")) ||
    (hasPermission("content.site_settings.update") && hasGlobalScope("content.site_settings.update"));

  const [settings, setSettings] = useState<SiteSettingsPayload>(defaultSiteSettings);
  const [computedStats, setComputedStats] = useState<Array<{ label: string; value: string; icon: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [blogOptions, setBlogOptions] = useState<BlogOption[]>([]);
  const [activityOptions, setActivityOptions] = useState<ActivityOption[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    generalContact: true,
    social: false,
    navLinks: true,
    homepageBlocks: false,
    homepageContent: false,
    introCards: false,
    featured: false,
    stats: false,
    about: false,
  });

  useEffect(() => {
    if (!canViewSettings) {
      return;
    }

    const loadSettings = async () => {
      try {
        const [settingsResponse, projectsResponse, blogsResponse, activitiesResponse] = await Promise.all([
          api.get<SiteSettingsResponse>("/panel/site-settings"),
          api.get<{ projects: ProjectOption[] }>("/projects").catch(() => ({ data: { projects: [] as ProjectOption[] } })),
          api.get<{ blogs: BlogOption[] | { data?: BlogOption[] } }>("/blogs").catch(() => ({ data: { blogs: [] as BlogOption[] } })),
          api.get<{ programs: ActivityOption[] }>("/activities").catch(() => ({ data: { programs: [] as ActivityOption[] } })),
        ]);

        setSettings(settingsResponse.data.settings ?? defaultSiteSettings);
        setComputedStats(settingsResponse.data.computed_homepage_stats ?? []);
        setProjectOptions(projectsResponse.data.projects ?? []);

        const rawBlogs = blogsResponse.data.blogs;
        setBlogOptions(Array.isArray(rawBlogs) ? rawBlogs : rawBlogs?.data ?? []);
        setActivityOptions(activitiesResponse.data.programs ?? []);
      } catch (error) {
        console.error("Site ayarlari yuklenemedi", error);
        setErrorMessage("Site ayarlari yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, [canViewSettings]);

  const handleSave = async () => {
    if (!canUpdateSettings) {
      setErrorMessage("Site ayarlarini guncelleme yetkiniz yok.");
      return;
    }

    setSaving(true);
    setFeedback(null);
    setErrorMessage(null);

    try {
      const response = await api.put<{
        message: string;
        settings: SiteSettingsPayload;
        computed_homepage_stats?: Array<{ label: string; value: string; icon: string }>;
      }>("/panel/site-settings", {
        settings,
      });
      setSettings(response.data.settings ?? defaultSiteSettings);
      setComputedStats(response.data.computed_homepage_stats ?? []);
      setFeedback(response.data.message);
    } catch (error) {
      console.error("Site ayarlari kaydedilemedi", error);
      setErrorMessage("Site ayarlari kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const updateStat = (index: number, field: "label" | "value" | "icon", value: string) => {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        stats: current.homepage.stats.map((stat, statIndex) =>
          statIndex === index ? { ...stat, [field]: value } : stat,
        ),
      },
    }));
  };

  const addStat = () => {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        stats: [...current.homepage.stats, { label: "Yeni Alan", value: "0", icon: "users" }],
      },
    }));
  };

  const removeStat = (index: number) => {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        stats: current.homepage.stats.filter((_, statIndex) => statIndex !== index),
      },
    }));
  };

  const updateNavLink = (
    key: "header_links" | "footer_quick_links" | "footer_project_links",
    index: number,
    field: "label" | "href",
    value: string,
  ) => {
    setSettings((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        [key]: current.navigation[key].map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      },
    }));
  };

  const addNavLink = (key: "header_links" | "footer_quick_links" | "footer_project_links") => {
    setSettings((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        [key]: [...current.navigation[key], { label: "Yeni Link", href: "/" }],
      },
    }));
  };

  const removeNavLink = (key: "header_links" | "footer_quick_links" | "footer_project_links", index: number) => {
    setSettings((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        [key]: current.navigation[key].filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const toggleFeaturedProject = (slug: string) => {
    setSettings((current) => {
      const currentSlugs = current.homepage.featured_project_slugs;
      const nextSlugs = currentSlugs.includes(slug)
        ? currentSlugs.filter((item) => item !== slug)
        : [...currentSlugs, slug];

      return {
        ...current,
        homepage: {
          ...current.homepage,
          featured_project_slugs: nextSlugs,
        },
      };
    });
  };

  const toggleFeaturedBlog = (slug: string) => {
    setSettings((current) => {
      const currentSlugs = current.homepage.featured_blog_slugs;
      const nextSlugs = currentSlugs.includes(slug)
        ? currentSlugs.filter((item) => item !== slug)
        : [...currentSlugs, slug];

      return {
        ...current,
        homepage: {
          ...current.homepage,
          featured_blog_slugs: nextSlugs,
        },
      };
    });
  };

  const toggleFeaturedActivity = (id: number) => {
    setSettings((current) => {
      const currentIds = current.homepage.featured_activity_ids;
      const nextIds = currentIds.includes(id)
        ? currentIds.filter((item) => item !== id)
        : [...currentIds, id];

      return {
        ...current,
        homepage: {
          ...current.homepage,
          featured_activity_ids: nextIds,
        },
      };
    });
  };

  const uploadImage = async (
    file: File,
    folder: string,
    onSuccess: (url: string) => void,
    fieldKey: string,
  ) => {
    if (!canUpdateSettings) {
      setErrorMessage("Gorsel yuklemek icin global site ayari guncelleme yetkisi gerekir.");
      return;
    }

    setUploadingField(fieldKey);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const response = await api.post<{ url: string }>("/panel/media/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      onSuccess(response.data.url);
    } catch (error) {
      console.error("Gorsel yuklenemedi", error);
      setErrorMessage("Gorsel yuklenemedi.");
    } finally {
      setUploadingField(null);
    }
  };

  const homepageBlockLabels: Record<"hero" | "intro" | "stats" | "projects" | "activities" | "about" | "blog" | "newsletter" | "certificate_verify", string> = {
    hero: "Hero",
    intro: "Kisa Tanitim Bloklari",
    stats: "Sayilarla Veriler",
    projects: "Projelerimiz",
    activities: "Faaliyetlerimiz",
    about: "Hakkimizda",
    blog: "Blog",
    newsletter: "E-Bulten",
    certificate_verify: "Sertifika Dogrulama",
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    setSettings((current) => {
      const nextOrder = [...current.homepage.block_order];
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= nextOrder.length) {
        return current;
      }

      [nextOrder[index], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[index]];

      return {
        ...current,
        homepage: {
          ...current.homepage,
          block_order: nextOrder,
        },
      };
    });
  };

  const toggleBlockVisibility = (key: "hero" | "intro" | "stats" | "projects" | "activities" | "about" | "blog" | "newsletter" | "certificate_verify") => {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        block_visibility: {
          ...current.homepage.block_visibility,
          [key]: !current.homepage.block_visibility[key],
        },
      },
    }));
  };

  const updateIntroCard = (
    index: number,
    field: "title" | "description" | "image_url" | "cta_label" | "cta_href",
    value: string,
  ) => {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        intro_cards: current.homepage.intro_cards.map((card, cardIndex) =>
          cardIndex === index ? { ...card, [field]: value } : card,
        ),
      },
    }));
  };

  const toggleSection = (key: string) => {
    setExpandedSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  if (!canViewSettings) {
    return (
      <div className="glass-panel rounded-3xl p-10 text-center text-sm text-muted-foreground">
        Site ayarlarini goruntulemek icin settings.view veya content.site_settings.update izninin tum sistem kapsaminda verilmesi gerekir.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
          <Settings className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Genel Ayarlar</h1>
          <p className="text-sm text-muted-foreground">
            Anasayfa, hakkimizda, iletisim, sosyal medya ve footer alanlarini buradan yonetebilirsin.
          </p>
        </div>
      </div>

      {feedback ? <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-200">{feedback}</div> : null}
      {errorMessage ? <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">{errorMessage}</div> : null}

      <div className="grid grid-cols-1 gap-8">
        <div className="glass-panel rounded-3xl p-8">
          <button
            type="button"
            onClick={() => toggleSection("generalContact")}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-lg font-bold text-slate-900">Genel ve Iletisim</h2>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.generalContact ? "rotate-180" : ""}`} />
          </button>
          {expandedSections.generalContact ? (
            <div className="mt-4 space-y-4">
              <input value={settings.general.site_name} onChange={(event) => setSettings((current) => ({ ...current, general: { ...current.general, site_name: event.target.value } }))} placeholder="Site adi" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
              <input value={settings.general.site_tagline} onChange={(event) => setSettings((current) => ({ ...current, general: { ...current.general, site_tagline: event.target.value } }))} placeholder="Site slogani" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
              <input value={settings.contact.contact_email} onChange={(event) => setSettings((current) => ({ ...current, contact: { ...current.contact, contact_email: event.target.value } }))} placeholder="Iletisim e-postasi" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
              <input value={settings.contact.contact_phone} onChange={(event) => setSettings((current) => ({ ...current, contact: { ...current.contact, contact_phone: event.target.value } }))} placeholder="Telefon" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
              <textarea value={settings.contact.contact_address} onChange={(event) => setSettings((current) => ({ ...current, contact: { ...current.contact, contact_address: event.target.value } }))} rows={4} placeholder="Adres" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
            </div>
          ) : null}
        </div>

        <div className="glass-panel rounded-3xl p-8">
          <button
            type="button"
            onClick={() => toggleSection("social")}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-lg font-bold text-slate-900">Sosyal Medya</h2>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.social ? "rotate-180" : ""}`} />
          </button>
          {expandedSections.social ? (
            <div className="mt-4 space-y-4">
              <input value={settings.social_media.instagram_url} onChange={(event) => setSettings((current) => ({ ...current, social_media: { ...current.social_media, instagram_url: event.target.value } }))} placeholder="Instagram URL" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
              <input value={settings.social_media.twitter_url} onChange={(event) => setSettings((current) => ({ ...current, social_media: { ...current.social_media, twitter_url: event.target.value } }))} placeholder="X / Twitter URL" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
              <input value={settings.social_media.youtube_url} onChange={(event) => setSettings((current) => ({ ...current, social_media: { ...current.social_media, youtube_url: event.target.value } }))} placeholder="YouTube URL" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
              <input value={settings.social_media.linkedin_url} onChange={(event) => setSettings((current) => ({ ...current, social_media: { ...current.social_media, linkedin_url: event.target.value } }))} placeholder="LinkedIn URL" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Sosyal Medya Otomasyon Webhook (Buffer / Make.com / Zapier)</label>
                <input value={settings.social_media.sharing_webhook_url ?? ""} onChange={(event) => setSettings((current) => ({ ...current, social_media: { ...current.social_media, sharing_webhook_url: event.target.value } }))} placeholder="https://hook.make.com/... veya https://hooks.zapier.com/..." className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
                <p className="mt-1 text-xs text-muted-foreground">Duyuru veya etkinlik panelinden &quot;Sosyal Medyada Paylas&quot; butonuyla bu URL tetiklenir.</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="glass-panel rounded-3xl p-8 xl:col-span-2">
          <button
            type="button"
            onClick={() => toggleSection("navLinks")}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-lg font-bold text-slate-900">Header ve Footer Linkleri</h2>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.navLinks ? "rotate-180" : ""}`} />
          </button>
          {expandedSections.navLinks ? (
          <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input value={settings.navigation.header_login_label} onChange={(event) => setSettings((current) => ({ ...current, navigation: { ...current.navigation, header_login_label: event.target.value } }))} placeholder="Header login buton metni" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
                <input value={settings.navigation.header_register_label} onChange={(event) => setSettings((current) => ({ ...current, navigation: { ...current.navigation, header_register_label: event.target.value } }))} placeholder="Header basvur buton metni" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Header Linkleri</h3>
                <button onClick={() => addNavLink("header_links")} type="button" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-900">
                  <Plus className="h-4 w-4" />
                  Link Ekle
                </button>
              </div>
              {settings.navigation.header_links.map((link, index) => (
                <div key={`header-link-${index}`} className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1fr_1.2fr_auto]">
                  <input value={link.label} onChange={(event) => updateNavLink("header_links", index, "label", event.target.value)} placeholder="Etiket" className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-slate-900" />
                  <input value={link.href} onChange={(event) => updateNavLink("header_links", index, "href", event.target.value)} placeholder="Baglanti" className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-slate-900" />
                  <button onClick={() => removeNavLink("header_links", index)} type="button" className="inline-flex items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Footer Kurumsal Linkleri</h3>
                <button onClick={() => addNavLink("footer_quick_links")} type="button" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-900">
                  <Plus className="h-4 w-4" />
                  Link Ekle
                </button>
              </div>
              {settings.navigation.footer_quick_links.map((link, index) => (
                <div key={`footer-quick-link-${index}`} className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1fr_1.2fr_auto]">
                  <input value={link.label} onChange={(event) => updateNavLink("footer_quick_links", index, "label", event.target.value)} placeholder="Etiket" className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-slate-900" />
                  <input value={link.href} onChange={(event) => updateNavLink("footer_quick_links", index, "href", event.target.value)} placeholder="Baglanti" className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-slate-900" />
                  <button onClick={() => removeNavLink("footer_quick_links", index)} type="button" className="inline-flex items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-between pt-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Footer Proje Linkleri</h3>
                <button onClick={() => addNavLink("footer_project_links")} type="button" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-900">
                  <Plus className="h-4 w-4" />
                  Link Ekle
                </button>
              </div>
              {settings.navigation.footer_project_links.map((link, index) => (
                <div key={`footer-project-link-${index}`} className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1fr_1.2fr_auto]">
                  <input value={link.label} onChange={(event) => updateNavLink("footer_project_links", index, "label", event.target.value)} placeholder="Etiket" className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-slate-900" />
                  <input value={link.href} onChange={(event) => updateNavLink("footer_project_links", index, "href", event.target.value)} placeholder="Baglanti" className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-slate-900" />
                  <button onClick={() => removeNavLink("footer_project_links", index)} type="button" className="inline-flex items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          ) : null}
        </div>

        <div className="glass-panel rounded-3xl p-8 xl:col-span-2">
          <button
            type="button"
            onClick={() => toggleSection("homepageBlocks")}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-lg font-bold text-slate-900">Anasayfa Blok Yonetimi</h2>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.homepageBlocks ? "rotate-180" : ""}`} />
          </button>
          {expandedSections.homepageBlocks ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Anasayfadaki bolumleri acip kapatabilir ve gosterim sirasini degistirebilirsin.
            </p>
            <div className="space-y-3">
            {settings.homepage.block_order.map((block, index) => (
              <div key={block} className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1.3fr_auto_auto_auto] md:items-center">
                <div>
                  <div className="font-bold text-slate-900">{homepageBlockLabels[block]}</div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    {settings.homepage.block_visibility[block] ? "Gorunur" : "Gizli"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleBlockVisibility(block)}
                  className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm font-bold text-slate-900"
                >
                  {settings.homepage.block_visibility[block] ? "Gizle" : "Goster"}
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(index, -1)}
                  disabled={index === 0}
                  className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm font-bold text-slate-900 disabled:opacity-40"
                >
                  Yukari
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(index, 1)}
                  disabled={index === settings.homepage.block_order.length - 1}
                  className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm font-bold text-slate-900 disabled:opacity-40"
                >
                  Asagi
                </button>
              </div>
            ))}
            </div>
          </div>
          ) : null}
        </div>

        <div className="glass-panel rounded-3xl p-8 xl:col-span-2">
          <button
            type="button"
            onClick={() => toggleSection("homepageContent")}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-lg font-bold text-slate-900">Anasayfa Icerigi</h2>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.homepageContent ? "rotate-180" : ""}`} />
          </button>
          {expandedSections.homepageContent ? (
          <div className="mt-4 space-y-4">
          <input value={settings.homepage.hero_badge} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, hero_badge: event.target.value } }))} placeholder="Hero badge" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input value={settings.homepage.hero_title_line_1} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, hero_title_line_1: event.target.value } }))} placeholder="Hero satir 1" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
            <input value={settings.homepage.hero_title_line_2} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, hero_title_line_2: event.target.value } }))} placeholder="Hero satir 2" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
            <input value={settings.homepage.hero_title_line_3} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, hero_title_line_3: event.target.value } }))} placeholder="Hero satir 3" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
            <input value={settings.homepage.hero_title_line_4} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, hero_title_line_4: event.target.value } }))} placeholder="Hero satir 4" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          </div>
          <textarea value={settings.homepage.hero_description} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, hero_description: event.target.value } }))} rows={4} placeholder="Hero aciklama" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <input value={settings.homepage.hero_background_image_url} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, hero_background_image_url: event.target.value } }))} placeholder="Hero arka plan gorsel URL" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-900">
            {uploadingField === "hero_background_image_url" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Hero gorsel yukle
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void uploadImage(
                  file,
                  "homepage",
                  (url) =>
                    setSettings((current) => ({
                      ...current,
                      homepage: { ...current.homepage, hero_background_image_url: url },
                    })),
                  "hero_background_image_url",
                );
                event.target.value = "";
              }}
            />
          </label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input value={settings.homepage.hero_primary_label} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, hero_primary_label: event.target.value } }))} placeholder="Birincil buton metni" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
            <input value={settings.homepage.hero_primary_href} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, hero_primary_href: event.target.value } }))} placeholder="Birincil buton linki" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
            <input value={settings.homepage.hero_secondary_label} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, hero_secondary_label: event.target.value } }))} placeholder="Ikincil buton metni" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
            <input value={settings.homepage.hero_secondary_href} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, hero_secondary_href: event.target.value } }))} placeholder="Ikincil buton linki" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input value={settings.homepage.projects_title} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, projects_title: event.target.value } }))} placeholder="Projeler basligi" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
            <input value={settings.homepage.activities_title} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, activities_title: event.target.value } }))} placeholder="Faaliyetler basligi" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
            <input value={settings.homepage.about_teaser_title} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, about_teaser_title: event.target.value } }))} placeholder="About teaser basligi" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
            <input value={settings.homepage.blog_title} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, blog_title: event.target.value } }))} placeholder="Blog basligi" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
            <input value={settings.homepage.newsletter_title} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, newsletter_title: event.target.value } }))} placeholder="E-bulten basligi" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          </div>
          <textarea value={settings.homepage.projects_description} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, projects_description: event.target.value } }))} rows={3} placeholder="Projeler aciklama" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <textarea value={settings.homepage.activities_description} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, activities_description: event.target.value } }))} rows={3} placeholder="Faaliyetler aciklama" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <textarea value={settings.homepage.about_teaser_description} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, about_teaser_description: event.target.value } }))} rows={3} placeholder="About teaser aciklama" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <input value={settings.homepage.about_teaser_image_url} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, about_teaser_image_url: event.target.value } }))} placeholder="About teaser gorsel URL" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-900">
            {uploadingField === "about_teaser_image_url" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            About gorsel yukle
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void uploadImage(
                  file,
                  "homepage",
                  (url) =>
                    setSettings((current) => ({
                      ...current,
                      homepage: { ...current.homepage, about_teaser_image_url: url },
                    })),
                  "about_teaser_image_url",
                );
                event.target.value = "";
              }}
            />
          </label>
          <textarea value={settings.homepage.blog_description} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, blog_description: event.target.value } }))} rows={3} placeholder="Blog aciklama" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <textarea value={settings.homepage.newsletter_description} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, newsletter_description: event.target.value } }))} rows={3} placeholder="E-bulten aciklama" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <textarea value={settings.homepage.footer_description} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, footer_description: event.target.value } }))} rows={3} placeholder="Footer aciklama" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <textarea value={settings.homepage.footer_copyright} onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, footer_copyright: event.target.value } }))} rows={2} placeholder="Footer telif metni" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Aylik Motivasyon Mesaji (Ogrenci/Mezun Dashboard)</label>
            <textarea
              value={settings.homepage.monthly_motivation_message ?? ""}
              onChange={(event) => setSettings((current) => ({ ...current, homepage: { ...current.homepage, monthly_motivation_message: event.target.value } }))}
              rows={3}
              placeholder="Bu ay ogrencilere ve mezunlara gosterilecek motivasyon mesaji..."
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900"
            />
          </div>
          </div>
          ) : null}
        </div>

        <div className="glass-panel rounded-3xl p-8 xl:col-span-2">
          <button
            type="button"
            onClick={() => toggleSection("introCards")}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-lg font-bold text-slate-900">Kisa Tanitim Kartlari</h2>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.introCards ? "rotate-180" : ""}`} />
          </button>
          {expandedSections.introCards ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Anasayfada hero sonrasinda gosterilecek kisa tanitim yazilari ve gorsellerini buradan yonetebilirsin.
            </p>
            <div className="space-y-4">
            {settings.homepage.intro_cards.map((card, index) => (
              <div key={`intro-card-${index}`} className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-bold uppercase tracking-widest text-primary">Kart {index + 1}</div>
                <input value={card.title} onChange={(event) => updateIntroCard(index, "title", event.target.value)} placeholder="Baslik" className="w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-slate-900" />
                <textarea value={card.description} onChange={(event) => updateIntroCard(index, "description", event.target.value)} rows={3} placeholder="Aciklama" className="w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-slate-900" />
                <input value={card.image_url} onChange={(event) => updateIntroCard(index, "image_url", event.target.value)} placeholder="Gorsel URL" className="w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-slate-900" />
                <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm font-bold text-slate-900">
                  {uploadingField === `intro-${index}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Kart gorseli yukle
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void uploadImage(file, "homepage", (url) => updateIntroCard(index, "image_url", url), `intro-${index}`);
                      event.target.value = "";
                    }}
                  />
                </label>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input value={card.cta_label} onChange={(event) => updateIntroCard(index, "cta_label", event.target.value)} placeholder="Buton metni" className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-slate-900" />
                  <input value={card.cta_href} onChange={(event) => updateIntroCard(index, "cta_href", event.target.value)} placeholder="Buton linki" className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-slate-900" />
                </div>
              </div>
            ))}
            </div>
          </div>
          ) : null}
        </div>

        <div className="glass-panel rounded-3xl p-8 xl:col-span-2">
          <button
            type="button"
            onClick={() => toggleSection("featured")}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-lg font-bold text-slate-900">Anasayfa One Cikan Icerikler</h2>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.featured ? "rotate-180" : ""}`} />
          </button>
          {expandedSections.featured ? (
          <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">One Cikan Projeler</h3>
              <div className="grid grid-cols-1 gap-3">
                {projectOptions.map((project) => {
                  const checked = settings.homepage.featured_project_slugs.includes(project.slug);
                  return (
                    <label key={project.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFeaturedProject(project.slug)}
                        className="h-4 w-4 rounded border-white/20 bg-transparent"
                      />
                      <span>{project.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">One Cikan Bloglar</h3>
              <div className="grid grid-cols-1 gap-3">
                {blogOptions.map((blog) => {
                  const checked = settings.homepage.featured_blog_slugs.includes(blog.slug);
                  return (
                    <label key={blog.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFeaturedBlog(blog.slug)}
                        className="h-4 w-4 rounded border-white/20 bg-transparent"
                      />
                      <span>{blog.title}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">One Cikan Faaliyetler</h3>
              <div className="grid grid-cols-1 gap-3">
                {activityOptions.map((activity) => {
                  const checked = settings.homepage.featured_activity_ids.includes(activity.id);
                  return (
                    <label key={activity.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFeaturedActivity(activity.id)}
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                      />
                      <span>
                        <span className="block font-semibold">{activity.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {activity.project?.name || "Program"} • {new Date(activity.start_at).toLocaleDateString("tr-TR")}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          ) : null}
        </div>

        <div className="glass-panel rounded-3xl p-8 xl:col-span-2">
          <button
            type="button"
            onClick={() => toggleSection("stats")}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-lg font-bold text-slate-900">Sayilarla Veriler</h2>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.stats ? "rotate-180" : ""}`} />
          </button>

          {expandedSections.stats ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div />
              <div className="flex items-center gap-3">
              <select
                value={settings.homepage.stats_mode}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    homepage: {
                      ...current.homepage,
                      stats_mode: event.target.value as "auto" | "manual",
                    },
                  }))
                }
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-900"
              >
                <option value="auto">Veritabanindan Otomatik</option>
                <option value="manual">Manuel Giris</option>
              </select>
              <button onClick={addStat} type="button" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-900">
                <Plus className="h-4 w-4" />
                Alan Ekle
              </button>
              </div>
            </div>

          {settings.homepage.stats_mode === "auto" ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <p className="mb-4 text-sm text-emerald-200">
                Bu modda anasayfadaki sayilar veritabanindan hesaplanir. Admin isterse tekrar manuel moda gecip kendi degerlerini girebilir.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {computedStats.map((stat, index) => (
                  <div key={`${stat.label}-${index}`} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</div>
                    <div className="mt-2 text-2xl font-black text-slate-900">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {settings.homepage.stats_mode === "manual" ? (
            <div className="space-y-4">
              {settings.homepage.stats.map((stat, index) => (
                <div key={`${stat.label}-${index}`} className="grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                  <input value={stat.label} onChange={(event) => updateStat(index, "label", event.target.value)} placeholder="Baslik" className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-slate-900" />
                  <input value={stat.value} onChange={(event) => updateStat(index, "value", event.target.value)} placeholder="Deger" className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-slate-900" />
                  <select value={stat.icon} onChange={(event) => updateStat(index, "icon", event.target.value)} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-slate-900">
                    <option value="users">Users</option>
                    <option value="trophy">Trophy</option>
                    <option value="calendar">Calendar</option>
                    <option value="globe">Globe</option>
                  </select>
                  <button onClick={() => removeStat(index)} type="button" className="inline-flex items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          </div>
          ) : null}
        </div>

        <div className="glass-panel rounded-3xl p-8 xl:col-span-2">
          <button
            type="button"
            onClick={() => toggleSection("about")}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-lg font-bold text-slate-900">Hakkimizda Icerigi</h2>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedSections.about ? "rotate-180" : ""}`} />
          </button>
          {expandedSections.about ? (
          <div className="mt-4 space-y-4">
          <input value={settings.about.hero_title} onChange={(event) => setSettings((current) => ({ ...current, about: { ...current.about, hero_title: event.target.value } }))} placeholder="Hero baslik" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <textarea value={settings.about.hero_description} onChange={(event) => setSettings((current) => ({ ...current, about: { ...current.about, hero_description: event.target.value } }))} rows={3} placeholder="Hero aciklama" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input value={settings.about.mission_title} onChange={(event) => setSettings((current) => ({ ...current, about: { ...current.about, mission_title: event.target.value } }))} placeholder="Misyon basligi" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
            <input value={settings.about.vision_title} onChange={(event) => setSettings((current) => ({ ...current, about: { ...current.about, vision_title: event.target.value } }))} placeholder="Vizyon basligi" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          </div>
          <textarea value={settings.about.mission_text} onChange={(event) => setSettings((current) => ({ ...current, about: { ...current.about, mission_text: event.target.value } }))} rows={3} placeholder="Misyon metni" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <textarea value={settings.about.vision_text} onChange={(event) => setSettings((current) => ({ ...current, about: { ...current.about, vision_text: event.target.value } }))} rows={3} placeholder="Vizyon metni" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <input value={settings.about.ecosystem_title} onChange={(event) => setSettings((current) => ({ ...current, about: { ...current.about, ecosystem_title: event.target.value } }))} placeholder="Ekosistem basligi" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <textarea value={settings.about.ecosystem_description} onChange={(event) => setSettings((current) => ({ ...current, about: { ...current.about, ecosystem_description: event.target.value } }))} rows={3} placeholder="Ekosistem aciklama" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input value={settings.about.faq_teaser_title} onChange={(event) => setSettings((current) => ({ ...current, about: { ...current.about, faq_teaser_title: event.target.value } }))} placeholder="SSS teaser basligi" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
            <input value={settings.about.blog_teaser_title} onChange={(event) => setSettings((current) => ({ ...current, about: { ...current.about, blog_teaser_title: event.target.value } }))} placeholder="Blog teaser basligi" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
            <input value={settings.about.activities_teaser_title} onChange={(event) => setSettings((current) => ({ ...current, about: { ...current.about, activities_teaser_title: event.target.value } }))} placeholder="Faaliyet teaser basligi" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          </div>
          <textarea value={settings.about.faq_teaser_text} onChange={(event) => setSettings((current) => ({ ...current, about: { ...current.about, faq_teaser_text: event.target.value } }))} rows={2} placeholder="SSS teaser metni" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <textarea value={settings.about.blog_teaser_text} onChange={(event) => setSettings((current) => ({ ...current, about: { ...current.about, blog_teaser_text: event.target.value } }))} rows={2} placeholder="Blog teaser metni" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <textarea value={settings.about.activities_teaser_text} onChange={(event) => setSettings((current) => ({ ...current, about: { ...current.about, activities_teaser_text: event.target.value } }))} rows={2} placeholder="Faaliyet teaser metni" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <input value={settings.about.journey_title} onChange={(event) => setSettings((current) => ({ ...current, about: { ...current.about, journey_title: event.target.value } }))} placeholder="Yolculuk basligi" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          <textarea value={settings.about.journey_text} onChange={(event) => setSettings((current) => ({ ...current, about: { ...current.about, journey_text: event.target.value } }))} rows={2} placeholder="Yolculuk metni" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" />
          </div>
          ) : null}
        </div>
      </div>

      {!canUpdateSettings ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Bu sayfayi goruntuleyebilirsiniz; kaydetmek icin site ayarlari guncelleme yetkisi gerekir.
        </div>
      ) : null}
      <button
        onClick={() => void handleSave()}
        disabled={saving || !canUpdateSettings}
        className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        Ayarlari Kaydet
      </button>
    </div>
  );
}
