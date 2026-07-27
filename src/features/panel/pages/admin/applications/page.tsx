"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { isAxiosError } from "axios";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  Loader2,
  MessageSquareText,
  Search,
  User,
  X,
} from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { defaultPeriodIdForProject, ProjectPeriodFilters, type PeriodOption } from "@/components/shared/ProjectPeriodFilters";
import { usePermissions } from "@/hooks/usePermissions";
import { formatIstanbulDate, formatIstanbulDateTime, withIstanbulOffset } from "@/lib/istanbul-time";

interface Project {
  id: number;
  name: string;
  periods?: PeriodOption[];
  active_period?: PeriodOption | null;
}

interface Application {
  id: number;
  user: {
    name: string;
    surname: string;
    email: string;
    phone?: string | null;
  };
  period?: {
    name: string;
  } | null;
  projectId: number;
  projectName: string;
  hasInterview: boolean;
  status: string;
  created_at: string;
  interview_at?: string | null;
  evaluation_note?: string | null;
  rejection_reason?: string | null;
  available_statuses?: ActionStatus[];
  workflow?: {
    has_interview: boolean;
    next_step?: string | null;
  };
  form_entries?: FormEntry[];
}

interface FormEntryFile {
  original_name?: string | null;
  mime_type?: string | null;
  size?: number | null;
  download_url?: string | null;
}

interface FormEntry {
  id: string;
  label: string;
  type: string;
  value?: unknown;
  file?: FormEntryFile | null;
}

interface ApplicationApiItem {
  id: number;
  user: {
    name: string;
    surname: string;
    email: string;
    phone?: string | null;
  };
  period?: {
    name: string;
  } | null;
  status: string;
  created_at: string;
  interview_at?: string | null;
  evaluation_note?: string | null;
  rejection_reason?: string | null;
  available_statuses?: ActionStatus[];
  workflow?: {
    has_interview: boolean;
    next_step?: string | null;
  };
  form_entries?: FormEntry[];
  project?: {
    id: number;
    name: string;
    has_interview?: boolean;
  } | null;
}

interface ApplicationPagination {
  data?: ApplicationApiItem[];
  current_page?: number;
  last_page?: number;
  total?: number;
  from?: number | null;
  to?: number | null;
}

type ActionStatus =
  | "accepted"
  | "rejected"
  | "waitlisted"
  | "interview_planned"
  | "interview_passed"
  | "interview_failed";

const statusOptions = [
  { value: "all", label: "Tum durumlar" },
  { value: "pending", label: "Bekleyen" },
  { value: "accepted", label: "Kabul Edilen" },
  { value: "waitlisted", label: "Yedek" },
  { value: "interview_planned", label: "Mulakat Planlandi" },
  { value: "interview_passed", label: "Mulakat Gecti" },
  { value: "interview_failed", label: "Mulakat Olumsuz" },
  { value: "rejected", label: "Reddedilen" },
];

const quickActions: Array<{ label: string; status: ActionStatus; tone: string }> = [
  { label: "Kabul Et", status: "accepted", tone: "panel-card-action-success" },
  { label: "Yedege Al", status: "waitlisted", tone: "panel-card-action-info" },
  { label: "Mulakat Planla", status: "interview_planned", tone: "panel-card-action-warning" },
  { label: "Reddet", status: "rejected", tone: "panel-card-action-danger" },
];

const perPage = 20;

function applicationActionPermission(status: ActionStatus): string {
  if (status === "interview_planned") return "applications.plan_interview";
  return status === "waitlisted" ? "applications.waitlist.manage" : "applications.update_status";
}

/** Backend `AdminApplicationController::allowedStatusesFor` ile ayni kurallar (aksiyon butonlari). */
function computeAvailableActionStatuses(application: Pick<Application, "status" | "hasInterview">): ActionStatus[] {
  if (!application.hasInterview) {
    if (application.status === "pending" || application.status === "waitlisted") {
      return ["accepted", "waitlisted", "rejected"];
    }
    return [];
  }

  switch (application.status) {
    case "pending":
    case "waitlisted":
      return ["interview_planned", "waitlisted", "rejected"];
    case "interview_planned":
      return ["interview_passed", "interview_failed", "waitlisted", "rejected"];
    case "interview_passed":
      return ["accepted", "waitlisted", "rejected"];
    case "interview_failed":
      return ["waitlisted", "rejected"];
    default:
      return [];
  }
}

/** Backend `nextWorkflowStep` ile uyumlu sonraki adim etiketi (bilgi bandi). */
function computeWorkflowNextStep(application: Pick<Application, "status" | "hasInterview">): string | null {
  if (!application.hasInterview) {
    return application.status === "pending" ? "final_decision" : null;
  }
  switch (application.status) {
    case "pending":
    case "waitlisted":
      return "plan_interview";
    case "interview_planned":
      return "record_interview_result";
    case "interview_passed":
      return "final_decision";
    default:
      return null;
  }
}

function statusLabel(status: string): string {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

function mapApplications(items: ApplicationApiItem[]): Application[] {
  return items.map((item) => ({
    ...item,
    projectId: item.project?.id ?? 0,
    projectName: item.project?.name ?? "-",
    hasInterview: Boolean(item.project?.has_interview),
  }));
}

function formatEntryValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function formatFileSize(size?: number | null): string {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminApplicationsPage() {
  const { canAccessProject, hasPermission } = usePermissions();
  const [projects, setProjects] = useState<Project[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("project_id") ?? "all";
  });
  const [periodFilter, setPeriodFilter] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("period_id") ?? "all";
  });
  const [statusFilter, setStatusFilter] = useState("pending");
  const [evaluationNote, setEvaluationNote] = useState<Record<number, string>>({});
  const [interviewPlanAt, setInterviewPlanAt] = useState<Record<number, string>>({});
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchManageableProjects = async () => {
      try {
        const projectResponse = hasPermission("applications.view")
          ? await api.get<{ projects: Project[] }>("/panel/projects/manageable", {
              params: { permission: "applications.view" },
            })
          : { data: { projects: [] as Project[] } };
        const projectItems = (projectResponse.data.projects ?? []).filter((project) =>
          canAccessProject("applications.view", project.id)
        );
        setProjects(projectItems);
        if (projectFilter !== "all" && periodFilter === "all") {
          const project = projectItems.find((item) => String(item.id) === projectFilter);
          setPeriodFilter(defaultPeriodIdForProject(project) || "all");
        }
      } catch (error) {
        console.error("Yetkili proje listesi yuklenemedi", error);
      }
    };

    void fetchManageableProjects();
  }, [hasPermission, canAccessProject, periodFilter, projectFilter]);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.get<{ applications: ApplicationPagination }>("/panel/applications", {
        params: {
          page,
          per_page: perPage,
          project_id: projectFilter !== "all" ? projectFilter : undefined,
          period_id: periodFilter !== "all" ? periodFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          search: searchTerm.trim() || undefined,
        },
      });
      const pagination = response.data.applications;

      setApplications(mapApplications(pagination?.data ?? []));
      setLastPage(pagination?.last_page ?? 1);
      setTotal(pagination?.total ?? 0);
      setRangeStart(pagination?.from ?? null);
      setRangeEnd(pagination?.to ?? null);
    } catch (error) {
      console.error("Basvurular yuklenemedi", error);
      setApplications([]);
      setLastPage(1);
      setTotal(0);
      setRangeStart(null);
      setRangeEnd(null);
      setErrorMessage("Basvuru listesi yuklenemedi. Sistemsel bir hata olustu.");
    } finally {
      setLoading(false);
    }
  }, [page, periodFilter, projectFilter, searchTerm, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchApplications();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchApplications]);

  const availableActionStatuses = (application: Application): ActionStatus[] =>
    computeAvailableActionStatuses(application);

  const handleStatusChange = async (id: number, status: ActionStatus) => {
    const note = evaluationNote[id]?.trim();
    const interviewAt = interviewPlanAt[id];
    setActionLoading(id);
    setMessage(null);
    setErrorMessage(null);

    try {
      if (status === "waitlisted") {
        await api.post(`/panel/applications/${id}/waitlist`, {
          evaluation_note: note || null,
        });
      } else if (status === "interview_planned") {
        await api.put(`/panel/applications/${id}/interview`, {
          interview_at: withIstanbulOffset(interviewAt),
        });
      } else {
        await api.put(`/panel/applications/${id}/status`, {
          status,
          evaluation_note: note || null,
          rejection_reason: status === "rejected" ? note || "Yonetim degerlendirmesi sonucunda reddedildi." : null,
        });
      }

      setApplications((prev) =>
        prev.map((application) => {
          if (application.id !== id) return application;
          const next: Application = {
            ...application,
            status,
            interview_at: status === "interview_planned" && interviewAt ? withIstanbulOffset(interviewAt) : application.interview_at,
            evaluation_note: note || application.evaluation_note,
            rejection_reason:
              status === "rejected" ? note || application.rejection_reason || "Yonetim degerlendirmesi sonucunda reddedildi." : application.rejection_reason,
            workflow: {
              has_interview: application.hasInterview,
              next_step: computeWorkflowNextStep({
                status,
                hasInterview: application.hasInterview,
              }),
            },
          };
          return next;
        })
      );

      setMessage("Basvuru durumu basariyla guncellendi.");
    } catch (error) {
      console.error("Basvuru durumu guncellenemedi", error);
      const responseMessage = isAxiosError(error)
        ? error.response?.data?.message ||
          Object.values(error.response?.data?.errors ?? {})
            .flat()
            .join(" ")
        : null;
      setErrorMessage(responseMessage || "Basvuru durumu guncellenirken hata olustu.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadFormFile = async (application: Application, entry: FormEntry) => {
    if (!entry.file?.download_url) return;

    try {
      const response = await api.get(entry.file.download_url, { responseType: "blob" });
      const contentType = String(response.headers["content-type"] ?? "");

      if (contentType.includes("application/json")) {
        const payload = JSON.parse(await response.data.text()) as { download_url?: string; message?: string };
        if (payload.download_url) {
          window.open(payload.download_url, "_blank", "noopener,noreferrer");
          return;
        }
        throw new Error(payload.message ?? "Basvuru dosyasi indirilemedi.");
      }

      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = entry.file.original_name || `basvuru_${application.id}_${entry.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Basvuru dosyasi indirilemedi", error);
      setErrorMessage("Basvuru dosyasi indirilemedi.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
            <ClipboardCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">BAŞVURU YÖNETİMİ</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Mulakatli ve mulakatsiz basvuru akislari proje ayarina gore yonetilir</p>
          </div>
        </div>
        <PermissionGate permission="applications.export">
          <ExportButtons
            endpoint="/panel/applications/export"
            filename="kademe_basvurular"
            params={{
              project_id: projectFilter !== "all" ? projectFilter : undefined,
              period_id: periodFilter !== "all" ? periodFilter : undefined,
              status: statusFilter !== "all" ? statusFilter : undefined,
              search: searchTerm || undefined,
            }}
          />
        </PermissionGate>
      </div>

      <div className="panel-filter-card">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(280px,1fr)_minmax(360px,440px)_220px] xl:items-end">
          <label className="panel-field">
            <span className="panel-label">Arama</span>
            <div className="relative">
              <Search className="panel-control-icon" />
              <input
                type="text"
                placeholder="Ogrenci, e-posta veya proje ara..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                className="panel-control pl-10"
              />
            </div>
          </label>
          <ProjectPeriodFilters
            projects={projects}
            selectedProjectId={projectFilter}
            selectedPeriodId={periodFilter}
            onProjectChange={(value) => {
              setProjectFilter(value);
              const project = projects.find((item) => String(item.id) === value);
              setPeriodFilter(value === "all" ? "all" : defaultPeriodIdForProject(project) || "all");
              setPage(1);
            }}
            onPeriodChange={(value) => {
              setPeriodFilter(value);
              setPage(1);
            }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          />
          <label className="panel-field">
            <span className="panel-label">Durum</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="panel-control"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {message && <div className="panel-notice panel-notice-success">{message}</div>}
      {errorMessage && <div className="panel-notice panel-notice-error">{errorMessage}</div>}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : applications.length === 0 ? (
        <div className="panel-empty-card py-16 font-bold">
          Secili filtrelerde basvuru bulunmuyor.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {applications.map((application, index) => (
            <motion.div
              key={application.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="panel-list-card"
            >
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
                    <User className="h-7 w-7" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {application.user.name} {application.user.surname}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="panel-chip panel-chip-info">
                          {application.projectName}
                        </span>
                        {application.period?.name && (
                          <span className="panel-chip">{application.period.name}</span>
                        )}
                        <span className="panel-chip">{statusLabel(application.status)}</span>
                        {application.hasInterview ? (
                          <span className="panel-chip panel-chip-warning">Akis: Mulakatli</span>
                        ) : (
                          <span className="panel-chip panel-chip-success">Akis: Mulakatsiz / Nihai Karar</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div>{application.user.email}</div>
                      {application.user.phone && <div>{application.user.phone}</div>}
                      <div className="flex items-center gap-1 font-bold">
                        <Calendar className="h-4 w-4" />
                        {formatIstanbulDate(application.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid w-full gap-3 xl:max-w-xl">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    <MessageSquareText className="h-4 w-4" />
                    Degerlendirme Notu
                  </div>
                  <textarea
                    rows={2}
                    value={evaluationNote[application.id] ?? application.evaluation_note ?? ""}
                    onChange={(event) =>
                      setEvaluationNote((prev) => ({
                        ...prev,
                        [application.id]: event.target.value,
                      }))
                    }
                    placeholder="Mulakat notu, yedek gerekcesi veya ret aciklamasi yazin..."
                    className="panel-textarea min-h-20"
                  />

                  {application.hasInterview && availableActionStatuses(application).includes("interview_planned") ? (
                    <input
                      type="datetime-local"
                      value={interviewPlanAt[application.id] ?? ""}
                      onChange={(event) =>
                        setInterviewPlanAt((prev) => ({
                          ...prev,
                          [application.id]: event.target.value,
                        }))
                      }
                      className="panel-control"
                    />
                  ) : application.interview_at ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-amber-700">
                      Mulakat: {formatIstanbulDateTime(application.interview_at)}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    {quickActions
                      .filter((action) =>
                        availableActionStatuses(application).includes(action.status) &&
                        canAccessProject(applicationActionPermission(action.status), application.projectId)
                      )
                      .map((action) => (
                        <button
                          key={action.status}
                          type="button"
                          onClick={() => void handleStatusChange(application.id, action.status)}
                          disabled={actionLoading === application.id || (action.status === "interview_planned" && !interviewPlanAt[application.id])}
                          className={`panel-card-action ${action.tone}`}
                        >
                          {actionLoading === application.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            action.label
                          )}
                        </button>
                      ))}

                    {application.status === "interview_planned" &&
                      canAccessProject("applications.update_status", application.projectId) && (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(application.id, "interview_passed")}
                            disabled={actionLoading === application.id}
                            className="panel-card-action panel-card-action-success"
                          >
                            {actionLoading === application.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <span className="flex items-center gap-1">
                                <Check className="h-4 w-4" /> BASARILI
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(application.id, "interview_failed")}
                            disabled={actionLoading === application.id}
                            className="panel-card-action panel-card-action-danger"
                          >
                            {actionLoading === application.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <span className="flex items-center gap-1">
                                <X className="h-4 w-4" /> OLUMSUZ
                              </span>
                            )}
                          </button>
                        </>
                    )}
                  </div>

                  {application.rejection_reason && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-bold text-amber-500">
                      <Clock className="h-4 w-4" />
                      Son ret/degerlendirme notu: {application.rejection_reason}
                    </div>
                  )}

                  {application.workflow?.next_step ? (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-indigo-700">
                      Sonraki adim:{" "}
                      {application.workflow.next_step === "plan_interview"
                        ? "Mulakat planla"
                        : application.workflow.next_step === "record_interview_result"
                          ? "Mulakat sonucunu isle"
                          : "Nihai karar ver"}
                    </div>
                  ) : null}
                </div>
              </div>

              {application.form_entries?.length ? (
                <div className="panel-card-muted mt-6">
                  <div className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Form cevaplari ve ekler
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {application.form_entries.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{entry.label}</div>
                        {entry.file ? (
                          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-slate-900">{entry.file.original_name || "Basvuru dosyasi"}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {[entry.file.mime_type, formatFileSize(entry.file.size)].filter(Boolean).join(" · ") || "Dosya"}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleDownloadFormFile(application, entry)}
                              className="panel-card-action panel-card-action-info shrink-0"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Indir
                            </button>
                          </div>
                        ) : (
                          <pre className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700">
                            {formatEntryValue(entry.value)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </motion.div>
          ))}

          <div className="panel-pagination">
            <div className="font-bold">
              {total > 0 && rangeStart && rangeEnd
                ? `${rangeStart}-${rangeEnd} / ${total} basvuru`
                : `${total} basvuru`}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || loading}
                className="panel-button-icon"
                aria-label="Onceki sayfa"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="panel-pagination-count min-w-24 text-center">
                {page} / {lastPage}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                disabled={page >= lastPage || loading}
                className="panel-button-icon"
                aria-label="Sonraki sayfa"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
