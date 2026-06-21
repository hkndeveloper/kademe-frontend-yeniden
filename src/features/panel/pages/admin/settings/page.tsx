"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Clock3, Loader2, Save, Settings, ShieldCheck } from "lucide-react";
import api from "@/lib/api/axios";
import { defaultSiteSettings, SiteSettingsPayload, SiteSettingsResponse } from "@/lib/site-config";
import { usePermissions } from "@/hooks/usePermissions";
import {
  SETTINGS_MODULES,
  type SettingsModuleId,
  SettingsModuleNav,
  SiteSettingsPanels,
  type ActivityOption,
  type BlogOption,
  type ProjectOption,
  type SiteSettingsPanelsProps,
} from "./site-settings-panels";

type SiteSettingsRecord = Record<string, unknown>;
type HomepageBlockKey = SiteSettingsPayload["homepage"]["block_order"][number];

const homepageBlockKeys = Object.keys(defaultSiteSettings.homepage.block_visibility) as HomepageBlockKey[];

const isRecord = (value: unknown): value is SiteSettingsRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const arrayOr = <T,>(value: unknown, fallback: T[]): T[] => (Array.isArray(value) ? (value as T[]) : fallback);

const stringOr = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);

const mergeGroup = <T extends SiteSettingsRecord>(fallback: T, value: unknown): T => ({
  ...fallback,
  ...(isRecord(value) ? value : {}),
});

const normalizeLinks = (
  value: unknown,
  fallback: SiteSettingsPayload["navigation"]["header_links"],
): SiteSettingsPayload["navigation"]["header_links"] =>
  arrayOr(value, fallback)
    .filter(isRecord)
    .map((item) => ({
      label: stringOr(item.label),
      href: stringOr(item.href, "/"),
    }))
    .filter((item) => item.label.trim() !== "" || item.href.trim() !== "");

const normalizeStats = (
  value: unknown,
  fallback: SiteSettingsPayload["homepage"]["stats"],
): SiteSettingsPayload["homepage"]["stats"] =>
  arrayOr(value, fallback)
    .filter(isRecord)
    .map((item) => ({
      label: stringOr(item.label, "Yeni Alan"),
      value: stringOr(item.value, "0"),
      icon: stringOr(item.icon, "users"),
    }));

const normalizeIntroCards = (
  value: unknown,
  fallback: SiteSettingsPayload["homepage"]["intro_cards"],
): SiteSettingsPayload["homepage"]["intro_cards"] =>
  arrayOr(value, fallback)
    .filter(isRecord)
    .map((item) => ({
      title: stringOr(item.title),
      description: stringOr(item.description),
      image_url: stringOr(item.image_url),
      cta_label: stringOr(item.cta_label),
      cta_href: stringOr(item.cta_href, "/"),
    }));

const normalizeStringList = (value: unknown, fallback: string[]) =>
  arrayOr(value, fallback).filter((item): item is string => typeof item === "string");

const normalizeNumberList = (value: unknown, fallback: number[]) =>
  arrayOr(value, fallback)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));

const normalizeSiteSettings = (rawSettings: unknown): SiteSettingsPayload => {
  const raw = isRecord(rawSettings) ? rawSettings : {};
  const navigation = mergeGroup(defaultSiteSettings.navigation, raw.navigation);
  const homepage = mergeGroup(defaultSiteSettings.homepage, raw.homepage);
  const blockVisibility = mergeGroup(defaultSiteSettings.homepage.block_visibility, homepage.block_visibility);
  const normalizedBlockOrder = arrayOr(homepage.block_order, defaultSiteSettings.homepage.block_order).filter(
    (key): key is HomepageBlockKey => typeof key === "string" && homepageBlockKeys.includes(key as HomepageBlockKey),
  );

  return {
    general: mergeGroup(defaultSiteSettings.general, raw.general),
    contact: mergeGroup(defaultSiteSettings.contact, raw.contact),
    social_media: mergeGroup(defaultSiteSettings.social_media, raw.social_media),
    navigation: {
      ...navigation,
      header_links: normalizeLinks(navigation.header_links, defaultSiteSettings.navigation.header_links),
      footer_quick_links: normalizeLinks(
        navigation.footer_quick_links,
        defaultSiteSettings.navigation.footer_quick_links,
      ),
      footer_project_links: normalizeLinks(
        navigation.footer_project_links,
        defaultSiteSettings.navigation.footer_project_links,
      ),
    },
    homepage: {
      ...homepage,
      stats_mode: homepage.stats_mode === "manual" ? "manual" : "auto",
      block_order: normalizedBlockOrder.length > 0 ? normalizedBlockOrder : defaultSiteSettings.homepage.block_order,
      block_visibility: homepageBlockKeys.reduce(
        (visibility, key) => ({
          ...visibility,
          [key]: typeof blockVisibility[key] === "boolean" ? blockVisibility[key] : defaultSiteSettings.homepage.block_visibility[key],
        }),
        {} as SiteSettingsPayload["homepage"]["block_visibility"],
      ),
      intro_cards: normalizeIntroCards(homepage.intro_cards, defaultSiteSettings.homepage.intro_cards),
      featured_project_slugs: normalizeStringList(
        homepage.featured_project_slugs,
        defaultSiteSettings.homepage.featured_project_slugs,
      ),
      featured_blog_slugs: normalizeStringList(homepage.featured_blog_slugs, defaultSiteSettings.homepage.featured_blog_slugs),
      featured_activity_ids: normalizeNumberList(
        homepage.featured_activity_ids,
        defaultSiteSettings.homepage.featured_activity_ids,
      ),
      stats: normalizeStats(homepage.stats, defaultSiteSettings.homepage.stats),
    },
    about: mergeGroup(defaultSiteSettings.about, raw.about),
    blog_page: mergeGroup(defaultSiteSettings.blog_page, raw.blog_page),
    faq_page: mergeGroup(defaultSiteSettings.faq_page, raw.faq_page),
  };
};

export default function AdminSettingsPage() {
  const { hasPermission, hasGlobalScope } = usePermissions();
  const canViewSettings =
    (hasPermission("settings.view") && hasGlobalScope("settings.view")) ||
    (hasPermission("content.site_settings.update") && hasGlobalScope("content.site_settings.update"));
  const canUpdateSettings =
    (hasPermission("settings.update") && hasGlobalScope("settings.update")) ||
    (hasPermission("content.site_settings.update") && hasGlobalScope("content.site_settings.update"));

  const [activeModule, setActiveModule] = useState<SettingsModuleId>("general");
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
          api
            .get<{ programs: ActivityOption[] | { data?: ActivityOption[] } }>("/activities", { params: { per_page: 48 } })
            .catch(() => ({ data: { programs: [] as ActivityOption[] } })),
        ]);

        setSettings(normalizeSiteSettings(settingsResponse.data.settings));
        setComputedStats(settingsResponse.data.computed_homepage_stats ?? []);
        setProjectOptions(Array.isArray(projectsResponse.data.projects) ? projectsResponse.data.projects : []);

        const rawBlogs = blogsResponse.data.blogs;
        setBlogOptions(Array.isArray(rawBlogs) ? rawBlogs : rawBlogs?.data ?? []);

        /** Public `/activities` Laravel paginator dondurur: `programs` bazen `{ data: [...] }` nesnesidir. */
        const rawPrograms = activitiesResponse.data.programs;
        setActivityOptions(Array.isArray(rawPrograms) ? rawPrograms : rawPrograms?.data ?? []);
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
      setSettings(normalizeSiteSettings(response.data.settings));
      setComputedStats(response.data.computed_homepage_stats ?? []);
      setFeedback(response.data.message);
    } catch (error) {
      console.error("Site ayarlari kaydedilemedi", error);
      setErrorMessage("Site ayarlari kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const updateStat = useCallback((index: number, field: "label" | "value" | "icon", value: string) => {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        stats: current.homepage.stats.map((stat, statIndex) =>
          statIndex === index ? { ...stat, [field]: value } : stat,
        ),
      },
    }));
  }, []);

  const addStat = useCallback(() => {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        stats: [...current.homepage.stats, { label: "Yeni Alan", value: "0", icon: "users" }],
      },
    }));
  }, []);

  const removeStat = useCallback((index: number) => {
    setSettings((current) => ({
      ...current,
      homepage: {
        ...current.homepage,
        stats: current.homepage.stats.filter((_, statIndex) => statIndex !== index),
      },
    }));
  }, []);

  const updateNavLink = useCallback(
    (
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
    },
    [],
  );

  const addNavLink = useCallback((key: "header_links" | "footer_quick_links" | "footer_project_links") => {
    setSettings((current) => ({
      ...current,
      navigation: {
        ...current.navigation,
        [key]: [...current.navigation[key], { label: "Yeni Link", href: "/" }],
      },
    }));
  }, []);

  const removeNavLink = useCallback(
    (key: "header_links" | "footer_quick_links" | "footer_project_links", index: number) => {
      setSettings((current) => ({
        ...current,
        navigation: {
          ...current.navigation,
          [key]: current.navigation[key].filter((_, itemIndex) => itemIndex !== index),
        },
      }));
    },
    [],
  );

  const toggleFeaturedProject = useCallback((slug: string) => {
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
  }, []);

  const toggleFeaturedBlog = useCallback((slug: string) => {
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
  }, []);

  const toggleFeaturedActivity = useCallback((id: number) => {
    setSettings((current) => {
      const currentIds = current.homepage.featured_activity_ids;
      const nextIds = currentIds.includes(id) ? currentIds.filter((item) => item !== id) : [...currentIds, id];

      return {
        ...current,
        homepage: {
          ...current.homepage,
          featured_activity_ids: nextIds,
        },
      };
    });
  }, []);

  const moveBlock = useCallback((index: number, direction: -1 | 1) => {
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
  }, []);

  const toggleBlockVisibility = useCallback(
    (key: "hero" | "intro" | "stats" | "projects" | "activities" | "about" | "blog" | "newsletter" | "certificate_verify") => {
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
    },
    [],
  );

  const updateIntroCard = useCallback(
    (index: number, field: "title" | "description" | "image_url" | "cta_label" | "cta_href", value: string) => {
      setSettings((current) => ({
        ...current,
        homepage: {
          ...current.homepage,
          intro_cards: current.homepage.intro_cards.map((card, cardIndex) =>
            cardIndex === index ? { ...card, [field]: value } : card,
          ),
        },
      }));
    },
    [],
  );

  const homepageBlockLabels: SiteSettingsPanelsProps["homepageBlockLabels"] = useMemo(
    () => ({
      hero: "Hero",
      intro: "Kisa tanitim kartlari",
      stats: "Sayilarla veriler",
      projects: "Projelerimiz",
      activities: "Faaliyetlerimiz",
      about: "Hakkımızda",
      blog: "Blog",
      newsletter: "E-Bulten",
      certificate_verify: "Sertifika dogrulama",
    }),
    [],
  );

  const uploadImage = useCallback(
    async (file: File, folder: string, onSuccess: (url: string) => void, fieldKey: string) => {
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
    },
    [canUpdateSettings],
  );

  const panelProps = useMemo(
    () => ({
      activeModule,
      settings,
      setSettings,
      disabled: !canUpdateSettings,
      uploadingField,
      projectOptions,
      blogOptions,
      activityOptions,
      computedStats,
      uploadImage,
      updateStat,
      addStat,
      removeStat,
      updateNavLink,
      addNavLink,
      removeNavLink,
      toggleFeaturedProject,
      toggleFeaturedBlog,
      toggleFeaturedActivity,
      moveBlock,
      toggleBlockVisibility,
      updateIntroCard,
      homepageBlockLabels,
    }),
    [
      activeModule,
      settings,
      canUpdateSettings,
      uploadingField,
      projectOptions,
      blogOptions,
      activityOptions,
      computedStats,
      uploadImage,
      updateStat,
      addStat,
      removeStat,
      updateNavLink,
      addNavLink,
      removeNavLink,
      toggleFeaturedProject,
      toggleFeaturedBlog,
      toggleFeaturedActivity,
      moveBlock,
      toggleBlockVisibility,
      updateIntroCard,
      homepageBlockLabels,
    ],
  );

  const activeModuleDef = SETTINGS_MODULES.find((m) => m.id === activeModule) ?? SETTINGS_MODULES[0];
  const ActiveModuleIcon = activeModuleDef.icon;
  const activeModuleLabel = activeModuleDef.label;
  const visibleBlockCount = Object.values(settings.homepage.block_visibility).filter(Boolean).length;
  const selectedContentCount =
    settings.homepage.featured_project_slugs.length +
    settings.homepage.featured_blog_slugs.length +
    settings.homepage.featured_activity_ids.length;

  if (!canViewSettings) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600 shadow-sm">
        Site ayarlarini goruntulemek icin{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">settings.view</code> veya{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">content.site_settings.update</code> izninin{" "}
        <strong>tum sistem (all)</strong> kapsaminda verilmesi gerekir.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-md shadow-slate-950/20">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Site ayarlari</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Public site metinleri, anasayfa duzeni ve navigasyon tek panel icinden action + scope izinleriyle
                yonetilir.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:w-[520px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <ActiveModuleIcon className="h-4 w-4" />
                Modul
              </div>
              <div className="mt-1 truncate text-sm font-bold text-slate-900">{activeModuleLabel}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <ShieldCheck className="h-4 w-4" />
                Yetki
              </div>
              <div className={`mt-1 text-sm font-bold ${canUpdateSettings ? "text-emerald-700" : "text-amber-700"}`}>
                {canUpdateSettings ? "Duzenlenebilir" : "Salt okunur"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Clock3 className="h-4 w-4" />
                Anasayfa
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900">
                {visibleBlockCount} blok / {selectedContentCount} secim
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/80 px-5 py-3 text-xs text-slate-600 lg:px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Ayar verisi yuklendi
          </span>
          <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
            {settings.homepage.stats_mode === "manual" ? "Manuel istatistik" : "Otomatik istatistik"}
          </span>
          <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
            {settings.navigation.header_links.length} header linki
          </span>
        </div>
      </header>

      {feedback ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{feedback}</div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{errorMessage}</div>
      ) : null}

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 shadow-sm"
        >
          <span>Modul: {activeModuleLabel}</span>
          <ChevronDown className={`h-5 w-5 text-slate-500 transition ${mobileNavOpen ? "rotate-180" : ""}`} />
        </button>
        {mobileNavOpen ? (
          <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <SettingsModuleNav
              activeModule={activeModule}
              onSelect={(id) => {
                setActiveModule(id);
                setMobileNavOpen(false);
              }}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-4 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
            <SettingsModuleNav activeModule={activeModule} onSelect={setActiveModule} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <SiteSettingsPanels {...panelProps} />
        </div>
      </div>

      <div className="sticky bottom-4 z-10 mt-8 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        {!canUpdateSettings ? (
          <p className="text-xs text-amber-800 sm:text-sm">Salt okunur: kaydetmek icin duzenleme yetkisi gerekir.</p>
        ) : (
          <p className="text-xs text-slate-500 sm:text-sm">Degisiklikleri kaydetmeyi unutmayin.</p>
        )}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !canUpdateSettings}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Ayarlari kaydet
        </button>
      </div>
    </div>
  );
}
