"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { ChevronLeft, Loader2, RefreshCw } from "lucide-react";
import api from "@/lib/api/axios";

export default function CoordinatorProgramQrPage() {
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
      setScanUrl(`${window.location.origin}/student/qr-scan?token=${encodeURIComponent(res.data.qr_token)}`);
      setRefreshIn(res.data.refresh_in_seconds ?? 30);
    } catch {
      setError("QR uretilemedi. Yetki ve proje kapsamini kontrol edin (programs.qr.manage).");
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <Link href="/panel/programs" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-white">
        <ChevronLeft className="h-4 w-4" />
        Programlara don
      </Link>

      <div>
        <h1 className="text-3xl font-black text-white">QR yoklama</h1>
        <p className="mt-2 text-sm text-muted-foreground">{title}</p>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : null}

      {error ? <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">{error}</div> : null}

      {token && !loading ? (
        <div className="flex max-w-lg flex-col items-center gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <QRCodeSVG value={scanUrl ?? token} size={280} className="rounded-2xl bg-white p-3" />
          <p className="text-center text-xs text-muted-foreground">
            QR artik dogrudan ogrencinin kamera acilan sayfasina gider. Sunucu rotasyonu: {refreshIn} sn; gerekirse yenileyin.
          </p>
          <div className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-[10px] text-muted-foreground break-all">
            Token: {token}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            Kodu yenile
          </button>
        </div>
      ) : null}
    </div>
  );
}
