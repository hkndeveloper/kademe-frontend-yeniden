"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileStack, Loader2, Trash2 } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

type Project = {
  id: number;
  name: string;
  active_period?: { id: number; name?: string | null } | null;
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
  project?: Project | null;
  period?: { id: number; name: string } | null;
  submissions?: Submission[];
  submissions_count?: number;
};

type Paginated<T> = {
  data: T[];
};

export default function PanelAssignmentsPage() {
  const { canAccessProject } = usePermissions();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({
    project_id: "",
    title: "",
    description: "",
    due_date: "",
  });

  const createProjects = useMemo(
    () => projects.filter((project) => project.active_period?.id && canAccessProject("assignments.create", project.id)),
    [projects, canAccessProject],
  );
  const selectedProject = createProjects.find((project) => String(project.id) === form.project_id);

  useEffect(() => {
    let isActive = true;
    const initialProjectId = new URLSearchParams(window.location.search).get("project_id");
    Promise.all([
      api.get<{ assignments: Paginated<Assignment> }>("/panel/assignments", {
        params: { project_id: initialProjectId ?? undefined },
      }),
      api.get<{ projects: Project[] }>("/panel/projects/manageable", { params: { permission: "assignments.view" } }),
    ])
      .then(([assignmentsResponse, projectsResponse]) => {
        if (!isActive) return;
        setAssignments(assignmentsResponse.data.assignments?.data ?? []);
        setProjects(projectsResponse.data.projects ?? []);
        if (initialProjectId) {
          setForm((current) => ({ ...current, project_id: initialProjectId }));
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject?.active_period?.id) return;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await api.post<{ message: string; assignment: Assignment }>("/panel/assignments", {
        project_id: selectedProject.id,
        period_id: selectedProject.active_period.id,
        title: form.title,
        description: form.description || null,
        due_date: form.due_date || null,
      });
      setAssignments((current) => [response.data.assignment, ...current]);
      setFeedback(response.data.message);
      setForm({ project_id: "", title: "", description: "", due_date: "" });
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
      const contentType = String(response.headers["content-type"] ?? "");

      if (contentType.includes("application/json")) {
        const payload = JSON.parse(await response.data.text()) as { download_url?: string; message?: string };
        if (payload.download_url) {
          window.open(payload.download_url, "_blank", "noopener,noreferrer");
          return;
        }
        throw new Error(payload.message ?? "Teslim dosyasi indirilemedi.");
      }

      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `odev_teslimi_${submission.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Teslim dosyasi indirilemedi", error);
      setFeedback("Teslim dosyasi indirilemedi.");
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
          <ExportButtons endpoint="/panel/assignments/export" filename="odevler" buttonLabel="Odevleri Disa Aktar" />
        </PermissionGate>
      </div>

      {feedback ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700">{feedback}</div> : null}

      <PermissionGate permission="assignments.create">
        <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_220px]">
            <select
              value={form.project_id}
              onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))}
              required
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            >
              <option value="">Proje sec</option>
              {createProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              required
              placeholder="Odev basligi"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            />
            <input
              type="datetime-local"
              value={form.due_date}
              onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            />
          </div>
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            rows={3}
            placeholder="Odev aciklamasi"
            className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
          />
          <div className="mt-4 flex justify-end">
            <button disabled={saving || !selectedProject} className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
              {saving ? "Kaydediliyor..." : "Odev Olustur"}
            </button>
          </div>
        </form>
      </PermissionGate>

      <PermissionGate permission="assignments.view">
        <div className="glass-panel overflow-hidden rounded-3xl">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : (
            <div className="divide-y divide-slate-200/70">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-base font-bold text-slate-900">{assignment.title}</div>
                      <div className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {assignment.project?.name ?? "-"} / {assignment.period?.name ?? "Donem yok"} / {assignment.submissions_count ?? 0} teslim
                      </div>
                      {assignment.description ? <p className="mt-2 text-sm text-muted-foreground">{assignment.description}</p> : null}
                    </div>
                    <PermissionGate permission="assignments.delete" requireProjectAccess={{ permission: "assignments.delete", projectId: assignment.project_id }}>
                      <button onClick={() => void handleDelete(assignment)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
                        <Trash2 className="h-4 w-4" />
                        Sil
                      </button>
                    </PermissionGate>
                  </div>
                  {assignment.submissions?.length ? (
                    <div className="mt-4 space-y-2">
                      {assignment.submissions.map((submission) => (
                        <div key={submission.id} className="flex flex-col gap-3 rounded-2xl bg-white p-3 text-sm md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="font-bold text-slate-900">
                              {submission.user?.name} {submission.user?.surname}
                            </div>
                            <div className="text-xs uppercase tracking-widest text-muted-foreground">{submission.status}</div>
                            {submission.title ? <div className="mt-1 text-xs font-bold text-slate-700">{submission.title}</div> : null}
                            {submission.description ? <div className="mt-1 text-xs text-muted-foreground">{submission.description}</div> : null}
                          </div>
                          <PermissionGate permission="assignments.submissions.review" requireProjectAccess={{ permission: "assignments.submissions.review", projectId: assignment.project_id }}>
                            <div className="flex flex-wrap gap-2">
                              {submission.download_url ? (
                                <button type="button" onClick={() => void handleDownload(submission)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">
                                  <Download className="h-3.5 w-3.5" />
                                  Indir
                                </button>
                              ) : null}
                              {(["reviewed", "approved", "rejected"] as const).map((status) => (
                                <button key={status} onClick={() => void handleReview(submission, status)} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold uppercase text-slate-700">
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
              {assignments.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Odev bulunamadi.</div> : null}
            </div>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}
