"use client";

import { useEffect, useState } from "react";
import { AlertCircle, BrainCircuit, CalendarClock, Download, HeartPulse, Loader2, Plus, User, XCircle } from "lucide-react";
import api from "@/lib/api/axios";
import { downloadBlobResponse } from "@/lib/download";

interface Participation {
  id: number;
  project?: {
    id: number;
    name: string;
  } | null;
}

interface DashboardSummaryResponse {
  participations?: Participation[];
}

interface UserProfileResponse {
  user: {
    profile?: {
      personality_test_data?: Record<string, unknown> | null;
    } | null;
  };
}

interface CounselorOption {
  id: number;
  name: string;
  surname: string;
  role: string;
}

interface RoomOption {
  id: number;
  name: string;
  description?: string | null;
}

interface KpdAppointment {
  id: number;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  start_at: string;
  end_at: string;
  notes?: string | null;
  counselor?: CounselorOption | null;
  room?: RoomOption | null;
}

interface KpdReport {
  id: number;
  title: string;
  created_at?: string | null;
  download_url?: string | null;
  counselor?: CounselorOption | null;
}

interface KpdMaterial {
  id: number;
  title: string;
  description?: string | null;
  file_type?: string | null;
  download_url?: string | null;
}

interface KpdResponse {
  appointments: KpdAppointment[];
  counselors: CounselorOption[];
  rooms: RoomOption[];
  reports?: KpdReport[];
  materials?: KpdMaterial[];
}

interface AppointmentFormState {
  counselor_id: string;
  room_id: string;
  start_at: string;
  end_at: string;
  notes: string;
}

const defaultFormState: AppointmentFormState = {
  counselor_id: "",
  room_id: "",
  start_at: "",
  end_at: "",
  notes: "",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatusLabel(status: KpdAppointment["status"]) {
  switch (status) {
    case "scheduled":
      return "Planlandi";
    case "completed":
      return "Tamamlandi";
    case "cancelled":
      return "Iptal edildi";
    case "no_show":
      return "Katilim olmadi";
    default:
      return status;
  }
}

export default function StudentKpdPage() {
  const [nowTimestamp] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [hasPersonalityData, setHasPersonalityData] = useState(false);
  const [appointments, setAppointments] = useState<KpdAppointment[]>([]);
  const [reports, setReports] = useState<KpdReport[]>([]);
  const [materials, setMaterials] = useState<KpdMaterial[]>([]);
  const [counselors, setCounselors] = useState<CounselorOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [form, setForm] = useState<AppointmentFormState>(defaultFormState);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    const loadScope = async () => {
      try {
        const [summaryResponse, profileResponse, kpdResponse] = await Promise.all([
          api.get<DashboardSummaryResponse>("/dashboard/summary"),
          api.get<UserProfileResponse>("/user/profile"),
          api.get<KpdResponse>("/kpd/appointments"),
        ]);

        setParticipations(summaryResponse.data.participations ?? []);
        setHasPersonalityData(Boolean(profileResponse.data.user.profile?.personality_test_data && Object.keys(profileResponse.data.user.profile?.personality_test_data || {}).length > 0));
        setAppointments(kpdResponse.data.appointments ?? []);
        setReports(kpdResponse.data.reports ?? []);
        setMaterials(kpdResponse.data.materials ?? []);
        setCounselors(kpdResponse.data.counselors ?? []);
        setRooms(kpdResponse.data.rooms ?? []);
      } catch (error) {
        console.error("Ogrenci KPD kapsami yuklenemedi", error);
        setErrorMessage("KPD verileri yuklenirken bir sorun olustu.");
      } finally {
        setLoading(false);
      }
    };

    void loadScope();
  }, []);

  const handleCreateAppointment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);
    setFeedback(null);
    setErrorMessage(null);

    try {
      const response = await api.post<{ message: string; appointment: KpdAppointment }>("/kpd/appointments", {
        counselor_id: Number(form.counselor_id),
        room_id: Number(form.room_id),
        start_at: form.start_at,
        end_at: form.end_at,
        notes: form.notes.trim() || null,
      });

      setAppointments((current) => [response.data.appointment, ...current]);
      setFeedback(response.data.message);
      setForm(defaultFormState);
    } catch (error) {
      console.error("KPD randevusu olusturulamadi", error);
      setErrorMessage("Randevu talebi olusturulamadi. Saat araligini ve secimlerini kontrol edip tekrar dene.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: number) => {
    setCancellingId(appointmentId);
    setFeedback(null);
    setErrorMessage(null);

    try {
      const response = await api.post<{ message: string; appointment: KpdAppointment }>(`/kpd/appointments/${appointmentId}/cancel`);

      setAppointments((current) =>
        current.map((appointment) => (appointment.id === appointmentId ? response.data.appointment : appointment)),
      );
      setFeedback(response.data.message);
    } catch (error) {
      console.error("KPD randevusu iptal edilemedi", error);
      setErrorMessage("Randevu iptal edilemedi.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleDownloadReport = async (report: KpdReport) => {
    const endpoint = report.download_url ?? `/kpd/reports/${report.id}/download`;

    try {
      const response = await api.get(endpoint, { responseType: "blob" });
      await downloadBlobResponse(response.data, response.headers, `kpd_raporu_${report.id}`);
    } catch (error) {
      console.error("KPD raporu indirilemedi", error);
      setErrorMessage("KPD raporu indirilemedi.");
    }
  };

  const handleDownloadMaterial = async (material: KpdMaterial) => {
    const endpoint = material.download_url ?? `/digital-bohca/${material.id}/download`;

    try {
      const response = await api.get(endpoint, { responseType: "blob" });
      await downloadBlobResponse(response.data, response.headers, material.title || `kpd_materyal_${material.id}`);
    } catch (error) {
      console.error("KPD materyali indirilemedi", error);
      setErrorMessage("KPD materyali indirilemedi.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <HeartPulse className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">KPD Seanslarim</h1>
            <p className="text-sm text-muted-foreground">Kariyer ve Psikolojik Danismanlik randevularini bu ekrandan takip edip yeni talep olusturabilirsin.</p>
          </div>
        </div>

        <a href="#yeni-kpd-randevusu" className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90">
          <Plus className="h-5 w-5" />
          Yeni Randevu Talebi
        </a>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {feedback ? (
            <div className="glass-panel rounded-3xl border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-emerald-300">
              {feedback}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="glass-panel rounded-3xl border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">
              {errorMessage}
            </div>
          ) : null}

          <div className="glass-panel rounded-3xl p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Randevularim</h2>
                <p className="text-sm text-muted-foreground">Planlanan, tamamlanan ve iptal edilen KPD seanslarin burada listelenir.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {appointments.length} kayit
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-muted-foreground">
                Henuz olusturulmus bir KPD randevun yok. Asagidaki formdan ilk talebini olusturabilirsin.
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment) => {
                  const cancellable = appointment.status === "scheduled" && new Date(appointment.start_at).getTime() > nowTimestamp;

                  return (
                    <div key={appointment.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <CalendarClock className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-bold text-slate-900">
                              {appointment.counselor ? `${appointment.counselor.name} ${appointment.counselor.surname}` : "Danisman atanacak"}
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(appointment.start_at)} - {formatDateTime(appointment.end_at)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Oda: {appointment.room?.name || "Belirtilmedi"}
                            {appointment.room?.description ? ` - ${appointment.room.description}` : ""}
                          </p>
                          {appointment.notes ? <p className="text-sm text-muted-foreground">Not: {appointment.notes}</p> : null}
                        </div>

                        <div className="flex flex-col items-start gap-3 md:items-end">
                          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                            {getStatusLabel(appointment.status)}
                          </span>
                          {cancellable ? (
                            <button
                              type="button"
                              onClick={() => void handleCancelAppointment(appointment.id)}
                              disabled={cancellingId === appointment.id}
                              className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {cancellingId === appointment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                              Randevuyu Iptal Et
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-panel rounded-3xl p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Raporlarim</h2>
                <p className="text-sm text-muted-foreground">Danismanlar tarafindan yuklenen KPD raporlarini buradan indirebilirsin.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {reports.length} dosya
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-24 items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : reports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-muted-foreground">
                Henuz yuklenmis bir KPD raporun yok.
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{report.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {report.created_at ? new Date(report.created_at).toLocaleDateString("tr-TR") : "Tarih yok"}
                        {report.counselor ? ` / ${report.counselor.name} ${report.counselor.surname}` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDownloadReport(report)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
                    >
                      <Download className="h-4 w-4" />
                      Indir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel rounded-3xl p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Bos Materyaller</h2>
                <p className="text-sm text-muted-foreground">Test, envanter ve seans oncesi kullanabilecegin KPD dosyalari.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {materials.length} dosya
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-24 items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : materials.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-muted-foreground">
                Henuz indirilebilir KPD materyali yok.
              </div>
            ) : (
              <div className="space-y-3">
                {materials.map((material) => (
                  <div key={material.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{material.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {[material.file_type, material.description].filter(Boolean).join(" / ") || "Materyal"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDownloadMaterial(material)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
                    >
                      <Download className="h-4 w-4" />
                      Indir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div id="yeni-kpd-randevusu" className="glass-panel rounded-3xl p-8">
            <h3 className="mb-2 text-xl font-bold text-slate-900">Yeni Randevu Talebi</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Uygun bir danisman, oda ve zaman araligi secerek yeni bir KPD seansi talep edebilirsin.
            </p>

            <form className="space-y-6" onSubmit={handleCreateAppointment}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">Danisman</span>
                  <select
                    value={form.counselor_id}
                    onChange={(event) => setForm((current) => ({ ...current, counselor_id: event.target.value }))}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary"
                  >
                    <option value="">Danisman sec</option>
                    {counselors.map((counselor) => (
                      <option key={counselor.id} value={counselor.id}>
                        {counselor.name} {counselor.surname} ({counselor.role})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">Oda</span>
                  <select
                    value={form.room_id}
                    onChange={(event) => setForm((current) => ({ ...current, room_id: event.target.value }))}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary"
                  >
                    <option value="">Oda sec</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">Baslangic</span>
                  <input
                    type="datetime-local"
                    value={form.start_at}
                    onChange={(event) => setForm((current) => ({ ...current, start_at: event.target.value }))}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-900">Bitis</span>
                  <input
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(event) => setForm((current) => ({ ...current, end_at: event.target.value }))}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary"
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-900">Paylasmak istedigin not</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={4}
                  placeholder="Danismanda onceden bilinmesini istedigin konu basliklarini yazabilirsin."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary"
                />
              </label>

              <button
                type="submit"
                disabled={saving || counselors.length === 0 || rooms.length === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                Randevu Talebi Olustur
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-1">
          {loading ? (
            <div className="glass-panel flex min-h-48 items-center justify-center rounded-3xl p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="glass-panel rounded-3xl border-primary/20 bg-primary/5 p-8">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  Onemli Bilgi
                </h3>
                <ul className="space-y-4 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    Kisilik analizi sonucu varsa danisman gorusmesine hazirlikta daha saglikli bir cizgi izlenebilir.
                  </li>
                  <li className="flex gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    Seans talebin saat cakismasi, oda dolulugu veya uygunluk nedeniyle reddedilirse tekrar farkli bir aralik deneyebilirsin.
                  </li>
                </ul>
              </div>

              <div className="glass-panel rounded-3xl p-8">
                <h3 className="mb-6 text-lg font-bold">Canli Ogrenci Baglami</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Aktif proje katilimi</p>
                      <p className="text-[10px] uppercase text-muted-foreground">{participations.length} kayit</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <BrainCircuit className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Kisilik analizi verisi</p>
                      <p className="text-[10px] uppercase text-muted-foreground">{hasPersonalityData ? "Kayitli veri var" : "Henuz veri yok"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <CalendarClock className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Toplam KPD randevusu</p>
                      <p className="text-[10px] uppercase text-muted-foreground">{appointments.length} kayit</p>
                    </div>
                  </div>

                  {participations.slice(0, 3).map((participation) => (
                    <div key={participation.id} className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-muted-foreground">
                      {participation.project?.name || "Proje"}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
