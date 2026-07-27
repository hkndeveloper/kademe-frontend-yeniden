"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Info, Loader2, ShieldCheck } from "lucide-react";
import { isAxiosError } from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PublicButton, PublicCard, PublicGradientTitle, PublicIconBadge } from "@/components/public";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";
import { homePathForUser } from "@/lib/role-home";

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
      const { user } = useAuth.getState();
      router.push(homePathForUser(user));
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Onay işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.");
      } else {
        setError("Onay işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="kdm-public-shell relative min-h-screen overflow-hidden bg-[#edecec] pb-16">
      <div className="absolute inset-x-4 bottom-8 top-4 overflow-hidden rounded-[2rem] bg-[#e7e7e4] sm:inset-x-6 lg:inset-x-10">
        <Image src="/aigocy/images/section/hero-1.jpg" alt="" fill priority className="object-cover opacity-55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.92),transparent_20rem),radial-gradient(circle_at_82%_18%,rgba(253,58,37,0.15),transparent_17rem),linear-gradient(180deg,rgba(255,255,255,0.4),rgba(231,231,228,0.9))]" />
      </div>
      <section className="container relative z-10 mx-auto flex min-h-screen items-center px-4 pb-10 pt-36 sm:px-6 sm:pt-40 lg:pt-44">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mx-auto w-full max-w-3xl">
          <PublicCard className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start">
              <PublicIconBadge className="h-16 w-16 bg-orange-600">
                <ShieldCheck className="h-8 w-8" />
              </PublicIconBadge>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  <PublicGradientTitle>KVKK Aydınlatma Metni</PublicGradientTitle>
                </h1>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Kişisel verilerinizin korunması hakkında bilgilendirme.
                </p>
              </div>
            </div>

            <div className="mb-8 max-h-[22rem] space-y-5 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700 sm:p-6">
              <section>
                <h2 className="font-black text-slate-950">1. Veri Sorumlusu</h2>
                <p className="mt-2">
                  KADEME Yönetim Sistemi olarak, kişisel verilerinizin güvenliği hususuna azami hassasiyet göstermekteyiz.
                </p>
              </section>

              <section>
                <h2 className="font-black text-slate-950">2. Kişisel Verilerin İşlenme Amacı</h2>
                <p className="mt-2">
                  Kişisel verileriniz; eğitim süreçlerinin yürütülmesi, yoklama takibi, kredi ve rozet sisteminin işletilmesi, kariyer danışmanlığı hizmetlerinin sunulması ve KADEME duyurularının tarafınıza ulaştırılması amaçlarıyla işlenmektedir.
                </p>
              </section>

              <section>
                <h2 className="font-black text-slate-950">3. İşlenen Veriler</h2>
                <p className="mt-2">
                  Ad, soyad, T.C. kimlik numarası, iletişim bilgileri, üniversite ve bölüm bilgileri, GPS tabanlı konum verileri yalnızca yoklama anında işlenmektedir.
                </p>
              </section>

              <section>
                <h2 className="font-black text-slate-950">4. Haklarınız</h2>
                <p className="mt-2">
                  6698 sayılı KVKK uyarınca verilerinizin silinmesini, güncellenmesini veya işlenip işlenmediğini öğrenme hakkına sahipsiniz.
                </p>
              </section>

              <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-900">
                <Info className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-xs font-semibold leading-6">
                  Bu metni onaylayarak sistemin tüm fonksiyonlarını kullanmayı ve verilerinizin belirtilen amaçlarla işlenmesini kabul etmiş sayılırsınız.
                </p>
              </div>
            </div>

            {error ? <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm font-semibold text-red-800">{error}</div> : null}

            <div className="flex flex-col gap-4 sm:flex-row">
              <PublicButton type="button" onClick={() => router.push("/auth/login")} variant="secondary" size="lg" className="flex-1">
                Vazgeç ve Çıkış Yap
              </PublicButton>
              <PublicButton type="button" onClick={handleConsent} disabled={loading} variant="dark" size="lg" className="flex-[2]" icon={loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}>
                Okudum, Onaylıyorum
              </PublicButton>
            </div>
          </PublicCard>
        </motion.div>
      </section>
    </main>
  );
}
