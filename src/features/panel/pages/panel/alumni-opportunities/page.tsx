"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Handshake, Loader2, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

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
  target_audience?: string[] | null;
  published_at?: string | null;
  expires_at?: string | null;
};

type Paginated<T> = { data: T[] };

const emptyForm = {
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
  network: "Ag / Network",
  event: "Etkinlik",
  other: "Diger",
};

export default function PanelAlumniOpportunitiesPage() {
  const { canAccessProject, hasPermission } = usePermissions();
  const [rows, setRows] = useState<Opportunity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const manageableForCreate = useMemo(
    () => projects.filter((p) => canAccessProject("announcements.create", p.id)),
    [projects, canAccessProject],
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<{ opportunities: Paginated<Opportunity> }>("/panel/alumni-opportunities"),
      api.get<{ projects: Project[] }>("/panel/projects/manageable", { params: { permission: "announcements.view" } }),
      hasPermission("announcements.create")
        ? api.get<{ projects: Project[] }>("/panel/projects/manageable", { params: { permission: "announcements.create" } })
        : Promise.resolve({ data: { projects: [] as Project[] } }),
    ])
      .then(([oppRes, viewRes, createRes]) => {
        if (!active) return;
        const merged = new Map<number, Project>();
        [...(viewRes.data.projects ?? []), ...(createRes.data.projects ?? [])].forEach((p) => merged.set(p.id, p));
        setRows(oppRes.data.opportunities?.data ?? []);
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
    const a: string[] = [];
    if (form.target_student) a.push("student");
    if (form.target_alumni) a.push("alumni");
    if (a.length === 2) return null;
    return a;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await api.post<{ message: string; opportunity: Opportunity }>("/panel/alumni-opportunities", {
        title: form.title,
        kind: form.kind,
        summary: form.summary || null,
        body: form.body || null,
        link_url: form.link_url || null,
        project_id: form.project_id ? Number(form.project_id) : null,
        published_at: form.published_at || null,
        expires_at: form.expires_at || null,
        target_audience: audiencePayload(),
      });
      setRows((c) => [res.data.opportunity, ...c]);
      setFeedback(res.data.message);
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setFeedback("Kayit olusturulamadi.");
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
      setRows((c) => c.filter((x) => x.id !== row.id));
    } catch (err) {
      console.error(err);
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
      fallback={
        <div className="panel-empty-card text-amber-700">
          Firsat kayitlarini goruntuleme yetkiniz bulunmuyor.
        </div>
      }
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
            <button
              type="button"
              onClick={() => setShowForm((s) => !s)}
              className="panel-button panel-button-primary h-11"
            >
              <Plus className="h-4 w-4" />
              Yeni kayit
            </button>
          </PermissionGate>
        </div>

        {feedback ? <div className="panel-notice panel-notice-success">{feedback}</div> : null}

        {showForm ? (
          <PermissionGate permission="announcements.create">
            <form onSubmit={handleSubmit} className="panel-section-card">
              <div className="panel-form-grid">
                <div className="lg:col-span-2">
                  <label className="panel-label">Baslik</label>
                  <input
                    required
                    className="panel-control"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="panel-label">Tur</label>
                  <select
                    className="panel-control"
                    value={form.kind}
                    onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
                  >
                    {Object.entries(KIND_LABEL).map(([k, label]) => (
                      <option key={k} value={k}>
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
                    onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
                  >
                    <option value="">Genel (tum uygun katilimcilar)</option>
                    {manageableForCreate.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="panel-label">Ozet</label>
                  <textarea
                    className="panel-textarea min-h-20"
                    value={form.summary}
                    onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="panel-label">Detay (opsiyonel)</label>
                  <textarea
                    className="panel-textarea min-h-24"
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="panel-label">Baglanti URL</label>
                  <input
                    className="panel-control"
                    value={form.link_url}
                    onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="panel-label">Yayin zamani (bos = simdi)</label>
                  <input
                    type="datetime-local"
                    className="panel-control"
                    value={form.published_at}
                    onChange={(e) => setForm((f) => ({ ...f, published_at: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="panel-label">Bitis (opsiyonel)</label>
                  <input
                    type="datetime-local"
                    className="panel-control"
                    value={form.expires_at}
                    onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                  />
                </div>
                <div className="panel-card-muted flex flex-wrap gap-6 lg:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.target_student}
                      onChange={(e) => setForm((f) => ({ ...f, target_student: e.target.checked }))}
                    />
                    Ogrenciler
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.target_alumni}
                      onChange={(e) => setForm((f) => ({ ...f, target_alumni: e.target.checked }))}
                    />
                    Mezunlar
                  </label>
                </div>
              </div>
              <div className="panel-modal-footer mt-6">
                <button
                  type="button"
                  className="panel-button panel-button-secondary h-11"
                  onClick={() => setShowForm(false)}
                >
                  Iptal
                </button>
                <button
                  type="submit"
                  disabled={saving || (!form.target_student && !form.target_alumni)}
                  className="panel-button panel-button-primary h-11 px-6"
                >
                  {saving ? "Kaydediliyor..." : "Kaydet"}
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
                  <p className="panel-chip panel-chip-warning">
                    {KIND_LABEL[row.kind] ?? row.kind}
                  </p>
                  <h3 className="text-lg font-bold text-slate-900">{row.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {row.project?.name ?? "Genel"}
                    {row.target_audience?.length ? ` - Hedef: ${row.target_audience.join(", ")}` : " - Hedef: tum"}
                  </p>
                  {row.summary ? <p className="mt-2 text-sm text-muted-foreground">{row.summary}</p> : null}
                </div>
                <PermissionGate permission="announcements.delete">
                  <button
                    type="button"
                    onClick={() => void removeRow(row)}
                    className="panel-card-action panel-card-action-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                    Sil
                  </button>
                </PermissionGate>
              </div>
            ))
          )}
        </div>
      </div>
    </PermissionGate>
  );
}
