"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Handshake, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/store/useAuth";
import { toIstanbulDateTimeLocal, withIstanbulOffset } from "@/lib/istanbul-time";

type Project = { id: number; name: string };

type Opportunity = {
  id: number;
  title: string;
  kind: string;
  summary?: string | null;
  body?: string | null;
  link_url?: string | null;
  project_id?: number | null;
  project?: Project | null;
  creator?: { id: number; name?: string | null; surname?: string | null } | null;
  target_audience?: string[] | null;
  published_at?: string | null;
  expires_at?: string | null;
};

type Paginated<T> = { data: T[] };

type OpportunityForm = {
  project_id: string;
  title: string;
  kind: string;
  summary: string;
  body: string;
  link_url: string;
  target_student: boolean;
  target_alumni: boolean;
  published_at: string;
  expires_at: string;
};

const emptyForm: OpportunityForm = {
  project_id: "",
  title: "",
  kind: "internship",
  summary: "",
  body: "",
  link_url: "",
  target_student: true,
  target_alumni: true,
  published_at: "",
  expires_at: "",
};

const KIND_LABEL: Record<string, string> = {
  internship: "Staj",
  job: "Is Firsati",
  network: "Ag / Network",
  event: "Etkinlik",
  other: "Diger",
};


function formFromRow(row: Opportunity): OpportunityForm {
  const audience = row.target_audience ?? [];
  const isAllAudience = audience.length === 0;

  return {
    project_id: row.project_id != null ? String(row.project_id) : "",
    title: row.title ?? "",
    kind: row.kind ?? "internship",
    summary: row.summary ?? "",
    body: row.body ?? "",
    link_url: row.link_url ?? "",
    target_student: isAllAudience || audience.includes("student"),
    target_alumni: isAllAudience || audience.includes("alumni"),
    published_at: toIstanbulDateTimeLocal(row.published_at),
    expires_at: toIstanbulDateTimeLocal(row.expires_at),
  };
}

export default function PanelAlumniOpportunitiesPage() {
  const user = useAuth((state) => state.user);
  const { canAccessProject, hasPermission, hasGlobalScope } = usePermissions();
  const [rows, setRows] = useState<Opportunity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<OpportunityForm>(emptyForm);

  const manageableForCreate = useMemo(
    () => projects.filter((project) => canAccessProject("announcements.create", project.id)),
    [projects, canAccessProject],
  );

  const manageableForUpdate = useMemo(
    () => projects.filter((project) => canAccessProject("announcements.update", project.id)),
    [projects, canAccessProject],
  );

  const manageableForForm = editingId ? manageableForUpdate : manageableForCreate;

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<{ opportunities: Paginated<Opportunity> }>("/panel/alumni-opportunities"),
      api.get<{ projects: Project[] }>("/panel/projects/manageable", { params: { permission: "announcements.view" } }),
      hasPermission("announcements.create")
        ? api.get<{ projects: Project[] }>("/panel/projects/manageable", { params: { permission: "announcements.create" } })
        : Promise.resolve({ data: { projects: [] as Project[] } }),
      hasPermission("announcements.update")
        ? api.get<{ projects: Project[] }>("/panel/projects/manageable", { params: { permission: "announcements.update" } })
        : Promise.resolve({ data: { projects: [] as Project[] } }),
    ])
      .then(([opportunityResponse, viewResponse, createResponse, updateResponse]) => {
        if (!active) return;
        const merged = new Map<number, Project>();
        [
          ...(viewResponse.data.projects ?? []),
          ...(createResponse.data.projects ?? []),
          ...(updateResponse.data.projects ?? []),
        ].forEach((project) => merged.set(project.id, project));
        setRows(opportunityResponse.data.opportunities?.data ?? []);
        setProjects(Array.from(merged.values()));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hasPermission]);

  function audiencePayload(): string[] | null {
    const audience: string[] = [];
    if (form.target_student) audience.push("student");
    if (form.target_alumni) audience.push("alumni");
    if (audience.length === 2) return null;
    return audience;
  }

  function payloadFromForm() {
    return {
      title: form.title,
      kind: form.kind,
      summary: form.summary || null,
      body: form.body || null,
      link_url: form.link_url || null,
      project_id: form.project_id ? Number(form.project_id) : null,
      published_at: withIstanbulOffset(form.published_at),
      expires_at: withIstanbulOffset(form.expires_at),
      target_audience: audiencePayload(),
    };
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(row: Opportunity) {
    setEditingId(row.id);
    setForm(formFromRow(row));
    setShowForm(true);
    setFeedback(null);
  }

  function canEditRow(row: Opportunity) {
    if (!hasPermission("announcements.update")) return false;
    if (row.project_id != null) return canAccessProject("announcements.update", row.project_id);
    return hasGlobalScope("announcements.update") || row.creator?.id === user?.id;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const response = editingId
        ? await api.put<{ message: string; opportunity: Opportunity }>(`/panel/alumni-opportunities/${editingId}`, payloadFromForm())
        : await api.post<{ message: string; opportunity: Opportunity }>("/panel/alumni-opportunities", payloadFromForm());

      setRows((current) =>
        editingId
          ? current.map((item) => (item.id === editingId ? response.data.opportunity : item))
          : [response.data.opportunity, ...current],
      );
      setFeedback(response.data.message);
      closeForm();
    } catch (error) {
      console.error(error);
      setFeedback(editingId ? "Kayit guncellenemedi." : "Kayit olusturulamadi.");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(row: Opportunity) {
    const projectId = row.project_id;
    if (projectId != null && !canAccessProject("announcements.delete", projectId)) {
      setFeedback("Bu kaydi silmek icin yetkiniz yok.");
      return;
    }
    if (projectId == null && !hasPermission("announcements.delete")) {
      setFeedback("Bu kaydi silmek icin yetkiniz yok.");
      return;
    }
    try {
      await api.delete(`/panel/alumni-opportunities/${row.id}`);
      setRows((current) => current.filter((item) => item.id !== row.id));
    } catch (error) {
      console.error(error);
      setFeedback("Silinemedi.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PermissionGate
      permission="announcements.view"
      fallback={<div className="panel-empty-card text-amber-700">Firsat kayitlarini goruntuleme yetkiniz bulunmuyor.</div>}
    >
      <div className="space-y-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-600">
              <Handshake className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">Kariyer / Alumni firsatlari</h1>
              <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Mezun ve ogrenci portalinda listelenen duyurular
              </p>
            </div>
          </div>
          <PermissionGate permission="announcements.create">
            <button type="button" onClick={openCreateForm} className="panel-button panel-button-primary h-11">
              <Plus className="h-4 w-4" />
              Yeni kayit
            </button>
          </PermissionGate>
        </div>

        {feedback ? <div className="panel-notice panel-notice-success">{feedback}</div> : null}

        {showForm ? (
          <PermissionGate permission={editingId ? "announcements.update" : "announcements.create"}>
            <form onSubmit={handleSubmit} className="panel-section-card">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">{editingId ? "Firsati Duzenle" : "Yeni Firsat"}</h2>
                <button type="button" onClick={closeForm} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="panel-form-grid">
                <div className="lg:col-span-2">
                  <label className="panel-label">Baslik</label>
                  <input
                    required
                    className="panel-control"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="panel-label">Tur</label>
                  <select
                    className="panel-control"
                    value={form.kind}
                    onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value }))}
                  >
                    {Object.entries(KIND_LABEL).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="panel-label">Proje (opsiyonel)</label>
                  <select
                    className="panel-control"
                    value={form.project_id}
                    onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))}
                  >
                    <option value="">Genel (tum uygun katilimcilar)</option>
                    {manageableForForm.map((project) => (
                      <option key={project.id} value={String(project.id)}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="panel-label">Ozet</label>
                  <textarea
                    className="panel-textarea min-h-20"
                    value={form.summary}
                    onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="panel-label">Detay (opsiyonel)</label>
                  <textarea
                    className="panel-textarea min-h-24"
                    value={form.body}
                    onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="panel-label">Baglanti URL</label>
                  <input
                    className="panel-control"
                    value={form.link_url}
                    onChange={(event) => setForm((current) => ({ ...current, link_url: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="panel-label">Yayin zamani (bos = simdi)</label>
                  <input
                    type="datetime-local"
                    className="panel-control"
                    value={form.published_at}
                    onChange={(event) => setForm((current) => ({ ...current, published_at: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="panel-label">Bitis (opsiyonel)</label>
                  <input
                    type="datetime-local"
                    className="panel-control"
                    value={form.expires_at}
                    onChange={(event) => setForm((current) => ({ ...current, expires_at: event.target.value }))}
                  />
                </div>
                <div className="panel-card-muted flex flex-wrap gap-6 lg:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.target_student}
                      onChange={(event) => setForm((current) => ({ ...current, target_student: event.target.checked }))}
                    />
                    Ogrenciler
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.target_alumni}
                      onChange={(event) => setForm((current) => ({ ...current, target_alumni: event.target.checked }))}
                    />
                    Mezunlar
                  </label>
                </div>
              </div>
              <div className="panel-modal-footer mt-6">
                <button type="button" className="panel-button panel-button-secondary h-11" onClick={closeForm}>
                  Iptal
                </button>
                <button
                  type="submit"
                  disabled={saving || (!form.target_student && !form.target_alumni)}
                  className="panel-button panel-button-primary h-11 px-6"
                >
                  {saving ? "Kaydediliyor..." : editingId ? "Guncelle" : "Kaydet"}
                </button>
              </div>
            </form>
          </PermissionGate>
        ) : null}

        <div className="space-y-4">
          {rows.length === 0 ? (
            <div className="panel-empty-card">Kayit yok.</div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="panel-list-card flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="panel-chip panel-chip-warning">{KIND_LABEL[row.kind] ?? row.kind}</p>
                  <h3 className="text-lg font-bold text-slate-900">{row.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {row.project?.name ?? "Genel"}
                    {row.target_audience?.length ? ` - Hedef: ${row.target_audience.join(", ")}` : " - Hedef: tum"}
                  </p>
                  {row.summary ? <p className="mt-2 text-sm text-muted-foreground">{row.summary}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {canEditRow(row) ? (
                    <button type="button" onClick={() => startEdit(row)} className="panel-card-action">
                      <Pencil className="h-4 w-4" />
                      Duzenle
                    </button>
                  ) : null}
                  <PermissionGate permission="announcements.delete">
                    <button type="button" onClick={() => void removeRow(row)} className="panel-card-action panel-card-action-danger">
                      <Trash2 className="h-4 w-4" />
                      Sil
                    </button>
                  </PermissionGate>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PermissionGate>
  );
}
