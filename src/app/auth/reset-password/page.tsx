"use client";

import { Suspense, useState } from "react";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { PublicButton, PublicCard, PublicGradientTitle, PublicIconBadge } from "@/components/public";
import api, { getCsrfCookie } from "@/lib/api/axios";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const emailFromUrl = searchParams.get("email") ?? "";
  const [emailManual, setEmailManual] = useState("");
  const emailEffective = emailFromUrl || emailManual;
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!token || !emailEffective.trim()) {
      setError("Bağlantı eksik veya geçersiz. E-postadaki linki kullanın.");
      return;
    }
    setLoading(true);
    try {
      await getCsrfCookie();
      const res = await api.post("/auth/reset-password", {
        token,
        email: emailEffective.trim(),
        password,
        password_confirmation: passwordConfirmation,
      });
      setSuccess(res.data?.message ?? "Şifreniz güncellendi.");
      setTimeout(() => router.replace("/auth/login"), 2000);
    } catch (err) {
      if (isAxiosError(err)) {
        setError((err.response?.data as { message?: string })?.message ?? "Şifre güncellenemedi.");
      } else {
        setError("Şifre güncellenemedi.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100";
  const labelClass = "text-xs font-black uppercase tracking-[0.14em] text-slate-500";

  return (
    <PublicCard className="mx-auto w-full max-w-md p-7 sm:p-9">
      <PublicIconBadge className="mb-6 bg-orange-600">
        <KeyRound className="h-6 w-6" />
      </PublicIconBadge>
      <h1 className="text-3xl font-black tracking-tight text-slate-950">
        <PublicGradientTitle>Yeni Şifre Belirle</PublicGradientTitle>
      </h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Güçlü bir şifre seçin. İşlem tamamlandıktan sonra giriş yapabilirsiniz.
      </p>

      {success ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-7 text-emerald-900">
          {success}
          <p className="mt-2 text-xs">Giriş sayfasına yönlendiriliyorsunuz...</p>
        </div>
      ) : null}
      {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div> : null}

      {!success ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className={labelClass}>E-posta</span>
            <input
              name="email"
              type="email"
              required
              value={emailFromUrl || emailManual}
              onChange={(e) => {
                if (!emailFromUrl) setEmailManual(e.target.value);
              }}
              readOnly={Boolean(emailFromUrl)}
              className={`${inputClass} ${emailFromUrl ? "cursor-not-allowed bg-slate-50 text-slate-500" : ""}`}
            />
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>Yeni Şifre</span>
            <input name="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} autoComplete="new-password" />
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>Yeni Şifre (Tekrar)</span>
            <input name="password_confirmation" type="password" required minLength={8} value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} className={inputClass} autoComplete="new-password" />
          </label>
          <PublicButton type="submit" disabled={loading} variant="dark" className="w-full" icon={loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />} iconPosition="left">
            Şifreyi Kaydet
          </PublicButton>
        </form>
      ) : null}

      <PublicButton href="/auth/login" variant="ghost" size="sm" className="mt-6" icon={<ArrowLeft className="h-4 w-4" />} iconPosition="left">
        Girişe Dön
      </PublicButton>
    </PublicCard>
  );
}

export default function ResetPasswordPage() {
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
          <ResetPasswordForm />
        </Suspense>
      </section>
    </main>
  );
}

