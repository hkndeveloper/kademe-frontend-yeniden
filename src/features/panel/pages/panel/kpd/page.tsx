"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, HeartPulse, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

type Paginated<T> = {
  data: T[];
  last_page?: number;
};

type UserOption = {
  id: number;
  name: string;
  surname: string;
  email?: string | null;
};

type KpdReport = {
  id: number;
  user_id: number;
  counselor_id?: number | null;
  title: string;
  download_url?: string | null;
  created_at?: string | null;
  user?: UserOption | null;
  counselor?: UserOption | null;
};

type KpdAppointment = {
  id: number;
  status: string;
  start_at: string;
  end_at: string;
  counselor?: UserOption | null;
  counselee?: UserOption | null;
  room?: { id: number; name: string } | null;
};

export default function PanelKpdPage() {
  const { hasPermission, hasGlobalScope } = usePermissions();
  const canViewReports = hasPermission("kpd.reports.view") && hasGlobalScope("kpd.reports.view");
  const canCreateReports = hasPermission("kpd.reports.create") && hasGlobalScope("kpd.reports.create");
  const canDeleteReports = hasPermission("kpd.reports.delete") && hasGlobalScope("kpd.reports.delete");
  const canViewAppointments = hasPermission("kpd.appointments.view") && hasGlobalScope("kpd.appointments.view");
  const canListUsers = hasPermission("users.view");

  const [reports, setReports] = useState<KpdReport[]>([]);
  const [appointments, setAppointments] = useState<KpdAppointment[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({ user_id: "", title: "" });
  const [file, setFile] = useState<File | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setFeedback(null);

    try {
      const requests = [
        canViewReports
          ? api.get<{ reports: Paginated<KpdReport> }>("/panel/kpd/reports")
          : Promise.resolve({ data: { reports: { data: [] as KpdReport[] } } }),
        canViewAppointments
          ? api.get<{ appointments: Paginated<KpdAppointment> }>("/panel/kpd/appointments")
          : Promise.resolve({ data: { appointments: { data: [] as KpdAppointment[] } } }),
        canListUsers && canCreateReports
          ? api.get<{ users?: Paginated<UserOption> }>("/panel/users", { params: { per_page: 500, role: "student" } })
          : Promise.resolve({ data: { users: { data: [] as UserOption[] } } }),
      ] as const;

      const [reportsResponse, appointmentsResponse, usersResponse] = await Promise.all(requests);
      setReports(reportsResponse.data.reports?.data ?? []);
      setAppointments(appointmentsResponse.data.appointments?.data ?? []);
      setUsers(usersResponse.data.users?.data ?? []);
    } catch (error) {
      console.error("KPD verileri yuklenemedi", error);
      setFeedback("KPD verileri yuklenirken bir sorun olustu.");
    } finally {
      setLoading(false);
    }
  }, [canCreateReports, canListUsers, canViewAppointments, canViewReports]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !form.user_id || !form.title.trim()) return;

    setSaving(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("user_id", form.user_id);
      formData.append("title", form.title.trim());
      formData.append("file", file);

      const response = await api.post<{ message: string; report: KpdReport }>("/panel/kpd/reports", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setReports((current) => [response.data.report, ...current]);
      setFeedback(response.data.message);
      setForm({ user_id: "", title: "" });
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
      const contentType = String(response.headers["content-type"] ?? "");

      if (contentType.includes("application/json")) {
        const payload = JSON.parse(await response.data.text()) as { download_url?: string; message?: string };
        if (payload.download_url) {
          window.open(payload.download_url, "_blank", "noopener,noreferrer");
          return;
        }
        throw new Error(payload.message ?? "Rapor indirilemedi.");
      }

      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `kpd_raporu_${report.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
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

      {!canViewReports && !canViewAppointments ? (
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6 text-sm text-amber-800">
          KPD ekranlari global kapsam gerektirir. Yetki matrisinde ilgili KPD action icin scope &quot;all&quot; olmalidir.
        </div>
      ) : null}

      <PermissionGate permission="kpd.reports.create">
        {canCreateReports ? (
          <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <Plus className="h-5 w-5 text-rose-600" />
              <h2 className="text-xl font-black text-slate-900">Rapor Yukle</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_auto]">
              {canListUsers ? (
                <select
                  value={form.user_id}
                  onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value }))}
                  required
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                >
                  <option value="">Ogrenci sec</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} {user.surname} {user.email ? `(${user.email})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={form.user_id}
                  onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value }))}
                  required
                  min={1}
                  placeholder="Ogrenci kullanici ID"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                />
              )}
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
                disabled={saving}
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
                    </div>
                  </div>
                  <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-600">
                    {appointment.status}
                  </span>
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
