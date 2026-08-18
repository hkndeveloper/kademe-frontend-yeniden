"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Database, Download, File, Loader2, Trash2, Upload, X } from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { defaultPeriodIdForProject, ProjectPeriodFilters, type PeriodOption } from "@/components/shared/ProjectPeriodFilters";
import { usePermissions } from "@/hooks/usePermissions";
import { downloadBlobResponse } from "@/lib/download";

type Project = {
  id: number;
  name: string;
  periods?: PeriodOption[];
  active_period?: PeriodOption | null;
};

const BOHCA_CATEGORIES: Record<string, string> = {
  general: "Genel",
  internship_documents: "Staj Belgeleri",
  assignment: "Odev",
  certificate: "Sertifika",
  kpd_report: "KPD Raporu",
  other: "Diger",
};

type Material = {
  id: number;
  title: string;
  description?: string | null;
  file_path: string;
  file_url?: string | null;
  download_url?: string | null;
  file_type?: string | null;
  category?: string | null;
  category_label?: string | null;
  visible_to_student: boolean;
  project?: Project | null;
  period_id?: number | null;
  period?: PeriodOption | null;
  user?: { id: number; name: string; surname: string; email: string } | null;
  uploader?: { id: number; name: string; surname: string } | null;
};

type Paginated<T> = {
  data: T[];
};

type UploadErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
};

function uploadErrorMessage(error: unknown): string {
  if (!isAxiosError<UploadErrorPayload>(error)) {
    return "Dosyalar yüklenemedi. Lütfen tekrar deneyin.";
  }

  if (!error.response) {
    return "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.";
  }

  if (error.response.status === 413) {
    return "Seçilen dosyalardan biri sunucunun izin verdiği yükleme boyutunu aşıyor.";
  }

  if (error.response.status === 403) {
    return "Bu materyalleri yüklemek için yetkiniz bulunmuyor.";
  }

  if (error.response.status === 422) {
    const validationMessage = Object.values(error.response.data?.errors ?? {}).flat().find(Boolean);
    return validationMessage ?? "Yükleme bilgileri geçersiz. Alanları ve dosya boyutlarını kontrol edin.";
  }

  return "Dosyalar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.";
}

export default function PanelDigitalBohcaPage() {
  const { canAccessProject, hasGlobalScope } = usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackIsError, setFeedbackIsError] = useState(false);
  const [form, setForm] = useState({
    project_id: "",
    period_id: "",
    title: "",
    description: "",
    category: "general",
    visible_to_student: true,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [projectFilter, setProjectFilter] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("project_id") ?? "all";
  });
  const [periodFilter, setPeriodFilter] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("period_id") ?? "all";
  });

  const uploadProjects = useMemo(
    () => projects.filter((project) => canAccessProject("digital_bohca.create", project.id)),
    [projects, canAccessProject],
  );

  useEffect(() => {
    let isActive = true;
    const initialProjectId = new URLSearchParams(window.location.search).get("project_id");
    Promise.all([
      api.get<{ materials: Paginated<Material> }>("/panel/digital-bohca", {
        params: {
          project_id: initialProjectId ?? undefined,
          period_id: new URLSearchParams(window.location.search).get("period_id") ?? undefined,
        },
      }),
      api.get<{ projects: Project[] }>("/panel/projects/manageable", { params: { permission: "digital_bohca.view" } }),
      api.get<{ projects: Project[] }>("/panel/projects/manageable", { params: { permission: "digital_bohca.create" } }),
    ])
      .then(([materialsResponse, viewProjectsResponse, createProjectsResponse]) => {
        if (!isActive) return;
        const mergedProjects = new Map<number, Project>();
        [...(viewProjectsResponse.data.projects ?? []), ...(createProjectsResponse.data.projects ?? [])].forEach((project) => {
          mergedProjects.set(project.id, project);
        });
        const projectItems = Array.from(mergedProjects.values());
        setMaterials(materialsResponse.data.materials?.data ?? []);
        setProjects(projectItems);
        if (initialProjectId) {
          setForm((current) => ({ ...current, project_id: initialProjectId }));
          const project = projectItems.find((item) => String(item.id) === initialProjectId);
          setPeriodFilter(new URLSearchParams(window.location.search).get("period_id") ?? (defaultPeriodIdForProject(project) || "all"));
        } else if (!hasGlobalScope("digital_bohca.create") && createProjectsResponse.data.projects?.[0]) {
          setForm((current) => ({ ...current, project_id: String(createProjectsResponse.data.projects[0].id) }));
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [hasGlobalScope]);

  async function refreshMaterials(nextProject = projectFilter, nextPeriod = periodFilter) {
    const response = await api.get<{ materials: Paginated<Material> }>("/panel/digital-bohca", {
      params: {
        project_id: nextProject !== "all" ? nextProject : undefined,
        period_id: nextPeriod !== "all" ? nextPeriod : undefined,
      },
    });
    setMaterials(response.data.materials?.data ?? []);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0) {
      setFeedbackIsError(true);
      setFeedback("Lütfen yüklemek için en az bir dosya seçin.");
      return;
    }
    setSaving(true);
    setFeedback(null);
    setFeedbackIsError(false);
    try {
      const formData = new FormData();
      if (form.project_id) formData.append("project_id", form.project_id);
      if (form.period_id) formData.append("period_id", form.period_id);
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("visible_to_student", form.visible_to_student ? "1" : "0");
      files.forEach((selectedFile) => formData.append("files[]", selectedFile));
      const response = await api.post<{ message: string; material?: Material; materials?: Material[] }>("/panel/digital-bohca", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploadedMaterials = response.data.materials ?? (response.data.material ? [response.data.material] : []);
      setMaterials((current) => [...uploadedMaterials, ...current]);
      setFeedbackIsError(false);
      setFeedback(response.data.message);
      setForm({ project_id: "", period_id: "", title: "", description: "", category: "general", visible_to_student: true });
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      setFeedbackIsError(true);
      setFeedback(uploadErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(material: Material) {
    await api.delete(`/panel/digital-bohca/${material.id}`);
    setMaterials((current) => current.filter((item) => item.id !== material.id));
  }

  async function handleDownload(material: Material) {
    const endpoint = material.download_url ?? `/panel/digital-bohca/${material.id}/download`;
    const response = await api.get(endpoint, { responseType: "blob" });
    await downloadBlobResponse(response.data, response.headers, material.title);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600/15 text-cyan-600">
            <Database className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Dijital Bohca</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Proje ve ogrenci materyallerini scope bazli yonet
            </p>
          </div>
        </div>
        <PermissionGate permission="digital_bohca.view">
          <ExportButtons
            endpoint="/panel/digital-bohca/export"
            filename="digital_bohca"
            params={{
              project_id: projectFilter !== "all" ? projectFilter : undefined,
              period_id: periodFilter !== "all" ? periodFilter : undefined,
            }}
            buttonLabel="Materyalleri Disa Aktar"
          />
        </PermissionGate>
      </div>

      {feedback ? (
        <div
          className={`panel-notice ${feedbackIsError ? "panel-notice-error" : "panel-notice-success"}`}
          role={feedbackIsError ? "alert" : "status"}
          aria-live={feedbackIsError ? "assertive" : "polite"}
        >
          {feedback}
        </div>
      ) : null}

      <PermissionGate permission="digital_bohca.create">
        <form onSubmit={handleSubmit} className="panel-section-card">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <select
              name="bohca_project_id"
              value={form.project_id}
              onChange={(event) => {
                const projectId = event.target.value;
                const project = uploadProjects.find((item) => String(item.id) === projectId);
                setForm((current) => ({ ...current, project_id: projectId, period_id: defaultPeriodIdForProject(project) }));
              }}
              className="panel-control"
            >
              {hasGlobalScope("digital_bohca.create") ? <option value="">Genel materyal</option> : null}
              {!hasGlobalScope("digital_bohca.create") && uploadProjects.length === 0 ? <option value="">Yetkili proje yok</option> : null}
              {uploadProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <select
              name="bohca_period_id"
              value={form.period_id}
              onChange={(event) => setForm((current) => ({ ...current, period_id: event.target.value }))}
              disabled={!form.project_id}
              className="panel-control"
            >
              <option value="">Tum donemler / genel</option>
              {(uploadProjects.find((project) => String(project.id) === form.project_id)?.periods ?? []).map((period) => (
                <option key={period.id} value={period.id}>{period.name}</option>
              ))}
            </select>
            <select
              name="bohca_category"
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              className="panel-control"
            >
              {Object.entries(BOHCA_CATEGORIES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input
              name="bohca_title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              required
              placeholder="Baslik"
              className="panel-control"
            />
            <label className="panel-file-drop flex cursor-pointer items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-slate-700">
              <Upload className="h-4 w-4" />
              {files.length ? `${files.length} dosya seçildi` : "Dosyaları seç"}
              <input
                ref={fileInputRef}
                name="bohca_files"
                type="file"
                multiple
                className="hidden"
                aria-describedby="bohca-file-help"
                onChange={(event) => {
                  const selectedFiles = Array.from(event.target.files ?? []);
                  setFiles((current) => {
                    const mergedFiles = [...current, ...selectedFiles];
                    return mergedFiles.filter(
                      (file, index) =>
                        mergedFiles.findIndex(
                          (candidate) =>
                            candidate.name === file.name &&
                            candidate.size === file.size &&
                            candidate.lastModified === file.lastModified,
                        ) === index,
                    );
                  });
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          <p id="bohca-file-help" className="mt-3 text-xs text-slate-500">
            Birden fazla dosyayı aynı anda veya art arda seçebilirsiniz. Tüm dosya türleri kabul edilir; her dosya en fazla 20 MB olabilir.
          </p>
          {files.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Yüklenecek dosyalar">
              {files.map((file) => (
                <span key={`${file.name}-${file.size}-${file.lastModified}`} className="panel-chip max-w-full normal-case tracking-normal">
                  <File className="h-3.5 w-3.5 shrink-0" />
                  <span className="max-w-56 truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((current) => current.filter((candidate) => candidate !== file))}
                    className="ml-1 rounded-full p-0.5 transition hover:bg-red-100 hover:text-red-700"
                    aria-label={`${file.name} dosyasını kaldır`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            rows={3}
            placeholder="Aciklama"
            className="panel-textarea mt-4"
          />
          <div className="panel-modal-footer mt-4">
            <button disabled={saving} className="panel-button panel-button-primary h-11 px-6">
              {saving ? "Yukleniyor..." : "Materyali Yukle"}
            </button>
          </div>
        </form>
      </PermissionGate>

      <PermissionGate permission="digital_bohca.view">
        <div className="panel-filter-card">
          <ProjectPeriodFilters
            projects={projects}
            selectedProjectId={projectFilter}
            selectedPeriodId={periodFilter}
            onProjectChange={(value) => {
              const project = projects.find((item) => String(item.id) === value);
              const nextPeriod = value === "all" ? "all" : defaultPeriodIdForProject(project) || "all";
              setProjectFilter(value);
              setPeriodFilter(nextPeriod);
              void refreshMaterials(value, nextPeriod);
            }}
            onPeriodChange={(value) => {
              setPeriodFilter(value);
              void refreshMaterials(projectFilter, value);
            }}
          />
        </div>
        <div className="panel-section-card p-0">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {materials.map((material) => (
                <div key={material.id} className="panel-list-card flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-base font-bold text-slate-900">{material.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <span>{material.project?.name ?? "Genel"}</span>
                      {material.period?.name ? (
                        <>
                          <span className="text-slate-300">/</span>
                          <span>{material.period.name}</span>
                        </>
                      ) : null}
                      <span className="text-slate-300">/</span>
                      <span className={`panel-chip ${material.category === "internship_documents" ? "panel-chip-info" : ""}`}>
                        {material.category_label ?? BOHCA_CATEGORIES[material.category ?? "general"] ?? "Genel"}
                      </span>
                      {material.file_type ? <span className="text-slate-400">{material.file_type}</span> : null}
                    </div>
                    {material.description ? <p className="mt-2 text-sm text-muted-foreground">{material.description}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => void handleDownload(material)} className="panel-card-action panel-card-action-info">
                      <Download className="h-4 w-4" />
                      Indir
                    </button>
                    <PermissionGate
                      permission="digital_bohca.delete"
                      requireProjectAccess={material.project?.id ? { permission: "digital_bohca.delete", projectId: material.project.id } : undefined}
                    >
                      {material.project?.id || hasGlobalScope("digital_bohca.delete") ? (
                        <button onClick={() => void handleDelete(material)} className="panel-card-action panel-card-action-danger">
                          <Trash2 className="h-4 w-4" />
                          Sil
                        </button>
                      ) : null}
                    </PermissionGate>
                  </div>
                </div>
              ))}
              {materials.length === 0 ? <div className="panel-empty-card">Materyal bulunamadi.</div> : null}
            </div>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}
