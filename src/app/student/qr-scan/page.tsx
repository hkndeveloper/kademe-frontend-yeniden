"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Html5QrcodeScanType, Html5QrcodeScanner } from "html5-qrcode";
import { AlertCircle, Calendar, CheckCircle2, Clock, Loader2, MapPin, QrCode, RefreshCw, ShieldAlert, X, XCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import api from "@/lib/api/axios";

interface Program {
  id: number;
  title: string;
  start_at?: string | null;
  end_at?: string | null;
  status?: "scheduled" | "active" | "completed" | string;
  location?: string | null;
  attendance_status?: "present" | "invalid" | "absent" | "pending";
  radius_meters?: number | null;
  credit_deduction?: number | null;
  project?: {
    id: number;
    name: string;
  } | null;
}

type ScanStatus = "idle" | "loading" | "success" | "error";
type LocationState = { lat: number; lng: number; accuracy?: number | null };

function formatDateTime(value?: string | null) {
  if (!value) return "Tarih belirtilmedi";
  return new Date(value).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

export default function QrScanPage() {
  const pathname = usePathname();
  const portalBase = pathname?.startsWith("/alumni") ? "/alumni" : "/student";
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [locationMessage, setLocationMessage] = useState("Konum bekleniyor.");
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const locationRef = useRef<LocationState | null>(null);
  const submittedRef = useRef(false);

  const activePrograms = useMemo(() => programs.filter((program) => program.status === "active"), [programs]);
  const scannablePrograms = useMemo(() => activePrograms.filter((program) => program.attendance_status !== "present"), [activePrograms]);
  const attendedActivePrograms = useMemo(() => activePrograms.filter((program) => program.attendance_status === "present"), [activePrograms]);
  const upcomingPrograms = useMemo(() => programs.filter((program) => program.status === "scheduled").slice(0, 4), [programs]);
  const nearestActiveRadius = scannablePrograms.find((program) => program.radius_meters)?.radius_meters ?? null;
  const locationAccuracyWarning = Boolean(location?.accuracy && nearestActiveRadius && location.accuracy > nearestActiveRadius);

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

  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(null);
      setLocationMessage("Tarayicin konum servisini desteklemiyor.");
      return;
    }

    setLocationMessage("Konum aliniyor...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setLocation(nextLocation);
        setLocationMessage("Konum alindi.");
      },
      () => {
        setLocation(null);
        setLocationMessage("Yoklama icin konum izni zorunludur. Tarayicidan konum izni verip tekrar dene.");
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 },
    );
  }, []);

  const fetchPrograms = useCallback(async () => {
    setLoadingPrograms(true);
    try {
      const response = await api.get<{ programs: Program[] }>("/programs");
      setPrograms(response.data.programs ?? []);
    } catch (error) {
      console.error("QR programlari yuklenemedi", error);
      setMessage("Program bilgileri yuklenemedi.");
      setStatus("error");
    } finally {
      setLoadingPrograms(false);
    }
  }, []);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchPrograms();
      refreshLocation();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchPrograms, refreshLocation]);

  const closeScanner = useCallback(() => {
    if (scannerRef.current) {
      void scannerRef.current.clear();
      scannerRef.current = null;
    }
    submittedRef.current = false;
    setScannerOpen(false);
    setStatus("idle");
    setMessage("");
  }, []);

  const restartScanner = useCallback(() => {
    if (scannerRef.current) {
      void scannerRef.current.clear();
      scannerRef.current = null;
    }
    submittedRef.current = false;
    setScannerOpen(false);
    setStatus("idle");
    setMessage("");
    window.setTimeout(() => setScannerOpen(true), 0);
  }, []);

  const submitAttendance = useCallback(async (rawToken: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const qrToken = extractToken(rawToken);
    const currentLocation = locationRef.current;

    if (!qrToken) {
      setStatus("error");
      setMessage("QR kod gecersiz. Lutfen tekrar okut.");
      submittedRef.current = false;
      return;
    }

    if (!currentLocation) {
      setStatus("error");
      setMessage("Konum verisi alinamadi. Konum izni verip tekrar dene.");
      submittedRef.current = false;
      return;
    }

    setStatus("loading");
    setMessage("Konum ve QR kod dogrulaniyor...");

    try {
      const response = await api.post("/attendances/qr", {
        qr_token: qrToken,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
      });

      setStatus("success");
      setMessage(response.data.message || "Yoklaman basariyla alindi.");
      await fetchPrograms();
    } catch (error: unknown) {
      const axiosErr = error as { response?: { status?: number; data?: { message?: string; redirect_to?: string } } };
      const httpStatus = axiosErr?.response?.status;
      const responseData = axiosErr?.response?.data;

      if (httpStatus === 423) {
        setStatus("error");
        setMessage(responseData?.message || "Yoklama oncesi bekleyen degerlendirme formun var.");
        const redirectTo = responseData?.redirect_to || `${portalBase}/evaluate`;
        window.setTimeout(() => {
          window.location.href = redirectTo;
        }, 3000);
        return;
      }

      setStatus("error");
      setMessage(responseData?.message || "Yoklama islemi basarisiz oldu.");
      submittedRef.current = false;
    }
  }, [extractToken, fetchPrograms, portalBase]);

  useEffect(() => {
    if (!scannerOpen) return undefined;

    const resetTimer = window.setTimeout(() => {
      setStatus("idle");
      setMessage("");
      refreshLocation();
    }, 0);
    submittedRef.current = false;

    const scanner = new Html5QrcodeScanner(
      "participant-qr-reader",
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
      window.clearTimeout(resetTimer);
      if (scannerRef.current) {
        void scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [refreshLocation, scannerOpen, submitAttendance]);

  const startScanner = (program: Program) => {
    setSelectedProgram(program);
    setScannerOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-10">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <QrCode className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">QR Yoklama</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Aktif etkinlik icin guvenli yoklama</p>
          </div>
        </div>

        <button
          type="button"
          onClick={refreshLocation}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Konumu Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatusCard
          icon={<MapPin className="h-5 w-5" />}
          label="Konum"
          value={location ? "Alindi" : "Bekleniyor"}
          detail={location?.accuracy ? `Yaklasik dogruluk: ${Math.round(location.accuracy)} m${nearestActiveRadius ? ` / izinli yaricap: ${nearestActiveRadius} m` : ""}` : locationMessage}
          tone={locationAccuracyWarning ? "amber" : location ? "emerald" : "amber"}
        />
        <StatusCard icon={<QrCode className="h-5 w-5" />} label="Okutulabilir" value={scannablePrograms.length} detail={scannablePrograms.length > 0 ? "Kamera aktif edilebilir" : activePrograms.length > 0 ? "Aktif etkinliklerin yoklamasi alinmis" : "Kamera aktif edilmez"} />
        <StatusCard icon={<ShieldAlert className="h-5 w-5" />} label="Dogrulama" value="Backend" detail="QR token, hedef kitle ve konum backend'de kontrol edilir." />
      </div>

      {loadingPrograms ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : scannablePrograms.length === 0 ? (
        <div className="glass-panel rounded-3xl border border-dashed border-border p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Su anda okutulabilir QR yoklamasi yok</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Kamera sadece aktif, panel turune acik ve henuz yoklamasi alinmamis etkinliklerde acilir. Etkinlik basladiginda ya da yeni QR acildiginda bu ekrandaki buton aktif hale gelir.
                </p>
              </div>
            </div>
          </div>

          {attendedActivePrograms.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {attendedActivePrograms.map((program) => (
                <ProgramCard key={program.id} program={program} actionLabel="Yoklama Alindi" disabled />
              ))}
            </div>
          ) : upcomingPrograms.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {upcomingPrograms.map((program) => (
                <ProgramCard key={program.id} program={program} actionLabel="Henuz Aktif Degil" disabled />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {scannablePrograms.map((program) => (
            <ProgramCard key={program.id} program={program} actionLabel="QR Okut" onAction={() => startScanner(program)} />
          ))}
        </div>
      )}

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
                    <h2 className="text-xl font-black text-slate-900">{selectedProgram?.title || "QR Yoklama"}</h2>
                    <p className="text-sm text-muted-foreground">{selectedProgram?.location || "Etkinlik alanindaki QR kodu okut."}</p>
                  </div>
                </div>
                <button type="button" onClick={closeScanner} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Kapat">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                {status === "idle" ? (
                  <div className="space-y-5">
                    <div id="participant-qr-reader" className="overflow-hidden rounded-2xl border border-border bg-slate-950" />
                    <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold uppercase tracking-widest">
                      <span className={location ? "text-emerald-600" : "text-amber-600"}>{location ? "Konum alindi" : "Konum bekleniyor"}</span>
                      <span className="text-primary">Guvenli yoklama</span>
                    </div>
                    {location?.accuracy ? (
                      <p className={`text-center text-xs ${locationAccuracyWarning ? "text-amber-600" : "text-muted-foreground"}`}>
                        Konum dogrulugu yaklasik {Math.round(location.accuracy)} metre{selectedProgram?.radius_meters ? `; etkinlik yaricapi ${selectedProgram.radius_meters} metre.` : "."}
                      </p>
                    ) : null}
                    {message ? <p className="text-center text-sm text-amber-600">{message}</p> : null}
                  </div>
                ) : null}

                {status === "loading" ? <ResultState icon={<Loader2 className="h-12 w-12 animate-spin" />} title="Yoklama Isleniyor" message={message} tone="primary" /> : null}
                {status === "success" ? <ResultState icon={<CheckCircle2 className="h-12 w-12" />} title="Yoklama Alindi" message={message} tone="emerald" actionLabel="Tamam" onAction={closeScanner} /> : null}
                {status === "error" ? <ResultState icon={<XCircle className="h-12 w-12" />} title="Yoklama Alinamadi" message={message} tone="red" actionLabel="Tekrar Dene" onAction={restartScanner} /> : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function StatusCard({ icon, label, value, detail, tone = "slate" }: { icon: ReactNode; label: string; value: string | number; detail: string; tone?: "slate" | "emerald" | "amber" }) {
  const tones = {
    slate: "border-border bg-background/70 text-slate-900",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-80">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-black">{value}</div>
      <p className="mt-1 text-xs opacity-80">{detail}</p>
    </div>
  );
}

function ProgramCard({ program, actionLabel, disabled = false, onAction }: { program: Program; actionLabel: string; disabled?: boolean; onAction?: () => void }) {
  return (
    <article className="glass-panel rounded-3xl p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">{program.project?.name || "Program"}</span>
            <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{program.status || "Kayit"}</span>
            {program.attendance_status === "present" ? <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">Yoklama alindi</span> : null}
          </div>
          <h2 className="text-xl font-black text-slate-900">{program.title}</h2>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatDateTime(program.start_at)}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{program.end_at ? formatDateTime(program.end_at) : "Bitis belirtilmedi"}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{program.location || "Konum bilgisi yok"}</span>
            {program.radius_meters ? <span className="inline-flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" />Yaricap: {program.radius_meters} m</span> : null}
          </div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onAction}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          <QrCode className="h-4 w-4" />
          {actionLabel}
        </button>
      </div>
    </article>
  );
}

function ResultState({ icon, title, message, tone, actionLabel, onAction }: { icon: ReactNode; title: string; message: string; tone: "primary" | "emerald" | "red"; actionLabel?: string; onAction?: () => void }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    red: "bg-red-500/10 text-red-600",
  };

  return (
    <div className="py-16 text-center">
      <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${tones[tone]}`}>{icon}</div>
      <h3 className="text-2xl font-black text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{message}</p>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="mt-7 rounded-xl border border-border px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-muted">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
