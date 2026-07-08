"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  MessageSquareText,
  MinusCircle,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import api from "@/lib/api/axios";
import { ProgramLocationMap } from "@/components/maps/ProgramLocationMap";

interface ProgramCredit {
  deducted: boolean;
  deduction_amount: number;
  deducted_at?: string | null;
  restored: boolean;
  restore_amount: number;
  restored_at?: string | null;
  net_amount: number;
}

interface ProgramAttendance {
  id: number;
  method?: string | null;
  is_valid: boolean;
  recorded_at?: string | null;
}

interface Program {
  id: number;
  title: string;
  description?: string | null;
  location?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  radius_meters?: number | null;
  start_at: string;
  end_at?: string | null;
  status: "scheduled" | "active" | "completed";
  attendance_status: "present" | "invalid" | "absent" | "pending";
  attendance?: ProgramAttendance | null;
  credit?: ProgramCredit;
  feedback_submitted?: boolean;
  project?: {
    id: number;
    name: string;
    type?: string;
  } | null;
  period?: {
    id: number;
    name: string;
  } | null;
}

type Filter = "all" | "completed" | "attended" | "missed" | "restored";

const filters: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Tum Gecmis" },
  { value: "completed", label: "Tamamlananlar" },
  { value: "attended", label: "Katildiklarim" },
  { value: "missed", label: "Puan Kesilenler" },
  { value: "restored", label: "Puani Korunanlar" },
];

const attendanceLabels: Record<Program["attendance_status"], string> = {
  present: "Katildin",
  invalid: "Gecersiz yoklama",
  absent: "Katilim yok",
  pending: "Yoklama bekleniyor",
};

const attendanceStyles: Record<Program["attendance_status"], string> = {
  present: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  invalid: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  absent: "border-red-500/20 bg-red-500/10 text-red-700",
  pending: "border-slate-300 bg-slate-100 text-slate-600",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

const hasProgramCoordinates = (program: Program) =>
  program.latitude !== null &&
  program.latitude !== undefined &&
  program.latitude !== "" &&
  program.longitude !== null &&
  program.longitude !== undefined &&
  program.longitude !== "";

function attendanceIcon(status: Program["attendance_status"]) {
  if (status === "present") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "invalid") return <AlertCircle className="h-4 w-4" />;
  if (status === "absent") return <XCircle className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}

function creditText(program: Program) {
  const credit = program.credit;
  if (!credit?.deducted) return "Puan kesintisi yok";
  if (credit.restored) {
    return `-${credit.deduction_amount} kesildi, +${credit.restore_amount} iade edildi`;
  }
  return `-${credit.deduction_amount} puan kesildi`;
}

export default function AlumniProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await api.get<{ programs: Program[] }>("/programs");
        setPrograms(response.data.programs ?? []);
      } catch (error) {
        console.error("Mezun program gecmisi cekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchPrograms();
  }, []);

  const summary = useMemo(() => {
    return {
      total: programs.length,
      attended: programs.filter((program) => program.attendance_status === "present").length,
      missed: programs.filter((program) => program.credit?.deducted && !program.credit.restored).length,
      restored: programs.filter((program) => program.credit?.restored).length,
    };
  }, [programs]);

  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      if (filter === "completed") return program.status === "completed";
      if (filter === "attended") return program.attendance_status === "present";
      if (filter === "missed") return Boolean(program.credit?.deducted && !program.credit.restored);
      if (filter === "restored") return Boolean(program.credit?.restored);
      return true;
    });
  }, [filter, programs]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Program Gecmisim</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Mezun oldugun projelerdeki program, yoklama ve kredi gecmisin
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard label="Toplam" value={summary.total} />
          <SummaryCard label="Katildin" value={summary.attended} tone="emerald" />
          <SummaryCard label="Kesinti" value={summary.missed} tone="red" />
          <SummaryCard label="Iade" value={summary.restored} tone="blue" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest transition ${
              filter === item.value
                ? "bg-[#FF6B00] text-white"
                : "border border-slate-200 bg-white text-muted-foreground hover:border-[#FF6B00]/40 hover:text-slate-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {programs.length === 0 ? (
        <EmptyState text="Mezun program gecmisi bulunamadi." />
      ) : filteredPrograms.length === 0 ? (
        <EmptyState text="Bu filtrede program bulunamadi." />
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredPrograms.map((program) => (
            <article key={program.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      {program.project?.name || "Program"}
                    </span>
                    {program.period?.name ? (
                      <span className="rounded bg-[#FF6B00]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FF6B00]">
                        {program.period.name}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="text-2xl font-bold text-slate-900">{program.title}</h2>
                  {program.description ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{program.description}</p>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {formatDate(program.start_at)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {formatTime(program.start_at)}
                      {program.end_at ? ` - ${formatTime(program.end_at)}` : ""}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {program.location || "Konum bilgisi yok"}
                    </div>
                  </div>

                  {hasProgramCoordinates(program) ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-white p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        Harita
                      </div>
                      <ProgramLocationMap
                        latitude={program.latitude}
                        longitude={program.longitude}
                        radiusMeters={program.radius_meters}
                        heightClassName="h-44"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="grid w-full gap-3 xl:w-[420px]">
                  <div className={`rounded-2xl border p-4 ${attendanceStyles[program.attendance_status]}`}>
                    <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                      {attendanceIcon(program.attendance_status)}
                      Yoklama
                    </div>
                    <div className="text-lg font-black">{attendanceLabels[program.attendance_status]}</div>
                    <div className="mt-1 text-xs opacity-80">
                      {program.attendance?.recorded_at
                        ? `${formatDate(program.attendance.recorded_at)} ${formatTime(program.attendance.recorded_at)}`
                        : "Bu oturum icin gecerli yoklama kaydin bulunmuyor."}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
                    <InfoCard
                      icon={<MinusCircle className="h-4 w-4" />}
                      label="Puan"
                      value={creditText(program)}
                      detail={`Net etki: ${(program.credit?.net_amount ?? 0).toLocaleString("tr-TR")} puan`}
                    />
                    <InfoCard
                      icon={program.credit?.restored ? <ShieldCheck className="h-4 w-4" /> : <MessageSquareText className="h-4 w-4" />}
                      label="Degerlendirme"
                      value={program.feedback_submitted ? "Gonderildi" : "Kayit yok"}
                      detail={program.credit?.restored ? "Puanin korunmus gorunuyor." : "Iade kaydi yok."}
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "emerald" | "red" | "blue" }) {
  const styles = {
    slate: "border-slate-200 bg-white text-slate-900",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
    red: "border-red-500/20 bg-red-500/10 text-red-700",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-700",
  };

  return (
    <div className={`rounded-2xl border p-3 ${styles[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-75">{label}</div>
      <div className="text-xl font-black">{value}</div>
    </div>
  );
}

function InfoCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center text-muted-foreground">
      {text}
    </div>
  );
}


