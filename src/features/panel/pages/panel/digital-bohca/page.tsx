"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, Download, Loader2, Trash2, Upload } from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

type Project = {
  id: number;
  name: string;
};

type Material = {
  id: number;
  title: string;
  description?: string | null;
  file_path: string;
  file_url?: string | null;
  download_url?: string | null;
  file_type?: string | null;
  visible_to_student: boolean;
  project?: Project | null;
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
    title: "",
    description: "",
    visible_to_student: true,
  });
  const [file, setFile] = useState<File | null>(null);

  const uploadProjects = useMemo(
    () => projects.filter((project) => canAccessProject("digital_bohca.create", project.id)),
    [projects, canAccessProject],
  );

  useEffect(() => {
    let isActive = true;
    const initialProjectId = new URLSearchParams(window.location.search).get("project_id");
    Promise.all([
      api.get<{ materials: Paginated<Material> }>("/panel/digital-bohca", {
        params: { project_id: initialProjectId ?? undefined },
      }),
      api.get<{ projects: Project[] }>("/panel/projects/manageable", { params: { permission: "digital_bohca.create" } }),
    ])
      .then(([materialsResponse, projectsResponse]) => {
        if (!isActive) return;
        setMaterials(materialsResponse.data.materials?.data ?? []);
        setProjects(projectsResponse.data.projects ?? []);
        if (initialProjectId) {
          setForm((current) => ({ ...current, project_id: initialProjectId }));
        } else if (!hasGlobalScope("digital_bohca.create") && projectsResponse.data.projects?.[0]) {
          setForm((current) => ({ ...current, project_id: String(projectsResponse.data.projects[0].id) }));
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [hasGlobalScope]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setSaving(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      if (form.project_id) formData.append("project_id", form.project_id);
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("visible_to_student", form.visible_to_student ? "1" : "0");
      formData.append("file", file);
      const response = await api.post<{ message: string; material: Material }>("/panel/digital-bohca", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMaterials((current) => [response.data.material, ...current]);
      setFeedback(response.data.message);
      setForm({ project_id: "", title: "", description: "", visible_to_student: true });
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
    const contentType = String(response.headers["content-type"] ?? "");

    if (contentType.includes("application/json")) {
      const payload = JSON.parse(await response.data.text()) as { download_url?: string };
      if (payload.download_url) {
        window.open(payload.download_url, "_blank", "noopener,noreferrer");
      }
      return;
    }

    const blobUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    const extension = material.file_type ? `.${material.file_type.replace(/^\./, "")}` : "";
    link.href = blobUrl;
    link.download = `${material.title.replace(/\s+/g, "_")}${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  }

  return (
    <div className="space-y-8">
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

      {feedback ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700">{feedback}</div> : null}

      <PermissionGate permission="digital_bohca.create">
        <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_auto]">
            <select
              value={form.project_id}
              onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            >
              {hasGlobalScope("digital_bohca.create") ? <option value="">Genel materyal</option> : null}
              {!hasGlobalScope("digital_bohca.create") && uploadProjects.length === 0 ? <option value="">Yetkili proje yok</option> : null}
              {uploadProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              required
              placeholder="Baslik"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            />
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900">
              <Upload className="h-4 w-4" />
              {file ? file.name : "Dosya sec"}
              <input type="file" required className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
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
                    <div className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {material.project?.name ?? "Genel"} / {material.file_type ?? "dosya"}
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
