"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Link as LinkIcon,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { ProgramLocationMap } from "@/components/maps/ProgramLocationMap";
import {
  periodHasWriteCapability,
  PeriodArchiveModeNotice,
  type PeriodOption,
} from "@/components/shared/ProjectPeriodFilters";
import { usePermissions } from "@/hooks/usePermissions";
import { formatIstanbulDateTime, formatIstanbulTime, toIstanbulDateTimeLocal, withIstanbulOffset } from "@/lib/istanbul-time";

interface Project {
  id: number;
  name: string;
  active_period?: { id: number; name: string } | null;
}

interface Period extends PeriodOption {
  project_id: number;
}

interface CalendarAssignee {
  id: number;
  name: string;
  role: string;
  unit?: string | null;
  title?: string | null;
}

interface Program {
  id: number;
  calendar_event_id?: number | null;
  event_type?: "program" | "meeting";
  title: string;
  description?: string | null;
  location?: string | null;
  location_place_name?: string | null;
  location_place_address?: string | null;
  location_place_id?: string | null;
  location_place_provider?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  status?: ProgramStatusFilter | string | null;
  start_at: string;
  end_at?: string | null;
  radius_meters?: number | null;
  credit_deduction?: number | null;
  application_quota?: number | null;
  project_id?: number | null;
  project?: { id: number; name: string } | null;
  period?: PeriodOption | null;
  calendar_event?: {
    google_event_id?: string | null;
    assigned_user_ids?: number[];
    assigned_users?: CalendarAssignee[];
    assigned_count?: number;
    is_assigned_to_current_user?: boolean;
  } | null;
}

interface CalendarSummary {
  total_programs: number;
  total_meetings?: number;
  total_events?: number;
  today_programs?: number;
  upcoming_this_week: number;
  upcoming_this_month: number;
  open_support_count: number;
  google_synced_count: number;
  google_pending_count?: number;
  unassigned_count?: number;
}

interface GoogleCalendarStatus {
  configured: boolean;
  connected: boolean;
  calendar_id?: string | null;
  last_synced_at?: string | null;
  last_error?: string | null;
  last_error_at?: string | null;
}

interface CalendarOverviewResponse {
  projects: Project[];
  programs: Program[];
  summary: CalendarSummary;
  upcoming_tasks: Program[];
  attention_items?: Program[];
  google_calendar: GoogleCalendarStatus;
}

type ViewMode = "daily" | "weekly" | "monthly";
type ProgramStatusFilter = "all" | "scheduled" | "active" | "completed" | "cancelled";
type CreateMode = "program" | "meeting";

const initialForm = {
  project_id: "",
  period_id: "",
  title: "",
  description: "",
  location: "",
  location_place_name: "",
  location_place_address: "",
  location_place_id: "",
  location_place_provider: "",
  latitude: "",
  longitude: "",
  start_at: "",
  end_at: "",
  radius_meters: "100",
  credit_deduction: "10",
  application_quota: "",
};

const statusStyles: Record<string, { label: string; dot: string; chip: string; text: string }> = {
  scheduled: { label: "Planlandi", dot: "bg-sky-500", chip: "bg-sky-50 border-sky-200", text: "text-sky-700" },
  active: { label: "Aktif", dot: "bg-emerald-500", chip: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  completed: { label: "Tamamlandi", dot: "bg-emerald-500", chip: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  cancelled: { label: "Iptal", dot: "bg-red-400", chip: "bg-red-50 border-red-200", text: "text-red-700" },
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500";

const formatCoordinate = (value: number) => value.toFixed(8);

function localDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value: string | null | undefined) {
  return formatIstanbulDateTime(value);
}

function GoogleStatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-1 truncate font-bold text-slate-800" title={value}>{value}</div>
    </div>
  );
}
function formatTimeRange(program: Program) {
  const start = formatIstanbulTime(program.start_at);
  const end = program.end_at ? formatIstanbulTime(program.end_at) : null;
  return end ? `${start} - ${end}` : start;
}

function statusMeta(status?: string | null) {
  return statusStyles[status ?? "scheduled"] ?? statusStyles.scheduled;
}

export default function AdminCalendarPage() {
  const searchParams = useSearchParams();
  const { hasPermission, canAccessProject, hasGlobalScope } = usePermissions();
  const [projects, setProjects] = useState<Project[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [summary, setSummary] = useState<CalendarSummary | null>(null);
  const [upcomingTasks, setUpcomingTasks] = useState<Program[]>([]);
  const [attentionItems, setAttentionItems] = useState<Program[]>([]);
  const [googleStatus, setGoogleStatus] = useState<GoogleCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>("program");
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentRoleFilter, setAssignmentRoleFilter] = useState("all");
  const [assignmentUnitFilter, setAssignmentUnitFilter] = useState("all");
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [assignees, setAssignees] = useState<CalendarAssignee[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
  const [createAssigneeIds, setCreateAssigneeIds] = useState<number[]>([]);
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ProgramStatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState(() =>
    searchParams.get("google_calendar") === "connected" ? "Google Calendar baglantisi basariyla kuruldu." : "",
  );
  const [form, setForm] = useState(initialForm);

  const canCreateProgram = hasPermission("programs.create");
  const canViewPeriods = hasPermission("periods.view");
  const canCreateMeeting = hasPermission("calendar.meetings.create");
  const canExportCalendar = hasPermission("calendar.export");
  const canConnectGoogle = hasPermission("calendar.google.connect");
  const canSyncGoogle = hasPermission("calendar.google.sync");
  const canManageAssignments = hasPermission("calendar.assignments.manage");
  const canManageMeetings = hasPermission("calendar.meetings.manage");

  const loadAssignees = useCallback(async (projectId?: number | null, context: "program" | "meeting_create" | "meeting_manage" = "program") => {
    try {
      const response = await api.get<{ users: CalendarAssignee[] }>("/panel/calendar/assignees", {
        params: {
          context,
          project_id: projectId ?? undefined,
        },
      });
      setAssignees(response.data.users ?? []);
    } catch (error) {
      console.error("Takvim atama listesi yuklenemedi", error);
    }
  }, []);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const periodRequest = canViewPeriods
        ? api.get<{ periods?: Period[] }>("/panel/periods").catch((error) => {
            console.warn("Takvim donem listesi yuklenemedi; takvim ozeti gosterilmeye devam edecek.", error);
            return null;
          })
        : Promise.resolve(null);
      const [overviewResponse, periodResponse] = await Promise.all([
        api.get<CalendarOverviewResponse>("/panel/calendar/overview", {
          params: {
            project_id: selectedProject !== "all" ? selectedProject : undefined,
            period_id: selectedPeriod !== "all" ? selectedPeriod : undefined,
          },
        }),
        periodRequest,
      ]);

      setProjects(overviewResponse.data.projects ?? []);
      setPrograms(overviewResponse.data.programs ?? []);
      setSummary(overviewResponse.data.summary ?? null);
      setUpcomingTasks(overviewResponse.data.upcoming_tasks ?? []);
      setAttentionItems(overviewResponse.data.attention_items ?? []);
      setGoogleStatus(overviewResponse.data.google_calendar ?? null);
      const periodItems = periodResponse?.data.periods ?? [];
      setPeriods(periodItems);
      if (selectedProject !== "all" && selectedPeriod === "all") {
        const projectPeriods = periodItems.filter((period) => String(period.project_id) === selectedProject);
        const active = projectPeriods.find((period) => period.status === "active");
        setSelectedPeriod(active?.id ? String(active.id) : projectPeriods[0]?.id ? String(projectPeriods[0].id) : "all");
      }
    } catch (error) {
      console.error("Admin takvim verileri yuklenemedi", error);
      setErrorMessage("Takvim verileri yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [canViewPeriods, selectedPeriod, selectedProject]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCalendar(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCalendar]);

  useEffect(() => {
    if (!canManageAssignments) return;
    const timer = window.setTimeout(() => void loadAssignees(), 0);
    return () => window.clearTimeout(timer);
  }, [canManageAssignments, loadAssignees]);

  const availableCreateProjects = useMemo(
    () => projects.filter((project) => canAccessProject("programs.create", project.id)),
    [canAccessProject, projects],
  );

  const availableMeetingProjects = useMemo(
    () => projects.filter((project) => canAccessProject("calendar.meetings.create", project.id)),
    [canAccessProject, projects],
  );

  const canUseProgramCreate = canCreateProgram && availableCreateProjects.length > 0;
  const canUseMeetingCreate =
    canCreateMeeting && (hasGlobalScope("calendar.meetings.create") || availableMeetingProjects.length > 0);
  const canCreateAnyCalendarItem = canUseProgramCreate || canUseMeetingCreate;

  const canCreateMeetingInSelectedScope = useCallback(
    (projectId: string) => {
      if (!canCreateMeeting) return false;
      if (!projectId) return hasGlobalScope("calendar.meetings.create");
      return canAccessProject("calendar.meetings.create", Number(projectId));
    },
    [canAccessProject, canCreateMeeting, hasGlobalScope],
  );

  const defaultPeriodForProject = useCallback(
    (projectId: string) => {
      const projectPeriods = periods.filter((period) => String(period.project_id) === projectId);
      if (selectedPeriod !== "all" && projectPeriods.some((period) => String(period.id) === selectedPeriod)) {
        return selectedPeriod;
      }

      const active = projectPeriods.find((period) => period.status === "active");
      return active?.id ? String(active.id) : projectPeriods[0]?.id ? String(projectPeriods[0].id) : "";
    },
    [periods, selectedPeriod],
  );

  const selectedFilterPeriod = periods.find((period) => String(period.id) === selectedPeriod);
  const selectedFormPeriod = periods.find((period) => String(period.id) === form.period_id);
  const formPeriodCanCreate = !form.period_id || periodHasWriteCapability(selectedFormPeriod, "create_operations");
  const itemPeriodCanCreate = useCallback(
    (item: Program) => !item.period?.id || periodHasWriteCapability(
      periods.find((period) => period.id === item.period?.id),
      "create_operations",
    ),
    [periods],
  );

  const canManageCalendarItemAssignments = useCallback(
    (item: Program) => {
      if (!itemPeriodCanCreate(item)) return false;
      if ((item.event_type ?? "program") === "meeting") {
        if (!canManageMeetings) return false;
        return item.project_id == null
          ? hasGlobalScope("calendar.meetings.manage")
          : canAccessProject("calendar.meetings.manage", item.project_id);
      }

      return canManageAssignments && canAccessProject("calendar.assignments.manage", item.project_id);
    },
    [canAccessProject, canManageAssignments, canManageMeetings, hasGlobalScope, itemPeriodCanCreate],
  );

  const openCreateModal = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setCreateAssigneeIds([]);
    setAssignmentSearch("");
    setAssignmentRoleFilter("all");
    setAssignmentUnitFilter("all");
    setAssignees([]);
    const nextMode: CreateMode = canUseProgramCreate ? "program" : "meeting";
    const selectedProjectId =
      selectedProject !== "all" &&
      (nextMode === "program"
        ? canAccessProject("programs.create", Number(selectedProject))
        : canAccessProject("calendar.meetings.create", Number(selectedProject)))
        ? selectedProject
        : "";
    const fallbackProjectId =
      nextMode === "program"
        ? String(availableCreateProjects[0]?.id ?? "")
        : hasGlobalScope("calendar.meetings.create")
          ? ""
          : String(availableMeetingProjects[0]?.id ?? "");
    const projectId = selectedProjectId || fallbackProjectId;

    setForm({
      ...initialForm,
      project_id: projectId,
      period_id: projectId ? defaultPeriodForProject(projectId) : "",
    });
    setCreateMode(nextMode);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!isModalOpen || createMode !== "meeting" || !canUseMeetingCreate) return;
    const projectId = form.project_id ? Number(form.project_id) : null;
    if (!canCreateMeetingInSelectedScope(form.project_id)) {
      const timer = window.setTimeout(() => setAssignees([]), 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => void loadAssignees(projectId, "meeting_create"), 0);
    return () => window.clearTimeout(timer);
  }, [canCreateMeetingInSelectedScope, canUseMeetingCreate, createMode, form.project_id, isModalOpen, loadAssignees]);

  const handleCreateEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      if (!formPeriodCanCreate) {
        setErrorMessage("Yeni takvim kaydı yalnız aktif dönemde oluşturulabilir.");
        return;
      }
      if (createMode === "meeting") {
        const projectId = form.project_id ? Number(form.project_id) : null;
        if (!canCreateMeetingInSelectedScope(form.project_id)) {
          setErrorMessage("Bu kapsamda toplanti olusturma yetkiniz yok.");
          return;
        }

        await api.post("/panel/calendar/meetings", {
          project_id: projectId,
          period_id: form.period_id ? Number(form.period_id) : null,
          title: form.title,
          description: form.description,
          location: form.location,
          start_at: withIstanbulOffset(form.start_at),
          end_at: withIstanbulOffset(form.end_at),
          assigned_user_ids: createAssigneeIds,
        });
        setSuccessMessage("Toplanti takvime eklendi.");
      } else {
        const projectId = Number(form.project_id);
        if (!canCreateProgram || !Number.isFinite(projectId) || !canAccessProject("programs.create", projectId)) {
          setErrorMessage("Bu proje icin program olusturma yetkiniz yok.");
          return;
        }

        await api.post("/panel/programs", {
          ...form,
          start_at: withIstanbulOffset(form.start_at),
          end_at: withIstanbulOffset(form.end_at),
          project_id: projectId,
          period_id: Number(form.period_id),
          location_place_name: form.location_place_name || null,
          location_place_address: form.location_place_address || null,
          location_place_id: form.location_place_id || null,
          location_place_provider: form.location_place_provider || null,
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null,
          radius_meters: Number(form.radius_meters),
          credit_deduction: Number(form.credit_deduction),
          application_quota: form.application_quota ? Number(form.application_quota) : null,
        });
        setSuccessMessage("Program takvime eklendi.");
      }

      setForm(initialForm);
      setCreateAssigneeIds([]);
      setIsModalOpen(false);
      await loadCalendar();
    } catch (error: unknown) {
      console.error("Program olusturulamadi", error);
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Kayit olusturulamadi."
          : "Kayit olusturulamadi.";
      setErrorMessage(message);
    } finally {
      setCreating(false);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    setConnecting(true);
    setErrorMessage("");
    try {
      const response = await api.get<{ authorization_url: string }>("/panel/calendar/google/connect", {
        params: { panel: "admin" },
      });
      window.location.href = response.data.authorization_url;
    } catch (error) {
      console.error("Google Calendar baglantisi baslatilamadi", error);
      setErrorMessage("Google Calendar baglantisi baslatilamadi.");
      setConnecting(false);
    }
  };

  const handleSyncGoogleCalendar = async () => {
    setSyncing(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await api.post<{ message: string; google_calendar: GoogleCalendarStatus }>("/panel/calendar/google/sync");
      setGoogleStatus(response.data.google_calendar);
      setSuccessMessage(response.data.message);
      await loadCalendar();
    } catch (error) {
      console.error("Google Calendar senkronizasyonu basarisiz", error);
      setErrorMessage("Google Calendar senkronizasyonu basarisiz oldu.");
    } finally {
      setSyncing(false);
    }
  };

  const openAssignmentModal = (program: Program) => {
    const canEditAssignments = canManageCalendarItemAssignments(program);
    const isMeeting = (program.event_type ?? "program") === "meeting";
    setSelectedProgram(program);
    setSelectedAssigneeIds(program.calendar_event?.assigned_user_ids ?? []);
    setAssignmentSearch("");
    setAssignmentRoleFilter("all");
    setAssignmentUnitFilter("all");
    setIsAssignmentModalOpen(true);
    if (canEditAssignments) {
      void loadAssignees(program.project_id ?? null, isMeeting ? "meeting_manage" : "program");
    } else {
      setAssignees(program.calendar_event?.assigned_users ?? []);
    }
  };

  const handleToggleAssignee = (assigneeId: number) => {
    setSelectedAssigneeIds((current) =>
      current.includes(assigneeId) ? current.filter((id) => id !== assigneeId) : [...current, assigneeId],
    );
  };

  const handleToggleCreateAssignee = (assigneeId: number) => {
    setCreateAssigneeIds((current) =>
      current.includes(assigneeId) ? current.filter((id) => id !== assigneeId) : [...current, assigneeId],
    );
  };

  const handleSaveAssignments = async () => {
    if (!selectedProgram) return;
    const isMeeting = (selectedProgram.event_type ?? "program") === "meeting";
    if (!canManageCalendarItemAssignments(selectedProgram)) {
      setErrorMessage(isMeeting ? "Bu toplanti icin davetli yonetme yetkiniz yok." : "Bu program icin gorev atama yetkiniz yok.");
      return;
    }

    setAssignmentSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const endpoint = isMeeting
        ? `/panel/calendar/meetings/${selectedProgram.calendar_event_id ?? selectedProgram.id}/assignments`
        : `/panel/calendar/programs/${selectedProgram.id}/assignments`;
      await api.put(endpoint, {
        assigned_user_ids: selectedAssigneeIds,
      });
      setSuccessMessage(isMeeting ? "Toplanti davetlileri guncellendi." : "Gorev atamalari guncellendi.");
      setIsAssignmentModalOpen(false);
      setSelectedProgram(null);
      await loadCalendar();
    } catch (error) {
      console.error("Atamalar kaydedilemedi", error);
      setErrorMessage(isMeeting ? "Toplanti davetlileri kaydedilemedi." : "Gorev atamalari kaydedilemedi.");
    } finally {
      setAssignmentSaving(false);
    }
  };

  const assignmentRoleOptions = useMemo(
    () => Array.from(new Set(assignees.map((assignee) => assignee.role).filter(Boolean))).sort(),
    [assignees],
  );

  const assignmentUnitOptions = useMemo(
    () => Array.from(new Set(assignees.map((assignee) => assignee.unit || "Birim yok").filter(Boolean))).sort(),
    [assignees],
  );

  const filteredAssignees = useMemo(
    () =>
      assignees
        .filter((assignee) => assignmentRoleFilter === "all" || assignee.role === assignmentRoleFilter)
        .filter((assignee) => assignmentUnitFilter === "all" || (assignee.unit || "Birim yok") === assignmentUnitFilter)
        .filter((assignee) =>
          `${assignee.name} ${assignee.role} ${assignee.unit ?? ""} ${assignee.title ?? ""}`
            .toLowerCase()
            .includes(assignmentSearch.toLowerCase()),
        ),
    [assignees, assignmentRoleFilter, assignmentSearch, assignmentUnitFilter],
  );

  const filteredAssigneeIds = useMemo(() => filteredAssignees.map((assignee) => assignee.id), [filteredAssignees]);

  const selectFilteredAssignees = () => {
    setSelectedAssigneeIds((current) => Array.from(new Set([...current, ...filteredAssigneeIds])));
  };

  const clearFilteredAssignees = () => {
    setSelectedAssigneeIds((current) => current.filter((id) => !filteredAssigneeIds.includes(id)));
  };

  const selectFilteredCreateAssignees = () => {
    setCreateAssigneeIds((current) => Array.from(new Set([...current, ...filteredAssigneeIds])));
  };

  const clearFilteredCreateAssignees = () => {
    setCreateAssigneeIds((current) => current.filter((id) => !filteredAssigneeIds.includes(id)));
  };

  const allFilteredPrograms = useMemo(() => {
    return programs
      .filter((program) => (selectedProject === "all" ? true : program.project_id === Number(selectedProject)))
      .filter((program) => (selectedPeriod === "all" ? true : String(program.period?.id ?? "") === selectedPeriod))
      .filter((program) => (statusFilter === "all" ? true : (program.status ?? "scheduled") === statusFilter))
      .filter((program) => {
        const normalizedTerm = searchTerm.trim().toLowerCase();
        if (!normalizedTerm) return true;
        return `${program.title} ${program.project?.name ?? ""} ${program.period?.name ?? ""} ${program.location ?? ""}`
          .toLowerCase()
          .includes(normalizedTerm);
      })
      .sort((left, right) => new Date(left.start_at).getTime() - new Date(right.start_at).getTime());
  }, [programs, searchTerm, selectedPeriod, selectedProject, statusFilter]);

  const rangeStart = useMemo(() => {
    const base = new Date(currentDate);
    base.setHours(0, 0, 0, 0);
    if (viewMode === "monthly") base.setDate(1);
    if (viewMode === "weekly") {
      const day = base.getDay();
      base.setDate(base.getDate() + (day === 0 ? -6 : 1 - day));
    }
    return base;
  }, [currentDate, viewMode]);

  const rangeEnd = useMemo(() => {
    const end = new Date(rangeStart);
    if (viewMode === "daily") end.setDate(end.getDate() + 1);
    if (viewMode === "weekly") end.setDate(end.getDate() + 7);
    if (viewMode === "monthly") end.setMonth(end.getMonth() + 1);
    return end;
  }, [rangeStart, viewMode]);

  const visiblePrograms = useMemo(
    () => allFilteredPrograms.filter((program) => {
      const start = new Date(program.start_at);
      return start >= rangeStart && start < rangeEnd;
    }),
    [allFilteredPrograms, rangeStart, rangeEnd],
  );

  const groupedPrograms = useMemo(() => {
    return visiblePrograms.reduce<Record<string, Program[]>>((accumulator, program) => {
      const key = toIstanbulDateTimeLocal(program.start_at).slice(0, 10) || localDateKey(new Date(program.start_at));
      accumulator[key] = accumulator[key] || [];
      accumulator[key].push(program);
      return accumulator;
    }, {});
  }, [visiblePrograms]);

  const weeklyDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const day = new Date(rangeStart);
        day.setDate(rangeStart.getDate() + index);
        return day;
      }),
    [rangeStart],
  );

  const monthlyDays = useMemo(() => {
    const firstGridDay = new Date(rangeStart);
    const weekDay = firstGridDay.getDay();
    firstGridDay.setDate(firstGridDay.getDate() + (weekDay === 0 ? -6 : 1 - weekDay));
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(firstGridDay);
      day.setDate(firstGridDay.getDate() + index);
      return day;
    });
  }, [rangeStart]);

  const currentRangeLabel = useMemo(() => {
    if (viewMode === "daily") {
      return currentDate.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
    }
    if (viewMode === "weekly") {
      const weekEnd = new Date(rangeStart);
      weekEnd.setDate(rangeStart.getDate() + 6);
      return `${rangeStart.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })} - ${weekEnd.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    return rangeStart.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  }, [currentDate, rangeStart, viewMode]);

  const shiftRange = (direction: -1 | 1) => {
    setCurrentDate((current) => {
      const next = new Date(current);
      if (viewMode === "daily") next.setDate(next.getDate() + direction);
      if (viewMode === "weekly") next.setDate(next.getDate() + direction * 7);
      if (viewMode === "monthly") next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  const googleStatusText = googleStatus?.configured
    ? googleStatus.connected
      ? `Bagli${googleStatus.last_synced_at ? ` / ${formatIstanbulDateTime(googleStatus.last_synced_at)}` : ""}`
      : "Baglanti bekleniyor"
    : "Google ayarlari eksik";

  const ProgramChip = ({ program, compact = false }: { program: Program; compact?: boolean }) => {
    const meta = statusMeta(program.status);
    const isMeeting = (program.event_type ?? "program") === "meeting";
    const canAssign = canManageCalendarItemAssignments(program);
    return (
      <button
        type="button"
        onClick={() => openAssignmentModal(program)}
        className={`w-full rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md ${
          compact ? "p-2" : "p-3"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
              <p className="truncate text-sm font-bold text-slate-900">{program.title}</p>
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">
              {isMeeting ? "Toplanti" : "Program"} / {program.project?.name ?? "Genel"}
            </p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-slate-500">{formatTimeRange(program)}</span>
        </div>
        {!compact && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span className={`rounded-full border px-2 py-0.5 ${meta.chip} ${meta.text}`}>{meta.label}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5">
              {program.calendar_event?.assigned_count ?? 0} {isMeeting ? "davetli" : "gorevli"}
            </span>
            {!isMeeting && (
              program.calendar_event?.google_event_id ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Google</span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Senkron bekliyor</span>
              )
            )}
            {canAssign ? <span className="ml-auto text-indigo-600">{isMeeting ? "Davetli" : "Ata"}</span> : null}
          </div>
        )}
      </button>
    );
  };

  return (
    <PermissionGate
      permission="calendar.view"
      fallback={<div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">Takvimi goruntuleme yetkiniz bulunmuyor.</div>}
    >
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-950">Takvim</h1>
                <p className="text-sm text-slate-500">Programlar, toplantilar, davetliler ve Google Calendar senkron merkezi</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <PermissionGate permission="calendar.export">
                <ExportButtons
                  endpoint="/panel/calendar/export"
                  filename="takvim_programlari"
                  params={{
                    project_id: selectedProject !== "all" ? selectedProject : undefined,
                    period_id: selectedPeriod !== "all" ? selectedPeriod : undefined,
                  }}
                  buttonLabel="Disa Aktar"
                />
              </PermissionGate>
              <button
                type="button"
                onClick={() => void handleConnectGoogleCalendar()}
                disabled={connecting || !googleStatus?.configured || !canConnectGoogle}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                {googleStatus?.connected ? "Baglantiyi Yenile" : "Google Bagla"}
              </button>
              <button
                type="button"
                onClick={() => void handleSyncGoogleCalendar()}
                disabled={syncing || !googleStatus?.connected || !canSyncGoogle}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Senkron
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                disabled={!canCreateAnyCalendarItem}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Yeni
              </button>
            </div>
          </div>
        </div>

        {(errorMessage || successMessage) && (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${errorMessage ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {errorMessage || successMessage}
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${googleStatus?.connected ? "bg-emerald-50 text-emerald-700" : googleStatus?.configured ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-500"}`}>
                <LinkIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Google Calendar durumu</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {!googleStatus?.configured
                    ? "Google Calendar ayarlari eksik."
                    : googleStatus.connected
                      ? "Baglanti aktif, manuel senkron ile bekleyen programlar Google takvime yazilir."
                      : "Ayarlar hazir, baglanti bekleniyor."}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3 lg:min-w-[520px]">
              <GoogleStatusMetric label="Takvim" value={googleStatus?.calendar_id || "-"} />
              <GoogleStatusMetric label="Son senkron" value={formatDateTime(googleStatus?.last_synced_at)} />
              <GoogleStatusMetric label="Bekleyen" value={String(summary?.google_pending_count ?? 0)} />
            </div>
          </div>
          {googleStatus?.last_error ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span className="font-black">Son senkron hatasi:</span> {googleStatus.last_error}
              {googleStatus.last_error_at ? <span className="ml-2 text-xs font-semibold">({formatDateTime(googleStatus.last_error_at)})</span> : null}
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          {[
            { label: "Toplam", value: summary?.total_events ?? summary?.total_programs ?? 0, icon: Clock3, color: "text-slate-700", bg: "bg-slate-50" },
            { label: "Bugun", value: summary?.today_programs ?? 0, icon: CalendarDays, color: "text-indigo-700", bg: "bg-indigo-50" },
            { label: "Bu Hafta", value: summary?.upcoming_this_week ?? 0, icon: Filter, color: "text-sky-700", bg: "bg-sky-50" },
            { label: "Atamasiz", value: summary?.unassigned_count ?? 0, icon: Users, color: "text-amber-700", bg: "bg-amber-50" },
            { label: "Toplanti", value: summary?.total_meetings ?? 0, icon: Users, color: "text-violet-700", bg: "bg-violet-50" },
            { label: "Google", value: summary?.google_synced_count ?? 0, icon: LinkIcon, color: "text-emerald-700", bg: "bg-emerald-50" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-black text-slate-950">{item.value}</p>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
                    {(["daily", "weekly", "monthly"] as ViewMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setViewMode(mode)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${viewMode === mode ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                      >
                        {mode === "daily" ? "Gun" : mode === "weekly" ? "Hafta" : "Ay"}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => shiftRange(-1)} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-[220px] rounded-xl border border-slate-200 px-4 py-2 text-center text-sm font-black text-slate-900">
                    {currentRangeLabel}
                  </div>
                  <button type="button" onClick={() => shiftRange(1)} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setCurrentDate(new Date())} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                    Bugun
                  </button>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={selectedProject}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSelectedProject(value);
                      if (value === "all") {
                        setSelectedPeriod("all");
                        return;
                      }
                      const projectPeriods = periods.filter((period) => String(period.project_id) === value);
                      const active = projectPeriods.find((period) => period.status === "active");
                      setSelectedPeriod(active?.id ? String(active.id) : projectPeriods[0]?.id ? String(projectPeriods[0].id) : "all");
                    }}
                    className={inputClass}
                  >
                    <option value="all">Tum projeler</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedPeriod}
                    onChange={(event) => setSelectedPeriod(event.target.value)}
                    disabled={selectedProject === "all"}
                    className={inputClass}
                  >
                    <option value="all">{selectedProject === "all" ? "Proje secince donem" : "Tum donemler"}</option>
                    {periods
                      .filter((period) => selectedProject === "all" || String(period.project_id) === selectedProject)
                      .map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.name}{period.status === "active" ? " (aktif)" : period.status === "completed" ? " (tamamlandi)" : ""}
                        </option>
                      ))}
                  </select>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ProgramStatusFilter)} className={inputClass}>
                    <option value="all">Tum durumlar</option>
                    <option value="scheduled">Planlandi</option>
                    <option value="active">Aktif</option>
                    <option value="completed">Tamamlandi</option>
                    <option value="cancelled">Iptal</option>
                  </select>
                  <div className="relative min-w-[230px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Baslik, proje, konum ara" className={`${inputClass} pl-9`} />
                  </div>
                </div>
              </div>
            </div>

            <PeriodArchiveModeNotice period={selectedFilterPeriod} />

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Takvim Cizelgesi</h2>
                  <p className="text-xs text-slate-500">{visiblePrograms.length} kayit listeleniyor{canExportCalendar ? " / export hazir" : ""}</p>
                </div>
                <div className="text-xs font-semibold text-slate-500">{googleStatusText}</div>
              </div>

              {loading ? (
                <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
              ) : Object.keys(groupedPrograms).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
                  Secili aralikta planlanmis kayit bulunmuyor.
                </div>
              ) : viewMode === "monthly" ? (
                <div className="grid grid-cols-7 gap-2">
                  {monthlyDays.map((day) => {
                    const key = localDateKey(day);
                    const items = groupedPrograms[key] ?? [];
                    const isCurrentMonth = day.getMonth() === rangeStart.getMonth();
                    return (
                      <div key={key} className={`min-h-28 rounded-2xl border p-2 ${isCurrentMonth ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 text-slate-400"}`}>
                        <div className="mb-2 text-xs font-black">{day.toLocaleDateString("tr-TR", { day: "2-digit" })}</div>
                        <div className="space-y-1">
                          {items.slice(0, 3).map((program) => <ProgramChip key={`${program.event_type ?? "program"}-${program.id}`} program={program} compact />)}
                          {items.length > 3 ? <div className="text-[11px] font-semibold text-slate-500">+{items.length - 3} daha</div> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : viewMode === "weekly" ? (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
                  {weeklyDays.map((day) => {
                    const key = localDateKey(day);
                    const items = groupedPrograms[key] ?? [];
                    const isToday = key === localDateKey(new Date());
                    return (
                      <div key={key} className={`rounded-2xl border p-3 ${isToday ? "border-indigo-200 bg-indigo-50/60" : "border-slate-200 bg-slate-50/60"}`}>
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-black uppercase text-slate-700">{day.toLocaleDateString("tr-TR", { weekday: "short" })}</p>
                            <p className="text-lg font-black text-slate-950">{day.toLocaleDateString("tr-TR", { day: "2-digit" })}</p>
                          </div>
                          <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500">{items.length}</span>
                        </div>
                        <div className="space-y-2">
                          {items.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-400">Bos</div> : items.map((program) => <ProgramChip key={`${program.event_type ?? "program"}-${program.id}`} program={program} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-5">
                  {Object.entries(groupedPrograms).map(([date, items]) => (
                    <div key={date}>
                      <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">{new Date(`${date}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "2-digit", month: "long" })}</h3>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {items.map((program) => <ProgramChip key={`${program.event_type ?? "program"}-${program.id}`} program={program} />)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Dikkat Gerekenler</h2>
              </div>
              <div className="space-y-2">
                {attentionItems.length === 0 ? (
                  <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">Yaklasan kayitlarda kritik eksik yok.</p>
                ) : (
                  attentionItems.map((program) => (
                    <button key={`${program.event_type ?? "program"}-${program.id}`} type="button" onClick={() => openAssignmentModal(program)} className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left transition hover:bg-amber-100">
                      <p className="truncate text-sm font-bold text-slate-900">{program.title}</p>
                      <p className="mt-1 text-xs text-amber-800">
                        {formatDateTime(program.start_at)} / {program.calendar_event?.assigned_count ? "Senkron kontrolu bekliyor" : "Kisi atanmamis"}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Yaklasan Gorevler</h2>
              </div>
              <div className="space-y-2">
                {upcomingTasks.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">Yaklasan kayit yok.</p>
                ) : (
                  upcomingTasks.slice(0, 6).map((program) => (
                    <button key={`${program.event_type ?? "program"}-${program.id}`} type="button" onClick={() => openAssignmentModal(program)} className="w-full rounded-2xl border border-slate-200 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-bold text-slate-900">{program.title}</p>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{program.calendar_event?.assigned_count ?? 0}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(program.start_at)}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>

        {isAssignmentModalOpen && selectedProgram ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex shrink-0 items-start justify-between border-b border-slate-200 p-5">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    {canManageCalendarItemAssignments(selectedProgram)
                      ? ((selectedProgram.event_type ?? "program") === "meeting" ? "Davetli Yonet" : "Gorev Ata")
                      : ((selectedProgram.event_type ?? "program") === "meeting" ? "Toplanti Detayi" : "Gorev Detayi")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{selectedProgram.title}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"><Clock3 className="h-3 w-3" />{formatDateTime(selectedProgram.start_at)}</span>
                    {selectedProgram.location ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"><MapPin className="h-3 w-3" />{selectedProgram.location}</span> : null}
                  </div>
                </div>
                <button type="button" onClick={() => setIsAssignmentModalOpen(false)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="shrink-0 space-y-3 border-b border-slate-100 p-4">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_160px_180px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={assignmentSearch} onChange={(event) => setAssignmentSearch(event.target.value)} placeholder="Personel veya koordinator ara..." className={`${inputClass} pl-9`} />
                  </div>
                  <select value={assignmentRoleFilter} onChange={(event) => setAssignmentRoleFilter(event.target.value)} className={inputClass}>
                    <option value="all">Tum roller</option>
                    {assignmentRoleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                  <select value={assignmentUnitFilter} onChange={(event) => setAssignmentUnitFilter(event.target.value)} className={inputClass}>
                    <option value="all">Tum birimler</option>
                    {assignmentUnitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </div>
                {canManageCalendarItemAssignments(selectedProgram) ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={selectFilteredAssignees} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100">Gorunenleri sec</button>
                    <button type="button" onClick={clearFilteredAssignees} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">Gorunenleri temizle</button>
                    <span className="self-center text-xs text-slate-500">Filtre sonucu: {filteredAssignees.length}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {filteredAssignees.map((assignee) => {
                    const checked = selectedAssigneeIds.includes(assignee.id);
                    const canEditAssignments = canManageCalendarItemAssignments(selectedProgram);
                    return (
                      <label key={assignee.id} className={`flex items-start justify-between gap-3 rounded-2xl border p-3 transition ${canEditAssignments ? "cursor-pointer" : "cursor-default"} ${checked ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{assignee.name}</p>
                          <p className="mt-1 truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {assignee.role}{assignee.unit ? ` / ${assignee.unit}` : ""}{assignee.title ? ` / ${assignee.title}` : ""}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canEditAssignments}
                          onChange={() => handleToggleAssignee(assignee.id)}
                          className="mt-1 h-4 w-4 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between border-t border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-500">Secili kisi: {selectedAssigneeIds.length}</p>
                <button
                  type="button"
                  onClick={() => void handleSaveAssignments()}
                  disabled={assignmentSaving || !canManageCalendarItemAssignments(selectedProgram)}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {assignmentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <form onSubmit={(event) => void handleCreateEvent(event)} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Yeni</h2>
                  <p className="mt-1 text-sm text-slate-500">{createMode === "meeting" ? "Toplanti davetlileri takvimde gorunur." : "Program kaydi Google Calendar entegrasyonuna hazirlanir."}</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-5 inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  disabled={!canUseProgramCreate}
                  onClick={() => {
                    setCreateMode("program");
                    setForm(initialForm);
                    setCreateAssigneeIds([]);
                    setAssignees([]);
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${createMode === "program" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                >
                  Etkinlik
                </button>
                <button
                  type="button"
                  disabled={!canUseMeetingCreate}
                  onClick={() => {
                    setCreateMode("meeting");
                    setForm(initialForm);
                    setCreateAssigneeIds([]);
                    setAssignees([]);
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${createMode === "meeting" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                >
                  Toplanti
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>{createMode === "meeting" ? "Kapsam" : "Proje"}</label>
                  <select
                    required={createMode === "program"}
                    value={form.project_id}
                    onChange={(event) => {
                      const projectId = event.target.value;
                      setForm((current) => ({
                        ...current,
                        project_id: projectId,
                        period_id: projectId ? defaultPeriodForProject(projectId) : "",
                      }));
                      setCreateAssigneeIds([]);
                    }}
                    className={inputClass}
                  >
                    {createMode === "meeting" && hasGlobalScope("calendar.meetings.create") ? <option value="">Genel toplanti</option> : <option value="">Seciniz</option>}
                    {(createMode === "meeting" ? availableMeetingProjects : availableCreateProjects).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                </div>
                {createMode === "program" || form.project_id ? (
                  <div>
                    <label className={labelClass}>{createMode === "meeting" ? "Donem (opsiyonel)" : "Donem"}</label>
                    <select required={createMode === "program"} value={form.period_id} onChange={(event) => setForm((current) => ({ ...current, period_id: event.target.value }))} className={inputClass}>
                      <option value="">{createMode === "meeting" ? "Genel proje toplantisi" : "Seciniz"}</option>
                      {periods.filter((period) => !form.project_id || String(period.project_id) === form.project_id).map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
                    </select>
                  </div>
                ) : null}
                {form.period_id && !formPeriodCanCreate ? (
                  <div className="md:col-span-2">
                    <PeriodArchiveModeNotice period={selectedFormPeriod} />
                    {selectedFormPeriod && selectedFormPeriod.status !== "completed" && selectedFormPeriod.status !== "cancelled" ? (
                      <div className="panel-notice panel-notice-info mt-2">Yeni takvim kaydı yalnız aktif dönemde oluşturulabilir.</div>
                    ) : null}
                  </div>
                ) : null}
                <div className="md:col-span-2">
                  <label className={labelClass}>Baslik</label>
                  <input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Baslangic</label>
                  <input type="datetime-local" required value={form.start_at} onChange={(event) => setForm((current) => ({ ...current, start_at: event.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Bitis</label>
                  <input type="datetime-local" required={createMode === "program"} value={form.end_at} onChange={(event) => setForm((current) => ({ ...current, end_at: event.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Konum</label>
                  <input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value, location_place_name: "", location_place_address: "", location_place_id: "", location_place_provider: "" }))} className={inputClass} />
                </div>
                {createMode === "program" ? (
                  <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <label className={labelClass}>Haritadan Konum Secimi</label>
                        <p className="text-xs text-slate-500">Haritaya tiklayarak program yoklama koordinatini belirleyin.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, latitude: "", longitude: "", location_place_name: "", location_place_address: "", location_place_id: "", location_place_provider: "" }))}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                      >
                        Konumu temizle
                      </button>
                    </div>
                    <ProgramLocationMap
                      mode="picker"
                      latitude={form.latitude}
                      longitude={form.longitude}
                      radiusMeters={form.radius_meters}
                      placeName={form.location_place_name}
                      placeAddress={form.location_place_address}
                      placeId={form.location_place_id}
                      placeProvider={form.location_place_provider}
                      heightClassName="h-64"
                      onChange={(selection) =>
                        setForm((current) => ({
                          ...current,
                          location: selection.placeName || selection.placeAddress || current.location,
                          location_place_name: selection.placeName ?? "",
                          location_place_address: selection.placeAddress ?? "",
                          location_place_id: selection.placeId ?? "",
                          location_place_provider: selection.placeProvider ?? "",
                          latitude: formatCoordinate(selection.latitude),
                          longitude: formatCoordinate(selection.longitude),
                        }))
                      }
                    />
                  </div>
                ) : null}
                {createMode === "program" ? (
                  <>
                    <div>
                      <label className={labelClass}>Yoklama Yari Capi</label>
                      <input type="number" min={10} value={form.radius_meters} onChange={(event) => setForm((current) => ({ ...current, radius_meters: event.target.value }))} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Kredi Dusumu</label>
                      <input type="number" min={0} value={form.credit_deduction} onChange={(event) => setForm((current) => ({ ...current, credit_deduction: event.target.value }))} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Basvuru Kontenjani</label>
                      <input type="number" min={1} value={form.application_quota} onChange={(event) => setForm((current) => ({ ...current, application_quota: event.target.value }))} placeholder="Opsiyonel" className={inputClass} />
                    </div>
                  </>
                ) : null}
                <div className="md:col-span-2">
                  <label className={labelClass}>Aciklama</label>
                  <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className={`${inputClass} h-28 resize-none`} />
                </div>
              </div>

              {createMode === "meeting" ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">Davetliler</h3>
                      <p className="text-xs text-slate-500">Secili kisi: {createAssigneeIds.length}</p>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_150px] lg:w-[620px]">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input value={assignmentSearch} onChange={(event) => setAssignmentSearch(event.target.value)} placeholder="Kisi ara" className={`${inputClass} bg-white pl-9`} />
                      </div>
                      <select value={assignmentRoleFilter} onChange={(event) => setAssignmentRoleFilter(event.target.value)} className={`${inputClass} bg-white`}>
                        <option value="all">Tum roller</option>
                        {assignmentRoleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                      <select value={assignmentUnitFilter} onChange={(event) => setAssignmentUnitFilter(event.target.value)} className={`${inputClass} bg-white`}>
                        <option value="all">Tum birimler</option>
                        {assignmentUnitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button type="button" onClick={selectFilteredCreateAssignees} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100">Gorunenleri sec</button>
                    <button type="button" onClick={clearFilteredCreateAssignees} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-white">Gorunenleri temizle</button>
                    <span className="self-center text-xs text-slate-500">Filtre sonucu: {filteredAssignees.length}</span>
                  </div>
                  <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                    {filteredAssignees.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500 md:col-span-2">Secilebilir kisi bulunmuyor.</div>
                    ) : (
                      filteredAssignees.map((assignee) => {
                        const checked = createAssigneeIds.includes(assignee.id);
                        return (
                          <label key={assignee.id} className={`flex cursor-pointer items-start justify-between gap-3 rounded-2xl border p-3 transition ${checked ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:bg-white"}`}>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">{assignee.name}</p>
                              <p className="mt-1 truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {assignee.role}{assignee.unit ? ` / ${assignee.unit}` : ""}{assignee.title ? ` / ${assignee.title}` : ""}
                              </p>
                            </div>
                            <input type="checkbox" checked={checked} onChange={() => handleToggleCreateAssignee(assignee.id)} className="mt-1 h-4 w-4" />
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">{createMode === "meeting" ? "Toplanti davetlilerin yaklasan kayitlarinda gorunur." : "Saat cakismalari backend tarafinda tum projeler icin kontrol edilir."}</p>
                <button
                  type="submit"
                  disabled={
                    creating ||
                    !formPeriodCanCreate ||
                    (createMode === "program"
                      ? (!canUseProgramCreate || !form.project_id || !canAccessProject("programs.create", Number(form.project_id)))
                      : (!canUseMeetingCreate || !canCreateMeetingInSelectedScope(form.project_id)))
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
