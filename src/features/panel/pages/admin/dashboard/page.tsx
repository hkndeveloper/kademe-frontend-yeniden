"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Calendar, CreditCard, BarChart3, MessageSquare, TrendingUp, ClipboardList, Loader2, CheckCircle2, Send, AlertTriangle, Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { DashboardCharts, type DashboardChartsData } from "@/components/panel/DashboardCharts";
import { defaultPeriodIdForProject, periodsForProject, type PeriodOption } from "@/components/shared/ProjectPeriodFilters";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/store/useAuth";
import { formatIstanbulDayNumber, formatIstanbulTime, formatIstanbulWeekdayShort } from "@/lib/istanbul-time";

interface DashboardStats {
  students: { active: number };
  programs: { monthly_total: number; monthly_completed: number; monthly_upcoming: number };
  financials: { monthly_expense: number; expense_change_percent: number | null; pending_count: number };
  pending: { applications: number; support: number; financials: number };
  credit_risk?: {
    count: number;
    participants: Array<{
      id: number;
      student: string;
      email?: string | null;
      project?: { id: number; name: string; slug: string } | null;
      period?: { id: number; name: string; credit_threshold: number } | null;
      credit: number;
      threshold: number;
    }>;
  };
  project_occupancy: Array<{
    id: number;
    name: string;
    active: number;
    total?: number;
    waitlist?: number;
    graduates?: number;
    not_completed?: number;
    max: number | null;
    capacity?: number | null;
    rate: number | null;
  }>;
  sms: { total_this_month: number; by_project: Array<{ project_id: number; count: number; project: { name: string } }> };
  upcoming_programs: Array<{ id: number; title: string; start_at: string; location: string; project_id: number; project?: { name: string } }>;
  assigned_tasks: Array<{
    id: number;
    program_id: number | null;
    title: string;
    start_at: string | null;
    location: string | null;
    status: string | null;
    project?: { id: number; name: string; slug: string } | null;
  }>;
  user_stats: Record<string, number>;
  charts?: DashboardChartsData;
  stats_scope?: "global" | "projects" | string;
  dashboard_context?: {
    project_id?: number | null;
    period_id?: number | null;
    archive_mode?: boolean;
    projects?: DashboardProject[];
  };
  period_analytics?: {
    period: PeriodOption;
    participants_total: number;
    participants_active: number;
    programs_total: number;
    attendance_present: number;
    applications_total: number;
    credit_log_total: number;
    assignments_total: number;
    assignment_submissions_total: number;
    feedback_count: number;
    feedback_numeric_average: number | null;
    financial_total: number;
    certificates_total: number;
  } | null;
}

interface DashboardProject {
  id: number;
  name: string;
  slug?: string;
  type?: string;
  periods?: PeriodOption[];
  active_period?: PeriodOption | null;
}

interface SystemNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface AnnouncementProject {
  id: number;
  name: string;
}

const quickAnnouncementRoleLabels: Record<string, string> = {
  super_admin: "Admin",
  coordinator: "Koordinator",
  staff: "Personel",
  student: "Ogrenci",
  alumni: "Mezun",
};

const quickAnnouncementUnitLabels: Record<string, string> = {
  media: "Medya",
  operations: "Operasyon",
  program: "Program",
  finance: "Finans",
  official_affairs: "Resmi Evrak",
};

const quickAnnouncementUnitAliases: Record<string, string[]> = {
  media: ["media", "medya", "icerik", "content", "tasarim", "design"],
  operations: ["operations", "operasyon", "lojistik", "logistics"],
  program: ["program", "proje", "project", "egitim", "education"],
  finance: ["finance", "finans", "mali", "muhasebe"],
  official_affairs: ["official_affairs", "official affairs", "resmi", "evrak", "idari"],
};

const normalizeQuickUnit = (value?: string | null) =>
  (value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .trim();

function roleBadgeLabel(role: string | undefined) {
  if (role === "super_admin") return "ÜST YÖNETİCİ";
  if (role === "staff") return "PERSONEL";
  if (role === "coordinator") return "KOORDİNATÖR";
  return role?.toLocaleUpperCase("tr-TR").replace(/_/g, " ") ?? "YÖNETİCİ";
}

function notificationTone(type: string) {
  switch (type) {
    case "application":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "support":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "financial":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "kpd":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "program":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "assignment":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{typeof value === "number" ? value.toLocaleString("tr-TR") : value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { hasPermission, canAccessProject, hasGlobalScope } = usePermissions();
  const { user } = useAuth();
  const role = user?.role;
  const isSuperAdmin = role === "super_admin";
  const isCoordinator = role === "coordinator";
  const isStaff = role === "staff";
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [quickAnnProjects, setQuickAnnProjects] = useState<AnnouncementProject[]>([]);
  const [dashboardProjects, setDashboardProjects] = useState<DashboardProject[]>([]);
  const [dashboardProjectId, setDashboardProjectId] = useState("");
  const [dashboardPeriodId, setDashboardPeriodId] = useState("all");

  const [quickAnnTitle, setQuickAnnTitle] = useState("Hizli Duyuru");
  const [quickAnnCategory, setQuickAnnCategory] = useState("Duyuru");
  const [quickAnnProject, setQuickAnnProject] = useState("all");
  const [quickAnnMessage, setQuickAnnMessage] = useState("");
  const [quickAnnTargetRoles, setQuickAnnTargetRoles] = useState<string[]>([]);
  const [quickAnnTargetUnits, setQuickAnnTargetUnits] = useState<string[]>([]);
  const [quickAnnSendEmail, setQuickAnnSendEmail] = useState(true);
  const [sendingQuickAnn, setSendingQuickAnn] = useState(false);
  const [quickAnnSuccess, setQuickAnnSuccess] = useState(false);
  const [quickAnnResult, setQuickAnnResult] = useState("");
  const [quickAnnError, setQuickAnnError] = useState("");
  const dashboardProject = useMemo(
    () => dashboardProjects.find((project) => String(project.id) === dashboardProjectId),
    [dashboardProjectId, dashboardProjects]
  );
  const dashboardPeriods = useMemo(() => periodsForProject(dashboardProject), [dashboardProject]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!dashboardProjectId) {
        if (dashboardPeriodId !== "all") {
          setDashboardPeriodId("all");
        }
        return;
      }

      if (!dashboardProject) {
        setDashboardProjectId("");
        setDashboardPeriodId("all");
        return;
      }

      if (
        dashboardPeriodId !== "all" &&
        !dashboardPeriods.some((period) => String(period.id) === dashboardPeriodId)
      ) {
        setDashboardPeriodId(defaultPeriodIdForProject(dashboardProject) || "all");
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [dashboardPeriodId, dashboardPeriods, dashboardProject, dashboardProjectId]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await api.get<DashboardStats>("/panel/dashboard/stats", {
          params: {
            project_id: dashboardProjectId || undefined,
            period_id: dashboardPeriodId !== "all" ? dashboardPeriodId : undefined,
          },
        });
        setStats(response.data);
        setDashboardProjects(response.data.dashboard_context?.projects ?? []);
      } catch (error) {
        console.error("Admin dashboard verileri cekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    const loadNotifications = async () => {
      try {
        const response = await api.get<{ notifications: SystemNotification[]; unread_count: number }>("/user/notifications");
        setNotifications(response.data.notifications ?? []);
        setUnreadNotifications(response.data.unread_count ?? 0);
      } catch (error) {
        console.error("Dashboard bildirimleri cekilemedi", error);
        setNotifications([]);
        setUnreadNotifications(0);
      } finally {
        setNotificationsLoading(false);
      }
    };

    const loadQuickAnnouncementProjects = async () => {
      try {
        const response = await api.get<{ projects: AnnouncementProject[] }>("/panel/projects/manageable", {
          params: { permission: "announcements.create" },
        });
        setQuickAnnProjects(response.data.projects ?? []);
      } catch {
        setQuickAnnProjects([]);
      }
    };

    void loadDashboard();
    void loadNotifications();
    void loadQuickAnnouncementProjects();
  }, [dashboardPeriodId, dashboardProjectId]);

  const markNotificationRead = async (id: number) => {
    const selected = notifications.find((notification) => notification.id === id);
    if (!selected || selected.is_read) return;

    await api.patch(`/user/notifications/${id}/read`).catch(() => null);
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, is_read: true } : notification
      )
    );
    setUnreadNotifications((current) => Math.max(0, current - 1));
  };

  const markAllNotificationsRead = async () => {
    if (unreadNotifications === 0) return;
    await api.post("/user/notifications/read-all").catch(() => null);
    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
    setUnreadNotifications(0);
  };

  const availableQuickTargetUnits = () => {
    const units = Object.keys(quickAnnouncementUnitLabels);
    if (hasGlobalScope("announcements.create")) return units;

    const manageableUnit = normalizeQuickUnit(user?.authorization_context?.manageable_unit ?? user?.department);
    if (!manageableUnit) return [];

    return units.filter((unit) =>
      (quickAnnouncementUnitAliases[unit] ?? [unit]).some((alias) => {
        const normalizedAlias = normalizeQuickUnit(alias);
        return manageableUnit.includes(normalizedAlias) || normalizedAlias.includes(manageableUnit);
      })
    );
  };

  const toggleQuickAnnRole = (targetRole: string) => {
    setQuickAnnTargetRoles((current) =>
      current.includes(targetRole) ? current.filter((item) => item !== targetRole) : [...current, targetRole]
    );
  };

  const toggleQuickAnnUnit = (unit: string) => {
    setQuickAnnTargetUnits((current) =>
      current.includes(unit) ? current.filter((item) => item !== unit) : [...current, unit]
    );
  };

  const handleQuickAnnouncement = async () => {
    setQuickAnnError("");
    setQuickAnnResult("");

    if (!quickAnnMessage.trim()) {
      setQuickAnnError("Duyuru metni zorunludur.");
      return;
    }
    if (!hasPermission("announcements.create")) {
      setQuickAnnError("Duyuru olusturma yetkiniz yok.");
      return;
    }

    const availableUnits = availableQuickTargetUnits();
    const scopedTargetUnits = quickAnnTargetUnits.filter((unit) => availableUnits.includes(unit));
    const privilegedRoles = quickAnnTargetRoles.some((targetRole) => ["super_admin", "coordinator", "staff"].includes(targetRole));
    const projectIdForAnn = quickAnnProject === "all" ? null : parseInt(quickAnnProject, 10);
    if (projectIdForAnn != null && !canAccessProject("announcements.create", projectIdForAnn)) {
      setQuickAnnError("Secilen proje icin duyuru olusturma yetkiniz yok.");
      return;
    }
    if (!hasGlobalScope("announcements.create") && privilegedRoles && projectIdForAnn == null && scopedTargetUnits.length === 0) {
      setQuickAnnError("Personel/koordinator/admin hedefi icin proje veya birim secilmelidir.");
      return;
    }

    setSendingQuickAnn(true);
    setQuickAnnSuccess(false);

    try {
      const formData = new FormData();
      formData.append("title", quickAnnTitle.trim() || "Hizli Duyuru");
      formData.append("content", quickAnnMessage.trim());
      formData.append("category", quickAnnCategory.trim() || "Duyuru");
      if (projectIdForAnn != null) formData.append("project_id", String(projectIdForAnn));
      quickAnnTargetRoles.forEach((targetRole, index) => formData.append(`target_roles[${index}]`, targetRole));
      scopedTargetUnits.forEach((unit, index) => formData.append(`target_units[${index}]`, unit));
      formData.append("send_sms", "0");
      formData.append("send_email", quickAnnSendEmail && hasPermission("announcements.send_email") ? "1" : "0");

      const response = await api.post<{
        message?: string;
        target_count?: number;
        email_sent_to?: number;
      }>("/panel/announcements", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setQuickAnnMessage("");
      setQuickAnnTargetRoles([]);
      setQuickAnnTargetUnits([]);
      setQuickAnnSuccess(true);
      setQuickAnnResult(
        `${response.data.message ?? "Duyuru olusturuldu."} Hedef: ${response.data.target_count ?? 0}, e-posta: ${response.data.email_sent_to ?? 0}.`
      );
      setTimeout(() => setQuickAnnSuccess(false), 3000);
    } catch (error) {
      console.error("Duyuru gonderilemedi", error);
      setQuickAnnError("Duyuru gonderilemedi. Hedef/scope secimini kontrol edin.");
    } finally {
      setSendingQuickAnn(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  const canCreateGlobalAnnouncement = hasGlobalScope("announcements.create");
  const announcementProjects = quickAnnProjects.filter((project) => canAccessProject("announcements.create", project.id));
  const quickAvailableTargetUnits = availableQuickTargetUnits();
  const canQuickSendEmail = hasPermission("announcements.send_email");
  const quickAnnouncementTargetAvailable = canCreateGlobalAnnouncement || announcementProjects.length > 0 || quickAvailableTargetUnits.length > 0;
  const quickPrivilegedTargetNeedsScope =
    !canCreateGlobalAnnouncement &&
    quickAnnProject === "all" &&
    quickAnnTargetUnits.length === 0 &&
    quickAnnTargetRoles.some((targetRole) => ["super_admin", "coordinator", "staff"].includes(targetRole));
  const canViewApplications = hasPermission("applications.view");
  const canViewCommunication = hasPermission("announcements.view");
  const canViewFinancial = hasPermission("financial.view");
  const canViewParticipants = hasPermission("projects.participants.view") || hasPermission("projects.view");
  const canViewPrograms = hasPermission("programs.view");
  const canViewSupport = hasPermission("support.view");
  const scopeLabel =
    stats.stats_scope === "global"
      ? "Tum sistem"
      : isCoordinator
        ? "Koordine edilen projeler"
        : isStaff
          ? "Yetkili proje ve birimler"
          : "Yetki kapsami";
  const reportLink = canViewFinancial
    ? { href: "/panel/financials", label: "Detayli Rapor" }
    : canViewPrograms
      ? { href: "/panel/calendar", label: "Takvime Git" }
      : canViewApplications
        ? { href: "/panel/applications", label: "Başvurular" }
        : canViewSupport
          ? { href: "/panel/support", label: "Destek" }
          : null;

  const kpi = [
    {
      visible: canViewParticipants,
      label: isStaff ? "Kapsamdaki Katilimci" : "Aktif Katilimci",
      value: stats.students.active.toLocaleString("tr-TR"),
      icon: Users,
    },
    {
      visible: canViewPrograms,
      label: "Bu Ay Faaliyet",
      value: `${stats.programs.monthly_completed}/${stats.programs.monthly_total}`,
      icon: Calendar,
    },
    {
      visible: canViewFinancial,
      label: "Bu Ay Harcama",
      value: `${stats.financials.monthly_expense.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`,
      icon: CreditCard,
    },
    {
      visible: canViewSupport,
      label: "Bekleyen Destek",
      value: String(stats.pending.support),
      icon: MessageSquare,
    },
    {
      visible: !canViewSupport && canViewApplications,
      label: "Bekleyen Başvuru",
      value: String(stats.pending.applications),
      icon: ClipboardList,
    },
  ].filter((row) => row.visible);

  return (
    <div className="space-y-8 text-slate-800">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Merhaba, {user?.name || "Kullanici"}{" "}
              {user?.surname ? <span className="font-bold">{user.surname}</span> : null}
            </h1>
            <span className="inline-flex items-center rounded-md border border-sky-200/80 bg-sky-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-sky-800">
              {roleBadgeLabel(user?.role)}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {isSuperAdmin
              ? "Tum sistem operasyonel ozeti asagidadir."
              : isCoordinator
                ? "Koordinator yetki kapsamindaki proje ozeti asagidadir."
                : "Action + scope yetkilerinize gore gorunur operasyonel ozet asagidadir."}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Veri kapsami: {scopeLabel}</p>
        </div>
        <div className="flex gap-2">
          {reportLink ? (
            <Link
              href={reportLink.href}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              {reportLink.label}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="panel-surface p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Proje</span>
            <select
              value={dashboardProjectId}
              onChange={(event) => {
                const value = event.target.value;
                const project = dashboardProjects.find((item) => String(item.id) === value);
                setDashboardProjectId(value);
                setDashboardPeriodId(value ? defaultPeriodIdForProject(project) || "all" : "all");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-100"
            >
              <option value="">Tum projeler</option>
              {dashboardProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Donem</span>
            <select
              value={dashboardPeriodId}
              onChange={(event) => setDashboardPeriodId(event.target.value)}
              disabled={!dashboardProjectId || dashboardPeriods.length === 0}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="all">{dashboardProjectId ? "Tum donemler" : "Proje secince donem"}</option>
              {dashboardPeriods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}
                  {period.status === "active" ? " (aktif)" : period.status === "completed" ? " (tamamlandi)" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-600">
            {stats.dashboard_context?.archive_mode ? "Arsiv modu" : dashboardPeriodId !== "all" ? "Secili donem" : "Operasyon modu"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpi.map((row) => (
          <div key={row.label} className="panel-surface flex flex-col gap-3 p-5">
            <row.icon className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{row.label}</p>
            <p className="text-3xl font-extrabold text-slate-900">{row.value}</p>
          </div>
        ))}
      </div>

      {stats.period_analytics ? (
        <div className="panel-surface p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-600">Donem Analitigi</h2>
              <p className="text-sm font-semibold text-slate-900">{stats.period_analytics.period.name}</p>
            </div>
            <span className="w-max rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">
              {stats.period_analytics.period.status === "completed" ? "Arsiv" : stats.period_analytics.period.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <MiniMetric label="Katilimci" value={stats.period_analytics.participants_total} />
            <MiniMetric label="Program" value={stats.period_analytics.programs_total} />
            <MiniMetric label="Yoklama" value={stats.period_analytics.attendance_present} />
            <MiniMetric label="Başvuru" value={stats.period_analytics.applications_total} />
            <MiniMetric label="Ödev" value={`${stats.period_analytics.assignment_submissions_total}/${stats.period_analytics.assignments_total}`} />
            <MiniMetric label="Sertifika" value={stats.period_analytics.certificates_total} />
            <MiniMetric label="Feedback" value={stats.period_analytics.feedback_count} />
            <MiniMetric label="Ortalama" value={stats.period_analytics.feedback_numeric_average ?? "-"} />
            <MiniMetric label="Kredi Hareketi" value={stats.period_analytics.credit_log_total} />
            <MiniMetric label="Mali Toplam" value={`${Number(stats.period_analytics.financial_total).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`} />
          </div>
        </div>
      ) : null}

      {stats.charts ? (
        <DashboardCharts
          charts={stats.charts}
          showCommunication={canViewCommunication}
          showFinancial={canViewFinancial}
          showPrograms={canViewPrograms}
        />
      ) : null}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-600">Katilim ve Buyume Analitigi</h2>
          {reportLink ? (
            <Link href={reportLink.href} className="text-[10px] font-bold uppercase text-slate-500 hover:text-[#FF6B00]">
              {reportLink.label}
            </Link>
          ) : null}
        </div>

        <div className="panel-surface p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Operasyonel Durum</h3>

              <div className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-5">
                {canViewParticipants ? (
                  <div className="group flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Aktif Katilimci</p>
                      <h4 className="text-2xl font-extrabold text-slate-900">{stats.students.active.toLocaleString("tr-TR")}</h4>
                    </div>
                  </div>
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                  </div>
                ) : null}

                {canViewPrograms ? (
                  <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Aylik Faaliyet</p>
                      <h4 className="text-2xl font-extrabold text-slate-900">
                        {stats.programs.monthly_completed} / {stats.programs.monthly_total}
                      </h4>
                    </div>
                  </div>
                  </div>
                ) : null}

                {canViewFinancial ? (
                  <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Güncel Harcama</p>
                      <h4 className="text-2xl font-extrabold text-slate-900">
                        {stats.financials.monthly_expense.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    {stats.financials.expense_change_percent !== null && (
                      <>
                        <span
                          className={`text-[10px] font-bold ${stats.financials.expense_change_percent > 0 ? "text-red-500" : "text-emerald-500"}`}
                        >
                          {stats.financials.expense_change_percent > 0 ? "+" : ""}
                          {stats.financials.expense_change_percent}%
                        </span>
                        <p className="text-[8px] uppercase text-slate-400">Gecen aya gore</p>
                      </>
                    )}
                  </div>
                  </div>
                ) : null}

                <div className="border-t border-slate-200/80 pt-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Bekleyen Islemler</p>
                  <div className="space-y-2">
                    {canViewApplications ? (
                      <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-2.5">
                      <span className="text-xs font-semibold text-slate-700">Yeni Başvurular</span>
                      <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">{stats.pending.applications} Adet</span>
                      </div>
                    ) : null}
                    {canViewFinancial ? (
                      <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-2.5">
                      <span className="text-xs font-semibold text-slate-700">Finansal Onaylar</span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">{stats.pending.financials} Adet</span>
                      </div>
                    ) : null}
                    {canViewSupport ? (
                      <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-2.5">
                      <span className="text-xs font-semibold text-slate-700">Destek Talepleri</span>
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">{stats.pending.support} Bekleyen</span>
                      </div>
                    ) : null}
                    {canViewParticipants ? (
                      <div className="flex items-center justify-between rounded-lg border border-red-200/80 bg-red-50 p-2.5">
                      <span className="text-xs font-semibold text-red-800">Kredi Riski</span>
                      <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">{stats.credit_risk?.count ?? 0} Kisi</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {isSuperAdmin ? (
                <div className="panel-surface border-sky-100/80 bg-sky-50/30 p-5">
                  <h4 className="mb-3 text-xs font-bold uppercase text-slate-800">Kullanici Dagilimi</h4>
                  <div className="space-y-2">
                    {Object.entries(stats.user_stats).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#FF6B00]" />
                          <span className="capitalize">{role.replace(/_/g, " ")}</span>
                        </div>
                        <span className="font-bold text-slate-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-6 lg:col-span-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{scopeLabel} Doluluk Oranlari (%)</h3>

              <div className="panel-surface p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase text-slate-500">Doluluk</h4>
                  <BarChart3 className="h-4 w-4 text-slate-400" />
                </div>
                {stats.project_occupancy.length === 0 ? (
                  <p className="text-sm text-slate-500">Gosterilecek proje verisi yok.</p>
                ) : (
                  <div className="space-y-4">
                    {stats.project_occupancy.map((project) => {
                      const rate = project.rate ?? 0;
                      const capacity = project.capacity ?? project.max;
                      return (
                        <div key={project.id} className="space-y-2 rounded-2xl border border-slate-200 bg-white/70 p-3">
                          <div className="flex justify-between gap-3 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            <span className="truncate pr-1">{project.name}</span>
                            <span className="shrink-0">
                              {project.active} aktif / {capacity ?? "-"} kontenjan
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full bg-[#0a0b14]" style={{ width: `${Math.min(rate, 100)}%` }} />
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-500 sm:grid-cols-4">
                            <span>Toplam: {project.total ?? project.active}</span>
                            <span>Yedek: {project.waitlist ?? 0}</span>
                            <span>Mezun: {project.graduates ?? 0}</span>
                            <span>Tamamlamadı: {project.not_completed ?? 0}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="panel-surface p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase text-slate-500">Sistem Ozeti</h4>
                  <ClipboardList className="h-4 w-4 text-slate-500" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50 p-2.5">
                    <span className="text-xs font-semibold text-slate-700">Veri kapsami</span>
                    <span className="text-sm font-extrabold text-slate-900">{scopeLabel}</span>
                  </div>
                  {canViewPrograms ? (
                    <>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Aylik tamamlanan faaliyet</span>
                        <span className="font-medium text-slate-800">{stats.programs.monthly_completed}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Aylik yaklasan faaliyet</span>
                        <span className="font-medium text-slate-800">{stats.programs.monthly_upcoming}</span>
                      </div>
                    </>
                  ) : null}
                  {canViewFinancial ? (
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Bekleyen finans onayi</span>
                      <span className="font-medium text-slate-800">{stats.pending.financials}</span>
                    </div>
                  ) : null}
                  {canViewParticipants ? (
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Doluluk izlenen proje</span>
                      <span className="font-medium text-slate-800">{stats.project_occupancy.length}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {canViewParticipants ? (
                <div className="panel-surface border-red-100 bg-red-50/40 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-bold uppercase text-red-700">Kritik Kredi Takibi</h4>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                  <ExportButtons
                    endpoint="/panel/dashboard/credit-risk/export"
                    filename="kritik_kredi_riski"
                    params={{
                      project_id: dashboardProjectId || undefined,
                      period_id: dashboardPeriodId !== "all" ? dashboardPeriodId : undefined,
                    }}
                    buttonLabel="Disa Aktar"
                  />
                </div>
                {(stats.credit_risk?.participants.length ?? 0) === 0 ? (
                  <p className="text-sm text-slate-500">Esik altinda katilimci bulunmuyor.</p>
                ) : (
                  <div className="space-y-3">
                    {stats.credit_risk?.participants.map((participant) => (
                      <div key={participant.id} className="rounded-lg border border-red-100 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-900">{participant.student}</p>
                            <p className="truncate text-[10px] text-slate-500">{participant.project?.name ?? "Proje yok"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-red-600">{participant.credit}</p>
                            <p className="text-[9px] uppercase text-slate-400">Esik {participant.threshold}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              ) : null}
            </div>

            <div className="space-y-6 lg:col-span-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Zaman Cizelgesi</h3>

              {canViewPrograms ? (
                <div className="panel-surface p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase text-slate-500">Yaklasan Programlar</h4>
                    <Link href="/panel/calendar" className="text-[10px] font-bold text-[#FF6B00] hover:underline">
                      Tumunu Gor
                    </Link>
                  </div>
                  {stats.upcoming_programs.length === 0 ? (
                    <p className="text-sm text-slate-500">Yaklasan etkinlik yok.</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.upcoming_programs.map((program) => {
                        const date = program.start_at;
                        return (
                          <div key={program.id} className="group flex items-center gap-3">
                            <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-center">
                              <span className="text-[7px] font-bold uppercase text-slate-500">
                                {formatIstanbulWeekdayShort(date).toUpperCase()}
                              </span>
                              <span className="text-sm font-extrabold text-slate-900">{formatIstanbulDayNumber(date)}</span>
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-900 transition-colors group-hover:text-[#FF6B00]">{program.title}</h5>
                              <p className="text-[10px] text-slate-500">
                                {formatIstanbulTime(date)} • {program.project?.name || "Genel"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {stats.assigned_tasks.length > 0 || !isSuperAdmin ? (
                <div className="panel-surface p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase text-slate-500">Yaklasan Gorevlerim</h4>
                    <Link href="/panel/calendar" className="text-[10px] font-bold text-[#FF6B00] hover:underline">
                      Takvim
                    </Link>
                  </div>
                  {stats.assigned_tasks.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Size atanmis yaklasan etkinlik bulunmuyor.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {stats.assigned_tasks.map((task) => {
                        const date = task.start_at ? new Date(task.start_at) : null;
                        return (
                          <Link
                            key={task.id}
                            href="/panel/calendar"
                            className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-[#FF6B00]/30 hover:bg-orange-50/40"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="line-clamp-1 text-xs font-bold text-slate-900">{task.title}</p>
                                <p className="mt-1 line-clamp-1 text-[10px] text-slate-500">{task.project?.name ?? "Genel"}</p>
                              </div>
                              <span className="shrink-0 text-right text-[10px] font-semibold text-slate-400">
                                {date && !Number.isNaN(date.getTime())
                                  ? date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })
                                  : "-"}
                              </span>
                            </div>
                            {date && !Number.isNaN(date.getTime()) ? (
                              <p className="mt-2 text-[10px] font-semibold text-slate-500">
                                {formatIstanbulTime(date)}
                                {task.location ? ` - ${task.location}` : ""}
                              </p>
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="panel-surface p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-slate-500" />
                    <h4 className="text-[10px] font-bold uppercase text-slate-500">Bildirim Kutusu</h4>
                    {unreadNotifications > 0 ? (
                      <span className="rounded bg-[#FF6B00]/10 px-2 py-0.5 text-[10px] font-black text-[#FF6B00]">
                        {unreadNotifications} Yeni
                      </span>
                    ) : null}
                  </div>
                  {unreadNotifications > 0 ? (
                    <button
                      type="button"
                      onClick={() => void markAllNotificationsRead()}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-slate-600 transition hover:bg-slate-50"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Okundu
                    </button>
                  ) : null}
                </div>

                {notificationsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Kullaniciya ozel yeni bildirim bulunmuyor.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {notifications.slice(0, 5).map((notification) => {
                      const content = (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase ${notificationTone(notification.type)}`}>
                                  {notification.type}
                                </span>
                                {!notification.is_read ? <span className="h-2 w-2 rounded-full bg-[#FF6B00]" /> : null}
                              </div>
                              <p className="mt-2 line-clamp-1 text-xs font-bold text-slate-900">{notification.title}</p>
                              {notification.body ? (
                                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{notification.body}</p>
                              ) : null}
                            </div>
                            <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                              {formatNotificationDate(notification.created_at)}
                            </span>
                          </div>
                        </>
                      );

                      return notification.action_url ? (
                        <Link
                          key={notification.id}
                          href={notification.action_url}
                          onClick={() => void markNotificationRead(notification.id)}
                          className={`block rounded-xl border p-3 transition hover:border-[#FF6B00]/30 hover:bg-orange-50/40 ${
                            notification.is_read ? "border-slate-200 bg-white" : "border-orange-200 bg-orange-50/30"
                          }`}
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => void markNotificationRead(notification.id)}
                          className={`w-full rounded-xl border p-3 text-left transition hover:border-[#FF6B00]/30 hover:bg-orange-50/40 ${
                            notification.is_read ? "border-slate-200 bg-white" : "border-orange-200 bg-orange-50/30"
                          }`}
                        >
                          {content}
                        </button>
                      );
                    })}
                    {hasPermission("announcements.view") ? (
                      <Link href="/panel/inbox" className="block text-center text-[10px] font-bold uppercase tracking-wide text-[#FF6B00] hover:underline">
                        Mesaj kutusuna git
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>

              <PermissionGate permission="announcements.create">
                <div className="panel-surface border-2 border-dashed border-slate-200/90 bg-slate-50/50 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase text-slate-500">Hizli Duyuru</h4>
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      value={quickAnnTitle}
                      onChange={(event) => setQuickAnnTitle(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 outline-none"
                      placeholder="Baslik"
                    />
                    <input
                      value={quickAnnCategory}
                      onChange={(event) => setQuickAnnCategory(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 outline-none"
                      placeholder="Kategori"
                    />
                  </div>
                  <select
                    value={quickAnnProject}
                    onChange={(event) => setQuickAnnProject(event.target.value)}
                    className="mb-2 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 outline-none"
                  >
                    <option value="all">{canCreateGlobalAnnouncement ? "Tum Kullanicilar" : "Yetki Kapsamim"}</option>
                    {announcementProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <div className="mb-2 space-y-2 rounded-lg border border-slate-200 bg-white p-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Hedef Roller</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(quickAnnouncementRoleLabels).map(([targetRole, label]) => (
                        <button
                          key={targetRole}
                          type="button"
                          onClick={() => toggleQuickAnnRole(targetRole)}
                          className={`rounded-md border px-2 py-1 text-[10px] font-bold transition ${
                            quickAnnTargetRoles.includes(targetRole)
                              ? "border-[#FF6B00] bg-orange-50 text-[#FF6B00]"
                              : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="pt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Hedef Birimler</p>
                    {quickAvailableTargetUnits.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {quickAvailableTargetUnits.map((unit) => (
                          <button
                            key={unit}
                            type="button"
                            onClick={() => toggleQuickAnnUnit(unit)}
                            className={`rounded-md border px-2 py-1 text-[10px] font-bold transition ${
                              quickAnnTargetUnits.includes(unit)
                                ? "border-sky-500 bg-sky-50 text-sky-700"
                                : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            {quickAnnouncementUnitLabels[unit] ?? unit}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400">Birim hedefi icin global yetki veya tanimli birim gerekir.</p>
                    )}
                  </div>
                  <textarea
                    value={quickAnnMessage}
                    onChange={(e) => setQuickAnnMessage(e.target.value)}
                    className="mb-2 min-h-[100px] w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none"
                    placeholder="Duyuru metni..."
                  />
                  <label className="mb-2 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-600">
                    <span>E-posta olarak da gonder</span>
                    <input
                      type="checkbox"
                      checked={quickAnnSendEmail && canQuickSendEmail}
                      disabled={!canQuickSendEmail}
                      onChange={(event) => setQuickAnnSendEmail(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#FF6B00]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleQuickAnnouncement()}
                    disabled={
                      sendingQuickAnn ||
                      !quickAnnMessage.trim() ||
                      quickPrivilegedTargetNeedsScope ||
                      !quickAnnouncementTargetAvailable ||
                      (quickAnnProject !== "all" && !canAccessProject("announcements.create", parseInt(quickAnnProject, 10)))
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B00] py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#e85f00] disabled:opacity-50"
                  >
                    {sendingQuickAnn ? <Loader2 className="h-4 w-4 animate-spin" /> : quickAnnSuccess ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    {sendingQuickAnn ? "Gonderiliyor..." : quickAnnSuccess ? "Gonderildi!" : "Gonder"}
                  </button>
                  {!quickAnnouncementTargetAvailable ? (
                    <p className="mt-2 text-[10px] font-semibold text-amber-700">
                      Hizli duyuru icin global, proje veya birim bazli duyuru kapsami gerekiyor.
                    </p>
                  ) : null}
                  {quickPrivilegedTargetNeedsScope ? (
                    <p className="mt-2 text-[10px] font-semibold text-amber-700">
                      Personel, koordinator veya admin hedefi icin proje ya da birim secin.
                    </p>
                  ) : null}
                  {quickAnnError ? <p className="mt-2 text-[10px] font-semibold text-red-600">{quickAnnError}</p> : null}
                  {quickAnnResult ? <p className="mt-2 text-[10px] font-semibold text-emerald-700">{quickAnnResult}</p> : null}
                </div>
              </PermissionGate>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}