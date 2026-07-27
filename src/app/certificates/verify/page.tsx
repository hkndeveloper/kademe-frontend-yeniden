"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Award, ExternalLink, Loader2, Search, ShieldCheck } from "lucide-react";
import { PublicBadge, PublicButton, PublicCard, PublicGradientTitle, PublicIconBadge } from "@/components/public";
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
      console.error("Sertifika doğrulanamadı", error);
      setResult(null);
      setErrorMessage("Bu doğrulama kodu ile eşleşen bir sertifika bulunamadı.");
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

  const handleDownload = async (certificate: CertificateItem) => {
    if (!certificate.download_url) return;

    try {
      const endpoint = certificate.download_url.replace(/^.*\/api/, "");
      const response = await api.get(endpoint, { responseType: "blob" });
      await downloadBlobResponse(response.data, response.headers, `sertifika_${certificate.verification_code}`);
    } catch (error) {
      console.error("Sertifika indirilemedi", error);
      setErrorMessage("Sertifika indirilemedi.");
    }
  };

  return (
    <main className="kdm-public-shell relative min-h-screen overflow-hidden bg-[#edecec] pb-24">
      <section className="relative isolate overflow-hidden px-4 pb-12 pt-36 sm:px-6 sm:pt-40 lg:pt-44">
        <div className="absolute inset-x-4 bottom-0 top-4 -z-10 overflow-hidden rounded-[2rem] bg-[#e7e7e4] sm:inset-x-6 lg:inset-x-10">
          <Image src="/aigocy/images/section/hero-1.jpg" alt="" fill priority className="object-cover opacity-55" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.92),transparent_20rem),radial-gradient(circle_at_82%_18%,rgba(253,58,37,0.15),transparent_17rem),linear-gradient(180deg,rgba(255,255,255,0.4),rgba(231,231,228,0.9))]" />
          <div className="absolute -left-24 top-28 h-96 w-96 rounded-full border border-white/80 opacity-70" />
          <div className="absolute -right-16 top-16 h-80 w-80 rounded-full border border-white/80 opacity-70" />
        </div>

        <div className="container relative z-10 mx-auto">
          <div className="mx-auto max-w-5xl text-center">
            <PublicIconBadge className="mx-auto mb-6 h-16 w-16 bg-orange-600">
              <Award className="h-8 w-8" />
            </PublicIconBadge>
            <PublicBadge className="mb-6 border-white/80 bg-white/90 text-[#fd3a25] shadow-[0_4px_12px_rgba(9,9,11,0.10)]">Belge Kontrolü</PublicBadge>
            <h1 className="text-balance text-5xl font-semibold leading-[0.95] tracking-normal text-[#2f3437] sm:text-6xl lg:text-8xl">
              <PublicGradientTitle>Sertifika Doğrulama</PublicGradientTitle>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-[#3f4653] sm:text-lg">
              KADEME tarafından verilen sertifika ve katılım belgelerini doğrulama koduyla kontrol edebilirsiniz.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-5xl">
          <PublicCard className="p-5 sm:p-8 lg:p-10">

            <form onSubmit={(event) => void handleSubmit(event)} className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
              <label className="relative block">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  name="verification_code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  type="text"
                  placeholder="Sertifika ID veya doğrulama kodu girin"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                />
              </label>
              <PublicButton type="submit" disabled={loading || !code.trim()} variant="dark" size="lg" icon={loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />} iconPosition="left">
                Doğrula
              </PublicButton>
            </form>

            {errorMessage ? (
              <div className="mt-8 flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm font-semibold leading-7">{errorMessage}</p>
              </div>
            ) : null}

            {result ? (
              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="kdm-public-info-tile rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <div className="mb-5 flex items-center gap-3 text-orange-700">
                    <ShieldCheck className="h-5 w-5" />
                    <h2 className="text-lg font-black text-slate-950">Doğrulama Sonucu</h2>
                  </div>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between gap-4"><dt className="font-bold text-slate-500">Durum</dt><dd className="font-black text-slate-950">{result.valid ? "Geçerli" : "Geçersiz"}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="font-bold text-slate-500">Belge Tipi</dt><dd className="font-black text-slate-950">{result.certificate.type}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="font-bold text-slate-500">Kod</dt><dd className="font-black text-slate-950">{result.certificate.verification_code}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="font-bold text-slate-500">Katılımcı</dt><dd className="font-black text-slate-950">{result.recipient?.name || "-"} {result.recipient?.surname || ""}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="font-bold text-slate-500">Proje</dt><dd className="font-black text-slate-950">{result.certificate.project?.name || "Belirtilmemiş"}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="font-bold text-slate-500">Dönem</dt><dd className="font-black text-slate-950">{result.certificate.period?.name || "Belirtilmemiş"}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="font-bold text-slate-500">Tarih</dt><dd className="font-black text-slate-950">{result.certificate.issued_at ? new Date(result.certificate.issued_at).toLocaleDateString("tr-TR") : "Belirtilmemiş"}</dd></div>
                  </dl>
                </div>

                <div className="kdm-public-info-tile rounded-3xl border border-slate-200 bg-white p-6">
                  <h2 className="mb-5 text-lg font-black text-slate-950">Belge İşlemleri</h2>
                  <div className="space-y-3 text-sm font-bold text-slate-600">
                    <Link href="/student/certificates" className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">
                      Öğrenci sertifika paneli <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/alumni/certificates" className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">
                      Mezun sertifika paneli <ArrowRight className="h-4 w-4" />
                    </Link>
                    {result.certificate.download_url ? (
                      <button type="button" onClick={() => void handleDownload(result.certificate)} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 py-4 font-black text-white transition hover:bg-orange-700">
                        Belgeyi Aç <ExternalLink className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </PublicCard>
        </div>
      </section>
    </main>
  );
}

export default function CertificateVerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="kdm-public-shell flex min-h-[50vh] items-center justify-center bg-[#edecec]">
          <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
        </main>
      }
    >
      <CertificateVerifyContent />
    </Suspense>
  );
}






