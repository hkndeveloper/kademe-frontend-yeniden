"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Award, ExternalLink, Loader2, Search, ShieldCheck } from "lucide-react";
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

interface VerifyResponse {
  valid: boolean;
  certificate: CertificateItem;
  recipient?: {
    name?: string | null;
    surname?: string | null;
  } | null;
}

function CertificateVerifyContent() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const verifyCertificate = async (verificationCode: string) => {
    if (!verificationCode.trim()) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.get<VerifyResponse>(`/certificates/verify/${encodeURIComponent(verificationCode.trim())}`);
      setResult(response.data);
    } catch (error) {
      console.error("Sertifika dogrulanamadi", error);
      setResult(null);
      setErrorMessage("Bu dogrulama kodu ile eslesen bir sertifika bulunamadi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialCode = searchParams.get("code");
    if (initialCode) {
      const timer = setTimeout(() => {
        void verifyCertificate(initialCode);
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await verifyCertificate(code);
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-16">
      <div className="container mx-auto max-w-5xl px-6">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Award className="h-8 w-8" />
          </div>
          <h1 className="mb-4 text-4xl font-black text-foreground md:text-5xl">Sertifika Dogrulama</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">Katilim belgesi ve sertifikalar icin ziyaretci dogrulama ekrani artik backend verify endpoint&apos;ine bagli.</p>
        </div>

        <div className="glass-panel rounded-[40px] p-8 md:p-10">
          <form onSubmit={(event) => void handleSubmit(event)} className="grid grid-cols-1 gap-6 md:grid-cols-[1fr,auto]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                type="text"
                placeholder="Sertifika ID veya verification code girin"
                className="w-full rounded-2xl border border-border bg-input py-4 pl-12 pr-4 text-sm outline-none"
              />
            </div>
            <button type="submit" disabled={loading || !code.trim()} className="rounded-2xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Dogrula"}
            </button>
          </form>

          {errorMessage && (
            <div className="mt-8 flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {result && (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-border bg-muted/30 p-6">
                <div className="mb-3 flex items-center gap-2 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                  <h2 className="text-lg font-bold text-foreground">Dogrulama Sonucu</h2>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>Durum: {result.valid ? "Gecerli" : "Gecersiz"}</div>
                  <div>Belge tipi: {result.certificate.type}</div>
                  <div>Kod: {result.certificate.verification_code}</div>
                  <div>
                    Katilimci: {result.recipient?.name || "-"} {result.recipient?.surname || ""}
                  </div>
                  <div>Proje: {result.certificate.project?.name || "Belirtilmemis"}</div>
                  <div>Donem: {result.certificate.period?.name || "Belirtilmemis"}</div>
                  <div>
                    Tarih: {result.certificate.issued_at ? new Date(result.certificate.issued_at).toLocaleDateString("tr-TR") : "Belirtilmemis"}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-muted/30 p-6">
                <h2 className="mb-3 text-lg font-bold text-foreground">Baglantili Ekranlar</h2>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <Link href="/student/certificates" className="block hover:text-primary">Ogrenci Sertifikalari</Link>
                  <Link href="/alumni/certificates" className="block hover:text-primary">Mezun Sertifikalari</Link>
                  {result.certificate.download_url && (
                    <a href={result.certificate.download_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground transition-opacity hover:opacity-90">
                      Belgeyi Ac <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CertificateVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <CertificateVerifyContent />
    </Suspense>
  );
}
