"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardList, Image as ImageIcon, Loader2, Plus, Save, Trash2, XCircle } from "lucide-react";
import { isAxiosError } from "axios";
import Image from "next/image";
import Link from "next/link";
import api from "@/lib/api/axios";

interface EditableProjectContent {
  name: string;
  slug: string;
  type: string;
  short_description: string;
  description: string;
  cover_image_path: string;
  gallery_paths: ProjectGalleryItem[];
  application_open: boolean;
  next_application_date: string;
  has_interview: boolean;
  quota: number | "";
}

interface ProjectPeriod {
  id: number;
  name: string;
  status?: string;
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
  slug: string;
  cover_image?: string | null;
  gallery?: string[];
  gallery_items?: Array<ProjectGalleryItem & { url?: string | null; period_name?: string | null }>;
  periods?: ProjectPeriod[];
}

interface ProjectContentResponse {
  project: ProjectPreview;
  editable: EditableProjectContent;
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
  application_open: false,
  next_application_date: "",
  has_interview: false,
  quota: "",
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

function formatApplicationDate(value: string): string {
  if (!value) return "Belirtilmedi";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function ProjectContentEditor({ projectId, panelBasePath, periodId = "", readOnly = false }: ProjectContentEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<ProjectPreview | null>(null);
  const [form, setForm] = useState<EditableProjectContent>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    const loadProject = async () => {
      try {
        const root = panelContentApiRoot();
        const response = await api.get<ProjectContentResponse>(`${root}/projects/${projectId}/content`);
        setProject(response.data.project);
        setForm({
          ...response.data.editable,
          short_description: response.data.editable.short_description ?? "",
          description: response.data.editable.description ?? "",
          cover_image_path: response.data.editable.cover_image_path ?? "",
          gallery_paths: normalizeGalleryItems(response.data.editable.gallery_paths),
          next_application_date: response.data.editable.next_application_date ?? "",
          quota: response.data.editable.quota ?? "",
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
    if (readOnly) return;
    setForm((current) => ({
      ...current,
      gallery_paths: current.gallery_paths.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addGalleryItem = () => {
    if (readOnly) return;
    setForm((current) => ({
      ...current,
      gallery_paths: [...current.gallery_paths, emptyGalleryItem()],
    }));
  };

  const removeGalleryItem = (index: number) => {
    if (readOnly) return;
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
  ) => {
    if (readOnly) return;
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
    if (readOnly) return;
    setMessage(null);
    setErrorMessage(null);

    if (!form.name.trim() || !form.slug.trim() || !form.type.trim()) {
      setErrorMessage("Proje adi, slug ve proje tipi zorunludur.");
      return;
    }

    if (!form.application_open && !form.next_application_date) {
      setErrorMessage("Basvurular kapaliysa ziyaretci tarafinda gorunmesi icin sonraki basvuru tarihini girin.");
      return;
    }

    if (form.quota !== "" && Number(form.quota) < 0) {
      setErrorMessage("Kontenjan negatif olamaz.");
      return;
    }

    setSaving(true);

    try {
      const root = panelContentApiRoot();
      const response = await api.put<ProjectContentResponse & { message: string }>(`${root}/projects/${projectId}/content`, {
        ...form,
        quota: form.quota === "" ? null : Number(form.quota),
        next_application_date: form.application_open ? null : form.next_application_date,
        gallery_paths: form.gallery_paths
          .filter((item) => item.path.trim())
          .map((item) => ({
            path: item.path.trim(),
            caption: item.caption.trim() || null,
            year: item.year.trim() || null,
            period_id: item.period_id || null,
          })),
      });

      setProject(response.data.project);
      setForm((current) => ({
        ...current,
        gallery_paths: normalizeGalleryItems(response.data.editable.gallery_paths),
      }));
      setMessage(response.data.message);
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
          disabled={readOnly || saving}
          className="panel-button panel-button-primary"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Kaydet
        </button>
      </div>

      {readOnly ? (
        <div className="panel-notice border-amber-200 bg-amber-50 text-amber-800">
          Bu proje icin icerik guncelleme yetkiniz yok; alanlar salt okunurdur.
        </div>
      ) : null}

      {message ? <div className="panel-notice panel-notice-success">{message}</div> : null}
      {errorMessage ? <div className="panel-notice panel-notice-error">{errorMessage}</div> : null}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-8">
          <div className="panel-section-card space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Temel Bilgiler</h2>
            <input
              readOnly={readOnly}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Proje adi"
              className={inputClass}
            />
            <div className="panel-form-grid">
              <input
                readOnly={readOnly}
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                placeholder="Slug"
                className={inputClass}
              />
              <input
                readOnly={readOnly}
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                placeholder="Proje tipi"
                className={inputClass}
              />
            </div>
            <textarea
              readOnly={readOnly}
              value={form.short_description}
              onChange={(event) => setForm((current) => ({ ...current, short_description: event.target.value }))}
              rows={3}
              placeholder="Kisa tanitim yazisi"
              className={textareaClass}
            />
            <textarea
              readOnly={readOnly}
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
                <button onClick={addGalleryItem} type="button" disabled={readOnly} className="panel-button panel-button-secondary disabled:opacity-40">
                  <Plus className="h-4 w-4" />
                  Alan Ekle
                </button>
                <label
                  className={`${compactActionClass} ${readOnly ? "pointer-events-none opacity-40" : "cursor-pointer"}`}
                >
                  {uploadingField === "gallery-new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Galeri Yukle
                  <input
                    type="file"
                    disabled={readOnly}
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
                      );
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            <input
              readOnly={readOnly}
              value={form.cover_image_path}
              onChange={(event) => setForm((current) => ({ ...current, cover_image_path: event.target.value }))}
              placeholder="Kapak gorsel URL"
              className={inputClass}
            />
            <label
              className={`${compactActionClass} w-fit ${readOnly ? "pointer-events-none opacity-40" : "cursor-pointer"}`}
            >
              {uploadingField === "cover_image_path" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Kapak gorseli yukle
              <input
                type="file"
                disabled={readOnly}
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
                      readOnly={readOnly}
                      value={item.path}
                      onChange={(event) => updateGalleryItem(index, "path", event.target.value)}
                      placeholder={`Galeri gorsel URL ${index + 1}`}
                      className={inputClass}
                    />
                    <input
                      readOnly={readOnly}
                      value={item.year}
                      onChange={(event) => updateGalleryItem(index, "year", event.target.value)}
                      placeholder="Yil"
                      className={inputClass}
                    />
                    <select
                      disabled={readOnly}
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
                      className={`panel-button-icon ${readOnly ? "pointer-events-none opacity-40" : "cursor-pointer"}`}
                    >
                      {uploadingField === `gallery-${index}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      <input
                        type="file"
                        disabled={readOnly}
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          void uploadImage(file, "projects", (url) => updateGalleryItem(index, "path", url), `gallery-${index}`);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      onClick={() => removeGalleryItem(index)}
                      type="button"
                      disabled={readOnly}
                      className="panel-button-icon panel-table-action-danger disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    readOnly={readOnly}
                    value={item.caption}
                    onChange={(event) => updateGalleryItem(index, "caption", event.target.value)}
                    placeholder="Gorsel basligi veya kisa aciklama"
                    className={`${inputClass} mt-3`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="panel-section-card space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Basvuru Ayarlari</h2>
                <p className="mt-1 text-sm text-muted-foreground">Public proje sayfasindaki basvuru karti ve paneldeki degerlendirme akisi buradan beslenir.</p>
              </div>
              <Link
                href={`/panel/periods/form-builder?project_id=${projectId}${periodId ? `&period_id=${periodId}` : ""}`}
                className="panel-button panel-button-secondary text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50"
              >
                <ClipboardList className="h-4 w-4" />
                Basvuru Formu
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="panel-card-muted bg-white">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                  {form.application_open ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-amber-600" />}
                  Basvuru Durumu
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setForm((current) => ({ ...current, application_open: true, next_application_date: "" }))}
                    className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                      form.application_open
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    } disabled:opacity-60`}
                  >
                    Acik
                  </button>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setForm((current) => ({ ...current, application_open: false }))}
                    className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                      !form.application_open
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    } disabled:opacity-60`}
                  >
                    Kapali
                  </button>
                </div>
              </div>

              <div className="panel-card-muted bg-white">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <CalendarClock className="h-5 w-5 text-indigo-600" />
                  Degerlendirme Akisi
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setForm((current) => ({ ...current, has_interview: false }))}
                    className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                      !form.has_interview
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    } disabled:opacity-60`}
                  >
                    Mulakatsiz
                  </button>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setForm((current) => ({ ...current, has_interview: true }))}
                    className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                      form.has_interview
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    } disabled:opacity-60`}
                  >
                    Mulakatli
                  </button>
                </div>
              </div>
            </div>

            <div className="panel-form-grid">
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Kontenjan</span>
                <input
                  type="number"
                  min="0"
                  readOnly={readOnly}
                  value={form.quota}
                  onChange={(event) => setForm((current) => ({ ...current, quota: event.target.value === "" ? "" : Number(event.target.value) }))}
                  placeholder="Orn: 40"
                  className={inputClass}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sonraki Basvuru Tarihi</span>
                <input
                  type="date"
                  readOnly={readOnly || form.application_open}
                  value={form.next_application_date}
                  onChange={(event) => setForm((current) => ({ ...current, next_application_date: event.target.value }))}
                  className={`${inputClass} read-only:bg-slate-50`}
                />
              </label>
            </div>

            <div className="panel-form-note">
              {form.application_open
                ? "Basvurular acikken public sayfada basvuru butonu gorunur; sonraki basvuru tarihi otomatik temizlenir."
                : `Basvurular kapaliyken public sayfada sonraki tarih gorunur: ${formatApplicationDate(form.next_application_date)}`}
            </div>
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
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className={`panel-chip min-h-16 flex-col items-start justify-center rounded-2xl px-4 py-3 normal-case tracking-normal ${form.application_open ? "panel-chip-success" : "panel-chip-warning"}`}>
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">Basvuru</div>
              <div className="mt-1 font-extrabold">{form.application_open ? "Acik" : "Kapali"}</div>
            </div>
            <div className="panel-chip min-h-16 flex-col items-start justify-center rounded-2xl px-4 py-3 normal-case tracking-normal">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Akis</div>
              <div className="mt-1 font-extrabold">{form.has_interview ? "Mulakatli" : "Mulakatsiz"}</div>
            </div>
            <div className="panel-chip min-h-16 flex-col items-start justify-center rounded-2xl px-4 py-3 normal-case tracking-normal">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kontenjan</div>
              <div className="mt-1 font-extrabold">{form.quota === "" ? "Yok" : form.quota}</div>
            </div>
            <div className="panel-chip min-h-16 flex-col items-start justify-center rounded-2xl px-4 py-3 normal-case tracking-normal">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sonraki Tarih</div>
              <div className="mt-1 font-extrabold">{formatApplicationDate(form.next_application_date)}</div>
            </div>
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
