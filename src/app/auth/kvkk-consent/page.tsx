"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Loader2, Info } from "lucide-react";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";

export default function KvkkConsentPage() {
  const router = useRouter();
  const { fetchProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConsent = async () => {
    setLoading(true);
    setError("");

    try {
      await api.post("/user/consent-kvkk");
      await fetchProfile();
      router.push("/student/dashboard");
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Onay iÅŸlemi sÄ±rasÄ±nda bir hata oluÅŸtu. LÃ¼tfen tekrar deneyin.");
      } else {
        setError("Onay iÅŸlemi sÄ±rasÄ±nda bir hata oluÅŸtu. LÃ¼tfen tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <div className="glass-panel relative overflow-hidden rounded-3xl p-8 md:p-12">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />

          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">KVKK AydÄ±nlatma Metni</h1>
              <p className="text-sm text-muted-foreground">
                KiÅŸisel verilerinizin korunmasÄ± hakkÄ±nda bilgilendirme.
              </p>
            </div>
          </div>

          <div className="mb-8 h-80 space-y-4 overflow-y-auto rounded-2xl border border-border/50 bg-input/30 p-6 text-sm leading-relaxed text-muted-foreground">
            <p className="font-bold text-foreground">1. Veri Sorumlusu</p>
            <p>
              T3 VakfÄ± KADEME YÃ¶netim Sistemi olarak, kiÅŸisel verilerinizin gÃ¼venliÄŸi hususuna azami hassasiyet
              gÃ¶stermekteyiz.
            </p>

            <p className="font-bold text-foreground">2. KiÅŸisel Verilerin Ä°ÅŸlenme AmacÄ±</p>
            <p>
              KiÅŸisel verileriniz; eÄŸitim sÃ¼reÃ§lerinin yÃ¼rÃ¼tÃ¼lmesi, yoklama takibi, kredi ve rozet sisteminin
              iÅŸletilmesi, kariyer danÄ±ÅŸmanlÄ±ÄŸÄ± hizmetlerinin sunulmasÄ± ve vakÄ±f duyurularÄ±nÄ±n tarafÄ±nÄ±za
              ulaÅŸtÄ±rÄ±lmasÄ± amaÃ§larÄ±yla iÅŸlenmektedir.
            </p>

            <p className="font-bold text-foreground">3. Ä°ÅŸlenen Veriler</p>
            <p>
              Ad, soyad, T.C. kimlik numarasÄ±, iletiÅŸim bilgileri, Ã¼niversite ve bÃ¶lÃ¼m bilgileri, GPS tabanlÄ±
              konum verileri yalnÄ±zca yoklama anÄ±nda iÅŸlenmektedir.
            </p>

            <p className="font-bold text-foreground">4. HaklarÄ±nÄ±z</p>
            <p>
              6698 sayÄ±lÄ± KVKK uyarÄ±nca verilerinizin silinmesini, gÃ¼ncellenmesini veya iÅŸlenip iÅŸlenmediÄŸini
              Ã¶ÄŸrenme hakkÄ±na sahipsiniz.
            </p>

            <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/10 p-4 text-primary">
              <Info className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-xs">
                Bu metni onaylayarak sistemin tÃ¼m fonksiyonlarÄ±nÄ± kullanmayÄ± ve verilerinizin belirtilen amaÃ§larla
                iÅŸlenmesini kabul etmiÅŸ sayÄ±lÄ±rsÄ±nÄ±z.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              onClick={() => router.push("/auth/login")}
              className="flex-1 rounded-xl border border-border py-4 font-semibold transition-colors hover:bg-muted"
            >
              VazgeÃ§ ve Ã‡Ä±kÄ±ÅŸ Yap
            </button>
            <button
              onClick={handleConsent}
              disabled={loading}
              className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground shadow-lg transition-all hover:shadow-primary/50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Okudum, OnaylÄ±yorum
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
