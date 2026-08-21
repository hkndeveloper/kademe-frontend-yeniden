"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Pencil, Plus, Trash2, UserCheck, X } from "lucide-react";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { defaultPeriodIdForProject, periodHasWriteCapability, periodOptionById, ProjectPeriodFilters, type PeriodOption } from "@/components/shared/ProjectPeriodFilters";
import { usePermissions } from "@/hooks/usePermissions";
import { toIstanbulDateTimeLocal, withIstanbulOffset } from "@/lib/istanbul-time";
import { panelStatusActionClass, panelStatusChipClass } from "@/lib/status-style";

type Project = {
  id: number;
  name: string;
  periods?: PeriodOption[];
  active_period?: PeriodOption | null;
};

type VolunteerApplication = {
  id: number;
  status: "pending" | "accepted" | "waitlisted" | "rejected";
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
  status: "open" | "closed" | "archived";
  project_id: number;
  period_id?: number | null;
  project?: Project | null;
  period?: PeriodOption | null;
  applications_count?: number;
  applications?: VolunteerApplication[];
};

type Paginated<T> = { data: T[] };

type VolunteerForm = {
  project_id: string;
  period_id: string;
  title: string;
  description: string;
  location: string;
  start_at: string;
  end_at: string;
  quota: string;
  status: Opportunity["status"];
};

const emptyForm: VolunteerForm = {
  project_id: "",
  period_id: "",
  title: "",
  description: "",
  location: "",
  start_at: "",
  end_at: "",
  quota: "",
  status: "open",
};

const opportunityStatusLabel: Record<Opportunity["status"], string> = {
  open: "Acik",
  closed: "Kapali",
  archived: "Arsiv",
};

const applicationStatusLabel: Record<VolunteerApplication["status"], string> = {
  pending: "Beklemede",
  accepted: "Olumlu",
  waitlisted: "Beklemede / Yedek",
  rejected: "Olumsuz",
};

function formPayload(form: VolunteerForm) {
  return {
    project_id: Number(form.project_id),
    period_id: form.period_id ? Number(form.period_id) : null,
    title: form.title,
    description: form.description || null,
    location: form.location || null,
    start_at: withIstanbulOffset(form.start_at),
    end_at: withIstanbulOffset(form.end_at),
    quota: form.quota ? Number(form.quota) : null,
    status: form.status,
  };
}

export default function PanelVolunteerPage() {
  const { canAccessProject, hasPermission } = usePermissions();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<VolunteerForm>(emptyForm);
  const [projectFilter, setProjectFilter] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("project_id") ?? "all";
  });
  const [periodFilter, setPeriodFilter] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("period_id") ?? "all";
  });

  const manageableProjects = useMemo(
    () => projects.filter((project) => canAccessProject("volunteer.manage", project.id)),
    [projects, canAccessProject],
  );
  const selectedFormPeriod = periodOptionById(projects, form.period_id);
  const canWriteSelectedOpportunityPeriod = !form.period_id || periodHasWriteCapability(selectedFormPeriod, "create_operations");
  const selectedFilterPeriod = periodOptionById(projects, periodFilter);
  const canCreateInFilterPeriod = periodFilter === "all" || periodHasWriteCapability(selectedFilterPeriod, "create_operations");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const initialProjectId = params.get("project_id");
    const initialPeriodId = params.get("period_id");

    Promise.all([
      api.get<{ opportunities: Paginated<Opportunity> }>("/panel/volunteer/opportunities", {
        params: { project_id: initialProjectId ?? undefined, period_id: initialPeriodId ?? undefined },
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
        const projectItems = Array.from(mergedProjects.values());
        setOpportunities(opportunityResponse.data.opportunities?.data ?? []);
        setProjects(projectItems);
        if (initialProjectId) {
          const project = projectItems.find((item) => String(item.id) === initialProjectId);
          const nextPeriod = initialPeriodId ?? (defaultPeriodIdForProject(project) || "all");
          setForm((current) => ({ ...current, project_id: initialProjectId, period_id: nextPeriod === "all" ? "" : nextPeriod }));
          setPeriodFilter(nextPeriod);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [hasPermission]);

  async function refreshOpportunities(nextProject = projectFilter, nextPeriod = periodFilter) {
    const response = await api.get<{ opportunities: Paginated<Opportunity> }>("/panel/volunteer/opportunities", {
      params: {
        project_id: nextProject !== "all" ? nextProject : undefined,
        period_id: nextPeriod !== "all" ? nextPeriod : undefined,
      },
    });
    setOpportunities(response.data.opportunities?.data ?? []);
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm((current) => !current);
  }

  function startEdit(opportunity: Opportunity) {
    setEditingId(opportunity.id);
    setForm({
      project_id: String(opportunity.project_id),
      period_id: opportunity.period_id ? String(opportunity.period_id) : "",
      title: opportunity.title ?? "",
      description: opportunity.description ?? "",
      location: opportunity.location ?? "",
      start_at: toIstanbulDateTimeLocal(opportunity.start_at),
      end_at: toIstanbulDateTimeLocal(opportunity.end_at),
      quota: opportunity.quota != null ? String(opportunity.quota) : "",
      status: opportunity.status,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const payload = formPayload(form);
      const response = editingId
        ? await api.put<{ message: string; opportunity: Opportunity }>(`/panel/volunteer/opportunities/${editingId}`, payload)
        : await api.post<{ message: string; opportunity: Opportunity }>("/panel/volunteer/opportunities", payload);

      setOpportunities((current) =>
        editingId ? current.map((item) => (item.id === editingId ? response.data.opportunity : item)) : [response.data.opportunity, ...current],
      );
      setFeedback(response.data.message);
      closeForm();
    } catch (error) {
      console.error("Gonullu ilani kaydedilemedi", error);
      setFeedback("Gonullu ilani kaydedilirken bir hata olustu.");
    } finally {
      setSaving(false);
    }
  }

  async function updateApplication(application: VolunteerApplication, status: VolunteerApplication["status"]) {
    try {
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
    } catch (error) {
      console.error("Gonullu basvurusu guncellenemedi", error);
      setFeedback("Basvuru guncellenirken bir hata olustu.");
    }
  }

  async function deleteOpportunity(opportunity: Opportunity) {
    try {
      await api.delete(`/panel/volunteer/opportunities/${opportunity.id}`);
      setOpportunities((current) => current.filter((item) => item.id !== opportunity.id));
    } catch (error) {
      console.error("Gonullu ilani silinemedi", error);
      setFeedback("Ilan silinirken bir hata olustu.");
    }
  }

  return (
    <PermissionGate
      permission="volunteer.view"
      fallback={<div className="panel-empty-card text-amber-700">Gonullu basvurularini goruntuleme yetkiniz bulunmuyor.</div>}
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
          <div className="flex items-center gap-2">
            <ExportButtons
              endpoint="/panel/volunteer/opportunities/export"
              filename="gonullu_ilanlari"
              params={{
                project_id: projectFilter !== "all" ? projectFilter : undefined,
                period_id: periodFilter !== "all" ? periodFilter : undefined,
              }}
              buttonLabel="Gonullu Kayitlarini Disa Aktar"
            />
            <PermissionGate permission="volunteer.manage">
              <button type="button" disabled={!canCreateInFilterPeriod} title={!canCreateInFilterPeriod ? "Seçili dönemde yeni ilan açılamaz." : undefined} onClick={openCreateForm} className="panel-button panel-button-primary h-11 disabled:cursor-not-allowed disabled:opacity-50">
                <Plus className="h-4 w-4" />
                Yeni Ilan
              </button>
            </PermissionGate>
          </div>
        </div>

        {feedback ? <div className="panel-notice panel-notice-success">{feedback}</div> : null}

        {showForm ? (
          <PermissionGate permission="volunteer.manage">
            <form onSubmit={handleSubmit} className="panel-section-card">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">{editingId ? "Gonullu Ilanini Duzenle" : "Yeni Gonullu Ilani"}</h2>
                <button type="button" onClick={closeForm} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="panel-form-grid">
                <select
                  required
                  value={form.project_id}
                  onChange={(event) => {
                    const projectId = event.target.value;
                    const project = manageableProjects.find((item) => String(item.id) === projectId);
                    setForm((current) => ({ ...current, project_id: projectId, period_id: defaultPeriodIdForProject(project) }));
                  }}
                  className="panel-control"
                >
                  <option value="">Proje sec</option>
                  {manageableProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
                <select
                  value={form.period_id}
                  onChange={(event) => setForm((current) => ({ ...current, period_id: event.target.value }))}
                  disabled={!form.project_id}
                  className="panel-control"
                >
                  <option value="">Tum donemler / genel</option>
                  {(manageableProjects.find((project) => String(project.id) === form.project_id)?.periods ?? []).map((period) => (
                    <option key={period.id} value={period.id}>{period.name}</option>
                  ))}
                </select>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Opportunity["status"] }))}
                  className="panel-control"
                >
                  {Object.entries(opportunityStatusLabel).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <input
                  required
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Ilan basligi"
                  className="panel-control"
                />
                <input
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Konum"
                  className="panel-control"
                />
                <input
                  type="number"
                  min={1}
                  value={form.quota}
                  onChange={(event) => setForm((current) => ({ ...current, quota: event.target.value }))}
                  placeholder="Kontenjan"
                  className="panel-control"
                />
                <input
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(event) => setForm((current) => ({ ...current, start_at: event.target.value }))}
                  className="panel-control"
                />
                <input
                  type="datetime-local"
                  value={form.end_at}
                  onChange={(event) => setForm((current) => ({ ...current, end_at: event.target.value }))}
                  className="panel-control"
                />
              </div>
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Aciklama"
                className="panel-textarea mt-4"
              />
              <div className="panel-modal-footer mt-4">
                <button type="button" onClick={closeForm} className="panel-button panel-button-secondary h-11 px-5">Iptal</button>
                <button disabled={saving || !canWriteSelectedOpportunityPeriod} title={!canWriteSelectedOpportunityPeriod ? "Bu dönemde ilan ekleme veya düzenleme işlemi kapalıdır." : undefined} className="panel-button panel-button-primary h-11 px-6 disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? "Kaydediliyor..." : editingId ? "Ilani Guncelle" : "Ilani Olustur"}
                </button>
              </div>
            </form>
          </PermissionGate>
        ) : null}

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
              void refreshOpportunities(value, nextPeriod);
            }}
            onPeriodChange={(value) => {
              setPeriodFilter(value);
              void refreshOpportunities(projectFilter, value);
            }}
          />
        </div>

        <div className="panel-section-card p-0">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {opportunities.map((opportunity) => {
                const opportunityPeriod = periodOptionById(projects, opportunity.period_id);
                const canWriteOpportunity = !opportunity.period_id || periodHasWriteCapability(opportunityPeriod, "create_operations");
                const canResolveOpportunity = !opportunity.period_id || periodHasWriteCapability(opportunityPeriod, "resolve_operations");
                return (
                <div key={opportunity.id} className="panel-list-card">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-slate-900">{opportunity.title}</span>
                        <span className={`panel-chip ${panelStatusChipClass(opportunity.status)}`}>{opportunityStatusLabel[opportunity.status]}</span>
                      </div>
                      <div className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {opportunity.project?.name ?? "-"} {opportunity.period?.name ? `/ ${opportunity.period.name}` : ""} / {opportunity.applications_count ?? opportunity.applications?.length ?? 0} basvuru
                      </div>
                      {opportunity.description ? <p className="mt-2 text-sm text-muted-foreground">{opportunity.description}</p> : null}
                    </div>
                    <PermissionGate permission="volunteer.manage" requireProjectAccess={{ permission: "volunteer.manage", projectId: opportunity.project_id }}>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={!canWriteOpportunity} title={!canWriteOpportunity ? "Bu dönem normal değişikliklere kapalıdır." : undefined} onClick={() => startEdit(opportunity)} className="panel-card-action disabled:cursor-not-allowed disabled:opacity-40">
                          <Pencil className="h-4 w-4" />
                          Duzenle
                        </button>
                        <button type="button" disabled={!canWriteOpportunity} title={!canWriteOpportunity ? "Bu dönem normal değişikliklere kapalıdır." : undefined} onClick={() => void deleteOpportunity(opportunity)} className="panel-card-action panel-card-action-danger disabled:cursor-not-allowed disabled:opacity-40">
                          <Trash2 className="h-4 w-4" />
                          Sil
                        </button>
                      </div>
                    </PermissionGate>
                  </div>

                  {opportunity.applications?.length ? (
                    <div className="mt-4 space-y-2">
                      {opportunity.applications.map((application) => (
                        <div key={application.id} className="panel-card-muted flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="font-bold text-slate-900">
                              {application.user?.name} {application.user?.surname}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{application.user?.email}</span>
                              <span className={`panel-chip ${panelStatusChipClass(application.status)}`}>{applicationStatusLabel[application.status]}</span>
                            </div>
                            {application.motivation_text ? <p className="mt-2 text-xs text-muted-foreground">{application.motivation_text}</p> : null}
                          </div>
                          <PermissionGate permission="volunteer.manage" requireProjectAccess={{ permission: "volunteer.manage", projectId: opportunity.project_id }}>
                            <div className="flex flex-wrap gap-2">
                              {(["accepted", "waitlisted", "rejected"] as const).map((status) => (
                                <button key={status} disabled={!canResolveOpportunity} title={!canResolveOpportunity ? "Bu dönemde başvuru sonuçlandırma işlemi kapalıdır." : undefined} onClick={() => void updateApplication(application, status)} className={`panel-card-action py-1 ${panelStatusActionClass(status)} disabled:cursor-not-allowed disabled:opacity-40`}>
                                  <UserCheck className="h-3 w-3" />
                                  {applicationStatusLabel[status]}
                                </button>
                              ))}
                            </div>
                          </PermissionGate>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                );
              })}
              {opportunities.length === 0 ? <div className="panel-empty-card">Gonullu ilani bulunamadi.</div> : null}
            </div>
          )}
        </div>
      </div>
    </PermissionGate>
  );
}
