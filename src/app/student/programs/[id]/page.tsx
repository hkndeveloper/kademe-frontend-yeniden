"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { isAxiosError } from "axios";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquareText,
  MinusCircle,
  QrCode,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import api from "@/lib/api/axios";
import { ProgramLocationMap } from "@/components/maps/ProgramLocationMap";
import { ProgramQrAttendanceDialog } from "@/features/student-programs/ProgramQrAttendanceDialog";
import {
  attendanceLabels,
  attendanceStyles,
  formatProgramDate,
  formatProgramTime,
  hasProgramCoordinates,
  programCreditText,
  programStatusLabels,
  type StudentProgram,
} from "@/features/student-programs/program-model";

function attendanceIcon(status: StudentProgram["attendance_status"]) {
  if (status === "present") return <CheckCircle2 className="h-5 w-5" />;
  if (status === "invalid") return <AlertCircle className="h-5 w-5" />;
  if (status === "absent") return <XCircle className="h-5 w-5" />;
  return <Clock className="h-5 w-5" />;
}

export default function StudentProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const programId = Number(params.id);
  const [program, setProgram] = useState<StudentProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const fetchProgram = useCallback(async () => {
    if (!Number.isInteger(programId) || programId <= 0) {
      setErrorMessage("Geçersiz program bağlantısı.");
      setLoading(false);
      return;
    }

    try {
      setErrorMessage(null);
      const response = await api.get<{ program: StudentProgram }>(`/programs/${programId}`);
      setProgram(response.data.program);
    } catch (error) {
      console.error("Program detayı yüklenemedi", error);
      if (isAxiosError(error) && error.response?.status === 404) {
        setErrorMessage("Program bulunamadı veya artık erişilebilir değil.");
      } else if (isAxiosError(error) && error.response?.status === 403) {
        setErrorMessage("Bu programın detaylarını görüntüleme yetkin bulunmuyor.");
      } else {
        setErrorMessage("Program detayı yüklenemedi. Lütfen tekrar dene.");
      }
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    window.setTimeout(() => void fetchProgram(), 0);
  }, [fetchProgram]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!program || errorMessage) {
    return (
      <div className="space-y-5">
        <Link href="/student/programs" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Programlarıma Dön
        </Link>
        <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
          <XCircle className="mx-auto h-10 w-10 text-red-500" />
          <p className="mt-4 font-bold text-red-700">{errorMessage ?? "Program bilgisi bulunamadı."}</p>
          <button type="button" onClick={() => void fetchProgram()} className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white">
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  const canScanQr = program.status === "scheduled" || program.status === "active";

  return (
    <div className="space-y-6">
      <Link href="/student/programs" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Programlarıma Dön
      </Link>

      <section className="overflow-hidden rounded-3xl border border-border/70 bg-white shadow-sm">
        <div className="border-b border-border/60 bg-[radial-gradient(circle_at_top_right,rgba(253,58,37,0.12),transparent_28rem)] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
                  {program.project?.name || "Program"}
                </span>
                {program.period?.name ? (
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
                    {program.period.name}
                  </span>
                ) : null}
                <span className="rounded-md bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                  {programStatusLabels[program.status]}
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">{program.title}</h1>
              {program.description ? <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-slate-600">{program.description}</p> : null}
            </div>

            {canScanQr ? (
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90"
              >
                <QrCode className="h-5 w-5" />
                QR Yoklama Oku
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:p-8 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoCard icon={<Calendar className="h-5 w-5" />} label="Tarih" value={formatProgramDate(program.start_at)} />
              <InfoCard
                icon={<Clock className="h-5 w-5" />}
                label="Saat"
                value={`${formatProgramTime(program.start_at)}${program.end_at ? ` – ${formatProgramTime(program.end_at)}` : ""}`}
              />
              <InfoCard icon={<MapPin className="h-5 w-5" />} label="Konum" value={program.location || "Konum bilgisi yok"} />
            </div>

            {hasProgramCoordinates(program) ? (
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-white p-3">
                <div className="mb-3 flex items-center gap-2 px-1 text-xs font-black uppercase tracking-widest text-slate-500">
                  <MapPin className="h-4 w-4 text-primary" />
                  Program Konumu
                </div>
                <ProgramLocationMap
                  latitude={program.latitude}
                  longitude={program.longitude}
                  radiusMeters={program.radius_meters}
                  placeName={program.location_place_name}
                  placeAddress={program.location_place_address}
                  placeId={program.location_place_id}
                  placeProvider={program.location_place_provider}
                  heightClassName="h-72"
                />
              </div>
            ) : null}
          </div>

          <aside className="space-y-3">
            <div className={`rounded-2xl border p-5 ${attendanceStyles[program.attendance_status]}`}>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                {attendanceIcon(program.attendance_status)}
                Yoklama
              </div>
              <div className="mt-2 text-xl font-black">{attendanceLabels[program.attendance_status]}</div>
              <div className="mt-2 text-xs leading-5 opacity-80">
                {program.attendance?.recorded_at
                  ? `${formatProgramDate(program.attendance.recorded_at)} ${formatProgramTime(program.attendance.recorded_at)}`
                  : program.status === "completed"
                    ? "Bu oturum için geçerli yoklama kaydın bulunmuyor."
                    : "Oturum başladığında QR yoklama alınabilir."}
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                <MinusCircle className="h-5 w-5" />
                Puan
              </div>
              <div className="mt-2 text-sm font-bold text-slate-900">{programCreditText(program)}</div>
              <div className="mt-1 text-xs text-slate-500">Net etki: {(program.credit?.net_amount ?? 0).toLocaleString("tr-TR")} puan</div>
              {program.participation ? <div className="mt-1 text-xs text-slate-500">Güncel puanın: {program.participation.credit.toLocaleString("tr-TR")}</div> : null}
            </div>

            <div className="rounded-2xl border border-border/70 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                {program.credit?.restored ? <ShieldCheck className="h-5 w-5" /> : <MessageSquareText className="h-5 w-5" />}
                Değerlendirme
              </div>
              <div className="mt-2 text-sm font-bold text-slate-900">
                {program.feedback_submitted
                  ? "Gönderildi"
                  : program.attendance_status === "present" && program.status === "completed"
                    ? "Değerlendirme bekleniyor"
                    : "Gerekli değil"}
              </div>
              {program.attendance_status === "present" && program.status === "completed" && !program.feedback_submitted ? (
                <Link href={`/student/evaluate?program_id=${program.id}`} className="mt-3 inline-flex text-xs font-black uppercase tracking-wider text-primary hover:underline">
                  Değerlendirmeye Git
                </Link>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <ProgramQrAttendanceDialog
        program={program}
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onAttendanceRecorded={fetchProgram}
      />
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-sm font-bold leading-5 text-slate-900">{value}</div>
    </div>
  );
}
