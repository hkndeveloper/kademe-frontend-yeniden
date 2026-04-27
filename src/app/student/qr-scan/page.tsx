"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Html5QrcodeScanner } from "html5-qrcode";
import { CheckCircle2, Loader2, MapPin, QrCode, ShieldAlert, XCircle } from "lucide-react";
import api from "@/lib/api/axios";

export default function QrScanPage() {
  const [isScanning, setIsScanning] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    const submitAttendance = async (qrToken: string) => {
      const currentLocation = locationRef.current;

      if (!currentLocation) {
        setStatus("error");
        setMessage("Konum verisi alınamadı. Lütfen sayfayı yenileyip konum izni verin.");
        return;
      }

      setStatus("loading");
      try {
        const response = await api.post("/attendances/qr", {
          qr_token: qrToken,
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
        });

        setStatus("success");
        setMessage(response.data.message || "Yoklamanız başarıyla alındı!");
      } catch (error: unknown) {
        const nextMessage =
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
            ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
            : "Yoklama işlemi başarısız oldu.";

        setStatus("error");
        setMessage(nextMessage ?? "Yoklama işlemi başarısız oldu.");
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setMessage("Yoklama için konum izni vermeniz zorunludur."),
        { enableHighAccuracy: true }
      );
    }

    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);

    scanner.render(
      (decodedText) => {
        void scanner.clear();
        setIsScanning(false);
        void submitAttendance(decodedText);
      },
      () => {}
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        void scannerRef.current.clear();
      }
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl py-10">
      <div className="mb-10 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <QrCode className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">QR Yoklama</h1>
          <p className="text-sm text-muted-foreground">Etkinlik ekranındaki kodu okutun.</p>
        </div>
      </div>

      <div className="glass-panel relative overflow-hidden rounded-3xl p-8 text-center">
        <AnimatePresence mode="wait">
          {status === "idle" && isScanning && (
            <motion.div key="scanner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative">
              <div id="reader" className="mb-8 overflow-hidden rounded-2xl border-2 border-primary/20 bg-black/40" />

              <div className="pointer-events-none absolute top-0 left-0 z-10 h-full w-full overflow-hidden rounded-2xl">
                <motion.div
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 h-0.5 w-full bg-primary/60 shadow-[0_0_15px_rgba(var(--primary),1)]"
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-primary" />
                Kamera taranıyor...
              </div>
            </motion.div>
          )}

          {status === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-20">
              <Loader2 className="mx-auto mb-6 h-16 w-16 animate-spin text-primary" />
              <h2 className="text-xl font-bold">Yoklama İşleniyor</h2>
              <p className="text-muted-foreground">Konumunuz ve QR verisi doğrulanıyor...</p>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-20">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h2 className="mb-2 text-2xl font-bold">Başarılı!</h2>
              <p className="mb-8 text-muted-foreground">{message}</p>
              <button onClick={() => window.location.reload()} className="rounded-xl bg-primary px-8 py-3 font-bold text-primary-foreground">
                Tamam
              </button>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-20">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                <XCircle className="h-12 w-12" />
              </div>
              <h2 className="mb-2 text-2xl font-bold">Hata Oluştu</h2>
              <p className="mb-8 text-muted-foreground">{message}</p>
              <button onClick={() => window.location.reload()} className="rounded-xl border border-border px-8 py-3 font-bold">
                Tekrar Dene
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-center gap-6 border-t border-border/40 pt-8">
          <div className={`flex items-center gap-2 text-xs font-bold ${location ? "text-green-500" : "text-yellow-500"}`}>
            <MapPin className="h-4 w-4" />
            {location ? "KONUM ALINDI" : "KONUM BEKLENİYOR"}
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <ShieldAlert className="h-4 w-4" />
            GÜVENLİ BAĞLANTI
          </div>
        </div>
      </div>
    </div>
  );
}
