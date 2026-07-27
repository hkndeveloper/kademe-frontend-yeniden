"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Award, CheckCircle2, Download, ExternalLink, Loader2, Search, ShieldCheck, Upload } from "lucide-react";
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
  title?: string | null;
  issuer?: string | null;
  source?: string | null;
  included_in_cv?: boolean | null;
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

export default function StudentCertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ title: "", issuer: "", issued_at: "", included_in_cv: true });

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


  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!uploadFile) {
      setErrorMessage("Sertifika dosyasi secmelisiniz.");
      return;
    }

    const formData = new FormData();
    formData.append("title", uploadForm.title);
    formData.append("issuer", uploadForm.issuer);
    if (uploadForm.issued_at) formData.append("issued_at", uploadForm.issued_at);
    formData.append("included_in_cv", uploadForm.included_in_cv ? "1" : "0");
    formData.append("certificate_file", uploadFile);

    setUploading(true);
    try {
      await api.post("/certificates", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const response = await api.get<{ certificates: CertificateItem[] }>("/certificates");
      setCertificates(response.data.certificates ?? []);
      setUploadForm({ title: "", issuer: "", issued_at: "", included_in_cv: true });
      setUploadFile(null);
      setSuccessMessage("Sertifika yuklendi ve CV secimlerinde kullanilabilir hale geldi.");
    } catch (error) {
      console.error("Sertifika yuklenemedi", error);
      setErrorMessage("Sertifika yuklenemedi. Baslik, kurum ve dosya alanlarini kontrol edin.");
    } finally {
      setUploading(false);
    }
  };
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
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <Award className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Sertifikalarim</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">KADEME belgeleri ve dogrulama kodlari</p>
          </div>
        </div>

        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Kod, proje veya belge ara"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Toplam Belge" value={certificates.length} />
        <SummaryCard label="Mezuniyet" value={certificates.filter((item) => item.type === "graduation").length} />
        <SummaryCard label="Dogrulanabilir" value={certificates.filter((item) => item.verification_code).length} />
      </div>

      {successMessage ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}
      {errorMessage ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{errorMessage}</div> : null}
      <form onSubmit={handleUpload} className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-600">
          <Upload className="h-4 w-4 text-primary" />
          Yeni sertifika yukle
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            required
            value={uploadForm.title}
            onChange={(event) => setUploadForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Sertifika adi"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            required
            value={uploadForm.issuer}
            onChange={(event) => setUploadForm((current) => ({ ...current, issuer: event.target.value }))}
            placeholder="Veren kurum"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            type="date"
            value={uploadForm.issued_at}
            onChange={(event) => setUploadForm((current) => ({ ...current, issued_at: event.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            required
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-primary"
          />
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={uploadForm.included_in_cv}
              onChange={(event) => setUploadForm((current) => ({ ...current, included_in_cv: event.target.checked }))}
            />
            CV secimlerine dahil edilsin
          </label>
          <button type="submit" disabled={uploading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-70">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Yukle
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{certificate.title || typeLabels[certificate.type] || certificate.type}</h3>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                        {certificate.issuer || certificate.project?.name || "KADEME"}
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
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-70"
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
        <CheckCircle2 className="h-4 w-4 text-primary" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-slate-900">{value}</div>
    </div>
  );
}
