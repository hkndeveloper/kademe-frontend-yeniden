"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import api from "@/lib/api/axios";

interface CertificateItem {
  id: number;
  type: string;
  verification_code: string;
  issued_at?: string | null;
  download_url?: string | null;
  project?: {
    id: number;
    name: string;
  } | null;
  period?: {
    id: number;
    name?: string | null;
  } | null;
}

export default function StudentCertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadCertificates = async () => {
      try {
        const response = await api.get<{ certificates: CertificateItem[] }>("/certificates");
        setCertificates(response.data.certificates ?? []);
      } catch (error) {
        console.error("Sertifikalar yuklenemedi", error);
        setErrorMessage("Sertifikalar yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadCertificates();
  }, []);

  const handleDownload = async (certificate: CertificateItem) => {
    if (!certificate.download_url) return;

    try {
      const endpoint = certificate.download_url.replace(/^.*\/api/, "");
      const response = await api.get(endpoint, { responseType: "blob" });
      const contentType = String(response.headers["content-type"] ?? "");

      if (contentType.includes("application/json")) {
        const payload = JSON.parse(await response.data.text()) as { download_url?: string; message?: string };
        if (payload.download_url) {
          window.open(payload.download_url, "_blank", "noopener,noreferrer");
          return;
        }
        throw new Error(payload.message ?? "Sertifika indirilemedi.");
      }

      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `sertifika_${certificate.verification_code}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Sertifika indirilemedi", error);
      setErrorMessage("Sertifika indirilemedi.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <Award className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900">Sertifikalarim</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Sertifika listesi ve dogrulama kodlari artik backend&apos;den geliyor</p>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-8">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-lg font-bold text-slate-900">Canli Sertifika Akisi</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Bu ekran artik <code>/certificates</code> endpointine bagli. Her sertifika icin dogrulama kodu, proje ve indirme baglantisi gosteriliyor.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : errorMessage ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorMessage}</div>
      ) : certificates.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-muted-foreground">Hesabina tanimli sertifika bulunmuyor.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {certificates.map((certificate) => (
            <div key={certificate.id} className="glass-panel rounded-3xl p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-900">{certificate.type}</h3>
                    {certificate.project?.name && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                        {certificate.project.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Dogrulama kodu: {certificate.verification_code}</p>
                  <p className="text-sm text-muted-foreground">
                    Donem: {certificate.period?.name || "Donem bilgisi yok"} • Tarih:{" "}
                    {certificate.issued_at ? new Date(certificate.issued_at).toLocaleDateString("tr-TR") : "Belirtilmemis"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {certificate.download_url && (
                    <button
                      type="button"
                      onClick={() => void handleDownload(certificate)}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
                    >
                      Belgeyi Ac <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                  <Link href={`/certificates/verify?code=${encodeURIComponent(certificate.verification_code)}`} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-white/5">
                    Dogrula
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
