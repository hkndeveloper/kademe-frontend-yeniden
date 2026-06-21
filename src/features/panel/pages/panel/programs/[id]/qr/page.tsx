"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { ChevronLeft, Clock3, Loader2, QrCode, RefreshCcw, ShieldCheck, Smartphone, UsersRound } from "lucide-react";
import api from "@/lib/api/axios";
import type { AxiosError } from "axios";

const rotationOptions = [15, 30, 45, 60, 90, 120];
interface ApiErrorPayload {
  message?: string;
  errors?: Record<string, string[]>;
}

interface AttendanceRecord {
  id?: number | null;
  participant_id?: number | null;
  student: string;
  email?: string | null;
  role?: "student" | "alumni" | string | null;
  method?: string | null;
  is_valid: boolean;
  feedback_submitted: boolean;
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

export default function PanelProgramQrPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = params?.id;
  const programId = typeof rawId === "string" ? Number(rawId) : Number(Array.isArray(rawId) ? rawId[0] : NaN);
  const title = searchParams.get("title") ?? "Program";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshIn, setRefreshIn] = useState(30);
  const [selectedRotation, setSelectedRotation] = useState(30);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [scanUrl, setScanUrl] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceUpdatedAt, setAttendanceUpdatedAt] = useState<Date | null>(null);

  const presentRecords = useMemo(
    () => attendanceRecords.filter((record) => record.is_valid && record.recorded_at),
    [attendanceRecords]
  );
  const latestPresentRecords = useMemo(
    () => [...presentRecords]
      .sort((a, b) => new Date(b.recorded_at ?? 0).getTime() - new Date(a.recorded_at ?? 0).getTime())
      .slice(0, 8),
    [presentRecords]
  );
  const participantCount = attendanceSummary?.participant_count ?? attendanceRecords.length;
  const presentCount = attendanceSummary?.attendance_count ?? presentRecords.length;
  const attendanceRate = participantCount > 0 ? Math.round((presentCount / participantCount) * 100) : 0;

  const load = useCallback(async () => {
    if (!Number.isFinite(programId) || programId <= 0) {
      setError("Gecersiz program.");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ qr_token: string; refresh_in_seconds?: number; expires_at?: string }>(
        `/panel/programs/${programId}/generate-qr`,
        { rotation_seconds: selectedRotation }
      );
      const nextRefresh = res.data.refresh_in_seconds ?? selectedRotation;
      const nextExpiresAt = res.data.expires_at ? new Date(res.data.expires_at) : new Date(Date.now() + nextRefresh * 1000);
      setToken(res.data.qr_token);
      setScanUrl(`${window.location.origin}/student/programs?token=${encodeURIComponent(res.data.qr_token)}`);
      setRefreshIn(nextRefresh);
      setGeneratedAt(new Date());
      setExpiresAt(nextExpiresAt);
      setRemainingSeconds(Math.max(0, Math.ceil((nextExpiresAt.getTime() - Date.now()) / 1000)));
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorPayload>;
      const validationMessage = Object.values(axiosError.response?.data?.errors ?? {})
        .flat()
        .join(" ");
      setError(
        validationMessage
          || axiosError.response?.data?.message
          || "QR uretilemedi. Yetki, proje kapsami ve program saat araligini kontrol edin."
      );
      setToken(null);
      setScanUrl(null);
      setExpiresAt(null);
      setRemainingSeconds(0);
    } finally {
      setLoading(false);
    }
  }, [programId, selectedRotation]);

  const loadAttendance = useCallback(async () => {
    if (!Number.isFinite(programId) || programId <= 0) return;

    setAttendanceError(null);
    setAttendanceLoading(true);
    try {
      const res = await api.get<{ summary?: AttendanceSummary; records?: AttendanceRecord[] }>(
        `/panel/programs/${programId}/attendances`
      );
      setAttendanceSummary(res.data.summary ?? null);
      setAttendanceRecords(res.data.records ?? []);
      setAttendanceUpdatedAt(new Date());
    } catch {
      setAttendanceError("Canli yoklama listesi yuklenemedi. programs.attendance.view yetkisini ve proje kapsamini kontrol edin.");
    } finally {
      setAttendanceLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!token || refreshIn <= 0) return;
    const interval = window.setInterval(() => {
      void load();
    }, refreshIn * 1000);

    return () => window.clearInterval(interval);
  }, [token, refreshIn, load]);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = window.setInterval(() => {
      setRemainingSeconds(Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAttendance();
    }, 0);
    const interval = window.setInterval(() => {
      void loadAttendance();
    }, 10000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [loadAttendance]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Link
        href="/panel/programs"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950"
      >
        <ChevronLeft className="h-4 w-4" />
        Programlara don
      </Link>

      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600">
            <QrCode className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-950">QR Yoklama</h1>
            <p className="mt-1 text-sm font-medium text-slate-600">{title}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          QR Yenile
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mr-2 text-xs font-black uppercase tracking-widest text-slate-500">Kod suresi</div>
        {rotationOptions.map((seconds) => (
          <button
            key={seconds}
            type="button"
            onClick={() => setSelectedRotation(seconds)}
            disabled={loading}
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
              selectedRotation === seconds
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-300 hover:text-orange-700"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {seconds} sn
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-panel flex min-h-[40vh] items-center justify-center rounded-3xl">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-orange-600" />
            <p className="text-sm font-semibold text-slate-600">QR kod hazirlaniyor...</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {token && !loading ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="glass-panel overflow-hidden rounded-3xl">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Ogrenciye Okutulacak Kod</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Ogrenci Programlarim ekranindaki QR okuma araciyla bu kodu okutur.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  Aktif Kod
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6 p-8 md:p-12">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <QRCodeSVG value={scanUrl ?? token} size={320} className="block" />
              </div>
              <div className="max-w-2xl rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-center text-sm font-medium text-orange-900">
                Kod otomatik yenilenir. Ekrani projeksiyonda acik tutabilir veya gerekirse yukaridaki yenile butonunu kullanabilirsin.
              </div>
            </div>
          </div>


            <div className="glass-panel overflow-hidden rounded-3xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <UsersRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-950">Canli Yoklama</h2>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      10 saniyede bir guncellenir{attendanceUpdatedAt ? ` - Son: ${attendanceUpdatedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void loadAttendance()}
                  disabled={attendanceLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {attendanceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Listeyi Yenile
                </button>
              </div>

              <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-4">
                <LiveMetric label="Katilimci" value={participantCount} />
                <LiveMetric label="Gelen" value={presentCount} tone="emerald" />
                <LiveMetric label="Gelmeyen" value={attendanceSummary?.absent_count ?? Math.max(participantCount - presentCount, 0)} tone="amber" />
                <LiveMetric label="Oran" value={`${attendanceRate}%`} />
              </div>

              {attendanceError ? (
                <div className="border-b border-red-100 bg-red-50 px-6 py-4 text-sm font-semibold text-red-700">
                  {attendanceError}
                </div>
              ) : null}

              <div className="p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Son Okutmalar</h3>
                    <p className="mt-1 text-xs text-slate-500">QR veya manuel gecisler anlik listelenir.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    Feedback: {attendanceSummary?.feedback_count ?? 0}
                  </span>
                </div>

                {attendanceLoading && attendanceRecords.length === 0 ? (
                  <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 py-10 text-sm font-semibold text-slate-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Canli liste yukleniyor...
                  </div>
                ) : latestPresentRecords.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-500">
                    Henuz dogrulanmis QR okutmasi yok.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
                    {latestPresentRecords.map((record) => (
                      <div key={record.id ?? record.participant_id ?? record.student} className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{record.student}</p>
                          <p className="text-xs text-slate-500">
                            {record.email ?? "-"} - {record.role === "alumni" ? "Mezun" : "Ogrenci"}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                            {record.method ?? "qr"}
                          </span>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {record.recorded_at ? new Date(record.recorded_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <aside className="space-y-4">
            <div className="glass-panel rounded-3xl p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-500">Yenileme</div>
                  <div className="text-2xl font-black text-slate-950">{remainingSeconds || refreshIn} sn</div>
                </div>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Kod bu sure sonunda otomatik olarak yeniden uretilir. Eski kodlar expiry doldugunda backend tarafinda reddedilir.
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-500">Ogrenci Akisi</div>
                  <div className="text-base font-black text-slate-950">Programlarim icinden okur</div>
                </div>
              </div>
              <ol className="space-y-3 text-sm text-slate-600">
                <li className="rounded-2xl bg-slate-50 p-3">1. Ogrenci kendi panelinde Programlarim sayfasini acar.</li>
                <li className="rounded-2xl bg-slate-50 p-3">2. QR Yoklama Oku butonuna basar.</li>
                <li className="rounded-2xl bg-slate-50 p-3">3. Kamera ve konum izniyle yoklama kaydi olusur.</li>
              </ol>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 text-xs text-slate-500">
              {generatedAt ? (
                <>Son uretim: {generatedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</>
              ) : (
                "Kod henuz uretilmedi."
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
type LiveMetricTone = "slate" | "emerald" | "amber";

function LiveMetric({ label, value, tone = "slate" }: { label: string; value: number | string; tone?: LiveMetricTone }) {
  const toneClass: Record<LiveMetricTone, string> = {
    slate: "bg-white text-slate-900",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className={`rounded-2xl border border-slate-100 p-4 text-center shadow-sm ${toneClass[tone]}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}
