"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Award, CheckCircle2, Download, ExternalLink, Loader2, Search, ShieldCheck } from "lucide-react";
import api from "@/lib/api/axios";
import { downloadBlobResponse } from "@/lib/download";

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

const typeLabels: Record<string, string> = {
  participation: "Katilim Belgesi",
  graduation: "Mezuniyet Sertifikasi",
  achievement: "Basari Sertifikasi",
};

function formatDate(value?: string | null): string {
  if (!value) return "Belirtilmemis";
  return new Date(value).toLocaleDateString("tr-TR");
}

export default function AlumniCertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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

    window.setTimeout(() => {
      void loadCertificates();
    }, 0);
  }, []);

  const filteredCertificates = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase("tr-TR");
    if (!search) return certificates;

    return certificates.filter((certificate) => {
      const haystack = [
        certificate.verification_code,
        certificate.type,
        typeLabels[certificate.type],
        certificate.project?.name,
        certificate.period?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return haystack.includes(search);
    });
  }, [certificates, searchTerm]);

  const handleDownload = async (certificate: CertificateItem) => {
    if (!certificate.download_url) return;

    setDownloadingId(certificate.id);
    setErrorMessage(null);

    try {
      const endpoint = certificate.download_url.replace(/^.*\/api/, "");
      const response = await api.get(endpoint, { responseType: "blob" });
      await downloadBlobResponse(response.data, response.headers, `sertifika_${certificate.verification_code}`);
    } catch (error) {
      console.error("Sertifika indirilemedi", error);
      setErrorMessage("Sertifika indirilemedi.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-500">
            <Award className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Sertifikalarim</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Mezun portalindaki KADEME belgelerin</p>
          </div>
        </div>

        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Kod, proje veya belge ara"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Toplam Belge" value={certificates.length} />
        <SummaryCard label="Mezuniyet" value={certificates.filter((item) => item.type === "graduation").length} />
        <SummaryCard label="Dogrulanabilir" value={certificates.filter((item) => item.verification_code).length} />
      </div>

      {errorMessage ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{errorMessage}</div> : null}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : filteredCertificates.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-muted-foreground">
          {certificates.length === 0 ? "Hesabina tanimli sertifika bulunmuyor." : "Aramana uygun sertifika bulunamadi."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredCertificates.map((certificate) => (
            <div key={certificate.id} className="glass-panel rounded-3xl p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-600/10 text-purple-500">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{typeLabels[certificate.type] ?? certificate.type}</h3>
                      <span className="rounded-full bg-purple-600/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-purple-500">
                        {certificate.project?.name || "KADEME"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-3">
                      <span>Kod: {certificate.verification_code}</span>
                      <span>Donem: {certificate.period?.name || "-"}</span>
                      <span>Tarih: {formatDate(certificate.issued_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {certificate.download_url ? (
                    <button
                      type="button"
                      onClick={() => void handleDownload(certificate)}
                      disabled={downloadingId === certificate.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
                    >
                      {downloadingId === certificate.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Indir
                    </button>
                  ) : null}
                  <Link
                    href={`/certificates/verify?code=${encodeURIComponent(certificate.verification_code)}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-white/70"
                  >
                    Dogrula
                    <ExternalLink className="h-4 w-4" />
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

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-purple-500" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-slate-900">{value}</div>
    </div>
  );
}
