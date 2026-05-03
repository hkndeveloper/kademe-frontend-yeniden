"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Loader2,
  MessageSquareText,
  Search,
  User,
  X,
} from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

interface Project {
  id: number;
  name: string;
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
  { label: "Kabul Et", status: "accepted", tone: "bg-green-500 text-white shadow-lg shadow-green-500/20" },
  { label: "Yedege Al", status: "waitlisted", tone: "border border-blue-500/30 text-blue-400 hover:bg-blue-500/10" },
  { label: "Mulakat Planla", status: "interview_planned", tone: "border border-amber-500/30 text-amber-400 hover:bg-amber-500/10" },
  { label: "Reddet", status: "rejected", tone: "border border-destructive/30 text-destructive hover:bg-destructive/10" },
];

const perPage = 20;

function applicationActionPermission(status: ActionStatus): string {
  return status === "waitlisted" ? "applications.waitlist.manage" : "applications.update_status";
}

function mapApplications(items: ApplicationApiItem[]): Application[] {
  return items.map((item) => ({
    ...item,
    projectId: item.project?.id ?? 0,
    projectName: item.project?.name ?? "-",
    hasInterview: Boolean(item.project?.has_interview),
  }));
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
      } catch (error) {
        console.error("Yetkili proje listesi yuklenemedi", error);
      }
    };

    void fetchManageableProjects();
  }, [hasPermission, canAccessProject]);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.get<{ applications: ApplicationPagination }>("/panel/applications", {
        params: {
          page,
          per_page: perPage,
          project_id: projectFilter !== "all" ? projectFilter : undefined,
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
  }, [page, projectFilter, searchTerm, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchApplications();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchApplications]);

  const availableActionStatuses = (application: Application): ActionStatus[] => {
    if (!application.hasInterview) {
      return ["accepted", "waitlisted", "rejected"];
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
  };

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
      } else {
        await api.put(`/panel/applications/${id}/status`, {
          status,
          interview_at: status === "interview_planned" && interviewAt ? interviewAt : undefined,
          evaluation_note: note || null,
          rejection_reason: status === "rejected" ? note || "Yonetim degerlendirmesi sonucunda reddedildi." : null,
        });
      }

      setApplications((prev) =>
        prev.map((application) =>
          application.id === id
            ? {
                ...application,
                status,
                interview_at: status === "interview_planned" && interviewAt ? interviewAt : application.interview_at,
                evaluation_note: note || application.evaluation_note,
                rejection_reason: status === "rejected" ? note || application.rejection_reason : application.rejection_reason,
              }
            : application
        )
      );

      setMessage("Basvuru durumu basariyla guncellendi.");
    } catch (error) {
      console.error("Basvuru durumu guncellenemedi", error);
      setErrorMessage("Basvuru durumu guncellenirken hata olustu.");
    } finally {
      setActionLoading(null);
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
            <h1 className="text-3xl font-black text-slate-900">BASVURU YONETIMI</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Tek Panel - Scope Tabanli Degerlendirme</p>
          </div>
        </div>
        <PermissionGate permission="applications.export">
          <ExportButtons
            endpoint="/panel/applications/export"
            filename="kademe_basvurular"
            params={{
              project_id: projectFilter !== "all" ? projectFilter : undefined,
              status: statusFilter !== "all" ? statusFilter : undefined,
              search: searchTerm || undefined,
            }}
          />
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,220px,220px]">
        <div className="relative">
          <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Ogrenci, e-posta veya proje ara..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-4 pl-10 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white/10"
          />
        </div>
        <select
          value={projectFilter}
          onChange={(event) => {
            setProjectFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500"
        >
          <option value="all">Tum Projeler</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {message && <div className="rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-400">{message}</div>}
      {errorMessage && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400">{errorMessage}</div>}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : applications.length === 0 ? (
        <div className="glass-panel rounded-3xl border border-dashed border-white/10 p-20 text-center font-bold text-muted-foreground">
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
              className="glass-panel rounded-3xl border border-white/5 bg-white/5 p-6 hover:bg-white/10"
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
                        <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                          {application.projectName}
                        </span>
                        {application.period?.name && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{application.period.name}</span>
                        )}
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{application.status}</span>
                        {application.hasInterview ? (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">Mulakatli</span>
                        ) : (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">Mulakatsiz</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div>{application.user.email}</div>
                      {application.user.phone && <div>{application.user.phone}</div>}
                      <div className="flex items-center gap-1 font-bold">
                        <Calendar className="h-4 w-4" />
                        {new Date(application.created_at).toLocaleDateString("tr-TR")}
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white/5"
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white/5"
                    />
                  ) : application.interview_at ? (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-amber-400">
                      Mulakat: {new Date(application.interview_at).toLocaleString("tr-TR")}
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
                          className={`rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-60 ${action.tone}`}
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
                            className="rounded-xl border border-green-500/30 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-green-400 transition-all hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-60"
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
                            className="rounded-xl border border-destructive/30 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-destructive transition-all hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
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
                </div>
              </div>
            </motion.div>
          ))}

          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Onceki sayfa"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-24 text-center text-xs font-bold uppercase tracking-widest">
                {page} / {lastPage}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                disabled={page >= lastPage || loading}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
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
