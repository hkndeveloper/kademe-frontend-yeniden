"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Briefcase, Calendar, CheckCircle2, Clock, Loader2, MapPin, XCircle } from "lucide-react";
import api from "@/lib/api/axios";
import {
  attendanceLabels,
  attendanceStyles,
  formatProgramDate,
  formatProgramTime,
  programFilters,
  programStatusLabels,
  type ProgramFilter,
  type StudentProgram,
} from "@/features/student-programs/program-model";

function attendanceIcon(status: StudentProgram["attendance_status"]) {
  if (status === "present") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "invalid") return <AlertCircle className="h-4 w-4" />;
  if (status === "absent") return <XCircle className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}

export default function StudentProgramsPage() {
  const [programs, setPrograms] = useState<StudentProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProgramFilter>("all");

  const fetchPrograms = useCallback(async () => {
    try {
      setErrorMessage(null);
      const response = await api.get<{ programs: StudentProgram[] }>("/programs");
      setPrograms(response.data.programs ?? []);
    } catch (error) {
      console.error("Programlar çekilemedi", error);
      setErrorMessage("Programların yüklenemedi. Lütfen sayfayı yenileyip tekrar dene.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.setTimeout(() => void fetchPrograms(), 0);
  }, [fetchPrograms]);

  const summary = useMemo(
    () => ({
      total: programs.length,
      attended: programs.filter((program) => program.attendance_status === "present").length,
      missed: programs.filter((program) => program.credit?.deducted && !program.credit.restored).length,
      restored: programs.filter((program) => program.credit?.restored).length,
    }),
    [programs],
  );

  const filteredPrograms = useMemo(
    () =>
      programs.filter((program) => {
        if (filter === "upcoming") return program.status === "scheduled" || program.status === "active";
        if (filter === "completed") return program.status === "completed";
        if (filter === "attended") return program.attendance_status === "present";
        if (filter === "missed") return Boolean(program.credit?.deducted && !program.credit.restored);
        return true;
      }),
    [filter, programs],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <Briefcase className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Programlarım</h1>
            <p className="text-sm text-muted-foreground">Programlarını özet olarak incele, tüm bilgiler için detayına geç.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryCard label="Toplam" value={summary.total} />
          <SummaryCard label="Katıldın" value={summary.attended} tone="positive" />
          <SummaryCard label="Kesinti" value={summary.missed} tone="negative" />
          <SummaryCard label="İade" value={summary.restored} tone="pending" />
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {programFilters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`min-h-9 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition sm:text-xs ${
              filter === item.value
                ? "bg-primary text-primary-foreground"
                : "border border-border/60 bg-white text-muted-foreground hover:border-primary/40 hover:text-slate-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {programs.length === 0 ? (
        <div className="glass-panel rounded-3xl p-16 text-center">
          <p className="text-muted-foreground">Henüz erişilebilir bir program görünmüyor.</p>
          <Link href="/projects" className="mt-4 inline-block font-bold text-primary hover:underline">
            Programları İncele
          </Link>
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-muted-foreground">Bu filtrede program bulunamadı.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {filteredPrograms.map((program, index) => (
            <motion.article
              key={program.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035 }}
              className="h-full"
            >
              <Link
                href={`/student/programs/${program.id}`}
                className="group flex h-full min-h-72 flex-col rounded-3xl border border-border/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                aria-label={`${program.title} programının detayını aç`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="max-w-full truncate rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    {program.project?.name || "Program"}
                  </span>
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {programStatusLabels[program.status] ?? program.status}
                  </span>
                </div>

                <h2 className="mt-4 line-clamp-2 text-lg font-black leading-6 text-slate-900 transition group-hover:text-primary">
                  {program.title}
                </h2>
                {program.period?.name ? <p className="mt-1 text-xs font-semibold text-slate-500">{program.period.name}</p> : null}

                <div className="mt-5 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0 text-primary" />
                    <span>{formatProgramDate(program.start_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-primary" />
                    <span>
                      {formatProgramTime(program.start_at)}
                      {program.end_at ? ` – ${formatProgramTime(program.end_at)}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span className="line-clamp-1">{program.location || "Konum bilgisi yok"}</span>
                  </div>
                </div>

                <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${attendanceStyles[program.attendance_status]}`}>
                    {attendanceIcon(program.attendance_status)}
                    {attendanceLabels[program.attendance_status]}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-primary">
                    Detay
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "positive" | "negative" | "pending";
}) {
  const tones = {
    neutral: "border-border/60 bg-white text-slate-900",
    positive: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
    negative: "border-red-500/20 bg-red-500/10 text-red-700",
    pending: "border-blue-500/20 bg-blue-500/10 text-blue-700",
  } as const;

  return (
    <div className={`min-w-24 rounded-xl border px-3 py-2 ${tones[tone]}`}>
      <div className="text-[9px] font-bold uppercase tracking-widest opacity-75">{label}</div>
      <div className="text-lg font-black">{value}</div>
    </div>
  );
}
