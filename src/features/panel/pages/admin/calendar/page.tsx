"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  Link as LinkIcon,
  Loader2,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import api from "@/lib/api/axios";
import { usePermissions } from "@/hooks/usePermissions";

interface Project {
  id: number;
  name: string;
  active_period?: {
    id: number;
    name: string;
  } | null;
}

interface Period {
  id: number;
  name: string;
  project_id: number;
}

interface Program {
  id: number;
  title: string;
  description?: string | null;
  location?: string | null;
  status?: string | null;
  start_at: string;
  end_at?: string | null;
  radius_meters?: number | null;
  credit_deduction?: number | null;
  project_id: number;
  project?: {
    id: number;
    name: string;
  } | null;
  period?: {
    id: number;
    name: string;
  } | null;
  calendar_event?: {
    google_event_id?: string | null;
    assigned_user_ids?: number[];
    assigned_users?: CalendarAssignee[];
    assigned_count?: number;
    is_assigned_to_current_user?: boolean;
  } | null;
}

interface CalendarAssignee {
  id: number;
  name: string;
  role: string;
  unit?: string | null;
  title?: string | null;
}

interface CalendarSummary {
  total_programs: number;
  upcoming_this_week: number;
  upcoming_this_month: number;
  open_support_count: number;
  google_synced_count: number;
}

interface GoogleCalendarStatus {
  configured: boolean;
  connected: boolean;
  calendar_id?: string | null;
  last_synced_at?: string | null;
}

interface CalendarOverviewResponse {
  projects: Project[];
  programs: Program[];
  summary: CalendarSummary;
  upcoming_tasks: Program[];
  google_calendar: GoogleCalendarStatus;
}

type ViewMode = "daily" | "weekly" | "monthly";

const initialForm = {
  project_id: "",
  period_id: "",
  title: "",
  description: "",
  location: "",
  start_at: "",
  end_at: "",
  radius_meters: "100",
  credit_deduction: "10",
};

export default function AdminCalendarPage() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [summary, setSummary] = useState<CalendarSummary | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [assignees, setAssignees] = useState<CalendarAssignee[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
  const [selectedProject, setSelectedProject] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState(() =>
    searchParams.get("google_calendar") === "connected"
      ? "Google Calendar baglantisi basariyla kuruldu."
      : ""
  );
  const [form, setForm] = useState(initialForm);

  const { hasPermission, canAccessProject } = usePermissions();
  const canCreateProgram = hasPermission("programs.create");
  const canConnectGoogle = hasPermission("calendar.google.connect");
  const canSyncGoogle = hasPermission("calendar.google.sync");

  const loadAssignees = useCallback(async (projectId?: number) => {
    try {
      const response = await api.get<{ users: CalendarAssignee[] }>("/calendar/assignees", {
        params: projectId ? { project_id: projectId } : {},
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
      const [overviewResponse, periodResponse] = await Promise.all([
        api.get<CalendarOverviewResponse>("/calendar/overview"),
        api.get<{ periods?: Period[] }>("/panel/periods"),
      ]);

      setProjects(overviewResponse.data.projects ?? []);
      setPrograms(overviewResponse.data.programs ?? []);
      setSummary(overviewResponse.data.summary ?? null);
      setGoogleStatus(overviewResponse.data.google_calendar ?? null);
      setPeriods(periodResponse.data.periods ?? []);
    } catch (error) {
      console.error("Admin takvim verileri yuklenemedi", error);
      setErrorMessage("Takvim verileri yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCalendar();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCalendar]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      await loadAssignees();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAssignees]);

  const handleCreateEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pid = Number(form.project_id);
    if (!canCreateProgram || !Number.isFinite(pid) || !canAccessProject("programs.create", pid)) {
      setErrorMessage("Bu proje icin program olusturma yetkiniz yok.");
      return;
    }

    setCreating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.post("/panel/programs", {
        ...form,
        project_id: Number(form.project_id),
        period_id: Number(form.period_id),
        radius_meters: Number(form.radius_meters),
        credit_deduction: Number(form.credit_deduction),
      });

      setSuccessMessage("Program takvime eklendi.");
      setForm(initialForm);
      setIsModalOpen(false);
      await loadCalendar();
    } catch (error: unknown) {
      console.error("Program olusturulamadi", error);
      const message =
        typeof error === "object"
        && error !== null
        && "response" in error
        && typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Program olusturulamadi."
          : "Program olusturulamadi.";
      setErrorMessage(message);
    } finally {
      setCreating(false);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    setConnecting(true);
    setErrorMessage("");

    try {
      const response = await api.get<{ authorization_url: string }>("/calendar/google/connect", {
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
      const response = await api.post<{
        message: string;
        google_calendar: GoogleCalendarStatus;
      }>("/calendar/google/sync");

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
    setSelectedProgram(program);
    setSelectedAssigneeIds(program.calendar_event?.assigned_user_ids ?? []);
    setAssignmentSearch("");
    setIsAssignmentModalOpen(true);
    void loadAssignees(program.project_id);
  };

  const handleToggleAssignee = (assigneeId: number) => {
    setSelectedAssigneeIds((current) =>
      current.includes(assigneeId)
        ? current.filter((id) => id !== assigneeId)
        : [...current, assigneeId]
    );
  };

  const handleSaveAssignments = async () => {
    if (!selectedProgram) {
      return;
    }

    if (
      !hasPermission("calendar.assignments.manage") ||
      !canAccessProject("calendar.assignments.manage", selectedProgram.project_id)
    ) {
      setErrorMessage("Bu program icin gorev atama yetkiniz yok.");
      return;
    }

    setAssignmentSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.put(`/calendar/programs/${selectedProgram.id}/assignments`, {
        assigned_user_ids: selectedAssigneeIds,
      });

      setSuccessMessage("Gorev atamalari guncellendi.");
      setIsAssignmentModalOpen(false);
      setSelectedProgram(null);
      await loadCalendar();
    } catch (error) {
      console.error("Gorev atamalari kaydedilemedi", error);
      setErrorMessage("Gorev atamalari kaydedilemedi.");
    } finally {
      setAssignmentSaving(false);
    }
  };

  const filteredAssignees = useMemo(() => {
    return assignees.filter((assignee) =>
      `${assignee.name} ${assignee.role} ${assignee.unit ?? ""} ${assignee.title ?? ""}`
        .toLowerCase()
        .includes(assignmentSearch.toLowerCase())
    );
  }, [assignees, assignmentSearch]);

  const allFilteredPrograms = useMemo(() => {
    return programs
      .filter((program) => (selectedProject === "all" ? true : program.project_id === Number(selectedProject)))
      .sort((left, right) => new Date(left.start_at).getTime() - new Date(right.start_at).getTime());
  }, [programs, selectedProject]);

  const dateKey = (value: Date) => value.toISOString().slice(0, 10);

  const rangeStart = useMemo(() => {
    const base = new Date(currentDate);
    base.setHours(0, 0, 0, 0);
    if (viewMode === "monthly") {
      base.setDate(1);
    }
    if (viewMode === "weekly") {
      const day = base.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      base.setDate(base.getDate() + diff);
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

  const visiblePrograms = useMemo(() => {
    return allFilteredPrograms.filter((program) => {
      const start = new Date(program.start_at);
      return start >= rangeStart && start < rangeEnd;
    });
  }, [allFilteredPrograms, rangeStart, rangeEnd]);

  const groupedPrograms = useMemo(() => {
    return visiblePrograms.reduce<Record<string, Program[]>>((accumulator, program) => {
      const key = dateKey(new Date(program.start_at));
      accumulator[key] = accumulator[key] || [];
      accumulator[key].push(program);
      return accumulator;
    }, {});
  }, [visiblePrograms]);

  const weeklyDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(rangeStart);
      day.setDate(rangeStart.getDate() + index);
      return day;
    });
  }, [rangeStart]);

  const monthlyDays = useMemo(() => {
    const monthStart = new Date(rangeStart);
    const firstGridDay = new Date(monthStart);
    const weekDay = firstGridDay.getDay();
    const diff = weekDay === 0 ? -6 : 1 - weekDay;
    firstGridDay.setDate(firstGridDay.getDate() + diff);
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
            <CalendarDays className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Takvim</h1>
            <p className="text-sm text-muted-foreground">
              Tum projelerin ortak takvimi, Google Calendar baglantisi ve program planlama merkezi
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            onClick={() => void handleConnectGoogleCalendar()}
            disabled={connecting || !googleStatus?.configured || !canConnectGoogle}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-bold text-blue-300 disabled:opacity-50"
          >
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
            {googleStatus?.connected ? "Baglanti Yenile" : "Google Bagla"}
          </button>
          <button
            type="button"
            onClick={() => void handleSyncGoogleCalendar()}
            disabled={syncing || !googleStatus?.connected || !canSyncGoogle}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-300 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Google Senkron
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={!canCreateProgram}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Yeni Program
          </button>
        </div>
      </div>

      {(errorMessage || successMessage) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            errorMessage
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="glass-panel rounded-3xl p-6">
          <div className="mb-2 flex items-center gap-2 text-indigo-400">
            <Clock3 className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Toplam Program</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{summary?.total_programs ?? 0}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <div className="mb-2 flex items-center gap-2 text-indigo-400">
            <CalendarDays className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Bu Hafta</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{summary?.upcoming_this_week ?? 0}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <div className="mb-2 flex items-center gap-2 text-indigo-400">
            <Filter className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Acik Destek</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{summary?.open_support_count ?? 0}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <div className="mb-2 flex items-center gap-2 text-indigo-400">
            <LinkIcon className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Google Senkron</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{summary?.google_synced_count ?? 0}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            {googleStatus?.configured
              ? googleStatus.connected
                ? `Bagli${googleStatus.last_synced_at ? ` - ${new Date(googleStatus.last_synced_at).toLocaleString("tr-TR")}` : ""}`
                : "Yapilandirildi, baglanti bekleniyor"
              : "Google ayarlari eksik"}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="flex overflow-hidden rounded-xl border border-border">
          {(["daily", "weekly", "monthly"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
                viewMode === mode
                  ? "bg-indigo-600 text-white"
                  : "bg-transparent text-muted-foreground hover:bg-muted"
              }`}
            >
              {mode === "daily" ? "Gunluk" : mode === "weekly" ? "Haftalik" : "Aylik"}
            </button>
          ))}
        </div>

        <select
          value={selectedProject}
          onChange={(event) => setSelectedProject(event.target.value)}
          className="rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Tum projeler</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 rounded-xl border border-border px-2 py-1">
          <button type="button" onClick={() => shiftRange(-1)} className="rounded-lg px-3 py-1 text-sm hover:bg-muted">
            Geri
          </button>
          <div className="min-w-[180px] text-center text-sm font-semibold text-slate-900">{currentRangeLabel}</div>
          <button type="button" onClick={() => shiftRange(1)} className="rounded-lg px-3 py-1 text-sm hover:bg-muted">
            Ileri
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="glass-panel rounded-[32px] border border-border/40 p-8">
          <div className="mb-6 flex items-center gap-2 text-indigo-400">
            <Clock3 className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Program Cizelgesi</span>
          </div>

          {Object.keys(groupedPrograms).length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 text-sm text-muted-foreground">
              Secili aralikta planlanmis program bulunmuyor.
            </div>
          ) : (
            <div className="space-y-6">
              {viewMode === "monthly" ? (
                <div className="grid grid-cols-7 gap-3">
                  {monthlyDays.map((day) => {
                    const key = dateKey(day);
                    const items = groupedPrograms[key] ?? [];
                    const isCurrentMonth = day.getMonth() === rangeStart.getMonth();
                    return (
                      <div key={key} className={`min-h-28 rounded-xl border p-2 ${isCurrentMonth ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-60"}`}>
                        <div className="mb-2 text-xs font-bold text-slate-900">{day.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })}</div>
                        <div className="space-y-1">
                          {items.slice(0, 3).map((program) => (
                            <button key={program.id} type="button" onClick={() => openAssignmentModal(program)} className="block w-full truncate rounded bg-indigo-500/10 px-2 py-1 text-left text-[11px] text-indigo-300">
                              {program.title}
                            </button>
                          ))}
                          {items.length > 3 ? <div className="text-[10px] text-muted-foreground">+{items.length - 3} daha</div> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : viewMode === "weekly" ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
                  {weeklyDays.map((day) => {
                    const key = dateKey(day);
                    const items = groupedPrograms[key] ?? [];
                    return (
                      <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-900">
                          {day.toLocaleDateString("tr-TR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                        </div>
                        <div className="space-y-2">
                          {items.length === 0 ? (
                            <div className="text-xs text-muted-foreground">Program yok</div>
                          ) : (
                            items.map((program) => (
                              <button key={program.id} type="button" onClick={() => openAssignmentModal(program)} className="w-full rounded-lg bg-indigo-500/10 px-2 py-2 text-left text-xs text-indigo-300">
                                <div className="truncate font-semibold">{program.title}</div>
                                <div className="text-[10px]">{new Date(program.start_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                Object.entries(groupedPrograms).map(([date, items]) => (
                  <div key={date}>
                    <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-900">{new Date(date).toLocaleDateString("tr-TR")}</h2>
                    <div className="space-y-3">
                      {items.map((program) => (
                        <div key={program.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="text-sm font-bold text-slate-900">{program.title}</div>
                              <div className="mt-1 flex flex-wrap gap-2 text-xs uppercase tracking-widest text-indigo-300">
                                <span>{program.project?.name}</span>
                                {program.period?.name ? <span>{program.period.name}</span> : null}
                                {program.status ? <span>{program.status}</span> : null}
                              </div>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              {new Date(program.start_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                              {program.end_at ? ` - ${new Date(program.end_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {isAssignmentModalOpen && selectedProgram ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">Gorev Ata</h2>
                <p className="mt-1 text-sm text-muted-foreground">{selectedProgram.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignmentModalOpen(false)}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-white/10 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              value={assignmentSearch}
              onChange={(event) => setAssignmentSearch(event.target.value)}
              placeholder="Personel veya koordinatör ara..."
              className="mb-4 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />

            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {filteredAssignees.map((assignee) => {
                const checked = selectedAssigneeIds.includes(assignee.id);

                return (
                  <label
                    key={assignee.id}
                    className={`flex cursor-pointer items-start justify-between gap-4 rounded-2xl border p-4 transition ${
                      checked ? "border-indigo-500/40 bg-indigo-500/10" : "border-white/5 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">{assignee.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-widest text-indigo-300">
                        {assignee.role}
                        {assignee.unit ? ` - ${assignee.unit}` : ""}
                        {assignee.title ? ` - ${assignee.title}` : ""}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleAssignee(assignee.id)}
                      className="mt-1 h-4 w-4"
                    />
                  </label>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Secili kisi sayisi: {selectedAssigneeIds.length}</div>
              <button
                type="button"
                onClick={() => void handleSaveAssignments()}
                disabled={
                  assignmentSaving ||
                  !selectedProgram ||
                  !hasPermission("calendar.assignments.manage") ||
                  !canAccessProject("calendar.assignments.manage", selectedProgram.project_id)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {assignmentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Atamalari Kaydet
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => void handleCreateEvent(event)}
            className="w-full max-w-2xl rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
                <CalendarDays className="h-5 w-5 text-indigo-500" />
                Yeni Program Ekle
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-white/10 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Proje
                  </label>
                  <select
                    required
                    value={form.project_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        project_id: event.target.value,
                        period_id: "",
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                  >
                    <option value="">Seciniz</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Donem
                  </label>
                  <select
                    required
                    value={form.period_id}
                    onChange={(event) => setForm((current) => ({ ...current, period_id: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                  >
                    <option value="">Seciniz</option>
                    {periods
                      .filter((period) => !form.project_id || String(period.project_id) === form.project_id)
                      .map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Baslik
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Baslangic
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.start_at}
                    onChange={(event) => setForm((current) => ({ ...current, start_at: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Bitis
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.end_at}
                    onChange={(event) => setForm((current) => ({ ...current, end_at: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Konum
                  </label>
                  <input
                    value={form.location}
                    onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Yoklama Capi
                  </label>
                  <input
                    type="number"
                    min={10}
                    value={form.radius_meters}
                    onChange={(event) => setForm((current) => ({ ...current, radius_meters: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Kredi Dusumu
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.credit_deduction}
                  onChange={(event) => setForm((current) => ({ ...current, credit_deduction: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Aciklama
                </label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={
                  creating ||
                  !canCreateProgram ||
                  !form.project_id ||
                  !canAccessProject("programs.create", Number(form.project_id))
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
  );
}
