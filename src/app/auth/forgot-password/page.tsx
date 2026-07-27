"use client";

import { Suspense, useState } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { isAxiosError } from "axios";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { PublicButton, PublicCard, PublicGradientTitle, PublicIconBadge } from "@/components/public";
import api, { getCsrfCookie } from "@/lib/api/axios";

function ForgotPasswordInner() {
  const searchParams = useSearchParams();
  const setupNotice = searchParams.get("notice") === "setup";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await getCsrfCookie();
      const res = await api.post("/auth/forgot-password", { email: email.trim() });
      setMessage(res.data?.message ?? "İşlem tamamlandı.");
    } catch (err) {
      if (isAxiosError(err)) {
        setError((err.response?.data as { message?: string })?.message ?? "İşlem başarısız.");
      } else {
        setError("İşlem başarısız.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicCard className="mx-auto w-full max-w-md p-7 sm:p-9">
      <PublicIconBadge className="mb-6 bg-orange-600">
        <Mail className="h-6 w-6" />
      </PublicIconBadge>
      <h1 className="text-3xl font-black tracking-tight text-slate-950">
        <PublicGradientTitle>Şifre Belirleme Bağlantısı</PublicGradientTitle>
      </h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Hesabınıza kayıtlı e-postayı girin. Size şifre belirleme linki gönderelim.
      </p>

      {setupNotice ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-7 text-amber-900">
          Hesabınızı yönetici açtıysa önce e-postanızdaki bağlantıyı kullanın. Gelmediyse aşağıdan yeni bağlantı isteyin.
        </div>
      ) : null}

      {message ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{message}</div> : null}
      {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div> : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
        <label className="block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">E-posta</span>
          <span className="relative block">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              placeholder="isim@ornek.com"
            />
          </span>
        </label>
        <PublicButton type="submit" disabled={loading} variant="dark" className="w-full" icon={loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />} iconPosition="left">
          Bağlantı Gönder
        </PublicButton>
      </form>

      <PublicButton href="/auth/login" variant="ghost" size="sm" className="mt-6" icon={<ArrowLeft className="h-4 w-4" />} iconPosition="left">
        Girişe Dön
      </PublicButton>
    </PublicCard>
  );
}

export default function ForgotPasswordPage() {
  return (
    <main className="kdm-public-shell relative min-h-screen overflow-hidden bg-[#edecec] pb-16">
      <div className="absolute inset-x-4 bottom-8 top-4 overflow-hidden rounded-[2rem] bg-[#e7e7e4] sm:inset-x-6 lg:inset-x-10">
        <Image src="/aigocy/images/section/hero-1.jpg" alt="" fill priority className="object-cover opacity-55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.92),transparent_20rem),radial-gradient(circle_at_82%_18%,rgba(253,58,37,0.15),transparent_17rem),linear-gradient(180deg,rgba(255,255,255,0.4),rgba(231,231,228,0.9))]" />
      </div>
      <section className="container relative z-10 mx-auto flex min-h-screen items-center px-4 pb-10 pt-36 sm:px-6 sm:pt-40 lg:pt-44">
        <Suspense
          fallback={
            <div className="mx-auto flex items-center gap-2 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" /> Yükleniyor...
            </div>
          }
        >
          <ForgotPasswordInner />
        </Suspense>
      </section>
    </main>
  );
}
