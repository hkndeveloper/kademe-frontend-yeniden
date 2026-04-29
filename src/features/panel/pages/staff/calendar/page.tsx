"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Link as LinkIcon,
  Loader2,
  MapPin,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";

interface Project {
  id: number;
  name: string;
}

interface Program {
  id: number;
  title: string;
  description?: string | null;
  start_at: string;
  end_at?: string | null;
  location?: string | null;
  status?: string | null;
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
    assigned_users?: Array<{
      id: number;
      name: string;
    }>;
    assigned_count?: number;
    is_assigned_to_current_user?: boolean;
  } | null;
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

interface CalendarPayload {
  projects: Project[];
  programs: Program[];
  summary: CalendarSummary;
  google_calendar: GoogleCalendarStatus;
}

export default function StaffCalendarPage() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [summary, setSummary] = useState<CalendarSummary | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleCalendarStatus | null>(null);
  const [selectedProject, setSelectedProject] = useState("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState(() =>
    searchParams.get("google_calendar") === "connected"
      ? "Google Calendar baglantisi basariyla kuruldu."
      : ""
  );

  const loadCalendar = async () => {
    try {
      const response = await api.get<CalendarPayload>("/calendar/overview");
      setProjects(response.data.projects ?? []);
      setPrograms((response.data.programs ?? []).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()));
      setSummary(response.data.summary ?? null);
      setGoogleStatus(response.data.google_calendar ?? null);
    } catch (error) {
      console.error("Personel takvim verileri yuklenemedi", error);
      setErrorMessage("Takvim verileri yuklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCalendar();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setErrorMessage("");

    try {
      const response = await api.get<{ authorization_url: string }>("/calendar/google/connect", {
        params: { panel: "staff" },
      });

      window.location.href = response.data.authorization_url;
    } catch (error) {
      console.error("Google Calendar baglantisi baslatilamadi", error);
      setErrorMessage("Google Calendar baglantisi baslatilamadi.");
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await api.post<{ message: string; google_calendar: GoogleCalendarStatus }>("/calendar/google/sync");
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

  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      const matchesProject = selectedProject === "all" ? true : program.project_id === Number(selectedProject);
      const matchesAssignment = assignedOnly ? !!program.calendar_event?.is_assigned_to_current_user : true;
      return matchesProject && matchesAssignment;
    });
  }, [assignedOnly, programs, selectedProject]);

  const upcomingPrograms = filteredPrograms.filter((program) => new Date(program.end_at ?? program.start_at) >= new Date());
  const pastPrograms = filteredPrograms.filter((program) => new Date(program.end_at ?? program.start_at) < new Date()).slice(0, 8);
  const assignedUpcomingCount = programs.filter(
    (program) => !!program.calendar_event?.is_assigned_to_current_user && new Date(program.end_at ?? program.start_at) >= new Date()
  ).length;

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>;
  }

  return (
    <PermissionGate
      permission="calendar.view"
      fallback={
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-center text-sm text-amber-100">
          Takvimi goruntuleme yetkiniz bulunmuyor.
        </div>
      }
    >
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
            <CalendarIcon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Etkinlik Takvimi</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Tum projelerin ortak takvim gorunumu ve Google senkron durumu</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 md:flex-row">
          <button
            onClick={() => void handleConnect()}
            disabled={connecting || !googleStatus?.configured}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-bold text-blue-300 disabled:opacity-50"
          >
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
            {googleStatus?.connected ? "Baglanti Yenile" : "Google Bagla"}
          </button>
          <button
            onClick={() => void handleSync()}
            disabled={syncing || !googleStatus?.connected}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Google Senkron
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

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Toplam program</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{summary?.total_programs ?? 0}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Bu hafta</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{summary?.upcoming_this_week ?? 0}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Acik destek</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{summary?.open_support_count ?? 0}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Bana atanan</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{assignedUpcomingCount}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Google senkron</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{summary?.google_synced_count ?? 0}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row">
          <select
            value={selectedProject}
            onChange={(event) => setSelectedProject(event.target.value)}
            className="rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">Tum projeler</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setAssignedOnly((current) => !current)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
              assignedOnly
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-border bg-input text-muted-foreground hover:bg-muted"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {assignedOnly ? "Tum Etkinlikleri Goster" : "Bana Atananlar"}
          </button>
        </div>
        <div className="text-xs text-muted-foreground">
          {googleStatus?.configured
            ? googleStatus.connected
              ? `Google bagli${googleStatus.last_synced_at ? ` - ${new Date(googleStatus.last_synced_at).toLocaleString("tr-TR")}` : ""}`
              : "Google baglantisi henuz kurulmedi"
            : "Google ayarlari eksik"}
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-8">
        <h2 className="mb-6 text-xl font-bold text-slate-900">
          Yaklasan Etkinlikler
          <span className="ml-3 rounded-full bg-amber-500/20 px-3 py-1 text-xs text-amber-500">{upcomingPrograms.length}</span>
        </h2>

        {upcomingPrograms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-muted-foreground">
            Yaklasan etkinlik bulunmuyor.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {upcomingPrograms.map((program) => {
              const startDate = new Date(program.start_at);
              const endDate = new Date(program.end_at ?? program.start_at);

              return (
                <div key={program.id} className="flex flex-col rounded-2xl border border-white/5 bg-white/5 p-5 transition-colors hover:bg-white/10">
                  <div className="mb-4 flex items-start justify-between border-b border-white/5 pb-4">
                    <div className="min-w-[70px] rounded-xl bg-amber-500/10 p-3 text-center text-amber-500">
                      <div className="text-2xl font-black">{startDate.getDate()}</div>
                      <div className="text-xs font-bold uppercase">{startDate.toLocaleDateString("tr-TR", { month: "short" })}</div>
                    </div>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {program.project?.name || "Genel"}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-slate-900">{program.title}</h3>
                  {program.description ? (
                    <p className="mb-4 flex-1 text-xs text-muted-foreground line-clamp-2">{program.description}</p>
                  ) : (
                    <div className="mb-4 flex-1 text-xs text-muted-foreground">Aciklama eklenmemis.</div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-4 w-4 text-amber-500" />
                      {startDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} - {endDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {program.location ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        {program.location}
                      </div>
                    ) : null}
                    <div className="text-[10px] uppercase tracking-widest text-amber-300">
                      {program.calendar_event?.google_event_id ? "Google ile senkronlu" : "Yerel kayit"}
                    </div>
                    {(program.calendar_event?.assigned_users?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {program.calendar_event?.assigned_users?.map((assignee) => (
                          <span key={assignee.id} className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                            {assignee.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pastPrograms.length > 0 ? (
        <div className="glass-panel rounded-3xl p-8 opacity-80 transition-opacity hover:opacity-100">
          <h2 className="mb-6 text-lg font-bold text-slate-900">Gecmis Etkinlikler</h2>
          <div className="space-y-3">
            {pastPrograms.map((program) => (
              <div key={program.id} className="flex flex-col justify-between gap-4 rounded-xl border border-white/5 bg-white/5 p-4 md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                  <div className="w-24 text-xs text-muted-foreground">
                    {new Date(program.start_at).toLocaleDateString("tr-TR")}
                  </div>
                  <div className="font-bold text-slate-900">{program.title}</div>
                </div>
                <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>{program.project?.name || "Genel"}</span>
                  <span>{program.location || "Konum yok"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
    </PermissionGate>
  );
}
