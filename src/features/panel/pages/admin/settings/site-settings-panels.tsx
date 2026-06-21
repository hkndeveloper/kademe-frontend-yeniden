"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  BarChart3,
  Building2,
  FileText,
  Globe2,
  ImageIcon,
  LayoutGrid,
  Link2,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { SiteSettingsPayload } from "@/lib/site-config";

export type SettingsModuleId =
  | "general"
  | "navigation"
  | "homepage"
  | "intro"
  | "featured"
  | "stats"
  | "about"
  | "pages";

export type SettingsModuleDef = {
  id: SettingsModuleId;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const SETTINGS_MODULES: SettingsModuleDef[] = [
  {
    id: "general",
    label: "Marka ve iletisim",
    description: "Site adi, iletisim ve sosyal medya",
    icon: Globe2,
  },
  {
    id: "navigation",
    label: "Navigasyon",
    description: "Header ve footer baglantilari",
    icon: Link2,
  },
  {
    id: "homepage",
    label: "Anasayfa",
    description: "Bloklar, hero, bolum metinleri, sertifika blogu",
    icon: LayoutGrid,
  },
  {
    id: "intro",
    label: "Tanıtım kartlari",
    description: "Hero sonrasi kisa kartlar",
    icon: ImageIcon,
  },
  {
    id: "featured",
    label: "One cikan icerik",
    description: "Proje, blog ve faaliyet secimleri",
    icon: Star,
  },
  {
    id: "stats",
    label: "Sayilar",
    description: "Otomatik veya manuel istatistikler",
    icon: BarChart3,
  },
  {
    id: "about",
    label: "Hakkımızda sayfası",
    description: "Kurumsal metinler",
    icon: Building2,
  },
  {
    id: "pages",
    label: "Public sayfalar",
    description: "Blog ve SSS metinleri",
    icon: FileText,
  },
];

const fieldBase =
  "w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";
const subCard = "rounded-2xl border border-slate-200/60 bg-slate-50/80 p-4 md:p-5";
const panelShell = "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm md:p-6";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export interface ProjectOption {
  id: number;
  name: string;
  slug: string;
}

export interface BlogOption {
  id: number;
  title: string;
  slug: string;
}

export interface ActivityOption {
  id: number;
  title: string;
  start_at: string;
  project?: { name: string };
}

export interface SiteSettingsPanelsProps {
  activeModule: SettingsModuleId;
  settings: SiteSettingsPayload;
  setSettings: Dispatch<SetStateAction<SiteSettingsPayload>>;
  disabled: boolean;
  uploadingField: string | null;
  projectOptions: ProjectOption[];
  blogOptions: BlogOption[];
  activityOptions: ActivityOption[];
  computedStats: Array<{ label: string; value: string; icon: string }>;
  uploadImage: (file: File, folder: string, onSuccess: (url: string) => void, fieldKey: string) => Promise<void>;
  updateStat: (index: number, field: "label" | "value" | "icon", value: string) => void;
  addStat: () => void;
  removeStat: (index: number) => void;
  updateNavLink: (
    key: "header_links" | "footer_quick_links" | "footer_project_links",
    index: number,
    field: "label" | "href",
    value: string,
  ) => void;
  addNavLink: (key: "header_links" | "footer_quick_links" | "footer_project_links") => void;
  removeNavLink: (key: "header_links" | "footer_quick_links" | "footer_project_links", index: number) => void;
  toggleFeaturedProject: (slug: string) => void;
  toggleFeaturedBlog: (slug: string) => void;
  toggleFeaturedActivity: (id: number) => void;
  moveBlock: (index: number, direction: -1 | 1) => void;
  toggleBlockVisibility: (
    key: "hero" | "intro" | "stats" | "projects" | "activities" | "about" | "blog" | "newsletter" | "certificate_verify",
  ) => void;
  updateIntroCard: (
    index: number,
    field: "title" | "description" | "image_url" | "cta_label" | "cta_href",
    value: string,
  ) => void;
  homepageBlockLabels: Record<
    "hero" | "intro" | "stats" | "projects" | "activities" | "about" | "blog" | "newsletter" | "certificate_verify",
    string
  >;
}

export function SettingsModuleNav({
  activeModule,
  onSelect,
}: {
  activeModule: SettingsModuleId;
  onSelect: (id: SettingsModuleId) => void;
}) {
  return (
    <nav className="flex flex-col gap-2" aria-label="Ayar modulleri">
      {SETTINGS_MODULES.map((mod) => {
        const Icon = mod.icon;
        const active = activeModule === mod.id;
        return (
          <button
            key={mod.id}
            type="button"
            onClick={() => onSelect(mod.id)}
            aria-current={active ? "page" : undefined}
            className={`group relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border px-3 py-3 text-left transition ${
              active
                ? "border-slate-300 bg-slate-950 text-white shadow-sm"
                : "border-transparent bg-transparent hover:border-slate-200 hover:bg-slate-50"
            }`}
          >
            {active ? <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-emerald-400" /> : null}
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-white"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className={`block text-sm font-semibold ${active ? "text-white" : "text-slate-800"}`}>
                {mod.label}
              </span>
              <span className={`mt-0.5 block text-xs leading-snug ${active ? "text-slate-300" : "text-slate-500"}`}>
                {mod.description}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function SiteSettingsPanels(props: SiteSettingsPanelsProps) {
  const {
    activeModule,
    settings,
    setSettings,
    disabled,
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
  } = props;

  if (activeModule === "general") {
    return (
      <div className={`${panelShell} space-y-6`}>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Marka ve iletisim</h2>
          <p className="mt-1 text-sm text-slate-500">Kurumsal kimlik ve ziyaretcilerin sizi bulmasi icin temel bilgiler.</p>
        </div>
        <div className={subCard}>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Genel</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Site adi">
              <input
                disabled={disabled}
                value={settings.general.site_name}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, general: { ...c.general, site_name: e.target.value } }))
                }
                className={fieldBase}
                placeholder="Ornek: KADEME"
              />
            </Field>
            <Field label="Site slogani">
              <input
                disabled={disabled}
                value={settings.general.site_tagline}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, general: { ...c.general, site_tagline: e.target.value } }))
                }
                className={fieldBase}
                placeholder="Kisa slogan"
              />
            </Field>
          </div>
        </div>
        <div className={subCard}>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Iletisim</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="E-posta">
              <input
                disabled={disabled}
                value={settings.contact.contact_email}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, contact: { ...c.contact, contact_email: e.target.value } }))
                }
                className={fieldBase}
                type="email"
              />
            </Field>
            <Field label="Telefon">
              <input
                disabled={disabled}
                value={settings.contact.contact_phone}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, contact: { ...c.contact, contact_phone: e.target.value } }))
                }
                className={fieldBase}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Adres">
              <textarea
                disabled={disabled}
                value={settings.contact.contact_address}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, contact: { ...c.contact, contact_address: e.target.value } }))
                }
                rows={4}
                className={fieldBase}
              />
            </Field>
          </div>
        </div>
        <div className={subCard}>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Sosyal medya</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Instagram">
              <input
                disabled={disabled}
                value={settings.social_media.instagram_url}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    social_media: { ...c.social_media, instagram_url: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="X / Twitter">
              <input
                disabled={disabled}
                value={settings.social_media.twitter_url}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    social_media: { ...c.social_media, twitter_url: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="YouTube">
              <input
                disabled={disabled}
                value={settings.social_media.youtube_url}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    social_media: { ...c.social_media, youtube_url: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="LinkedIn">
              <input
                disabled={disabled}
                value={settings.social_media.linkedin_url}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    social_media: { ...c.social_media, linkedin_url: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field
              label="Sosyal paylasim webhook"
              hint="Duyuru veya etkinlik panelinden paylasim tetiklemek icin (Make, Zapier, Buffer vb.)."
            >
              <input
                disabled={disabled}
                value={settings.social_media.sharing_webhook_url ?? ""}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    social_media: { ...c.social_media, sharing_webhook_url: e.target.value },
                  }))
                }
                className={fieldBase}
                placeholder="https://..."
              />
            </Field>
          </div>
        </div>
      </div>
    );
  }

  if (activeModule === "navigation") {
    return (
      <div className={`${panelShell} space-y-6`}>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Navigasyon</h2>
          <p className="mt-1 text-sm text-slate-500">Header ve footer baglantilari; public sitede gorunen yollar.</p>
        </div>
        <div className={subCard}>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Giris / basvuru etiketleri</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Giris butonu metni">
              <input
                disabled={disabled}
                value={settings.navigation.header_login_label}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    navigation: { ...c.navigation, header_login_label: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="Basvuru butonu metni">
              <input
                disabled={disabled}
                value={settings.navigation.header_register_label}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    navigation: { ...c.navigation, header_register_label: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={subCard}>
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Header linkleri</h3>
              <button
                disabled={disabled}
                onClick={() => addNavLink("header_links")}
                type="button"
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 disabled:opacity-50"
              >
                + Link
              </button>
            </div>
            <div className="space-y-3">
              {settings.navigation.header_links.map((link, index) => (
                <div
                  key={`header-link-${index}`}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200/80 bg-white p-3 md:grid-cols-[1fr_1.2fr_auto]"
                >
                  <input
                    disabled={disabled}
                    value={link.label}
                    onChange={(e) => updateNavLink("header_links", index, "label", e.target.value)}
                    className={fieldBase}
                    placeholder="Etiket"
                  />
                  <input
                    disabled={disabled}
                    value={link.href}
                    onChange={(e) => updateNavLink("header_links", index, "href", e.target.value)}
                    className={fieldBase}
                    placeholder="/yol"
                  />
                  <button
                    disabled={disabled}
                    onClick={() => removeNavLink("header_links", index)}
                    type="button"
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className={subCard}>
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Footer kurumsal</h3>
              <button
                disabled={disabled}
                onClick={() => addNavLink("footer_quick_links")}
                type="button"
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 disabled:opacity-50"
              >
                + Link
              </button>
            </div>
            <div className="space-y-3">
              {settings.navigation.footer_quick_links.map((link, index) => (
                <div
                  key={`footer-quick-${index}`}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200/80 bg-white p-3 md:grid-cols-[1fr_1.2fr_auto]"
                >
                  <input
                    disabled={disabled}
                    value={link.label}
                    onChange={(e) => updateNavLink("footer_quick_links", index, "label", e.target.value)}
                    className={fieldBase}
                    placeholder="Etiket"
                  />
                  <input
                    disabled={disabled}
                    value={link.href}
                    onChange={(e) => updateNavLink("footer_quick_links", index, "href", e.target.value)}
                    className={fieldBase}
                    placeholder="/yol"
                  />
                  <button
                    disabled={disabled}
                    onClick={() => removeNavLink("footer_quick_links", index)}
                    type="button"
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between gap-2 border-t border-slate-200/60 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">Footer proje linkleri</h3>
              <button
                disabled={disabled}
                onClick={() => addNavLink("footer_project_links")}
                type="button"
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 disabled:opacity-50"
              >
                + Link
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {settings.navigation.footer_project_links.map((link, index) => (
                <div
                  key={`footer-proj-${index}`}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200/80 bg-white p-3 md:grid-cols-[1fr_1.2fr_auto]"
                >
                  <input
                    disabled={disabled}
                    value={link.label}
                    onChange={(e) => updateNavLink("footer_project_links", index, "label", e.target.value)}
                    className={fieldBase}
                    placeholder="Etiket"
                  />
                  <input
                    disabled={disabled}
                    value={link.href}
                    onChange={(e) => updateNavLink("footer_project_links", index, "href", e.target.value)}
                    className={fieldBase}
                    placeholder="/yol"
                  />
                  <button
                    disabled={disabled}
                    onClick={() => removeNavLink("footer_project_links", index)}
                    type="button"
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeModule === "homepage") {
    return (
      <div className={`${panelShell} space-y-8`}>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Anasayfa</h2>
          <p className="mt-1 text-sm text-slate-500">Blok sirasi, hero ve blok basliklari / aciklamalari.</p>
        </div>
        <div className={subCard}>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Blok sirasi ve gorunurluk</h3>
          <p className="mb-4 text-xs text-slate-500">Ziyaretci anasayfasinda bolumlerin sirasi ve acik/kapali durumu.</p>
          <div className="space-y-2">
            {settings.homepage.block_order.map((block, index) => (
              <div
                key={block}
                className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-slate-900">{homepageBlockLabels[block]}</div>
                  <div className="text-xs text-slate-500">
                    {settings.homepage.block_visibility[block] ? "Gorunur" : "Gizli"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleBlockVisibility(block)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                  >
                    {settings.homepage.block_visibility[block] ? "Gizle" : "Goster"}
                  </button>
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    onClick={() => moveBlock(index, -1)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                  >
                    Yukari
                  </button>
                  <button
                    type="button"
                    disabled={disabled || index === settings.homepage.block_order.length - 1}
                    onClick={() => moveBlock(index, 1)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
                  >
                    Asagi
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={subCard}>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Hero</h3>
          <div className="space-y-4">
            <Field label="Badge">
              <input
                disabled={disabled}
                value={settings.homepage.hero_badge}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, homepage: { ...c.homepage, hero_badge: e.target.value } }))
                }
                className={fieldBase}
              />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              {(["hero_title_line_1", "hero_title_line_2", "hero_title_line_3", "hero_title_line_4"] as const).map(
                (key, i) => (
                  <Field key={key} label={`Hero satir ${i + 1}`}>
                    <input
                      disabled={disabled}
                      value={settings.homepage[key]}
                      onChange={(e) =>
                        setSettings((c) => ({ ...c, homepage: { ...c.homepage, [key]: e.target.value } }))
                      }
                      className={fieldBase}
                    />
                  </Field>
                ),
              )}
            </div>
            <Field label="Hero aciklama">
              <textarea
                disabled={disabled}
                value={settings.homepage.hero_description}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, hero_description: e.target.value },
                  }))
                }
                rows={4}
                className={fieldBase}
              />
            </Field>
            <Field label="Hero arka plan URL">
              <input
                disabled={disabled}
                value={settings.homepage.hero_background_image_url}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, hero_background_image_url: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
            <label
              className={`inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-900 ${
                disabled ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {uploadingField === "hero_background_image_url" ? "Yukleniyor..." : "Gorsel yukle"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={disabled}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void uploadImage(file, "homepage", (url) =>
                    setSettings((c) => ({
                      ...c,
                      homepage: { ...c.homepage, hero_background_image_url: url },
                    })),
                    "hero_background_image_url",
                  );
                  event.target.value = "";
                }}
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Birincil buton metni">
                <input
                  disabled={disabled}
                  value={settings.homepage.hero_primary_label}
                  onChange={(e) =>
                    setSettings((c) => ({
                      ...c,
                      homepage: { ...c.homepage, hero_primary_label: e.target.value },
                    }))
                  }
                  className={fieldBase}
                />
              </Field>
              <Field label="Birincil buton linki">
                <input
                  disabled={disabled}
                  value={settings.homepage.hero_primary_href}
                  onChange={(e) =>
                    setSettings((c) => ({
                      ...c,
                      homepage: { ...c.homepage, hero_primary_href: e.target.value },
                    }))
                  }
                  className={fieldBase}
                />
              </Field>
              <Field label="Ikincil buton metni">
                <input
                  disabled={disabled}
                  value={settings.homepage.hero_secondary_label}
                  onChange={(e) =>
                    setSettings((c) => ({
                      ...c,
                      homepage: { ...c.homepage, hero_secondary_label: e.target.value },
                    }))
                  }
                  className={fieldBase}
                />
              </Field>
              <Field label="Ikincil buton linki">
                <input
                  disabled={disabled}
                  value={settings.homepage.hero_secondary_href}
                  onChange={(e) =>
                    setSettings((c) => ({
                      ...c,
                      homepage: { ...c.homepage, hero_secondary_href: e.target.value },
                    }))
                  }
                  className={fieldBase}
                />
              </Field>
            </div>
          </div>
        </div>
        <div className={subCard}>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Bolum basliklari ve aciklamalari</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Projeler basligi">
              <input
                disabled={disabled}
                value={settings.homepage.projects_title}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, projects_title: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="Faaliyetler basligi">
              <input
                disabled={disabled}
                value={settings.homepage.activities_title}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, activities_title: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="Hakkımızda teaser başlığı">
              <input
                disabled={disabled}
                value={settings.homepage.about_teaser_title}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, about_teaser_title: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="Blog basligi">
              <input
                disabled={disabled}
                value={settings.homepage.blog_title}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, blog_title: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="E-bulten basligi">
              <input
                disabled={disabled}
                value={settings.homepage.newsletter_title}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, newsletter_title: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
          </div>
          <div className="mt-4 space-y-4">
            <Field label="Projeler aciklamasi">
              <textarea
                disabled={disabled}
                value={settings.homepage.projects_description}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, projects_description: e.target.value },
                  }))
                }
                rows={3}
                className={fieldBase}
              />
            </Field>
            <Field label="Faaliyetler aciklamasi">
              <textarea
                disabled={disabled}
                value={settings.homepage.activities_description}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, activities_description: e.target.value },
                  }))
                }
                rows={3}
                className={fieldBase}
              />
            </Field>
            <Field label="Hakkımızda teaser açıklaması">
              <textarea
                disabled={disabled}
                value={settings.homepage.about_teaser_description}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, about_teaser_description: e.target.value },
                  }))
                }
                rows={3}
                className={fieldBase}
              />
            </Field>
            <Field label="About teaser gorsel URL">
              <input
                disabled={disabled}
                value={settings.homepage.about_teaser_image_url}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, about_teaser_image_url: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
            <label
              className={`inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-900 ${
                disabled ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {uploadingField === "about_teaser_image_url" ? "Yukleniyor..." : "About gorseli yukle"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={disabled}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void uploadImage(file, "homepage", (url) =>
                    setSettings((c) => ({
                      ...c,
                      homepage: { ...c.homepage, about_teaser_image_url: url },
                    })),
                    "about_teaser_image_url",
                  );
                  event.target.value = "";
                }}
              />
            </label>
            <Field label="Blog aciklamasi">
              <textarea
                disabled={disabled}
                value={settings.homepage.blog_description}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, blog_description: e.target.value },
                  }))
                }
                rows={3}
                className={fieldBase}
              />
            </Field>
            <Field label="E-bulten aciklamasi">
              <textarea
                disabled={disabled}
                value={settings.homepage.newsletter_description}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, newsletter_description: e.target.value },
                  }))
                }
                rows={3}
                className={fieldBase}
              />
            </Field>
            <Field label="Footer aciklamasi">
              <textarea
                disabled={disabled}
                value={settings.homepage.footer_description}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, footer_description: e.target.value },
                  }))
                }
                rows={3}
                className={fieldBase}
              />
            </Field>
            <Field label="Footer telif">
              <textarea
                disabled={disabled}
                value={settings.homepage.footer_copyright}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, footer_copyright: e.target.value },
                  }))
                }
                rows={2}
                className={fieldBase}
              />
            </Field>
            <Field
              label="Aylik motivasyon (ogrenci / mezun paneli)"
              hint="Dashboard kartlarinda gosterilebilir."
            >
              <textarea
                disabled={disabled}
                value={settings.homepage.monthly_motivation_message ?? ""}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, monthly_motivation_message: e.target.value },
                  }))
                }
                rows={3}
                className={fieldBase}
              />
            </Field>
          </div>
        </div>
        <div className={subCard}>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Sertifika dogrulama blogu</h3>
          <p className="mb-4 text-xs text-slate-500">
            Anasayfadaki sertifika blogu gorunurken kullanilan metinler (<code className="text-[11px]">certificate_verify</code>{" "}
            blogu).
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Baslik">
              <input
                disabled={disabled}
                value={settings.homepage.certificate_verify_title}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, certificate_verify_title: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="CTA metni">
              <input
                disabled={disabled}
                value={settings.homepage.certificate_verify_cta_label}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, certificate_verify_cta_label: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="CTA linki" hint="Genelde /certificates/verify">
              <input
                disabled={disabled}
                value={settings.homepage.certificate_verify_cta_href}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, certificate_verify_cta_href: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Aciklama">
              <textarea
                disabled={disabled}
                value={settings.homepage.certificate_verify_description}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    homepage: { ...c.homepage, certificate_verify_description: e.target.value },
                  }))
                }
                rows={3}
                className={fieldBase}
              />
            </Field>
          </div>
        </div>
      </div>
    );
  }

  if (activeModule === "intro") {
    return (
      <div className={`${panelShell} space-y-6`}>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tanıtım kartlari</h2>
          <p className="mt-1 text-sm text-slate-500">Hero sonrasi kisa kartlar; baslik, metin, gorsel ve CTA.</p>
        </div>
        <div className="space-y-4">
          {settings.homepage.intro_cards.map((card, index) => (
            <div key={`intro-card-${index}`} className={subCard}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">Kart {index + 1}</div>
              <div className="grid gap-4">
                <Field label="Baslik">
                  <input
                    disabled={disabled}
                    value={card.title}
                    onChange={(e) => updateIntroCard(index, "title", e.target.value)}
                    className={fieldBase}
                  />
                </Field>
                <Field label="Aciklama">
                  <textarea
                    disabled={disabled}
                    value={card.description}
                    onChange={(e) => updateIntroCard(index, "description", e.target.value)}
                    rows={3}
                    className={fieldBase}
                  />
                </Field>
                <Field label="Gorsel URL">
                  <input
                    disabled={disabled}
                    value={card.image_url}
                    onChange={(e) => updateIntroCard(index, "image_url", e.target.value)}
                    className={fieldBase}
                  />
                </Field>
                <label
                  className={`inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-900 ${
                    disabled ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {uploadingField === `intro-${index}` ? "Yukleniyor..." : "Kart gorseli yukle"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={disabled}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void uploadImage(file, "homepage", (url) => updateIntroCard(index, "image_url", url), `intro-${index}`);
                      event.target.value = "";
                    }}
                  />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Buton metni">
                    <input
                      disabled={disabled}
                      value={card.cta_label}
                      onChange={(e) => updateIntroCard(index, "cta_label", e.target.value)}
                      className={fieldBase}
                    />
                  </Field>
                  <Field label="Buton linki">
                    <input
                      disabled={disabled}
                      value={card.cta_href}
                      onChange={(e) => updateIntroCard(index, "cta_href", e.target.value)}
                      className={fieldBase}
                    />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeModule === "featured") {
    const safeProjects = Array.isArray(projectOptions) ? projectOptions : [];
    const safeBlogs = Array.isArray(blogOptions) ? blogOptions : [];
    const safeActivities = Array.isArray(activityOptions) ? activityOptions : [];

    return (
      <div className={`${panelShell} space-y-6`}>
        <div>
          <h2 className="text-lg font-bold text-slate-900">One cikan icerikler</h2>
          <p className="mt-1 text-sm text-slate-500">
            Anasayfada one cikarilacak proje, blog ve faaliyetler. Faaliyet listesi public{" "}
            <code className="rounded bg-slate-100 px-1 text-[11px]">GET /activities</code> cevabindan gelir (sayfali
            JSON&apos;da <code className="rounded bg-slate-100 px-1 text-[11px]">data</code> dizisi kullanilir).
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className={subCard}>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Projeler</h3>
            <div className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto pr-1">
              {safeProjects.length === 0 ? (
                <p className="text-xs text-slate-500">Liste bos veya yuklenemedi.</p>
              ) : null}
              {safeProjects.map((project) => {
                const checked = settings.homepage.featured_project_slugs.includes(project.slug);
                return (
                  <label
                    key={project.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={checked}
                      onChange={() => toggleFeaturedProject(project.slug)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="truncate">{project.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className={subCard}>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Blog</h3>
            <div className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto pr-1">
              {safeBlogs.length === 0 ? (
                <p className="text-xs text-slate-500">Liste bos veya yuklenemedi.</p>
              ) : null}
              {safeBlogs.map((blog) => {
                const checked = settings.homepage.featured_blog_slugs.includes(blog.slug);
                return (
                  <label
                    key={blog.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={checked}
                      onChange={() => toggleFeaturedBlog(blog.slug)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="truncate">{blog.title}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className={subCard}>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Faaliyetler</h3>
            <div className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto pr-1">
              {safeActivities.length === 0 ? (
                <p className="text-xs text-slate-500">Liste bos veya yuklenemedi.</p>
              ) : null}
              {safeActivities.map((activity) => {
                const checked = settings.homepage.featured_activity_ids.includes(activity.id);
                return (
                  <label
                    key={activity.id}
                    className="flex cursor-pointer gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={checked}
                      onChange={() => toggleFeaturedActivity(activity.id)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
                    />
                    <span>
                      <span className="block font-medium">{activity.title}</span>
                      <span className="block text-xs text-slate-500">
                        {activity.project?.name || "Program"} · {new Date(activity.start_at).toLocaleDateString("tr-TR")}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeModule === "stats") {
    return (
      <div className={`${panelShell} space-y-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Sayilarla veriler</h2>
            <p className="mt-1 text-sm text-slate-500">Otomatik sayim veya manuel degerler.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              disabled={disabled}
              value={settings.homepage.stats_mode}
              onChange={(e) =>
                setSettings((c) => ({
                  ...c,
                  homepage: {
                    ...c.homepage,
                    stats_mode: e.target.value as "auto" | "manual",
                  },
                }))
              }
              className={`${fieldBase} w-auto min-w-[10rem]`}
            >
              <option value="auto">Otomatik (veritabani)</option>
              <option value="manual">Manuel</option>
            </select>
            <button
              disabled={disabled}
              onClick={addStat}
              type="button"
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 disabled:opacity-50"
            >
              Alan ekle
            </button>
          </div>
        </div>
        {settings.homepage.stats_mode === "auto" ? (
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4">
            <p className="mb-4 text-sm text-emerald-900">
              Bu modda sayilar sunucuda hesaplanir. Manuel moda gecerek ozel degerler girebilirsiniz.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {computedStats.map((stat, index) => (
                <div key={`${stat.label}-${index}`} className="rounded-xl border border-white/80 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stat.label}</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {settings.homepage.stats_mode === "manual" ? (
          <div className="space-y-3">
            {settings.homepage.stats.map((stat, index) => (
              <div
                key={`${stat.label}-${index}`}
                className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 md:grid-cols-[1.2fr_1fr_1fr_auto]"
              >
                <input
                  disabled={disabled}
                  value={stat.label}
                  onChange={(e) => updateStat(index, "label", e.target.value)}
                  className={fieldBase}
                  placeholder="Baslik"
                />
                <input
                  disabled={disabled}
                  value={stat.value}
                  onChange={(e) => updateStat(index, "value", e.target.value)}
                  className={fieldBase}
                  placeholder="Deger"
                />
                <select
                  disabled={disabled}
                  value={stat.icon}
                  onChange={(e) => updateStat(index, "icon", e.target.value)}
                  className={fieldBase}
                >
                  <option value="users">Users</option>
                  <option value="trophy">Trophy</option>
                  <option value="calendar">Calendar</option>
                  <option value="globe">Globe</option>
                </select>
                <button
                  disabled={disabled}
                  onClick={() => removeStat(index)}
                  type="button"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (activeModule === "about") {
    return (
      <div className={`${panelShell} space-y-6`}>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Hakkımızda sayfası</h2>
          <p className="mt-1 text-sm text-slate-500">Public /about sayfasindaki kurumsal metinler.</p>
        </div>
        <div className={subCard}>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Ust bolum</h3>
          <div className="space-y-4">
            <Field label="Hero baslik">
              <input
                disabled={disabled}
                value={settings.about.hero_title}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, about: { ...c.about, hero_title: e.target.value } }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="Hero aciklama">
              <textarea
                disabled={disabled}
                value={settings.about.hero_description}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    about: { ...c.about, hero_description: e.target.value },
                  }))
                }
                rows={3}
                className={fieldBase}
              />
            </Field>
          </div>
        </div>
        <div className={subCard}>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Misyon ve vizyon</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Misyon basligi">
              <input
                disabled={disabled}
                value={settings.about.mission_title}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    about: { ...c.about, mission_title: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="Vizyon basligi">
              <input
                disabled={disabled}
                value={settings.about.vision_title}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    about: { ...c.about, vision_title: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
          </div>
          <div className="mt-4 space-y-4">
            <Field label="Misyon metni">
              <textarea
                disabled={disabled}
                value={settings.about.mission_text}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    about: { ...c.about, mission_text: e.target.value },
                  }))
                }
                rows={3}
                className={fieldBase}
              />
            </Field>
            <Field label="Vizyon metni">
              <textarea
                disabled={disabled}
                value={settings.about.vision_text}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    about: { ...c.about, vision_text: e.target.value },
                  }))
                }
                rows={3}
                className={fieldBase}
              />
            </Field>
          </div>
        </div>
        <div className={subCard}>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Ekosistem ve teaserlar</h3>
          <Field label="Ekosistem basligi">
            <input
              disabled={disabled}
              value={settings.about.ecosystem_title}
              onChange={(e) =>
                setSettings((c) => ({
                  ...c,
                  about: { ...c.about, ecosystem_title: e.target.value },
                }))
              }
              className={fieldBase}
            />
          </Field>
          <div className="mt-4">
            <Field label="Ekosistem aciklamasi">
              <textarea
                disabled={disabled}
                value={settings.about.ecosystem_description}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    about: { ...c.about, ecosystem_description: e.target.value },
                  }))
                }
                rows={3}
                className={fieldBase}
              />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="SSS teaser baslik">
              <input
                disabled={disabled}
                value={settings.about.faq_teaser_title}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    about: { ...c.about, faq_teaser_title: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="Blog teaser baslik">
              <input
                disabled={disabled}
                value={settings.about.blog_teaser_title}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    about: { ...c.about, blog_teaser_title: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="Faaliyet teaser baslik">
              <input
                disabled={disabled}
                value={settings.about.activities_teaser_title}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    about: { ...c.about, activities_teaser_title: e.target.value },
                  }))
                }
                className={fieldBase}
              />
            </Field>
          </div>
          <div className="mt-4 space-y-4">
            <Field label="SSS teaser metni">
              <textarea
                disabled={disabled}
                value={settings.about.faq_teaser_text}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    about: { ...c.about, faq_teaser_text: e.target.value },
                  }))
                }
                rows={2}
                className={fieldBase}
              />
            </Field>
            <Field label="Blog teaser metni">
              <textarea
                disabled={disabled}
                value={settings.about.blog_teaser_text}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    about: { ...c.about, blog_teaser_text: e.target.value },
                  }))
                }
                rows={2}
                className={fieldBase}
              />
            </Field>
            <Field label="Faaliyet teaser metni">
              <textarea
                disabled={disabled}
                value={settings.about.activities_teaser_text}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    about: { ...c.about, activities_teaser_text: e.target.value },
                  }))
                }
                rows={2}
                className={fieldBase}
              />
            </Field>
          </div>
        </div>
        <div className={subCard}>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Yolculuk</h3>
          <Field label="Baslik">
            <input
              disabled={disabled}
              value={settings.about.journey_title}
              onChange={(e) =>
                setSettings((c) => ({
                  ...c,
                  about: { ...c.about, journey_title: e.target.value },
                }))
              }
              className={fieldBase}
            />
          </Field>
          <div className="mt-4">
            <Field label="Metin">
              <textarea
                disabled={disabled}
                value={settings.about.journey_text}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    about: { ...c.about, journey_text: e.target.value },
                  }))
                }
                rows={2}
                className={fieldBase}
              />
            </Field>
          </div>
        </div>
      </div>
    );
  }

  if (activeModule === "pages") {
    return (
      <div className={`${panelShell} space-y-6`}>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Public sayfa metinleri</h2>
          <p className="mt-1 text-sm text-slate-500">Blog ve SSS sayfalarindaki baslik, aciklama ve CTA metinleri.</p>
        </div>
        <div className={subCard}>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Blog liste ve detay</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Rozet metni">
              <input
                disabled={disabled}
                value={settings.blog_page.badge_label}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, blog_page: { ...c.blog_page, badge_label: e.target.value } }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="Sayfa basligi">
              <input
                disabled={disabled}
                value={settings.blog_page.title}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, blog_page: { ...c.blog_page, title: e.target.value } }))
                }
                className={fieldBase}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Sayfa aciklamasi">
              <textarea
                disabled={disabled}
                value={settings.blog_page.description}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, blog_page: { ...c.blog_page, description: e.target.value } }))
                }
                rows={3}
                className={fieldBase}
              />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Arama placeholder">
              <input
                disabled={disabled}
                value={settings.blog_page.search_placeholder}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, blog_page: { ...c.blog_page, search_placeholder: e.target.value } }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="Devam linki">
              <input
                disabled={disabled}
                value={settings.blog_page.read_more_label}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, blog_page: { ...c.blog_page, read_more_label: e.target.value } }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="Detay rozeti">
              <input
                disabled={disabled}
                value={settings.blog_page.detail_badge_label}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, blog_page: { ...c.blog_page, detail_badge_label: e.target.value } }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="Detay geri linki">
              <input
                disabled={disabled}
                value={settings.blog_page.detail_back_label}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, blog_page: { ...c.blog_page, detail_back_label: e.target.value } }))
                }
                className={fieldBase}
              />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Bos liste metni">
              <textarea
                disabled={disabled}
                value={settings.blog_page.empty_text}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, blog_page: { ...c.blog_page, empty_text: e.target.value } }))
                }
                rows={2}
                className={fieldBase}
              />
            </Field>
            <Field label="Detay bos icerik metni">
              <textarea
                disabled={disabled}
                value={settings.blog_page.detail_empty_content}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, blog_page: { ...c.blog_page, detail_empty_content: e.target.value } }))
                }
                rows={2}
                className={fieldBase}
              />
            </Field>
          </div>
        </div>
        <div className={subCard}>
          <h3 className="mb-4 text-sm font-semibold text-slate-800">SSS sayfasi</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Sayfa basligi">
              <input
                disabled={disabled}
                value={settings.faq_page.title}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, faq_page: { ...c.faq_page, title: e.target.value } }))
                }
                className={fieldBase}
              />
            </Field>
            <Field label="Iletisim CTA metni">
              <input
                disabled={disabled}
                value={settings.faq_page.contact_cta_label}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, faq_page: { ...c.faq_page, contact_cta_label: e.target.value } }))
                }
                className={fieldBase}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Sayfa aciklamasi">
              <textarea
                disabled={disabled}
                value={settings.faq_page.description}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, faq_page: { ...c.faq_page, description: e.target.value } }))
                }
                rows={3}
                className={fieldBase}
              />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Bos liste metni">
              <textarea
                disabled={disabled}
                value={settings.faq_page.empty_text}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, faq_page: { ...c.faq_page, empty_text: e.target.value } }))
                }
                rows={2}
                className={fieldBase}
              />
            </Field>
            <Field label="Iletisim kutusu basligi">
              <input
                disabled={disabled}
                value={settings.faq_page.contact_title}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, faq_page: { ...c.faq_page, contact_title: e.target.value } }))
                }
                className={fieldBase}
              />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Iletisim kutusu aciklamasi">
              <textarea
                disabled={disabled}
                value={settings.faq_page.contact_description}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, faq_page: { ...c.faq_page, contact_description: e.target.value } }))
                }
                rows={2}
                className={fieldBase}
              />
            </Field>
            <Field label="Iletisim CTA linki">
              <input
                disabled={disabled}
                value={settings.faq_page.contact_cta_href}
                onChange={(e) =>
                  setSettings((c) => ({ ...c, faq_page: { ...c.faq_page, contact_cta_href: e.target.value } }))
                }
                className={fieldBase}
              />
            </Field>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
