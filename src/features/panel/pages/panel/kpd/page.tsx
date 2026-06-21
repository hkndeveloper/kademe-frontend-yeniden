"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import { CalendarDays, Download, HeartPulse, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import type { PeriodOption } from "@/components/shared/ProjectPeriodFilters";
import { downloadBlobResponse } from "@/lib/download";

type Paginated<T> = {
  data: T[];
  last_page?: number;
};

type UserOption = {
  id: number;
  name: string;
  surname: string;
  email?: string | null;
  role?: string | null;
  periods?: PeriodOption[];
};

type KpdReport = {
  id: number;
  user_id: number;
  period_id?: number | null;
  counselor_id?: number | null;
  title: string;
  download_url?: string | null;
  created_at?: string | null;
  user?: UserOption | null;
  period?: PeriodOption | null;
  counselor?: UserOption | null;
};

type KpdAppointment = {
  id: number;
  status: string;
  period_id?: number | null;
  start_at: string;
  end_at: string;
  counselor?: UserOption | null;
  counselee?: UserOption | null;
  period?: PeriodOption | null;
  room?: RoomOption | null;
};

type RoomOption = {
  id: number;
  name: string;
  description?: string | null;
};

type AppointmentsResponse = {
  appointments: Paginated<KpdAppointment>;
  counselees?: UserOption[];
  counselors?: UserOption[];
  rooms?: RoomOption[];
};

type KpdOptionsResponse = {
  counselees: UserOption[];
  counselors?: UserOption[];
  rooms?: RoomOption[];
};

const initialAppointmentForm = {
  counselor_id: "",
  counselee_id: "",
  period_id: "",
  room_id: "",
  start_at: "",
  end_at: "",
  notes: "",
};

export default function PanelKpdPage() {
  const { hasKpdAccess } = usePermissions();
  const canViewReports = hasKpdAccess("kpd.reports.view");
  const canCreateReports = hasKpdAccess("kpd.reports.create");
  const canDeleteReports = hasKpdAccess("kpd.reports.delete");
  const canViewAppointments = hasKpdAccess("kpd.appointments.view");
  const canManageAppointments = hasKpdAccess("kpd.appointments.manage");

  const [reports, setReports] = useState<KpdReport[]>([]);
  const [appointments, setAppointments] = useState<KpdAppointment[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [counselees, setCounselees] = useState<UserOption[]>([]);
  const [counselors, setCounselors] = useState<UserOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [roomSchedule, setRoomSchedule] = useState<KpdRoomSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({ user_id: "", period_id: "", title: "" });
  const [appointmentForm, setAppointmentForm] = useState(initialAppointmentForm);
  const [periodFilter, setPeriodFilter] = useState("all");
  const [file, setFile] = useState<File | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setFeedback(null);

    try {
      const requests = [
        canViewReports
          ? api.get<{ reports: Paginated<KpdReport> }>("/panel/kpd/reports", {
              params: { period_id: periodFilter !== "all" ? periodFilter : undefined },
            })
          : Promise.resolve({ data: { reports: { data: [] as KpdReport[] } } }),
        canViewAppointments || canManageAppointments
          ? api.get<AppointmentsResponse>("/panel/kpd/appointments", {
              params: { period_id: periodFilter !== "all" ? periodFilter : undefined },
            })
          : Promise.resolve({ data: { appointments: { data: [] as KpdAppointment[] }, counselees: [], counselors: [], rooms: [] } satisfies AppointmentsResponse }),
        canCreateReports
          ? api.get<KpdOptionsResponse>("/panel/kpd/options", { params: { permission: "kpd.reports.create" } })
          : Promise.resolve({ data: { counselees: [] as UserOption[] } }),
      ] as const;

      const [reportsResponse, appointmentsResponse, optionsResponse] = await Promise.all(requests);
      setReports(reportsResponse.data.reports?.data ?? []);
      setAppointments(appointmentsResponse.data.appointments?.data ?? []);
      setCounselees(appointmentsResponse.data.counselees ?? []);
      setCounselors(appointmentsResponse.data.counselors ?? []);
      setRooms(appointmentsResponse.data.rooms ?? []);
      setRoomSchedule(appointmentsResponse.data.room_schedule ?? []);
      setUsers(optionsResponse.data.counselees ?? []);
    } catch (error) {
      console.error("KPD verileri yuklenemedi", error);
      setFeedback("KPD verileri yuklenirken bir sorun olustu.");
    } finally {
      setLoading(false);
    }
  }, [canCreateReports, canManageAppointments, canViewAppointments, canViewReports, periodFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const periodOptions = useMemo(() => {
    const periods = new Map<number, PeriodOption>();
    [...users, ...counselees].forEach((user) => {
      (user.periods ?? []).forEach((period) => periods.set(period.id, period));
    });
    reports.forEach((report) => {
      if (report.period) periods.set(report.period.id, report.period);
    });
    appointments.forEach((appointment) => {
      if (appointment.period) periods.set(appointment.period.id, appointment.period);
    });
    return Array.from(periods.values()).sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (b.status === "active" && a.status !== "active") return 1;
      return String(b.start_date ?? "").localeCompare(String(a.start_date ?? ""));
    });
  }, [appointments, counselees, reports, users]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !form.user_id || !form.title.trim()) return;

    setSaving(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("user_id", form.user_id);
      if (form.period_id) formData.append("period_id", form.period_id);
      formData.append("title", form.title.trim());
      formData.append("file", file);

      const response = await api.post<{ message: string; report: KpdReport }>("/panel/kpd/reports", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setReports((current) => [response.data.report, ...current]);
      setFeedback(response.data.message);
      setForm({ user_id: "", period_id: "", title: "" });
      setFile(null);
    } catch (error) {
      const message = isAxiosError(error)
        ? String((error.response?.data as { message?: string })?.message ?? "KPD raporu yuklenemedi.")
        : "KPD raporu yuklenemedi.";
      setFeedback(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload(report: KpdReport) {
    const endpoint = report.download_url ?? `/panel/kpd/reports/${report.id}/download`;

    try {
      const response = await api.get(endpoint, { responseType: "blob" });
      await downloadBlobResponse(response.data, response.headers, `kpd_raporu_${report.id}`);
    } catch (error) {
      console.error("KPD raporu indirilemedi", error);
      setFeedback("KPD raporu indirilemedi.");
    }
  }

  async function handleDelete(report: KpdReport) {
    if (!confirm("KPD raporunu silmek istediginize emin misiniz?")) return;

    try {
      await api.delete(`/panel/kpd/reports/${report.id}`);
      setReports((current) => current.filter((item) => item.id !== report.id));
      setFeedback("KPD raporu silindi.");
    } catch (error) {
      console.error("KPD raporu silinemedi", error);
      setFeedback("KPD raporu silinemedi.");
    }
  }

  async function handleCreateAppointment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAppointment(true);
    setFeedback(null);

    try {
      const response = await api.post<{ message: string; appointment: KpdAppointment }>("/panel/kpd/appointments", {
        counselor_id: Number(appointmentForm.counselor_id),
        counselee_id: Number(appointmentForm.counselee_id),
        period_id: appointmentForm.period_id ? Number(appointmentForm.period_id) : null,
        room_id: Number(appointmentForm.room_id),
        start_at: appointmentForm.start_at,
        end_at: appointmentForm.end_at,
        notes: appointmentForm.notes.trim() || null,
      });

      setAppointments((current) => [response.data.appointment, ...current]);
      setAppointmentForm(initialAppointmentForm);
      setFeedback(response.data.message);
    } catch (error) {
      const message = isAxiosError(error)
        ? String((error.response?.data as { message?: string })?.message ?? "KPD randevusu olusturulamadi.")
        : "KPD randevusu olusturulamadi.";
      setFeedback(message);
    } finally {
      setSavingAppointment(false);
    }
  }

  async function handleUpdateAppointmentStatus(appointmentId: number, status: string) {
    setUpdatingAppointmentId(appointmentId);
    setFeedback(null);

    try {
      const response = await api.put<{ message: string; appointment: KpdAppointment }>(`/panel/kpd/appointments/${appointmentId}/status`, {
        status,
      });

      setAppointments((current) => current.map((item) => (item.id === appointmentId ? response.data.appointment : item)));
      setFeedback(response.data.message);
    } catch (error) {
      const message = isAxiosError(error)
        ? String((error.response?.data as { message?: string })?.message ?? "Randevu durumu guncellenemedi.")
        : "Randevu durumu guncellenemedi.";
      setFeedback(message);
    } finally {
      setUpdatingAppointmentId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600/15 text-rose-600">
            <HeartPulse className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">KPD Yonetimi</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Randevu ve rapor dosyalarini tek panelden yonet
            </p>
          </div>
        </div>
      </div>

      {feedback ? <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700">{feedback}</div> : null}

      {!canViewReports && !canViewAppointments && !canManageAppointments ? (
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6 text-sm text-amber-800">
          KPD ekrani icin ilgili randevu veya rapor action yetkisi gerekir. Scope proje kapsamliysa backend yalnizca erisilebilir KPD projesindeki danisanlari getirir.
        </div>
      ) : null}

      {(canViewReports || canViewAppointments) && periodOptions.length > 0 ? (
        <div className="glass-panel rounded-3xl p-5">
          <label className="block max-w-md">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Liste donemi</span>
            <select
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-rose-400"
            >
              <option value="all">Tum donemler</option>
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}{period.status === "active" ? " (aktif)" : period.status === "completed" ? " (gecmis)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <PermissionGate permission="kpd.appointments.manage">
        {canManageAppointments ? (
          <form onSubmit={handleCreateAppointment} className="glass-panel rounded-3xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <Plus className="h-5 w-5 text-rose-600" />
              <div>
                <h2 className="text-xl font-black text-slate-900">Randevu Olustur</h2>
                <p className="mt-1 text-sm text-muted-foreground">Scope kapsamindaki KPD danisanlari icin danisman, oda ve zaman sec.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <select
                value={appointmentForm.counselee_id}
                onChange={(event) => {
                  const user = counselees.find((item) => String(item.id) === event.target.value);
                  const active = user?.periods?.find((period) => period.status === "active") ?? user?.periods?.[0];
                  setAppointmentForm((current) => ({ ...current, counselee_id: event.target.value, period_id: active?.id ? String(active.id) : "" }));
                }}
                required
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              >
                <option value="">Danisan sec</option>
                {counselees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} {user.surname} {user.email ? `(${user.email})` : ""}
                  </option>
                ))}
              </select>

              <select
                value={appointmentForm.period_id}
                onChange={(event) => setAppointmentForm((current) => ({ ...current, period_id: event.target.value }))}
                disabled={!appointmentForm.counselee_id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              >
                <option value="">Donem secmeden</option>
                {(counselees.find((user) => String(user.id) === appointmentForm.counselee_id)?.periods ?? []).map((period) => (
                  <option key={period.id} value={period.id}>{period.name}</option>
                ))}
              </select>

              <select
                value={appointmentForm.counselor_id}
                onChange={(event) => setAppointmentForm((current) => ({ ...current, counselor_id: event.target.value }))}
                required
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              >
                <option value="">Danisman sec</option>
                {counselors.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} {user.surname} {user.role ? `(${user.role})` : ""}
                  </option>
                ))}
              </select>

              <select
                value={appointmentForm.room_id}
                onChange={(event) => setAppointmentForm((current) => ({ ...current, room_id: event.target.value }))}
                required
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              >
                <option value="">Oda sec</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>

              <input
                type="datetime-local"
                value={appointmentForm.start_at}
                onChange={(event) => setAppointmentForm((current) => ({ ...current, start_at: event.target.value }))}
                required
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              />
              <input
                type="datetime-local"
                value={appointmentForm.end_at}
                onChange={(event) => setAppointmentForm((current) => ({ ...current, end_at: event.target.value }))}
                required
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              />
              <input
                value={appointmentForm.notes}
                onChange={(event) => setAppointmentForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Not"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {counselees.length} danisan, {counselors.length} danisman ve {rooms.length} oda listeleniyor.
              </p>
              <button
                disabled={savingAppointment || counselees.length === 0 || counselors.length === 0 || rooms.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {savingAppointment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Randevu Olustur
              </button>
            </div>
          </form>
        ) : null}
      </PermissionGate>

      <PermissionGate permission="kpd.reports.create">
        {canCreateReports ? (
          <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <Plus className="h-5 w-5 text-rose-600" />
              <h2 className="text-xl font-black text-slate-900">Rapor Yukle</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
              <select
                value={form.user_id}
                onChange={(event) => {
                  const user = users.find((item) => String(item.id) === event.target.value);
                  const active = user?.periods?.find((period) => period.status === "active") ?? user?.periods?.[0];
                  setForm((current) => ({ ...current, user_id: event.target.value, period_id: active?.id ? String(active.id) : "" }));
                }}
                required
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              >
                <option value="">Danisan sec</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} {user.surname} {user.email ? `(${user.email})` : ""}
                  </option>
                ))}
              </select>
              <select
                value={form.period_id}
                onChange={(event) => setForm((current) => ({ ...current, period_id: event.target.value }))}
                disabled={!form.user_id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              >
                <option value="">Donem secmeden</option>
                {(users.find((user) => String(user.id) === form.user_id)?.periods ?? []).map((period) => (
                  <option key={period.id} value={period.id}>{period.name}</option>
                ))}
              </select>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
                placeholder="Rapor basligi"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              />
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900">
                <Upload className="h-4 w-4" />
                {file ? file.name : "Dosya sec"}
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                disabled={saving || users.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Raporu Yukle
              </button>
            </div>
          </form>
        ) : null}
      </PermissionGate>

      <PermissionGate permission="kpd.reports.view">
        {canViewReports ? (
          <div className="glass-panel overflow-hidden rounded-3xl">
            <div className="border-b border-slate-200/70 p-6">
              <h2 className="text-xl font-black text-slate-900">KPD Raporlari</h2>
              <p className="mt-1 text-sm text-muted-foreground">Ogrenciler icin yuklenen raporlar R2 uzerinden indirilir.</p>
            </div>
            {loading ? (
              <div className="flex min-h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
              </div>
            ) : (
              <div className="divide-y divide-slate-200/70">
                {reports.map((report) => (
                  <div key={report.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-base font-bold text-slate-900">{report.title}</div>
                      <div className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {report.user ? `${report.user.name} ${report.user.surname}` : `Kullanici #${report.user_id}`}
                        {report.period?.name ? ` / ${report.period.name}` : ""}
                        {report.created_at ? ` / ${new Date(report.created_at).toLocaleDateString("tr-TR")}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDownload(report)}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700"
                      >
                        <Download className="h-4 w-4" />
                        Indir
                      </button>
                      {canDeleteReports ? (
                        <button
                          type="button"
                          onClick={() => void handleDelete(report)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Sil
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {reports.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">KPD raporu bulunamadi.</div> : null}
              </div>
            )}
          </div>
        ) : null}
      </PermissionGate>
      <PermissionGate permission="kpd.appointments.view">
        {canViewAppointments ? (
          <div className="glass-panel overflow-hidden rounded-3xl">
            <div className="border-b border-slate-200/70 p-6">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-rose-600" />
                <div>
                  <h2 className="text-xl font-black text-slate-900">Oda Takvimi</h2>
                  <p className="mt-1 text-sm text-muted-foreground">KPD odalarina gore yaklasan ve secili donem randevulari.</p>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="flex min-h-32 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
              </div>
            ) : roomSchedule.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Oda takvimi icin veri bulunamadi.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-2">
                {roomSchedule.map((room) => (
                  <div key={room.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900">{room.name}</h3>
                        {room.description ? <p className="mt-1 text-xs text-muted-foreground">{room.description}</p> : null}
                      </div>
                      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">{room.appointment_count} kayit</span>
                    </div>
                    <div className="space-y-3">
                      {room.appointments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Bu oda icin planli randevu yok.</div>
                      ) : (
                        room.appointments.map((appointment) => (
                          <div key={appointment.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                            <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                              <span>{appointment.start_at ? new Date(appointment.start_at).toLocaleString("tr-TR") : "Tarih yok"}</span>
                              <span className="rounded-full bg-white px-2 py-1 text-[10px] text-slate-600">{appointment.status}</span>
                            </div>
                            <div className="mt-2 text-sm font-bold text-slate-900">
                              {appointment.counselee ? `${appointment.counselee.name} ${appointment.counselee.surname}` : "Danisan"}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Danisman: {appointment.counselor ? `${appointment.counselor.name} ${appointment.counselor.surname}` : "Atanmadi"}
                              {appointment.period?.name ? ` / ${appointment.period.name}` : ""}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </PermissionGate>


      <PermissionGate permission="kpd.appointments.view">
        {canViewAppointments ? (
          <div className="glass-panel overflow-hidden rounded-3xl">
            <div className="border-b border-slate-200/70 p-6">
              <h2 className="text-xl font-black text-slate-900">Randevu Ozeti</h2>
            </div>
            <div className="divide-y divide-slate-200/70">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-bold text-slate-900">
                      {appointment.counselee ? `${appointment.counselee.name} ${appointment.counselee.surname}` : "Ogrenci"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(appointment.start_at).toLocaleString("tr-TR")} - {new Date(appointment.end_at).toLocaleString("tr-TR")}
                      {appointment.period?.name ? ` / ${appointment.period.name}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-600">
                      {appointment.status}
                    </span>
                    {canManageAppointments ? (
                      <select
                        value={appointment.status}
                        disabled={updatingAppointmentId === appointment.id}
                        onChange={(event) => void handleUpdateAppointmentStatus(appointment.id, event.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-60"
                      >
                        <option value="scheduled">Planlandi</option>
                        <option value="completed">Tamamlandi</option>
                        <option value="cancelled">Iptal</option>
                        <option value="no_show">Katilim olmadi</option>
                      </select>
                    ) : null}
                  </div>
                </div>
              ))}
              {!loading && appointments.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Randevu bulunamadi.</div> : null}
            </div>
          </div>
        ) : null}
      </PermissionGate>
    </div>
  );
}
