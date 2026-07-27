"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Fingerprint, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { isAxiosError } from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicBadge, PublicButton, PublicCard, PublicGradientTitle, PublicIconBadge } from "@/components/public";
import api, { getCsrfCookie } from "@/lib/api/axios";
import { homePathForUser } from "@/lib/role-home";
import { useAuth } from "@/store/useAuth";

function formatAuthErrorMessage(
  data: { message?: string; errors?: Record<string, string[] | string> } | undefined,
  fallback: string,
): string {
  if (!data) return fallback;
  if (data.message && String(data.message).trim()) return String(data.message);
  if (data.errors && typeof data.errors === "object") {
    const parts = Object.values(data.errors)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .filter((v) => v != null && String(v).trim() !== "");
    if (parts.length) return parts.map(String).join(" ");
  }
  return fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await getCsrfCookie();
      const emailNorm = email.trim().toLowerCase();
      const response = await api.post("/auth/login", { email: emailNorm, password });

      setAuth(response.data.user, response.data.access_token);
      router.replace(homePathForUser(response.data.user));
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        console.error("Giriş Hatası Detayı:", err.response?.data);
        const data = err.response?.data as
          | { message?: string; must_change_password?: boolean; errors?: Record<string, string[] | string> }
          | undefined;
        if (err.response?.status === 403 && data?.must_change_password) {
          setError(
            data.message ??
              "Önce e-postanızdaki bağlantı ile şifrenizi belirlemeniz gerekiyor. Gerekirse 'Şifremi unuttum' ile yeni bağlantı isteyin.",
          );
        } else {
          setError(formatAuthErrorMessage(data, "Giriş yapılamadı. Bilgilerinizi kontrol edin."));
        }
      } else {
        console.error("Giriş Hatası:", err);
        setError("Giriş yapılamadı. Bilgilerinizi kontrol edin.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "h-14 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100";
  const labelClass = "text-xs font-black uppercase tracking-[0.14em] text-slate-500";

  return (
    <main className="kdm-public-shell relative min-h-screen bg-[#edecec] pb-16">
      <div className="px-4 pt-4 sm:px-6 lg:px-10">
      <section className="relative isolate overflow-hidden rounded-[2rem] pb-10 pt-36 sm:pt-40 lg:pt-44">
        <div className="absolute inset-0 -z-10 overflow-hidden bg-[#e7e7e4]">
          <Image src="/aigocy/images/section/hero-1.jpg" alt="" fill priority className="object-cover opacity-55" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.92),transparent_20rem),radial-gradient(circle_at_82%_18%,rgba(253,58,37,0.15),transparent_17rem),linear-gradient(180deg,rgba(255,255,255,0.4),rgba(231,231,228,0.9))]" />
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6">
          <div className="grid min-h-[calc(100dvh-12rem)] items-center gap-8 lg:grid-cols-[0.92fr_1.08fr]">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="hidden lg:block">
              <PublicBadge className="mb-6 border-white/80 bg-white/90 text-[#fd3a25] shadow-[0_4px_12px_rgba(9,9,11,0.10)]">Yetkili Erişim</PublicBadge>
              <h1 className="max-w-xl text-balance text-6xl font-semibold leading-[0.95] tracking-normal text-[#2f3437]">
                <PublicGradientTitle>KADEME Portal</PublicGradientTitle>
              </h1>
              <p className="mt-7 max-w-md text-base leading-8 text-[#3f4653]">
                Proje, başvuru, program ve gelişim süreçlerine güvenli giriş yaparak devam edin.
              </p>
              <div className="mt-8 grid max-w-md gap-3">
                {['Güvenli oturum', 'Rol bazlı yönlendirme', 'Tek panel deneyimi'].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-full border border-white/80 bg-white/80 px-5 py-3 text-sm font-bold text-slate-700 shadow-sm backdrop-blur">
                    <ShieldCheck className="h-4 w-4 text-[#fd3a25]" />
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }}>
              <PublicCard className="mx-auto w-full max-w-md p-6 sm:p-8 lg:p-10">
                <div className="mb-8 text-center">
                  <PublicIconBadge className="mx-auto mb-5 h-16 w-16 bg-orange-600">
                    <Fingerprint className="h-8 w-8" />
                  </PublicIconBadge>
                  <h2 className="text-3xl font-black tracking-tight text-slate-950">Giriş Yap</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">Sisteme giriş yapmak için bilgilerinizi girin.</p>
                </div>

                {error ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-7 text-red-800">
                    {error}
                  </motion.div>
                ) : null}

                <form onSubmit={handleLogin} className="space-y-5">
                  <label className="block space-y-2">
                    <span className={labelClass}>E-posta Adresi</span>
                    <span className="relative block">
                      <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="isim@ornek.com" />
                    </span>
                  </label>

                  <label className="block space-y-2">
                    <span className="flex items-center justify-between gap-3">
                      <span className={labelClass}>Parola</span>
                      <Link href="/auth/forgot-password" className="text-xs font-black text-orange-700 hover:underline">
                        Şifremi unuttum
                      </Link>
                    </span>
                    <span className="relative block">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="********" />
                    </span>
                  </label>

                  <PublicButton type="submit" disabled={loading} variant="dark" size="lg" className="w-full" icon={loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}>
                    Sisteme Giriş Yap
                  </PublicButton>
                </form>

                <div className="mt-8 rounded-2xl bg-slate-50 p-4 text-center text-sm font-semibold text-slate-600">
                  Hesabınız yok mu?{' '}
                  <Link href="/auth/register" className="font-black text-orange-700 hover:underline">
                    Hemen Başvurun
                  </Link>
                </div>
              </PublicCard>
            </motion.div>
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}
