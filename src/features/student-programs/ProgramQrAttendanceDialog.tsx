"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Html5QrcodeScanType, Html5QrcodeScanner } from "html5-qrcode";
import { CheckCircle2, Loader2, QrCode, X, XCircle } from "lucide-react";
import api from "@/lib/api/axios";
import type { StudentProgram } from "@/features/student-programs/program-model";

type ScanStatus = "idle" | "loading" | "success" | "error";

type FeedbackBlock = {
  program_id?: number;
  program_title?: string;
  redirect_to?: string;
};

type ProgramQrAttendanceDialogProps = {
  program: StudentProgram;
  open: boolean;
  onClose: () => void;
  onAttendanceRecorded: () => Promise<void>;
};

export function ProgramQrAttendanceDialog({ program, open, onClose, onAttendanceRecorded }: ProgramQrAttendanceDialogProps) {
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanMessage, setScanMessage] = useState("");
  const [feedbackBlock, setFeedbackBlock] = useState<FeedbackBlock | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [scannerAttempt, setScannerAttempt] = useState(0);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const extractToken = useCallback((raw: string): string => {
    const value = raw.trim();
    if (!value) return "";
    try {
      const url = new URL(value);
      return url.searchParams.get("token")?.trim() || value;
    } catch {
      return value;
    }
  }, []);

  const closeDialog = useCallback(() => {
    if (scannerRef.current) {
      void scannerRef.current.clear();
      scannerRef.current = null;
    }
    submittedRef.current = false;
    setScanStatus("idle");
    setScanMessage("");
    setFeedbackBlock(null);
    onClose();
  }, [onClose]);

  const submitAttendance = useCallback(
    async (rawToken: string) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      const qrToken = extractToken(rawToken);
      const currentLocation = locationRef.current;

      if (!qrToken) {
        setScanStatus("error");
        setScanMessage("QR kod geçersiz. Lütfen tekrar okutun.");
        submittedRef.current = false;
        return;
      }

      if (!currentLocation) {
        setScanStatus("error");
        setScanMessage("Konum verisi alınamadı. Konum izni verip tekrar deneyin.");
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
        setScanMessage(response.data.message || "Yoklaman başarıyla alındı.");
        await onAttendanceRecorded();
      } catch (error: unknown) {
        const payload =
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: unknown } }).response?.data === "object"
            ? (error as {
                response?: {
                  data?: {
                    message?: string;
                    requires_feedback?: boolean;
                    program_id?: number;
                    program_title?: string;
                    redirect_to?: string;
                  };
                };
              }).response?.data
            : null;

        setScanStatus("error");
        setScanMessage(payload?.message ?? "Yoklama işlemi başarısız oldu.");
        setFeedbackBlock(
          payload?.requires_feedback
            ? {
                program_id: payload.program_id,
                program_title: payload.program_title,
                redirect_to: payload.redirect_to,
              }
            : null,
        );
        submittedRef.current = false;
      }
    },
    [extractToken, onAttendanceRecorded],
  );

  useEffect(() => {
    if (!open) return undefined;

    window.setTimeout(() => {
      setScanStatus("idle");
      setScanMessage("");
      setFeedbackBlock(null);
      setLocation(null);
    }, 0);
    submittedRef.current = false;
    locationRef.current = null;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => setScanMessage("Yoklama için konum izni vermen zorunludur."),
        { enableHighAccuracy: true },
      );
    }

    const scanner = new Html5QrcodeScanner(
      "student-program-detail-qr-reader",
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
  }, [open, scannerAttempt, submitAttendance]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="relative z-[2010] w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="program-qr-title"
          >
            <div className="flex items-start justify-between border-b border-border/60 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <h2 id="program-qr-title" className="text-xl font-black text-slate-900">QR Yoklama</h2>
                  <p className="text-sm text-muted-foreground">{program.title} için QR kodu okut.</p>
                </div>
              </div>
              <button type="button" onClick={closeDialog} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Kapat">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {scanStatus === "idle" ? (
                <div className="space-y-5">
                  <div id="student-program-detail-qr-reader" className="overflow-hidden rounded-2xl border border-border bg-slate-950" />
                  <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold uppercase tracking-widest">
                    <span className={location ? "text-emerald-600" : "text-blue-600"}>{location ? "Konum alındı" : "Konum bekleniyor"}</span>
                    <span className="text-primary">Güvenli yoklama</span>
                  </div>
                  {scanMessage ? <p className="text-center text-sm text-red-600">{scanMessage}</p> : null}
                </div>
              ) : null}

              {scanStatus === "loading" ? (
                <div className="py-16 text-center">
                  <Loader2 className="mx-auto mb-5 h-14 w-14 animate-spin text-primary" />
                  <h3 className="text-xl font-black text-slate-900">Yoklama işleniyor</h3>
                  <p className="mt-2 text-sm text-muted-foreground">QR ve konum bilgisi doğrulanıyor.</p>
                </div>
              ) : null}

              {scanStatus === "success" ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Yoklama alındı</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{scanMessage}</p>
                  <button type="button" onClick={closeDialog} className="mt-7 rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground">
                    Tamam
                  </button>
                </div>
              ) : null}

              {scanStatus === "error" ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-600">
                    <XCircle className="h-10 w-10" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Yoklama alınamadı</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{scanMessage}</p>
                  {feedbackBlock ? (
                    <div className="mt-6 space-y-3">
                      {feedbackBlock.program_title ? <p className="text-sm font-semibold text-slate-900">Bekleyen oturum: {feedbackBlock.program_title}</p> : null}
                      <Link
                        href={feedbackBlock.redirect_to || (feedbackBlock.program_id ? `/student/evaluate?program_id=${feedbackBlock.program_id}` : "/student/evaluate")}
                        onClick={closeDialog}
                        className="inline-flex rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground"
                      >
                        Değerlendirmeye Git
                      </Link>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setScanStatus("idle");
                        setScanMessage("");
                        submittedRef.current = false;
                        setScannerAttempt((current) => current + 1);
                      }}
                      className="mt-7 rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold text-white"
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
  );
}
