"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, Download, Loader2, Trash2, Upload } from "lucide-react";
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

export default function PanelDigitalBohcaPage() {
  const { canAccessProject, hasGlobalScope } = usePermissions();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({
    project_id: "",
    period_id: "",
    title: "",
    description: "",
    category: "general",
    visible_to_student: true,
  });
  const [file, setFile] = useState<File | null>(null);
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
    if (!file) {
      setFeedback("Lutfen yuklemek icin bir dosya secin.");
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      if (form.project_id) formData.append("project_id", form.project_id);
      if (form.period_id) formData.append("period_id", form.period_id);
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("visible_to_student", form.visible_to_student ? "1" : "0");
      formData.append("file", file);
      const response = await api.post<{ message: string; material: Material }>("/panel/digital-bohca", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMaterials((current) => [response.data.material, ...current]);
      setFeedback(response.data.message);
      setForm({ project_id: "", period_id: "", title: "", description: "", category: "general", visible_to_student: true });
      setFile(null);
    } catch (error) {
      const message = isAxiosError(error)
        ? String((error.response?.data as { message?: string })?.message ?? "Materyal yuklenemedi.")
        : "Materyal yuklenemedi.";
      setFeedback(message);
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

      {feedback ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700">{feedback}</div> : null}

      <PermissionGate permission="digital_bohca.create">
        <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <select
              name="bohca_project_id"
              value={form.project_id}
              onChange={(event) => {
                const projectId = event.target.value;
                const project = uploadProjects.find((item) => String(item.id) === projectId);
                setForm((current) => ({ ...current, project_id: projectId, period_id: defaultPeriodIdForProject(project) }));
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
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
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
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
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
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
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            />
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900">
              <Upload className="h-4 w-4" />
              {file ? file.name : "Dosya sec"}
              <input name="bohca_file" type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
          </div>
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            rows={3}
            placeholder="Aciklama"
            className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
          />
          <div className="mt-4 flex justify-end">
            <button disabled={saving} className="rounded-xl bg-cyan-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
              {saving ? "Yukleniyor..." : "Materyali Yukle"}
            </button>
          </div>
        </form>
      </PermissionGate>

      <PermissionGate permission="digital_bohca.view">
        <div className="glass-panel rounded-3xl p-4">
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
        <div className="glass-panel overflow-hidden rounded-3xl">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
            </div>
          ) : (
            <div className="divide-y divide-slate-200/70">
              {materials.map((material) => (
                <div key={material.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
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
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${material.category === "internship_documents" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                        {material.category_label ?? BOHCA_CATEGORIES[material.category ?? "general"] ?? "Genel"}
                      </span>
                      {material.file_type ? <span className="text-slate-400">{material.file_type}</span> : null}
                    </div>
                    {material.description ? <p className="mt-2 text-sm text-muted-foreground">{material.description}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => void handleDownload(material)} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-700">
                      <Download className="h-4 w-4" />
                      Indir
                    </button>
                    <PermissionGate
                      permission="digital_bohca.delete"
                      requireProjectAccess={material.project?.id ? { permission: "digital_bohca.delete", projectId: material.project.id } : undefined}
                    >
                      {material.project?.id || hasGlobalScope("digital_bohca.delete") ? (
                        <button onClick={() => void handleDelete(material)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
                          <Trash2 className="h-4 w-4" />
                          Sil
                        </button>
                      ) : null}
                    </PermissionGate>
                  </div>
                </div>
              ))}
              {materials.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Materyal bulunamadi.</div> : null}
            </div>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}
