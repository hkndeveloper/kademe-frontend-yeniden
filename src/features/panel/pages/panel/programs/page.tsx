"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, CheckCircle2, Loader2, MapPin, Pencil, Play, Search, SquareCheckBig, X } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import type { AxiosError } from "axios";

interface ActivePeriod {
  id: number;
  name: string;
}

interface Project {
  id: number;
  name: string;
  active_period?: ActivePeriod | null;
}

type ProjectsPayload = Project[] | { data?: Project[] };

type ApiErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
};

interface Program {
  id: number;
  title: string;
  description?: string | null;
  location?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  start_at: string;
  end_at?: string | null;
  status?: ProgramFormState["status"];
  radius_meters?: number | null;
  credit_deduction?: number | null;
  application_quota?: number | null;
  project_id: number;
  project?: { id: number; name: string } | null;
  period?: { id: number; name: string } | null;
  attendance_count?: number;
  feedback_count?: number;
}

interface AttendanceRecord {
  id?: number | null;
  participant_id?: number | null;
  student: string;
  email?: string | null;
  method?: string | null;
  is_valid: boolean;
  attendance_status?: "present" | "absent";
  feedback_submitted: boolean;
  credit_deducted?: boolean;
  credit_restored?: boolean;
  recorded_at?: string | null;
}

interface AttendanceSummary {
  attendance_count: number;
  participant_count?: number;
  absent_count?: number;
  feedback_count: number;
  deduction_count?: number;
  restore_count?: number;
}

interface ProgramFormState {
  project_id: string;
  title: string;
  description: string;
  location: string;
  latitude: string;
  longitude: string;
  start_at: string;
  end_at: string;
  radius_meters: string;
  credit_deduction: string;
  application_quota: string;
  status: "scheduled" | "active" | "completed" | "cancelled";
}

const initialForm: ProgramFormState = {
  project_id: "",
  title: "",
  description: "",
  location: "",
  latitude: "",
  longitude: "",
  start_at: "",
  end_at: "",
  radius_meters: "100",
  credit_deduction: "10",
  application_quota: "",
  status: "scheduled",
};

const statusLabels: Record<ProgramFormState["status"], string> = {
  scheduled: "Planlandi",
  active: "Aktif",
  completed: "Tamamlandi",
  cancelled: "Iptal",
};

const statusClasses: Record<ProgramFormState["status"], string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const normalizeStatus = (status?: Program["status"]): ProgramFormState["status"] => {
  if (status === "active" || status === "completed" || status === "cancelled") return status;
  return "scheduled";
};

function apiErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  const responseMessage = axiosError.response?.data?.message;
  const validationMessage = Object.values(axiosError.response?.data?.errors ?? {})
    .flat()
    .join(" ");

  return validationMessage || responseMessage || fallback;
}

export default function PanelProgramsPage() {
  const { hasPermission, canAccessProject } = usePermissions();
  const [projects, setProjects] = useState<Project[]>([]);
  const [creatableProjects, setCreatableProjects] = useState<Project[]>([]);
  const [updatableProjects, setUpdatableProjects] = useState<Project[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("project_id") ?? "all";
  });
  const [showForm, setShowForm] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<ProgramFormState>(initialForm);
  const [attendanceModalProgram, setAttendanceModalProgram] = useState<Program | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [attendanceActionLoading, setAttendanceActionLoading] = useState<number | null>(null);
  const canViewAttendanceStats = hasPermission("programs.attendance.view");
  const canManageAttendance = hasPermission("programs.attendance.manage");
  const canUpdatePrograms = hasPermission("programs.update");
  const canCompletePrograms = hasPermission("programs.complete");
  const canManageQr = hasPermission("programs.qr.manage");

  const normalizeProjectsPayload = useCallback((payload: ProjectsPayload | undefined): Project[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }, []);

  const loadProjectsByPermission = useCallback(async (
    permission: "programs.view" | "programs.create" | "programs.update"
  ) => {
    try {
      const response = await api.get<{ projects: ProjectsPayload }>("/panel/projects/manageable", {
        params: { permission },
      });
      return normalizeProjectsPayload(response.data.projects);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 403) {
        return [];
      }
      if (axiosError.response?.status === 422) {
        const fallback = await api.get<{ projects: ProjectsPayload }>("/panel/projects/manageable");
        return normalizeProjectsPayload(fallback.data.projects).filter((project) => canAccessProject(permission, project.id));
      }
      throw error;
    }
  }, [canAccessProject, normalizeProjectsPayload]);

  const loadPrograms = useCallback(async () => {
    setRefreshing(true);
    setErrorMessage(null);

    try {
      const [viewableProjects, creatableProjectsRaw, updatableProjectsRaw] = await Promise.all([
        loadProjectsByPermission("programs.view"),
        loadProjectsByPermission("programs.create"),
        loadProjectsByPermission("programs.update"),
      ]);

      const manageableProjects = viewableProjects.filter(
        (project) => canAccessProject("programs.view", project.id)
      );
      const allowedCreateProjects = creatableProjectsRaw.filter(
        (project) => project.active_period?.id && canAccessProject("programs.create", project.id)
      );
      const allowedUpdateProjects = updatableProjectsRaw.filter(
        (project) => canAccessProject("programs.update", project.id)
      );
      setProjects(manageableProjects);
      setCreatableProjects(allowedCreateProjects);
      setUpdatableProjects(allowedUpdateProjects);

      const responses = await Promise.all(
        manageableProjects.map(async (project) => {
          try {
            const response = await api.get<{ programs: Program[] }>("/panel/programs", {
              params: { project_id: project.id },
            });

            return (response.data.programs ?? []).map((program) => ({
              ...program,
              project_id: program.project_id ?? project.id,
              status: normalizeStatus(program.status),
            }));
          } catch (error) {
            console.error(`Proje #${project.id} programlari yuklenemedi`, error);
            return [];
          }
        })
      );

      setPrograms(responses.flat());
    } catch (error) {
      console.error("Panel programlari yuklenemedi", error);
      setErrorMessage("Program listesi yuklenemedi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canAccessProject, loadProjectsByPermission]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPrograms();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPrograms]);

  const projectNameMap = useMemo(
    () =>
      projects.reduce<Record<number, string>>((accumulator, project) => {
        accumulator[project.id] = project.name;
        return accumulator;
      }, {}),
    [projects]
  );

  const filteredPrograms = useMemo(() => {
    return [...programs]
      .filter((program) => (selectedProjectId === "all" ? true : program.project_id === Number(selectedProjectId)))
      .filter((program) => {
        const projectName = program.project?.name ?? projectNameMap[program.project_id] ?? "";
        return `${program.title} ${projectName} ${program.location ?? ""}`.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [programs, projectNameMap, searchTerm, selectedProjectId]);

  const openCreateForm = () => {
    setEditingProgramId(null);
    setForm(initialForm);
    setShowForm(true);
    setMessage(null);
    setErrorMessage(null);
  };

  const openEditForm = (program: Program) => {
    setEditingProgramId(program.id);
    setForm({
      project_id: String(program.project_id),
      title: program.title,
      description: program.description ?? "",
      location: program.location ?? "",
      latitude: program.latitude != null ? String(program.latitude) : "",
      longitude: program.longitude != null ? String(program.longitude) : "",
      start_at: program.start_at ? new Date(program.start_at).toISOString().slice(0, 16) : "",
      end_at: program.end_at ? new Date(program.end_at).toISOString().slice(0, 16) : "",
      radius_meters: String(program.radius_meters ?? 100),
      credit_deduction: String(program.credit_deduction ?? 10),
      application_quota: program.application_quota != null ? String(program.application_quota) : "",
      status: (program.status as ProgramFormState["status"]) || "scheduled",
    });
    setShowForm(true);
    setMessage(null);
    setErrorMessage(null);
  };

  const handleSaveProgram = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const projectPool = editingProgramId ? updatableProjects : creatableProjects;
    const selectedProject = projectPool.find((project) => project.id === Number(form.project_id));
    if (!selectedProject?.active_period?.id) {
      setErrorMessage("Program kaydi icin aktif donemi olan bir proje secilmelidir.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setErrorMessage(null);

    const payload = {
      project_id: selectedProject.id,
      period_id: selectedProject.active_period.id,
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      radius_meters: Number(form.radius_meters),
      credit_deduction: Number(form.credit_deduction),
      application_quota: form.application_quota ? Number(form.application_quota) : null,
      start_at: form.start_at,
      end_at: form.end_at,
      status: form.status,
    };

    try {
      if (editingProgramId) {
        await api.put(`/panel/programs/${editingProgramId}`, payload);
        setMessage("Program guncellendi.");
      } else {
        await api.post("/panel/programs", payload);
        setMessage("Yeni program basariyla olusturuldu.");
      }

      setShowForm(false);
      setEditingProgramId(null);
      setForm(initialForm);
      await loadPrograms();
    } catch (error) {
      console.error("Program kaydedilemedi", error);
      setErrorMessage(apiErrorMessage(error, "Program kaydedilemedi. Alanlari ve yetkileri kontrol edin."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (programId: number) => {
    try {
      const response = await api.post<{ deducted_participant_count?: number }>(`/panel/programs/${programId}/complete`);
      const count = response.data.deducted_participant_count ?? 0;
      setPrograms((current) =>
        current.map((program) => (program.id === programId ? { ...program, status: "completed" } : program))
      );
      setMessage(`Program tamamlandi. ${count} aktif katilimciya kredi kesintisi uygulandi.`);
      await loadPrograms();
    } catch (error) {
      console.error("Program tamamlanamadi", error);
      setErrorMessage("Program tamamlanamadi.");
    }
  };

  const openAttendanceModal = async (program: Program) => {
    setAttendanceModalProgram(program);
    setAttendanceLoading(true);
    setAttendanceRecords([]);
    setAttendanceSummary(null);
    try {
      const response = await api.get<{
        summary?: AttendanceSummary;
        records?: AttendanceRecord[];
      }>(`/panel/programs/${program.id}/attendances`);
      setAttendanceSummary(response.data.summary ?? null);
      setAttendanceRecords(response.data.records ?? []);
    } catch (error) {
      console.error("Yoklama detaylari yuklenemedi", error);
      setErrorMessage("Yoklama detaylari yuklenemedi.");
    } finally {
      setAttendanceLoading(false);
    }
  };

  const updateManualAttendance = async (record: AttendanceRecord, isValid: boolean) => {
    if (!attendanceModalProgram || !record.participant_id) return;

    setAttendanceActionLoading(record.participant_id);
    setErrorMessage(null);

    try {
      await api.put(`/panel/programs/${attendanceModalProgram.id}/attendances/${record.participant_id}`, {
        is_valid: isValid,
        manual_note: isValid ? "Panel uzerinden manuel katilim onayi." : "Panel uzerinden manuel gelmedi isaretlendi.",
      });

      await openAttendanceModal(attendanceModalProgram);
      await loadPrograms();
    } catch (error) {
      console.error("Manuel yoklama guncellenemedi", error);
      setErrorMessage("Manuel yoklama guncellenemedi.");
    } finally {
      setAttendanceActionLoading(null);
    }
  };

  return (
    <PermissionGate
      permission="programs.view"
      fallback={
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-center text-sm text-amber-100">
          Programlari goruntuleme yetkiniz bulunmuyor.
        </div>
      }
    >
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent">
            <Calendar className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Program Yonetimi</h1>
            <p className="text-sm text-muted-foreground">
              Kendi projelerindeki oturumlari planla, guncelle, QR yoklamasi baslat ve tamamla.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <PermissionGate
            permission="programs.export"
            fallback={<span className="text-sm text-muted-foreground">Disa aktarma yetkiniz yok.</span>}
          >
          <ExportButtons
            endpoint="/panel/programs/export"
            filename="panel_programlar"
            params={{ project_id: selectedProjectId !== "all" ? selectedProjectId : undefined }}
            buttonLabel="Programlari Disa Aktar"
          />
          </PermissionGate>
          <PermissionGate permission="programs.create">
            <button
              onClick={showForm ? () => setShowForm(false) : openCreateForm}
              className="rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground"
            >
              {showForm ? "Formu Kapat" : "Yeni Program"}
            </button>
          </PermissionGate>
          <button
            onClick={() => void loadPrograms()}
            disabled={refreshing}
            className="rounded-xl border border-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-60"
          >
            {refreshing ? "Yenileniyor..." : "Listeyi Yenile"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={(event) => void handleSaveProgram(event)} className="glass-panel rounded-3xl p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              {editingProgramId ? <Pencil className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold">{editingProgramId ? "Programi Guncelle" : "Yeni Program Olustur"}</h2>
              <p className="text-sm text-muted-foreground">Secilen projenin aktif donemi otomatik kullanilir.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <select
              value={form.project_id}
              onChange={(event) => setForm((prev) => ({ ...prev, project_id: event.target.value }))}
              className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
              required
              disabled={!!editingProgramId}
            >
              <option value="">Proje secin</option>
              {(editingProgramId ? updatableProjects : creatableProjects).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} {project.active_period ? `- ${project.active_period.name}` : ""}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Program basligi"
              className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <input
              type="text"
              value={form.location}
              onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
              placeholder="Konum"
              className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              type="number"
              step="0.00000001"
              value={form.latitude}
              onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))}
              placeholder="Merkez enlem (opsiyonel)"
              className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              type="number"
              step="0.00000001"
              value={form.longitude}
              onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))}
              placeholder="Merkez boylam (opsiyonel)"
              className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              type="number"
              min={10}
              value={form.radius_meters}
              onChange={(event) => setForm((prev) => ({ ...prev, radius_meters: event.target.value }))}
              placeholder="Yoklama capi (metre)"
              className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <input
              type="datetime-local"
              value={form.start_at}
              onChange={(event) => setForm((prev) => ({ ...prev, start_at: event.target.value }))}
              className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <input
              type="datetime-local"
              value={form.end_at}
              onChange={(event) => setForm((prev) => ({ ...prev, end_at: event.target.value }))}
              className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <input
              type="number"
              min={0}
              value={form.credit_deduction}
              onChange={(event) => setForm((prev) => ({ ...prev, credit_deduction: event.target.value }))}
              placeholder="Kredi dusumu"
              className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <input
              type="number"
              min={1}
              value={form.application_quota}
              onChange={(event) => setForm((prev) => ({ ...prev, application_quota: event.target.value }))}
              placeholder="Basvuru kontenjani (opsiyonel)"
              className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <select
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ProgramFormState["status"] }))}
              className="rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="scheduled">Planlandi</option>
              <option value="active">Aktif</option>
              <option value="completed">Tamamlandi</option>
              <option value="cancelled">Iptal</option>
            </select>
          </div>

          <textarea
            rows={4}
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Program aciklamasi"
            className="mt-4 w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          />

          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {editingProgramId ? "Degisiklikleri Kaydet" : "Programi Kaydet"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingProgramId(null);
                setForm(initialForm);
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted"
            >
              <X className="h-4 w-4" />
              Vazgec
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr,240px]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Program, proje veya konum ara..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <select
          value={selectedProjectId}
          onChange={(event) => setSelectedProjectId(event.target.value)}
          className="rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="all">Tum projeler</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {message && <div className="rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">{message}</div>}
      {errorMessage && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorMessage}</div>}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="glass-panel rounded-3xl p-16 text-center text-muted-foreground">
          Secili filtrelerde program bulunamadi.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPrograms.map((program, index) => {
            const programStatus = normalizeStatus(program.status);
            const canCompleteThisProgram = programStatus !== "completed" && programStatus !== "cancelled";
            const canStartQrForProgram = programStatus === "scheduled" || programStatus === "active";

            return (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="glass-panel rounded-3xl p-6 transition-all hover:border-accent/40"
            >
              <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-accent">
                    <Calendar className="h-7 w-7" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold">{program.title}</h3>
                      <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
                        {program.project?.name ?? projectNameMap[program.project_id] ?? `Proje #${program.project_id}`}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClasses[programStatus]}`}>
                        {statusLabels[programStatus]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div>{new Date(program.start_at).toLocaleString("tr-TR")}</div>
                      {program.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {program.location}
                        </div>
                      )}
                      {program.period?.name ? <div>{program.period.name}</div> : null}
                      {canViewAttendanceStats ? <div>Yoklama: {program.attendance_count ?? 0}</div> : null}
                      {canViewAttendanceStats ? <div>Degerlendirme: {program.feedback_count ?? 0}</div> : null}
                      {program.application_quota ? <div>Basvuru kontenjani: {program.application_quota}</div> : null}
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
                  {canViewAttendanceStats && canAccessProject("programs.attendance.view", program.project_id) ? (
                    <button
                      onClick={() => void openAttendanceModal(program)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted"
                    >
                      Yoklama Detayi
                    </button>
                  ) : null}
                  {canUpdatePrograms && canAccessProject("programs.update", program.project_id) ? (
                    <button
                      onClick={() => openEditForm(program)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted"
                    >
                      <Pencil className="h-4 w-4" />
                      Duzenle
                    </button>
                  ) : null}
                  {canCompletePrograms && canCompleteThisProgram && canAccessProject("programs.complete", program.project_id) ? (
                    <button
                      onClick={() => void handleComplete(program.id)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <SquareCheckBig className="h-4 w-4" />
                      Tamamla
                    </button>
                  ) : null}
                  {canManageQr && canStartQrForProgram && canAccessProject("programs.qr.manage", program.project_id) ? (
                    <Link
                      href={`/panel/programs/${program.id}/qr?title=${encodeURIComponent(program.title)}`}
                      className="flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:scale-[1.02]"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      QR Yoklama Baslat
                    </Link>
                  ) : null}
                </div>
              </div>
            </motion.div>
            );
          })}
        </div>
      )}
      {attendanceModalProgram ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-6xl rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">Yoklama Detaylari</h2>
                <p className="mt-1 text-sm text-muted-foreground">{attendanceModalProgram.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setAttendanceModalProgram(null)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Katilimci: {attendanceSummary?.participant_count ?? attendanceRecords.length} - Gelen:{" "}
                {attendanceSummary?.attendance_count ?? 0} - Gelmeyen: {attendanceSummary?.absent_count ?? 0} - Geri bildirim:{" "}
                {attendanceSummary?.feedback_count ?? 0} - Kredi iade: {attendanceSummary?.restore_count ?? 0}
              </div>
              <PermissionGate permission="programs.attendance.export">
                <ExportButtons
                  endpoint={`/panel/programs/${attendanceModalProgram.id}/attendances/export`}
                  filename={`program_${attendanceModalProgram.id}_yoklama`}
                  buttonLabel="Yoklamayi Disa Aktar"
                />
              </PermissionGate>
            </div>

            <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm text-muted-foreground">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-widest text-slate-900">
                  <tr>
                    <th className="px-4 py-3">Ogrenci</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">Yontem</th>
                    <th className="px-4 py-3">Kredi</th>
                    <th className="px-4 py-3">Geri Bildirim</th>
                    <th className="px-4 py-3">Zaman</th>
                    {canManageAttendance && canAccessProject("programs.attendance.manage", attendanceModalProgram.project_id) ? (
                      <th className="px-4 py-3 text-right">Islem</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceLoading ? (
                    <tr>
                      <td colSpan={canManageAttendance ? 7 : 6} className="px-4 py-10 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
                      </td>
                    </tr>
                  ) : attendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={canManageAttendance ? 7 : 6} className="px-4 py-10 text-center text-muted-foreground">
                        Kayit bulunamadi.
                      </td>
                    </tr>
                  ) : (
                    attendanceRecords.map((record) => (
                      <tr key={record.id ?? record.participant_id ?? record.email ?? record.student}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{record.student}</div>
                          <div className="text-xs text-muted-foreground">{record.email ?? "-"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                            record.is_valid ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                          }`}>
                            {record.is_valid ? "Geldi" : "Gelmedi"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{record.method ?? "-"}</td>
                        <td className="px-4 py-3">
                          {record.credit_restored ? "Iade edildi" : record.credit_deducted ? "Kesildi" : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {record.feedback_submitted ? "Gonderdi" : record.is_valid ? "Bekliyor" : "Hak yok"}
                        </td>
                        <td className="px-4 py-3">{record.recorded_at ? new Date(record.recorded_at).toLocaleString("tr-TR") : "-"}</td>
                        {canManageAttendance && canAccessProject("programs.attendance.manage", attendanceModalProgram.project_id) ? (
                          <td className="px-4 py-3 text-right">
                            {record.participant_id ? (
                              <button
                                type="button"
                                onClick={() => void updateManualAttendance(record, !record.is_valid)}
                                disabled={attendanceActionLoading === record.participant_id}
                                className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                                  record.is_valid
                                    ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              >
                                {attendanceActionLoading === record.participant_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : record.is_valid ? (
                                  "Gelmedi Yap"
                                ) : (
                                  "Katildi Yap"
                                )}
                              </button>
                            ) : (
                              "-"
                            )}
                          </td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </PermissionGate>
  );
}
