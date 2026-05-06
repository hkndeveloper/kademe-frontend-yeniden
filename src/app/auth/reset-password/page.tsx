"use client";

import { Suspense, useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
      setError("Baglanti eksik veya gecersiz. E-postadaki linki kullanin.");
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
      setSuccess(res.data?.message ?? "Sifreniz guncellendi.");
      setTimeout(() => router.replace("/auth/login"), 2000);
    } catch (err) {
      if (isAxiosError(err)) {
        setError((err.response?.data as { message?: string })?.message ?? "Sifre guncellenemedi.");
      } else {
        setError("Sifre guncellenemedi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl"
    >
      <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <KeyRound className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Yeni sifre belirle</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Guclu bir sifre secin. Islem tamamlandiktan sonra giris yapabilirsiniz.
      </p>

      {success ? (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
          {success}
          <p className="mt-2 text-xs">Giris sayfasina yonlendiriliyorsunuz...</p>
        </div>
      ) : null}
      {error ? (
        <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      ) : null}

      {!success ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <div>
            <label className="ml-1 text-sm font-medium">E-posta</label>
            <input
              type="email"
              required
              value={emailFromUrl || emailManual}
              onChange={(e) => {
                if (!emailFromUrl) {
                  setEmailManual(e.target.value);
                }
              }}
              readOnly={Boolean(emailFromUrl)}
              className={`mt-1 w-full rounded-xl border border-border py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-primary ${
                emailFromUrl ? "cursor-not-allowed bg-muted/50 text-muted-foreground" : "bg-input"
              }`}
            />
          </div>
          <div>
            <label className="ml-1 text-sm font-medium">Yeni sifre</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-input py-3 px-4 outline-none focus:ring-2 focus:ring-primary"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="ml-1 text-sm font-medium">Yeni sifre (tekrar)</label>
            <input
              type="password"
              required
              minLength={8}
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-input py-3 px-4 outline-none focus:ring-2 focus:ring-primary"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Sifreyi kaydet
          </button>
        </form>
      ) : null}

      <Link href="/auth/login" className="mt-6 inline-block text-sm text-primary hover:underline">
        Girise don
      </Link>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" /> Yukleniyor...
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
