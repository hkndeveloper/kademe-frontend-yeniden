"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, RefreshCw, Clock, ShieldCheck, Loader2, Square } from "lucide-react";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";

interface QrResponse {
  qr_token: string;
  expires_at: string;
  refresh_in_seconds: number;
}

export default function CoordinatorQrPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [refreshSeconds, setRefreshSeconds] = useState(30);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const programTitle = searchParams.get("title") || `Program #${params.id}`;

  const generateQr = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await api.post<QrResponse>(`/admin/programs/${params.id}/generate-qr`);
      setToken(response.data.qr_token);
      setRefreshSeconds(response.data.refresh_in_seconds || 30);
      setTimeLeft(response.data.refresh_in_seconds || 30);
      setErrorMessage(null);
    } catch (error) {
      console.error("QR token olusturulamadi", error);
      setErrorMessage("QR kod olusturulamadi. Programin aktif donemi ve yetkilerini kontrol edin.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void generateQr(true);
    }, 0);

    return () => clearTimeout(timer);
  }, [generateQr]);

  useEffect(() => {
    if (!token) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          void generateQr(false);
          return refreshSeconds;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [generateQr, refreshSeconds, token]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await api.post(`/admin/programs/${params.id}/complete`);
      router.push("/coordinator/programs");
    } catch (error) {
      console.error("Program tamamlanamadi", error);
      setErrorMessage("Yoklama kapatilamadi. Lutfen tekrar deneyin.");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <PermissionGate
      permissions={["programs.qr.manage", "programs.view"]}
      require="any"
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] p-6">
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-center text-sm text-amber-100">
            QR yoklamasi icin yetkiniz bulunmuyor.
          </div>
        </div>
      }
    >
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#0a0a0b] p-6">
      <div className="absolute top-1/2 left-1/2 -z-10 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[180px]" />

      <div className="flex w-full max-w-4xl flex-col items-center">
        <div className="mb-10 flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <button
            onClick={() => router.push("/coordinator/programs")}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
            Programlara Don
          </button>

          <div className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-accent">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-black uppercase tracking-widest">Guvenli Yoklama Aktif</span>
          </div>

          <div className="text-left md:text-right">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Program</p>
            <h2 className="text-xl font-black text-slate-900">{decodeURIComponent(programTitle)}</h2>
          </div>
        </div>

        {errorMessage && <div className="mb-6 w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorMessage}</div>}

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel relative rounded-[40px] bg-white p-12 shadow-[0_0_100px_rgba(var(--accent),0.2)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={token}
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: -90 }}
              transition={{ duration: 0.4 }}
            >
              {token && <QRCodeSVG value={token} size={400} level="H" includeMargin={false} fgColor="#000000" />}
            </motion.div>
          </AnimatePresence>

          <div className="absolute -top-4 -left-4 h-12 w-12 rounded-tl-2xl border-t-4 border-l-4 border-accent" />
          <div className="absolute -top-4 -right-4 h-12 w-12 rounded-tr-2xl border-t-4 border-r-4 border-accent" />
          <div className="absolute -bottom-4 -left-4 h-12 w-12 rounded-bl-2xl border-b-4 border-l-4 border-accent" />
          <div className="absolute -bottom-4 -right-4 h-12 w-12 rounded-br-2xl border-b-4 border-r-4 border-accent" />
        </motion.div>

        <div className="mt-12 grid w-full max-w-2xl grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/5 bg-white/5 p-5 text-center">
            <div className="mb-2 flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Kalan Sure</span>
            </div>
            <div className="text-3xl font-black text-accent">{timeLeft}s</div>
          </div>

          <button
            onClick={() => void generateQr(false)}
            disabled={refreshing}
            className="flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/5 p-5 text-center transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="mb-2 h-6 w-6 animate-spin text-accent" /> : <RefreshCw className="mb-2 h-6 w-6 text-accent" />}
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">QR Yenile</span>
          </button>

          <button
            onClick={() => void handleComplete()}
            disabled={completing}
            className="flex flex-col items-center justify-center rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-center transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {completing ? <Loader2 className="mb-2 h-6 w-6 animate-spin text-red-400" /> : <Square className="mb-2 h-6 w-6 text-red-400" />}
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-300">Yoklamayi Bitir</span>
          </button>
        </div>

        <p className="mt-12 max-w-2xl text-center text-sm text-muted-foreground">
          Ogrenciler mobil cihazlarindan bu QR kodu okutup yoklama verebilir. Kod guvenlik icin backend tarafinin belirledigi sure sonunda otomatik yenilenir.
        </p>
      </div>
    </div>
    </PermissionGate>
  );
}
