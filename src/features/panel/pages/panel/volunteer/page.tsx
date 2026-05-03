"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Plus, Trash2, UserCheck } from "lucide-react";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

type Project = {
  id: number;
  name: string;
};

type VolunteerApplication = {
  id: number;
  status: "pending" | "accepted" | "rejected";
  motivation_text?: string | null;
  notes?: string | null;
  evaluation_note?: string | null;
  user?: { id: number; name: string; surname: string; email: string; phone?: string | null } | null;
};

type Opportunity = {
  id: number;
  title: string;
  description?: string | null;
  location?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  quota?: number | null;
  status: "open" | "closed" | "draft";
  project_id: number;
  project?: Project | null;
  applications_count?: number;
  applications?: VolunteerApplication[];
};

type Paginated<T> = {
  data: T[];
};

const emptyForm = {
  project_id: "",
  title: "",
  description: "",
  location: "",
  start_at: "",
  end_at: "",
  quota: "",
  status: "open",
};

export default function PanelVolunteerPage() {
  const { canAccessProject, hasPermission } = usePermissions();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const manageableProjects = useMemo(
    () => projects.filter((project) => canAccessProject("volunteer.manage", project.id)),
    [projects, canAccessProject],
  );

  useEffect(() => {
    let active = true;
    const initialProjectId = new URLSearchParams(window.location.search).get("project_id");
    Promise.all([
      api.get<{ opportunities: Paginated<Opportunity> }>("/panel/volunteer/opportunities", {
        params: { project_id: initialProjectId ?? undefined },
      }),
      api.get<{ projects: Project[] }>("/panel/projects/manageable", { params: { permission: "volunteer.view" } }),
      hasPermission("volunteer.manage")
        ? api.get<{ projects: Project[] }>("/panel/projects/manageable", { params: { permission: "volunteer.manage" } })
        : Promise.resolve({ data: { projects: [] as Project[] } }),
    ])
      .then(([opportunityResponse, viewProjectResponse, manageProjectResponse]) => {
        if (!active) return;
        const mergedProjects = new Map<number, Project>();
        [...(viewProjectResponse.data.projects ?? []), ...(manageProjectResponse.data.projects ?? [])].forEach((project) => {
          mergedProjects.set(project.id, project);
        });
        setOpportunities(opportunityResponse.data.opportunities?.data ?? []);
        setProjects(Array.from(mergedProjects.values()));
        if (initialProjectId) setForm((current) => ({ ...current, project_id: initialProjectId }));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [hasPermission]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const response = await api.post<{ message: string; opportunity: Opportunity }>("/panel/volunteer/opportunities", {
        project_id: Number(form.project_id),
        title: form.title,
        description: form.description || null,
        location: form.location || null,
        start_at: form.start_at || null,
        end_at: form.end_at || null,
        quota: form.quota ? Number(form.quota) : null,
        status: form.status,
      });
      setOpportunities((current) => [response.data.opportunity, ...current]);
      setFeedback(response.data.message);
      setForm(emptyForm);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function updateApplication(application: VolunteerApplication, status: VolunteerApplication["status"]) {
    const response = await api.put<{ message: string; application: VolunteerApplication }>(
      `/panel/volunteer/applications/${application.id}`,
      { status },
    );
    setFeedback(response.data.message);
    setOpportunities((current) =>
      current.map((opportunity) => ({
        ...opportunity,
        applications: opportunity.applications?.map((item) =>
          item.id === application.id ? response.data.application : item,
        ),
      })),
    );
  }

  async function deleteOpportunity(opportunity: Opportunity) {
    await api.delete(`/panel/volunteer/opportunities/${opportunity.id}`);
    setOpportunities((current) => current.filter((item) => item.id !== opportunity.id));
  }

  return (
    <PermissionGate
      permission="volunteer.view"
      fallback={<div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8 text-center text-sm text-amber-100">Gonullu basvurularini goruntuleme yetkiniz bulunmuyor.</div>}
    >
      <div className="space-y-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600/15 text-emerald-600">
              <ClipboardList className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">Gonullu Basvurulari</h1>
              <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Proje kapsaminda ilan ve basvuru yonetimi</p>
            </div>
          </div>
          <PermissionGate permission="volunteer.manage">
            <button
              type="button"
              onClick={() => setShowForm((current) => !current)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              Yeni Ilan
            </button>
          </PermissionGate>
        </div>

        {feedback ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700">{feedback}</div> : null}

        {showForm ? (
          <PermissionGate permission="volunteer.manage">
            <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <select
                  required
                  value={form.project_id}
                  onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                >
                  <option value="">Proje sec</option>
                  {manageableProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
                <input
                  required
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Ilan basligi"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                />
                <input
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Konum"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                />
                <input
                  type="number"
                  min={1}
                  value={form.quota}
                  onChange={(event) => setForm((current) => ({ ...current, quota: event.target.value }))}
                  placeholder="Kontenjan"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                />
                <input
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(event) => setForm((current) => ({ ...current, start_at: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                />
                <input
                  type="datetime-local"
                  value={form.end_at}
                  onChange={(event) => setForm((current) => ({ ...current, end_at: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                />
              </div>
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Aciklama"
                className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              />
              <div className="mt-4 flex justify-end">
                <button disabled={saving} className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
                  {saving ? "Kaydediliyor..." : "Ilani Olustur"}
                </button>
              </div>
            </form>
          </PermissionGate>
        ) : null}

        <div className="glass-panel overflow-hidden rounded-3xl">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : (
            <div className="divide-y divide-slate-200/70">
              {opportunities.map((opportunity) => (
                <div key={opportunity.id} className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-base font-bold text-slate-900">{opportunity.title}</div>
                      <div className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {opportunity.project?.name ?? "-"} / {opportunity.status} / {opportunity.applications_count ?? opportunity.applications?.length ?? 0} basvuru
                      </div>
                      {opportunity.description ? <p className="mt-2 text-sm text-muted-foreground">{opportunity.description}</p> : null}
                    </div>
                    <PermissionGate permission="volunteer.manage" requireProjectAccess={{ permission: "volunteer.manage", projectId: opportunity.project_id }}>
                      <button onClick={() => void deleteOpportunity(opportunity)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
                        <Trash2 className="h-4 w-4" />
                        Sil
                      </button>
                    </PermissionGate>
                  </div>

                  {opportunity.applications?.length ? (
                    <div className="mt-4 space-y-2">
                      {opportunity.applications.map((application) => (
                        <div key={application.id} className="flex flex-col gap-3 rounded-2xl bg-white p-3 text-sm md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="font-bold text-slate-900">
                              {application.user?.name} {application.user?.surname}
                            </div>
                            <div className="text-xs text-muted-foreground">{application.user?.email} / {application.status}</div>
                            {application.motivation_text ? <p className="mt-2 text-xs text-muted-foreground">{application.motivation_text}</p> : null}
                          </div>
                          <PermissionGate permission="volunteer.manage" requireProjectAccess={{ permission: "volunteer.manage", projectId: opportunity.project_id }}>
                            <div className="flex gap-2">
                              {(["accepted", "rejected"] as const).map((status) => (
                                <button key={status} onClick={() => void updateApplication(application, status)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold uppercase text-slate-700">
                                  <UserCheck className="h-3 w-3" />
                                  {status}
                                </button>
                              ))}
                            </div>
                          </PermissionGate>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              {opportunities.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Gonullu ilani bulunamadi.</div> : null}
            </div>
          )}
        </div>
      </div>
    </PermissionGate>
  );
}
