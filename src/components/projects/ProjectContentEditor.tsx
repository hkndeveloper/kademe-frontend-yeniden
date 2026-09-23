"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, Image as ImageIcon, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { isAxiosError } from "axios";
import Image from "next/image";
import Link from "next/link";
import api from "@/lib/api/axios";
import { usePermissions } from "@/hooks/usePermissions";
import { isPeriodArchiveMode, periodHasWriteCapability, PeriodArchiveModeNotice, type PeriodOption } from "@/components/shared/ProjectPeriodFilters";

interface EditableProjectContent {
  name?: string;
  slug?: string;
  type?: string;
  special_modules?: string[] | null;
  applicable_special_modules?: string[];
  special_modules_inherited?: boolean;
  short_description: string;
  description: string;
  cover_image_path: string;
  gallery_paths: ProjectGalleryItem[];
}

interface ProjectGalleryItem {
  path: string;
  caption: string;
  year: string;
  period_id: number | "";
}

interface ProjectPreview {
  id: number;
  name: string;
  slug?: string;
  cover_image?: string | null;
  gallery?: string[];
  gallery_items?: Array<ProjectGalleryItem & { url?: string | null; period_name?: string | null }>;
  periods?: PeriodOption[];
}

interface ProjectContentResponse {
  project: ProjectPreview;
  editable: EditableProjectContent;
  capabilities: {
    view_structure: boolean;
    update_structure: boolean;
    view_public_content: boolean;
    update_public_content: boolean;
    update_gallery: boolean;
    view_application: boolean;
  };
  special_module_options?: Array<{ key: string; label: string }>;
}

type PanelContentBasePath = "/panel";

function panelContentApiRoot(): "/panel" {
  return "/panel";
}

function projectListHref(base: PanelContentBasePath): string {
  return `${base}/projects`;
}

interface ProjectContentEditorProps {
  projectId: string;
  panelBasePath: PanelContentBasePath;
  periodId?: string;
  /** When true, form is view-only (no save, uploads, or field edits). */
  readOnly?: boolean;
}

const inputClass = "panel-control w-full read-only:cursor-default read-only:opacity-90";
const textareaClass = "panel-textarea w-full read-only:cursor-default read-only:opacity-90";
const compactActionClass = "panel-button panel-button-secondary";

const emptyForm: EditableProjectContent = {
  name: "",
  slug: "",
  type: "",
  short_description: "",
  description: "",
  cover_image_path: "",
  gallery_paths: [{ path: "", caption: "", year: "", period_id: "" }],
  special_modules: null,
  applicable_special_modules: [],
  special_modules_inherited: true,
};

function emptyGalleryItem(path = ""): ProjectGalleryItem {
  return {
    path,
    caption: "",
    year: "",
    period_id: "",
  };
}

function normalizeGalleryItems(items: unknown): ProjectGalleryItem[] {
  if (!Array.isArray(items)) return [emptyGalleryItem()];
  const normalized = items
    .map((item) => {
      if (typeof item === "string") {
        return emptyGalleryItem(item);
      }
      if (!item || typeof item !== "object") {
        return null;
      }
      const value = item as Partial<ProjectGalleryItem> & { url?: string | null };
      return {
        path: String(value.path ?? value.url ?? ""),
        caption: String(value.caption ?? ""),
        year: String(value.year ?? ""),
        period_id: value.period_id ? Number(value.period_id) : "",
      };
    })
    .filter((item): item is ProjectGalleryItem => item !== null);

  return normalized.length > 0 ? normalized : [emptyGalleryItem()];
}

export function ProjectContentEditor({ projectId, panelBasePath, periodId = "", readOnly = false }: ProjectContentEditorProps) {
  const { hasPermission, canAccessProject } = usePermissions();
  const numericProjectId = Number(projectId);
  const canAccessIntake = Number.isFinite(numericProjectId) && (
    (hasPermission("applications.intake.view") && canAccessProject("applications.intake.view", numericProjectId)) ||
    (hasPermission("applications.intake.manage") && canAccessProject("applications.intake.manage", numericProjectId))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<ProjectPreview | null>(null);
  const [form, setForm] = useState<EditableProjectContent>(emptyForm);
  const [capabilities, setCapabilities] = useState<ProjectContentResponse["capabilities"] | null>(null);
  const [specialModuleOptions, setSpecialModuleOptions] = useState<Array<{ key: string; label: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const selectedPeriod = project?.periods?.find((period) => String(period.id) === periodId);
  const periodReadOnly = Boolean(periodId) && !periodHasWriteCapability(selectedPeriod, "configure_period");
  const canUpdateStructure = !readOnly && !periodReadOnly && Boolean(capabilities?.update_structure);
  const canUpdatePublicContent = !readOnly && !periodReadOnly && Boolean(capabilities?.update_public_content || capabilities?.update_structure);
  const canUpdateGallery = !readOnly && !periodReadOnly && Boolean(capabilities?.update_gallery || capabilities?.update_structure);
  const canSaveAnything = canUpdateStructure || canUpdatePublicContent || canUpdateGallery;

  useEffect(() => {
    const loadProject = async () => {
      try {
        const root = panelContentApiRoot();
        const response = await api.get<ProjectContentResponse>(`${root}/projects/${projectId}/content`);
        setProject(response.data.project);
        setCapabilities(response.data.capabilities);
        setSpecialModuleOptions(response.data.special_module_options ?? []);
        setForm({
          name: response.data.editable.name ?? response.data.project.name ?? "",
          slug: response.data.editable.slug ?? "",
          type: response.data.editable.type ?? "",
          special_modules: response.data.editable.special_modules ?? null,
          applicable_special_modules: response.data.editable.applicable_special_modules ?? [],
          special_modules_inherited: response.data.editable.special_modules_inherited ?? true,
          short_description: response.data.editable.short_description ?? "",
          description: response.data.editable.description ?? "",
          cover_image_path: response.data.editable.cover_image_path ?? "",
          gallery_paths: normalizeGalleryItems(response.data.editable.gallery_paths),
        });
      } catch (error) {
        console.error("Proje icerigi yuklenemedi", error);
        setErrorMessage("Proje icerigi yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadProject();
  }, [projectId, panelBasePath]);

  const updateGalleryItem = (index: number, field: keyof ProjectGalleryItem, value: string | number | "") => {
    if (!canUpdateGallery) return;
    setForm((current) => ({
      ...current,
      gallery_paths: current.gallery_paths.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addGalleryItem = () => {
    if (!canUpdateGallery) return;
    setForm((current) => ({
      ...current,
      gallery_paths: [...current.gallery_paths, emptyGalleryItem()],
    }));
  };

  const removeGalleryItem = (index: number) => {
    if (!canUpdateGallery) return;
    setForm((current) => ({
      ...current,
      gallery_paths: current.gallery_paths.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const uploadImage = async (
    file: File,
    folder: string,
    onSuccess: (url: string) => void,
    fieldKey: string,
    allowed: boolean,
  ) => {
    if (!allowed) return;
    setUploadingField(fieldKey);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const response = await api.post<{ url: string }>(`${panelContentApiRoot()}/media/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      onSuccess(response.data.url);
    } catch (error) {
      console.error("Proje gorseli yuklenemedi", error);
      setErrorMessage("Proje gorseli yuklenemedi.");
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = async () => {
    if (!canSaveAnything) return;
    setMessage(null);
    setErrorMessage(null);

    if (canUpdateStructure && (!form.name?.trim() || !form.slug?.trim() || !form.type?.trim())) {
      setErrorMessage("Proje adi, slug ve proje tipi zorunludur.");
      return;
    }

    setSaving(true);

    try {
      const root = panelContentApiRoot();
      const galleryPaths = form.gallery_paths
          .filter((item) => item.path.trim())
          .map((item) => ({
            path: item.path.trim(),
            caption: item.caption.trim() || null,
            year: item.year.trim() || null,
            period_id: item.period_id || null,
          }));

      if (canUpdateStructure) {
        const response = await api.put<ProjectContentResponse & { message: string }>(`${root}/projects/${projectId}/content`, {
          ...form,
          gallery_paths: galleryPaths,
        });
        setProject(response.data.project);
        setForm((current) => ({
          ...current,
          special_modules: response.data.editable.special_modules ?? null,
          applicable_special_modules: response.data.editable.applicable_special_modules ?? [],
          special_modules_inherited: response.data.editable.special_modules_inherited ?? true,
          gallery_paths: normalizeGalleryItems(response.data.editable.gallery_paths),
        }));
        setMessage(response.data.message);
      } else {
        const operations: Array<Promise<unknown>> = [];
        if (canUpdatePublicContent) {
          operations.push(api.patch(`${root}/projects/${projectId}/public-content`, {
            short_description: form.short_description,
            description: form.description,
            cover_image_path: form.cover_image_path,
          }));
        }
        if (canUpdateGallery) {
          operations.push(api.put(`${root}/projects/${projectId}/gallery`, { gallery_paths: galleryPaths }));
        }
        await Promise.all(operations);
        setMessage("Projenin kamusal icerigi kaydedildi.");
      }
    } catch (error) {
      console.error("Proje icerigi kaydedilemedi", error);
      const responseMessage = isAxiosError(error)
        ? error.response?.data?.message ||
          Object.values(error.response?.data?.errors ?? {})
            .flat()
            .join(" ")
        : null;
      setErrorMessage(responseMessage || "Proje icerigi kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href={projectListHref(panelBasePath)} className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Proje listesine don
          </Link>
          <h1 className="text-3xl font-black text-slate-900">{project?.name || "Proje Icerigi"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bu ekran proje detay sayfasinda ve anasayfa baglantilarinda gorunen alanlari duzenler.</p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSaveAnything || saving}
          className="panel-button panel-button-primary"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Kaydet
        </button>
      </div>

      {!canSaveAnything ? (
        <div className="panel-notice border-amber-200 bg-amber-50 text-amber-800">
          Bu proje icin degistirebileceginiz bir icerik alani yok; alanlar salt okunurdur.
        </div>
      ) : null}
      {periodReadOnly ? <PeriodArchiveModeNotice period={selectedPeriod} /> : null}
      {periodReadOnly && !isPeriodArchiveMode(selectedPeriod) ? (
        <div className="panel-notice border-blue-200 bg-blue-50 text-blue-800">Kapanış hazırlığındaki dönemde proje içeriği değiştirilemez.</div>
      ) : null}

      {message ? <div className="panel-notice panel-notice-success">{message}</div> : null}
      {errorMessage ? <div className="panel-notice panel-notice-error">{errorMessage}</div> : null}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-8">
          <div className="panel-section-card space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Temel Bilgiler</h2>
            {capabilities?.view_structure ? (
              <>
                <input
                  readOnly={!canUpdateStructure}
                  value={form.name ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Proje adi"
                  className={inputClass}
                />
                <div className="panel-form-grid">
                  <input
                    readOnly={!canUpdateStructure}
                    value={form.slug ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                    placeholder="Slug"
                    className={inputClass}
                  />
                  <input
                    readOnly={!canUpdateStructure}
                    value={form.type ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                    placeholder="Proje tipi"
                    className={inputClass}
                  />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Projeye özel modüller</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        Bu seçim proje koordinatörü ve personelinin family izin şablonunu belirler. Varsayılan mod kullanıldığında seçim proje tipinden türetilir.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!canUpdateStructure || form.special_modules === null}
                      onClick={() => setForm((current) => ({
                        ...current,
                        special_modules: null,
                        special_modules_inherited: true,
                      }))}
                      className="panel-button panel-button-secondary shrink-0 disabled:opacity-40"
                    >
                      Tür varsayılanını kullan
                    </button>
                  </div>
                  <div className="mt-3 text-xs font-semibold text-indigo-700">
                    {form.special_modules === null ? "Proje tipi varsayılanı aktif" : "Özel metadata seçimi aktif"}
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {specialModuleOptions.map((option) => {
                      const selectedModules = form.special_modules ?? form.applicable_special_modules ?? [];
                      const checked = selectedModules.includes(option.key);

                      return (
                        <label key={option.key} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            disabled={!canUpdateStructure}
                            checked={checked}
                            onChange={(event) => {
                              const base = form.special_modules ?? form.applicable_special_modules ?? [];
                              const next = event.target.checked
                                ? [...new Set([...base, option.key])]
                                : base.filter((key) => key !== option.key);
                              setForm((current) => ({
                                ...current,
                                special_modules: next,
                                special_modules_inherited: false,
                              }));
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="panel-card-muted text-sm text-slate-600">
                Proje kimligi ve turu proje koordinatorlugu tarafindan yonetilir. Bu ekranda yalnizca kamusal tanitim alanlari duzenlenebilir.
              </div>
            )}
            <textarea
              readOnly={!canUpdatePublicContent}
              value={form.short_description}
              onChange={(event) => setForm((current) => ({ ...current, short_description: event.target.value }))}
              rows={3}
              placeholder="Kisa tanitim yazisi"
              className={textareaClass}
            />
            <textarea
              readOnly={!canUpdatePublicContent}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              rows={8}
              placeholder="Detayli proje aciklamasi"
              className={textareaClass}
            />
          </div>

          <div className="panel-section-card space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900">Galeri ve Gorseller</h2>
              <div className="flex items-center gap-3">
                <button onClick={addGalleryItem} type="button" disabled={!canUpdateGallery} className="panel-button panel-button-secondary disabled:opacity-40">
                  <Plus className="h-4 w-4" />
                  Alan Ekle
                </button>
                <label
                  className={`${compactActionClass} ${!canUpdateGallery ? "pointer-events-none opacity-40" : "cursor-pointer"}`}
                >
                  {uploadingField === "gallery-new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Galeri Yukle
                  <input
                    type="file"
                    disabled={!canUpdateGallery}
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void uploadImage(
                        file,
                        "projects",
                        (url) =>
                          setForm((current) => ({
                            ...current,
                            gallery_paths: [
                              ...current.gallery_paths.filter((item) => item.path.trim()),
                              emptyGalleryItem(url),
                            ],
                          })),
                        "gallery-new",
                        canUpdateGallery,
                      );
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            <input
              readOnly={!canUpdatePublicContent}
              value={form.cover_image_path}
              onChange={(event) => setForm((current) => ({ ...current, cover_image_path: event.target.value }))}
              placeholder="Kapak gorsel URL"
              className={inputClass}
            />
            <label
              className={`${compactActionClass} w-fit ${!canUpdatePublicContent ? "pointer-events-none opacity-40" : "cursor-pointer"}`}
            >
              {uploadingField === "cover_image_path" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Kapak gorseli yukle
              <input
                type="file"
                disabled={!canUpdatePublicContent}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void uploadImage(
                    file,
                    "projects",
                    (url) => setForm((current) => ({ ...current, cover_image_path: url })),
                    "cover_image_path",
                    canUpdatePublicContent,
                  );
                  event.target.value = "";
                }}
              />
            </label>
            <div className="space-y-3">
              {form.gallery_paths.map((item, index) => (
                <div key={`gallery-${index}`} className="panel-card-muted bg-white">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_140px_180px_auto_auto]">
                    <input
                      readOnly={!canUpdateGallery}
                      value={item.path}
                      onChange={(event) => updateGalleryItem(index, "path", event.target.value)}
                      placeholder={`Galeri gorsel URL ${index + 1}`}
                      className={inputClass}
                    />
                    <input
                      readOnly={!canUpdateGallery}
                      value={item.year}
                      onChange={(event) => updateGalleryItem(index, "year", event.target.value)}
                      placeholder="Yil"
                      className={inputClass}
                    />
                    <select
                      disabled={!canUpdateGallery}
                      value={item.period_id}
                      onChange={(event) => updateGalleryItem(index, "period_id", event.target.value ? Number(event.target.value) : "")}
                      className={inputClass}
                    >
                      <option value="">Donem yok</option>
                      {(project?.periods ?? []).map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.name}{period.status === "active" ? " (aktif)" : ""}
                        </option>
                      ))}
                    </select>
                    <label
                      className={`panel-button-icon ${!canUpdateGallery ? "pointer-events-none opacity-40" : "cursor-pointer"}`}
                    >
                      {uploadingField === `gallery-${index}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      <input
                        type="file"
                        disabled={!canUpdateGallery}
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          void uploadImage(file, "projects", (url) => updateGalleryItem(index, "path", url), `gallery-${index}`, canUpdateGallery);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      onClick={() => removeGalleryItem(index)}
                      type="button"
                      disabled={!canUpdateGallery}
                      className="panel-button-icon panel-table-action-danger disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    readOnly={!canUpdateGallery}
                    value={item.caption}
                    onChange={(event) => updateGalleryItem(index, "caption", event.target.value)}
                    placeholder="Gorsel basligi veya kisa aciklama"
                    className={`${inputClass} mt-3`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="panel-section-card flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <CalendarClock className="h-5 w-5 text-indigo-600" />
                Basvuru yonetimi ayri ekranda
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Basvuruyu kimin actigi, hangi donem icin acik oldugu, takvim, kontenjan ve mulakat akisi denetim kayitlariyla birlikte Basvuru Yonetimi ekranindan yonetilir.
              </p>
            </div>
            {canAccessIntake ? (
              <Link
                href={`/panel/projects/${projectId}/applications${periodId ? `?period_id=${periodId}` : ""}`}
                className="panel-button panel-button-secondary shrink-0 text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50"
              >
                Basvuru Yonetimine Git
              </Link>
            ) : null}
          </div>
        </div>

        <div className="panel-section-card space-y-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <ImageIcon className="h-5 w-5 text-primary" />
            Canli Onizleme
          </h2>
          <div className="relative h-56 overflow-hidden rounded-2xl bg-slate-100">
            {form.cover_image_path ? (
              <Image src={form.cover_image_path} alt={form.name || "Kapak"} fill unoptimized className="object-cover" />
            ) : null}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary">{form.type || "Proje"}</div>
            <h3 className="mt-2 text-2xl font-black text-slate-900">{form.name || "Proje adi"}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{form.short_description || "Kisa tanitim burada gorunecek."}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {form.gallery_paths.filter((item) => item.path.trim()).slice(0, 4).map((item, index) => (
              <div key={`${item.path}-${index}`} className="relative h-24 overflow-hidden rounded-xl bg-slate-100">
                <Image src={item.path} alt={item.caption || `Galeri ${index + 1}`} fill unoptimized className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
