"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { ChevronLeft, Clock3, Loader2, QrCode, RefreshCcw, ShieldCheck, Smartphone } from "lucide-react";
import api from "@/lib/api/axios";

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
  const [scanUrl, setScanUrl] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(programId) || programId <= 0) {
      setError("Gecersiz program.");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ qr_token: string; refresh_in_seconds?: number }>(`/panel/programs/${programId}/generate-qr`);
      setToken(res.data.qr_token);
      setScanUrl(`${window.location.origin}/student/programs?token=${encodeURIComponent(res.data.qr_token)}`);
      setRefreshIn(res.data.refresh_in_seconds ?? 30);
      setGeneratedAt(new Date());
    } catch {
      setError("QR uretilemedi. Yetki ve proje kapsamini kontrol edin (programs.qr.manage).");
      setToken(null);
    } finally {
      setLoading(false);
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

          <aside className="space-y-4">
            <div className="glass-panel rounded-3xl p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-500">Yenileme</div>
                  <div className="text-2xl font-black text-slate-950">{refreshIn} sn</div>
                </div>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Kod bu sure sonunda otomatik olarak yeniden uretilir. Eski kodlar kisa sure sonra gecersiz kalir.
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
