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

export default function AlumniCertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadCertificates = async () => {
      try {
        const response = await api.get<{ certificates: CertificateItem[] }>("/certificates");
        setCertificates(response.data.certificates ?? []);
      } catch (error) {
        console.error("Mezun sertifikalari yuklenemedi", error);
        setErrorMessage("Sertifikalar yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadCertificates();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400">
          <Award className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900">Sertifikalarim</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Mezun sertifikalari da artik backend&apos;den listeleniyor</p>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-8">
        <div className="mb-4 flex items-center gap-2 text-purple-400">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-lg font-bold text-slate-900">Canli Sertifika Akisi</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Bu ekran <code>/certificates</code> endpointine bagli. Mezun kullanici kendi belge listesini, dogrulama kodunu ve indirme baglantisini gorebilir.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
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
                      <span className="rounded-full bg-purple-600/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-purple-400">
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
                    <a
                      href={certificate.download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold text-white"
                    >
                      Belgeyi Ac <ExternalLink className="h-4 w-4" />
                    </a>
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
