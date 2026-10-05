"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, ExternalLink, Loader2, Search, ShieldCheck } from "lucide-react";
import { PublicBrandLoader } from "@/components/public/PublicBrandLoader";
import styles from "@/components/public/CertificateDesign.module.css";
import api from "@/lib/api/axios";
import { downloadBlobResponse } from "@/lib/download";
import {PageHero} from '@/components/aigocy/Primitives';

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
    setResult(null);
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
    <main className={styles.page}>
      <PageHero badge="KADEME belge doğrulama" title="Sertifikanı güvenle doğrula." description="KADEME tarafından verilen sertifika ve katılım belgelerini doğrulama koduyla kontrol edebilirsiniz."/>
      <section className={styles.content} aria-label="Sertifika doğrulama">
        <div className={styles.formCard}>
          <div className={styles.formHeading}>
            <ShieldCheck size={24} />
            <div><h2>Sertifikanı doğrula</h2><p>Belgenin doğrulama kodunu girerek başlayabilirsin.</p></div>
          </div>
          <form onSubmit={(event) => void handleSubmit(event)} className={styles.form} aria-busy={loading}>
            <div className={styles.field}>
              <label htmlFor="verification-code">Doğrulama kodu</label>
              <input id="verification-code" name="verification_code" value={code}
                onChange={(event) => setCode(event.target.value)} type="text" required
                autoComplete="off" spellCheck={false} placeholder="Belgenizdeki doğrulama kodu"
                aria-describedby="verification-hint" />
            </div>
            <button type="submit" disabled={loading || !code.trim()} className={styles.action}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
              {loading ? "Doğrulanıyor…" : "Sertifikayı doğrula"}
            </button>
          </form>
          <p className={styles.hint} id="verification-hint">Kod, sertifikanızın üzerinde yer alır. QR kod bağlantısı ile bu alan otomatik doldurulur.</p>
          {errorMessage ? <div className={styles.message} role="alert"><AlertCircle size={20} /><p>{errorMessage}</p></div> : null}
          {result ? (
            <div className={styles.results} aria-live="polite">
              <div className={styles.resultCard}>
                <h2><ShieldCheck size={21} /> Doğrulama sonucu</h2>
                <dl>
                  <div><dt>Durum</dt><dd className={result.valid ? styles.valid : styles.invalid}>{result.valid ? "Geçerli belge" : "Geçersiz belge"}</dd></div>
                  <div><dt>Belge tipi</dt><dd>{result.certificate.type}</dd></div>
                  <div><dt>Kod</dt><dd>{result.certificate.verification_code}</dd></div>
                  <div><dt>Katılımcı</dt><dd>{result.recipient?.name || "—"} {result.recipient?.surname || ""}</dd></div>
                  <div><dt>Proje</dt><dd>{result.certificate.project?.name || "Belirtilmemiş"}</dd></div>
                  <div><dt>Dönem</dt><dd>{result.certificate.period?.name || "Belirtilmemiş"}</dd></div>
                  <div><dt>Tarih</dt><dd>{result.certificate.issued_at ? new Date(result.certificate.issued_at).toLocaleDateString("tr-TR") : "Belirtilmemiş"}</dd></div>
                </dl>
              </div>
              <div className={styles.resultCard}>
                <h2>Belge işlemleri</h2>
                <Link href="/student/certificates">Öğrenci sertifika paneli <ArrowRight size={17} /></Link>
                <Link href="/alumni/certificates">Mezun sertifika paneli <ArrowRight size={17} /></Link>
                {result.certificate.download_url ? <button type="button" onClick={() => void handleDownload(result.certificate)} className={styles.action}>Belgeyi aç <ExternalLink size={17} /></button> : null}
              </div>
            </div>
          ) : null}
        </div>
        <div className={styles.steps}>
          <div><span>01</span><div><h3>Kodunu bul</h3><p>Sertifikanın üzerindeki doğrulama kodunu kullan.</p></div></div>
          <div><span>02</span><div><h3>Belgeni sorgula</h3><p>Kodu gir, KADEME kayıtlarıyla kontrol edilsin.</p></div></div>
          <div><span>03</span><div><h3>Bilgileri karşılaştır</h3><p>Belge, katılımcı ve proje bilgilerini incele.</p></div></div>
        </div>
      </section>
    </main>
  );
}

export default function CertificateVerifyPage() {
  return (
    <Suspense
      fallback={
        <PublicBrandLoader fullPage label="Sertifika doğrulama hazırlanıyor" />
      }
    >
      <CertificateVerifyContent />
    </Suspense>
  );
}



