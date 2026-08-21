"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Download, FileStack, Loader2, Pencil, Trash2, Upload, X } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { defaultPeriodIdForProject, periodHasWriteCapability, periodOptionById, ProjectPeriodFilters, type PeriodOption } from "@/components/shared/ProjectPeriodFilters";
import { usePermissions } from "@/hooks/usePermissions";
import { downloadBlobResponse } from "@/lib/download";
import { toIstanbulDateTimeLocal, withIstanbulOffset } from "@/lib/istanbul-time";

type Project = {
  id: number;
  name: string;
  active_period?: PeriodOption | null;
  periods?: PeriodOption[];
};


type AssignmentAttachment = {
  id: number;
  original_name?: string | null;
  file_type?: string | null;
  download_url?: string | null;
};
type Submission = {
  id: number;
  title?: string | null;
  description?: string | null;
  file_path?: string | null;
  download_url?: string | null;
  status: "submitted" | "reviewed" | "approved" | "rejected";
  reviewer_note?: string | null;
  user?: { id: number; name: string; surname: string; email: string } | null;
};

type Assignment = {
  id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  project_id: number;
  period_id: number;
  project?: Project | null;
  period?: { id: number; name: string } | null;
  submissions?: Submission[];
  attachments?: AssignmentAttachment[];
  submissions_count?: number;
};

type Paginated<T> = {
  data: T[];
};

const submissionStatusLabel: Record<Submission["status"], string> = {
  submitted: "Teslim Edildi",
  reviewed: "Incelendi",
  approved: "Onaylandi",
  rejected: "Reddedildi",
};

const submissionStatusChipClass: Record<Submission["status"], string> = {
  submitted: "panel-chip-info",
  reviewed: "panel-chip-info",
  approved: "panel-chip-success",
  rejected: "panel-chip-danger",
};

const submissionReviewActions: Array<{ status: Submission["status"]; label: string; className: string }> = [
  { status: "reviewed", label: "Incelendi", className: "panel-card-action-info" },
  { status: "approved", label: "Onayla", className: "panel-card-action-success" },
  { status: "rejected", label: "Reddet", className: "panel-card-action-danger" },
];

export default function PanelAssignmentsPage() {
  const { canAccessProject } = usePermissions();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [form, setForm] = useState({
    project_id: "",
    period_id: "",
    title: "",
    description: "",
    due_date: "",
    attachments: [] as File[],
  });
  const [projectFilter, setProjectFilter] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("project_id") ?? "all";
  });
  const [periodFilter, setPeriodFilter] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("period_id") ?? "all";
  });

  const createProjects = useMemo(
    () => projects.filter((project) => project.active_period?.id && canAccessProject("assignments.create", project.id)),
    [projects, canAccessProject],
  );
  const updateProjects = useMemo(
    () => projects.filter((project) => canAccessProject("assignments.update", project.id)),
    [projects, canAccessProject],
  );
  const formProjects = editingAssignment ? updateProjects : createProjects;
  const selectedProject = formProjects.find((project) => String(project.id) === form.project_id);
  const selectedPeriodId = form.period_id || (!editingAssignment && selectedProject?.active_period?.id ? String(selectedProject.active_period.id) : "");
  const selectedFormPeriod = periodOptionById(projects, selectedPeriodId);
  const canWriteSelectedAssignmentPeriod = periodHasWriteCapability(selectedFormPeriod, "create_operations");
  const editingHasSubmissions = Boolean((editingAssignment?.submissions_count ?? editingAssignment?.submissions?.length ?? 0) > 0);
  useEffect(() => {
    let isActive = true;
    const initialProjectId = new URLSearchParams(window.location.search).get("project_id");
    Promise.all([
      api.get<{ assignments: Paginated<Assignment> }>("/panel/assignments", {
        params: {
          project_id: initialProjectId ?? undefined,
          period_id: new URLSearchParams(window.location.search).get("period_id") ?? undefined,
        },
      }),
      api.get<{ projects: Project[] }>("/panel/projects/manageable", { params: { permission: "assignments.view" } }),
    ])
      .then(([assignmentsResponse, projectsResponse]) => {
        if (!isActive) return;
        setAssignments(assignmentsResponse.data.assignments?.data ?? []);
        setProjects(projectsResponse.data.projects ?? []);
        if (initialProjectId) {
          const project = projectsResponse.data.projects?.find((item) => String(item.id) === initialProjectId);
          const nextPeriod = new URLSearchParams(window.location.search).get("period_id") ?? (defaultPeriodIdForProject(project) || "");
          setForm((current) => ({ ...current, project_id: initialProjectId, period_id: nextPeriod }));
          setPeriodFilter(nextPeriod || "all");
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function refreshAssignments(nextProject = projectFilter, nextPeriod = periodFilter) {
    const response = await api.get<{ assignments: Paginated<Assignment> }>("/panel/assignments", {
      params: {
        project_id: nextProject !== "all" ? nextProject : undefined,
        period_id: nextPeriod !== "all" ? nextPeriod : undefined,
      },
    });
    setAssignments(response.data.assignments?.data ?? []);
  }

  function resetForm() {
    setEditingAssignment(null);
    setForm({ project_id: "", period_id: "", title: "", description: "", due_date: "", attachments: [] });
  }

  function startEdit(assignment: Assignment) {
    setEditingAssignment(assignment);
    setForm({
      project_id: String(assignment.project_id),
      period_id: String(assignment.period_id ?? assignment.period?.id ?? ""),
      title: assignment.title,
      description: assignment.description ?? "",
      due_date: toIstanbulDateTimeLocal(assignment.due_date),
      attachments: [],
    });
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject || !selectedPeriodId) return;
    setSaving(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("project_id", String(selectedProject.id));
      formData.append("period_id", String(selectedPeriodId));
      formData.append("title", form.title);
      if (form.description) formData.append("description", form.description);
      if (form.due_date) formData.append("due_date", withIstanbulOffset(form.due_date) ?? "");
      form.attachments.forEach((file) => formData.append("attachments[]", file));
      if (editingAssignment) formData.append("_method", "PUT");

      const response = editingAssignment
        ? await api.post<{ message: string; assignment: Assignment }>(`/panel/assignments/${editingAssignment.id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        : await api.post<{ message: string; assignment: Assignment }>("/panel/assignments", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

      setAssignments((current) =>
        editingAssignment
          ? current.map((item) => (item.id === editingAssignment.id ? response.data.assignment : item))
          : [response.data.assignment, ...current],
      );
      setFeedback(response.data.message);
      resetForm();
    } catch (error) {
      console.error("Odev kaydedilemedi", error);
      const apiMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setFeedback(apiMessage ?? "Odev kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(assignment: Assignment) {
    await api.delete(`/panel/assignments/${assignment.id}`);
    setAssignments((current) => current.filter((item) => item.id !== assignment.id));
  }

  async function handleReview(submission: Submission, status: Submission["status"]) {
    const response = await api.put<{ message: string; submission: Submission }>(`/panel/assignment-submissions/${submission.id}/review`, { status });
    setFeedback(response.data.message);
    setAssignments((current) =>
      current.map((assignment) => ({
        ...assignment,
        submissions: assignment.submissions?.map((item) => (item.id === submission.id ? response.data.submission : item)),
      })),
    );
  }

  async function handleDownload(submission: Submission) {
    if (!submission.download_url) return;

    try {
      const response = await api.get(submission.download_url, { responseType: "blob" });
      await downloadBlobResponse(response.data, response.headers, `odev_teslimi_${submission.id}`);
    } catch (error) {
      console.error("Teslim dosyasi indirilemedi", error);
      setFeedback("Teslim dosyasi indirilemedi.");
    }
  }
  async function handleDownloadAttachment(attachment: AssignmentAttachment) {
    if (!attachment.download_url) return;

    try {
      const response = await api.get(attachment.download_url, { responseType: "blob" });
      await downloadBlobResponse(response.data, response.headers, attachment.original_name || `odev_eki_${attachment.id}`);
    } catch (error) {
      console.error("Odev eki indirilemedi", error);
      setFeedback("Odev eki indirilemedi.");
    }
  }
  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/15 text-violet-600">
            <FileStack className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Odevler</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Proje bazli odev ve teslim takibi
            </p>
          </div>
        </div>
        <PermissionGate permission="assignments.view">
          <ExportButtons
            endpoint="/panel/assignments/export"
            filename="odevler"
            params={{
              project_id: projectFilter !== "all" ? projectFilter : undefined,
              period_id: periodFilter !== "all" ? periodFilter : undefined,
            }}
            buttonLabel="Odevleri Disa Aktar"
          />
        </PermissionGate>
      </div>

      {feedback ? <div className="panel-notice panel-notice-success">{feedback}</div> : null}

      <PermissionGate permissions={["assignments.create", "assignments.update"]} require="any">
        <form onSubmit={handleSubmit} className="panel-section-card">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{editingAssignment ? "Odevi Duzenle" : "Yeni Odev"}</h2>
              {editingAssignment && editingHasSubmissions ? (
                <p className="mt-1 text-xs font-semibold text-amber-700">Teslimi olan odevlerde proje ve donem degistirilemez.</p>
              ) : null}
            </div>
            {editingAssignment ? (
              <button type="button" onClick={resetForm} className="panel-card-action">
                <X className="h-4 w-4" />
                Duzenlemeyi iptal et
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr_220px]">
            <select
              value={form.project_id}
              onChange={(event) => {
                const projectId = event.target.value;
                const project = formProjects.find((item) => String(item.id) === projectId);
                const nextPeriod = editingAssignment ? "" : defaultPeriodIdForProject(project);
                setForm((current) => ({ ...current, project_id: projectId, period_id: nextPeriod }));
              }}
              disabled={Boolean(editingAssignment && editingHasSubmissions)}
              required
              className="panel-control"
            >
              <option value="">Proje sec</option>
              {formProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <select
              value={form.period_id}
              onChange={(event) => setForm((current) => ({ ...current, period_id: event.target.value }))}
              disabled={!form.project_id || Boolean(editingAssignment && editingHasSubmissions)}
              required
              className="panel-control"
            >
              <option value="">Donem sec</option>
              {(selectedProject?.periods ?? []).map((period) => (
                <option key={period.id} value={period.id}>{period.name}</option>
              ))}
            </select>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              required
              placeholder="Odev basligi"
              className="panel-control"
            />
            <input
              type="datetime-local"
              value={form.due_date}
              onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))}
              className="panel-control"
            />
          </div>
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            rows={3}
            placeholder="Odev aciklamasi"
            className="panel-textarea mt-4"
          />
          <label className="panel-file-drop mt-4 flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-bold text-slate-700">
            <Upload className="h-4 w-4" />
            {form.attachments.length ? `${form.attachments.length} dosya secildi` : editingAssignment ? "Yeni odev dosyasi ekle" : "Odev dosyasi ekle"}
            <input
              key={editingAssignment?.id ?? "new-assignment"}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => setForm((current) => ({ ...current, attachments: Array.from(event.target.files ?? []) }))}
            />
          </label>
          {form.attachments.length ? (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {form.attachments.map((file) => (
                <span key={`${file.name}-${file.size}`} className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">{file.name}</span>
              ))}
            </div>
          ) : null}
          <div className="panel-modal-footer mt-4 gap-2">
            {editingAssignment ? (
              <button type="button" onClick={resetForm} className="panel-button panel-button-secondary h-11 px-6">
                Vazgec
              </button>
            ) : null}
            <button
              disabled={saving || !selectedProject || !selectedPeriodId || !canWriteSelectedAssignmentPeriod}
              title={!canWriteSelectedAssignmentPeriod && selectedPeriodId ? "Bu dönemde ödev ekleme veya düzenleme işlemi kapalıdır." : undefined}
              className="panel-button panel-button-primary h-11 px-6 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : editingAssignment ? "Odevi Guncelle" : "Odev Olustur"}
            </button>
          </div>
        </form>
      </PermissionGate>
      <PermissionGate permission="assignments.view">
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
              void refreshAssignments(value, nextPeriod);
            }}
            onPeriodChange={(value) => {
              setPeriodFilter(value);
              void refreshAssignments(projectFilter, value);
            }}
          />
        </div>
        <div className="panel-section-card p-0">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {assignments.map((assignment) => {
                const assignmentPeriod = periodOptionById(projects, assignment.period_id);
                const canWriteAssignment = periodHasWriteCapability(assignmentPeriod, "create_operations");
                const canResolveAssignment = periodHasWriteCapability(assignmentPeriod, "resolve_operations");
                return (
                <div key={assignment.id} className="panel-list-card">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-base font-bold text-slate-900">{assignment.title}</div>
                      <div className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {assignment.project?.name ?? "-"} / {assignment.period?.name ?? "Donem yok"} / {assignment.submissions_count ?? 0} teslim
                      </div>
                      {assignment.description ? <p className="mt-2 text-sm text-muted-foreground">{assignment.description}</p> : null}
                      {assignment.attachments?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {assignment.attachments.map((attachment) => (
                            <button
                              key={attachment.id}
                              type="button"
                              onClick={() => void handleDownloadAttachment(attachment)}
                              className="panel-card-action panel-card-action-info py-1"
                            >
                              <Download className="h-3.5 w-3.5" />
                              {attachment.original_name || "Odev ekini indir"}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <PermissionGate permission="assignments.update" requireProjectAccess={{ permission: "assignments.update", projectId: assignment.project_id }}>
                        <button type="button" disabled={!canWriteAssignment} title={!canWriteAssignment ? "Bu dönem normal değişikliklere kapalıdır." : undefined} onClick={() => startEdit(assignment)} className="panel-card-action panel-card-action-info disabled:cursor-not-allowed disabled:opacity-40">
                          <Pencil className="h-4 w-4" />
                          Duzenle
                        </button>
                      </PermissionGate>
                      <PermissionGate permission="assignments.delete" requireProjectAccess={{ permission: "assignments.delete", projectId: assignment.project_id }}>
                        <button type="button" disabled={!canWriteAssignment} title={!canWriteAssignment ? "Bu dönem normal değişikliklere kapalıdır." : undefined} onClick={() => void handleDelete(assignment)} className="panel-card-action panel-card-action-danger disabled:cursor-not-allowed disabled:opacity-40">
                          <Trash2 className="h-4 w-4" />
                          Sil
                        </button>
                      </PermissionGate>
                    </div>
                  </div>
                  {assignment.submissions?.length ? (
                    <div className="mt-4 space-y-2">
                      {assignment.submissions.map((submission) => (
                        <div key={submission.id} className="panel-card-muted flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="font-bold text-slate-900">
                              {submission.user?.name} {submission.user?.surname}
                            </div>
                            <span className={`panel-chip mt-1 ${submissionStatusChipClass[submission.status]}`}>{submissionStatusLabel[submission.status]}</span>
                            {submission.title ? <div className="mt-1 text-xs font-bold text-slate-700">{submission.title}</div> : null}
                            {submission.description ? <div className="mt-1 text-xs text-muted-foreground">{submission.description}</div> : null}
                          </div>
                          <PermissionGate permission="assignments.submissions.review" requireProjectAccess={{ permission: "assignments.submissions.review", projectId: assignment.project_id }}>
                            <div className="flex flex-wrap gap-2">
                              {submission.download_url ? (
                                <button type="button" onClick={() => void handleDownload(submission)} className="panel-card-action panel-card-action-success py-1">
                                  <Download className="h-3.5 w-3.5" />
                                  Indir
                                </button>
                              ) : null}
                              {submissionReviewActions.map((action) => (
                                <button key={action.status} disabled={!canResolveAssignment} title={!canResolveAssignment ? "Bu dönemde sonuçlandırma işlemi kapalıdır." : undefined} onClick={() => void handleReview(submission, action.status)} className={`panel-card-action ${action.className} py-1 disabled:cursor-not-allowed disabled:opacity-40`}>
                                  {action.label}
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
              {assignments.length === 0 ? <div className="panel-empty-card">Odev bulunamadi.</div> : null}
            </div>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}
