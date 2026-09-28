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
import { defaultPeriodIdForProject, periodHasWriteCapability, periodOptionById, ProjectPeriodFilters, type PeriodOption } from "@/components/shared/ProjectPeriodFilters";
import { usePermissions } from "@/hooks/usePermissions";
import { formatIstanbulDateTime, withIstanbulOffset } from "@/lib/istanbul-time";
import { panelStatusChipClass } from "@/lib/status-style";

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
    id: number;
    name: string;
  } | null;
  program?: {
    id: number;
    title: string;
  } | null;
  projectId: number;
  projectName: string;
  hasInterview: boolean;
  status: string;
  created_at: string;
  interview_at?: string | null;
  evaluation_note?: string | null;
  rejection_reason?: string | null;
  auto_rejected?: boolean;
  auto_rejection_reason?: string | null;
  screening_review_reason?: string | null;
  auto_rejection_corrected_at?: string | null;
  auto_rejection_corrected_by_name?: string | null;
  auto_rejection_correction_reason?: string | null;
  waitlist_order?: number | null;
  waitlist_invited_at?: string | null;
  waitlist_invitation_expires_at?: string | null;
  waitlist_invitation_delivery_status?: string | null;
  available_statuses?: ActionStatus[];
  workflow?: {
    has_interview: boolean;
    next_step?: string | null;
  };
  form_entries?: FormEntry[];
  consent_text_snapshot?: string | null;
  consent_accepted_at?: string | null;
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
    id: number;
    name: string;
  } | null;
  program?: {
    id: number;
    title: string;
  } | null;
  status: string;
  created_at: string;
  interview_at?: string | null;
  evaluation_note?: string | null;
  rejection_reason?: string | null;
  auto_rejected?: boolean;
  auto_rejection_reason?: string | null;
  screening_review_reason?: string | null;
  auto_rejection_corrected_at?: string | null;
  auto_rejection_corrected_by_name?: string | null;
  auto_rejection_correction_reason?: string | null;
  waitlist_order?: number | null;
  waitlist_invited_at?: string | null;
  waitlist_invitation_expires_at?: string | null;
  waitlist_invitation_delivery_status?: string | null;
  available_statuses?: ActionStatus[];
  workflow?: {
    has_interview: boolean;
    next_step?: string | null;
  };
  form_entries?: FormEntry[];
  consent_text_snapshot?: string | null;
  consent_accepted_at?: string | null;
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

interface DecisionResponse {
  follow_up?: {
    status_email_sent?: boolean | null;
    password_link_sent?: boolean | null;
    next_waitlist_checked?: boolean | null;
  };
}

type RetryType = "status" | "password";

type ActionStatus =
  | "accepted"
  | "rejected"
  | "waitlisted"
  | "interview_planned"
  | "interview_passed"
  | "interview_failed";

const statusOptions = [
  { value: "all", label: "Tüm durumlar" },
  { value: "pending", label: "Değerlendirme bekliyor" },
  { value: "accepted", label: "Kabul edildi" },
  { value: "waitlisted", label: "Yedek liste" },
  { value: "interview_planned", label: "Mülakat planlandı" },
  { value: "interview_passed", label: "Mülakat olumlu" },
  { value: "interview_failed", label: "Mülakat olumsuz" },
  { value: "rejected", label: "Reddedildi" },
];

const quickActions: Array<{ label: string; status: ActionStatus; tone: string }> = [
  { label: "Kabul Et", status: "accepted", tone: "panel-card-action-success" },
  { label: "Yedege Al", status: "waitlisted", tone: "panel-card-action-info" },
  { label: "Mulakat Planla", status: "interview_planned", tone: "panel-card-action-info" },
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
    hasInterview: item.workflow?.has_interview ?? Boolean(item.project?.has_interview),
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
  const [retryNeeded, setRetryNeeded] = useState<Record<number, RetryType[]>>({});
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
  const [rejectionReason, setRejectionReason] = useState<Record<number, string>>({});
  const [correctionReason, setCorrectionReason] = useState<Record<number, string>>({});
  const [interviewPlanAt, setInterviewPlanAt] = useState<Record<number, string>>({});
  const [waitlistOrderDraft, setWaitlistOrderDraft] = useState<Record<number, string>>({});
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
    application.available_statuses ?? computeAvailableActionStatuses(application);

  const handleSaveEvaluationNote = async (application: Application) => {
    const note = (evaluationNote[application.id] ?? "").trim();
    if (!note) {
      setErrorMessage("Kaydetmek için iç değerlendirme notunu yazın.");
      return;
    }
    setActionLoading(application.id);
    setMessage(null);
    setErrorMessage(null);
    try {
      await api.put(`/panel/applications/${application.id}/evaluation-note`, { evaluation_note: note });
      setApplications((current) => current.map((item) => item.id === application.id ? { ...item, evaluation_note: note } : item));
      setEvaluationNote((current) => { const next = { ...current }; delete next[application.id]; return next; });
      setMessage("İç değerlendirme notu kaydedildi. Adaya bildirim gönderilmedi.");
    } catch (error) {
      console.error("İç değerlendirme notu kaydedilemedi", error);
      setErrorMessage(isAxiosError(error) ? error.response?.data?.message || "İç değerlendirme notu kaydedilemedi." : "İç değerlendirme notu kaydedilemedi.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (id: number, status: ActionStatus) => {
    const note = evaluationNote[id]?.trim();
    const candidateReason = rejectionReason[id]?.trim();
    if (status === "rejected" && !candidateReason) {
      setErrorMessage("Ret kararında adaya gösterilecek gerekçeyi ayrı alana yazın.");
      return;
    }
    const interviewAt = interviewPlanAt[id];
    setActionLoading(id);
    setMessage(null);
    setErrorMessage(null);

    try {
      let result;
      if (status === "waitlisted") {
        result = await api.post<DecisionResponse>(`/panel/applications/${id}/waitlist`, {
          evaluation_note: note || null,
        });
      } else if (status === "interview_planned") {
        result = await api.put<DecisionResponse>(`/panel/applications/${id}/interview`, {
          interview_at: withIstanbulOffset(interviewAt),
          evaluation_note: note || null,
        });
      } else {
        result = await api.put<DecisionResponse>(`/panel/applications/${id}/status`, {
          status,
          evaluation_note: note || null,
          rejection_reason: status === "rejected" ? candidateReason : null,
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
              status === "rejected" ? candidateReason : application.rejection_reason,
            workflow: {
              has_interview: application.hasInterview,
              next_step: computeWorkflowNextStep({
                status,
                hasInterview: application.hasInterview,
              }),
            },
            available_statuses: computeAvailableActionStatuses({ status, hasInterview: application.hasInterview }),
          };
          return next;
        })
      );

      setEvaluationNote((current) => { const next = { ...current }; delete next[id]; return next; });
      if (status === "rejected") {
        setRejectionReason((current) => { const next = { ...current }; delete next[id]; return next; });
      }

      const followUp = result.data.follow_up;
      const pending: RetryType[] = [];
      if (followUp?.status_email_sent === false) pending.push("status");
      if (followUp?.password_link_sent === false) pending.push("password");
      setRetryNeeded((prev) => ({ ...prev, [id]: pending }));
      await fetchApplications();
      setMessage("Başvuru kararı kaydedildi.");
      if (pending.length > 0) {
        setErrorMessage("Başvuru kararı kaydedildi; e-posta gönderilemedi. Aşağıdaki düğmeyle yalnız bildirimi yeniden deneyebilirsiniz.");
      } else if (followUp?.next_waitlist_checked === false) {
        setErrorMessage("Ret kararı kaydedildi; sıradaki yedek için davet kontrolü tamamlanamadı.");
      }
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

  const handleReopenAutomaticRejection = async (application: Application) => {
    const reason = correctionReason[application.id]?.trim() ?? "";
    if (reason.length < 10) {
      setErrorMessage("Düzeltme nedenini en az 10 karakterle açıklayın.");
      return;
    }
    setActionLoading(application.id);
    setMessage(null);
    setErrorMessage(null);
    try {
      const result = await api.post<DecisionResponse>(`/panel/applications/${application.id}/reopen-auto-rejection`, { reason });
      setCorrectionReason((current) => { const next = { ...current }; delete next[application.id]; return next; });
      setRetryNeeded((current) => ({ ...current, [application.id]: result.data.follow_up?.status_email_sent === false ? ["status"] : [] }));
      setMessage("Otomatik ret düzeltildi; başvuru yeniden değerlendirmeye alındı.");
      if (result.data.follow_up?.status_email_sent === false) {
        setErrorMessage("Karar kaydedildi; adaya e-posta gönderilemedi. Yalnız bildirimi yeniden deneyebilirsiniz.");
      }
      setStatusFilter("pending");
      setPage(1);
    } catch (error) {
      const detail = isAxiosError(error) ? Object.values(error.response?.data?.errors ?? {}).flat().join(" ") || error.response?.data?.message : null;
      setErrorMessage(detail || "Otomatik ret düzeltilemedi.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleNotificationRetry = async (id: number, type: RetryType) => {
    setActionLoading(id);
    setErrorMessage(null);
    try {
      const response = await api.post<{ sent: boolean; message: string }>(`/panel/applications/${id}/notification-retry`, { type });
      if (response.data.sent) {
        setRetryNeeded((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((item) => item !== type) }));
        setMessage("Başvuru kararı değişmeden bildirim yeniden gönderildi.");
      } else {
        setErrorMessage(response.data.message);
      }
    } catch (error) {
      setErrorMessage(isAxiosError(error) ? error.response?.data?.message ?? "Bildirim gönderilemedi." : "Bildirim gönderilemedi.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleWaitlistInvitationRetry = async (id: number) => {
    setActionLoading(id);
    setErrorMessage(null);
    try {
      const response = await api.post<{
        invitation_email_sent: boolean;
        message: string;
        application: { waitlist_invitation_delivery_status: string };
      }>(`/panel/applications/${id}/waitlist-invite-retry`);
      setApplications((prev) => prev.map((application) => application.id === id
        ? { ...application, waitlist_invitation_delivery_status: response.data.application.waitlist_invitation_delivery_status }
        : application));
      if (response.data.invitation_email_sent) {
        setMessage("Yedek daveti e-postası gönderildi; cevap süresi başladı.");
      } else {
        setErrorMessage("Yedek daveti kaydı korundu; e-posta gönderilemedi ve cevap süresi başlamadı.");
      }
    } catch (error) {
      setErrorMessage(isAxiosError(error) ? error.response?.data?.message ?? "Davet e-postası gönderilemedi." : "Davet e-postası gönderilemedi.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleWaitlistAction = async (application: Application, action: "order" | "invite" | "refresh") => {
    const order = Number(waitlistOrderDraft[application.id] ?? application.waitlist_order ?? 1);
    if (action === "order" && (!Number.isInteger(order) || order < 1)) {
      setErrorMessage("Yedek sıra numarası 1 veya daha büyük bir tam sayı olmalı.");
      return;
    }
    setActionLoading(application.id);
    setMessage(null);
    setErrorMessage(null);
    try {
      let successMessage: string;
      let warningMessage: string | null = null;
      if (action === "order") {
        await api.put(`/panel/applications/${application.id}/waitlist-order`, { waitlist_order: order });
        successMessage = "Yedek sırası güncellendi.";
      } else if (action === "invite") {
        const result = await api.post<{ invitation_email_sent: boolean; message: string }>(`/panel/applications/${application.id}/waitlist-invite`);
        successMessage = result.data.message;
        if (!result.data.invitation_email_sent) warningMessage = "Davet e-postası gönderilemedi; adayın cevap süresi başlamadı.";
      } else {
        const result = await api.post<{ expired_count: number; auto_invited_application_id: number | null }>(`/panel/applications/${application.id}/waitlist-refresh`);
        successMessage = result.data.auto_invited_application_id
          ? `${result.data.expired_count} davetin süresi doldu; sıradaki adaya davet gönderildi.`
          : `${result.data.expired_count} davetin süresi doldu; gönderilecek yeni davet yok.`;
      }
      await fetchApplications();
      if (action === "order") setWaitlistOrderDraft((current) => { const next = { ...current }; delete next[application.id]; return next; });
      setMessage(successMessage);
      if (warningMessage) setErrorMessage(warningMessage);
    } catch (error) {
      const detail = isAxiosError(error) ? Object.values(error.response?.data?.errors ?? {}).flat().join(" ") || error.response?.data?.message : null;
      setErrorMessage(detail || "Yedek liste işlemi tamamlanamadı.");
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
              search: searchTerm.trim() || undefined,
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
          {applications.map((application, index) => {
            const applicationPeriod = periodOptionById(projects, application.period?.id);
            const canResolveApplication = periodHasWriteCapability(applicationPeriod, "resolve_operations");
            const canSaveEvaluationNote = canAccessProject("applications.update_status", application.projectId);
            const canEditEvaluationNote = canSaveEvaluationNote
              || canAccessProject("applications.plan_interview", application.projectId)
              || canAccessProject("applications.waitlist.manage", application.projectId);
            const noteDraft = evaluationNote[application.id];
            const noteChanged = noteDraft !== undefined && noteDraft.trim() !== (application.evaluation_note ?? "").trim();
            return (
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
                        {application.program?.title && (
                          <span className="panel-chip">Program: {application.program.title}</span>
                        )}
                        <span className={`panel-chip ${panelStatusChipClass(application.status)}`}>{statusLabel(application.status)}</span>
                        {application.status === "pending" && application.screening_review_reason && (
                          <span className="panel-chip panel-chip-warning">Ön inceleme gerekli</span>
                        )}
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
                        {formatIstanbulDateTime(application.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid w-full gap-3 xl:max-w-xl">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    <MessageSquareText className="h-4 w-4" />
                    İç değerlendirme notu
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
                    maxLength={5000}
                    disabled={!canEditEvaluationNote || !canResolveApplication || actionLoading === application.id}
                    placeholder="Yalnız yetkililerin göreceği değerlendirme notunu yazın..."
                    className="panel-textarea min-h-20"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Bu not adaya gönderilmez. Karar verirken yazılı not da kaydedilir.</span>
                    {canSaveEvaluationNote ? (
                      <button
                        type="button"
                        onClick={() => void handleSaveEvaluationNote(application)}
                        disabled={!canResolveApplication || actionLoading === application.id || !noteChanged || !noteDraft?.trim()}
                        className="panel-card-action panel-card-action-info disabled:opacity-40"
                      >
                        Notu Kaydet
                      </button>
                    ) : null}
                  </div>

                  {availableActionStatuses(application).includes("rejected") && canSaveEvaluationNote ? (
                    <label className="text-xs font-semibold text-slate-700">
                      Adaya gösterilecek ret gerekçesi
                      <textarea
                        rows={2}
                        value={rejectionReason[application.id] ?? ""}
                        onChange={(event) => setRejectionReason((current) => ({ ...current, [application.id]: event.target.value }))}
                        maxLength={2000}
                        disabled={!canResolveApplication || actionLoading === application.id}
                        placeholder="Ret kararında adayın göreceği açıklamayı yazın..."
                        className="panel-textarea mt-2 min-h-20"
                      />
                    </label>
                  ) : null}

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
                          disabled={!canResolveApplication || actionLoading === application.id || (action.status === "interview_planned" && !interviewPlanAt[application.id])}
                          title={!canResolveApplication ? "Bu dönemde başvuru sonuçlandırma işlemi kapalıdır." : undefined}
                          className={`panel-card-action ${action.tone} disabled:cursor-not-allowed disabled:opacity-40`}
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
                            disabled={!canResolveApplication || actionLoading === application.id}
                            title={!canResolveApplication ? "Bu dönemde başvuru sonuçlandırma işlemi kapalıdır." : undefined}
                            className="panel-card-action panel-card-action-success disabled:cursor-not-allowed disabled:opacity-40"
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
                            disabled={!canResolveApplication || actionLoading === application.id}
                            title={!canResolveApplication ? "Bu dönemde başvuru sonuçlandırma işlemi kapalıdır." : undefined}
                            className="panel-card-action panel-card-action-danger disabled:cursor-not-allowed disabled:opacity-40"
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

                  {application.status === "rejected" && application.auto_rejected && !application.auto_rejection_corrected_at && canAccessProject("applications.update_status", application.projectId) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-bold">Otomatik ret hatalıysa yeniden incelemeye aç</p>
                      <p className="mt-1">İlk ret gerekçesi saklanır. Bu işlem kabul kararı vermez; başvuru yeniden değerlendirilir.</p>
                      <textarea
                        value={correctionReason[application.id] ?? ""}
                        onChange={(event) => setCorrectionReason((current) => ({ ...current, [application.id]: event.target.value }))}
                        maxLength={2000}
                        rows={2}
                        placeholder="Düzeltmenin nedenini yazın (en az 10 karakter)"
                        className="panel-textarea mt-3"
                      />
                      <button
                        type="button"
                        onClick={() => void handleReopenAutomaticRejection(application)}
                        disabled={!canResolveApplication || actionLoading === application.id || (correctionReason[application.id]?.trim().length ?? 0) < 10}
                        className="panel-card-action panel-card-action-info mt-3 disabled:opacity-40"
                      >
                        Yeniden incelemeye aç
                      </button>
                    </div>
                  )}

                  {(application.status !== "pending" || application.auto_rejection_corrected_at) && canAccessProject("applications.update_status", application.projectId) && (
                    <div className="flex flex-wrap gap-2">
                      {(["status", ...(application.status === "accepted" ? ["password"] : [])] as RetryType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => void handleNotificationRetry(application.id, type)}
                          disabled={actionLoading === application.id}
                          className="panel-card-action panel-card-action-info disabled:opacity-40"
                        >
                          {type === "status" ? "Durum e-postasını yeniden gönder" : "Şifre bağlantısını yeniden gönder"}
                          {(retryNeeded[application.id] ?? []).includes(type) ? " (gönderilemedi)" : ""}
                        </button>
                      ))}
                    </div>
                  )}

                  {application.status === "waitlisted" && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
                      <p className="font-bold">Yedek liste · Sıra {application.waitlist_order ?? "belirlenmedi"}</p>
                      {application.waitlist_invitation_delivery_status === "sent" && application.waitlist_invitation_expires_at && (
                        <p className="mt-1">Davet gönderildi. Son yanıt: {formatIstanbulDateTime(application.waitlist_invitation_expires_at)}</p>
                      )}
                      {application.waitlist_invitation_delivery_status === "expired" && (
                        <p className="mt-1">Önceki davetin süresi doldu. Bu aday otomatik olarak yeniden çağrılmaz.</p>
                      )}
                      {canAccessProject("applications.waitlist.manage", application.projectId) && (
                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <label className="text-xs font-semibold">
                            Sıraya taşı
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={waitlistOrderDraft[application.id] ?? String(application.waitlist_order ?? 1)}
                              onChange={(event) => setWaitlistOrderDraft((current) => ({ ...current, [application.id]: event.target.value }))}
                              disabled={!canResolveApplication || actionLoading === application.id}
                              className="panel-control mt-1 w-24"
                            />
                          </label>
                          <button type="button" onClick={() => void handleWaitlistAction(application, "order")}
                            disabled={!canResolveApplication || actionLoading === application.id}
                            className="panel-card-action panel-card-action-info disabled:opacity-40">Sırayı kaydet</button>
                          {(!application.waitlist_invited_at || application.waitlist_invitation_delivery_status === "expired") && (
                            <button type="button" onClick={() => void handleWaitlistAction(application, "invite")}
                              disabled={!canResolveApplication || actionLoading === application.id}
                              className="panel-card-action panel-card-action-info disabled:opacity-40">Davet gönder</button>
                          )}
                          <button type="button" onClick={() => void handleWaitlistAction(application, "refresh")}
                            disabled={!canResolveApplication || actionLoading === application.id}
                            className="panel-card-action panel-card-action-info disabled:opacity-40">Süresi dolanları kontrol et</button>
                        </div>
                      )}
                    </div>
                  )}

                  {application.status === "waitlisted" && application.waitlist_invitation_delivery_status === "failed" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Davet e-postası gönderilemedi. Adayın cevap süresi henüz başlamadı.
                      {canAccessProject("applications.waitlist.manage", application.projectId) && (
                        <button
                          type="button"
                          onClick={() => void handleWaitlistInvitationRetry(application.id)}
                          disabled={!canResolveApplication || actionLoading === application.id}
                          className="panel-card-action panel-card-action-info mt-3 disabled:opacity-40"
                        >
                          Yalnız davet e-postasını yeniden gönder
                        </button>
                      )}
                    </div>
                  )}

                  {application.status === "waitlisted" && application.waitlist_invitation_delivery_status === "pending" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Davet e-postasının sonucu henüz kesinleşmedi. Adayın cevap süresi başlamadı; gönderim durumu kontrol edilmeli.
                    </div>
                  )}

                  {application.status === "waitlisted" && application.waitlist_invitation_delivery_status === "unknown" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Davet e-postasının sonucu doğrulanamadı. Cevap süresi başlamadı. Yeniden göndermeden önce gönderim kaydı kontrol edilmeli.
                    </div>
                  )}

                  {application.rejection_reason && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-bold text-amber-500">
                      <Clock className="h-4 w-4" />
                      Son ret/degerlendirme notu: {application.rejection_reason}
                    </div>
                  )}

                  {application.screening_review_reason && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                      <strong>{application.status === "pending" ? "Koordinatör incelemesi:" : "İlk ön inceleme nedeni:"}</strong> {application.screening_review_reason}
                    </div>
                  )}

                  {application.auto_rejection_reason && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <strong>İlk otomatik ret gerekçesi:</strong> {application.auto_rejection_reason}
                      {application.auto_rejection_corrected_at && (
                        <p className="mt-2">
                          {formatIstanbulDateTime(application.auto_rejection_corrected_at)} tarihinde {application.auto_rejection_corrected_by_name || "yetkili kişi"} tarafından yeniden incelemeye alındı.
                          {application.auto_rejection_correction_reason && ` Düzeltme nedeni: ${application.auto_rejection_correction_reason}`}
                        </p>
                      )}
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
              <details className="panel-card-muted mt-4">
                <summary className="cursor-pointer text-sm font-bold text-slate-900">Başvuru koşulu onayı</summary>
                {application.consent_accepted_at && application.consent_text_snapshot ? (
                  <div className="mt-3 text-sm text-slate-700">
                    <p>Kabul zamanı: {formatIstanbulDateTime(application.consent_accepted_at)}</p>
                    <p className="mt-2 whitespace-pre-line">{application.consent_text_snapshot}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Bu eski başvuru için onay kaydı bulunmuyor.</p>
                )}
              </details>
            </motion.div>
            );
          })}

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
