"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArchiveRestore, Calendar, CheckCircle2, FileStack, Loader2, PencilLine, Plus, RotateCcw, Save } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

interface Project {
  id: number;
  name: string;
}

interface PeriodItem {
  id: number;
  project_id: number;
  name: string;
  start_date: string;
  end_date: string;
  credit_start_amount: number;
  credit_threshold: number;
  status: "active" | "passive" | "completed";
  project?: {
    id: number;
    name: string;
  } | null;
}

interface PeriodFormState {
  project_id: string;
  name: string;
  start_date: string;
  end_date: string;
  credit_start_amount: string;
  credit_threshold: string;
  status: "active" | "passive" | "completed";
}

interface ClosureSummary {
  summary: {
    participants: { total: number; active: number; completed: number; graduated: number; not_completed: number };
    applications: { total: number; pending: number; interview_planned: number; waitlisted: number; accepted: number; rejected: number };
    programs: { total: number; open: number; completed: number; cancelled: number };
    assignments: { total: number; open: number };
    certificates: { total: number };
    materials: { digital_bohca: number; volunteer_opportunities: number; kademe_modules: number };
    kpd: { appointments: number; reports: number };
    financials: { total: number; pending: number; approved: number; paid: number };
    credit_snapshot: {
      start_amount: number;
      threshold: number;
      participant_count: number;
      total_credit: number;
      average_credit: number;
      min_credit: number;
      max_credit: number;
      below_threshold_count: number;
      zero_or_below_count: number;
      participants: Array<{
        participant_id: number;
        student: string;
        email?: string | null;
        status?: string | null;
        graduation_status?: string | null;
        credit: number;
        threshold: number;
        risk_gap: number;
        below_threshold: boolean;
      }>;
    };
  };
  warnings: {
    open_programs: number;
    pending_applications: number;
    pending_financials: number;
  };
}

const initialForm: PeriodFormState = {
  project_id: "",
  name: "",
  start_date: "",
  end_date: "",
  credit_start_amount: "100",
  credit_threshold: "75",
  status: "active",
};

export default function AdminPeriodsPage() {
  const { canAccessProject, hasPermission } = usePermissions();
  const [projects, setProjects] = useState<Project[]>([]);
  const [periods, setPeriods] = useState<PeriodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [form, setForm] = useState<PeriodFormState>(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summaryPeriodId, setSummaryPeriodId] = useState<number | null>(null);
  const [closureSummary, setClosureSummary] = useState<ClosureSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [periodActionId, setPeriodActionId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [projectResponse, periodResponse] = await Promise.all([
        Promise.all([
          hasPermission("periods.view")
            ? api.get<{ projects: Project[] }>("/panel/projects/manageable", { params: { permission: "periods.view" } })
            : Promise.resolve({ data: { projects: [] as Project[] } }),
          hasPermission("periods.create")
            ? api.get<{ projects: Project[] }>("/panel/projects/manageable", { params: { permission: "periods.create" } })
            : Promise.resolve({ data: { projects: [] as Project[] } }),
          hasPermission("periods.update")
            ? api.get<{ projects: Project[] }>("/panel/projects/manageable", { params: { permission: "periods.update" } })
            : Promise.resolve({ data: { projects: [] as Project[] } }),
        ]),
        api.get<{ periods: PeriodItem[] }>("/panel/periods"),
      ]);

      const mergedProjects = new Map<number, Project>();
      projectResponse.forEach((response) => {
        (response.data.projects ?? []).forEach((project) => mergedProjects.set(project.id, project));
      });
      setProjects(Array.from(mergedProjects.values()));
      setPeriods(periodResponse.data.periods ?? []);
    } catch (error) {
      console.error("Donem verileri yuklenemedi", error);
      setErrorMessage("Donem verileri yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [hasPermission]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadData]);

  const projectsInScope = useMemo(
    () => projects.filter((project) => canAccessProject("periods.view", project.id)),
    [projects, canAccessProject]
  );

  const formProjectsInScope = useMemo(
    () => projects.filter((project) => canAccessProject(editingPeriodId ? "periods.update" : "periods.create", project.id)),
    [projects, canAccessProject, editingPeriodId]
  );

  const canSubmitPeriod = () => {
    const pid = Number(form.project_id);
    if (!pid) return false;
    if (editingPeriodId) {
      return canAccessProject("periods.update", pid);
    }
    return canAccessProject("periods.create", pid);
  };

  const filteredPeriods = useMemo(() => {
    return periods
      .filter((period) => canAccessProject("periods.view", period.project_id))
      .filter((period) => selectedProjectId === "all" || String(period.project_id) === selectedProjectId);
  }, [periods, selectedProjectId, canAccessProject]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setErrorMessage(null);

    const payload = {
      project_id: Number(form.project_id),
      name: form.name,
      start_date: form.start_date,
      end_date: form.end_date,
      credit_start_amount: Number(form.credit_start_amount),
      credit_threshold: Number(form.credit_threshold),
      status: form.status,
    };

    try {
      if (editingPeriodId) {
        await api.put(`/panel/periods/${editingPeriodId}`, {
          name: payload.name,
          start_date: payload.start_date,
          end_date: payload.end_date,
          credit_start_amount: payload.credit_start_amount,
          credit_threshold: payload.credit_threshold,
          status: payload.status,
        });
        setMessage("Donem guncellendi.");
      } else {
        await api.post("/panel/periods", payload);
        setMessage("Donem olusturuldu.");
      }

      setForm(initialForm);
      setEditingPeriodId(null);
      await loadData();
    } catch (error) {
      console.error("Donem kaydedilemedi", error);
      setErrorMessage("Donem kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (period: PeriodItem) => {
    setEditingPeriodId(period.id);
    setForm({
      project_id: String(period.project_id),
      name: period.name,
      start_date: period.start_date,
      end_date: period.end_date,
      credit_start_amount: String(period.credit_start_amount),
      credit_threshold: String(period.credit_threshold),
      status: period.status,
    });
    setMessage(null);
    setErrorMessage(null);
  };

  const loadClosureSummary = async (periodId: number) => {
    if (summaryPeriodId === periodId && closureSummary) {
      setSummaryPeriodId(null);
      setClosureSummary(null);
      return;
    }

    setSummaryLoading(true);
    setSummaryPeriodId(periodId);
    setClosureSummary(null);
    setErrorMessage(null);

    try {
      const response = await api.get<ClosureSummary>(`/panel/periods/${periodId}/closure-summary`);
      setClosureSummary(response.data);
    } catch (error) {
      console.error("Donem kapanis ozeti alinamadi", error);
      setErrorMessage("Donem kapanis ozeti alinamadi.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const completePeriod = async (period: PeriodItem) => {
    if (!confirm(`${period.name} donemini tamamlandi olarak arsivlemek istiyor musunuz?`)) return;

    setPeriodActionId(period.id);
    setMessage(null);
    setErrorMessage(null);

    try {
      await api.post(`/panel/periods/${period.id}/complete`);
      setMessage("Donem tamamlandi ve gecmis donem olarak arsivlendi.");
      setSummaryPeriodId(null);
      setClosureSummary(null);
      await loadData();
    } catch (error) {
      console.error("Donem tamamlanamadi", error);
      setErrorMessage("Donem tamamlanamadi.");
    } finally {
      setPeriodActionId(null);
    }
  };

  const reopenPeriod = async (period: PeriodItem, status: "active" | "passive" = "passive") => {
    const label = status === "active" ? "aktif" : "pasif";
    if (!confirm(`${period.name} donemini yeniden ${label} yapmak istiyor musunuz?`)) return;

    setPeriodActionId(period.id);
    setMessage(null);
    setErrorMessage(null);

    try {
      await api.post(`/panel/periods/${period.id}/reopen`, { status });
      setMessage(status === "active" ? "Donem yeniden aktif edildi." : "Donem yeniden pasife alindi.");
      setSummaryPeriodId(null);
      setClosureSummary(null);
      await loadData();
    } catch (error) {
      console.error("Donem yeniden acilamadi", error);
      setErrorMessage("Donem yeniden acilamadi.");
    } finally {
      setPeriodActionId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
            <FileStack className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Donem Yonetimi</h1>
            <p className="text-sm text-muted-foreground">Projelere bagli donemleri, kredi esiklerini ve basvuru formlarini buradan yonetin.</p>
          </div>
        </div>
        <PermissionGate permission="periods.export">
          <ExportButtons
            endpoint="/panel/periods/export"
            filename="donemler"
            params={{ project_id: selectedProjectId !== "all" ? selectedProjectId : undefined }}
            buttonLabel="Donemleri Disa Aktar"
          />
        </PermissionGate>
      </div>

      {message ? <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-200">{message}</div> : null}
      {errorMessage ? <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">{errorMessage}</div> : null}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={(event) => void handleSubmit(event)} className="glass-panel rounded-3xl p-8">
          <div className="mb-6 flex items-center gap-3">
            {editingPeriodId ? <PencilLine className="h-5 w-5 text-indigo-400" /> : <Plus className="h-5 w-5 text-indigo-400" />}
            <h2 className="text-lg font-bold text-slate-900">{editingPeriodId ? "Donem Duzenle" : "Yeni Donem Olustur"}</h2>
          </div>

          <div className="space-y-4">
            <select
              value={form.project_id}
              onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))}
              disabled={editingPeriodId !== null}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900 disabled:opacity-70"
              required
            >
              <option value="">Proje secin</option>
              {formProjectsInScope.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="2026 Bahar Donemi" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" required />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input type="date" value={form.start_date} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" required />
              <input type="date" value={form.end_date} onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" required />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <input type="number" min="0" value={form.credit_start_amount} onChange={(event) => setForm((current) => ({ ...current, credit_start_amount: event.target.value }))} placeholder="Baslangic kredi" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" required />
              <input type="number" min="0" value={form.credit_threshold} onChange={(event) => setForm((current) => ({ ...current, credit_threshold: event.target.value }))} placeholder="Uyari esigi" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900" required />
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PeriodFormState["status"] }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-900">
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
                <option value="completed">Tamamlandi</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || !canSubmitPeriod()}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingPeriodId ? "Donemi Kaydet" : "Donem Olustur"}
            </button>
            {editingPeriodId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingPeriodId(null);
                  setForm(initialForm);
                }}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-900"
              >
                Vazgec
              </button>
            ) : null}
          </div>
        </form>

        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Donem Listesi</h2>
                <p className="text-sm text-muted-foreground">Projeye bagli tum donemler ve aktif kredi kurallari</p>
              </div>
              <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900">
                <option value="all">Tum projeler</option>
                {projectsInScope.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : filteredPeriods.length === 0 ? (
            <div className="glass-panel rounded-3xl p-16 text-center text-muted-foreground">Bu kapsamda donem bulunamadi.</div>
          ) : (
            <div className="space-y-4">
              {filteredPeriods.map((period) => (
                <div key={period.id} className="glass-panel rounded-3xl p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${period.status === "active" ? "bg-green-500/10 text-green-400" : period.status === "completed" ? "bg-indigo-500/10 text-indigo-300" : "bg-white/10 text-muted-foreground"}`}>
                          {period.status}
                        </span>
                        <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {period.project?.name || `Proje #${period.project_id}`}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{period.name}</h3>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="inline-flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-indigo-400" />
                          {new Date(period.start_date).toLocaleDateString("tr-TR")} - {new Date(period.end_date).toLocaleDateString("tr-TR")}
                        </div>
                        <div>Baslangic kredi: {period.credit_start_amount}</div>
                        <div>Esik: {period.credit_threshold}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void loadClosureSummary(period.id)}
                        disabled={!canAccessProject("periods.view", period.project_id) || summaryLoading}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {summaryLoading && summaryPeriodId === period.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
                        Kapanis Ozeti
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(period)}
                        disabled={!canAccessProject("periods.update", period.project_id)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Duzenle
                      </button>
                      {canAccessProject("projects.application_form.update", period.project_id) ? (
                        <Link
                          href={`/panel/periods/form-builder?project_id=${period.project_id}&period_id=${period.id}`}
                          className="rounded-2xl border border-indigo-500/20 bg-indigo-600/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-indigo-300"
                        >
                          Basvuru Formu
                        </Link>
                      ) : (
                        <span className="cursor-not-allowed rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-50">
                          Basvuru Formu
                        </span>
                      )}
                      {period.status !== "completed" ? (
                        <button
                          type="button"
                          onClick={() => void completePeriod(period)}
                          disabled={!canAccessProject("periods.update", period.project_id) || periodActionId === period.id}
                          className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-600/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {periodActionId === period.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          Tamamla
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void reopenPeriod(period, "passive")}
                          disabled={!canAccessProject("periods.update", period.project_id) || periodActionId === period.id}
                          className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {periodActionId === period.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                          Yeniden Ac
                        </button>
                      )}
                    </div>
                  </div>

                  {summaryPeriodId === period.id ? (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
                      {summaryLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Kapanis ozeti hazirlaniyor...
                        </div>
                      ) : closureSummary ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <div className="rounded-2xl bg-white/5 p-4">
                              <p className="text-xs text-muted-foreground">Katilimci</p>
                              <p className="mt-1 text-2xl font-bold text-slate-900">{closureSummary.summary.participants.total}</p>
                              <p className="text-xs text-muted-foreground">aktif {closureSummary.summary.participants.active}</p>
                            </div>
                            <div className="rounded-2xl bg-white/5 p-4">
                              <p className="text-xs text-muted-foreground">Program</p>
                              <p className="mt-1 text-2xl font-bold text-slate-900">{closureSummary.summary.programs.total}</p>
                              <p className="text-xs text-muted-foreground">acik {closureSummary.summary.programs.open}</p>
                            </div>
                            <div className="rounded-2xl bg-white/5 p-4">
                              <p className="text-xs text-muted-foreground">Basvuru</p>
                              <p className="mt-1 text-2xl font-bold text-slate-900">{closureSummary.summary.applications.total}</p>
                              <p className="text-xs text-muted-foreground">bekleyen {closureSummary.warnings.pending_applications}</p>
                            </div>
                            <div className="rounded-2xl bg-white/5 p-4">
                              <p className="text-xs text-muted-foreground">Sertifika</p>
                              <p className="mt-1 text-2xl font-bold text-slate-900">{closureSummary.summary.certificates.total}</p>
                              <p className="text-xs text-muted-foreground">arsiv kaydi</p>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-indigo-300">Kredi Snapshot</p>
                                <p className="mt-1 text-sm text-muted-foreground">Kapanis aninda arsize giren kredi fotografi</p>
                              </div>
                              <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-900">
                                Esik {closureSummary.summary.credit_snapshot.threshold}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                              <SnapshotMetric label="Ortalama" value={closureSummary.summary.credit_snapshot.average_credit} />
                              <SnapshotMetric label="Min" value={closureSummary.summary.credit_snapshot.min_credit} />
                              <SnapshotMetric label="Max" value={closureSummary.summary.credit_snapshot.max_credit} />
                              <SnapshotMetric label="Esik alti" value={closureSummary.summary.credit_snapshot.below_threshold_count} tone="amber" />
                              <SnapshotMetric label="Toplam" value={closureSummary.summary.credit_snapshot.total_credit} />
                            </div>
                            {closureSummary.summary.credit_snapshot.participants.filter((participant) => participant.below_threshold).length > 0 ? (
                              <div className="mt-4 grid gap-2 md:grid-cols-2">
                                {closureSummary.summary.credit_snapshot.participants
                                  .filter((participant) => participant.below_threshold)
                                  .slice(0, 4)
                                  .map((participant) => (
                                    <div key={participant.participant_id} className="rounded-2xl bg-white/10 p-3 text-sm">
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="truncate font-bold text-slate-900">{participant.student}</p>
                                          <p className="truncate text-xs text-muted-foreground">{participant.email ?? "E-posta yok"}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-black text-amber-300">{participant.credit}</p>
                                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">-{participant.risk_gap}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : null}
                          </div>

                          <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground md:grid-cols-2">
                            <div className="rounded-2xl bg-white/5 p-4">
                              Odev: {closureSummary.summary.assignments.total} / acik {closureSummary.summary.assignments.open}
                              <br />
                              Dijital bohca: {closureSummary.summary.materials.digital_bohca}
                              <br />
                              Gonullu firsati: {closureSummary.summary.materials.volunteer_opportunities}
                            </div>
                            <div className="rounded-2xl bg-white/5 p-4">
                              KPD randevu: {closureSummary.summary.kpd.appointments}
                              <br />
                              KPD rapor: {closureSummary.summary.kpd.reports}
                              <br />
                              Finans bekleyen: {closureSummary.summary.financials.pending}
                            </div>
                          </div>

                          {closureSummary.warnings.open_programs || closureSummary.warnings.pending_applications || closureSummary.warnings.pending_financials ? (
                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                              Kapanis oncesi dikkat: {closureSummary.warnings.open_programs} acik program, {closureSummary.warnings.pending_applications} bekleyen basvuru, {closureSummary.warnings.pending_financials} bekleyen finans kaydi var. Sistem kapatmaya izin verir; bu uyari operasyonel kontroldur.
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                              Bu donemde kapanis icin kritik bekleyen is gorunmuyor.
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
type SnapshotMetricTone = "slate" | "amber";

function SnapshotMetric({ label, value, tone = "slate" }: { label: string; value: number | string; tone?: SnapshotMetricTone }) {
  const toneClass: Record<SnapshotMetricTone, string> = {
    slate: "text-slate-900",
    amber: "text-amber-300",
  };

  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className={`text-xl font-black ${toneClass[tone]}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
