"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Html5QrcodeScanType, Html5QrcodeScanner } from "html5-qrcode";
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  MessageSquareText,
  MinusCircle,
  QrCode,
  ShieldCheck,
  X,
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
  credit_deduction?: number | null;
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

type Filter = "all" | "upcoming" | "completed" | "attended" | "missed";
type ScanStatus = "idle" | "loading" | "success" | "error";
type FeedbackBlock = {
  program_id?: number;
  program_title?: string;
  redirect_to?: string;
};

const statusLabels: Record<Program["status"], string> = {
  scheduled: "Planlandi",
  active: "Aktif",
  completed: "Tamamlandi",
};

const attendanceLabels: Record<Program["attendance_status"], string> = {
  present: "Katildin",
  invalid: "Gecersiz yoklama",
  absent: "Katilim yok",
  pending: "Yoklama bekleniyor",
};

const attendanceStyles: Record<Program["attendance_status"], string> = {
  present: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  invalid: "border-amber-500/20 bg-amber-500/10 text-amber-600",
  absent: "border-red-500/20 bg-red-500/10 text-red-600",
  pending: "border-slate-300 bg-slate-100 text-slate-600",
};

const filters: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Tum Programlar" },
  { value: "upcoming", label: "Yaklasan/Aktif" },
  { value: "completed", label: "Gecmis" },
  { value: "attended", label: "Katildiklarim" },
  { value: "missed", label: "Puan Kesilenler" },
];

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
  if (!credit?.deducted && program.status !== "completed") {
    return "Puan islemi yok";
  }
  if (!credit?.deducted && program.status === "completed") {
    return "Puan kesintisi yok";
  }
  if (!credit) {
    return "Puan islemi yok";
  }
  if (credit.restored) {
    return `-${credit.deduction_amount} kesildi, +${credit.restore_amount} iade edildi`;
  }
  return `-${credit.deduction_amount} puan kesildi`;
}

export default function StudentProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanMessage, setScanMessage] = useState("");
  const [feedbackBlock, setFeedbackBlock] = useState<FeedbackBlock | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const submittedRef = useRef(false);

  const fetchPrograms = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setLoading(true);
    }
    try {
      const response = await api.get<{ programs: Program[] }>("/programs");
      setPrograms(response.data.programs ?? []);
    } catch (error) {
      console.error("Programlar cekilemedi", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.setTimeout(() => {
      void fetchPrograms(true);
    }, 0);
  }, [fetchPrograms]);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const extractToken = useCallback((raw: string): string => {
    const value = raw.trim();
    if (!value) return "";
    try {
      const url = new URL(value);
      const token = url.searchParams.get("token");
      return token?.trim() || value;
    } catch {
      return value;
    }
  }, []);

  const closeScanner = useCallback(() => {
    if (scannerRef.current) {
      void scannerRef.current.clear();
      scannerRef.current = null;
    }
    submittedRef.current = false;
    setScannerOpen(false);
    setScanStatus("idle");
    setScanMessage("");
    setFeedbackBlock(null);
  }, []);

  const submitAttendance = useCallback(async (rawToken: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const qrToken = extractToken(rawToken);
    const currentLocation = locationRef.current;

    if (!qrToken) {
      setScanStatus("error");
      setScanMessage("QR kod gecersiz. Lutfen tekrar okutun.");
      submittedRef.current = false;
      return;
    }

    if (!currentLocation) {
      setScanStatus("error");
      setScanMessage("Konum verisi alinamadi. Lutfen konum izni verip tekrar deneyin.");
      submittedRef.current = false;
      return;
    }

    setScanStatus("loading");
    setFeedbackBlock(null);
    try {
      const response = await api.post("/attendances/qr", {
        qr_token: qrToken,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
      });

      setScanStatus("success");
      setScanMessage(response.data.message || "Yoklaman basariyla alindi.");
      await fetchPrograms();
    } catch (error: unknown) {
      const payload =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string; requires_feedback?: boolean; program_id?: number; program_title?: string; redirect_to?: string } } }).response?.data === "object"
          ? (error as { response?: { data?: { message?: string; requires_feedback?: boolean; program_id?: number; program_title?: string; redirect_to?: string } } }).response?.data
          : null;
      const nextMessage = payload?.message ?? "Yoklama islemi basarisiz oldu.";

      setScanStatus("error");
      setScanMessage(nextMessage);
      setFeedbackBlock(payload?.requires_feedback ? {
        program_id: payload.program_id,
        program_title: payload.program_title,
        redirect_to: payload.redirect_to,
      } : null);
      submittedRef.current = false;
    }
  }, [extractToken, fetchPrograms]);

  useEffect(() => {
    if (!scannerOpen) return undefined;

    window.setTimeout(() => {
      setScanStatus("idle");
      setScanMessage("");
      setFeedbackBlock(null);
    }, 0);
    submittedRef.current = false;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setScanMessage("Yoklama icin konum izni vermen zorunludur."),
        { enableHighAccuracy: true },
      );
    }

    const scanner = new Html5QrcodeScanner(
      "student-program-qr-reader",
      {
        fps: 12,
        qrbox: { width: 260, height: 260 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
      },
      false,
    );

    scanner.render(
      (decodedText) => {
        void scanner.clear();
        scannerRef.current = null;
        void submitAttendance(decodedText);
      },
      () => {},
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        void scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [scannerOpen, submitAttendance]);

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
      if (filter === "upcoming") return program.status === "scheduled" || program.status === "active";
      if (filter === "completed") return program.status === "completed";
      if (filter === "attended") return program.attendance_status === "present";
      if (filter === "missed") return Boolean(program.credit?.deducted && !program.credit.restored);
      return true;
    });
  }, [filter, programs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <Briefcase className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Programlarim</h1>
            <p className="text-sm text-muted-foreground">
              Yaklasan oturumlarini, gecmis yoklamalarini ve puan hareketlerini takip et.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border/60 bg-white p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Toplam</div>
            <div className="text-xl font-black text-slate-900">{summary.total}</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Katildin</div>
            <div className="text-xl font-black text-emerald-700">{summary.attended}</div>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-700">Kesinti</div>
            <div className="text-xl font-black text-red-700">{summary.missed}</div>
          </div>
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Iade</div>
            <div className="text-xl font-black text-blue-700">{summary.restored}</div>
          </div>
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
                ? "bg-primary text-primary-foreground"
                : "border border-border/60 bg-white text-muted-foreground hover:border-primary/40 hover:text-slate-900"
            }`}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-primary"
        >
          <QrCode className="h-4 w-4" />
          QR Yoklama Oku
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {programs.length === 0 ? (
          <div className="glass-panel rounded-3xl p-20 text-center">
            <p className="text-muted-foreground">Henuz erisebilir bir program gorunmuyor.</p>
            <Link href="/projects" className="mt-4 inline-block font-bold text-primary hover:underline">
              Programlari Incele
            </Link>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center text-muted-foreground">
            Bu filtrede program bulunamadi.
          </div>
        ) : (
          filteredPrograms.map((program, index) => (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="glass-panel rounded-3xl p-6 transition-all hover:border-primary/40 md:p-8"
            >
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {program.project?.name || "Program"}
                    </span>
                    {program.period?.name ? (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        {program.period.name}
                      </span>
                    ) : null}
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      {statusLabels[program.status] || program.status}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900">{program.title}</h3>
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

                  {(program.status === "scheduled" || program.status === "active") && (
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90"
                    >
                      <QrCode className="h-4 w-4" />
                      Bu Program Icin QR Okut
                    </button>
                  )}
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
                        : program.status === "completed"
                          ? "Bu oturum icin gecerli yoklama kaydin bulunmuyor."
                          : "Oturum basladiginda QR yoklama alinabilir."}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl border border-border/60 bg-white p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                        <MinusCircle className="h-4 w-4" />
                        Puan
                      </div>
                      <div className="text-sm font-bold text-slate-900">{creditText(program)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Net etki: {(program.credit?.net_amount ?? 0).toLocaleString("tr-TR")} puan
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-white p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                        {program.credit?.restored ? <ShieldCheck className="h-4 w-4" /> : <MessageSquareText className="h-4 w-4" />}
                        Degerlendirme
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {program.feedback_submitted
                          ? "Gonderildi"
                          : program.attendance_status === "present" && program.status === "completed"
                            ? "Degerlendirme bekleniyor"
                            : "Gerekli degil"}
                      </div>
                      {program.attendance_status === "present" && program.status === "completed" && !program.feedback_submitted ? (
                        <Link href="/student/evaluate" className="mt-2 inline-block text-xs font-bold text-primary hover:underline">
                          Degerlendirmeye git
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {scannerOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-border/60 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">QR Yoklama</h2>
                    <p className="text-sm text-muted-foreground">Program ekranindaki QR kodu okut.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeScanner}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Kapat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                {scanStatus === "idle" ? (
                  <div className="space-y-5">
                    <div
                      id="student-program-qr-reader"
                      className="overflow-hidden rounded-2xl border border-border bg-slate-950"
                    />
                    <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold uppercase tracking-widest">
                      <span className={location ? "text-emerald-600" : "text-amber-600"}>
                        {location ? "Konum alindi" : "Konum bekleniyor"}
                      </span>
                      <span className="text-primary">Guvenli yoklama</span>
                    </div>
                    {scanMessage ? (
                      <p className="text-center text-sm text-amber-600">{scanMessage}</p>
                    ) : null}
                  </div>
                ) : null}

                {scanStatus === "loading" ? (
                  <div className="py-16 text-center">
                    <Loader2 className="mx-auto mb-5 h-14 w-14 animate-spin text-primary" />
                    <h3 className="text-xl font-black text-slate-900">Yoklama isleniyor</h3>
                    <p className="mt-2 text-sm text-muted-foreground">QR ve konum bilgisi dogrulaniyor.</p>
                  </div>
                ) : null}

                {scanStatus === "success" ? (
                  <div className="py-16 text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">Yoklama alindi</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{scanMessage}</p>
                    <button
                      type="button"
                      onClick={closeScanner}
                      className="mt-7 rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground"
                    >
                      Tamam
                    </button>
                  </div>
                ) : null}

                {scanStatus === "error" ? (
                  <div className="py-16 text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-600">
                      <XCircle className="h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">Yoklama alinamadi</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{scanMessage}</p>
                    {feedbackBlock ? (
                      <div className="mt-6 space-y-3">
                        {feedbackBlock.program_title ? (
                          <p className="text-sm font-semibold text-slate-900">Bekleyen oturum: {feedbackBlock.program_title}</p>
                        ) : null}
                        <Link
                          href={feedbackBlock.redirect_to || "/student/feedback"}
                          onClick={closeScanner}
                          className="inline-flex rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground"
                        >
                          Degerlendirmeye Git
                        </Link>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          closeScanner();
                          window.setTimeout(() => setScannerOpen(true), 100);
                        }}
                        className="mt-7 rounded-xl border border-border px-8 py-3 text-sm font-bold text-slate-900"
                      >
                        Tekrar Dene
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}


